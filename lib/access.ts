import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { getAllCourses, getCourse } from "./courses";

export type Role = "participant" | "presenter";
export type Viewer = { userId: string; email: string; name: string; isAdmin: boolean };

const admins = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function getViewer(): Promise<Viewer> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = (user.primaryEmailAddress?.emailAddress ?? "").toLowerCase();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || email;
  return { userId: user.id, email, name, isAdmin: admins().includes(email) };
}

/**
 * Map of course slug → role for the viewer.
 * Admins are presenters on every course. Waitlisted enrolments grant no access.
 * Hidden courses are visible to presenters only.
 */
export async function getEnrolments(v: Viewer): Promise<Record<string, Role>> {
  const courses = await getAllCourses();
  if (v.isAdmin) return Object.fromEntries(courses.map((c) => [c.slug, "presenter" as Role]));
  await ensureSchema();
  const rows = (await sql`SELECT course_slug, role FROM enrolments WHERE email = ${v.email} AND status = 'active'`) as {
    course_slug: string; role: Role;
  }[];
  const out: Record<string, Role> = {};
  for (const r of rows) {
    const c = courses.find((x) => x.slug === r.course_slug);
    if (!c) continue;
    if (c.settings.status === "hidden" && r.role !== "presenter") continue;
    out[r.course_slug] = r.role;
  }
  return out;
}

export const previewCookie = (slug: string) => `preview_${slug}`;

/** The course version this viewer should see: presenter preview → their cohort's pinned version → live. */
async function versionFor(v: Viewer, slug: string, role: Role): Promise<{ version: number | null; reason: "preview" | "pinned" | "live" }> {
  if (role === "presenter") {
    const p = (await cookies()).get(previewCookie(slug))?.value;
    if (p != null && p !== "" && !isNaN(Number(p))) return { version: Number(p), reason: "preview" };
  }
  try {
    const r = (await sql`SELECT c.course_version FROM enrolments e JOIN cohorts c ON c.id = e.cohort_id
                         WHERE e.email = ${v.email} AND e.course_slug = ${slug} AND c.course_version IS NOT NULL`) as { course_version: number }[];
    if (r[0]) return { version: r[0].course_version, reason: "pinned" };
  } catch { /* no cohort */ }
  return { version: null, reason: "live" };
}

/** Gate a course page and load the right version. Presenters/admins get hidden sessions too. */
export async function requireCourseRole(slug: string, need: Role = "participant") {
  const v = await getViewer();
  const enr = await getEnrolments(v);
  const role = enr[slug];
  if (!role) redirect("/?denied=" + encodeURIComponent(slug));
  if (need === "presenter" && role !== "presenter") redirect(`/c/${slug}`);
  const pick = await versionFor(v, slug, role);
  const course = await getCourse(slug, { includeHidden: role === "presenter", version: pick.version, reason: pick.reason });
  if (!course) redirect("/");
  return { viewer: v, role, enrolments: enr, course };
}

export async function requireAdmin() {
  const v = await getViewer();
  if (!v.isAdmin) redirect("/");
  return v;
}

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { getCourses } from "./courses";

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

/** Map of course slug → role for the viewer. Admins are presenters on every course. */
export async function getEnrolments(v: Viewer): Promise<Record<string, Role>> {
  if (v.isAdmin) return Object.fromEntries(getCourses().map((c) => [c.slug, "presenter" as Role]));
  await ensureSchema();
  const rows = (await sql`SELECT course_slug, role FROM enrolments WHERE email = ${v.email}`) as {
    course_slug: string;
    role: Role;
  }[];
  return Object.fromEntries(rows.map((r) => [r.course_slug, r.role]));
}

/** Gate a course page. Redirects home if the viewer isn't enrolled; optionally requires presenter. */
export async function requireCourseRole(slug: string, need: Role = "participant") {
  const v = await getViewer();
  const enr = await getEnrolments(v);
  const role = enr[slug];
  if (!role) redirect("/?denied=" + encodeURIComponent(slug));
  if (need === "presenter" && role !== "presenter") redirect(`/c/${slug}`);
  return { viewer: v, role, enrolments: enr };
}

export async function requireAdmin() {
  const v = await getViewer();
  if (!v.isAdmin) redirect("/");
  return v;
}

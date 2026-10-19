"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { getViewer, getEnrolments, requireAdmin } from "./access";
import { getAllCourses, getCourse } from "./courses";
import { validateCourse } from "./validate";
import type { Course } from "./types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string, dflt: number | null = null) => {
  const v = str(f, k);
  return v === "" || isNaN(Number(v)) ? dflt : Number(v);
};
const bool = (f: FormData, k: string) => f.get(k) === "on";

// ---------------- courses ----------------
export async function saveCourseSettings(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const slug = str(f, "slug");
  const status = ["published", "hidden", "archived"].includes(str(f, "status")) ? str(f, "status") : "published";
  const hidden = f.getAll("hidden").map(String);
  await sql`
    INSERT INTO course_settings (slug, status, sort, catalogue, show_outline, show_resources, show_ai, show_quiz, show_roster, hidden_modules, title, short_title, tagline, updated_at)
    VALUES (${slug}, ${status}, ${num(f, "sort")}, ${bool(f, "catalogue")}, ${bool(f, "showOutline")}, ${bool(f, "showResources")},
            ${bool(f, "showAiPrompts")}, ${bool(f, "showQuiz")}, ${bool(f, "showRoster")}, ${hidden},
            ${optStr(f, "title")}, ${optStr(f, "shortTitle")}, ${optStr(f, "tagline")}, now())
    ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status, sort = EXCLUDED.sort, catalogue = EXCLUDED.catalogue,
      show_outline = EXCLUDED.show_outline, show_resources = EXCLUDED.show_resources, show_ai = EXCLUDED.show_ai,
      show_quiz = EXCLUDED.show_quiz, show_roster = EXCLUDED.show_roster, hidden_modules = EXCLUDED.hidden_modules,
      title = EXCLUDED.title, short_title = EXCLUDED.short_title, tagline = EXCLUDED.tagline, updated_at = now()`;
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${slug}?saved=1`);
}

export type ImportState = { ok?: string; errors?: string[] };

/** Import (or replace) a course from pasted/uploaded JSON. Stored in Neon; overrides a repo course with the same slug. */
export async function importCourse(_prev: ImportState, f: FormData): Promise<ImportState> {
  const v = await requireAdmin();
  await ensureSchema();
  let text = str(f, "json");
  const file = f.get("file");
  if (file && typeof file === "object" && "text" in file && (file as File).size > 0) text = await (file as File).text();
  if (!text) return { errors: ["Paste course JSON or choose a .json file."] };
  let body: Course;
  try { body = JSON.parse(text); } catch (e) { return { errors: ["That isn't valid JSON: " + (e as Error).message] }; }
  const slugOverride = str(f, "slug");
  if (slugOverride) body.slug = slugOverride;
  const errors = validateCourse(body);
  if (errors.length) return { errors };
  await sql`INSERT INTO custom_courses (slug, body, updated_by, updated_at) VALUES (${body.slug}, ${JSON.stringify(body)}::jsonb, ${v.email}, now())
            ON CONFLICT (slug) DO UPDATE SET body = EXCLUDED.body, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  if (bool(f, "startHidden")) {
    await sql`INSERT INTO course_settings (slug, status) VALUES (${body.slug}, 'hidden') ON CONFLICT (slug) DO NOTHING`;
  }
  revalidatePath("/", "layout");
  return { ok: `Imported "${body.title}" (${body.modules.length} sessions) as /c/${body.slug}.` };
}

export async function duplicateCourse(f: FormData) {
  const v = await requireAdmin();
  await ensureSchema();
  const from = await getCourse(str(f, "from"), { includeHidden: true });
  const slug = str(f, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!from || !slug) throw new Error("Choose a course and a new slug");
  if ((await getAllCourses()).some((c) => c.slug === slug)) throw new Error("That slug is already used");
  const { settings: _s, ...plain } = from;
  const body = { ...plain, slug, title: str(f, "title") || `${from.title} (copy)`, shortTitle: str(f, "title") || `${from.shortTitle} (copy)` };
  await sql`INSERT INTO custom_courses (slug, body, updated_by) VALUES (${slug}, ${JSON.stringify(body)}::jsonb, ${v.email})`;
  await sql`INSERT INTO course_settings (slug, status) VALUES (${slug}, 'hidden') ON CONFLICT (slug) DO NOTHING`;
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${slug}?saved=1`);
}

export async function removeImportedCourse(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM custom_courses WHERE slug = ${str(f, "slug")}`;
  revalidatePath("/", "layout");
  redirect("/admin/courses");
}

// ---------------- cohorts ----------------
export async function saveCohort(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  const vals = {
    course: str(f, "course"), name: str(f, "name"),
    status: ["scheduled", "forecast", "cancelled"].includes(str(f, "status")) ? str(f, "status") : "scheduled",
    start: optStr(f, "start_date"), end: optStr(f, "end_date") ?? optStr(f, "start_date"),
    capacity: num(f, "capacity", 20)!, forecast: num(f, "forecast_seats", 0)!, price: num(f, "price"),
    delivery: optStr(f, "delivery"), presenter: optStr(f, "presenter_email")?.toLowerCase() ?? null, notes: optStr(f, "notes"),
  };
  if (!vals.course || !vals.name) throw new Error("Course and cohort name are required");
  let cohortId = id;
  if (id) {
    await sql`UPDATE cohorts SET course_slug=${vals.course}, name=${vals.name}, status=${vals.status}, start_date=${vals.start}, end_date=${vals.end},
              capacity=${vals.capacity}, forecast_seats=${vals.forecast}, price=${vals.price}, delivery=${vals.delivery},
              presenter_email=${vals.presenter}, notes=${vals.notes} WHERE id=${id}`;
  } else {
    const r = (await sql`INSERT INTO cohorts (course_slug, name, status, start_date, end_date, capacity, forecast_seats, price, delivery, presenter_email, notes)
              VALUES (${vals.course}, ${vals.name}, ${vals.status}, ${vals.start}, ${vals.end}, ${vals.capacity}, ${vals.forecast}, ${vals.price},
                      ${vals.delivery}, ${vals.presenter}, ${vals.notes}) RETURNING id`) as { id: number }[];
    cohortId = r[0].id;
  }
  if (vals.presenter) {
    await sql`INSERT INTO enrolments (email, course_slug, role, cohort, cohort_id, status) VALUES (${vals.presenter}, ${vals.course}, 'presenter', ${vals.name}, ${cohortId}, 'active')
              ON CONFLICT (email, course_slug) DO UPDATE SET role='presenter', cohort=EXCLUDED.cohort, cohort_id=EXCLUDED.cohort_id, status='active'`;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/cohorts/${cohortId}`);
}

export async function deleteCohort(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  await sql`UPDATE enrolments SET cohort_id = NULL WHERE cohort_id = ${id}`;
  await sql`DELETE FROM attendance WHERE cohort_id = ${id}`;
  await sql`DELETE FROM cohorts WHERE id = ${id}`;
  revalidatePath("/admin", "layout");
  redirect("/admin/cohorts");
}

// ---------------- enrolments ----------------
export async function enrolPeople(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const emails = [...new Set(str(f, "emails").split(/[\s,;]+/).map((e) => e.toLowerCase()).filter((e) => /.+@.+\..+/.test(e)))];
  const role = str(f, "role") === "presenter" ? "presenter" : "participant";
  const cohortId = num(f, "cohort_id");
  let course = str(f, "course");
  let cohortName: string | null = null;
  let capacity = Infinity;
  if (cohortId) {
    const c = (await sql`SELECT course_slug, name, capacity FROM cohorts WHERE id = ${cohortId}`) as { course_slug: string; name: string; capacity: number }[];
    if (!c[0]) throw new Error("Unknown cohort");
    course = c[0].course_slug; cohortName = c[0].name; capacity = c[0].capacity;
  }
  if (!(await getCourse(course, { includeHidden: true }))) throw new Error("Choose a course or cohort");
  const override = bool(f, "override");
  let taken = cohortId
    ? ((await sql`SELECT count(*)::int AS n FROM enrolments WHERE cohort_id = ${cohortId} AND role='participant' AND status='active'`) as { n: number }[])[0].n
    : 0;
  for (const email of emails) {
    let status = "active";
    if (role === "participant" && cohortId && !override) {
      if (taken >= capacity) status = "waitlist"; else taken++;
    }
    await sql`INSERT INTO enrolments (email, course_slug, role, cohort, cohort_id, status) VALUES (${email}, ${course}, ${role}, ${cohortName}, ${cohortId}, ${status})
              ON CONFLICT (email, course_slug) DO UPDATE SET role = EXCLUDED.role, cohort = EXCLUDED.cohort, cohort_id = EXCLUDED.cohort_id, status = EXCLUDED.status`;
  }
  revalidatePath("/admin", "layout");
}

export async function setEnrolmentStatus(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const status = str(f, "status") === "waitlist" ? "waitlist" : "active";
  await sql`UPDATE enrolments SET status = ${status} WHERE email = ${str(f, "email")} AND course_slug = ${str(f, "course")}`;
  revalidatePath("/admin", "layout");
}

export async function removeEnrolment(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM enrolments WHERE email = ${str(f, "email")} AND course_slug = ${str(f, "course")}`;
  revalidatePath("/admin", "layout");
}

// ---------------- attendance (presenters + admins) ----------------
export async function saveAttendance(f: FormData) {
  const v = await getViewer();
  const cohortId = num(f, "cohort_id");
  const moduleId = str(f, "module_id");
  await ensureSchema();
  const c = (await sql`SELECT course_slug FROM cohorts WHERE id = ${cohortId}`) as { course_slug: string }[];
  if (!c[0]) throw new Error("Unknown cohort");
  const enr = await getEnrolments(v);
  if (enr[c[0].course_slug] !== "presenter") throw new Error("Presenters only");
  const roster = f.getAll("roster").map(String);
  const present = new Set(f.getAll("present").map(String));
  for (const email of roster) {
    await sql`INSERT INTO attendance (cohort_id, email, module_id, present, marked_by) VALUES (${cohortId}, ${email}, ${moduleId}, ${present.has(email)}, ${v.email})
              ON CONFLICT (cohort_id, email, module_id) DO UPDATE SET present = EXCLUDED.present, marked_by = EXCLUDED.marked_by, marked_at = now()`;
  }
  revalidatePath(`/c/${c[0].course_slug}/roster`);
  revalidatePath("/admin", "layout");
}

// ---------------- feedback review & improvement backlog ----------------
export async function generateCohortReview(f: FormData) {
  const v = await requireAdmin();
  const cohortId = num(f, "cohort_id");
  const c = (await sql`SELECT course_slug FROM cohorts WHERE id = ${cohortId}`) as { course_slug: string }[];
  const course = c[0] && (await getCourse(c[0].course_slug, { includeHidden: true }));
  if (!course || cohortId == null) throw new Error("Unknown cohort");
  const { buildCohortReview, saveBacklog } = await import("./review");
  const review = await buildCohortReview(course, cohortId);
  await saveBacklog(course.slug, cohortId, review.drafts, v.email, review);
  revalidatePath(`/admin/feedback/review/${cohortId}`);
  revalidatePath("/admin", "layout");
}

export async function updateBacklogItem(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  const status = ["new", "planned", "done", "dismissed"].includes(str(f, "status")) ? str(f, "status") : "new";
  const priority = ["high", "medium", "low"].includes(str(f, "priority")) ? str(f, "priority") : "medium";
  await sql`UPDATE improvement_backlog SET status = ${status}, priority = ${priority}, updated_at = now() WHERE id = ${id}`;
  revalidatePath("/admin/feedback", "layout");
}

export async function addBacklogItem(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const title = str(f, "title");
  if (!title) return;
  const priority = ["high", "medium", "low"].includes(str(f, "priority")) ? str(f, "priority") : "medium";
  await sql`INSERT INTO improvement_backlog (course_slug, cohort_id, title, detail, area, modules, source, priority)
            VALUES (${str(f, "course")}, ${num(f, "cohort_id")}, ${title}, ${optStr(f, "detail")}, ${optStr(f, "area")}, ${optStr(f, "modules")}, 'manual', ${priority})`;
  revalidatePath("/admin/feedback", "layout");
}

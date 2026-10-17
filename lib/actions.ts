"use server";
import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "./db";
import { getViewer, getEnrolments, requireAdmin } from "./access";
import { getCourse } from "./courses";

async function enrolledViewer(slug: string) {
  const v = await getViewer();
  const enr = await getEnrolments(v);
  if (!enr[slug]) throw new Error("Not enrolled in this course");
  await ensureSchema();
  return v;
}

export async function saveResponse(slug: string, activityId: string, promptId: string, value: string) {
  const v = await enrolledViewer(slug);
  await sql`
    INSERT INTO responses (user_id, email, course_slug, activity_id, prompt_id, value, updated_at)
    VALUES (${v.userId}, ${v.email}, ${slug}, ${activityId}, ${promptId}, ${value.slice(0, 20000)}, now())
    ON CONFLICT (user_id, course_slug, activity_id, prompt_id)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return { savedAt: new Date().toISOString() };
}

export async function setComplete(slug: string, moduleId: string, done: boolean) {
  const v = await enrolledViewer(slug);
  if (done) {
    await sql`INSERT INTO progress (user_id, email, course_slug, module_id) VALUES (${v.userId}, ${v.email}, ${slug}, ${moduleId})
              ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM progress WHERE user_id = ${v.userId} AND course_slug = ${slug} AND module_id = ${moduleId}`;
  }
  revalidatePath(`/c/${slug}`, "layout");
}

export async function answerQuiz(slug: string, moduleId: string, question: number, answer: number) {
  const v = await enrolledViewer(slug);
  const q = getCourse(slug)?.modules.find((m) => m.id === moduleId)?.participant.quiz[question];
  if (!q) throw new Error("Unknown question");
  const correct = q.a === answer;
  await sql`
    INSERT INTO quiz_answers (user_id, course_slug, module_id, question, answer, correct)
    VALUES (${v.userId}, ${slug}, ${moduleId}, ${question}, ${answer}, ${correct})
    ON CONFLICT (user_id, course_slug, module_id, question)
    DO UPDATE SET answer = EXCLUDED.answer, correct = EXCLUDED.correct, answered_at = now()`;
  return { correct };
}

// ---------- admin ----------
export async function enrol(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const emails = String(formData.get("emails") ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /.+@.+\..+/.test(e));
  const slug = String(formData.get("course"));
  const role = formData.get("role") === "presenter" ? "presenter" : "participant";
  const cohort = String(formData.get("cohort") ?? "").trim() || null;
  if (!getCourse(slug)) throw new Error("Unknown course");
  for (const email of emails) {
    await sql`INSERT INTO enrolments (email, course_slug, role, cohort) VALUES (${email}, ${slug}, ${role}, ${cohort})
              ON CONFLICT (email, course_slug) DO UPDATE SET role = EXCLUDED.role, cohort = EXCLUDED.cohort`;
  }
  revalidatePath("/admin");
}

export async function unenrol(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM enrolments WHERE email = ${String(formData.get("email"))} AND course_slug = ${String(formData.get("course"))}`;
  revalidatePath("/admin");
}

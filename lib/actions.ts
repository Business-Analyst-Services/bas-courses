"use server";
import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "./db";
import { getViewer, getEnrolments } from "./access";
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
  const q = (await getCourse(slug, { includeHidden: true }))?.modules.find((m) => m.id === moduleId)?.participant.quiz[question];
  if (!q) throw new Error("Unknown question");
  const correct = q.a === answer;
  await sql`
    INSERT INTO quiz_answers (user_id, email, course_slug, module_id, question, answer, correct)
    VALUES (${v.userId}, ${v.email}, ${slug}, ${moduleId}, ${question}, ${answer}, ${correct})
    ON CONFLICT (user_id, course_slug, module_id, question)
    DO UPDATE SET answer = EXCLUDED.answer, correct = EXCLUDED.correct, email = EXCLUDED.email, answered_at = now()`;
  return { correct };
}


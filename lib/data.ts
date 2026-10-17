import { ensureSchema, sql } from "./db";

export async function getProgress(userId: string, slug: string): Promise<Set<string>> {
  await ensureSchema();
  const rows = (await sql`SELECT module_id FROM progress WHERE user_id = ${userId} AND course_slug = ${slug}`) as { module_id: string }[];
  return new Set(rows.map((r) => r.module_id));
}

export async function getResponses(userId: string, slug: string): Promise<Record<string, string>> {
  await ensureSchema();
  const rows = (await sql`SELECT activity_id, prompt_id, value FROM responses WHERE user_id = ${userId} AND course_slug = ${slug}`) as {
    activity_id: string; prompt_id: string; value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [`${r.activity_id}::${r.prompt_id}`, r.value]));
}

export async function getQuizAnswers(userId: string, slug: string, moduleId: string): Promise<Record<number, number>> {
  await ensureSchema();
  const rows = (await sql`SELECT question, answer FROM quiz_answers WHERE user_id = ${userId} AND course_slug = ${slug} AND module_id = ${moduleId}`) as {
    question: number; answer: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.question, r.answer]));
}

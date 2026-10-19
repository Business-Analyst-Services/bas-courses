import { ensureSchema, sql } from "./db";
import type { Course, FeedbackQ } from "./types";

export type FbRow = { email: string; cohort_id: number | null; question_id: string; score: number | null; text: string | null };
export type QStat = {
  q: FeedbackQ; n: number; avg: number | null;
  dist: number[];                 // count per score (1–5 for scale, 0–10 for nps)
  nps: number | null;             // promoters% − detractors% (nps questions only)
  comments: string[];
};

export async function getMyFeedback(userId: string, slug: string): Promise<Record<string, { score: number | null; text: string | null }>> {
  await ensureSchema();
  const rows = (await sql`SELECT question_id, score, text FROM feedback WHERE user_id = ${userId} AND course_slug = ${slug}`) as { question_id: string; score: number | null; text: string | null }[];
  return Object.fromEntries(rows.map((r) => [r.question_id, { score: r.score, text: r.text }]));
}

/** All feedback rows for a course, optionally for one cohort. */
export async function getFeedbackRows(slug: string, cohortId?: number | null): Promise<FbRow[]> {
  await ensureSchema();
  return (cohortId
    ? await sql`SELECT email, cohort_id, question_id, score, text FROM feedback WHERE course_slug = ${slug} AND cohort_id = ${cohortId}`
    : await sql`SELECT email, cohort_id, question_id, score, text FROM feedback WHERE course_slug = ${slug}`) as FbRow[];
}

export function summarise(course: Course, rows: FbRow[]): { stats: QStat[]; respondents: number } {
  const qs = course.feedback ?? [];
  const stats = qs.map((q): QStat => {
    const mine = rows.filter((r) => r.question_id === q.id);
    const scores = mine.map((r) => r.score).filter((s): s is number => s != null);
    const dist = Array.from({ length: q.type === "nps" ? 11 : 6 }, (_, i) => scores.filter((s) => s === i).length);
    const nps = q.type === "nps" && scores.length
      ? Math.round(((scores.filter((s) => s >= 9).length - scores.filter((s) => s <= 6).length) / scores.length) * 100) : null;
    return {
      q, n: q.type === "text" ? mine.filter((r) => r.text?.trim()).length : scores.length,
      avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      dist, nps, comments: mine.map((r) => r.text?.trim() ?? "").filter(Boolean),
    };
  });
  return { stats, respondents: new Set(rows.map((r) => r.email)).size };
}

export const fmtAvg = (s: QStat) =>
  s.avg == null ? "—" : s.q.type === "nps" ? `${s.avg.toFixed(1)} / 10` : `${s.avg.toFixed(1)} / 5`;

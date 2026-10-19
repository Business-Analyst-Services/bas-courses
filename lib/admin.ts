import { ensureSchema, sql } from "./db";

export type Lifecycle = "forecast" | "upcoming" | "running" | "delivered" | "cancelled";

export type CohortRow = {
  id: number; course_slug: string; name: string; status: string;
  start_date: string | null; end_date: string | null; capacity: number; forecast_seats: number;
  price: string | null; delivery: string | null; presenter_email: string | null; notes: string | null;
  intake_id: number | null; client_id: number | null; course_version: number | null;
};

export type CohortStats = CohortRow & {
  lifecycle: Lifecycle; enrolled: number; waitlist: number; presenters: number;
  presentMarks: number; totalMarks: number; sessionsMarked: number;
  attendanceRate: number | null; completionRate: number | null; quizRate: number | null; fill: number;
};

/** Today's date in Sydney as YYYY-MM-DD. */
export const todaySydney = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });

const d = (v: string | Date | null) => (v ? (typeof v === "string" ? v.slice(0, 10) : v.toISOString().slice(0, 10)) : null);

export function lifecycle(c: Pick<CohortRow, "status" | "start_date" | "end_date">): Lifecycle {
  if (c.status === "cancelled") return "cancelled";
  if (c.status === "forecast") return "forecast";
  const t = todaySydney();
  const s = d(c.start_date), e = d(c.end_date) ?? s;
  if (!s || s > t) return "upcoming";
  if (e && e < t) return "delivered";
  return "running";
}

/** Every cohort with enrolment, attendance, completion and quiz figures. */
export async function getCohortStats(moduleCounts: Record<string, number>): Promise<CohortStats[]> {
  await ensureSchema();
  const [cohorts, counts, att, prog, quiz] = (await Promise.all([
    sql`SELECT id, course_slug, name, status, start_date::text, end_date::text, capacity, forecast_seats, price::text, delivery, presenter_email, notes, intake_id, client_id, course_version FROM cohorts ORDER BY start_date NULLS LAST, id`,
    sql`SELECT cohort_id,
          count(*) FILTER (WHERE role='participant' AND status='active')::int AS enrolled,
          count(*) FILTER (WHERE status='waitlist')::int AS waitlist,
          count(*) FILTER (WHERE role='presenter')::int AS presenters
        FROM enrolments WHERE cohort_id IS NOT NULL GROUP BY cohort_id`,
    sql`SELECT cohort_id, count(*) FILTER (WHERE present)::int AS present, count(*)::int AS total, count(DISTINCT module_id)::int AS sessions
        FROM attendance GROUP BY cohort_id`,
    sql`SELECT e.cohort_id, e.email, count(p.module_id)::int AS done
        FROM enrolments e LEFT JOIN progress p ON p.email = e.email AND p.course_slug = e.course_slug
        WHERE e.cohort_id IS NOT NULL AND e.role = 'participant' AND e.status = 'active' GROUP BY e.cohort_id, e.email`,
    sql`SELECT e.cohort_id, count(*) FILTER (WHERE q.correct)::int AS right, count(*)::int AS total
        FROM enrolments e JOIN quiz_answers q ON q.email = e.email AND q.course_slug = e.course_slug
        WHERE e.cohort_id IS NOT NULL GROUP BY e.cohort_id`,
  ])) as [CohortRow[], { cohort_id: number; enrolled: number; waitlist: number; presenters: number }[],
    { cohort_id: number; present: number; total: number; sessions: number }[],
    { cohort_id: number; email: string; done: number }[], { cohort_id: number; right: number; total: number }[]];

  return cohorts.map((c) => {
    const n = counts.find((x) => x.cohort_id === c.id);
    const a = att.find((x) => x.cohort_id === c.id);
    const ps = prog.filter((x) => x.cohort_id === c.id);
    const q = quiz.find((x) => x.cohort_id === c.id);
    const mods = moduleCounts[c.course_slug] || 1;
    const enrolled = n?.enrolled ?? 0;
    return {
      ...c,
      lifecycle: lifecycle(c),
      enrolled, waitlist: n?.waitlist ?? 0, presenters: n?.presenters ?? 0,
      presentMarks: a?.present ?? 0, totalMarks: a?.total ?? 0, sessionsMarked: a?.sessions ?? 0,
      attendanceRate: a?.total ? a.present / a.total : null,
      completionRate: ps.length ? ps.reduce((s, x) => s + Math.min(x.done, mods), 0) / (ps.length * mods) : null,
      quizRate: q?.total ? q.right / q.total : null,
      fill: c.capacity ? enrolled / c.capacity : 0,
    };
  });
}

export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
export const fmtDate = (v: string | null) =>
  v ? new Date(v + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";

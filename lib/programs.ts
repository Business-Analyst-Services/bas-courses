import { ensureSchema, sql } from "./db";
import { getAllCourses } from "./courses";
import { lifecycle, todaySydney, type CohortStats, type Lifecycle } from "./admin";
import type { Course } from "./types";

export type Program = {
  slug: string; title: string; short_title: string | null; description: string | null;
  course_slugs: string[]; gap_days: number; status: string; price: string | null;
  course_versions: Record<string, number>;
};
export type Intake = {
  id: number; program_slug: string; client_id: number | null; name: string; status: string; start_date: string | null;
  capacity: number; forecast_seats: number; price: string | null; delivery: string | null; presenter_email: string | null; notes: string | null;
};
export type Client = { id: number; name: string; contact_email: string | null; notes: string | null };

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** How many calendar days a course run spans, from its agenda (Week N → 7 days each, Day N → 1 each). */
export function courseSpanDays(c: Course): number {
  const days = c.schedules?.[0]?.days ?? c.days;
  const weeks = days.filter((d) => /^(week|wk)\b/i.test(d.label)).length;
  if (weeks) return weeks * 7 - 2; // ends on the Friday of the last week
  const dayLabels = days.filter((d) => /^day\s*\d/i.test(d.label)).length;
  return Math.max(1, dayLabels);
}

/** Seed one program per `series` found in course content (once only, so deletes stick). */
export async function seedPrograms() {
  await ensureSchema();
  const done = (await sql`SELECT 1 FROM app_flags WHERE key = 'programs_seeded'`) as unknown[];
  if (done.length) return;
  const courses = await getAllCourses();
  const series = new Map<string, string[]>();
  const sorted = [...courses].sort((a, b) => a.order - b.order);
  for (const c of sorted) {
    const name = c.series;
    if (name && name !== "Flagship") series.set(name, [...(series.get(name) ?? []), c.slug]);
  }
  for (const [name, slugs] of series) {
    if (slugs.length < 2) continue;
    await sql`INSERT INTO programs (slug, title, short_title, description, course_slugs, gap_days)
              VALUES (${slugify(name)}, ${name}, ${name}, ${`${slugs.length} courses, run as one intake.`}, ${slugs}, 7) ON CONFLICT DO NOTHING`;
  }
  await sql`INSERT INTO app_flags (key) VALUES ('programs_seeded') ON CONFLICT DO NOTHING`;
}

/** Horizons courses became stand-alone days: drop the auto-seeded Horizon Series program once, unless it's in use. */
async function retireHorizonSeries() {
  const done = (await sql`SELECT 1 FROM app_flags WHERE key = 'horizon_series_retired'`) as unknown[];
  if (done.length) return;
  await sql`DELETE FROM programs WHERE slug = 'horizon-series' AND NOT EXISTS (SELECT 1 FROM intakes WHERE program_slug = 'horizon-series')`;
  await sql`INSERT INTO app_flags (key) VALUES ('horizon_series_retired') ON CONFLICT DO NOTHING`;
}

export async function getPrograms(): Promise<Program[]> {
  await seedPrograms();
  await retireHorizonSeries();
  return (await sql`SELECT slug, title, short_title, description, course_slugs, gap_days, status, price::text, course_versions FROM programs ORDER BY title`) as Program[];
}
export async function getClients(): Promise<Client[]> {
  await ensureSchema();
  return (await sql`SELECT id, name, contact_email, notes FROM clients ORDER BY name`) as Client[];
}
export async function getIntakes(): Promise<Intake[]> {
  await ensureSchema();
  return (await sql`SELECT id, program_slug, client_id, name, status, start_date::text, capacity, forecast_seats, price::text, delivery, presenter_email, notes, humanitix_event_id
                    FROM intakes ORDER BY start_date NULLS LAST, id`) as Intake[];
}

export type IntakeStats = Intake & {
  lifecycle: Lifecycle; cohorts: CohortStats[]; participants: number; waitlist: number; endDate: string | null;
  attendanceRate: number | null; completionRate: number | null; quizRate: number | null; fill: number;
};

/** Intakes rolled up from their cohorts. Participants = distinct people across the intake's cohorts. */
export async function getIntakeStats(cohorts: CohortStats[]): Promise<IntakeStats[]> {
  const intakes = await getIntakes();
  const ppl = (await sql`SELECT c.intake_id, count(DISTINCT e.email) FILTER (WHERE e.status='active')::int AS n, count(DISTINCT e.email) FILTER (WHERE e.status='waitlist')::int AS w
                        FROM enrolments e JOIN cohorts c ON c.id = e.cohort_id WHERE c.intake_id IS NOT NULL AND e.role='participant' GROUP BY c.intake_id`) as { intake_id: number; n: number; w: number }[];
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return intakes.map((i) => {
    const cs = cohorts.filter((c) => c.intake_id === i.id);
    const ends = cs.map((c) => c.end_date ?? c.start_date).filter(Boolean).sort() as string[];
    const p = ppl.find((x) => x.intake_id === i.id);
    let life: Lifecycle = lifecycle({ status: i.status, start_date: i.start_date, end_date: ends[ends.length - 1] ?? i.start_date });
    if (i.status === "scheduled" && cs.some((c) => c.lifecycle === "running")) life = "running";
    return {
      ...i, lifecycle: life, cohorts: cs, participants: p?.n ?? 0, waitlist: p?.w ?? 0, endDate: ends[ends.length - 1] ?? null,
      attendanceRate: avg(cs.map((c) => c.attendanceRate)), completionRate: avg(cs.map((c) => c.completionRate)), quizRate: avg(cs.map((c) => c.quizRate)),
      fill: i.capacity ? (p?.n ?? 0) / i.capacity : 0,
    };
  });
}

export { todaySydney };

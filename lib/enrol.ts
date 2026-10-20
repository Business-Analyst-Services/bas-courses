import "server-only";
import { sql } from "./db";
import { getAllCourses } from "./courses";

export type EnrolOutcome = "ok" | "waitlist" | "error";

/**
 * Shared enrolment engine used by bulk enrolment, the Humanitix CSV import and the Humanitix API sync.
 * Targets: "intake:12", "cohort:34", "course:slug", or an intake/cohort/course name.
 * Intakes enrol into every cohort in the intake; capacity counts distinct people.
 */
export async function enrolEngine() {
  const intakes = (await sql`SELECT id, name, capacity FROM intakes`) as { id: number; name: string; capacity: number }[];
  const cohorts = (await sql`SELECT id, name, course_slug, capacity, intake_id FROM cohorts`) as { id: number; name: string; course_slug: string; capacity: number; intake_id: number | null }[];
  const courses = await getAllCourses();

  const resolve = (t: string): { kind: "intake" | "cohort" | "course"; id?: number; slug?: string } | null => {
    const i = t.indexOf(":");
    const [k, v] = i > 0 ? [t.slice(0, i), t.slice(i + 1)] : ["", t];
    if (k === "intake" && intakes.some((x) => x.id === Number(v))) return { kind: "intake", id: Number(v) };
    if (k === "cohort" && cohorts.some((x) => x.id === Number(v))) return { kind: "cohort", id: Number(v) };
    if (k === "course" && courses.some((x) => x.slug === v)) return { kind: "course", slug: v };
    const lc = t.toLowerCase().trim();
    const a = intakes.find((x) => x.name.toLowerCase() === lc); if (a) return { kind: "intake", id: a.id };
    const b = cohorts.find((x) => x.name.toLowerCase() === lc); if (b) return { kind: "cohort", id: b.id };
    const c = courses.find((x) => x.slug === lc || x.shortTitle.toLowerCase() === lc || x.title.toLowerCase() === lc); if (c) return { kind: "course", slug: c.slug };
    return null;
  };

  const put = (email: string, slug: string, role: string, cohortId: number | null, cohortName: string | null, status: string) =>
    sql`INSERT INTO enrolments (email, course_slug, role, cohort, cohort_id, status) VALUES (${email}, ${slug}, ${role}, ${cohortName}, ${cohortId}, ${status})
        ON CONFLICT (email, course_slug) DO UPDATE SET role = EXCLUDED.role, cohort = EXCLUDED.cohort, cohort_id = EXCLUDED.cohort_id, status = EXCLUDED.status`;

  /** Enrol one person into one target. Returns the outcome and the cohort ids touched. */
  async function enrol(email: string, role: "participant" | "presenter", target: string, override = false): Promise<{ outcome: EnrolOutcome; error?: string; cohortIds: number[] }> {
    const tgt = resolve(target);
    if (!tgt) return { outcome: "error", error: `couldn't find “${target}”`, cohortIds: [] };
    if (tgt.kind === "course") { await put(email, tgt.slug!, role, null, null, "active"); return { outcome: "ok", cohortIds: [] }; }
    const set = tgt.kind === "intake" ? cohorts.filter((c) => c.intake_id === tgt.id) : cohorts.filter((c) => c.id === tgt.id);
    if (!set.length) return { outcome: "error", error: `“${target}” has no cohorts`, cohortIds: [] };
    const ids = set.map((c) => c.id);
    const cap = tgt.kind === "intake" ? intakes.find((i) => i.id === tgt.id)!.capacity : set[0].capacity;
    const already = ((await sql`SELECT 1 FROM enrolments WHERE email = ${email} AND cohort_id = ANY(${ids}) AND status = 'active'`) as unknown[]).length > 0;
    const taken = ((await sql`SELECT count(DISTINCT email)::int AS n FROM enrolments WHERE cohort_id = ANY(${ids}) AND role = 'participant' AND status = 'active'`) as { n: number }[])[0].n;
    const full = role === "participant" && !override && !already && taken >= cap;
    const label = tgt.kind === "intake" ? intakes.find((i) => i.id === tgt.id)!.name : set[0].name;
    for (const c of set) await put(email, c.course_slug, role, c.id, label, full ? "waitlist" : "active");
    return { outcome: full ? "waitlist" : "ok", cohortIds: ids };
  }

  /** Remove access (e.g. a refunded ticket) for the cohorts/courses behind a target, keeping the history. */
  async function cancel(email: string, target: string) {
    const tgt = resolve(target);
    if (!tgt) return;
    if (tgt.kind === "course") { await sql`UPDATE enrolments SET status = 'cancelled' WHERE email = ${email} AND course_slug = ${tgt.slug}`; return; }
    const ids = (tgt.kind === "intake" ? cohorts.filter((c) => c.intake_id === tgt.id) : cohorts.filter((c) => c.id === tgt.id)).map((c) => c.id);
    await sql`UPDATE enrolments SET status = 'cancelled' WHERE email = ${email} AND cohort_id = ANY(${ids})`;
  }

  return { resolve, enrol, cancel, intakes, cohorts, courses };
}

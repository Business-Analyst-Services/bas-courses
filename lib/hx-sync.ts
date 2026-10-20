import "server-only";
import { sql } from "./db";
import { enrolEngine } from "./enrol";
import { apiTickets, type HxTicket } from "./humanitix";

export type ProcessSummary = { enrolled: number; waitlisted: number; cancelled: number; skipped: number; attendance: number; errors: string[] };

/** Enrol (or cancel) Humanitix tickets into the given targets; save profiles, ticket records and optional check-in attendance. */
export async function processTickets(
  tickets: HxTicket[], targets: string[],
  opts: { source: "humanitix-csv" | "humanitix-api"; markAttendance?: boolean; engine?: Awaited<ReturnType<typeof enrolEngine>> },
): Promise<ProcessSummary> {
  const engine = opts.engine ?? (await enrolEngine());
  const s: ProcessSummary = { enrolled: 0, waitlisted: 0, cancelled: 0, skipped: 0, attendance: 0, errors: [] };
  for (const t of tickets) {
    if (!t.email) { s.skipped++; continue; }
    await sql`INSERT INTO people (email, first_name, last_name, company, linkedin, source, updated_at)
              VALUES (${t.email}, ${t.firstName}, ${t.lastName}, ${t.company}, ${t.linkedin}, ${opts.source}, now())
              ON CONFLICT (email) DO UPDATE SET first_name = coalesce(EXCLUDED.first_name, people.first_name), last_name = coalesce(EXCLUDED.last_name, people.last_name),
                company = coalesce(EXCLUDED.company, people.company), linkedin = coalesce(EXCLUDED.linkedin, people.linkedin), updated_at = now()`;
    for (const target of targets) {
      if (t.cancelled) {
        await engine.cancel(t.email, target);
        s.cancelled++;
      } else {
        const r = await engine.enrol(t.email, t.role, target);
        if (r.outcome === "error") { s.errors.push(`${t.email}: ${r.error}`); continue; }
        if (r.outcome === "waitlist") s.waitlisted++; else s.enrolled++;
        if (opts.markAttendance && t.checkedIn && t.role === "participant") {
          for (const cid of r.cohortIds) {
            const c = engine.cohorts.find((x) => x.id === cid);
            const first = engine.courses.find((x) => x.slug === c?.course_slug)?.modules[0]?.id;
            if (!first) continue;
            await sql`INSERT INTO attendance (cohort_id, email, module_id, present, marked_by) VALUES (${cid}, ${t.email}, ${first}, true, ${opts.source})
                      ON CONFLICT (cohort_id, email, module_id) DO UPDATE SET present = true, marked_by = EXCLUDED.marked_by, marked_at = now()`;
            s.attendance++;
          }
        }
      }
      await sql`INSERT INTO external_tickets (source, ticket_key, event_id, email, target, status, checked_in, seen_at)
                VALUES ('humanitix', ${t.key}, ${t.eventId}, ${t.email}, ${target}, ${t.cancelled ? "cancelled" : "active"}, ${t.checkedIn}, now())
                ON CONFLICT (source, ticket_key) DO UPDATE SET email = EXCLUDED.email, target = EXCLUDED.target, status = EXCLUDED.status, checked_in = EXCLUDED.checked_in, seen_at = now()`;
    }
  }
  return s;
}

/** Pull every linked Humanitix event through the API and apply it. Used by the Sync button and the daily cron. */
export async function syncAllHumanitix(by: string) {
  const links = [
    ...((await sql`SELECT id, name, humanitix_event_id FROM intakes WHERE humanitix_event_id IS NOT NULL AND status <> 'cancelled'`) as { id: number; name: string; humanitix_event_id: string }[]).map((r) => ({ target: `intake:${r.id}`, name: r.name, eventId: r.humanitix_event_id })),
    ...((await sql`SELECT id, name, humanitix_event_id FROM cohorts WHERE humanitix_event_id IS NOT NULL AND status <> 'cancelled'`) as { id: number; name: string; humanitix_event_id: string }[]).map((r) => ({ target: `cohort:${r.id}`, name: r.name, eventId: r.humanitix_event_id })),
  ];
  const engine = await enrolEngine();
  const results: { name: string; eventId: string; tickets?: number; summary?: ProcessSummary; error?: string }[] = [];
  for (const l of links) {
    try {
      const { tickets } = await apiTickets(l.eventId);
      results.push({ name: l.name, eventId: l.eventId, tickets: tickets.length, summary: await processTickets(tickets, [l.target], { source: "humanitix-api", markAttendance: true, engine }) });
    } catch (e) {
      results.push({ name: l.name, eventId: l.eventId, error: (e as Error).message });
    }
  }
  await sql`INSERT INTO import_log (source, run_by, summary) VALUES ('humanitix-api', ${by}, ${JSON.stringify({ links: links.length, results })}::jsonb)`;
  return { links: links.length, results };
}

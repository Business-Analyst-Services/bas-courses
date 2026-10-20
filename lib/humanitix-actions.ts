"use server";
import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "./db";
import { requireAdmin } from "./access";
import { ticketsFromCsv, sharedEmailWarnings, apiEvents, apiTickets } from "./humanitix";
import { processTickets, syncAllHumanitix } from "./hx-sync";
import { enrolEngine } from "./enrol";

export type HxEvent = { key: string; eventId: string | null; name: string; date: string | null; tickets: number; cancelled: number; checkedIn: number; presenters: number; linked: string[] };
export type HxPreview = { csv?: string; events?: HxEvent[]; problems?: string[]; warnings?: string[]; total?: number; result?: string; errors?: string[] };

const eventKey = (eventId: string | null, name: string) => eventId ?? `name-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Step 1: read the CSV and show what's in it, grouped by event, with any existing links. */
export async function previewHumanitix(_p: HxPreview, f: FormData): Promise<HxPreview> {
  await requireAdmin();
  await ensureSchema();
  const file = f.get("file");
  let csv = String(f.get("csv") ?? "");
  if (file && typeof file === "object" && "text" in file && (file as File).size > 0) csv = await (file as File).text();
  if (!csv.trim()) return { problems: ["Choose the attendee report CSV exported from Humanitix."] };
  const { tickets, problems } = ticketsFromCsv(csv);
  const links = [
    ...((await sql`SELECT id, humanitix_event_id FROM intakes WHERE humanitix_event_id IS NOT NULL`) as { id: number; humanitix_event_id: string }[]).map((r) => ({ v: `intake:${r.id}`, e: r.humanitix_event_id })),
    ...((await sql`SELECT id, humanitix_event_id FROM cohorts WHERE humanitix_event_id IS NOT NULL`) as { id: number; humanitix_event_id: string }[]).map((r) => ({ v: `cohort:${r.id}`, e: r.humanitix_event_id })),
  ];
  const map = new Map<string, HxEvent>();
  for (const t of tickets) {
    const k = eventKey(t.eventId, t.eventName);
    const e = map.get(k) ?? { key: k, eventId: t.eventId, name: t.eventName, date: t.eventDate, tickets: 0, cancelled: 0, checkedIn: 0, presenters: 0, linked: links.filter((l) => l.e === t.eventId).map((l) => l.v) };
    e.tickets++; if (t.cancelled) e.cancelled++; if (t.checkedIn) e.checkedIn++; if (t.role === "presenter") e.presenters++;
    map.set(k, e);
  }
  // Same email under different names = shared/buyer email; those people would collapse into one login.
  const names = new Map<string, Set<string>>();
  for (const t of tickets) names.set(t.email!, (names.get(t.email!) ?? new Set()).add(`${t.firstName ?? ""} ${t.lastName ?? ""}`.trim()));
  const warnings = [
    ...sharedEmailWarnings(tickets),
    ...[...names.entries()].filter(([, n]) => n.size > 1).map(([e, n]) => `${e} is the email on ${n.size} tickets for different people (${[...n].slice(0, 4).join(", ")}${n.size > 4 ? "…" : ""}). They'd share one login. Make the event collect each attendee's own email.`),
  ];
  if (tickets.some((t) => t.emailIsBuyer)) warnings.unshift("This report has no attendee email column, so the buyer's email is used. That's fine when people buy their own ticket.");
  return { csv, events: [...map.values()], problems, warnings, total: tickets.length };
}

/** Step 2: enrol each event's tickets into the chosen cohorts / intakes / courses. */
export async function importHumanitix(prev: HxPreview, f: FormData): Promise<HxPreview> {
  const v = await requireAdmin();
  await ensureSchema();
  const csv = String(f.get("csv") ?? "");
  const { tickets } = ticketsFromCsv(csv);
  const engine = await enrolEngine();
  const out: string[] = [], errors: string[] = [];
  const tot = { enrolled: 0, waitlisted: 0, cancelled: 0, attendance: 0 };
  for (const e of prev.events ?? []) {
    const targets = f.getAll(`t_${e.key}`).map(String).filter(Boolean);
    if (!targets.length) { out.push(`${e.name}: skipped (nothing ticked)`); continue; }
    if (f.get(`remember_${e.key}`) === "on" && e.eventId) {
      for (const t of targets) {
        const [kind, id] = t.split(":");
        if (kind === "cohort") await sql`UPDATE cohorts SET humanitix_event_id = ${e.eventId} WHERE id = ${Number(id)}`;
        if (kind === "intake") await sql`UPDATE intakes SET humanitix_event_id = ${e.eventId} WHERE id = ${Number(id)}`;
      }
    }
    const mine = tickets.filter((t) => eventKey(t.eventId, t.eventName) === e.key);
    const s = await processTickets(mine, targets, { source: "humanitix-csv", markAttendance: f.get(`att_${e.key}`) === "on", engine });
    tot.enrolled += s.enrolled; tot.waitlisted += s.waitlisted; tot.cancelled += s.cancelled; tot.attendance += s.attendance;
    errors.push(...s.errors.map((x) => `${e.name}: ${x}`));
    out.push(`${e.name}: ${s.enrolled} enrolments, ${s.waitlisted} waitlisted, ${s.cancelled} cancelled${s.attendance ? `, ${s.attendance} check-ins recorded` : ""}`);
  }
  await sql`INSERT INTO import_log (source, run_by, summary) VALUES ('humanitix-csv', ${v.email}, ${JSON.stringify({ ...tot, lines: out, errors })}::jsonb)`;
  revalidatePath("/admin", "layout");
  return { result: out.join("\n"), errors: errors.length ? errors : undefined };
}

export type HxApiState = { ok?: string; error?: string; events?: { id: string; name: string; start: string | null }[]; sample?: string };

export async function testHumanitixApi(_p: HxApiState, f: FormData): Promise<HxApiState> {
  await requireAdmin();
  try {
    const eventId = String(f.get("event_id") ?? "").trim();
    if (eventId) {
      const { tickets, sample } = await apiTickets(eventId);
      return { ok: `Found ${tickets.length} tickets for event ${eventId}. ${tickets.filter((t) => t.email).length} have an email.`, sample: JSON.stringify(sample, null, 1)?.slice(0, 2500) };
    }
    const events = await apiEvents();
    return { ok: `Connected. ${events.length} events found.`, events: events.slice(0, 60) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function syncHumanitixNow(_p: HxApiState): Promise<HxApiState> {
  const v = await requireAdmin();
  await ensureSchema();
  try {
    const r = await syncAllHumanitix(v.email);
    revalidatePath("/admin", "layout");
    if (!r.links) return { error: "No cohorts or intakes are linked to a Humanitix event yet. Add an event ID on a cohort or intake, or tick “remember” when importing a CSV." };
    return { ok: r.results.map((x) => x.error ? `${x.name}: ${x.error}` : `${x.name}: ${x.tickets} tickets → ${x.summary!.enrolled} enrolled, ${x.summary!.waitlisted} waitlisted, ${x.summary!.cancelled} cancelled`).join("\n") };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function linkHumanitixEvent(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const [kind, id] = String(f.get("target") ?? "").split(":");
  const ev = String(f.get("event_id") ?? "").trim() || null;
  if (kind === "cohort") await sql`UPDATE cohorts SET humanitix_event_id = ${ev} WHERE id = ${Number(id)}`;
  if (kind === "intake") await sql`UPDATE intakes SET humanitix_event_id = ${ev} WHERE id = ${Number(id)}`;
  revalidatePath("/admin", "layout");
}

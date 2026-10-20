/** Humanitix: parse attendee-report CSVs and read tickets from the public API, into one common shape. */

export type HxTicket = {
  key: string;            // stable ticket identity (QR _id, or order id + ticket no.)
  eventId: string | null;
  eventName: string;
  eventDate: string | null;
  orderId: string | null;
  email: string | null;   // attendee email if collected, otherwise buyer email
  emailIsBuyer: boolean;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  linkedin: string | null;
  ticketType: string | null;
  role: "participant" | "presenter";
  cancelled: boolean;
  checkedIn: boolean;
};

/** RFC 4180 CSV parser: quoted fields, doubled quotes, commas/newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const money = (v: string | undefined) => Number(String(v ?? "").replace(/[^0-9.\-]/g, "")) || 0;
const isEmail = (v: string | null | undefined) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const PRESENTER = /presenter|facilitator|speaker|trainer/i;
const CANCELLED = /cancel|refund|void/i;

/** Turn a Humanitix attendee report into tickets. Returns problems for rows that can't be used. */
export function ticketsFromCsv(text: string): { tickets: HxTicket[]; problems: string[]; headers: string[] } {
  const rows = parseCsv(text);
  if (!rows.length) return { tickets: [], problems: ["The file is empty."], headers: [] };
  const headers = rows[0].map((h) => h.trim());
  const find = (...res: RegExp[]) => headers.findIndex((h) => res.some((r) => r.test(h)));
  const col = {
    event: find(/^event$/i, /^event name$/i),
    first: find(/^first name$/i), last: find(/^last name$/i),
    ticketType: find(/^ticket type$/i), orderId: find(/^order id$/i), ticketNo: find(/^ticket no\.?$/i),
    buyerEmail: find(/^buyer email$/i),
    // An attendee email question, if the event collects one (anything with "email" that isn't the buyer's).
    attendeeEmail: headers.findIndex((h) => /e-?mail/i.test(h) && !/buyer/i.test(h)),
    company: find(/company/i, /organi[sz]ation/i, /employer/i),
    linkedin: find(/linkedin/i),
    refunds: find(/^refunds$/i), checkedIn: find(/^checked in$/i), eventDate: find(/^event date$/i), qr: find(/^qr code data$/i),
  };
  if (col.buyerEmail < 0 && col.attendeeEmail < 0) return { tickets: [], problems: ["No email column found. Is this a Humanitix attendee report?"], headers };
  const tickets: HxTicket[] = [];
  const problems: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const g = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    let eventId: string | null = null, qrId: string | null = null;
    try { const j = JSON.parse(g(col.qr) || "{}"); eventId = j.eventId ?? null; qrId = j._id ?? null; } catch { /* no QR data */ }
    const attendee = g(col.attendeeEmail), buyer = g(col.buyerEmail);
    const email = isEmail(attendee) ? attendee.toLowerCase() : isEmail(buyer) ? buyer.toLowerCase() : null;
    const name = [g(col.first), g(col.last)].filter(Boolean).join(" ") || "(no name)";
    if (!g(col.event) && !eventId) { problems.push(`Row ${i + 2} (${name}): no event or order details, so it was skipped`); return; }
    if (!email) { problems.push(`Row ${i + 2} (${name}): no valid email, so it was skipped`); return; }
    const ticketType = g(col.ticketType) || null;
    tickets.push({
      key: qrId ?? `${g(col.orderId)}#${g(col.ticketNo) || i}`,
      eventId, eventName: g(col.event) || "(unnamed event)", eventDate: g(col.eventDate) || null, orderId: g(col.orderId) || null,
      email, emailIsBuyer: !isEmail(attendee),
      firstName: g(col.first) || null, lastName: g(col.last) || null, company: g(col.company) || null, linkedin: g(col.linkedin) || null,
      ticketType, role: ticketType && PRESENTER.test(ticketType) ? "presenter" : "participant",
      cancelled: money(g(col.refunds)) > 0 || (!!ticketType && CANCELLED.test(ticketType)),
      checkedIn: /^checked in$/i.test(g(col.checkedIn)),
    });
  });
  return { tickets, problems, headers };
}

/** Tickets sharing one email inside an order: only that one person could sign in. */
export function sharedEmailWarnings(tickets: HxTicket[]): string[] {
  const by = new Map<string, HxTicket[]>();
  for (const t of tickets) if (t.orderId && t.email) by.set(`${t.orderId}|${t.email}`, [...(by.get(`${t.orderId}|${t.email}`) ?? []), t]);
  return [...by.values()].filter((l) => l.length > 1).map((l) =>
    `Order ${l[0].orderId}: ${l.length} tickets (${l.map((t) => [t.firstName, t.lastName].filter(Boolean).join(" ")).join(", ")}) all use ${l[0].email}. Only that person can sign in; add the others' emails separately.`);
}

// ---------------- API ----------------
const BASE = process.env.HUMANITIX_API_BASE || "https://api.humanitix.com/v1";

async function hx(path: string) {
  const key = process.env.HUMANITIX_API_KEY;
  if (!key) throw new Error("HUMANITIX_API_KEY isn't set in Vercel yet.");
  const res = await fetch(`${BASE}${path}`, { headers: { "x-api-key": key, accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Humanitix returned ${res.status} for ${path}${res.status === 500 ? " (check the event ID)" : ""}`);
  return res.json();
}
// The API wraps lists differently per endpoint; accept any of the common shapes.
const list = (j: unknown, ...keys: string[]): Record<string, unknown>[] => {
  if (Array.isArray(j)) return j as Record<string, unknown>[];
  const o = j as Record<string, unknown>;
  for (const k of [...keys, "data", "results", "items"]) if (Array.isArray(o?.[k])) return o[k] as Record<string, unknown>[];
  return [];
};
const pick = (o: unknown, ...paths: string[]): unknown => {
  for (const p of paths) {
    const v = p.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

async function pages(path: string, key: string) {
  const out: Record<string, unknown>[] = [];
  for (let p = 1; p <= 50; p++) {
    const sep = path.includes("?") ? "&" : "?";
    const batch = list(await hx(`${path}${sep}page=${p}&pageSize=100`), key);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Upcoming and recent events, to help link Humanitix events to cohorts/intakes. */
export async function apiEvents(): Promise<{ id: string; name: string; start: string | null }[]> {
  const evs = await pages("/events", "events");
  return evs.map((e) => ({ id: String(pick(e, "_id", "id")), name: String(pick(e, "name", "title") ?? "(unnamed)"), start: (pick(e, "startDate", "date", "dates.0.startDate") as string) ?? null }));
}

/** All tickets for one event, mapped to the same shape as the CSV import. */
export async function apiTickets(eventId: string): Promise<{ tickets: HxTicket[]; sample: unknown }> {
  const [tix, orders] = await Promise.all([pages(`/events/${eventId}/tickets`, "tickets"), pages(`/events/${eventId}/orders`, "orders").catch(() => [])]);
  const orderEmail = new Map<string, string>();
  for (const o of orders) { const id = pick(o, "_id", "id"); const e = pick(o, "email", "buyer.email", "contact.email", "purchaser.email"); if (id && e) orderEmail.set(String(id), String(e)); }
  const tickets = tix.map((t, i): HxTicket => {
    const orderId = (pick(t, "orderId", "order._id", "order.id") as string) ?? null;
    const attendee = pick(t, "email", "attendee.email", "contact.email", "details.email") as string | undefined;
    const buyer = (orderId && orderEmail.get(orderId)) || (pick(t, "buyerEmail", "buyer.email") as string | undefined);
    const email = isEmail(attendee) ? attendee!.toLowerCase() : isEmail(buyer) ? buyer!.toLowerCase() : null;
    const ticketType = (pick(t, "ticketTypeName", "ticketType.name", "ticketTypeId") as string) ?? null;
    const status = String(pick(t, "status") ?? "");
    return {
      key: String(pick(t, "_id", "id") ?? `${orderId}#${i}`), eventId, eventName: String(pick(t, "eventName") ?? ""), eventDate: null, orderId,
      email, emailIsBuyer: !isEmail(attendee),
      firstName: (pick(t, "firstName", "attendee.firstName", "details.firstName") as string) ?? null,
      lastName: (pick(t, "lastName", "attendee.lastName", "details.lastName") as string) ?? null,
      company: null, linkedin: null, ticketType,
      role: ticketType && PRESENTER.test(ticketType) ? "presenter" : "participant",
      cancelled: CANCELLED.test(status) || pick(t, "cancelled", "isCancelled") === true,
      checkedIn: Boolean(pick(t, "checkIn.checkedIn", "checkedIn", "isCheckedIn")),
    };
  });
  return { tickets, sample: tix[0] ?? null };
}

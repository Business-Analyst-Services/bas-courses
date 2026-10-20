"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { requireAdmin } from "./access";
import { getAllCourses } from "./courses";
import { courseTemplate } from "./validate";
import { addDays, courseSpanDays, slugify } from "./programs";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string, d: number | null = null) => { const v = str(f, k); return v === "" || isNaN(Number(v)) ? d : Number(v); };
const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const monthLabel = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { month: "short", year: "numeric" });

/** Find a client by name, creating it if new. Returns null for a blank name. */
async function ensureClient(name: string | null): Promise<number | null> {
  if (!name) return null;
  const r = (await sql`INSERT INTO clients (name) VALUES (${name}) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`) as { id: number }[];
  return r[0].id;
}

/** Create hidden draft courses (from the template) for titles that don't match an existing course. Returns slugs in order. */
async function ensureCourses(titles: string[], by: string): Promise<string[]> {
  const all = await getAllCourses();
  const out: string[] = [];
  for (const t of titles) {
    const hit = all.find((c) => c.slug === slugify(t) || c.title.toLowerCase() === t.toLowerCase() || c.shortTitle.toLowerCase() === t.toLowerCase());
    if (hit) { out.push(hit.slug); continue; }
    let slug = slugify(t) || "course";
    while (all.some((c) => c.slug === slug) || out.includes(slug)) slug += "-2";
    const body = { ...courseTemplate(slug), title: t, shortTitle: t.length > 28 ? t.slice(0, 26) + "…" : t, tagline: `Draft course: ${t}.` };
    await sql`INSERT INTO custom_courses (slug, body, updated_by) VALUES (${slug}, ${JSON.stringify(body)}::jsonb, ${by}) ON CONFLICT (slug) DO NOTHING`;
    await sql`INSERT INTO course_settings (slug, status) VALUES (${slug}, 'hidden') ON CONFLICT (slug) DO NOTHING`;
    out.push(slug);
  }
  return out;
}

// ---------------- courses: bulk drafts ----------------
export async function createDraftCourses(f: FormData) {
  const v = await requireAdmin();
  await ensureSchema();
  const made = await ensureCourses(lines(str(f, "titles")), v.email);
  revalidatePath("/", "layout");
  redirect(`/admin/courses?created=${made.length}`);
}

// ---------------- programs ----------------
export async function saveProgram(f: FormData) {
  const v = await requireAdmin();
  await ensureSchema();
  const title = str(f, "title");
  if (!title) throw new Error("Program title is required");
  const slug = str(f, "slug") || slugify(title);
  const picked = f.getAll("courses").map(String)
    .map((s) => ({ s, o: num(f, `order_${s}`, 99)! }))
    .sort((a, b) => a.o - b.o).map((x) => x.s);
  const created = await ensureCourses(lines(str(f, "new_courses")), v.email);
  const courseSlugs = [...picked, ...created.filter((s) => !picked.includes(s))];
  const pins: Record<string, number> = {};
  for (const s of courseSlugs) { const v = str(f, `ver_${s}`); if (v !== "" && !isNaN(Number(v))) pins[s] = Number(v); }
  await sql`INSERT INTO programs (slug, title, short_title, description, course_slugs, gap_days, status, price, course_versions)
            VALUES (${slug}, ${title}, ${optStr(f, "short_title")}, ${optStr(f, "description")}, ${courseSlugs}, ${num(f, "gap_days", 7)}, ${str(f, "status") || "published"}, ${num(f, "price")}, ${JSON.stringify(pins)}::jsonb)
            ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title, description = EXCLUDED.description,
              course_slugs = EXCLUDED.course_slugs, gap_days = EXCLUDED.gap_days, status = EXCLUDED.status, price = EXCLUDED.price, course_versions = EXCLUDED.course_versions`;
  revalidatePath("/", "layout");
  redirect(`/admin/programs/${slug}?saved=1`);
}

export async function deleteProgram(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM programs WHERE slug = ${str(f, "slug")}`;
  revalidatePath("/", "layout");
  redirect("/admin/programs");
}

// ---------------- intakes: plan one or many, cohorts created automatically ----------------
export async function planIntakes(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const prog = ((await sql`SELECT * FROM programs WHERE slug = ${str(f, "program")}`) as { slug: string; title: string; short_title: string | null; course_slugs: string[]; gap_days: number; price: string | null; course_versions: Record<string, number> | null }[])[0];
  if (!prog) throw new Error("Choose a program");
  const first = str(f, "start_date");
  if (!first) throw new Error("Start date is required");
  const repeat = Math.max(1, Math.min(24, num(f, "repeat", 1)!));
  const everyWeeks = Math.max(1, num(f, "every_weeks", 13)!);
  const gap = num(f, "gap_days", prog.gap_days)!;
  const capacity = num(f, "capacity", 20)!;
  const status = ["scheduled", "forecast"].includes(str(f, "status")) ? str(f, "status") : "scheduled";
  const forecast = num(f, "forecast_seats", 0)!;
  const price = num(f, "price", prog.price ? Number(prog.price) : null);
  const delivery = optStr(f, "delivery");
  const presenter = optStr(f, "presenter_email")?.toLowerCase() ?? null;
  const clientId = await ensureClient(optStr(f, "client"));
  const prefix = str(f, "name_prefix") || prog.short_title || prog.title;
  const courses = await getAllCourses();
  let lastId = 0;

  for (let k = 0; k < repeat; k++) {
    const start = addDays(first, k * everyWeeks * 7);
    const name = `${prefix} · ${monthLabel(start)}`;
    const r = (await sql`INSERT INTO intakes (program_slug, client_id, name, status, start_date, capacity, forecast_seats, price, delivery, presenter_email, notes)
              VALUES (${prog.slug}, ${clientId}, ${name}, ${status}, ${start}, ${capacity}, ${forecast}, ${price}, ${delivery}, ${presenter}, ${optStr(f, "notes")}) RETURNING id`) as { id: number }[];
    const intakeId = r[0].id;
    lastId = intakeId;
    // One cohort per course, in program order; each starts `gap` days after the previous start, never before it ends.
    let cursor = start;
    let prevEnd: string | null = null;
    for (const slug of prog.course_slugs) {
      const c = courses.find((x) => x.slug === slug);
      if (!c) continue;
      let s = cursor;
      if (prevEnd && s <= prevEnd) s = addDays(prevEnd, 1);
      const end = addDays(s, courseSpanDays(c) - 1);
      const cr = (await sql`INSERT INTO cohorts (course_slug, name, status, start_date, end_date, capacity, forecast_seats, price, delivery, presenter_email, intake_id, client_id, course_version)
                VALUES (${slug}, ${`${c.shortTitle} · ${monthLabel(s)}`}, ${status}, ${s}, ${end}, ${capacity}, ${forecast}, ${null}, ${delivery}, ${presenter}, ${intakeId}, ${clientId}, ${prog.course_versions?.[slug] ?? null}) RETURNING id`) as { id: number }[];
      if (presenter) {
        await sql`INSERT INTO enrolments (email, course_slug, role, cohort, cohort_id, status) VALUES (${presenter}, ${slug}, 'presenter', ${name}, ${cr[0].id}, 'active')
                  ON CONFLICT (email, course_slug) DO UPDATE SET role = 'presenter', cohort_id = EXCLUDED.cohort_id, cohort = EXCLUDED.cohort, status = 'active'`;
      }
      prevEnd = end;
      cursor = addDays(s, gap);
    }
  }
  revalidatePath("/admin", "layout");
  redirect(repeat === 1 ? `/admin/intakes/${lastId}` : "/admin/intakes?created=" + repeat);
}

export async function updateIntake(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  const clientId = await ensureClient(optStr(f, "client"));
  const status = ["scheduled", "forecast", "cancelled"].includes(str(f, "status")) ? str(f, "status") : "scheduled";
  await sql`UPDATE intakes SET name = ${str(f, "name")}, status = ${status}, capacity = ${num(f, "capacity", 20)}, forecast_seats = ${num(f, "forecast_seats", 0)},
            price = ${num(f, "price")}, delivery = ${optStr(f, "delivery")}, presenter_email = ${optStr(f, "presenter_email")}, client_id = ${clientId}, notes = ${optStr(f, "notes")} WHERE id = ${id}`;
  if (f.get("cascade") === "on") {
    await sql`UPDATE cohorts SET status = ${status}, capacity = ${num(f, "capacity", 20)}, forecast_seats = ${num(f, "forecast_seats", 0)},
              delivery = ${optStr(f, "delivery")}, presenter_email = ${optStr(f, "presenter_email")}, client_id = ${clientId} WHERE intake_id = ${id}`;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/intakes/${id}?saved=1`);
}

export async function deleteIntake(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  if (f.get("with_cohorts") === "on") {
    await sql`UPDATE enrolments SET cohort_id = NULL WHERE cohort_id IN (SELECT id FROM cohorts WHERE intake_id = ${id})`;
    await sql`DELETE FROM attendance WHERE cohort_id IN (SELECT id FROM cohorts WHERE intake_id = ${id})`;
    await sql`DELETE FROM cohorts WHERE intake_id = ${id}`;
  } else {
    await sql`UPDATE cohorts SET intake_id = NULL WHERE intake_id = ${id}`;
  }
  await sql`DELETE FROM intakes WHERE id = ${id}`;
  revalidatePath("/admin", "layout");
  redirect("/admin/intakes");
}

// ---------------- cohorts: create many at once ----------------
export async function bulkCreateCohorts(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const slugs = f.getAll("courses").map(String);
  const first = str(f, "start_date");
  if (!slugs.length || !first) throw new Error("Pick at least one course and a start date");
  const repeat = Math.max(1, Math.min(24, num(f, "repeat", 1)!));
  const everyWeeks = Math.max(1, num(f, "every_weeks", 4)!);
  const stagger = num(f, "stagger_days", 0)!;
  const status = ["scheduled", "forecast"].includes(str(f, "status")) ? str(f, "status") : "scheduled";
  const clientId = await ensureClient(optStr(f, "client"));
  const courses = await getAllCourses();
  for (let k = 0; k < repeat; k++) {
    for (const [i, slug] of slugs.entries()) {
      const c = courses.find((x) => x.slug === slug);
      if (!c) continue;
      const s = addDays(first, k * everyWeeks * 7 + i * stagger);
      await sql`INSERT INTO cohorts (course_slug, name, status, start_date, end_date, capacity, forecast_seats, price, delivery, presenter_email, client_id)
                VALUES (${slug}, ${`${c.shortTitle} · ${monthLabel(s)}${str(f, "suffix") ? " · " + str(f, "suffix") : ""}`}, ${status}, ${s}, ${addDays(s, courseSpanDays(c) - 1)},
                        ${num(f, "capacity", 20)}, ${num(f, "forecast_seats", 0)}, ${num(f, "price")}, ${optStr(f, "delivery")}, ${optStr(f, "presenter_email")?.toLowerCase() ?? null}, ${clientId})`;
    }
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/cohorts?created=${slugs.length * repeat}`);
}

// ---------------- enrolment: one paste, many people, many targets ----------------
export type BulkResult = { ok?: string; errors?: string[] };

/**
 * Each line: email[, role][, target, target…]. With no targets on the line, every ticked default is used.
 * Targets: "intake:12", "cohort:34", "course:slug", or an intake/cohort name.
 * Intakes enrol into every cohort in the intake; capacity counts distinct people.
 */
export async function bulkEnrol(_p: BulkResult, f: FormData): Promise<BulkResult> {
  await requireAdmin();
  await ensureSchema();
  const defTargets = f.getAll("target").map(String).filter(Boolean);
  const override = f.get("override") === "on";
  const intakes = (await sql`SELECT id, name, capacity FROM intakes`) as { id: number; name: string; capacity: number }[];
  const cohorts = (await sql`SELECT id, name, course_slug, capacity, intake_id FROM cohorts`) as { id: number; name: string; course_slug: string; capacity: number; intake_id: number | null }[];
  const courses = await getAllCourses();
  const errors: string[] = [];
  let added = 0, waitlisted = 0;

  const resolve = (t: string): { kind: "intake" | "cohort" | "course"; id?: number; slug?: string } | null => {
    const [k, v] = t.includes(":") ? [t.split(":")[0], t.split(":").slice(1).join(":")] : ["", t];
    if (k === "intake" && intakes.some((i) => i.id === Number(v))) return { kind: "intake", id: Number(v) };
    if (k === "cohort" && cohorts.some((c) => c.id === Number(v))) return { kind: "cohort", id: Number(v) };
    if (k === "course" && courses.some((c) => c.slug === v)) return { kind: "course", slug: v };
    const lc = t.toLowerCase();
    const i = intakes.find((x) => x.name.toLowerCase() === lc); if (i) return { kind: "intake", id: i.id };
    const c = cohorts.find((x) => x.name.toLowerCase() === lc); if (c) return { kind: "cohort", id: c.id };
    const s = courses.find((x) => x.slug === lc || x.shortTitle.toLowerCase() === lc); if (s) return { kind: "course", slug: s.slug };
    return null;
  };
  const taken = async (cohortIds: number[]) =>
    ((await sql`SELECT count(DISTINCT email)::int AS n FROM enrolments WHERE cohort_id = ANY(${cohortIds}) AND role = 'participant' AND status = 'active'`) as { n: number }[])[0].n;
  const put = (email: string, slug: string, role: string, cohortId: number | null, cohortName: string | null, status: string) =>
    sql`INSERT INTO enrolments (email, course_slug, role, cohort, cohort_id, status) VALUES (${email}, ${slug}, ${role}, ${cohortName}, ${cohortId}, ${status})
        ON CONFLICT (email, course_slug) DO UPDATE SET role = EXCLUDED.role, cohort = EXCLUDED.cohort, cohort_id = EXCLUDED.cohort_id, status = EXCLUDED.status`;

  for (const [n, line] of lines(str(f, "lines")).entries()) {
    const parts = line.split(/[,\t;]/).map((x) => x.trim()).filter(Boolean);
    const email = parts.find((p) => /.+@.+\..+/.test(p))?.toLowerCase();
    if (!email) { errors.push(`Line ${n + 1}: no email found (“${line}”)`); continue; }
    const role = parts.some((p) => /^presenter$/i.test(p)) ? "presenter" : "participant";
    const rest = parts.filter((p) => p.toLowerCase() !== email && !/^(presenter|participant)$/i.test(p));
    // Targets for this line: any names given on the line, otherwise every ticked default.
    const names = rest.length ? rest : defTargets;
    if (!names.length) { errors.push(`Line ${n + 1}: nothing to enrol into. Tick at least one course, cohort or intake`); continue; }
    let lineOk = false, lineWait = false;
    for (const name of names) {
      const tgt = resolve(name);
      if (!tgt) { errors.push(`Line ${n + 1}: couldn't find “${name}”`); continue; }
      if (tgt.kind === "course") { await put(email, tgt.slug!, role, null, null, "active"); lineOk = true; continue; }
      const set = tgt.kind === "intake" ? cohorts.filter((c) => c.intake_id === tgt.id) : cohorts.filter((c) => c.id === tgt.id);
      if (!set.length) { errors.push(`Line ${n + 1}: “${name}” has no cohorts`); continue; }
      const cap = tgt.kind === "intake" ? intakes.find((i) => i.id === tgt.id)!.capacity : set[0].capacity;
      const already = ((await sql`SELECT 1 FROM enrolments WHERE email = ${email} AND cohort_id = ANY(${set.map((c) => c.id)}) AND status = 'active'`) as unknown[]).length > 0;
      const full = role === "participant" && !override && !already && (await taken(set.map((c) => c.id))) >= cap;
      const label = tgt.kind === "intake" ? intakes.find((i) => i.id === tgt.id)!.name : set[0].name;
      for (const c of set) await put(email, c.course_slug, role, c.id, label, full ? "waitlist" : "active");
      if (full) lineWait = true; else lineOk = true;
    }
    if (lineOk) added++;
    else if (lineWait) waitlisted++;
  }
  revalidatePath("/admin", "layout");
  return { ok: `${added} enrolled${waitlisted ? `, ${waitlisted} waitlisted (full)` : ""}${errors.length ? `, ${errors.length} skipped` : ""}.`, errors: errors.length ? errors : undefined };
}

// ---------------- clients ----------------
export async function saveClient(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  if (id) await sql`UPDATE clients SET name = ${str(f, "name")}, contact_email = ${optStr(f, "contact_email")}, notes = ${optStr(f, "notes")} WHERE id = ${id}`;
  else for (const name of lines(str(f, "names") || str(f, "name"))) await sql`INSERT INTO clients (name, contact_email) VALUES (${name}, ${optStr(f, "contact_email")}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/admin", "layout");
}

export async function deleteClient(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const id = num(f, "id");
  await sql`UPDATE intakes SET client_id = NULL WHERE client_id = ${id}`;
  await sql`UPDATE cohorts SET client_id = NULL WHERE client_id = ${id}`;
  await sql`DELETE FROM clients WHERE id = ${id}`;
  revalidatePath("/admin", "layout");
}

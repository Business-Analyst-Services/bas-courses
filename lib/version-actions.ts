"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureSchema, sql } from "./db";
import { requireAdmin } from "./access";
import { getVersionBody } from "./courses";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const verOrNull = (v: string) => (v === "" || v === "live" || isNaN(Number(v)) ? null : Number(v));

async function nextVersion(slug: string) {
  const r = (await sql`SELECT coalesce(max(version), 0)::int + 1 AS n FROM course_versions WHERE slug = ${slug}`) as { n: number }[];
  return r[0].n;
}

/** New draft version copied from an existing version (default: the live one). */
export async function createDraftVersion(f: FormData) {
  const v = await requireAdmin();
  await ensureSchema();
  const slug = str(f, "slug");
  const from = Number(str(f, "from") || 0);
  const body = await getVersionBody(slug, from);
  if (!body) throw new Error("Version not found");
  const n = await nextVersion(slug);
  await sql`INSERT INTO course_versions (slug, version, label, notes, body, created_by) VALUES (${slug}, ${n}, ${str(f, "label") || `Draft from v${from}`}, ${str(f, "notes") || null}, ${JSON.stringify(body)}::jsonb, ${v.email})`;
  revalidatePath(`/admin/courses/${slug}`);
  redirect(`/admin/courses/${slug}?v=${n}#versions`);
}

/** Make a version live. Cohorts pinned to other versions keep what they have. */
export async function publishVersion(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const slug = str(f, "slug");
  const n = Number(str(f, "version"));
  if (n !== 0 && !(await getVersionBody(slug, n))) throw new Error("Version not found");
  await sql`INSERT INTO course_settings (slug, live_version) VALUES (${slug}, ${n}) ON CONFLICT (slug) DO UPDATE SET live_version = EXCLUDED.live_version, updated_at = now()`;
  if (n) await sql`UPDATE course_versions SET published_at = coalesce(published_at, now()) WHERE slug = ${slug} AND version = ${n}`;
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${slug}?published=${n}#versions`);
}

export async function deleteVersion(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const slug = str(f, "slug");
  const n = Number(str(f, "version"));
  const live = ((await sql`SELECT live_version FROM course_settings WHERE slug = ${slug}`) as { live_version: number }[])[0]?.live_version ?? 0;
  const pinned = ((await sql`SELECT count(*)::int AS n FROM cohorts WHERE course_slug = ${slug} AND course_version = ${n}`) as { n: number }[])[0].n;
  if (n === 0 || n === live || pinned) throw new Error("Can't delete the base, the live version, or a version cohorts are pinned to");
  await sql`DELETE FROM course_versions WHERE slug = ${slug} AND version = ${n}`;
  revalidatePath(`/admin/courses/${slug}`);
  redirect(`/admin/courses/${slug}#versions`);
}

export async function relabelVersion(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  await sql`UPDATE course_versions SET label = ${str(f, "label") || null}, notes = ${str(f, "notes") || null} WHERE slug = ${str(f, "slug")} AND version = ${Number(str(f, "version"))}`;
  revalidatePath(`/admin/courses/${str(f, "slug")}`);
}

/** Pin one cohort (or every cohort of a course in an intake) to a version; blank = follow live. */
export async function pinCohortVersion(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const ver = verOrNull(str(f, "course_version"));
  const ids = f.getAll("cohort_id").map(Number).filter(Boolean);
  for (const id of ids) await sql`UPDATE cohorts SET course_version = ${ver} WHERE id = ${id}`;
  revalidatePath("/", "layout");
}

/** Pin every cohort of a course to a version in one go (e.g. all upcoming cohorts). */
export async function bulkPinVersion(f: FormData) {
  await requireAdmin();
  await ensureSchema();
  const slug = str(f, "slug");
  const ver = verOrNull(str(f, "course_version"));
  const scope = str(f, "scope");
  if (scope === "upcoming") await sql`UPDATE cohorts SET course_version = ${ver} WHERE course_slug = ${slug} AND (start_date IS NULL OR start_date > CURRENT_DATE)`;
  else if (scope === "running") await sql`UPDATE cohorts SET course_version = ${ver} WHERE course_slug = ${slug} AND start_date <= CURRENT_DATE AND coalesce(end_date, start_date) >= CURRENT_DATE`;
  else await sql`UPDATE cohorts SET course_version = ${ver} WHERE course_slug = ${slug}`;
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${slug}?pinned=1#versions`);
}

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Course, CourseSettings, LoadedCourse, Module, VersionInfo } from "./types";
import { ensureSchema, sql } from "./db";

const DIR = path.join(process.cwd(), "content", "courses");
let fileCache: Course[] | null = null;

/** Courses shipped in the repo (content/courses/*.json). */
export function getFileCourses(): Course[] {
  if (fileCache && process.env.NODE_ENV === "production") return fileCache;
  fileCache = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Course);
  return fileCache;
}

export const DEFAULT_SETTINGS: CourseSettings = {
  status: "published", sort: null, catalogue: true, showOutline: true, showResources: true,
  showAiPrompts: true, showQuiz: true, showRoster: true, hiddenModules: [],
  title: null, shortTitle: null, tagline: null, source: "file", liveVersion: 0,
};

type SettingsRow = {
  slug: string; status: string; sort: number | null; catalogue: boolean; show_outline: boolean;
  show_resources: boolean; show_ai: boolean; show_quiz: boolean; show_roster: boolean;
  hidden_modules: string[]; title: string | null; short_title: string | null; tagline: string | null; live_version: number | null;
};

type Raw = {
  base: Map<string, { course: Course; source: "file" | "imported" }>;
  settings: SettingsRow[];
  live: Map<string, { version: number; label: string | null; body: Course }>;
};

/** Raw content for the request: base courses, admin settings and the live version bodies. */
const loadRaw = cache(async (): Promise<Raw> => {
  let imported: { slug: string; body: Course }[] = [];
  let settings: SettingsRow[] = [];
  let live: { slug: string; version: number; label: string | null; body: Course }[] = [];
  try {
    await ensureSchema();
    [imported, settings, live] = (await Promise.all([
      sql`SELECT slug, body FROM custom_courses`,
      sql`SELECT * FROM course_settings`,
      sql`SELECT v.slug, v.version, v.label, v.body FROM course_versions v JOIN course_settings s ON s.slug = v.slug AND s.live_version = v.version`,
    ])) as [{ slug: string; body: Course }[], SettingsRow[], { slug: string; version: number; label: string | null; body: Course }[]];
  } catch {
    // Database unavailable: fall back to file content with default settings.
  }
  const base = new Map<string, { course: Course; source: "file" | "imported" }>();
  for (const c of getFileCourses()) base.set(c.slug, { course: c, source: "file" });
  for (const r of imported) base.set(r.slug, { course: { ...r.body, slug: r.slug }, source: "imported" });
  return { base, settings, live: new Map(live.map((l) => [l.slug, l])) };
});

function settingsFor(raw: Raw, slug: string, source: "file" | "imported"): CourseSettings {
  const r = raw.settings.find((s) => s.slug === slug);
  if (!r) return { ...DEFAULT_SETTINGS, source };
  return {
    status: (r.status as CourseSettings["status"]) ?? "published",
    sort: r.sort, catalogue: r.catalogue, showOutline: r.show_outline, showResources: r.show_resources,
    showAiPrompts: r.show_ai, showQuiz: r.show_quiz, showRoster: r.show_roster,
    hiddenModules: r.hidden_modules ?? [], title: r.title, shortTitle: r.short_title, tagline: r.tagline, source,
    liveVersion: r.live_version ?? 0,
  };
}

function decorate(course: Course, st: CourseSettings, version: VersionInfo): LoadedCourse {
  return {
    ...course,
    title: st.title || course.title,
    shortTitle: st.shortTitle || course.shortTitle,
    tagline: st.tagline || course.tagline,
    settings: st,
    version,
  };
}

const baseLabel = (source: "file" | "imported") => (source === "file" ? "Base (from GitHub)" : "Base (first import)");

/** All courses at their LIVE version, with admin settings applied. Cached per request. */
export const getAllCourses = cache(async (): Promise<LoadedCourse[]> => {
  const raw = await loadRaw();
  const out: LoadedCourse[] = [];
  for (const { course, source } of raw.base.values()) {
    const st = settingsFor(raw, course.slug, source);
    const lv = raw.live.get(course.slug);
    const body = lv ? { ...lv.body, slug: course.slug } : course;
    out.push(decorate(body, st, { n: lv?.version ?? 0, label: lv?.label || (lv ? `Version ${lv.version}` : baseLabel(source)), live: true, reason: "live" }));
  }
  return out.sort((a, b) => (a.settings.sort ?? a.order) - (b.settings.sort ?? b.order));
});

function hideSessions(c: LoadedCourse): LoadedCourse {
  if (!c.settings.hiddenModules.length) return c;
  const hidden = new Set(c.settings.hiddenModules);
  return {
    ...c,
    modules: c.modules.filter((m) => !hidden.has(m.id)),
    days: c.days.map((d) => ({ ...d, blocks: d.blocks.filter((b) => !b.moduleId || !hidden.has(b.moduleId)) })),
  };
}

/**
 * A course as a viewer should see it.
 * - version: show this version instead of live (0 = base). Unknown versions fall back to live.
 * - includeHidden: keep sessions hidden from participants (presenters/admins).
 */
export async function getCourse(
  slug: string,
  opts: { includeHidden?: boolean; version?: number | null; reason?: VersionInfo["reason"] } = {},
): Promise<LoadedCourse | undefined> {
  const live = (await getAllCourses()).find((x) => x.slug === slug);
  if (!live) return undefined;
  let c = live;
  if (opts.version != null && opts.version !== live.version.n) {
    const raw = await loadRaw();
    const base = raw.base.get(slug)!;
    if (opts.version === 0) {
      c = decorate(base.course, live.settings, { n: 0, label: baseLabel(base.source), live: false, reason: opts.reason ?? "requested" });
    } else {
      const r = (await sql`SELECT version, label, body FROM course_versions WHERE slug = ${slug} AND version = ${opts.version}`) as { version: number; label: string | null; body: Course }[];
      if (r[0]) c = decorate({ ...r[0].body, slug }, live.settings, { n: r[0].version, label: r[0].label || `Version ${r[0].version}`, live: false, reason: opts.reason ?? "requested" });
    }
  }
  return opts.includeHidden ? c : hideSessions(c);
}

export type VersionRow = { version: number; label: string | null; notes: string | null; created_by: string | null; created_at: string; published_at: string | null; sessions: number; pinned: number };

/** Every stored version of a course (plus the base as version 0), newest first. */
export async function listVersions(slug: string): Promise<VersionRow[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT v.version, v.label, v.notes, v.created_by, v.created_at, v.published_at, jsonb_array_length(v.body->'modules')::int AS sessions,
      (SELECT count(*) FROM cohorts c WHERE c.course_slug = v.slug AND c.course_version = v.version)::int AS pinned
    FROM course_versions v WHERE v.slug = ${slug} ORDER BY v.version DESC`) as VersionRow[];
  const raw = await loadRaw();
  const base = raw.base.get(slug);
  const pinned0 = ((await sql`SELECT count(*)::int AS n FROM cohorts WHERE course_slug = ${slug} AND course_version = 0`) as { n: number }[])[0].n;
  if (base) rows.push({ version: 0, label: baseLabel(base.source), notes: base.source === "file" ? "Tracks content/courses in the GitHub repo." : null,
    created_by: null, created_at: "", published_at: null, sessions: base.course.modules.length, pinned: pinned0 });
  return rows;
}

/** Raw body of any version (0 = base), without settings. */
export async function getVersionBody(slug: string, version: number): Promise<Course | undefined> {
  const raw = await loadRaw();
  if (version === 0) return raw.base.get(slug)?.course;
  const r = (await sql`SELECT body FROM course_versions WHERE slug = ${slug} AND version = ${version}`) as { body: Course }[];
  return r[0] ? { ...r[0].body, slug } : undefined;
}

export function getModule(course: Course, id: string): Module | undefined {
  return course.modules.find((m) => m.id === id);
}

export function moduleNeighbours(course: Course, id: string) {
  const i = course.modules.findIndex((m) => m.id === id);
  return { prev: course.modules[i - 1], next: course.modules[i + 1] };
}

/** Version numbers and labels for every course (0 = base), for pickers. */
export async function versionOptions(): Promise<Record<string, { v: number; label: string }[]>> {
  await ensureSchema();
  const rows = (await sql`SELECT slug, version, label FROM course_versions ORDER BY slug, version DESC`) as { slug: string; version: number; label: string | null }[];
  const out: Record<string, { v: number; label: string }[]> = {};
  for (const r of rows) (out[r.slug] ??= []).push({ v: r.version, label: r.label ?? `Version ${r.version}` });
  for (const c of await getAllCourses()) (out[c.slug] ??= []).push({ v: 0, label: "Base" });
  return out;
}

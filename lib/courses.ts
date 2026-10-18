import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Course, CourseSettings, LoadedCourse, Module } from "./types";
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
  title: null, shortTitle: null, tagline: null, source: "file",
};

type SettingsRow = {
  slug: string; status: string; sort: number | null; catalogue: boolean; show_outline: boolean;
  show_resources: boolean; show_ai: boolean; show_quiz: boolean; show_roster: boolean;
  hidden_modules: string[]; title: string | null; short_title: string | null; tagline: string | null;
};

/** All courses (files + imported), with admin settings applied. Cached per request. */
export const getAllCourses = cache(async (): Promise<LoadedCourse[]> => {
  let imported: { slug: string; body: Course }[] = [];
  let settings: SettingsRow[] = [];
  try {
    await ensureSchema();
    [imported, settings] = (await Promise.all([
      sql`SELECT slug, body FROM custom_courses`,
      sql`SELECT * FROM course_settings`,
    ])) as [{ slug: string; body: Course }[], SettingsRow[]];
  } catch {
    // Database unavailable: fall back to file content with default settings.
  }
  const bySlug = new Map<string, { course: Course; source: "file" | "imported" }>();
  for (const c of getFileCourses()) bySlug.set(c.slug, { course: c, source: "file" });
  for (const r of imported) bySlug.set(r.slug, { course: { ...r.body, slug: r.slug }, source: "imported" });

  const out: LoadedCourse[] = [];
  for (const { course, source } of bySlug.values()) {
    const r = settings.find((s) => s.slug === course.slug);
    const st: CourseSettings = r
      ? {
          status: (r.status as CourseSettings["status"]) ?? "published",
          sort: r.sort, catalogue: r.catalogue, showOutline: r.show_outline, showResources: r.show_resources,
          showAiPrompts: r.show_ai, showQuiz: r.show_quiz, showRoster: r.show_roster,
          hiddenModules: r.hidden_modules ?? [], title: r.title, shortTitle: r.short_title, tagline: r.tagline, source,
        }
      : { ...DEFAULT_SETTINGS, source };
    out.push({
      ...course,
      title: st.title || course.title,
      shortTitle: st.shortTitle || course.shortTitle,
      tagline: st.tagline || course.tagline,
      settings: st,
    });
  }
  return out.sort((a, b) => (a.settings.sort ?? a.order) - (b.settings.sort ?? b.order));
});

/** Course as a given viewer should see it: hidden sessions removed unless includeHidden. */
export async function getCourse(slug: string, opts: { includeHidden?: boolean } = {}): Promise<LoadedCourse | undefined> {
  const c = (await getAllCourses()).find((x) => x.slug === slug);
  if (!c || opts.includeHidden || !c.settings.hiddenModules.length) return c;
  const hidden = new Set(c.settings.hiddenModules);
  return {
    ...c,
    modules: c.modules.filter((m) => !hidden.has(m.id)),
    days: c.days.map((d) => ({ ...d, blocks: d.blocks.filter((b) => !b.moduleId || !hidden.has(b.moduleId)) })),
  };
}

export function getModule(course: Course, id: string): Module | undefined {
  return course.modules.find((m) => m.id === id);
}

export function moduleNeighbours(course: Course, id: string) {
  const i = course.modules.findIndex((m) => m.id === id);
  return { prev: course.modules[i - 1], next: course.modules[i + 1] };
}

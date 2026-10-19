// Content schema for every course. One JSON file per course in content/courses/<slug>.json.
// Markdown is allowed in fields marked (md): paragraphs, **bold**, lists, tables.

export type Block = {
  time: string;            // "09:00–09:15" (en dash)
  title: string;
  type: "welcome" | "session" | "break" | "exercise" | "close";
  moduleId?: string;       // link to a module for session/exercise/welcome blocks
};

export type Day = {
  id: string; label: string; title: string; blocks: Block[];
  menu?: string;           // optional top-menu tab label; consecutive days sharing it merge into one dropdown ("Wk 1–2")
};

/** An alternative delivery pattern for the same sessions (e.g. 12 weeks weekly vs 6 weeks twice-weekly). */
export type Schedule = {
  id: string;              // "12wk"
  label: string;           // "12 weeks · 1 session a week"
  short: string;           // "12 weeks" — shown on the menu button
  note?: string;
  format?: string; duration?: string; delivery?: string; // override the course fields when selected
  days?: Day[];            // omitted = use course.days
};

export type Quiz = { q: string; opts: string[]; a: number; why: string };

export type Activity = {
  id: string;              // unique within course, e.g. "m1a-act1"
  title: string;
  instructions: string;    // (md)
  minutes?: number;
  prompts: { id: string; label: string; placeholder?: string }[]; // each becomes a saved text box
};

/** A sample playbook kit: the prompt, the template files, and step-by-step sample outputs. */
export type SampleKit = {
  code: string;            // "01", "B1"
  title: string;           // "Discovery & Stakeholder Mapping"
  prompt: string;          // paste-ready prompt that runs the playbook (plain text)
  templates: { label: string; href: string; kind: "blank" | "worked" | "pdf"; preview?: string }[];
  outputs: { step: string; artefact: string; image: string; caption: string }[]; // one per step
};

export type Module = {
  id: string;              // e.g. "d1-s2"
  num: string;             // display number, e.g. "1A", "01", "Wk 2 · Mon"
  title: string;
  subtitle: string;
  dayId: string;
  time: string;
  minutes: number;
  participant: {
    bigIdea: string;                          // one punchy line
    overview: string;                         // (md) 1–3 paragraphs
    objectives: string[];                     // 3–5 "By the end you can…"
    keyPoints: { title: string; body: string }[];   // 3–6 cards
    sections: { heading: string; body: string }[];  // (md) teaching content, 2–5 sections, substantive
    activities: Activity[];                   // 1–3
    aiPrompt?: string;                        // paste-ready prompt for their AI agent (plain text)
    interactive?: Interactive[];             // hands-on simulations (sprint planning, Kanban flow)
    aiContext?: string[];                     // activity ids (any session) whose saved answers are appended to the prompt; default: this session's activities
    samples?: SampleKit[];                    // sample playbook kits: prompt + template files + sample outputs
    quiz: Quiz[];                             // 2–4 knowledge checks
    takeaways: string[];                      // 3–5
  };
  presenter: {
    purpose: string;
    openingLine: string;                      // what to say to open the block (quote)
    beats: { label: string; minutes: number; notes: string }[]; // minutes must sum to module minutes
    facilitationNotes: string;                // (md) how to run it, timings, room management
    roleplay?: { persona: string; line: string; curveball: string; move: string };
    whatGood: string;
    commonFailure: string;                    // "failure — and the fix"
    debrief: string[];
    answerKey?: string;                       // (md) model answers for activities/exercises
    materials: string[];
  };
};

/** Hands-on practice exercises shown above the session's activities. Results save to the workbook as `<id>::result`. */
export type SprintItem = { id: string; title: string; short?: string; points: number; value: "high" | "medium" | "low"; goal: boolean; mustHave?: boolean; ready: boolean; readyNote?: string; dependsOn?: string[] };
export type SprintSim = { type: "sprint"; id: string; title: string; intro: string; minutes?: number; goal: string; capacity: number; sprintName?: string; items: SprintItem[]; model: string; debrief?: string[] };
export type KanbanSim = {
  type: "kanban"; id: string; title: string; intro: string; minutes?: number; days: number; movesPerDay?: number;
  columns: { id: string; name: string; wip?: number }[];
  cards: { id: string; title: string; col: string }[];
  events: { id: string; day: number; text: string; cardId?: string; block?: string; options?: { text: string; correct?: boolean; why: string }[] }[];
  lessons?: string[]; debrief?: string[];
};
export type Interactive = SprintSim | KanbanSim;

/** Course feedback form. Scale = 1–5, nps = 0–10, text = open answer.
 *  area (content, activities, ai, facilitation, pacing, materials, relevance, confidence, overall, strengths, improvement)
 *  and modules let the cohort review turn results into backlog items against the right part of the course. */
export type FeedbackQ = { id: string; q: string; type: "scale" | "nps" | "text"; area: string; modules?: string[] };

export type Course = {
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  format: string;          // "Two-day course"
  duration: string;        // "2 days"
  delivery: string;        // "Live online · APAC · Times Sydney"
  audience: string;
  order: number;
  series?: string;         // "Horizon Series"
  outcomes: string[];
  leaveWith: string[];
  caseStudy?: { title: string; org: string; summary: string; disclaimer?: string };
  days: Day[];
  schedules?: Schedule[];  // first is the default; the viewer picks one from the menu
  modules: Module[];
  feedback?: FeedbackQ[];   // 10-question end-of-course feedback form
  resources: { title: string; description: string; href?: string; audience: "participant" | "presenter" }[];
};

export type CourseStatus = "published" | "hidden" | "archived";

/** Admin-controlled settings stored in Neon; applied on top of the course content. */
export type CourseSettings = {
  status: CourseStatus;          // published = live; hidden = admins/presenters only; archived = enrolled read-only, off catalogue
  sort: number | null;
  catalogue: boolean;            // show under "Also from BAS" to people not enrolled
  showOutline: boolean;
  showResources: boolean;
  showAiPrompts: boolean;
  showQuiz: boolean;
  showRoster: boolean;
  hiddenModules: string[];       // session ids hidden from participants
  title: string | null;          // display overrides
  shortTitle: string | null;
  tagline: string | null;
  source: "file" | "imported";
  liveVersion: number;           // 0 = base content (repo file or first import)
};

/** Which version of a course is being shown, and why. */
export type VersionInfo = { n: number; label: string; live: boolean; reason: "live" | "pinned" | "preview" | "requested" };

export type LoadedCourse = Course & { settings: CourseSettings; version: VersionInfo };

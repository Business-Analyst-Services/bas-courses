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
  resources: { title: string; description: string; href?: string; audience: "participant" | "presenter" }[];
};

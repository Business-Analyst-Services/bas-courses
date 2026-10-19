import type { Course } from "./types";

/** Structural checks for a course JSON. Returns a list of problems (empty = valid). */
export function validateCourse(c: unknown): string[] {
  const e: string[] = [];
  const x = c as Course;
  if (!x || typeof x !== "object") return ["Not a JSON object"];
  for (const k of ["slug", "title", "shortTitle", "tagline", "format", "duration", "delivery", "audience"] as const)
    if (typeof x[k] !== "string" || !x[k]) e.push(`Missing text field "${k}"`);
  if (x.slug && !/^[a-z0-9-]{2,60}$/.test(x.slug)) e.push(`slug must be lowercase letters, numbers and dashes`);
  for (const k of ["outcomes", "leaveWith", "resources", "days", "modules"] as const)
    if (!Array.isArray(x[k])) e.push(`"${k}" must be a list`);
  if (e.length) return e;
  const ids = new Set<string>();
  for (const m of x.modules) {
    const at = `Session ${m?.id ?? "?"}`;
    if (!m?.id) { e.push("A session is missing its id"); continue; }
    if (ids.has(m.id)) e.push(`${at}: duplicate id`);
    ids.add(m.id);
    if (!x.days.some((d) => d.id === m.dayId)) e.push(`${at}: dayId "${m.dayId}" doesn't match a day`);
    if (!m.participant) e.push(`${at}: missing participant content`);
    if (!m.presenter) e.push(`${at}: missing presenter content`);
    if (!m.participant || !m.presenter) continue;
    for (const k of ["bigIdea", "overview"] as const) if (typeof m.participant[k] !== "string") e.push(`${at}: participant.${k} missing`);
    for (const k of ["objectives", "keyPoints", "sections", "activities", "quiz", "takeaways"] as const)
      if (!Array.isArray(m.participant[k])) e.push(`${at}: participant.${k} must be a list`);
    for (const k of ["beats", "debrief", "materials"] as const)
      if (!Array.isArray(m.presenter[k])) e.push(`${at}: presenter.${k} must be a list`);
    const sum = (m.presenter.beats ?? []).reduce((a, b) => a + (b.minutes || 0), 0);
    if (sum !== m.minutes) e.push(`${at}: run-sheet beats add to ${sum} min but the session is ${m.minutes} min`);
    (m.participant.quiz ?? []).forEach((q, i) => {
      if (!(q.a >= 0 && q.a < (q.opts?.length ?? 0))) e.push(`${at}: quiz question ${i + 1} has an invalid answer index`);
    });
  }
  const pathIds = new Set((x.pathways ?? []).map((p) => p.id));
  for (const m of x.modules) for (const k of Object.keys(m.participant?.pathways ?? {})) if (!pathIds.has(k)) e.push(`Session ${m.id}: content for unknown pathway "${k}"`);
  const actIds = new Set(x.modules.flatMap((m) => [...(m.participant?.activities ?? []), ...Object.values(m.participant?.pathways ?? {}).map((p) => p.activity)]).map((a) => a.id));
  if (actIds.size !== x.modules.reduce((n, m) => n + (m.participant?.activities?.length ?? 0) + Object.keys(m.participant?.pathways ?? {}).length, 0)) e.push("Duplicate activity ids (including pathway activities)");
  for (const m of x.modules) for (const a of m.participant?.aiContext ?? []) if (!actIds.has(a)) e.push(`Session ${m.id}: AI prompt links to missing activity ${a}`);
  const modIds = new Set(x.modules.map((m) => m.id));
  for (const q of x.feedback ?? []) {
    if (!["scale", "nps", "text"].includes(q.type)) e.push(`Feedback question ${q.id}: type must be scale, nps or text`);
    for (const mid of q.modules ?? []) if (!modIds.has(mid)) e.push(`Feedback question ${q.id} links to missing session ${mid}`);
  }
  for (const d of x.days) for (const b of d.blocks ?? []) if (b.moduleId && !ids.has(b.moduleId)) e.push(`Agenda block "${b.title}" links to missing session ${b.moduleId}`);
  return e;
}

/** A minimal, valid starting point for a brand-new course. */
export function courseTemplate(slug = "new-course"): Course {
  return {
    slug, title: "New Course Title", shortTitle: "New Course", tagline: "One line on what participants achieve.",
    format: "One-day course", duration: "1 day", delivery: "Live online · APAC · Times Sydney",
    audience: "Business analysts and team leads", order: 50,
    outcomes: ["Outcome one", "Outcome two"], leaveWith: ["Artefact one"],
    days: [{ id: "d1", label: "Day 1", title: "Day theme", blocks: [
      { time: "09:00–10:30", title: "First session", type: "session", moduleId: "d1-s1" },
      { time: "10:30–10:45", title: "Break", type: "break" },
    ] }],
    modules: [{
      id: "d1-s1", num: "1", title: "First session", subtitle: "What this session covers", dayId: "d1", time: "09:00–10:30", minutes: 90,
      participant: {
        bigIdea: "The one idea to remember.", overview: "A short overview paragraph.",
        objectives: ["Objective one"], keyPoints: [{ title: "Point", body: "Explanation" }],
        sections: [{ heading: "Teaching section", body: "Markdown content: paragraphs, **bold**, lists and tables." }],
        activities: [{ id: "d1-s1-a1", title: "Activity", instructions: "What to do.", minutes: 20, prompts: [{ id: "p1", label: "Your answer" }] }],
        aiPrompt: "Optional paste-ready prompt.",
        quiz: [{ q: "Question?", opts: ["Right", "Wrong"], a: 0, why: "Why it's right." }],
        takeaways: ["Takeaway one"],
      },
      presenter: {
        purpose: "Why this session exists.", openingLine: "What to say to open.",
        beats: [{ label: "TEACH", minutes: 30, notes: "" }, { label: "BUILD", minutes: 45, notes: "" }, { label: "DEBRIEF", minutes: 15, notes: "" }],
        facilitationNotes: "How to run it.", whatGood: "What good looks like.", commonFailure: "Common failure and the fix.",
        debrief: ["Debrief question"], answerKey: "Model answers.", materials: ["Slides"],
      },
    }],
    resources: [],
  };
}

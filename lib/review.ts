import { ensureSchema, sql } from "./db";
import { getFeedbackRows, summarise, type QStat } from "./feedback";
import type { Course } from "./types";

export type BacklogDraft = {
  key: string; title: string; detail: string; area: string; modules: string[];
  source: "feedback" | "comment" | "quiz" | "activity" | "completion" | "attendance" | "build-out";
  evidence: string; priority: "high" | "medium" | "low";
};
export type CohortReview = {
  participants: number; respondents: number; responseRate: number | null;
  avgRating: number | null; nps: number | null;
  quizRate: number | null; completionRate: number | null; attendanceRate: number | null;
  stats: QStat[]; strengths: string[]; drafts: BacklogDraft[];
};

const AREA: Record<string, { label: string; fix: string; build: string }> = {
  content:     { label: "Content clarity", fix: "Rework the teaching sections for these sessions: tighten the explanation, add a worked example or diagram, and check the big idea and objectives match what is taught.", build: "Add an advanced follow-up (deep-dive session, template pack or on-demand module) on this topic." },
  activities:  { label: "Activities", fix: "Redesign the activity: clearer instructions, a worked example to start from, realistic timing and a stronger debrief.", build: "Turn this activity into a reusable workplace template or a capstone exercise." },
  ai:          { label: "AI prompts", fix: "Review the AI prompts for these sessions: make the task more specific, check the answers carried forward are useful, and add an example of a good response.", build: "Add a prompt library and a short demo of checking and improving AI drafts." },
  facilitation:{ label: "Facilitation", fix: "Brief facilitators: strengthen opening lines, debrief questions and answer keys in the presenter notes; consider co-facilitation.", build: "Record the facilitator's best explanations as short videos for pre-reading." },
  pacing:      { label: "Pacing", fix: "Rebalance session timings: trim teaching beats, protect activity time, and mark optional content facilitators can cut.", build: "Offer an extended or split-schedule version of the course." },
  materials:   { label: "Materials", fix: "Improve the templates, diagrams and worked examples: check they render clearly, match the session and are easy to adapt.", build: "Publish the materials as a downloadable pack participants can keep using." },
  relevance:   { label: "Relevance", fix: "Add worked examples from more industries and roles, and let participants apply each technique to their own work.", build: "Create industry-specific case-study variants of the course." },
  confidence:  { label: "Confidence to apply", fix: "Add more guided practice and a role-play for this skill, with a clear 'try this next week' action.", build: "Add a post-course coaching clinic or community of practice session." },
  overall:     { label: "Overall recommendation", fix: "Read the comments and lowest-scoring questions together, and fix the top two issues before the next cohort.", build: "Use the strongest-rated parts in marketing and as a showcase session." },
};
const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const ratio = (a: number, b: number) => (b ? a / b : null);

/** Everything known about a finished cohort, turned into a review and a prioritised improvement backlog. */
export async function buildCohortReview(course: Course, cohortId: number): Promise<CohortReview> {
  await ensureSchema();
  const people = (await sql`SELECT email FROM enrolments WHERE cohort_id = ${cohortId} AND role = 'participant' AND status = 'active'`) as { email: string }[];
  const emails = people.map((p) => p.email);
  const n = emails.length;
  const fb = await getFeedbackRows(course.slug, cohortId);
  const { stats, respondents } = summarise(course, fb);
  const [quiz, resp, prog, att] = (await Promise.all([
    sql`SELECT module_id, question, count(*)::int AS n, count(*) FILTER (WHERE correct)::int AS ok FROM quiz_answers WHERE course_slug = ${course.slug} AND email = ANY(${emails}) GROUP BY 1, 2`,
    sql`SELECT activity_id, count(DISTINCT email)::int AS n FROM responses WHERE course_slug = ${course.slug} AND value <> '' AND email = ANY(${emails}) GROUP BY 1`,
    sql`SELECT module_id, count(DISTINCT email)::int AS n FROM progress WHERE course_slug = ${course.slug} AND email = ANY(${emails}) GROUP BY 1`,
    sql`SELECT module_id, count(*)::int AS n, count(*) FILTER (WHERE present)::int AS ok FROM attendance WHERE cohort_id = ${cohortId} GROUP BY 1`,
  ])) as [
    { module_id: string; question: number; n: number; ok: number }[],
    { activity_id: string; n: number }[],
    { module_id: string; n: number }[],
    { module_id: string; n: number; ok: number }[],
  ];
  const mod = (id: string) => course.modules.find((m) => m.id === id);
  const mname = (id: string) => { const m = mod(id); return m ? `Session ${m.num} · ${m.title}` : id; };
  const drafts: BacklogDraft[] = [];

  // 1. Low-rated feedback questions → fix items. High-rated → build-out ideas.
  for (const s of stats) {
    if (s.q.type === "text" || s.avg == null || !s.n) continue;
    const a = AREA[s.q.area] ?? AREA.overall;
    const norm = s.q.type === "nps" ? s.avg / 2 : s.avg;
    const ev = `"${s.q.q}" averaged ${s.avg.toFixed(1)}/${s.q.type === "nps" ? 10 : 5} from ${s.n} response${s.n === 1 ? "" : "s"}${s.nps != null ? ` (NPS ${s.nps})` : ""}.`;
    if (norm < 3.8 || (s.nps != null && s.nps < 0)) {
      drafts.push({ key: `fb:${s.q.id}`, title: `${a.label}: ${short(s.q.q)}`, detail: a.fix, area: s.q.area, modules: s.q.modules ?? [],
        source: "feedback", evidence: ev, priority: norm < 3 || (s.nps != null && s.nps < -20) ? "high" : "medium" });
    } else if (norm >= 4.3 && s.q.type === "scale") {
      drafts.push({ key: `bo:${s.q.id}`, title: `Build out a strength: ${short(s.q.q, 60)}`, detail: a.build, area: s.q.area, modules: s.q.modules ?? [],
        source: "build-out", evidence: ev, priority: "low" });
    }
  }
  // 2. "What would you change or add?" comments → one item each.
  for (const s of stats.filter((x) => x.q.area === "improvement")) {
    for (const c of s.comments) drafts.push({ key: `cm:${hash(c)}`, title: `Participant suggestion: ${short(c)}`, detail: c, area: "improvement", modules: [],
      source: "comment", evidence: `Answer to "${s.q.q}"`, priority: "medium" });
  }
  // 3. Quiz questions most people got wrong.
  for (const q of quiz) {
    const r = ratio(q.ok, q.n); const m = mod(q.module_id); const item = m?.participant.quiz[q.question];
    if (r == null || q.n < 3 || r >= 0.6 || !m || !item) continue;
    drafts.push({ key: `qz:${q.module_id}:${q.question}`, title: `Quiz misunderstood: ${short(item.q)}`, area: "content", modules: [q.module_id],
      detail: `Only ${Math.round(r * 100)}% answered correctly. Either the concept isn't landing in ${mname(q.module_id)} — add an example or re-teach it — or the question/options are ambiguous and need rewording.`,
      source: "quiz", evidence: `${q.ok} of ${q.n} correct · correct answer: "${item.opts[item.a]}"`, priority: r < 0.4 ? "high" : "medium" });
  }
  // 4. Activities few people completed. If most activities are low, the workbook itself wasn't used: one item, not many.
  if (n >= 3) {
    const acts = course.modules.flatMap((m) => m.participant.activities.map((a) => ({ m, a, done: resp.find((x) => x.activity_id === a.id)?.n ?? 0 })));
    const low = acts.filter((x) => x.done / n < 0.5);
    if (acts.length && low.length / acts.length > 0.6) {
      drafts.push({ key: "act:workbook", title: "Online workbook rarely used by this cohort", area: "activities", modules: [],
        detail: "Most activities have few saved answers. Check whether the facilitator ran activities verbally or on paper, show participants where answers save in the first session, and build time into each activity for typing answers — the AI prompts and the review rely on them.",
        source: "activity", evidence: `${low.length} of ${acts.length} activities were completed by fewer than half of the ${n} participants.`, priority: "high" });
    } else for (const { m, a, done } of low) {
      const r = done / n;
      drafts.push({ key: `act:${a.id}`, title: `Activity rarely completed: ${a.title}`, area: "activities", modules: [m.id],
        detail: `Check whether there is enough time (${a.minutes ?? "?"} min planned), whether the instructions are clear, and whether the activity feels relevant. Consider a worked starter answer.`,
        source: "activity", evidence: `${done} of ${n} participants saved an answer in ${mname(m.id)}.`, priority: r < 0.25 ? "high" : "medium" });
    }
  }
  // 5. Sessions few people marked complete, and low attendance.
  if (n >= 3) for (const m of course.modules) {
    const c = prog.find((x) => x.module_id === m.id)?.n ?? 0;
    if (c / n < 0.5) drafts.push({ key: `comp:${m.id}`, title: `Low completion: ${mname(m.id)}`, area: "pacing", modules: [m.id],
      detail: "Find out whether participants ran out of time, lost interest, or just forgot to mark it complete. Remind them at the end of each session and check the session length.",
      source: "completion", evidence: `${c} of ${n} participants marked it complete.`, priority: "low" });
    const at = att.find((x) => x.module_id === m.id);
    if (at && at.n >= 3 && at.ok / at.n < 0.7) drafts.push({ key: `att:${m.id}`, title: `Low attendance: ${mname(m.id)}`, area: "pacing", modules: [m.id],
      detail: "Check the session's timing and scheduling, and whether its purpose is clear in the agenda.", source: "attendance",
      evidence: `${at.ok} of ${at.n} marked present.`, priority: "medium" });
  }

  const scaleAvgs = stats.filter((s) => s.q.type === "scale" && s.avg != null).map((s) => s.avg!);
  const npsStat = stats.find((s) => s.q.type === "nps");
  const qTot = quiz.reduce((a, b) => a + b.n, 0), qOk = quiz.reduce((a, b) => a + b.ok, 0);
  const aTot = att.reduce((a, b) => a + b.n, 0), aOk = att.reduce((a, b) => a + b.ok, 0);
  const order = { high: 0, medium: 1, low: 2 };
  return {
    participants: n, respondents, responseRate: ratio(respondents, n),
    avgRating: scaleAvgs.length ? scaleAvgs.reduce((a, b) => a + b, 0) / scaleAvgs.length : null,
    nps: npsStat?.nps ?? null,
    quizRate: ratio(qOk, qTot),
    completionRate: n ? ratio(prog.reduce((a, b) => a + b.n, 0), n * course.modules.length) : null,
    attendanceRate: ratio(aOk, aTot),
    stats, strengths: stats.filter((s) => s.q.area === "strengths").flatMap((s) => s.comments),
    drafts: drafts.sort((a, b) => order[a.priority] - order[b.priority]),
  };
}

/** Writes the generated drafts into the backlog. Re-running refreshes evidence but keeps any status/priority changes. */
export async function saveBacklog(courseSlug: string, cohortId: number, drafts: BacklogDraft[], by: string, review: CohortReview) {
  await ensureSchema();
  for (const d of drafts) {
    await sql`INSERT INTO improvement_backlog (course_slug, cohort_id, key, title, detail, area, modules, source, evidence, priority)
              VALUES (${courseSlug}, ${cohortId}, ${d.key}, ${d.title}, ${d.detail}, ${d.area}, ${d.modules.join(",")}, ${d.source}, ${d.evidence}, ${d.priority})
              ON CONFLICT (cohort_id, key) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, evidence = EXCLUDED.evidence, updated_at = now()`;
  }
  const summary = { ...review, stats: undefined, drafts: drafts.length };
  await sql`INSERT INTO cohort_reviews (cohort_id, generated_by, summary) VALUES (${cohortId}, ${by}, ${JSON.stringify(summary)})
            ON CONFLICT (cohort_id) DO UPDATE SET generated_at = now(), generated_by = EXCLUDED.generated_by, summary = EXCLUDED.summary`;
}

export type BacklogItem = {
  id: number; course_slug: string; cohort_id: number | null; key: string | null; title: string; detail: string | null; area: string | null;
  modules: string | null; source: string; evidence: string | null; priority: string; status: string; created_at: string;
};
export async function getBacklog(where: { cohortId?: number; course?: string }): Promise<BacklogItem[]> {
  await ensureSchema();
  const rows = (where.cohortId
    ? await sql`SELECT * FROM improvement_backlog WHERE cohort_id = ${where.cohortId}`
    : where.course ? await sql`SELECT * FROM improvement_backlog WHERE course_slug = ${where.course}` : await sql`SELECT * FROM improvement_backlog`) as BacklogItem[];
  const p: Record<string, number> = { high: 0, medium: 1, low: 2 }, s: Record<string, number> = { new: 0, planned: 1, done: 2, dismissed: 3 };
  return rows.sort((a, b) => (s[a.status] ?? 9) - (s[b.status] ?? 9) || (p[a.priority] ?? 9) - (p[b.priority] ?? 9) || a.id - b.id);
}

export function backlogMarkdown(title: string, items: BacklogItem[], review?: CohortReview | null) {
  const pc = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const head = review ? `\n**Participants:** ${review.participants} · **Feedback responses:** ${review.respondents} (${pc(review.responseRate)}) · **Average rating:** ${review.avgRating?.toFixed(1) ?? "—"}/5 · **NPS:** ${review.nps ?? "—"} · **Quiz:** ${pc(review.quizRate)} · **Completion:** ${pc(review.completionRate)} · **Attendance:** ${pc(review.attendanceRate)}\n` : "";
  const strengths = review?.strengths.length ? `\n## What participants valued\n\n${review.strengths.map((s) => `- ${s}`).join("\n")}\n` : "";
  const items_ = items.map((i) => `### [${i.priority.toUpperCase()}] ${i.title}\n\n- **Status:** ${i.status} · **Source:** ${i.source}${i.area ? ` · **Area:** ${i.area}` : ""}${i.modules ? ` · **Sessions:** ${i.modules}` : ""}\n- **Evidence:** ${i.evidence ?? "—"}\n\n${i.detail ?? ""}\n`).join("\n");
  return `# ${title}\n${head}${strengths}\n## Improvement backlog (${items.length})\n\n${items_}`;
}

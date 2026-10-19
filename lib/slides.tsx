import Md from "@/components/Md";
import type { Slide } from "@/components/Present";
import type { Course, Module } from "@/lib/types";

/** Turns a session's participant and presenter content into facilitator slides. */
export function buildSlides(course: Course, m: Module): Slide[] {
  const P = m.participant, T = m.presenter;
  const k = `${course.shortTitle} · Session ${m.num}`;
  const beat = (label: string) => T.beats.find((b) => b.label.toLowerCase().includes(label.toLowerCase()));
  const beatNotes = (b?: { label: string; minutes: number; notes: string }) => (b ? `**${b.label}** · ${b.minutes} min\n\n${b.notes}` : undefined);

  return [
    { kind: "title", kicker: k, title: m.title, body: <p className="ssub">{m.subtitle} · {m.minutes} min</p>,
      notes: `**Open with:** ${T.openingLine}\n\n**Purpose:** ${T.purpose}\n\n**Run sheet:**\n${T.beats.map((b) => `- ${b.label} — ${b.minutes} min`).join("\n")}` },
    { kind: "idea", kicker: "The big idea", title: P.bigIdea, notes: T.facilitationNotes },
    { kind: "list", kicker: "By the end of this session you can", title: "Objectives", body: <ol className="sobj">{P.objectives.map((o) => <li key={o}>{o}</li>)}</ol> },
    { kind: "cards", kicker: "Key points", title: "What matters most", body: <div className="scards">{P.keyPoints.map((p) => <div key={p.title}><b>{p.title}</b><span>{p.body}</span></div>)}</div> },
    ...P.sections.map((s, n): Slide => ({ kind: "content", kicker: `${k} · ${n + 1} of ${P.sections.length}`, title: s.heading, body: <Md>{s.body}</Md>, notes: beatNotes(T.beats[Math.min(n, T.beats.length - 1)]) })),
    ...P.activities.map((a, n): Slide => ({
      kind: "activity", kicker: `Activity ${n + 1}${a.minutes ? ` · ${a.minutes} minutes` : ""}`, title: a.title,
      body: <><Md>{a.instructions}</Md><ul className="sprompts">{a.prompts.map((p) => <li key={p.id}>{p.label}</li>)}</ul><p className="ssub">Write your answers in the Activities tab — they save to your workbook.</p></>,
      notes: [beatNotes(beat("activity") ?? beat(a.title)), T.whatGood && `**What good looks like:** ${T.whatGood}`, T.answerKey && `**Answer key:** ${T.answerKey}`].filter(Boolean).join("\n\n"),
    })),
    ...(T.roleplay ? [{ kind: "roleplay", kicker: "Role-play", title: T.roleplay.persona, body: <blockquote className="squote">{T.roleplay.line}</blockquote>,
      notes: `**Curveball:** ${T.roleplay.curveball}\n\n**Move:** ${T.roleplay.move}` } as Slide] : []),
    ...P.quiz.map((q, n): Slide => ({
      kind: "quiz", kicker: `Knowledge check · ${n + 1} of ${P.quiz.length}`, title: q.q,
      body: <ol className="sopts" type="A">{q.opts.map((o) => <li key={o}>{o}</li>)}</ol>,
      reveal: <><b>{String.fromCharCode(65 + q.a)}. {q.opts[q.a]}</b><span>{q.why}</span></>,
    })),
    { kind: "list", kicker: "Debrief", title: "Let's discuss", body: <ul className="sobj">{T.debrief.map((d) => <li key={d}>{d}</li>)}</ul>, notes: `**Common failure — and the fix:** ${T.commonFailure}` },
    { kind: "list", kicker: "Takeaways", title: "What to remember", body: <ol className="sobj">{P.takeaways.map((t) => <li key={t}>{t}</li>)}</ol> },
  ];
}

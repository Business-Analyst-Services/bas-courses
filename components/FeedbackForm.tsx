"use client";
import { useState, useTransition } from "react";
import { submitFeedback } from "@/lib/actions";
import type { FeedbackQ } from "@/lib/types";

type A = Record<string, { score?: number | null; text?: string | null }>;

export default function FeedbackForm({ slug, questions, initial }: { slug: string; questions: FeedbackQ[]; initial: A }) {
  const [a, setA] = useState<A>(initial);
  const [state, setState] = useState<"" | "saved" | "error">(Object.keys(initial).length ? "saved" : "");
  const [pending, start] = useTransition();
  const answered = questions.filter((q) => (q.type === "text" ? a[q.id]?.text?.trim() : a[q.id]?.score != null)).length;
  const set = (id: string, v: { score?: number | null; text?: string | null }) => { setA({ ...a, [id]: { ...a[id], ...v } }); setState(""); };

  return (
    <form className="fbform" onSubmit={(e) => { e.preventDefault(); start(async () => { try { await submitFeedback(slug, a); setState("saved"); } catch { setState("error"); } }); }}>
      {questions.map((q, i) => (
        <div key={q.id} className="fbq" role="group" aria-labelledby={`fbq-${q.id}`}>
          <div className="fbqt" id={`fbq-${q.id}`}><span className="fbn">{i + 1}</span>{q.q}</div>
          {q.type === "text" ? (
            <textarea rows={3} value={a[q.id]?.text ?? ""} onChange={(e) => set(q.id, { text: e.target.value })} placeholder="Your answer" />
          ) : (
            <div className={`fbscale ${q.type}`}>
              <div className="fbbtns" role="radiogroup">
              {Array.from({ length: q.type === "nps" ? 11 : 5 }, (_, k) => (q.type === "nps" ? k : k + 1)).map((n) => (
                <button type="button" key={n} role="radio" aria-checked={a[q.id]?.score === n} className={a[q.id]?.score === n ? "on" : ""} onClick={() => set(q.id, { score: n })}>{n}</button>
              ))}
              </div>
              <div className="fbends"><span>{q.type === "nps" ? "Not at all likely" : "Strongly disagree"}</span><span>{q.type === "nps" ? "Extremely likely" : "Strongly agree"}</span></div>
            </div>
          )}
        </div>
      ))}
      <div className="fbsubmit">
        <span>{answered} of {questions.length} answered</span>
        <button className="btn" disabled={pending || !answered}>{pending ? "Saving…" : state === "saved" ? "Update feedback" : "Submit feedback"}</button>
        {state === "saved" && <span className="ok">✓ Thank you — your feedback is saved. You can change it any time.</span>}
        {state === "error" && <span className="bad">Couldn&apos;t save. Please try again.</span>}
      </div>
    </form>
  );
}

"use client";
import { useState } from "react";
import { answerQuiz } from "@/lib/actions";
import type { Quiz as Q } from "@/lib/types";

export default function Quiz({ slug, moduleId, items, initial }: { slug: string; moduleId: string; items: Q[]; initial: Record<number, number> }) {
  const [picked, setPicked] = useState<Record<number, number>>(initial);
  const score = items.filter((q, i) => picked[i] === q.a).length;
  const answered = Object.keys(picked).length;
  return (
    <div>
      {items.map((q, i) => {
        const p = picked[i];
        return (
          <div className="qcard" key={i}>
            <div className="qtext">{i + 1}. {q.q}</div>
            {q.opts.map((o, j) => {
              const cls = p === undefined ? "" : j === q.a ? "right" : j === p ? "wrongpick" : "";
              return (
                <button key={j} className={`qbtn ${cls}`} disabled={p !== undefined}
                  onClick={() => { setPicked({ ...picked, [i]: j }); answerQuiz(slug, moduleId, i, j).catch(() => {}); }}>
                  {o}
                </button>
              );
            })}
            {p !== undefined && <div className="qexpl"><b>{p === q.a ? "Correct. " : "Not quite. "}</b>{q.why}</div>}
          </div>
        );
      })}
      {answered === items.length && items.length > 0 && (
        <div className="successband" style={{ padding: 14, borderRadius: 12 }}>You scored {score} / {items.length}.</div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";

export type PromptSource = {
  activityId: string;
  title: string;
  where: string;          // e.g. "This session" or "Session 1"
  fields: { promptId: string; label: string; value: string }[];
};

export const RESPONSE_EVENT = "bas:response-saved";
export type ResponseEventDetail = { activityId: string; promptId: string; value: string };

/** The session's AI prompt, combined with the participant's own saved workbook answers.
 *  Answers update live as the participant types in the Activities tab (no reload needed). */
export default function AiPrompt({ prompt, sources }: { prompt: string; sources: PromptSource[] }) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(sources.flatMap((s) => s.fields.map((f) => [`${s.activityId}::${f.promptId}`, f.value]))));
  const filled = (s: PromptSource) => s.fields.some((f) => (vals[`${s.activityId}::${f.promptId}`] ?? "").trim());
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(sources.map((s) => [s.activityId, true])));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<ResponseEventDetail>).detail;
      setVals((v) => ({ ...v, [`${d.activityId}::${d.promptId}`]: d.value }));
    };
    window.addEventListener(RESPONSE_EVENT, h);
    return () => window.removeEventListener(RESPONSE_EVENT, h);
  }, []);

  const included = sources.filter((s) => on[s.activityId] && filled(s));
  const text = useMemo(() => {
    if (!included.length) return prompt;
    const body = included.map((s) => {
      const lines = s.fields
        .map((f) => [f.label, (vals[`${s.activityId}::${f.promptId}`] ?? "").trim()] as const)
        .filter(([, v]) => v)
        .map(([l, v]) => `${l}:\n${v}`);
      return `### ${s.title}\n${lines.join("\n\n")}`;
    }).join("\n\n");
    return `${prompt.trimEnd()}\n\n--- MY WORKBOOK ANSWERS ---\n\n${body}`;
  }, [prompt, included, vals]);

  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div className="promptcard" id="ai-prompt">
      <div className="promptbar">
        <span className="dots"><i /><i /><i /></span>
        <span>Paste into your course agent</span>
        <button className="btn ghost" onClick={copy}>
          {copied ? "✓ Copied" : included.length ? `Copy prompt + my answers` : "Copy prompt"}
        </button>
      </div>
      {sources.length > 0 && (
        <div className="aisrc">
          <div className="aisrch">Your workbook answers added to this prompt</div>
          {sources.map((s) => {
            const has = filled(s);
            return (
              <label key={s.activityId} className={`aisrcrow ${has ? "" : "empty"}`}>
                <input type="checkbox" disabled={!has} checked={has && !!on[s.activityId]}
                  onChange={(e) => setOn({ ...on, [s.activityId]: e.target.checked })} />
                <span><b>{s.title}</b> <small>· {s.where}</small></span>
                <em>{has ? "✓ answered" : "not answered yet — complete it in Activities"}</em>
              </label>
            );
          })}
        </div>
      )}
      <div className="pre">{text}</div>
      <div className="guard">🛡️ Review before pasting. Never paste confidential or personal data into a consumer AI tool — use your organisation&apos;s approved tool.</div>
    </div>
  );
}

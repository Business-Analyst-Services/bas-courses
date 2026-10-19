"use client";
import { useEffect, useMemo, useState } from "react";

export type PromptSource = {
  activityId: string;
  title: string;
  where: string;          // "this session" or "Session 3"
  current: boolean;       // true when the activity belongs to this session
  fields: { promptId: string; label: string; value: string }[];
};

export const RESPONSE_EVENT = "bas:response-saved";
export type ResponseEventDetail = { activityId: string; promptId: string; value: string };

/** The session's AI prompt, combined with the participant's own saved workbook answers:
 *  their earlier work as context, and this session's answers as the focus.
 *  Answers update live as the participant types in the Activities tab. */
export default function AiPrompt({ prompt, sources }: { prompt: string; sources: PromptSource[] }) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(sources.flatMap((s) => s.fields.map((f) => [`${s.activityId}::${f.promptId}`, f.value]))));
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(sources.map((s) => [s.activityId, true])));
  const [showEarlier, setShowEarlier] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<ResponseEventDetail>).detail;
      setVals((v) => ({ ...v, [`${d.activityId}::${d.promptId}`]: d.value }));
    };
    window.addEventListener(RESPONSE_EVENT, h);
    return () => window.removeEventListener(RESPONSE_EVENT, h);
  }, []);

  const answered = (s: PromptSource) => s.fields.filter((f) => (vals[`${s.activityId}::${f.promptId}`] ?? "").trim());
  const filled = (s: PromptSource) => answered(s).length > 0;
  const earlier = sources.filter((s) => !s.current);
  const current = sources.filter((s) => s.current);
  const inc = (list: PromptSource[]) => list.filter((s) => on[s.activityId] && filled(s));

  const text = useMemo(() => {
    const block = (s: PromptSource) =>
      `### ${s.title} (${s.where})\n` + answered(s).map((f) => `${f.label}:\n${vals[`${s.activityId}::${f.promptId}`].trim()}`).join("\n\n");
    const e = inc(earlier), c = inc(current);
    if (!e.length && !c.length) return prompt;
    let out = `${prompt.trimEnd()}\n\n--- MY WORKBOOK ANSWERS ---`;
    if (e.length) out += `\n\nEARLIER WORK (context — my item as it has developed so far):\n\n${e.map(block).join("\n\n")}`;
    if (c.length) out += `\n\nTHIS SESSION (focus your answer here):\n\n${c.map(block).join("\n\n")}`;
    else out += `\n\n(I haven't completed this session's activity yet — work from my earlier answers.)`;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, vals, on]);

  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const row = (s: PromptSource) => {
    const has = filled(s);
    return (
      <label key={s.activityId} className={`aisrcrow ${has ? "" : "empty"}`}>
        <input type="checkbox" disabled={!has} checked={has && !!on[s.activityId]}
          onChange={(e) => setOn({ ...on, [s.activityId]: e.target.checked })} />
        <span><b>{s.title}</b> <small>· {s.where}</small></span>
        <em>{has ? `✓ ${answered(s).length} answer${answered(s).length > 1 ? "s" : ""}` : s.current ? "not answered yet — complete it in Activities" : "not answered"}</em>
      </label>
    );
  };
  const eFilled = earlier.filter(filled), eOn = inc(earlier);

  return (
    <div className="promptcard" id="ai-prompt">
      <div className="promptbar">
        <span className="dots"><i /><i /><i /></span>
        <span>Paste into your course agent</span>
        <button className="btn ghost" onClick={copy}>
          {copied ? "✓ Copied" : inc(sources).length ? "Copy prompt + my answers" : "Copy prompt"}
        </button>
      </div>
      {sources.length > 0 && (
        <div className="aisrc">
          {current.length > 0 && <><div className="aisrch">This session</div>{current.map(row)}</>}
          {earlier.length > 0 && (
            <>
              <div className="aisrch" style={{ marginTop: current.length ? 10 : 0 }}>
                Earlier work carried forward · {eOn.length} of {eFilled.length} answered included
                <button type="button" className="aitoggle" onClick={() => setShowEarlier(!showEarlier)}>{showEarlier ? "Hide" : "Choose"}</button>
              </div>
              {showEarlier && earlier.map(row)}
            </>
          )}
        </div>
      )}
      <div className="pre">{text}</div>
      <div className="guard">🛡️ Review before pasting. Never paste confidential or personal data into a consumer AI tool — use your organisation&apos;s approved tool.</div>
    </div>
  );
}

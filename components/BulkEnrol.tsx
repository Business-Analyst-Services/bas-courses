"use client";
import { useActionState, useState } from "react";
import { bulkEnrol, type BulkResult } from "@/lib/program-actions";

export type Target = { value: string; label: string; group: string };

export default function BulkEnrol({ targets, defaultTarget, title = "Enrol people" }: { targets: Target[]; defaultTarget?: string; title?: string }) {
  const [state, action, pending] = useActionState<BulkResult, FormData>(bulkEnrol, {});
  const [q, setQ] = useState("");
  const groups = [...new Set(targets.map((t) => t.group))];
  const shown = (t: Target) => !q || t.label.toLowerCase().includes(q.toLowerCase());
  return (
    <form action={action} className="panel">
      <h3>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>
        One person per line, pasted straight from a spreadsheet. Tick every course, cohort or intake they should join below; everyone is enrolled into all of them.
        To give one person different courses, add the names on their line: <code>email, presenter, Agile BA, BA Leadership</code>. An <b>intake</b> enrols into every course in its program.
      </p>
      {state.ok && <div className="okband">✓ {state.ok}</div>}
      {state.errors && <div className="errband"><ul style={{ margin: "0 0 0 18px" }}>{state.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <div className="formgrid">
        <div className="wide"><label>People</label><textarea name="lines" rows={5} required placeholder={"jane@company.com\nsam@company.com, presenter\nalex@company.com, Horizon Series · Feb 2027"} style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5 }} /></div>
        <div className="wide">
          <label>Enrol into: tick as many as you need</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter courses, cohorts and intakes…" style={{ marginBottom: 8 }} />
          <div className="targetbox">
            {groups.map((g) => (
              <div key={g}>
                <div className="olh" style={{ margin: "6px 0" }}>{g}</div>
                <div className="checks">
                  {targets.filter((t) => t.group === g).map((t) => (
                    <label key={t.value} className="check" style={{ display: shown(t) ? undefined : "none" }}>
                      <input type="checkbox" name="target" value={t.value} defaultChecked={t.value === defaultTarget} />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <label className="check" style={{ marginTop: 10, maxWidth: 420 }}><input type="checkbox" name="override" /><span>Allow over capacity<small>Otherwise people beyond capacity go on the waitlist.</small></span></label>
      <div className="btnrow2"><button className="btn" disabled={pending}>{pending ? "Enrolling…" : "Enrol"}</button></div>
    </form>
  );
}

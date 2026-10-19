"use client";
import { useActionState } from "react";
import { bulkEnrol, type BulkResult } from "@/lib/program-actions";

export type Target = { value: string; label: string; group: string };

export default function BulkEnrol({ targets, defaultTarget, title = "Enrol people" }: { targets: Target[]; defaultTarget?: string; title?: string }) {
  const [state, action, pending] = useActionState<BulkResult, FormData>(bulkEnrol, {});
  const groups = [...new Set(targets.map((t) => t.group))];
  return (
    <form action={action} className="panel">
      <h3>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>
        One person per line. Paste straight from a spreadsheet: <code>email</code>, optionally followed by <code>presenter</code> and/or a different intake, cohort or course name for that person.
        Enrolling into an <b>intake</b> enrols into every course in it.
      </p>
      {state.ok && <div className="okband">✓ {state.ok}</div>}
      {state.errors && <div className="errband"><ul style={{ margin: "0 0 0 18px" }}>{state.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <div className="formgrid">
        <div className="wide"><label>People</label><textarea name="lines" rows={5} required placeholder={"jane@company.com\nsam@company.com, presenter\nalex@company.com, Horizon Series · Feb 2027"} style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5 }} /></div>
        <div className="wide"><label>Enrol into (default for every line)</label>
          <select name="target" defaultValue={defaultTarget ?? targets[0]?.value}>
            {groups.map((g) => <optgroup key={g} label={g}>{targets.filter((t) => t.group === g).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>)}
          </select></div>
      </div>
      <label className="check" style={{ marginTop: 10, maxWidth: 420 }}><input type="checkbox" name="override" /><span>Allow over capacity<small>Otherwise people beyond capacity go on the waitlist.</small></span></label>
      <div className="btnrow2"><button className="btn" disabled={pending}>{pending ? "Enrolling…" : "Enrol"}</button></div>
    </form>
  );
}

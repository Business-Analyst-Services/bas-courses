"use client";
import { useActionState } from "react";
import { importCourse, type ImportState } from "@/lib/admin-actions";

export default function ImportCourse() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCourse, {});
  return (
    <form action={action} className="panel">
      <h3>Import or replace a course (JSON)</h3>
      <p style={{ fontSize: 13.5, color: "var(--grey)", marginBottom: 12 }}>
        Upload a course file (start from the template, or export an existing course and edit it). It&apos;s checked before saving.
        Importing a slug that already exists replaces that course&apos;s content on the site.
      </p>
      {state.ok && <div className="okband">✓ {state.ok}</div>}
      {state.errors && (
        <div className="errband"><b>Fix these and try again:</b><ul style={{ margin: "6px 0 0 18px" }}>{state.errors.slice(0, 25).map((e) => <li key={e}>{e}</li>)}</ul>
          {state.errors.length > 25 && <div>…and {state.errors.length - 25} more.</div>}</div>
      )}
      <div className="formgrid">
        <div><label>Course file (.json)</label><input type="file" name="file" accept=".json,application/json" /></div>
        <div><label>Or slug override (optional)</label><input name="slug" placeholder="e.g. ba-leadership-v2" /></div>
        <div className="wide"><label>Or paste JSON</label><textarea name="json" rows={5} placeholder='{ "slug": "my-course", ... }' style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5 }} /></div>
      </div>
      <label className="check" style={{ marginTop: 10, maxWidth: 420 }}><input type="checkbox" name="startHidden" defaultChecked />
        <span>Start hidden<small>Only admins and presenters can see it until you publish it.</small></span></label>
      <div className="btnrow2"><button className="btn" disabled={pending}>{pending ? "Checking…" : "Validate & import"}</button></div>
    </form>
  );
}

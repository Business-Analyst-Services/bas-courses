"use client";
import { useActionState } from "react";
import { importCourse, type ImportState } from "@/lib/admin-actions";

export default function ImportCourse({ existingSlug }: { existingSlug?: string } = {}) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCourse, {});
  return (
    <form action={action} className="panel">
      <h3>{existingSlug ? "Upload an edited version (JSON)" : "Import a course (JSON)"}</h3>
      <p style={{ fontSize: 13.5, color: "var(--grey)", marginBottom: 12 }}>
        Upload a course file (start from the template, or export an existing course and edit it). It&apos;s checked before saving.
        If the course already exists, the upload becomes a <b>new version</b>. Nothing changes for participants until you publish it.
      </p>
      {state.ok && <div className="okband">✓ {state.ok}</div>}
      {state.errors && (
        <div className="errband"><b>Fix these and try again:</b><ul style={{ margin: "6px 0 0 18px" }}>{state.errors.slice(0, 25).map((e) => <li key={e}>{e}</li>)}</ul>
          {state.errors.length > 25 && <div>…and {state.errors.length - 25} more.</div>}</div>
      )}
      <div className="formgrid">
        <div><label>Course file (.json)</label><input type="file" name="file" accept=".json,application/json" /></div>
        {existingSlug ? <input type="hidden" name="slug" value={existingSlug} /> : <div><label>Slug override (optional)</label><input name="slug" placeholder="e.g. ba-leadership-inhouse" /></div>}
        <div><label>Version label</label><input name="label" placeholder="e.g. 2027 refresh" /></div>
        <div><label>What changed (notes)</label><input name="notes" placeholder="Updated Day 2 exercises" /></div>
        <div className="wide"><label>Or paste JSON</label><textarea name="json" rows={5} placeholder='{ "slug": "my-course", ... }' style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5 }} /></div>
      </div>
      <div className="checks" style={{ marginTop: 10 }}>
        {!existingSlug && <label className="check"><input type="checkbox" name="startHidden" defaultChecked />
          <span>New course starts hidden<small>Only admins and presenters can see it until you publish it.</small></span></label>}
        <label className="check"><input type="checkbox" name="publishNow" />
          <span>Publish immediately<small>Make the uploaded version live straight away (existing courses).</small></span></label>
      </div>
      <div className="btnrow2"><button className="btn" disabled={pending}>{pending ? "Checking…" : "Validate & import"}</button></div>
    </form>
  );
}

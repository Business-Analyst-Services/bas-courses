"use client";
import { useActionState, useState } from "react";
import { previewHumanitix, importHumanitix, type HxPreview } from "@/lib/humanitix-actions";
import type { Target } from "./BulkEnrol";

/** Two-step Humanitix CSV import: upload → review per event and choose where to enrol → import. */
export default function HumanitixImport({ targets }: { targets: Target[] }) {
  const [preview, previewAction, previewing] = useActionState<HxPreview, FormData>(previewHumanitix, {});
  const [done, importAction, importing] = useActionState<HxPreview, FormData>(async (_p: HxPreview, f: FormData) => importHumanitix(preview, f), {});
  const [q, setQ] = useState("");
  const groups = [...new Set(targets.map((t) => t.group))];

  return (
    <>
      <form action={previewAction} className="panel">
        <h3>1 · Upload a Humanitix attendee report</h3>
        <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>In Humanitix: your event → <b>Reports</b> → <b>Attendees</b> → export CSV. You can upload a report covering several events.</p>
        <div className="formgrid"><div className="wide"><input type="file" name="file" accept=".csv,text/csv" required /></div></div>
        <div className="btnrow2"><button className="btn" disabled={previewing}>{previewing ? "Reading…" : "Review file"}</button></div>
      </form>

      {preview.problems && preview.problems.length > 0 && <div className="errband"><b>Skipped rows</b><ul style={{ margin: "6px 0 0 18px" }}>{preview.problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      {preview.warnings && preview.warnings.length > 0 && <div className="notice"><b>Check before importing</b><ul style={{ margin: "6px 0 0 18px" }}>{preview.warnings.slice(0, 12).map((w) => <li key={w}>{w}</li>)}</ul></div>}

      {preview.events && preview.events.length > 0 && (
        <form action={importAction}>
          <input type="hidden" name="csv" value={preview.csv} />
          <h2 className="sec">2 · Choose where each event&apos;s attendees go ({preview.total} tickets)</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter courses, cohorts and intakes…" className="fld" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 10px", marginBottom: 10, fontFamily: "inherit" }} />
          {preview.events.map((e) => (
            <div key={e.key} className="panel">
              <h3 style={{ marginBottom: 4 }}>{e.name}</h3>
              <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>
                {e.date ?? "date not given"} · {e.tickets} tickets · {e.checkedIn} checked in · {e.cancelled} refunded/cancelled{e.presenters ? ` · ${e.presenters} presenter tickets` : ""}
                {e.eventId && <> · Humanitix event <code>{e.eventId}</code></>}
                {e.linked.length > 0 && <b style={{ color: "var(--good)" }}> · already linked</b>}
              </p>
              <div className="targetbox">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="olh" style={{ margin: "6px 0" }}>{g}</div>
                    <div className="checks">
                      {targets.filter((t) => t.group === g).map((t) => (
                        <label key={t.value} className="check" style={{ display: !q || t.label.toLowerCase().includes(q.toLowerCase()) || e.linked.includes(t.value) ? undefined : "none" }}>
                          <input type="checkbox" name={`t_${e.key}`} value={t.value} defaultChecked={e.linked.includes(t.value)} /><span>{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="checks" style={{ marginTop: 10 }}>
                {e.eventId && <label className="check"><input type="checkbox" name={`remember_${e.key}`} defaultChecked /><span>Remember this link<small>Ticked cohorts/intakes get this Humanitix event ID, so future imports and the API sync match automatically.</small></span></label>}
                <label className="check"><input type="checkbox" name={`att_${e.key}`} defaultChecked={e.checkedIn > 0} /><span>Record check-ins as attendance<small>Checked-in attendees are marked present for the first session of each cohort.</small></span></label>
              </div>
            </div>
          ))}
          <div className="btnrow2" style={{ marginBottom: 20 }}><button className="btn" disabled={importing}>{importing ? "Importing…" : "Import attendees"}</button>
            <span style={{ fontSize: 12.5, color: "var(--grey)" }}>Refunded tickets aren&apos;t enrolled, and anyone previously imported on that ticket loses access. Cohort capacity and waitlists apply.</span></div>
        </form>
      )}

      {done.result && <div className="okband" style={{ whiteSpace: "pre-line" }}><b>Imported</b>{"\n"}{done.result}</div>}
      {done.errors && <div className="errband"><ul style={{ margin: "0 0 0 18px" }}>{done.errors.slice(0, 20).map((x) => <li key={x}>{x}</li>)}</ul></div>}
    </>
  );
}

import Link from "next/link";
import type { VersionRow } from "@/lib/courses";
import { createDraftVersion, deleteVersion, publishVersion, bulkPinVersion, relabelVersion } from "@/lib/version-actions";

const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default function VersionsPanel({ slug, versions, live }: { slug: string; versions: VersionRow[]; live: number }) {
  const opts = versions.map((v) => ({ v: v.version, l: `v${v.version} · ${v.label ?? ""}` }));
  return (
    <section id="versions">
      <h2 className="sec">Versions</h2>
      <p style={{ fontSize: 13.5, color: "var(--grey)", marginBottom: 10 }}>
        One course, many versions. The <b>live</b> version is what everyone sees by default. Pin a cohort, intake or program to a version to keep a delivery on
        that content while you revise. Preview a draft as a presenter, compare it, then publish. Publishing an older version rolls back.
      </p>
      <div className="tablewrap" style={{ marginBottom: 12 }}>
        <table className="tbl">
          <thead><tr><th>Version</th><th>Label / notes</th><th>State</th><th>Sessions</th><th>Pinned cohorts</th><th>Created</th><th /></tr></thead>
          <tbody>
            {versions.map((v) => {
              const isLive = v.version === live;
              return (
                <tr key={v.version}>
                  <td><b>v{v.version}</b></td>
                  <td>
                    {v.version === 0 ? <>{v.label}<div style={{ fontSize: 12, color: "var(--grey)" }}>{v.notes}</div></> : (
                      <form action={relabelVersion} style={{ display: "grid", gap: 4 }}>
                        <input type="hidden" name="slug" value={slug} /><input type="hidden" name="version" value={v.version} />
                        <input name="label" defaultValue={v.label ?? ""} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", fontFamily: "inherit" }} />
                        <input name="notes" defaultValue={v.notes ?? ""} placeholder="What changed?" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", fontFamily: "inherit", fontSize: 12.5 }} />
                        <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 11.5, justifySelf: "start" }}>Save label</button>
                      </form>
                    )}
                  </td>
                  <td>{isLive ? <span className="vpill live">live</span> : v.version === 0 || v.published_at ? <span className="vpill">previous</span> : <span className="vpill draft">draft</span>}</td>
                  <td>{v.sessions}</td>
                  <td>{v.pinned || "—"}</td>
                  <td style={{ fontSize: 12.5 }}>{v.version === 0 ? "—" : <>{when(v.created_at)}<div style={{ color: "var(--grey)" }}>{v.created_by}</div></>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <a className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }} href={`/c/${slug}/preview?v=${v.version}`}>Preview</a>
                      {!isLive && <Link className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }} href={`/admin/courses/${slug}/compare?a=${live}&b=${v.version}`}>Compare</Link>}
                      <a className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }} href={`/admin/courses/${slug}/export?v=${v.version}`}>⬇ JSON</a>
                      <form action={createDraftVersion}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="from" value={v.version} />
                        <button className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }}>Copy as draft</button></form>
                      {!isLive && <form action={publishVersion}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="version" value={v.version} />
                        <button className="btn" style={{ padding: "5px 12px", fontSize: 12 }}>{v.version < live ? "Roll back to this" : "Publish"}</button></form>}
                      {!isLive && v.version !== 0 && !v.pinned && <form action={deleteVersion}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="version" value={v.version} />
                        <button className="btn danger">Delete</button></form>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form action={bulkPinVersion} className="panel">
        <h3>Pin cohorts to a version</h3>
        <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Use this before publishing a big revision, e.g. keep running cohorts on the current version while upcoming ones get the new one. Individual cohorts can also be set on their own page.</p>
        <input type="hidden" name="slug" value={slug} />
        <div className="formgrid">
          <div><label>Which cohorts</label><select name="scope"><option value="running">Running now</option><option value="upcoming">Upcoming</option><option value="all">All cohorts of this course</option></select></div>
          <div><label>Version</label><select name="course_version"><option value="live">Follow live (unpin)</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        </div>
        <div className="btnrow2"><button className="btn">Apply</button></div>
      </form>
    </section>
  );
}

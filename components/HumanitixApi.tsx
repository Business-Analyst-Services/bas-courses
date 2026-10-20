"use client";
import { useActionState } from "react";
import { testHumanitixApi, syncHumanitixNow, type HxApiState } from "@/lib/humanitix-actions";

export default function HumanitixApi({ hasKey }: { hasKey: boolean }) {
  const [test, testAction, testing] = useActionState<HxApiState, FormData>(testHumanitixApi, {});
  const [sync, syncAction, syncing] = useActionState<HxApiState, FormData>(syncHumanitixNow, {});
  return (
    <div className="panel">
      <h3>Automatic sync (Humanitix API)</h3>
      {!hasKey ? (
        <div className="notice" style={{ marginBottom: 0 }}>
          Not connected yet. In Humanitix go to <b>Account → Advanced → Public API key</b> and generate a key. In Vercel → bas-courses → Settings → Environment Variables, add <code>HUMANITIX_API_KEY</code> with that key, and <code>CRON_SECRET</code> with any long random text. Then redeploy.
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Connected. Every cohort or intake linked to a Humanitix event syncs automatically each morning (6am Sydney): new tickets are enrolled, refunds lose access, and check-ins are recorded. Use the buttons to check the connection or sync now.</p>
          <form action={testAction} className="formgrid">
            <div><label>Optional: an event ID to inspect</label><input name="event_id" placeholder="e.g. 68db7bf8c2c26bcb8f887bee" /></div>
            <div style={{ alignSelf: "end" }}><button className="btn ghost" disabled={testing}>{testing ? "Checking…" : "Test connection"}</button></div>
          </form>
          {test.error && <div className="errband" style={{ marginTop: 10 }}>{test.error}</div>}
          {test.ok && <div className="okband" style={{ marginTop: 10 }}>{test.ok}</div>}
          {test.events && (
            <div className="tablewrap" style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
              <table className="tbl"><thead><tr><th>Event</th><th>Starts</th><th>Event ID (copy to a cohort or intake)</th></tr></thead>
                <tbody>{test.events.map((e) => <tr key={e.id}><td>{e.name}</td><td>{e.start ? new Date(e.start).toLocaleDateString("en-AU") : "—"}</td><td><code>{e.id}</code></td></tr>)}</tbody></table>
            </div>
          )}
          {test.sample && <details style={{ marginBottom: 10 }}><summary style={{ cursor: "pointer", fontSize: 13 }}>Raw sample ticket from the API (for checking field mapping)</summary><pre className="pre">{test.sample}</pre></details>}
          <form action={syncAction}><div className="btnrow2"><button className="btn" disabled={syncing}>{syncing ? "Syncing…" : "Sync all linked events now"}</button></div></form>
          {sync.error && <div className="errband" style={{ marginTop: 10 }}>{sync.error}</div>}
          {sync.ok && <div className="okband" style={{ marginTop: 10, whiteSpace: "pre-line" }}>{sync.ok}</div>}
        </>
      )}
    </div>
  );
}

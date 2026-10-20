import { getAllCourses } from "@/lib/courses";
import { getCohortStats } from "@/lib/admin";
import { getPrograms, getIntakeStats } from "@/lib/programs";
import { enrolTargets } from "@/lib/targets";
import { sql } from "@/lib/db";
import { linkHumanitixEvent } from "@/lib/humanitix-actions";
import HumanitixImport from "@/components/HumanitixImport";
import HumanitixApi from "@/components/HumanitixApi";

export default async function ImportPage() {
  const courses = await getAllCourses();
  const cohorts = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const [programs, intakes] = await Promise.all([getPrograms(), getIntakeStats(cohorts)]);
  const targets = enrolTargets(intakes, cohorts, courses, programs);
  const linked = [
    ...((await sql`SELECT id, name, humanitix_event_id FROM intakes WHERE humanitix_event_id IS NOT NULL`) as { id: number; name: string; humanitix_event_id: string }[]).map((r) => ({ kind: "Intake", target: `intake:${r.id}`, ...r })),
    ...((await sql`SELECT id, name, humanitix_event_id FROM cohorts WHERE humanitix_event_id IS NOT NULL`) as { id: number; name: string; humanitix_event_id: string }[]).map((r) => ({ kind: "Cohort", target: `cohort:${r.id}`, ...r })),
  ];
  const log = (await sql`SELECT id, source, run_by, run_at, summary FROM import_log ORDER BY run_at DESC LIMIT 15`) as { id: number; source: string; run_by: string; run_at: string; summary: Record<string, unknown> }[];
  const linkable = targets.filter((t) => !t.value.startsWith("course:"));

  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Import from Humanitix</h1>
      <p className="lead">Bring ticket holders in as enrolments. Upload an attendee report any time, or link events and let the daily sync keep everyone up to date.</p>
      <HumanitixImport targets={targets} />
      <h2 className="sec">Linked Humanitix events</h2>
      <div className="tablewrap" style={{ marginBottom: 12 }}>
        <table className="tbl"><thead><tr><th>Type</th><th>Cohort / intake</th><th>Humanitix event ID</th><th /></tr></thead>
          <tbody>
            {linked.length === 0 && <tr><td colSpan={4} style={{ color: "var(--grey)" }}>None yet. Link one below, or tick “Remember this link” when importing a CSV.</td></tr>}
            {linked.map((l) => (
              <tr key={l.target}><td>{l.kind}</td><td>{l.name}</td><td><code>{l.humanitix_event_id}</code></td>
                <td><form action={linkHumanitixEvent}><input type="hidden" name="target" value={l.target} /><input type="hidden" name="event_id" value="" /><button className="btn danger">Unlink</button></form></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={linkHumanitixEvent} className="panel">
        <h3>Link an event</h3>
        <div className="formgrid">
          <div><label>Cohort or intake</label><select name="target">{linkable.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label>Humanitix event ID</label><input name="event_id" required placeholder="From the console URL after my-events/" /></div>
        </div>
        <div className="btnrow2"><button className="btn">Link</button></div>
      </form>
      <HumanitixApi hasKey={!!process.env.HUMANITIX_API_KEY} />
      <h2 className="sec">Recent imports and syncs</h2>
      <div className="tablewrap">
        <table className="tbl"><thead><tr><th>When</th><th>Source</th><th>By</th><th>Result</th></tr></thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={4} style={{ color: "var(--grey)" }}>Nothing yet.</td></tr>}
            {log.map((r) => (
              <tr key={r.id}><td style={{ whiteSpace: "nowrap" }}>{new Date(r.run_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td>
                <td>{r.source === "humanitix-csv" ? "CSV upload" : "API sync"}</td><td>{r.run_by}</td>
                <td style={{ fontSize: 12.5, whiteSpace: "pre-line" }}>{Array.isArray(r.summary.lines) ? (r.summary.lines as string[]).join("\n")
                  : Array.isArray(r.summary.results) ? (r.summary.results as { name: string; tickets?: number; error?: string; summary?: { enrolled: number; cancelled: number } }[]).map((x) => x.error ? `${x.name}: ${x.error}` : `${x.name}: ${x.tickets} tickets, ${x.summary?.enrolled} enrolled, ${x.summary?.cancelled} cancelled`).join("\n") || "No linked events" : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import { getAllCourses } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";
import { enrolPeople, removeEnrolment, setEnrolmentStatus } from "@/lib/admin-actions";

export default async function AdminEnrolments({ searchParams }: { searchParams: Promise<{ course?: string; status?: string; q?: string }> }) {
  const { course, status, q } = await searchParams;
  const courses = await getAllCourses();
  await ensureSchema();
  const cohorts = (await sql`SELECT id, course_slug, name, capacity, (SELECT count(*) FROM enrolments e WHERE e.cohort_id = c.id AND e.role='participant' AND e.status='active')::int AS n
                             FROM cohorts c WHERE status <> 'cancelled' ORDER BY start_date NULLS LAST`) as { id: number; course_slug: string; name: string; capacity: number; n: number }[];
  const rows = (await sql`
    SELECT e.email, e.course_slug, e.role, e.status, e.cohort_id, c.name AS cohort_name, e.created_at,
      (SELECT count(*) FROM progress p WHERE p.email = e.email AND p.course_slug = e.course_slug)::int AS done,
      (SELECT max(updated_at) FROM responses r WHERE r.email = e.email AND r.course_slug = e.course_slug) AS last_active
    FROM enrolments e LEFT JOIN cohorts c ON c.id = e.cohort_id
    WHERE (${course ?? null}::text IS NULL OR e.course_slug = ${course ?? null})
      AND (${status ?? null}::text IS NULL OR e.status = ${status ?? null} OR e.role = ${status ?? null})
      AND (${q ?? null}::text IS NULL OR e.email ILIKE ${"%" + (q ?? "") + "%"})
    ORDER BY e.course_slug, e.role DESC, e.email`) as {
    email: string; course_slug: string; role: string; status: string; cohort_id: number | null; cohort_name: string | null; created_at: string; done: number; last_active: string | null;
  }[];
  const title = (s: string) => courses.find((c) => c.slug === s)?.shortTitle ?? s;
  const total = (s: string) => courses.find((c) => c.slug === s)?.modules.length ?? 1;

  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Enrolments</h1>
      <p className="lead">Enrol people into a cohort (recommended, so capacity and attendance are tracked) or straight into a course. They get access when they sign in with that email.</p>
      <form action={enrolPeople} className="panel">
        <div className="formgrid">
          <div className="wide"><label>Emails (comma, space or new line separated; paste a column from a spreadsheet)</label><textarea name="emails" rows={3} required placeholder="jane@company.com&#10;sam@company.com" /></div>
          <div><label>Cohort</label><select name="cohort_id" defaultValue=""><option value="">No cohort (course only)</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{title(c.course_slug)} · {c.name} ({c.n}/{c.capacity})</option>)}</select></div>
          <div><label>Course (if no cohort)</label><select name="course">{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select></div>
          <div><label>Role</label><select name="role"><option value="participant">Participant</option><option value="presenter">Presenter</option></select></div>
        </div>
        <label className="check" style={{ marginTop: 10, maxWidth: 420 }}><input type="checkbox" name="override" /><span>Allow over capacity<small>Otherwise extra participants go on the cohort waitlist.</small></span></label>
        <div className="btnrow2"><button className="btn">Enrol</button><a className="btn ghost" href="/admin/export/enrolments">⬇ Export CSV</a></div>
      </form>

      <form className="filters">
        <select name="course" defaultValue={course ?? ""}><option value="">All courses</option>{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select>
        <select name="status" defaultValue={status ?? ""}><option value="">Everyone</option><option value="participant">Participants</option><option value="presenter">Presenters</option><option value="waitlist">Waitlisted</option></select>
        <input name="q" defaultValue={q ?? ""} placeholder="Search email" />
        <button className="btn ghost" style={{ padding: "7px 14px" }}>Filter</button>
      </form>
      <div className="tablewrap">
        <table className="tbl">
          <thead><tr><th>Email</th><th>Course</th><th>Cohort</th><th>Role</th><th>Status</th><th>Progress</th><th>Last active</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8}>No enrolments match.</td></tr>}
            {rows.map((r) => (
              <tr key={r.email + r.course_slug}>
                <td>{r.email}</td><td>{title(r.course_slug)}</td>
                <td>{r.cohort_id ? <a href={`/admin/cohorts/${r.cohort_id}`} style={{ color: "var(--tealdk)" }}>{r.cohort_name}</a> : "—"}</td>
                <td><span className={`rolepill ${r.role}`}>{r.role}</span></td>
                <td>{r.status === "waitlist" ? <span className="life forecast">waitlist</span> : "active"}</td>
                <td>{r.role === "participant" ? `${r.done}/${total(r.course_slug)}` : "—"}</td>
                <td>{r.last_active ? new Date(r.last_active).toLocaleDateString("en-AU") : "—"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {r.role === "participant" && <form action={setEnrolmentStatus}><input type="hidden" name="email" value={r.email} /><input type="hidden" name="course" value={r.course_slug} />
                    <input type="hidden" name="status" value={r.status === "waitlist" ? "active" : "waitlist"} /><button className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }}>{r.status === "waitlist" ? "Give seat" : "Waitlist"}</button></form>}
                  <form action={removeEnrolment}><input type="hidden" name="email" value={r.email} /><input type="hidden" name="course" value={r.course_slug} /><button className="btn danger">Remove</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

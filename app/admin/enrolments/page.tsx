import { getAllCourses } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";
import { removeEnrolment, setEnrolmentStatus } from "@/lib/admin-actions";
import { getCohortStats } from "@/lib/admin";
import { getPrograms, getIntakeStats } from "@/lib/programs";
import { enrolTargets } from "@/lib/targets";
import BulkEnrol from "@/components/BulkEnrol";

export default async function AdminEnrolments({ searchParams }: { searchParams: Promise<{ course?: string; status?: string; q?: string }> }) {
  const { course, status, q } = await searchParams;
  const courses = await getAllCourses();
  await ensureSchema();
  const cstats = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const [programs, istats] = await Promise.all([getPrograms(), getIntakeStats(cstats)]);
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
      <p className="lead">Selling through Humanitix? Use <a href="/admin/import" style={{ color: "var(--tealdk)", fontWeight: 600 }}>Import</a> instead. Paste a list of people and enrol them into an intake (every course in the program), a single cohort, or a course. They get access when they sign in with that email.</p>
      <BulkEnrol targets={enrolTargets(istats, cstats, courses, programs)} />
      <div className="btnrow2" style={{ margin: "-6px 0 14px" }}><a className="btn ghost" href="/admin/export/enrolments">⬇ Export CSV</a></div>

      <form className="filters">
        <select name="course" defaultValue={course ?? ""}><option value="">All courses</option>{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select>
        <select name="status" defaultValue={status ?? ""}><option value="">Everyone</option><option value="participant">Participants</option><option value="presenter">Presenters</option><option value="waitlist">Waitlisted</option><option value="cancelled">Cancelled</option></select>
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
                <td>{r.status === "waitlist" ? <span className="life forecast">waitlist</span> : r.status === "cancelled" ? <span className="life cancelled">cancelled</span> : "active"}</td>
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

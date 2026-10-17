import Nav from "@/components/Nav";
import { requireAdmin, getEnrolments } from "@/lib/access";
import { getCourses } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";
import { enrol, unenrol } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const v = await requireAdmin();
  const enr = await getEnrolments(v);
  await ensureSchema();
  const courses = getCourses();
  const rows = (await sql`SELECT email, course_slug, role, cohort, created_at FROM enrolments ORDER BY course_slug, role DESC, email`) as {
    email: string; course_slug: string; role: string; cohort: string | null; created_at: string;
  }[];
  const title = (s: string) => courses.find((c) => c.slug === s)?.shortTitle ?? s;

  return (
    <>
      <Nav enrolments={enr} isAdmin />
      <main className="content" style={{ maxWidth: 1180 }}>
        <div className="kicker">Admin</div>
        <h1 className="pagetitle">Enrolments</h1>
        <p className="lead">Enrol people by email address. They get access as soon as they sign in with that address, and can enrol before or after creating an account. Presenters see the run sheets, answer keys and roster.</p>
        <form action={enrol} className="panel form">
          <div><label>Emails (comma, space or new line separated)</label><textarea name="emails" rows={2} required placeholder="jane@company.com, sam@company.com" /></div>
          <div><label>Course</label><select name="course">{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select></div>
          <div><label>Role</label><select name="role"><option value="participant">Participant</option><option value="presenter">Presenter</option></select></div>
          <div><label>Cohort (optional)</label><input name="cohort" placeholder="Nov 2026 APAC" /></div>
          <button className="btn">Enrol</button>
        </form>
        <div className="tablewrap">
          <table className="tbl">
            <thead><tr><th>Email</th><th>Course</th><th>Role</th><th>Cohort</th><th>Added</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6}>No enrolments yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.email + r.course_slug}>
                  <td>{r.email}</td><td>{title(r.course_slug)}</td><td><span className={`rolepill ${r.role}`}>{r.role}</span></td>
                  <td>{r.cohort ?? "—"}</td><td>{new Date(r.created_at).toLocaleDateString("en-AU")}</td>
                  <td><form action={unenrol}><input type="hidden" name="email" value={r.email} /><input type="hidden" name="course" value={r.course_slug} /><button className="btn danger">Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "var(--grey)", marginTop: 14 }}>Admins (set in the ADMIN_EMAILS environment variable) automatically have presenter access to every course.</p>
      </main>
    </>
  );
}

import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";
import { duplicateCourse } from "@/lib/admin-actions";
import ImportCourse from "@/components/ImportCourse";

export default async function AdminCourses() {
  const courses = await getAllCourses();
  await ensureSchema();
  const counts = (await sql`SELECT course_slug, count(*) FILTER (WHERE role='participant' AND status='active')::int AS p, count(*) FILTER (WHERE role='presenter')::int AS t FROM enrolments GROUP BY course_slug`) as { course_slug: string; p: number; t: number }[];
  const cohorts = (await sql`SELECT course_slug, count(*)::int AS n FROM cohorts GROUP BY course_slug`) as { course_slug: string; n: number }[];

  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Courses</h1>
      <p className="lead">Publish or hide courses, choose which menu items participants see, hide individual sessions, and add new courses.</p>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Course</th><th>Status</th><th>Menu</th><th>Sessions</th><th>Cohorts</th><th>Participants</th><th>Source</th><th /></tr></thead>
          <tbody>
            {courses.map((c) => {
              const S = c.settings;
              const menu = [S.showOutline && "Outline", S.showResources && "Resources", S.showAiPrompts && "AI", S.showQuiz && "Quiz", S.showRoster && "Roster"].filter(Boolean);
              return (
                <tr key={c.slug}>
                  <td><Link href={`/admin/courses/${c.slug}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{c.title}</Link><div style={{ fontSize: 12, color: "var(--grey)" }}>/c/{c.slug} · {c.format}</div></td>
                  <td><span className={`statuspill ${S.status}`} style={{ marginLeft: 0 }}>{S.status}</span>{!S.catalogue && <div style={{ fontSize: 11.5, color: "var(--grey)" }}>not in catalogue</div>}</td>
                  <td style={{ fontSize: 12.5 }}>{menu.join(" · ") || "Sessions only"}</td>
                  <td>{c.modules.length - S.hiddenModules.length}{S.hiddenModules.length > 0 && <span style={{ color: "var(--grey)" }}> (+{S.hiddenModules.length} hidden)</span>}</td>
                  <td>{cohorts.find((x) => x.course_slug === c.slug)?.n ?? 0}</td>
                  <td>{counts.find((x) => x.course_slug === c.slug)?.p ?? 0}</td>
                  <td>{S.source === "imported" ? "Imported" : "Repo"}</td>
                  <td style={{ whiteSpace: "nowrap" }}><Link className="btn ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} href={`/admin/courses/${c.slug}`}>Settings</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="sec">Add a course</h2>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card"><span className="stepchip">1</span><h3>Start from the template</h3><p>A valid one-session skeleton with every field explained by example.</p>
          <div className="btnrow2"><a className="btn ghost" href="/admin/courses/template">⬇ Download template</a></div></div>
        <div className="card"><span className="stepchip">2</span><h3>Or copy an existing course</h3><p>Exports any course as JSON so you can rework it, or duplicate it below as a hidden draft.</p>
          <div className="btnrow2"><span style={{ fontSize: 12.5, color: "var(--grey)" }}>Export from each course&apos;s Settings page.</span></div></div>
        <div className="card"><span className="stepchip">3</span><h3>Import, review, publish</h3><p>Import as hidden, review it as a presenter, then switch its status to Published.</p></div>
      </div>
      <ImportCourse />
      <form action={duplicateCourse} className="panel">
        <h3>Duplicate a course as a hidden draft</h3>
        <div className="formgrid">
          <div><label>Copy from</label><select name="from">{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select></div>
          <div><label>New slug</label><input name="slug" required placeholder="e.g. ba-leadership-inhouse" /></div>
          <div><label>New title (optional)</label><input name="title" placeholder="BA Leadership — In-house edition" /></div>
        </div>
        <div className="btnrow2"><button className="btn">Duplicate</button></div>
      </form>
    </>
  );
}

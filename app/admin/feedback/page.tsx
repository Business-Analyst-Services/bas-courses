import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getCohortStats, fmtDate } from "@/lib/admin";
import { getFeedbackRows, summarise } from "@/lib/feedback";
import { getBacklog } from "@/lib/review";
import { ensureSchema, sql } from "@/lib/db";
import { LifePill, Tile } from "@/components/AdminBits";
import FeedbackResults from "@/components/FeedbackResults";

/** Course feedback module: results per course and cohort, cohorts awaiting review, and the improvement backlog. */
export default async function AdminFeedback({ searchParams }: { searchParams: Promise<{ course?: string; cohort?: string }> }) {
  const { course: courseQ, cohort: cohortQ } = await searchParams;
  const courses = await getAllCourses();
  const all = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  await ensureSchema();
  const reviewed = new Set(((await sql`SELECT cohort_id FROM cohort_reviews`) as { cohort_id: number }[]).map((r) => r.cohort_id));
  const counts = (await sql`SELECT course_slug, count(DISTINCT email)::int AS n FROM feedback GROUP BY 1`) as { course_slug: string; n: number }[];
  const backlog = await getBacklog({});
  const delivered = all.filter((c) => c.lifecycle === "delivered" || c.lifecycle === "running");
  const awaiting = all.filter((c) => c.lifecycle === "delivered" && !reviewed.has(c.id));
  const course = courses.find((c) => c.slug === courseQ);

  if (course) {
    const cohorts = all.filter((c) => c.course_slug === course.slug && c.lifecycle !== "cancelled" && c.lifecycle !== "forecast");
    const cid = cohorts.find((c) => String(c.id) === cohortQ)?.id ?? null;
    const { stats, respondents } = summarise(course, await getFeedbackRows(course.slug, cid));
    const open = backlog.filter((b) => b.course_slug === course.slug && (b.status === "new" || b.status === "planned"));
    return (
      <>
        <div className="crumbs"><Link href="/admin/feedback">Feedback</Link><span>›</span><span>{course.shortTitle}</span></div>
        <h1 className="pagetitle">{course.title} — feedback</h1>
        <p className="lead">Answers to the {course.feedback?.length ?? 0}-question course feedback form. Choose a cohort to see just that group.</p>
        <form className="filters" style={{ marginBottom: 14 }}>
          <input type="hidden" name="course" value={course.slug} />
          <label>Cohort <select name="cohort" defaultValue={cid ?? ""}><option value="">All cohorts</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <button className="btn ghost">Show</button>
          {cid && <Link className="btn" href={`/admin/feedback/review/${cid}`}>Cohort review &amp; backlog →</Link>}
          <a className="btn ghost" href="/admin/export/feedback">Export all feedback (CSV)</a>
        </form>
        <div className="grid g4" style={{ marginBottom: 16 }}>
          <Tile label="Respondents" value={respondents} />
          <Tile label="Average rating" value={(() => { const v = stats.filter((s) => s.q.type === "scale" && s.avg != null).map((s) => s.avg!); return v.length ? `${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} / 5` : "—"; })()} />
          <Tile label="NPS" value={stats.find((s) => s.q.type === "nps")?.nps ?? "—"} sub="promoters − detractors" />
          <Tile label="Open backlog items" value={open.length} />
        </div>
        <FeedbackResults stats={stats} respondents={respondents} />
      </>
    );
  }

  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Course feedback</h1>
      <p className="lead">Each course has a 10-question feedback form. When a cohort finishes, review its feedback alongside quiz, activity, completion and attendance data, and turn it into a backlog of improvements to the course and its content.</p>

      {awaiting.length > 0 && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <b>{awaiting.length} finished cohort{awaiting.length === 1 ? "" : "s"} awaiting review:</b>{" "}
          {awaiting.map((c, i) => <span key={c.id}>{i ? ", " : ""}<Link href={`/admin/feedback/review/${c.id}`}>{c.name}</Link></span>)}
        </div>
      )}

      <h2 className="sec">By course</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Course</th><th>Questions</th><th>Respondents</th><th>Open backlog</th><th /></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.slug}>
                <td>{c.title}</td><td>{c.feedback?.length ?? 0}</td><td>{counts.find((x) => x.course_slug === c.slug)?.n ?? 0}</td>
                <td>{backlog.filter((b) => b.course_slug === c.slug && (b.status === "new" || b.status === "planned")).length}</td>
                <td><Link href={`/admin/feedback?course=${c.slug}`}>Results →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">Cohort reviews</h2>
      <div className="tablewrap">
        <table className="tbl">
          <thead><tr><th>Cohort</th><th>Course</th><th>Dates</th><th>Status</th><th>Review</th><th /></tr></thead>
          <tbody>
            {delivered.length === 0 && <tr><td colSpan={6}>No running or finished cohorts yet.</td></tr>}
            {delivered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{courses.find((x) => x.slug === c.course_slug)?.shortTitle ?? c.course_slug}</td>
                <td>{fmtDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? ` – ${fmtDate(c.end_date)}` : ""}</td>
                <td><LifePill l={c.lifecycle} /></td>
                <td>{reviewed.has(c.id) ? `✓ ${backlog.filter((b) => b.cohort_id === c.id).length} backlog items` : c.lifecycle === "delivered" ? <b style={{ color: "var(--warn)" }}>Awaiting review</b> : "Runs until end date"}</td>
                <td><Link href={`/admin/feedback/review/${c.id}`}>{reviewed.has(c.id) ? "Open →" : "Review →"}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCourses } from "@/lib/courses";
import { fmtDate, getCohortStats, pct } from "@/lib/admin";
import { buildCohortReview, getBacklog, saveBacklog } from "@/lib/review";
import { getViewer } from "@/lib/access";
import { ensureSchema, sql } from "@/lib/db";
import { LifePill, Tile } from "@/components/AdminBits";
import FeedbackResults from "@/components/FeedbackResults";
import { addBacklogItem, generateCohortReview, updateBacklogItem } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

const SRC: Record<string, string> = { feedback: "📝 Feedback score", comment: "💬 Participant comment", quiz: "🧠 Quiz", activity: "🛠️ Activity", completion: "✅ Completion", attendance: "🙋 Attendance", "build-out": "🚀 Build-out idea", manual: "✍️ Added by you" };

/** Post-cohort review: what the cohort said and did, and the improvement backlog it produces. */
export default async function CohortReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const courses = await getAllCourses();
  const c = (await getCohortStats(Object.fromEntries(courses.map((x) => [x.slug, x.modules.length])))).find((x) => x.id === id);
  if (!c) notFound();
  const course = courses.find((x) => x.slug === c.course_slug);
  if (!course) notFound();
  await ensureSchema();
  let meta = ((await sql`SELECT generated_at::text, generated_by FROM cohort_reviews WHERE cohort_id = ${id}`) as { generated_at: string; generated_by: string }[])[0];
  const review = await buildCohortReview(course, id);
  // When a cohort has finished, the first visit creates its backlog automatically.
  if (!meta && c.lifecycle === "delivered") {
    await saveBacklog(course.slug, id, review.drafts, (await getViewer()).email, review);
    meta = { generated_at: new Date().toISOString(), generated_by: "auto" };
  }
  const items = await getBacklog({ cohortId: id });
  const open = items.filter((i) => i.status === "new" || i.status === "planned");

  return (
    <>
      <div className="crumbs"><Link href="/admin/feedback">Feedback</Link><span>›</span><Link href={`/admin/feedback?course=${course.slug}&cohort=${id}`}>{course.shortTitle}</Link><span>›</span><span>{c.name}</span></div>
      <h1 className="pagetitle">{c.name} — review <LifePill l={c.lifecycle} /></h1>
      <p className="lead">{course.title} · {fmtDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? ` – ${fmtDate(c.end_date)}` : ""}. Feedback, quiz, activity, completion and attendance for this cohort, and the backlog of changes they point to.</p>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Tile label="Feedback responses" value={`${review.respondents}/${review.participants}`} sub={`${pct(review.responseRate)} response rate`} />
        <Tile label="Average rating" value={review.avgRating == null ? "—" : `${review.avgRating.toFixed(1)} / 5`} sub={`NPS ${review.nps ?? "—"}`} />
        <Tile label="Quiz correct" value={pct(review.quizRate)} sub={`Completion ${pct(review.completionRate)}`} />
        <Tile label="Attendance" value={pct(review.attendanceRate)} sub={`${open.length} open backlog items`} />
      </div>

      <div className="btnrow2" style={{ marginBottom: 18 }}>
        <form action={generateCohortReview}><input type="hidden" name="cohort_id" value={id} /><button className="btn">{meta ? "Refresh backlog from latest data" : "Generate review & backlog"}</button></form>
        <a className="btn ghost" href={`/admin/feedback/review/${id}/backlog`}>Download backlog (Markdown)</a>
        <a className="btn ghost" href="/admin/export/backlog">Export all backlogs (CSV)</a>
        {meta && <span className="muted">Last generated {new Date(meta.generated_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}{meta.generated_by === "auto" ? " automatically when the cohort finished" : ` by ${meta.generated_by}`}. Refreshing keeps your status and priority changes.</span>}
      </div>
      {c.lifecycle !== "delivered" && !meta && <div className="notice">This cohort hasn&apos;t finished yet. Its backlog is created automatically the first time this page is opened after the end date, or you can generate it now.</div>}

      {review.strengths.length > 0 && (
        <>
          <h2 className="sec">What participants valued — keep these</h2>
          <ul className="fbcomments" style={{ marginLeft: 0, marginBottom: 18 }}>{review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}

      <h2 className="sec">Improvement backlog ({items.length})</h2>
      {items.length === 0 && <div className="panel"><p>{meta ? "Nothing in the data points to a change yet. Add your own items below." : "Generate the review to create the backlog."}</p></div>}
      <div className="bl">
        {items.map((i) => (
          <div key={i.id} className={`panel blitem p-${i.priority} s-${i.status}`}>
            <div className="blhead">
              <span className={`blp ${i.priority}`}>{i.priority}</span>
              <div style={{ flex: 1 }}>
                <b>{i.title}</b>
                <small>{SRC[i.source] ?? i.source}{i.area ? ` · ${i.area}` : ""}{i.modules ? ` · ${i.modules.split(",").map((m) => `Session ${course.modules.find((x) => x.id === m)?.num ?? m}`).join(", ")}` : ""}</small>
              </div>
              <form action={updateBacklogItem} className="blform">
                <input type="hidden" name="id" value={i.id} />
                <select name="priority" defaultValue={i.priority}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                <select name="status" defaultValue={i.status}><option value="new">New</option><option value="planned">Planned</option><option value="done">Done</option><option value="dismissed">Dismissed</option></select>
                <button className="btn ghost">Save</button>
              </form>
            </div>
            {i.evidence && <p className="blev"><b>Evidence:</b> {i.evidence}</p>}
            {i.detail && i.source !== "comment" && <p className="bldet"><b>Suggested change:</b> {i.detail}</p>}
          </div>
        ))}
      </div>

      <h2 className="sec">Add your own backlog item</h2>
      <form action={addBacklogItem} className="panel">
        <input type="hidden" name="course" value={course.slug} /><input type="hidden" name="cohort_id" value={id} />
        <div className="formgrid">
          <div className="wide"><label>Change to make</label><input name="title" required placeholder="e.g. Add a second worked example to session 6" /></div>
          <div><label>Priority</label><select name="priority" defaultValue="medium"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label>Area</label><select name="area" defaultValue="content">{["content", "activities", "ai", "facilitation", "pacing", "materials", "relevance", "platform", "build-out"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div><label>Sessions (optional)</label><select name="modules" defaultValue=""><option value="">Whole course</option>{course.modules.map((m) => <option key={m.id} value={m.id}>{m.num} · {m.title}</option>)}</select></div>
          <div className="wide"><label>Detail</label><textarea name="detail" rows={2} /></div>
        </div>
        <div className="btnrow2"><button className="btn">Add to backlog</button></div>
      </form>

      <h2 className="sec">Feedback from this cohort</h2>
      <FeedbackResults stats={review.stats} respondents={review.respondents} />
    </>
  );
}

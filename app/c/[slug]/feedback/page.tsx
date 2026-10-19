import Link from "next/link";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import FeedbackForm from "@/components/FeedbackForm";
import FeedbackResults from "@/components/FeedbackResults";
import { withSchedule } from "@/lib/schedule";
import { requireCourseRole } from "@/lib/access";
import { getProgress } from "@/lib/data";
import { getFeedbackRows, getMyFeedback, summarise } from "@/lib/feedback";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Participants: their own feedback form (they only ever see their own answers).
 *  Presenters: anonymised results for the course, filterable by cohort, plus the form if they want to try it. */
export default async function FeedbackPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cohort?: string; view?: string }> }) {
  const { slug } = await params;
  const { cohort, view } = await searchParams;
  const { viewer, role, enrolments, course: baseCourse } = await requireCourseRole(slug);
  const { course, schedule } = await withSchedule(baseCourse);
  const done = await getProgress(viewer.userId, slug);
  const qs = course.feedback ?? [];
  const isP = role === "presenter";
  const showResults = isP && view !== "form";

  let body: React.ReactNode;
  if (!qs.length) body = <div className="panel"><p>This course doesn&apos;t have a feedback form yet.</p></div>;
  else if (showResults) {
    await ensureSchema();
    const cohorts = (await sql`SELECT id, name FROM cohorts WHERE course_slug = ${slug} AND status <> 'cancelled' ORDER BY start_date NULLS LAST`) as { id: number; name: string }[];
    const cid = cohorts.find((c) => String(c.id) === cohort)?.id ?? null;
    const { stats, respondents } = summarise(course, await getFeedbackRows(slug, cid));
    body = (
      <>
        <form className="filters" style={{ marginBottom: 14 }}>
          <label>Cohort <select name="cohort" defaultValue={cid ?? ""}><option value="">All cohorts</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <button className="btn ghost">Show</button>
          <span className="muted">{respondents} respondent{respondents === 1 ? "" : "s"} · answers are anonymised here</span>
        </form>
        <FeedbackResults stats={stats} respondents={respondents} />
      </>
    );
  } else body = <FeedbackForm slug={slug} questions={qs} initial={await getMyFeedback(viewer.userId, slug)} />;

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <CourseSidebar course={course} schedule={schedule} here={`/c/${slug}/feedback`} currentId="__feedback" done={done} role={role} />
      <div className="shell">
        <main className="main">
          <div className="kicker">{course.title}</div>
          <h1 className="pagetitle">{showResults ? "Course feedback results" : "Your course feedback"}</h1>
          <p className="lead">{showResults
            ? "What participants said about this course. Use it to adjust delivery for the next session or cohort."
            : `${qs.length} quick questions about the course. Your answers are private to you and the course team, and help us improve the course for future cohorts.`}</p>
          {isP && (
            <div className="btnrow2" style={{ marginBottom: 14 }}>
              <Link className={`btn ${showResults ? "" : "ghost"}`} href={`/c/${slug}/feedback`}>Results</Link>
              <Link className={`btn ${showResults ? "ghost" : ""}`} href={`/c/${slug}/feedback?view=form`}>Participant form</Link>
              {viewer.isAdmin && <Link className="btn ghost" href={`/admin/feedback?course=${slug}`}>Admin feedback &amp; backlog</Link>}
            </div>
          )}
          {body}
        </main>
      </div>
    </>
  );
}

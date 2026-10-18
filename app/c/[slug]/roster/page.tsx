import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import { withSchedule } from "@/lib/schedule";
import { getProgress } from "@/lib/data";
import { saveAttendance } from "@/lib/admin-actions";
import { lifecycle } from "@/lib/admin";
import { requireCourseRole } from "@/lib/access";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Roster({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ activity?: string; cohort?: string; session?: string }> }) {
  const { slug } = await params;
  const { activity, cohort, session } = await searchParams;
  const { viewer, role, enrolments, course: baseCourse } = await requireCourseRole(slug, "presenter");
  const { course, schedule } = await withSchedule(baseCourse);
  const done = await getProgress(viewer.userId, slug);
  if (!course.settings.showRoster && !viewer.isAdmin) redirect(`/c/${slug}`);
  await ensureSchema();
  const people = (await sql`
    SELECT e.email, e.role, e.cohort,
      (SELECT count(*) FROM progress p WHERE p.email = e.email AND p.course_slug = e.course_slug)::int AS done,
      (SELECT count(*) FROM responses r WHERE r.email = e.email AND r.course_slug = e.course_slug AND r.value <> '')::int AS answers,
      (SELECT max(updated_at) FROM responses r WHERE r.email = e.email AND r.course_slug = e.course_slug) AS last_active
    FROM enrolments e WHERE e.course_slug = ${slug} ORDER BY e.role DESC, e.email`) as {
    email: string; role: string; cohort: string | null; done: number; answers: number; last_active: string | null;
  }[];
  const cohorts = (await sql`SELECT id, name, status, start_date::text, end_date::text FROM cohorts WHERE course_slug = ${slug} AND status <> 'cancelled' ORDER BY start_date NULLS LAST`) as { id: number; name: string; status: string; start_date: string | null; end_date: string | null }[];
  const live = cohorts.find((c) => lifecycle(c) === "running");
  const selCohort = cohorts.find((c) => String(c.id) === cohort) ?? live ?? cohorts[0];
  const selSession = course.modules.find((m) => m.id === session) ?? course.modules[0];
  const cohortPeople = selCohort
    ? ((await sql`SELECT e.email, a.present FROM enrolments e LEFT JOIN attendance a ON a.cohort_id = e.cohort_id AND a.email = e.email AND a.module_id = ${selSession?.id ?? ""}
                 WHERE e.cohort_id = ${selCohort.id} AND e.role = 'participant' AND e.status = 'active' ORDER BY e.email`) as { email: string; present: boolean | null }[])
    : [];
  const activities = course.modules.flatMap((m) => m.participant.activities.map((a) => ({ m, a })));
  const sel = activities.find((x) => x.a.id === activity);
  const answers = sel
    ? ((await sql`SELECT email, prompt_id, value FROM responses WHERE course_slug = ${slug} AND activity_id = ${sel.a.id} AND value <> '' ORDER BY email`) as { email: string; prompt_id: string; value: string }[])
    : [];

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <CourseSidebar course={course} schedule={schedule} here={`/c/${slug}/roster`} currentId="__roster" done={done} role={role} />
        <div className="shell">
        <main className="main">
        <Link href={`/c/${slug}`} style={{ color: "var(--tealdk)", fontWeight: 600, fontSize: 13.5 }}>← {course.shortTitle}</Link>
        <div className="kicker" style={{ marginTop: 12 }}>Presenter</div>
        <h1 className="pagetitle">Participant roster</h1>
        <p className="lead">Who&apos;s enrolled in {course.title}, how far they&apos;ve got, and what they&apos;ve written in each workbook activity.</p>
        <div className="tablewrap">
          <table className="tbl">
            <thead><tr><th>Email</th><th>Role</th><th>Cohort</th><th>Sessions done</th><th>Answers</th><th>Last active</th></tr></thead>
            <tbody>
              {people.length === 0 && <tr><td colSpan={6}>No one is enrolled yet. Enrol people from the Admin page.</td></tr>}
              {people.map((p) => (
                <tr key={p.email}><td>{p.email}</td><td><span className={`rolepill ${p.role}`}>{p.role}</span></td><td>{p.cohort ?? "—"}</td>
                  <td>{p.done}/{course.modules.length}</td><td>{p.answers}</td>
                  <td>{p.last_active ? new Date(p.last_active).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }) : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="sec">Mark attendance</h2>
        {cohorts.length === 0 ? (
          <div className="panel"><p style={{ fontSize: 13.5, color: "var(--grey)" }}>No cohorts set up for this course yet. An admin can create one under Admin → Cohorts.</p></div>
        ) : (
          <>
            <form className="filters">
              <select name="cohort" defaultValue={selCohort?.id}>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}{lifecycle(c) === "running" ? " (running)" : ""}</option>)}</select>
              <select name="session" defaultValue={selSession?.id}>{course.modules.map((m) => <option key={m.id} value={m.id}>{m.num} · {m.title}</option>)}</select>
              <button className="btn ghost" style={{ padding: "7px 14px" }}>Load</button>
            </form>
            <form action={saveAttendance} className="panel">
              <input type="hidden" name="cohort_id" value={selCohort?.id} />
              <input type="hidden" name="module_id" value={selSession?.id} />
              <h3>{selCohort?.name} · {selSession?.num} {selSession?.title}</h3>
              {cohortPeople.length === 0 ? <p style={{ fontSize: 13.5, color: "var(--grey)" }}>No participants in this cohort yet.</p> : (
                <div className="checks">
                  {cohortPeople.map((p) => (
                    <label key={p.email} className="check"><input type="hidden" name="roster" value={p.email} />
                      <input type="checkbox" name="present" value={p.email} defaultChecked={p.present ?? true} />
                      <span>{p.email}<small>{p.present == null ? "not marked yet" : p.present ? "marked present" : "marked absent"}</small></span></label>
                  ))}
                </div>
              )}
              {cohortPeople.length > 0 && <div className="btnrow2"><button className="btn">Save attendance</button><span style={{ fontSize: 12.5, color: "var(--grey)" }}>Untick anyone who was absent.</span></div>}
            </form>
          </>
        )}
        <h2 className="sec">Activity responses</h2>
        <form className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select name="activity" defaultValue={activity ?? ""} style={{ flex: 1, minWidth: 240, padding: 9, borderRadius: 10, border: "1px solid var(--line)", fontFamily: "inherit" }}>
            <option value="">Choose an activity…</option>
            {activities.map(({ m, a }) => <option key={a.id} value={a.id}>{m.num} · {a.title}</option>)}
          </select>
          <button className="btn">Show responses</button>
        </form>
        {sel && (
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>Participant</th>{sel.a.prompts.map((p) => <th key={p.id}>{p.label}</th>)}</tr></thead>
              <tbody>
                {[...new Set(answers.map((a) => a.email))].map((email) => (
                  <tr key={email}><td>{email}</td>{sel.a.prompts.map((p) => (
                    <td key={p.id} style={{ whiteSpace: "pre-wrap" }}>{answers.find((a) => a.email === email && a.prompt_id === p.id)?.value ?? ""}</td>))}</tr>
                ))}
                {answers.length === 0 && <tr><td colSpan={sel.a.prompts.length + 1}>No responses yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
      </div>
    </>
  );
}

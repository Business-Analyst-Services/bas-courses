import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import { getProgress } from "@/lib/data";
import { requireCourseRole } from "@/lib/access";
import { getCourse } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Roster({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ activity?: string }> }) {
  const { slug } = await params;
  const { activity } = await searchParams;
  const course = getCourse(slug);
  if (!course) notFound();
  const { viewer, role, enrolments } = await requireCourseRole(slug, "presenter");
  const done = await getProgress(viewer.userId, slug);
  await ensureSchema();
  const people = (await sql`
    SELECT e.email, e.role, e.cohort,
      (SELECT count(*) FROM progress p WHERE p.email = e.email AND p.course_slug = e.course_slug)::int AS done,
      (SELECT count(*) FROM responses r WHERE r.email = e.email AND r.course_slug = e.course_slug AND r.value <> '')::int AS answers,
      (SELECT max(updated_at) FROM responses r WHERE r.email = e.email AND r.course_slug = e.course_slug) AS last_active
    FROM enrolments e WHERE e.course_slug = ${slug} ORDER BY e.role DESC, e.email`) as {
    email: string; role: string; cohort: string | null; done: number; answers: number; last_active: string | null;
  }[];
  const activities = course.modules.flatMap((m) => m.participant.activities.map((a) => ({ m, a })));
  const sel = activities.find((x) => x.a.id === activity);
  const answers = sel
    ? ((await sql`SELECT email, prompt_id, value FROM responses WHERE course_slug = ${slug} AND activity_id = ${sel.a.id} AND value <> '' ORDER BY email`) as { email: string; prompt_id: string; value: string }[])
    : [];

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <div className="shell">
        <CourseSidebar course={course} currentId="__roster" done={done} role={role} />
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

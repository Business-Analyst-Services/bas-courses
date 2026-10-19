import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCourses, versionOptions } from "@/lib/courses";
import { sql } from "@/lib/db";
import { fmtDate, getCohortStats, pct } from "@/lib/admin";
import { Fill, LifePill, Tile } from "@/components/AdminBits";
import CohortForm from "@/components/CohortForm";
import { deleteCohort, enrolPeople, removeEnrolment, setEnrolmentStatus } from "@/lib/admin-actions";

export default async function CohortPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const courses = await getAllCourses();
  const all = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const c = all.find((x) => x.id === id);
  if (!c) notFound();
  const course = courses.find((x) => x.slug === c.course_slug);
  const vopts = (await versionOptions())[c.course_slug] ?? [];
  const people = (await sql`
    SELECT e.email, e.role, e.status, e.created_at,
      (SELECT count(*) FROM progress p WHERE p.email = e.email AND p.course_slug = e.course_slug)::int AS done
    FROM enrolments e WHERE e.cohort_id = ${id} ORDER BY e.role DESC, e.status, e.email`) as { email: string; role: string; status: string; created_at: string; done: number }[];
  const att = (await sql`SELECT email, module_id, present FROM attendance WHERE cohort_id = ${id}`) as { email: string; module_id: string; present: boolean }[];
  const participants = people.filter((p) => p.role === "participant" && p.status === "active");
  const waitlist = people.filter((p) => p.status === "waitlist");
  const mods = course?.modules ?? [];
  const mark = (e: string, m: string) => att.find((a) => a.email === e && a.module_id === m);

  return (
    <>
      <div className="crumbs"><Link href="/admin/cohorts">Cohorts</Link><span>›</span><span>{c.name}</span></div>
      <h1 className="pagetitle">{c.name} <LifePill l={c.lifecycle} /></h1>
      <p className="lead">{course?.title ?? c.course_slug} · {fmtDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? ` – ${fmtDate(c.end_date)}` : ""}{c.delivery ? ` · ${c.delivery}` : ""} · content: {c.course_version == null ? `live (v${course?.version.n ?? 0})` : `pinned to v${c.course_version}`}</p>
      <div className="btnrow2" style={{ margin: "0 0 14px" }}>
        <Link className={`btn ${c.lifecycle === "delivered" ? "" : "ghost"}`} href={`/admin/feedback/review/${id}`}>{c.lifecycle === "delivered" ? "Review feedback & improvement backlog →" : "Feedback & backlog"}</Link>
      </div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Tile label="Seats" value={`${c.enrolled}/${c.capacity}`} sub={`${Math.round(c.fill * 100)}% full · ${c.waitlist} waitlisted`} />
        <Tile label="Attendance" value={pct(c.attendanceRate)} sub={`${c.sessionsMarked}/${mods.length} sessions marked`} />
        <Tile label="Completion" value={pct(c.completionRate)} sub="sessions marked complete" />
        <Tile label="Quiz score" value={pct(c.quizRate)} />
      </div>

      <h2 className="sec">Enrol into this cohort</h2>
      <form action={enrolPeople} className="panel">
        <input type="hidden" name="cohort_id" value={id} />
        <div className="formgrid">
          <div className="wide"><label>Emails (comma, space or new line separated)</label><textarea name="emails" rows={2} required /></div>
          <div><label>Role</label><select name="role"><option value="participant">Participant</option><option value="presenter">Presenter</option></select></div>
        </div>
        <label className="check" style={{ marginTop: 10, maxWidth: 420 }}><input type="checkbox" name="override" /><span>Allow over capacity<small>Otherwise people beyond {c.capacity} seats go on the waitlist.</small></span></label>
        <div className="btnrow2"><button className="btn">Enrol</button></div>
      </form>

      <h2 className="sec">People ({people.length})</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Progress</th><th>Attended</th><th /></tr></thead>
          <tbody>
            {people.length === 0 && <tr><td colSpan={6}>No one enrolled yet.</td></tr>}
            {people.map((p) => {
              const marks = att.filter((a) => a.email === p.email);
              return (
                <tr key={p.email}>
                  <td>{p.email}</td><td><span className={`rolepill ${p.role}`}>{p.role}</span></td>
                  <td>{p.status === "waitlist" ? <span className="life forecast">waitlist</span> : "active"}</td>
                  <td>{p.role === "participant" ? <Fill n={p.done} cap={mods.length} /> : "—"}</td>
                  <td>{marks.length ? `${marks.filter((m) => m.present).length}/${marks.length}` : "—"}</td>
                  <td style={{ whiteSpace: "nowrap", display: "flex", gap: 6 }}>
                    <form action={setEnrolmentStatus}><input type="hidden" name="email" value={p.email} /><input type="hidden" name="course" value={c.course_slug} />
                      <input type="hidden" name="status" value={p.status === "waitlist" ? "active" : "waitlist"} />
                      {p.role === "participant" && <button className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }}>{p.status === "waitlist" ? "Give seat" : "Move to waitlist"}</button>}</form>
                    <form action={removeEnrolment}><input type="hidden" name="email" value={p.email} /><input type="hidden" name="course" value={c.course_slug} /><button className="btn danger">Remove</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="sec">Attendance</h2>
      <p style={{ fontSize: 13.5, color: "var(--grey)", marginBottom: 10 }}>Presenters mark attendance from the course Roster page during delivery. ✓ present · ✗ absent · – not marked.
        {waitlist.length > 0 && ` ${waitlist.length} waitlisted people aren't shown.`}</p>
      <div className="tablewrap matrix" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Participant</th>{mods.map((m) => <th key={m.id} title={m.title}>{m.num}</th>)}<th>Rate</th></tr></thead>
          <tbody>
            {participants.length === 0 && <tr><td colSpan={mods.length + 2}>No participants.</td></tr>}
            {participants.map((p) => {
              const ms = att.filter((a) => a.email === p.email);
              return (
                <tr key={p.email}><td>{p.email}</td>
                  {mods.map((m) => { const k = mark(p.email, m.id); return <td key={m.id}><span className={`mk ${k ? (k.present ? "y" : "n") : "u"}`}>{k ? (k.present ? "✓" : "✗") : "–"}</span></td>; })}
                  <td>{ms.length ? pct(ms.filter((x) => x.present).length / ms.length) : "—"}</td></tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CohortForm courses={courses} c={c} versions={vopts} />
      <form action={deleteCohort} className="panel">
        <h3>Delete cohort</h3>
        <p style={{ fontSize: 13.5, color: "var(--grey)" }}>Removes the cohort and its attendance records. People stay enrolled in the course, just without a cohort.</p>
        <input type="hidden" name="id" value={id} /><div className="btnrow2"><button className="btn danger">Delete cohort</button></div>
      </form>
    </>
  );
}

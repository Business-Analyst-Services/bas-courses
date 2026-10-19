import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCourses, versionOptions } from "@/lib/courses";
import { pinCohortVersion } from "@/lib/version-actions";
import { sql } from "@/lib/db";
import { getPrograms, getClients, getIntakeStats } from "@/lib/programs";
import { getCohortStats, pct, fmtDate } from "@/lib/admin";
import { enrolTargets } from "@/lib/targets";
import { CohortTable, LifePill, Tile } from "@/components/AdminBits";
import BulkEnrol from "@/components/BulkEnrol";
import { deleteIntake, updateIntake } from "@/lib/program-actions";

export default async function IntakePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const id = Number((await params).id);
  const { saved } = await searchParams;
  const [programs, courses, clients] = await Promise.all([getPrograms(), getAllCourses(), getClients()]);
  const cohorts = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const intakes = await getIntakeStats(cohorts);
  const i = intakes.find((x) => x.id === id);
  if (!i) notFound();
  const prog = programs.find((p) => p.slug === i.program_slug);
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.shortTitle]));
  const people = i.cohorts.length ? (await sql`
    SELECT e.email, max(e.role) AS role, max(e.status) AS status, count(*)::int AS courses,
      (SELECT count(*) FROM progress p WHERE p.email = e.email AND p.course_slug = ANY(${i.cohorts.map((c) => c.course_slug)}))::int AS done,
      (SELECT count(*) FILTER (WHERE present) FROM attendance a WHERE a.email = e.email AND a.cohort_id = ANY(${i.cohorts.map((c) => c.id)}))::int AS present,
      (SELECT count(*) FROM attendance a WHERE a.email = e.email AND a.cohort_id = ANY(${i.cohorts.map((c) => c.id)}))::int AS marked
    FROM enrolments e WHERE e.cohort_id = ANY(${i.cohorts.map((c) => c.id)}) GROUP BY e.email ORDER BY max(e.role) DESC, e.email`) as
    { email: string; role: string; status: string; courses: number; done: number; present: number; marked: number }[] : [];
  const totalSessions = i.cohorts.reduce((s, c) => s + (courses.find((x) => x.slug === c.course_slug)?.modules.length ?? 0), 0);
  const client = clients.find((c) => c.id === i.client_id);
  const vopts = await versionOptions();

  return (
    <>
      <div className="crumbs"><Link href="/admin/intakes">Intakes</Link><span>›</span><span>{i.name}</span></div>
      <h1 className="pagetitle">{i.name} <LifePill l={i.lifecycle} /></h1>
      <p className="lead">{prog?.title ?? i.program_slug} · {client?.name ?? "Open enrolment"} · {fmtDate(i.start_date)} – {fmtDate(i.endDate)}{i.delivery ? ` · ${i.delivery}` : ""}</p>
      {saved && <div className="okband">✓ Saved.</div>}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Tile label="Participants" value={`${i.participants}/${i.capacity}`} sub={`${Math.round(i.fill * 100)}% full · ${i.waitlist} waitlisted`} />
        <Tile label="Attendance" value={pct(i.attendanceRate)} sub="across all cohorts" />
        <Tile label="Completion" value={pct(i.completionRate)} />
        <Tile label="Quiz score" value={pct(i.quizRate)} />
      </div>
      <BulkEnrol title="Enrol into this intake" targets={enrolTargets(intakes, cohorts, courses, programs)} defaultTarget={`intake:${id}`} />
      <h2 className="sec">Cohorts in this intake ({i.cohorts.length})</h2>
      <CohortTable rows={i.cohorts} titles={titles} empty="No cohorts." />
      <h2 className="sec">Course versions for this intake</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Cohort</th><th>Live version</th><th>This cohort uses</th></tr></thead>
          <tbody>
            {i.cohorts.map((c) => {
              const live = courses.find((x) => x.slug === c.course_slug)?.version;
              return (
                <tr key={c.id}><td>{c.name}</td><td>v{live?.n ?? 0} · {live?.label}</td>
                  <td><form action={pinCohortVersion} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="cohort_id" value={c.id} />
                    <select name="course_version" defaultValue={c.course_version ?? ""} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px", fontFamily: "inherit" }}>
                      <option value="">Follow live</option>{(vopts[c.course_slug] ?? []).map((v) => <option key={v.v} value={v.v}>Pin v{v.v} · {v.label}</option>)}
                    </select><button className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }}>Set</button></form></td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="sec">People ({people.length})</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Courses</th><th>Sessions done</th><th>Attended</th></tr></thead>
          <tbody>
            {people.length === 0 && <tr><td colSpan={6}>No one yet.</td></tr>}
            {people.map((p) => (
              <tr key={p.email}><td>{p.email}</td><td><span className={`rolepill ${p.role}`}>{p.role}</span></td>
                <td>{p.status === "waitlist" ? <span className="life forecast">waitlist</span> : "active"}</td><td>{p.courses}/{i.cohorts.length}</td>
                <td>{p.role === "participant" ? `${p.done}/${totalSessions}` : "—"}</td><td>{p.marked ? `${p.present}/${p.marked}` : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={updateIntake} className="panel">
        <h3>Edit intake</h3>
        <input type="hidden" name="id" value={id} />
        <div className="formgrid">
          <div><label>Name</label><input name="name" defaultValue={i.name} /></div>
          <div><label>Status</label><select name="status" defaultValue={i.status}><option value="scheduled">Scheduled</option><option value="forecast">Forecast</option><option value="cancelled">Cancelled</option></select></div>
          <div><label>Capacity</label><input type="number" name="capacity" defaultValue={i.capacity} /></div>
          <div><label>Forecast seats</label><input type="number" name="forecast_seats" defaultValue={i.forecast_seats} /></div>
          <div><label>Price per person</label><input type="number" step="0.01" name="price" defaultValue={i.price ?? ""} /></div>
          <div><label>Client</label><input name="client" list="cl" defaultValue={client?.name ?? ""} /><datalist id="cl">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
          <div><label>Lead presenter</label><input name="presenter_email" defaultValue={i.presenter_email ?? ""} /></div>
          <div><label>Delivery</label><input name="delivery" defaultValue={i.delivery ?? ""} /></div>
          <div className="wide"><label>Notes</label><input name="notes" defaultValue={i.notes ?? ""} /></div>
        </div>
        <label className="check" style={{ marginTop: 10, maxWidth: 460 }}><input type="checkbox" name="cascade" defaultChecked /><span>Apply status, capacity, client, presenter and delivery to all its cohorts</span></label>
        <div className="btnrow2"><button className="btn">Save intake</button><span style={{ fontSize: 12.5, color: "var(--grey)" }}>Change individual cohort dates from the cohort pages.</span></div>
      </form>
      <form action={deleteIntake} className="panel"><h3>Delete intake</h3>
        <input type="hidden" name="id" value={id} />
        <label className="check" style={{ maxWidth: 460 }}><input type="checkbox" name="with_cohorts" /><span>Also delete its cohorts and their attendance<small>Otherwise the cohorts stay as stand-alone cohorts.</small></span></label>
        <div className="btnrow2"><button className="btn danger">Delete intake</button></div></form>
    </>
  );
}

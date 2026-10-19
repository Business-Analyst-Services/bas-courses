import { getAllCourses } from "@/lib/courses";
import { getCohortStats, pct } from "@/lib/admin";
import { CohortTable, LifePill } from "@/components/AdminBits";
import { getPrograms, getClients, getIntakeStats } from "@/lib/programs";
import { fmtDate } from "@/lib/admin";

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const courses = await getAllCourses();
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.shortTitle]));
  const all = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const inRange = all.filter((c) => (!from || (c.start_date ?? "") >= from) && (!to || (c.start_date ?? "9999") <= to));
  const [programs, clients, intakesAll] = await Promise.all([getPrograms(), getClients(), getIntakeStats(all)]);
  const intakes = intakesAll.filter((i) => (!from || (i.start_date ?? "") >= from) && (!to || (i.start_date ?? "9999") <= to));
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const perCourse = courses.map((c) => {
    const r = inRange.filter((x) => x.course_slug === c.slug && x.lifecycle !== "cancelled");
    const real = r.filter((x) => x.lifecycle !== "forecast");
    return {
      c, delivered: r.filter((x) => x.lifecycle === "delivered").length, upcoming: r.filter((x) => x.lifecycle === "upcoming" || x.lifecycle === "running").length,
      forecast: r.filter((x) => x.lifecycle === "forecast").length,
      seats: real.reduce((s, x) => s + x.enrolled, 0), cap: real.reduce((s, x) => s + x.capacity, 0),
      fcst: r.filter((x) => x.lifecycle === "forecast").reduce((s, x) => s + x.forecast_seats, 0),
      att: avg(real.map((x) => x.attendanceRate)), comp: avg(real.map((x) => x.completionRate)), quiz: avg(real.map((x) => x.quizRate)),
      revenue: real.reduce((s, x) => s + x.enrolled * Number(x.price ?? 0), 0),
    };
  });

  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Reports</h1>
      <p className="lead">Attendance, completion, quiz results, fill rates and the forecast pipeline, by course and by cohort. Attendance comes from presenters marking each session; completion from participants marking sessions complete.</p>
      <form className="filters">
        <label style={{ fontSize: 12.5, color: "var(--grey)", alignSelf: "center" }}>Cohorts starting</label>
        <input type="date" name="from" defaultValue={from ?? ""} /><span style={{ alignSelf: "center" }}>to</span><input type="date" name="to" defaultValue={to ?? ""} />
        <button className="btn ghost" style={{ padding: "7px 14px" }}>Apply</button>
      </form>
      <h2 className="sec">By course</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Course</th><th>Delivered</th><th>Upcoming</th><th>Forecast</th><th>Seats filled</th><th>Fill rate</th><th>Forecast seats</th><th>Attendance</th><th>Completion</th><th>Quiz</th><th>Revenue</th></tr></thead>
          <tbody>
            {perCourse.map((r) => (
              <tr key={r.c.slug}><td><b>{r.c.shortTitle}</b></td><td>{r.delivered}</td><td>{r.upcoming}</td><td>{r.forecast}</td>
                <td>{r.seats}/{r.cap}</td><td>{r.cap ? pct(r.seats / r.cap) : "—"}</td><td>{r.fcst || "—"}</td>
                <td>{pct(r.att)}</td><td>{pct(r.comp)}</td><td>{pct(r.quiz)}</td><td>{r.revenue ? `$${r.revenue.toLocaleString("en-AU")}` : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="sec">By program</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Program</th><th>Intakes</th><th>Delivered</th><th>Upcoming</th><th>Forecast</th><th>Participants</th><th>Fill rate</th><th>Forecast seats</th><th>Attendance</th><th>Completion</th><th>Revenue</th></tr></thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={11}>No programs.</td></tr>}
            {programs.map((p) => {
              const r = intakes.filter((i) => i.program_slug === p.slug && i.lifecycle !== "cancelled");
              const real = r.filter((i) => i.lifecycle !== "forecast");
              const ppl = real.reduce((s, i) => s + i.participants, 0), cap = real.reduce((s, i) => s + i.capacity, 0);
              return (<tr key={p.slug}><td><b>{p.title}</b></td><td>{r.length}</td><td>{r.filter((i) => i.lifecycle === "delivered").length}</td>
                <td>{r.filter((i) => i.lifecycle === "upcoming" || i.lifecycle === "running").length}</td><td>{r.filter((i) => i.lifecycle === "forecast").length}</td>
                <td>{ppl}</td><td>{cap ? pct(ppl / cap) : "—"}</td><td>{r.filter((i) => i.lifecycle === "forecast").reduce((s, i) => s + i.forecast_seats, 0) || "—"}</td>
                <td>{pct(avg(real.map((i) => i.attendanceRate)))}</td><td>{pct(avg(real.map((i) => i.completionRate)))}</td>
                <td>{(() => { const v = real.reduce((s, i) => s + i.participants * Number(i.price ?? 0), 0); return v ? `$${v.toLocaleString("en-AU")}` : "—"; })()}</td></tr>);
            })}
          </tbody>
        </table>
      </div>
      <h2 className="sec">By intake</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Intake</th><th>Client</th><th>Dates</th><th>Status</th><th>Participants</th><th>Waitlist</th><th>Attendance</th><th>Completion</th><th>Quiz</th></tr></thead>
          <tbody>
            {intakes.length === 0 && <tr><td colSpan={9}>No intakes in this range.</td></tr>}
            {intakes.map((i) => (<tr key={i.id}><td><a href={`/admin/intakes/${i.id}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{i.name}</a></td>
              <td>{clients.find((c) => c.id === i.client_id)?.name ?? "Open"}</td><td style={{ whiteSpace: "nowrap" }}>{fmtDate(i.start_date)} – {fmtDate(i.endDate)}</td>
              <td><LifePill l={i.lifecycle} /></td><td>{i.lifecycle === "forecast" ? `~${i.forecast_seats}` : `${i.participants}/${i.capacity}`}</td><td>{i.waitlist || "—"}</td>
              <td>{pct(i.attendanceRate)}</td><td>{pct(i.completionRate)}</td><td>{pct(i.quizRate)}</td></tr>))}
          </tbody>
        </table>
      </div>
      <h2 className="sec">By client</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Client</th><th>Intakes</th><th>Cohorts</th><th>Participants</th><th>Attendance</th><th>Completion</th></tr></thead>
          <tbody>
            {[{ id: null as number | null, name: "Open enrolment" }, ...clients].map((c) => {
              const cc = inRange.filter((x) => x.client_id === c.id && x.lifecycle !== "cancelled" && x.lifecycle !== "forecast");
              const ii = intakes.filter((x) => x.client_id === c.id);
              if (!cc.length && !ii.length) return null;
              return <tr key={String(c.id)}><td><b>{c.name}</b></td><td>{ii.length}</td><td>{cc.length}</td><td>{cc.reduce((s, x) => s + x.enrolled, 0)}</td>
                <td>{pct(avg(cc.map((x) => x.attendanceRate)))}</td><td>{pct(avg(cc.map((x) => x.completionRate)))}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <h2 className="sec">By cohort</h2>
      <CohortTable rows={inRange} titles={titles} empty="No cohorts in this range." />
      <h2 className="sec">Export</h2>
      <div className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="btn ghost" href="/admin/export/cohorts">⬇ Cohorts</a>
        <a className="btn ghost" href="/admin/export/enrolments">⬇ Enrolments</a>
        <a className="btn ghost" href="/admin/export/attendance">⬇ Attendance</a>
        <a className="btn ghost" href="/admin/export/progress">⬇ Session completion</a>
        <a className="btn ghost" href="/admin/export/quiz">⬇ Quiz answers</a>
      </div>
    </>
  );
}

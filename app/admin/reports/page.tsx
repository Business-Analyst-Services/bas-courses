import { getAllCourses } from "@/lib/courses";
import { getCohortStats, pct } from "@/lib/admin";
import { CohortTable } from "@/components/AdminBits";

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const courses = await getAllCourses();
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.shortTitle]));
  const all = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const inRange = all.filter((c) => (!from || (c.start_date ?? "") >= from) && (!to || (c.start_date ?? "9999") <= to));
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

import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getCohortStats, pct, todaySydney } from "@/lib/admin";
import { CohortTable, Tile } from "@/components/AdminBits";

export default async function AdminDashboard() {
  const courses = await getAllCourses();
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.shortTitle]));
  const cohorts = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const by = (l: string) => cohorts.filter((c) => c.lifecycle === l);
  const running = by("running"), upcoming = by("upcoming"), forecast = by("forecast");
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const delivered = by("delivered").filter((c) => (c.end_date ?? "") >= yearAgo).reverse();
  const seatsBooked = upcoming.reduce((s, c) => s + c.enrolled, 0);
  const seatsCap = upcoming.reduce((s, c) => s + c.capacity, 0);
  const forecastSeats = forecast.reduce((s, c) => s + c.forecast_seats, 0);
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const revenue = upcoming.reduce((s, c) => s + c.enrolled * Number(c.price ?? 0), 0);

  return (
    <>
      <div className="kicker">Admin · {new Date(todaySydney()).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
      <h1 className="pagetitle">Dashboard</h1>
      <p className="lead">Cohorts running now, what&apos;s coming up, what&apos;s forecast, and how delivered cohorts performed.</p>
      <div className="grid g4" style={{ marginBottom: 12 }}>
        <Tile label="Running now" value={running.length} sub={`${running.reduce((s, c) => s + c.enrolled, 0)} participants`} />
        <Tile label="Upcoming cohorts" value={upcoming.length} sub={`${seatsBooked}/${seatsCap} seats booked (${seatsCap ? Math.round((100 * seatsBooked) / seatsCap) : 0}%)`} />
        <Tile label="Forecast" value={forecast.length} sub={`~${forecastSeats} seats expected`} />
        <Tile label="Delivered (12 months)" value={delivered.length} sub={`${delivered.reduce((s, c) => s + c.enrolled, 0)} participants`} />
      </div>
      <div className="grid g4" style={{ marginBottom: 24 }}>
        <Tile label="Avg attendance (delivered)" value={pct(avg(delivered.map((c) => c.attendanceRate)))} />
        <Tile label="Avg completion (delivered)" value={pct(avg(delivered.map((c) => c.completionRate)))} />
        <Tile label="Avg quiz score" value={pct(avg(cohorts.map((c) => c.quizRate)))} />
        <Tile label="Booked revenue (upcoming)" value={revenue ? `$${revenue.toLocaleString("en-AU")}` : "—"} sub="enrolled × cohort price" />
      </div>
      {cohorts.length === 0 && (
        <div className="notice">No cohorts yet. <Link href="/admin/cohorts" style={{ color: "var(--tealdk)", fontWeight: 600 }}>Create your first cohort →</Link></div>
      )}
      <h2 className="sec">Running now</h2>
      <CohortTable rows={running} titles={titles} empty="Nothing running today." />
      <h2 className="sec">Upcoming</h2>
      <CohortTable rows={upcoming} titles={titles} empty="No upcoming cohorts scheduled." />
      <h2 className="sec">Forecast</h2>
      <CohortTable rows={forecast} titles={titles} empty="No forecast cohorts. Add a cohort with status Forecast to plan ahead." />
      <h2 className="sec">Delivered (last 12 months)</h2>
      <CohortTable rows={delivered} titles={titles} empty="No delivered cohorts yet." />
    </>
  );
}

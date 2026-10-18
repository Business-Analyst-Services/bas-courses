import { getAllCourses } from "@/lib/courses";
import { getCohortStats } from "@/lib/admin";
import { CohortTable } from "@/components/AdminBits";
import CohortForm from "@/components/CohortForm";

export default async function AdminCohorts({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const courses = await getAllCourses();
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.shortTitle]));
  const all = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const rows = course ? all.filter((c) => c.course_slug === course) : all;
  const groups: [string, string, string][] = [
    ["running", "Running now", "Nothing running today."], ["upcoming", "Upcoming", "No upcoming cohorts."],
    ["forecast", "Forecast", "No forecast cohorts."], ["delivered", "Delivered", "None delivered yet."], ["cancelled", "Cancelled", "None cancelled."],
  ];
  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Cohorts</h1>
      <p className="lead">Each delivery of a course is a cohort, with its own dates, capacity, presenter, enrolments and attendance.</p>
      <form className="filters">
        <select name="course" defaultValue={course ?? ""}><option value="">All courses</option>{courses.map((c) => <option key={c.slug} value={c.slug}>{c.shortTitle}</option>)}</select>
        <button className="btn ghost" style={{ padding: "7px 14px" }}>Filter</button>
      </form>
      {groups.map(([l, h, e]) => {
        const r = rows.filter((c) => c.lifecycle === l);
        if (l === "cancelled" && !r.length) return null;
        return <section key={l}><h2 className="sec">{h} <span style={{ color: "var(--grey)", fontWeight: 400 }}>({r.length})</span></h2><CohortTable rows={l === "delivered" ? [...r].reverse() : r} titles={titles} empty={e} /></section>;
      })}
      <h2 className="sec">Add a cohort</h2>
      <CohortForm courses={courses} />
    </>
  );
}

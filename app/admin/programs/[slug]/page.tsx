import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCourses, versionOptions } from "@/lib/courses";
import { getPrograms, getClients, getIntakeStats } from "@/lib/programs";
import { getCohortStats, pct, fmtDate } from "@/lib/admin";
import { LifePill } from "@/components/AdminBits";
import ProgramForm from "@/components/ProgramForm";
import IntakePlanner from "@/components/IntakePlanner";
import { deleteProgram } from "@/lib/program-actions";

export default async function ProgramPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const [programs, courses, clients] = await Promise.all([getPrograms(), getAllCourses(), getClients()]);
  const p = programs.find((x) => x.slug === slug);
  if (!p) notFound();
  const intakes = (await getIntakeStats(await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length]))))).filter((i) => i.program_slug === slug);
  return (
    <>
      <div className="crumbs"><Link href="/admin/programs">Programs</Link><span>›</span><span>{p.title}</span></div>
      <h1 className="pagetitle">{p.title}</h1>
      <p className="lead">{p.course_slugs.length} courses · {intakes.length} intakes · participants see it at <Link href={`/p/${slug}`} style={{ color: "var(--tealdk)" }}>/p/{slug}</Link></p>
      {saved && <div className="okband">✓ Saved.</div>}
      <h2 className="sec">Intakes</h2>
      <div className="tablewrap" style={{ marginBottom: 18 }}>
        <table className="tbl">
          <thead><tr><th>Intake</th><th>Dates</th><th>Status</th><th>Seats</th><th>Attendance</th><th>Completion</th></tr></thead>
          <tbody>
            {intakes.length === 0 && <tr><td colSpan={6}>No intakes yet. Plan some below.</td></tr>}
            {intakes.map((i) => (
              <tr key={i.id}><td><Link href={`/admin/intakes/${i.id}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{i.name}</Link></td>
                <td>{fmtDate(i.start_date)} – {fmtDate(i.endDate)}</td><td><LifePill l={i.lifecycle} /></td>
                <td>{i.lifecycle === "forecast" ? `~${i.forecast_seats} fcst` : `${i.participants}/${i.capacity}`}</td><td>{pct(i.attendanceRate)}</td><td>{pct(i.completionRate)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <IntakePlanner programs={programs} clients={clients} program={slug} />
      <ProgramForm courses={courses} p={p} versions={await versionOptions()} />
      <form action={deleteProgram} className="panel"><h3>Delete program</h3>
        <p style={{ fontSize: 13.5, color: "var(--grey)" }}>Courses, intakes and cohorts are kept.</p>
        <input type="hidden" name="slug" value={slug} /><div className="btnrow2"><button className="btn danger">Delete program</button></div></form>
    </>
  );
}

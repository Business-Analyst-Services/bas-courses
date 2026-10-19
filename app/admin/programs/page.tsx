import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getPrograms, getIntakes } from "@/lib/programs";
import ProgramForm from "@/components/ProgramForm";

export default async function AdminPrograms() {
  const [programs, courses, intakes] = await Promise.all([getPrograms(), getAllCourses(), getIntakes()]);
  const title = (s: string) => courses.find((c) => c.slug === s)?.shortTitle ?? s;
  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Programs</h1>
      <p className="lead">A program bundles courses in a set order, like the Horizon Series. Each time you run a program it&apos;s an <b>intake</b>, and an intake creates one cohort per course automatically.</p>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Program</th><th>Courses (in order)</th><th>Gap</th><th>Intakes</th><th>Status</th><th /></tr></thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={6}>No programs yet. Create one below.</td></tr>}
            {programs.map((p) => (
              <tr key={p.slug}>
                <td><Link href={`/admin/programs/${p.slug}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{p.title}</Link><div style={{ fontSize: 12, color: "var(--grey)" }}>/p/{p.slug}</div></td>
                <td style={{ fontSize: 13 }}>{p.course_slugs.map((s, i) => <span key={s}>{i > 0 && " → "}{title(s)}</span>)}</td>
                <td>{p.gap_days} days</td>
                <td>{intakes.filter((i) => i.program_slug === p.slug).length}</td>
                <td><span className={`statuspill ${p.status}`} style={{ marginLeft: 0 }}>{p.status}</span></td>
                <td><Link className="btn ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} href={`/admin/programs/${p.slug}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="sec">New program</h2>
      <ProgramForm courses={courses} />
    </>
  );
}

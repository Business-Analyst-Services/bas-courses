import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getPrograms, getClients, getIntakeStats, type IntakeStats } from "@/lib/programs";
import { getCohortStats, pct, fmtDate } from "@/lib/admin";
import { LifePill, Fill } from "@/components/AdminBits";
import IntakePlanner from "@/components/IntakePlanner";

function IntakeTable({ rows, ptitle, cname }: { rows: IntakeStats[]; ptitle: (s: string) => string; cname: (id: number | null) => string }) {
  return (
    <div className="tablewrap" style={{ marginBottom: 18 }}>
      <table className="tbl">
        <thead><tr><th>Intake</th><th>Program</th><th>Client</th><th>Dates</th><th>Status</th><th>Cohorts</th><th>Seats</th><th>Attendance</th><th>Completion</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={9} style={{ color: "var(--grey)" }}>None.</td></tr>}
          {rows.map((i) => (
            <tr key={i.id}>
              <td><Link href={`/admin/intakes/${i.id}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{i.name}</Link></td>
              <td>{ptitle(i.program_slug)}</td><td>{cname(i.client_id)}</td>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDate(i.start_date)} – {fmtDate(i.endDate)}</td>
              <td><LifePill l={i.lifecycle} /></td><td>{i.cohorts.length}</td>
              <td>{i.lifecycle === "forecast" ? `~${i.forecast_seats} fcst` : <Fill n={i.participants} cap={i.capacity} />}</td>
              <td>{pct(i.attendanceRate)}</td><td>{pct(i.completionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminIntakes({ searchParams }: { searchParams: Promise<{ created?: string; program?: string; client?: string }> }) {
  const { created, program, client } = await searchParams;
  const [programs, courses, clients] = await Promise.all([getPrograms(), getAllCourses(), getClients()]);
  const all = await getIntakeStats(await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length]))));
  const rows = all.filter((i) => (!program || i.program_slug === program) && (!client || String(i.client_id) === client));
  const ptitle = (s: string) => programs.find((p) => p.slug === s)?.title ?? s;
  const cname = (id: number | null) => clients.find((c) => c.id === id)?.name ?? "Open";
  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Intakes</h1>
      <p className="lead">An intake is one group of people going through a program together. Enrol someone into the intake and they&apos;re placed in every cohort it contains.</p>
      {created && <div className="okband">✓ Created {created} intakes and their cohorts.</div>}
      {programs.length === 0 ? <div className="notice">Create a program first under <Link href="/admin/programs" style={{ color: "var(--tealdk)", fontWeight: 600 }}>Programs</Link>.</div> : <IntakePlanner programs={programs} clients={clients} />}
      <form className="filters">
        <select name="program" defaultValue={program ?? ""}><option value="">All programs</option>{programs.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select>
        <select name="client" defaultValue={client ?? ""}><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn ghost" style={{ padding: "7px 14px" }}>Filter</button>
      </form>
      {(["running", "upcoming", "forecast", "delivered", "cancelled"] as const).map((l) => {
        const r = rows.filter((i) => i.lifecycle === l);
        if (l === "cancelled" && !r.length) return null;
        return <section key={l}><h2 className="sec" style={{ textTransform: "capitalize" }}>{l === "running" ? "Running now" : l} <span style={{ color: "var(--grey)", fontWeight: 400 }}>({r.length})</span></h2><IntakeTable rows={r} ptitle={ptitle} cname={cname} /></section>;
      })}
    </>
  );
}

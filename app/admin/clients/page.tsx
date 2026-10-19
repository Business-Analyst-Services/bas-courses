import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getClients, getIntakeStats } from "@/lib/programs";
import { getCohortStats, pct } from "@/lib/admin";
import { saveClient, deleteClient } from "@/lib/program-actions";

export default async function AdminClients() {
  const courses = await getAllCourses();
  const cohorts = await getCohortStats(Object.fromEntries(courses.map((c) => [c.slug, c.modules.length])));
  const [clients, intakes] = await Promise.all([getClients(), getIntakeStats(cohorts)]);
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return (
    <>
      <div className="kicker">Admin</div>
      <h1 className="pagetitle">Clients</h1>
      <p className="lead">Group intakes and cohorts by the organisation you deliver for, so you can report on each client&apos;s whole engagement. Clients are also created automatically when you type a new name while planning an intake.</p>
      <div className="tablewrap" style={{ marginBottom: 20 }}>
        <table className="tbl">
          <thead><tr><th>Client</th><th>Contact</th><th>Intakes</th><th>Cohorts</th><th>Participants</th><th>Attendance</th><th>Completion</th><th /></tr></thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={8}>No clients yet.</td></tr>}
            {clients.map((c) => {
              const ci = intakes.filter((i) => i.client_id === c.id);
              const cc = cohorts.filter((x) => x.client_id === c.id);
              return (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td><td>{c.contact_email ?? "—"}</td>
                  <td><Link href={`/admin/intakes?client=${c.id}`} style={{ color: "var(--tealdk)" }}>{ci.length}</Link></td><td>{cc.length}</td>
                  <td>{cc.reduce((s, x) => s + x.enrolled, 0)}</td><td>{pct(avg(cc.map((x) => x.attendanceRate)))}</td><td>{pct(avg(cc.map((x) => x.completionRate)))}</td>
                  <td><form action={deleteClient}><input type="hidden" name="id" value={c.id} /><button className="btn danger">Remove</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form action={saveClient} className="panel">
        <h3>Add clients</h3>
        <div className="formgrid">
          <div className="wide"><label>Client names (one per line)</label><textarea name="names" rows={3} required placeholder={"Harbourline Insurance\nDepartment of Community Services"} /></div>
          <div><label>Contact email (optional)</label><input type="email" name="contact_email" /></div>
        </div>
        <div className="btnrow2"><button className="btn">Add</button></div>
      </form>
    </>
  );
}

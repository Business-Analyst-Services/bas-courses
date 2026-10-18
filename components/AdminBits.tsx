import Link from "next/link";
import type { CohortStats, Lifecycle } from "@/lib/admin";
import { fmtDate, pct } from "@/lib/admin";

export function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card tile">
      <div className="tv">{value}</div>
      <div className="tl">{label}</div>
      {sub && <div className="ts">{sub}</div>}
    </div>
  );
}

export function LifePill({ l }: { l: Lifecycle }) {
  return <span className={`life ${l}`}>{l}</span>;
}

export function Fill({ n, cap }: { n: number; cap: number }) {
  const p = cap ? Math.min(100, Math.round((100 * n) / cap)) : 0;
  return (
    <span className="fill" title={`${n} of ${cap} seats`}>
      <span className="minibar" style={{ width: 70 }}><div style={{ width: `${p}%`, background: p >= 100 ? "var(--warn)" : undefined }} /></span>
      {n}/{cap}
    </span>
  );
}

export function CohortTable({ rows, titles, empty }: { rows: CohortStats[]; titles: Record<string, string>; empty: string }) {
  return (
    <div className="tablewrap" style={{ marginBottom: 18 }}>
      <table className="tbl">
        <thead><tr><th>Cohort</th><th>Course</th><th>Dates</th><th>Status</th><th>Seats</th><th>Waitlist</th><th>Attendance</th><th>Completion</th><th>Quiz</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={9} style={{ color: "var(--grey)" }}>{empty}</td></tr>}
          {rows.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/cohorts/${c.id}`} style={{ color: "var(--tealdk)", fontWeight: 600 }}>{c.name}</Link></td>
              <td>{titles[c.course_slug] ?? c.course_slug}</td>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? ` – ${fmtDate(c.end_date)}` : ""}</td>
              <td><LifePill l={c.lifecycle} /></td>
              <td>{c.lifecycle === "forecast" ? <span title="Forecast seats">~{c.forecast_seats} fcst</span> : <Fill n={c.enrolled} cap={c.capacity} />}</td>
              <td>{c.waitlist || "—"}</td>
              <td>{pct(c.attendanceRate)}</td>
              <td>{pct(c.completionRate)}</td>
              <td>{pct(c.quizRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

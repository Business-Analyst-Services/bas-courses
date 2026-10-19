import { saveCohort } from "@/lib/admin-actions";
import type { CohortRow } from "@/lib/admin";

export default function CohortForm({ courses, c, versions }: { courses: { slug: string; shortTitle: string }[]; c?: CohortRow; versions?: { v: number; label: string }[] }) {
  return (
    <form action={saveCohort} className="panel">
      <h3>{c ? "Edit cohort" : "New cohort"}</h3>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="formgrid">
        <div><label>Course</label><select name="course" defaultValue={c?.course_slug}>{courses.map((x) => <option key={x.slug} value={x.slug}>{x.shortTitle}</option>)}</select></div>
        <div><label>Cohort name</label><input name="name" required defaultValue={c?.name} placeholder="Nov 2026 · APAC" /></div>
        <div><label>Status</label><select name="status" defaultValue={c?.status ?? "scheduled"}>
          <option value="scheduled">Scheduled (confirmed)</option><option value="forecast">Forecast (planned, not confirmed)</option><option value="cancelled">Cancelled</option></select></div>
        <div><label>Start date</label><input type="date" name="start_date" defaultValue={c?.start_date?.slice(0, 10) ?? ""} /></div>
        <div><label>End date</label><input type="date" name="end_date" defaultValue={c?.end_date?.slice(0, 10) ?? ""} /></div>
        <div><label>Capacity (seats)</label><input type="number" min={1} name="capacity" defaultValue={c?.capacity ?? 20} /></div>
        <div><label>Forecast seats</label><input type="number" min={0} name="forecast_seats" defaultValue={c?.forecast_seats ?? 0} /></div>
        <div><label>Price per seat (AUD)</label><input type="number" step="0.01" name="price" defaultValue={c?.price ?? ""} /></div>
        <div><label>Delivery</label><input name="delivery" defaultValue={c?.delivery ?? ""} placeholder="Zoom · Mon+Wed 19:00 Sydney" /></div>
        <div><label>Lead presenter email</label><input type="email" name="presenter_email" defaultValue={c?.presenter_email ?? ""} /></div>
        {c && versions && <div><label>Course version</label><select name="course_version" defaultValue={c.course_version ?? ""}>
          <option value="">Follow live version</option>{versions.map((v) => <option key={v.v} value={v.v}>Pin to v{v.v} · {v.label}</option>)}</select></div>}
        <div className="wide"><label>Notes</label><textarea name="notes" rows={2} defaultValue={c?.notes ?? ""} placeholder="Client, venue, special requirements…" /></div>
      </div>
      <div className="btnrow2"><button className="btn">{c ? "Save cohort" : "Create cohort"}</button>
        <span style={{ fontSize: 12.5, color: "var(--grey)" }}>Upcoming / running / delivered is worked out from the dates.</span></div>
    </form>
  );
}

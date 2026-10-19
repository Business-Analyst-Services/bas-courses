import { bulkCreateCohorts } from "@/lib/program-actions";
import type { LoadedCourse } from "@/lib/types";
import type { Client } from "@/lib/programs";

/** Create cohorts for several courses at once, optionally repeating on a cadence. */
export default function BulkCohorts({ courses, clients }: { courses: LoadedCourse[]; clients: Client[] }) {
  return (
    <form action={bulkCreateCohorts} className="panel">
      <h3>Create cohorts in bulk</h3>
      <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Tick the courses, set a first date and how often to repeat. One cohort is created per course per repeat, with end dates worked out from each course&apos;s length.</p>
      <div className="checks" style={{ marginBottom: 12 }}>
        {courses.map((c) => <label key={c.slug} className="check"><input type="checkbox" name="courses" value={c.slug} /><span>{c.shortTitle}<small>{c.format}</small></span></label>)}
      </div>
      <div className="formgrid">
        <div><label>First start date</label><input type="date" name="start_date" required /></div>
        <div><label>Stagger between courses (days)</label><input type="number" name="stagger_days" min={0} defaultValue={0} /></div>
        <div><label>Repeat (times)</label><input type="number" name="repeat" min={1} max={24} defaultValue={1} /></div>
        <div><label>…every N weeks</label><input type="number" name="every_weeks" min={1} defaultValue={4} /></div>
        <div><label>Status</label><select name="status"><option value="scheduled">Scheduled</option><option value="forecast">Forecast</option></select></div>
        <div><label>Capacity each</label><input type="number" name="capacity" min={1} defaultValue={20} /></div>
        <div><label>Forecast seats each</label><input type="number" name="forecast_seats" min={0} defaultValue={0} /></div>
        <div><label>Price per seat</label><input type="number" step="0.01" name="price" /></div>
        <div><label>Client (created if new)</label><input name="client" list="bcl" /><datalist id="bcl">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
        <div><label>Lead presenter email</label><input type="email" name="presenter_email" /></div>
        <div><label>Delivery</label><input name="delivery" /></div>
        <div><label>Name suffix</label><input name="suffix" placeholder="APAC" /></div>
      </div>
      <div className="btnrow2"><button className="btn">Create cohorts</button></div>
    </form>
  );
}

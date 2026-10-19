import { planIntakes } from "@/lib/program-actions";
import type { Client, Program } from "@/lib/programs";

/** Plan one or many intakes of a program. Cohorts for every course are created automatically. */
export default function IntakePlanner({ programs, clients, program }: { programs: Program[]; clients: Client[]; program?: string }) {
  return (
    <form action={planIntakes} className="panel">
      <h3>Plan intakes</h3>
      <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Creates the intake(s) and a cohort for every course in the program, with dates worked out from the start date and the gap between courses. Set <b>Repeat</b> to plan a year ahead in one go.</p>
      <div className="formgrid">
        <div><label>Program</label><select name="program" defaultValue={program}>{programs.map((p) => <option key={p.slug} value={p.slug}>{p.title} ({p.course_slugs.length} courses)</option>)}</select></div>
        <div><label>First start date</label><input type="date" name="start_date" required /></div>
        <div><label>Days between course starts</label><input type="number" name="gap_days" min={1} placeholder="program default" /></div>
        <div><label>Repeat (number of intakes)</label><input type="number" name="repeat" min={1} max={24} defaultValue={1} /></div>
        <div><label>…every N weeks</label><input type="number" name="every_weeks" min={1} defaultValue={13} /></div>
        <div><label>Status</label><select name="status"><option value="scheduled">Scheduled</option><option value="forecast">Forecast</option></select></div>
        <div><label>Capacity per intake</label><input type="number" name="capacity" min={1} defaultValue={20} /></div>
        <div><label>Forecast seats</label><input type="number" name="forecast_seats" min={0} defaultValue={0} /></div>
        <div><label>Price per person (AUD)</label><input type="number" step="0.01" name="price" placeholder="program default" /></div>
        <div><label>Client (optional, created if new)</label><input name="client" list="clientlist" placeholder="Public / open enrolment" />
          <datalist id="clientlist">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
        <div><label>Lead presenter email</label><input type="email" name="presenter_email" /></div>
        <div><label>Delivery</label><input name="delivery" placeholder="Zoom · 09:00–17:00 Sydney" /></div>
        <div><label>Name prefix</label><input name="name_prefix" placeholder="e.g. Horizon Series APAC" /></div>
        <div className="wide"><label>Notes</label><input name="notes" /></div>
      </div>
      <div className="btnrow2"><button className="btn">Create intake(s) and cohorts</button>
        <span style={{ fontSize: 12.5, color: "var(--grey)" }}>Intakes are named “prefix · Mon YYYY”. You can rename them afterwards.</span></div>
    </form>
  );
}

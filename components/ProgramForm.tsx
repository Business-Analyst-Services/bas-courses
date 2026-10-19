import { saveProgram } from "@/lib/program-actions";
import type { Program } from "@/lib/programs";
import type { LoadedCourse } from "@/lib/types";

export default function ProgramForm({ courses, p }: { courses: LoadedCourse[]; p?: Program }) {
  const pos = (s: string) => (p ? p.course_slugs.indexOf(s) : -1);
  const sorted = [...courses].sort((a, b) => (pos(a.slug) < 0 ? 99 : pos(a.slug)) - (pos(b.slug) < 0 ? 99 : pos(b.slug)));
  return (
    <form action={saveProgram} className="panel">
      <h3>{p ? "Edit program" : "Create a program"}</h3>
      {p && <input type="hidden" name="slug" value={p.slug} />}
      <div className="formgrid">
        <div><label>Title</label><input name="title" required defaultValue={p?.title} placeholder="BA Practice Leader Program" /></div>
        <div><label>Menu name</label><input name="short_title" defaultValue={p?.short_title ?? ""} /></div>
        <div><label>Days between course starts</label><input type="number" name="gap_days" min={1} defaultValue={p?.gap_days ?? 7} /></div>
        <div><label>Bundle price per person (AUD)</label><input type="number" step="0.01" name="price" defaultValue={p?.price ?? ""} /></div>
        <div><label>Status</label><select name="status" defaultValue={p?.status ?? "published"}><option value="published">Published</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select></div>
        <div className="wide"><label>Description</label><input name="description" defaultValue={p?.description ?? ""} /></div>
      </div>
      <div className="olh" style={{ marginTop: 14 }}>Courses: tick to include, number to order</div>
      <div className="checks">
        {sorted.map((c) => (
          <label key={c.slug} className="check" style={{ alignItems: "center" }}>
            <input type="checkbox" name="courses" value={c.slug} defaultChecked={pos(c.slug) >= 0} />
            <input type="number" name={`order_${c.slug}`} defaultValue={pos(c.slug) >= 0 ? pos(c.slug) + 1 : ""} min={1} style={{ width: 52, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 8 }} />
            <span>{c.shortTitle}<small>{c.format}{c.settings.status !== "published" ? ` · ${c.settings.status}` : ""}</small></span>
          </label>
        ))}
      </div>
      <div className="fld" style={{ marginTop: 12 }}><label>Courses that don&apos;t exist yet: one title per line (created as hidden drafts and added at the end)</label>
        <textarea name="new_courses" rows={2} placeholder={"Stakeholder Influence Masterclass\nBA Coaching Clinic"} /></div>
      <div className="btnrow2"><button className="btn">{p ? "Save program" : "Create program"}</button></div>
    </form>
  );
}

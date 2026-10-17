import Link from "next/link";
import type { Course } from "@/lib/types";

/** Left-hand course navigation: every session grouped by day, with progress ticks. */
export default function CourseSidebar({
  course, currentId, done, view, role,
}: { course: Course; currentId?: string; done: Set<string>; view?: string; role: string }) {
  const q = view === "presenter" ? "?view=presenter" : "";
  const pct = Math.round((100 * done.size) / Math.max(course.modules.length, 1));
  return (
    <aside className="sidebar">
      <details className="sbwrap" open>
        <summary className="sbtitle">
          <span>{course.shortTitle}</span>
          <span className="sbmeta">{done.size}/{course.modules.length} done</span>
        </summary>
        <div className="minibar" style={{ width: "100%", margin: "4px 0 10px" }}><div style={{ width: `${pct}%` }} /></div>
        <nav className="sblinks">
          <Link href={`/c/${course.slug}`} className={!currentId ? "on" : ""}>🏠 Course overview</Link>
          <Link href={`/c/${course.slug}/outline`} className={currentId === "__outline" ? "on" : ""}>📋 Full outline</Link>
          {role === "presenter" && <Link href={`/c/${course.slug}/roster`} className={currentId === "__roster" ? "on" : ""}>👥 Roster</Link>}
        </nav>
        {course.days.map((d) => {
          const mods = course.modules.filter((m) => m.dayId === d.id);
          if (!mods.length) return null;
          return (
            <div key={d.id} className="sbday">
              <div className="sbdayh">{d.label}<span>{d.title}</span></div>
              {mods.map((m) => (
                <Link key={m.id} href={`/c/${course.slug}/m/${m.id}${q}`} className={`sbitem ${m.id === currentId ? "on" : ""}`}>
                  <span className="sbnum">{m.num}</span>
                  <span className="sbname">{m.title}</span>
                  <span className="sbtick">{done.has(m.id) ? "✓" : ""}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </details>
    </aside>
  );
}

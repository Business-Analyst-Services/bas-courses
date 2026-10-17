import Link from "next/link";
import type { Course } from "@/lib/types";
import DropdownCloser from "./DropdownCloser";

/** Course menu bar under the main nav: overview, outline, one dropdown per day/week, roster. */
export default function CourseSidebar({
  course, currentId, done, view, role,
}: { course: Course; currentId?: string; done: Set<string>; view?: string; role: string }) {
  const q = view === "presenter" ? "?view=presenter" : "";
  const pct = Math.round((100 * done.size) / Math.max(course.modules.length, 1));
  const cur = course.modules.find((m) => m.id === currentId);
  return (
    <div className="cbar">
      <DropdownCloser />
      <div className="cbarin">
        <Link href={`/c/${course.slug}`} className="cbtitle">{course.shortTitle}</Link>
        <nav className="cbmenu">
          <Link href={`/c/${course.slug}`} className={`cbtab ${!currentId ? "on" : ""}`}>Overview</Link>
          {course.days.map((d) => {
            const mods = course.modules.filter((m) => m.dayId === d.id);
            if (!mods.length) return null;
            const active = cur?.dayId === d.id;
            const dayDone = mods.filter((m) => done.has(m.id)).length;
            return (
              <details key={d.id} className="cbdrop">
                <summary className={`cbtab ${active ? "on" : ""}`}>
                  {d.label}{dayDone === mods.length && <span className="cbtick">✓</span>} <span className="car">▼</span>
                </summary>
                <div className="cbpanel">
                  <div className="cbpanelh">{d.label} · {d.title}</div>
                  {mods.map((m) => (
                    <Link key={m.id} href={`/c/${course.slug}/m/${m.id}${q}`} className={`cbitem ${m.id === currentId ? "on" : ""}`}>
                      <span className="sbnum">{m.num}</span>
                      <span>{m.title}<small>{m.time}</small></span>
                      <span className="sbtick">{done.has(m.id) ? "✓" : ""}</span>
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
          <Link href={`/c/${course.slug}/outline`} className={`cbtab ${currentId === "__outline" ? "on" : ""}`}>Outline</Link>
          {role === "presenter" && <Link href={`/c/${course.slug}/roster`} className={`cbtab ${currentId === "__roster" ? "on" : ""}`}>Roster</Link>}
        </nav>
        <div className="cbprog" title={`${done.size} of ${course.modules.length} sessions complete`}>
          {done.size}/{course.modules.length}
          <span className="minibar" style={{ width: 80 }}><div style={{ width: `${pct}%` }} /></span>
        </div>
      </div>
    </div>
  );
}

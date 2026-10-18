import Link from "next/link";
import type { Day, LoadedCourse, Schedule } from "@/lib/types";
import DropdownCloser from "./DropdownCloser";

/** Group consecutive days that share a `menu` label into one dropdown ("Wk 1–2"); otherwise one per day. */
function menuGroups(days: Day[]) {
  const out: { key: string; label: string; days: Day[] }[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (d.menu && last?.label === d.menu) last.days.push(d);
    else out.push({ key: d.id, label: d.menu ?? d.label, days: [d] });
  }
  return out;
}

/** Course menu bar under the main nav: overview, one dropdown per day/week group, outline, roster, schedule picker. */
export default function CourseSidebar({
  course, currentId, done, view, role, schedule, here,
}: { course: LoadedCourse; currentId?: string; done: Set<string>; view?: string; role: string; schedule?: Schedule; here?: string }) {
  const q = view === "presenter" ? "?view=presenter" : "";
  const pct = Math.round((100 * done.size) / Math.max(course.modules.length, 1));
  const S = course.settings;
  const isP = role === "presenter";
  const hidden = new Set(S.hiddenModules);
  const cur = course.modules.find((m) => m.id === currentId);
  return (
    <div className="cbar">
      <DropdownCloser />
      <div className="cbarin">
        <Link href={`/c/${course.slug}`} className="cbtitle">{course.shortTitle}{S.status !== "published" && <span className={`statuspill ${S.status}`}>{S.status}</span>}</Link>
        <nav className="cbmenu">
          <Link href={`/c/${course.slug}`} className={`cbtab ${!currentId ? "on" : ""}`}>Overview</Link>
          {menuGroups(course.days).map((g) => {
            const ids = new Set(g.days.map((d) => d.id));
            const mods = course.modules.filter((m) => ids.has(m.dayId));
            if (!mods.length) return null;
            const active = !!cur && ids.has(cur.dayId);
            const allDone = mods.every((m) => done.has(m.id));
            const title = g.days.length > 1 ? `${g.days[0].label}–${g.days[g.days.length - 1].label.replace(/^\D+/, "")}` : g.days[0].label;
            return (
              <details key={g.key} className="cbdrop">
                <summary className={`cbtab ${active ? "on" : ""}`}>
                  {g.label}{allDone && <span className="cbtick">✓</span>} <span className="car">▼</span>
                </summary>
                <div className="cbpanel">
                  <div className="cbpanelh">{title} · {g.days[0].title}</div>
                  {mods.map((m) => {
                    const d = g.days.find((x) => x.id === m.dayId);
                    return (
                      <Link key={m.id} href={`/c/${course.slug}/m/${m.id}${q}`} className={`cbitem ${m.id === currentId ? "on" : ""}`}>
                        <span className="sbnum">{m.num}</span>
                        <span>{m.title}<small>{g.days.length > 1 ? `${d?.label} · ` : ""}{m.time}{hidden.has(m.id) && " · hidden from participants"}</small></span>
                        <span className="sbtick">{done.has(m.id) ? "✓" : ""}</span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
          {(S.showOutline || isP) && <Link href={`/c/${course.slug}/outline`} className={`cbtab ${currentId === "__outline" ? "on" : ""}`}>Outline</Link>}
          {isP && S.showRoster && <Link href={`/c/${course.slug}/roster`} className={`cbtab ${currentId === "__roster" ? "on" : ""}`}>Roster</Link>}
        </nav>
        {course.schedules && course.schedules.length > 1 && schedule && (
          <details className="cbdrop cbsched">
            <summary className="cbtab" title="Choose how the sessions are spread">
              ⏱ {schedule.short} <span className="car">▼</span>
            </summary>
            <div className="cbpanel">
              <div className="cbpanelh">Schedule · same {course.modules.length} sessions</div>
              {course.schedules.map((s) => (
                <a key={s.id} href={`/c/${course.slug}/schedule?s=${s.id}&next=${encodeURIComponent(here ?? `/c/${course.slug}`)}`}
                  className={`cbitem ${s.id === schedule.id ? "on" : ""}`}>
                  <span className="sbnum">{s.id === schedule.id ? "●" : "○"}</span>
                  <span>{s.label}{s.note && <small>{s.note}</small>}</span>
                  <span />
                </a>
              ))}
            </div>
          </details>
        )}
        <div className="cbprog" title={`${done.size} of ${course.modules.length} sessions complete`}>
          {done.size}/{course.modules.length}
          <span className="minibar" style={{ width: 80 }}><div style={{ width: `${pct}%` }} /></span>
        </div>
      </div>
    </div>
  );
}

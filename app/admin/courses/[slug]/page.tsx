import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getFileCourses } from "@/lib/courses";
import { validateCourse } from "@/lib/validate";
import { saveCourseSettings, removeImportedCourse } from "@/lib/admin-actions";

export default async function CourseSettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const c = await getCourse(slug, { includeHidden: true });
  if (!c) notFound();
  const S = c.settings;
  const problems = validateCourse(c);
  const hasRepoVersion = getFileCourses().some((x) => x.slug === slug);
  const toggles: [keyof typeof S, string, string][] = [
    ["showOutline", "Full outline page", "Participants can open the one-page course outline."],
    ["showResources", "Resources & downloads", "Show the resources list on the course home."],
    ["showAiPrompts", "AI prompts", "Show paste-ready AI prompts in sessions."],
    ["showQuiz", "Knowledge checks", "Show quizzes at the end of sessions."],
    ["showRoster", "Roster for presenters", "Presenters can see the roster and mark attendance."],
    ["catalogue", "List in catalogue", "Show under “Also from BAS” to people who aren't enrolled."],
  ];

  return (
    <>
      <div className="crumbs"><Link href="/admin/courses">Courses</Link><span>›</span><span>{c.shortTitle}</span></div>
      <h1 className="pagetitle">{c.title}</h1>
      <p className="lead">{c.format} · {c.modules.length} sessions · {S.source === "imported" ? "imported via admin" : "from the GitHub repo"}</p>
      {saved && <div className="okband">✓ Saved. Changes are live now.</div>}
      {problems.length > 0 && <div className="errband"><b>Content checks:</b><ul style={{ margin: "6px 0 0 18px" }}>{problems.slice(0, 10).map((p) => <li key={p}>{p}</li>)}</ul></div>}

      <form action={saveCourseSettings}>
        <input type="hidden" name="slug" value={slug} />
        <div className="panel">
          <h3>Status</h3>
          <div className="radios">
            {[["published", "Published", "Live for enrolled participants."], ["hidden", "Hidden", "Only admins and presenters see it. Use while building or reviewing."], ["archived", "Archived", "Enrolled people keep access; removed from catalogue."]].map(([v, l, d]) => (
              <label key={v} className="check" style={{ flex: "1 1 220px" }}><input type="radio" name="status" value={v} defaultChecked={S.status === v} /><span><b>{l}</b><small>{d}</small></span></label>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Menu &amp; features</h3>
          <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Turn options off for participants. Presenters and admins always see everything.</p>
          <div className="checks">
            {toggles.map(([k, l, d]) => (
              <label key={k} className="check"><input type="checkbox" name={k} defaultChecked={Boolean(S[k])} /><span><b>{l}</b><small>{d}</small></span></label>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Sessions visible to participants</h3>
          <p style={{ fontSize: 13, color: "var(--grey)", marginBottom: 10 }}>Tick a session to <b>hide</b> it, e.g. content still in review or a module not used for this delivery. Hidden sessions drop out of the agenda and menus.</p>
          {c.days.map((d) => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div className="olh">{d.label} · {d.title}</div>
              <div className="checks">
                {c.modules.filter((m) => m.dayId === d.id).map((m) => (
                  <label key={m.id} className="check"><input type="checkbox" name="hidden" value={m.id} defaultChecked={S.hiddenModules.includes(m.id)} />
                    <span><b>{m.num}</b> {m.title}<small>{m.time} · {m.minutes} min</small></span></label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Display</h3>
          <div className="formgrid">
            <div><label>Title override</label><input name="title" defaultValue={S.title ?? ""} placeholder={c.title} /></div>
            <div><label>Menu name override</label><input name="shortTitle" defaultValue={S.shortTitle ?? ""} placeholder={c.shortTitle} /></div>
            <div><label>Sort order (lower first)</label><input name="sort" type="number" defaultValue={S.sort ?? ""} placeholder={String(c.order)} /></div>
            <div className="wide"><label>Tagline override</label><input name="tagline" defaultValue={S.tagline ?? ""} placeholder={c.tagline} /></div>
          </div>
        </div>
        <div className="btnrow2" style={{ marginBottom: 24 }}>
          <button className="btn">Save settings</button>
          <Link className="btn ghost" href={`/c/${slug}`}>Open course</Link>
          <a className="btn ghost" href={`/admin/courses/${slug}/export`}>⬇ Export JSON</a>
        </div>
      </form>
      {S.source === "imported" && (
        <form action={removeImportedCourse} className="panel">
          <h3>Imported content</h3>
          <p style={{ fontSize: 13.5, color: "var(--grey)" }}>{hasRepoVersion ? "Removing the imported version reverts this course to the version in the GitHub repo." : "This course only exists as an import. Removing it takes it off the site (enrolments and answers are kept)."}</p>
          <input type="hidden" name="slug" value={slug} />
          <div className="btnrow2"><button className="btn danger">{hasRepoVersion ? "Revert to repo version" : "Remove imported course"}</button></div>
        </form>
      )}
    </>
  );
}

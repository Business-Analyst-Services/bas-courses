import Link from "next/link";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import VersionBanner from "@/components/VersionBanner";
import { withSchedule } from "@/lib/schedule";
import { requireCourseRole } from "@/lib/access";
import { getProgress, getResponses } from "@/lib/data";
import { chosenPathway } from "@/lib/pathway";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { viewer, role, enrolments, course: baseCourse } = await requireCourseRole(slug);
  const { course, schedule } = await withSchedule(baseCourse);
  const [done, responses] = await Promise.all([getProgress(viewer.userId, slug), getResponses(viewer.userId, slug)]);
  const myPath = chosenPathway(course, responses);
  const first = course.modules[0];
  const S = course.settings;
  const isP = role === "presenter";

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <CourseSidebar course={course} schedule={schedule} pathway={myPath} here={`/c/${slug}`} done={done} role={role} />
        <div className="shell">
        <main className="main">
        <VersionBanner course={course} role={role} />
        <section className="hero">
          <img className="hero-logo" src="/bas-logo.svg" alt="" />
          <div className="hk">{course.format.toUpperCase()}{course.series ? ` · ${course.series.toUpperCase()}` : ""}</div>
          <h1>{course.title}<span>{course.tagline}</span></h1>
          <p className="hsub">{course.delivery} · {course.audience}</p>
          <div className="stats">
            <div className="stat"><div className="v">{course.modules.length}</div><div className="l">SESSIONS</div></div>
            <div className="stat"><div className="v">{course.duration}</div><div className="l">DURATION</div></div>
            <div className="stat"><div className="v">{done.size}/{course.modules.length}</div><div className="l">COMPLETED</div></div>
          </div>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          {first && <Link className="btn" href={`/c/${slug}/m/${first.id}`}>Start / continue →</Link>}
          {(S.showOutline || isP) && <Link className="btn ghost" href={`/c/${slug}/outline`}>Full outline</Link>}
          {role === "presenter" && first && <Link className="btn ghost" href={`/c/${slug}/m/${first.id}?view=presenter`}>Presenter run sheet</Link>}
          {role === "presenter" && first && <Link className="btn" href={`/c/${slug}/m/${first.id}/present`} target="_blank">🖥️ Present slides</Link>}
          {isP && S.showRoster && <Link className="btn ghost" href={`/c/${slug}/roster`}>Participant roster</Link>}
          <span className={`rolepill ${role}`}>You are a {role}</span>
        </div>

        {course.schedules && course.schedules.length > 1 && schedule && (
          <>
            <div className="kicker" style={{ marginBottom: 6 }}>Choose your schedule · same {course.modules.length} sessions, same artefacts</div>
            <nav className="schedpick" aria-label="Schedule">
              {course.schedules.map((s) => (
                <a key={s.id} href={`/c/${slug}/schedule?s=${s.id}&next=/c/${slug}`} className={s.id === schedule.id ? "on" : ""} aria-current={s.id === schedule.id ? "true" : undefined}>
                  <b>{s.id === schedule.id ? "● " : "○ "}{s.label}</b>
                  {s.note && <small>{s.note}</small>}
                </a>
              ))}
            </nav>
          </>
        )}

        {isP && S.status !== "published" && (
          <div className="notice">This course is <b>{S.status}</b>{S.status === "hidden" ? ": only presenters and admins can see it." : ": enrolled people can still open it, but it's off the catalogue."}</div>
        )}
        {isP && S.hiddenModules.length > 0 && (
          <div className="notice">{S.hiddenModules.length} session{S.hiddenModules.length > 1 ? "s are" : " is"} hidden from participants. You can still see {S.hiddenModules.length > 1 ? "them" : "it"}.</div>
        )}
        {course.pathways?.length ? (
          <section id="pathways" className="pathsec">
            <div className="kicker" style={{ marginBottom: 4 }}>Three pathways · one initiative</div>
            <h2 className="sec" style={{ marginTop: 0 }}>{myPath ? <>You&apos;re on {myPath.label}</> : "Choose your pathway"}</h2>
            <p className="lead">Every session builds your initiative. Your pathway decides the AI automation you design alongside it: a teaching section and a 10-minute activity in every session, ending in your capstone.</p>
            <div className="pathcards">
              {course.pathways.map((pw) => (
                <div key={pw.id} className={`pcard path-${pw.id} ${myPath?.id === pw.id ? "on" : ""}`}>
                  <div className="pchead"><span className="ppicon">{pw.icon}</span><div><b>{pw.label}</b><small>{pw.tagline}</small></div></div>
                  <p>{pw.summary}</p>
                  {pw.reference && <div className="pcref"><span>Modelled on</span>{pw.reference}</div>}
                  <ul className="objs">{pw.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
                  <div className="pccap"><span>🏁 Capstone</span>{pw.capstone}</div>
                  {pw.deck && isP && <a className="pcdeck" href={pw.deck}>⬇ Reference deck (presenter)</a>}
                  {!isP && (myPath?.id === pw.id
                    ? <span className="pcbtn on">✓ Your pathway</span>
                    : <a className="pcbtn" href={`/c/${slug}/pathway?p=${pw.id}&next=/c/${slug}%23pathways`}>{myPath ? "Switch to this pathway" : "Choose this pathway"} →</a>)}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {course.caseStudy && (
          <div className="casebar">
                        <div>
              <div className="kicker" style={{ marginBottom: 2 }}>Worked example · {course.caseStudy.org}</div>
              <b>{course.caseStudy.title}</b>
              <div style={{ fontSize: 13.5, color: "var(--grey)" }}>{course.caseStudy.summary}</div>
              {course.caseStudy.disclaimer && <small>{course.caseStudy.disclaimer}</small>}
            </div>
          </div>
        )}

        <h2 className="sec">Agenda</h2>
        {course.days.map((d) => (
          <div className="agenda" key={d.id}>
            <div className="dayh"><b>{d.label.toUpperCase()}</b><span>{d.title}</span></div>
            {d.blocks.map((b, i) => {
              const m = b.moduleId ? course.modules.find((x) => x.id === b.moduleId) : undefined;
              if (!m) return <div key={i} className="agrow break"><span className="tm">{b.time}</span><span>{b.title}</span><span /></div>;
              return (
                <Link key={i} className="agrow" href={`/c/${slug}/m/${m.id}`}>
                  <span className="tm">{b.time}</span>
                  <span><span className="num">{m.num}</span>{m.title}</span>
                  <span className="donetick">{done.has(m.id) ? "✓" : ""}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="grid g2" style={{ marginTop: 22 }}>
          <div className="panel"><h3>Outcomes</h3><ul className="objs">{course.outcomes.map((o) => <li key={o}>{o}</li>)}</ul></div>
          <div className="panel"><h3>You leave with</h3><ul className="objs">{course.leaveWith.map((o) => <li key={o}>{o}</li>)}</ul></div>
        </div>

        {(S.showResources || isP) && course.resources.length > 0 && <>
        <h2 className="sec">Resources</h2>
        <div className="grid g2">
          {course.resources.filter((r) => r.audience === "participant" || role === "presenter").map((r) => (
            <div className="card" key={r.title}>
              <h3>{r.href ? <a href={r.href} style={{ color: "var(--tealdk)" }}>⬇ {r.title}</a> : r.title} {r.audience === "presenter" && <span className="rolepill presenter">presenter</span>}</h3>
              <p>{r.description}</p>
            </div>
          ))}
        </div>
        </>}
      </main>
      </div>
    </>
  );
}

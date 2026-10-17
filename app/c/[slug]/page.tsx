import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import { requireCourseRole } from "@/lib/access";
import { getCourse } from "@/lib/courses";
import { getProgress } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  const { viewer, role, enrolments } = await requireCourseRole(slug);
  const done = await getProgress(viewer.userId, slug);
  const first = course.modules[0];

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <div className="shell">
        <CourseSidebar course={course} done={done} role={role} />
        <main className="main">
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
          <Link className="btn ghost" href={`/c/${slug}/outline`}>Full outline</Link>
          {role === "presenter" && first && <Link className="btn ghost" href={`/c/${slug}/m/${first.id}?view=presenter`}>Presenter run sheet</Link>}
          {role === "presenter" && <Link className="btn ghost" href={`/c/${slug}/roster`}>Participant roster</Link>}
          <span className={`rolepill ${role}`}>You are a {role}</span>
        </div>

        {course.caseStudy && (
          <div className="casebar">
            {course.caseStudy.org.toLowerCase().includes("worksafe") && <img src="/worksafe-logo.svg" alt="WorkSafe Victoria" />}
            <div>
              <div className="kicker" style={{ marginBottom: 2 }}>Running worked example · {course.caseStudy.org}</div>
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

        <h2 className="sec">Resources</h2>
        <div className="grid g2">
          {course.resources.filter((r) => r.audience === "participant" || role === "presenter").map((r) => (
            <div className="card" key={r.title}>
              <h3>{r.href ? <a href={r.href} style={{ color: "var(--tealdk)" }}>⬇ {r.title}</a> : r.title} {r.audience === "presenter" && <span className="rolepill presenter">presenter</span>}</h3>
              <p>{r.description}</p>
            </div>
          ))}
        </div>
      </main>
      </div>
    </>
  );
}

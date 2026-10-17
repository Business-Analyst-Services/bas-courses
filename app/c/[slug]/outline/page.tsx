import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import { requireCourseRole } from "@/lib/access";
import { getCourse } from "@/lib/courses";
import { getProgress } from "@/lib/data";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/** One-page map of everything in the course, for quick review. */
export default async function Outline({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  const { viewer, role, enrolments } = await requireCourseRole(slug);
  const done = await getProgress(viewer.userId, slug);
  const totals = course.modules.reduce(
    (a, m) => ({
      sections: a.sections + m.participant.sections.length,
      acts: a.acts + m.participant.activities.length,
      quiz: a.quiz + m.participant.quiz.length,
      prompts: a.prompts + (m.participant.aiPrompt ? 1 : 0),
    }),
    { sections: 0, acts: 0, quiz: 0, prompts: 0 },
  );

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <div className="shell">
        <CourseSidebar course={course} currentId="__outline" done={done} role={role} />
        <main className="main">
          <div className="kicker">{course.title}</div>
          <h1 className="pagetitle">Full course outline</h1>
          <p className="lead">Every session, its teaching sections, activities and knowledge checks on one page. Click any line to jump straight to it.</p>
          <div className="grid g4" style={{ marginBottom: 20 }}>
            {[["Sessions", course.modules.length], ["Teaching sections", totals.sections], ["Activities", totals.acts], ["Quiz questions", totals.quiz]].map(([l, v]) => (
              <div className="card" key={l as string}><div style={{ fontSize: 26, fontWeight: 700, color: "var(--navy)" }}>{v}</div><p>{l}</p></div>
            ))}
          </div>
          {course.days.map((d) => (
            <section key={d.id}>
              <h2 className="sec">{d.label} · {d.title}</h2>
              {course.modules.filter((m) => m.dayId === d.id).map((m) => {
                const base = `/c/${slug}/m/${m.id}`;
                return (
                  <div className="panel outline" key={m.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <Link href={base}><h3 style={{ margin: 0 }}><span className="sbnum">{m.num}</span> {m.title} {done.has(m.id) && <span className="donetick">✓</span>}</h3></Link>
                      <span className="tm" style={{ fontSize: 12.5, color: "var(--grey)" }}>{m.time} · {m.minutes} min</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--grey)", margin: "4px 0 10px" }}>{m.participant.bigIdea}</p>
                    <div className="olgrid">
                      <div>
                        <div className="olh">Teaching</div>
                        {m.participant.sections.map((s) => <Link key={s.heading} href={`${base}#${slugify(s.heading)}`}>{s.heading}</Link>)}
                      </div>
                      <div>
                        <div className="olh">Activities</div>
                        {m.participant.activities.map((a) => <Link key={a.id} href={`${base}#${a.id}`}>{a.title}</Link>)}
                        {m.participant.aiPrompt && <Link href={`${base}#ai-prompt`}>AI prompt</Link>}
                        {m.participant.quiz.length > 0 && <Link href={`${base}#quiz`}>Knowledge check ({m.participant.quiz.length})</Link>}
                      </div>
                      {role === "presenter" && (
                        <div>
                          <div className="olh">Presenter</div>
                          <Link href={`${base}?view=presenter`}>Run sheet · {m.presenter.beats.length} beats</Link>
                          {m.presenter.answerKey && <Link href={`${base}?view=presenter#answer-key`}>Answer key</Link>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </main>
      </div>
    </>
  );
}

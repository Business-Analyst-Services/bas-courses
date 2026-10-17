import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Md from "@/components/Md";
import ActivityField from "@/components/Activity";
import Quiz from "@/components/Quiz";
import { CompleteButton, CopyButton } from "@/components/Buttons";
import { requireCourseRole } from "@/lib/access";
import { getCourse, getModule, moduleNeighbours } from "@/lib/courses";
import { getProgress, getQuizAnswers, getResponses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params, searchParams,
}: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { slug, id } = await params;
  const { view } = await searchParams;
  const course = getCourse(slug);
  const m = course && getModule(course, id);
  if (!course || !m) notFound();
  const { viewer, role, enrolments } = await requireCourseRole(slug);
  const presenterView = view === "presenter" && role === "presenter";
  const [done, responses, quiz] = await Promise.all([
    getProgress(viewer.userId, slug),
    getResponses(viewer.userId, slug),
    getQuizAnswers(viewer.userId, slug, m.id),
  ]);
  const { prev, next } = moduleNeighbours(course, m.id);
  const day = course.days.find((d) => d.id === m.dayId);
  const q = presenterView ? "?view=presenter" : "";
  const P = m.participant;
  const T = m.presenter;

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <main className="content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <Link href={`/c/${slug}`} style={{ color: "var(--tealdk)", fontWeight: 600, fontSize: 13.5 }}>← {course.shortTitle} agenda</Link>
          {role === "presenter" && (
            <div className="modetoggle">
              <Link href={`/c/${slug}/m/${m.id}`} className={presenterView ? "" : "on"}>Participant</Link>
              <Link href={`/c/${slug}/m/${m.id}?view=presenter`} className={presenterView ? "on" : ""}>Presenter</Link>
            </div>
          )}
        </div>
        <div className="kicker">{day?.label} · {m.time} · {m.minutes} min {presenterView && "· PRESENTER RUN SHEET"}</div>
        <h1 className="pagetitle">{m.num} — {m.title}</h1>
        <p className="lead">{m.subtitle}</p>

        {presenterView ? (
          <>
            <div className="say"><small>OPEN THE BLOCK — WHAT TO SAY</small>{T.openingLine}</div>
            <div className="panel"><h3>Purpose</h3><p>{T.purpose}</p></div>
            <div className="panel">
              <h3>Run sheet · {m.minutes} min</h3>
              <table className="beats"><thead><tr><th>Beat</th><th>Min</th><th>Notes</th></tr></thead>
                <tbody>{T.beats.map((b, i) => <tr key={i}><td><b>{b.label}</b></td><td className="min">{b.minutes}</td><td><Md>{b.notes}</Md></td></tr>)}</tbody>
              </table>
            </div>
            {T.roleplay && (
              <>
                <h2 className="sec">Role-play</h2>
                <div className="rpgrid">
                  <div className="card"><b>Persona</b><h3>{T.roleplay.persona}</h3><p>{T.roleplay.line}</p></div>
                  <div className="card"><b>Curveball</b><h3>{T.roleplay.curveball}</h3></div>
                  <div className="card" style={{ gridColumn: "1 / -1" }}><b>The BA move</b><p style={{ color: "var(--ink)" }}>{T.roleplay.move}</p></div>
                </div>
              </>
            )}
            <h2 className="sec">Facilitation notes</h2>
            <div className="panel"><Md>{T.facilitationNotes}</Md></div>
            <div className="goodband"><b>What good looks like: </b>{T.whatGood}</div>
            <div className="failband"><b>Common failure, and the fix: </b>{T.commonFailure}</div>
            <h2 className="sec">Debrief questions</h2>
            <div className="panel"><ul className="objs">{T.debrief.map((d) => <li key={d}>{d}</li>)}</ul></div>
            {T.answerKey && (<><h2 className="sec">Answer key</h2><div className="panel"><Md>{T.answerKey}</Md></div></>)}
            {T.materials.length > 0 && (<><h2 className="sec">Materials</h2><div className="panel"><ul className="objs">{T.materials.map((x) => <li key={x}>{x}</li>)}</ul></div></>)}
            <div className="navyband"><p><b>Participant view:</b> switch to Participant at the top to see exactly what the room sees, including the activities and quiz.</p></div>
          </>
        ) : (
          <>
            <div className="bigidea">{P.bigIdea}</div>
            <Md>{P.overview}</Md>
            <div className="panel"><h3>By the end of this session you can</h3><ul className="objs">{P.objectives.map((o) => <li key={o}>{o}</li>)}</ul></div>

            <div className="grid g3" style={{ marginBottom: 10 }}>
              {P.keyPoints.map((k, i) => (
                <div className="card" key={i}><span className="stepchip">{i + 1}</span><h3>{k.title}</h3><p>{k.body}</p></div>
              ))}
            </div>

            {P.sections.map((s) => (
              <section key={s.heading}><h2 className="sec">{s.heading}</h2><div className="panel"><Md>{s.body}</Md></div></section>
            ))}

            {P.activities.length > 0 && <h2 className="sec">Workbook activities</h2>}
            {P.activities.map((a) => (
              <div className="panel act" key={a.id}>
                <div className="kicker">Activity{a.minutes ? ` · ${a.minutes} min` : ""}</div>
                <h3>{a.title}</h3>
                <Md>{a.instructions}</Md>
                {a.prompts.map((p) => (
                  <ActivityField key={p.id} slug={slug} activityId={a.id} promptId={p.id} label={p.label}
                    placeholder={p.placeholder} initial={responses[`${a.id}::${p.id}`] ?? ""} />
                ))}
              </div>
            ))}

            {P.aiPrompt && (
              <>
                <h2 className="sec">Paste-ready AI prompt</h2>
                <div className="panel">
                  <div className="pre">{P.aiPrompt}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <CopyButton text={P.aiPrompt} />
                    <span style={{ fontSize: 12.5, color: "var(--grey)" }}>Never paste confidential or personal data into a consumer AI tool. Use your organisation&apos;s approved tool.</span>
                  </div>
                </div>
              </>
            )}

            {P.quiz.length > 0 && (<><h2 className="sec">Knowledge check</h2><Quiz slug={slug} moduleId={m.id} items={P.quiz} initial={quiz} /></>)}

            <h2 className="sec">Key takeaways</h2>
            <div className="navyband"><ul className="objs">{P.takeaways.map((t) => <li key={t} style={{ color: "#fff" }}>{t}</li>)}</ul></div>
            <CompleteButton slug={slug} moduleId={m.id} done={done.has(m.id)} />
          </>
        )}

        <nav className="pager">
          {prev ? <Link href={`/c/${slug}/m/${prev.id}${q}`}><small>← Previous</small>{prev.num} {prev.title}</Link> : <span style={{ flex: 1 }} />}
          {next ? <Link href={`/c/${slug}/m/${next.id}${q}`} style={{ textAlign: "right" }}><small>Next →</small>{next.num} {next.title}</Link> : <span style={{ flex: 1 }} />}
        </nav>
      </main>
    </>
  );
}

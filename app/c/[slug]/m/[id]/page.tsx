import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import VersionBanner from "@/components/VersionBanner";
import { withSchedule } from "@/lib/schedule";
import { slugify } from "@/lib/slug";
import Md from "@/components/Md";
import ActivityField from "@/components/Activity";
import Quiz from "@/components/Quiz";
import AiPrompt, { type PromptSource } from "@/components/AiPrompt";
import SampleKit from "@/components/SampleKit";
import Tabs, { type TabDef } from "@/components/Tabs";
import { CompleteButton } from "@/components/Buttons";
import { requireCourseRole } from "@/lib/access";
import { getModule, moduleNeighbours } from "@/lib/courses";
import { getProgress, getQuizAnswers, getResponses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params, searchParams,
}: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { slug, id } = await params;
  const { view } = await searchParams;
  const { viewer, role, enrolments, course: baseCourse } = await requireCourseRole(slug);
  const { course, schedule } = await withSchedule(baseCourse);
  const m = getModule(course, id);
  if (!m) notFound();
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
  const S = course.settings;
  const showAi = S.showAiPrompts || role === "presenter";
  const showQuiz = S.showQuiz || role === "presenter";
  const isHidden = S.hiddenModules.includes(m.id);
  const T = m.presenter;

  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <CourseSidebar course={course} schedule={schedule} here={`/c/${slug}/m/${m.id}${q}`} currentId={m.id} done={done} view={presenterView ? "presenter" : undefined} role={role} />
        <div className="shell">
        <main className="main">
        <VersionBanner course={course} role={role} />
        {(() => {
          const idx = course.modules.findIndex((x) => x.id === m.id) + 1;
          const total = T.beats.reduce((x, y) => x + y.minutes, 0) || m.minutes;
          const KP_ICONS = ["🎯", "💡", "🤖", "🧭", "🛡️", "⚡"];
          const ACCENTS = ["teal", "navy", "amber", "violet", "rose"];
          const glance = (
            <div className="glance" aria-label="Session at a glance">
              {T.beats.map((bt, i) => (
                <div key={i} className={`gl gl${i % 4}`} style={{ flex: bt.minutes }} title={`${bt.label} · ${bt.minutes} min`}>
                  <b>{bt.label.split("·").pop()?.trim()}</b><small>{bt.minutes} min</small>
                </div>
              ))}
            </div>
          );

          const participantTabs: TabDef[] = [
            {
              id: "overview", label: "Overview", icon: "✨",
              panel: (
                <>
                  <div className="bigidea" id="overview"><span className="bq" aria-hidden>“</span>{P.bigIdea}</div>
                  <div className="ovgrid">
                    <div className="ovtext"><Md>{P.overview}</Md></div>
                    <aside className="objcard">
                      <div className="olh">By the end you can</div>
                      <ol className="objsteps">{P.objectives.map((o) => <li key={o}>{o}</li>)}</ol>
                    </aside>
                  </div>
                  <h2 className="sec">Session at a glance · {total} min</h2>
                  {glance}
                  <div className="kpgrid">
                    {P.keyPoints.map((k, i) => (
                      <div className={`kp acc-${ACCENTS[i % ACCENTS.length]}`} key={i}>
                        <span className="kpi" aria-hidden>{KP_ICONS[i % KP_ICONS.length]}</span>
                        <h3>{k.title}</h3><p>{k.body}</p>
                      </div>
                    ))}
                  </div>
                </>
              ),
            },
            {
              id: "learn", label: "Learn", icon: "📘", badge: P.sections.length,
              panel: (
                <>
                  <nav className="chaprail" aria-label="Chapters">
                    {P.sections.map((s, i) => <a key={s.heading} href={`#${slugify(s.heading)}`}><span>{String(i + 1).padStart(2, "0")}</span>{s.heading}</a>)}
                  </nav>
                  {P.sections.map((s, i) => (
                    <section key={s.heading} id={slugify(s.heading)} className={`chapter acc-${ACCENTS[i % ACCENTS.length]}`}>
                      <div className="chhead"><span className="chnum">{String(i + 1).padStart(2, "0")}</span><h2>{s.heading}</h2></div>
                      <div className="chbody"><Md>{s.body}</Md></div>
                    </section>
                  ))}
                </>
              ),
            },
          ];
          if (P.samples?.length) participantTabs.push({
            id: "samples", label: "Samples", icon: "🧰", badge: P.samples.length,
            panel: (<div id="samples">{P.samples.map((k) => <SampleKit key={k.code} kit={k} />)}</div>),
          });
          if (P.activities.length) participantTabs.push({
            id: "activities", label: "Activities", icon: "🛠️", badge: P.activities.length,
            panel: (
              <div id="activities">
                {P.activities.map((a, i) => (
                  <div className="panel act actcard" key={a.id} id={a.id}>
                    <div className="acthead">
                      <span className="actnum">{i + 1}</span>
                      <div><div className="kicker" style={{ margin: 0 }}>Activity {i + 1} of {P.activities.length}</div><h3>{a.title}</h3></div>
                      {a.minutes ? <span className="timer">⏱ {a.minutes} min</span> : null}
                    </div>
                    <Md>{a.instructions}</Md>
                    {a.prompts.map((pr) => (
                      <ActivityField key={pr.id} slug={slug} activityId={a.id} promptId={pr.id} label={pr.label}
                        placeholder={pr.placeholder} initial={responses[`${a.id}::${pr.id}`] ?? ""} />
                    ))}
                  </div>
                ))}
              </div>
            ),
          });
          if (showAi && P.aiPrompt) participantTabs.push({
            id: "ai-prompt", label: "AI prompt", icon: "🤖",
            panel: (
              <AiPrompt prompt={P.aiPrompt} sources={(P.aiContext ?? P.activities.map((a) => a.id)).flatMap((aid): PromptSource[] => {
                const owner = course.modules.find((x) => x.participant.activities.some((a) => a.id === aid));
                const act = owner?.participant.activities.find((a) => a.id === aid);
                if (!owner || !act) return [];
                return [{
                  activityId: act.id, title: act.title,
                  where: owner.id === m.id ? "this session" : `Session ${owner.num}`, current: owner.id === m.id,
                  fields: act.prompts.map((pr) => ({ promptId: pr.id, label: pr.label, value: responses[`${act.id}::${pr.id}`] ?? "" })),
                }];
              })} />
            ),
          });
          if (showQuiz && P.quiz.length) participantTabs.push({
            id: "quiz", label: "Quiz", icon: "🧠", badge: P.quiz.length,
            panel: (<div id="quiz"><Quiz slug={slug} moduleId={m.id} items={P.quiz} initial={quiz} /></div>),
          });
          participantTabs.push({
            id: "takeaways", label: "Takeaways", icon: "🏁",
            panel: (
              <div id="takeaways">
                <div className="tkgrid">{P.takeaways.map((t, i) => <div className="tk" key={t}><span>{i + 1}</span>{t}</div>)}</div>
                <div className="donebox"><div><b>Finished this session?</b><small>Mark it complete to track your progress across the course.</small></div><CompleteButton slug={slug} moduleId={m.id} done={done.has(m.id)} /></div>
              </div>
            ),
          });

          const presenterTabs: TabDef[] = [
            {
              id: "runsheet", label: "Run sheet", icon: "⏱", badge: T.beats.length,
              panel: (
                <>
                  <div className="say"><small>OPEN THE BLOCK — WHAT TO SAY</small>{T.openingLine}</div>
                  <div className="panel"><div className="olh">Purpose</div><p>{T.purpose}</p></div>
                  {glance}
                  <ol className="timeline" id="runsheet">
                    {T.beats.map((bt, i) => (
                      <li key={i} className={`tl tl${i % 4}`}>
                        <div className="tldot">{bt.minutes}<small>min</small></div>
                        <div className="tlbody"><b>{bt.label}</b><Md>{bt.notes}</Md></div>
                      </li>
                    ))}
                  </ol>
                </>
              ),
            },
          ];
          if (T.roleplay) presenterTabs.push({
            id: "roleplay", label: "Role-play", icon: "🎭",
            panel: (
              <div className="rpstage" id="roleplay">
                <div className="rpcard persona"><b>Persona</b><h3>{T.roleplay.persona}</h3><p className="bubble">{T.roleplay.line}</p></div>
                <div className="rpcard curve"><b>⚡ Curveball</b><h3>{T.roleplay.curveball}</h3></div>
                <div className="rpcard move"><b>✅ The BA move</b><p>{T.roleplay.move}</p></div>
              </div>
            ),
          });
          presenterTabs.push({
            id: "facilitation", label: "Facilitation", icon: "🧭",
            panel: (
              <div id="facilitation">
                <div className="panel"><Md>{T.facilitationNotes}</Md></div>
                <div className="gfgrid">
                  <div className="goodband"><b>✅ What good looks like</b><p>{T.whatGood}</p></div>
                  <div className="failband"><b>⚠️ Common failure, and the fix</b><p>{T.commonFailure}</p></div>
                </div>
              </div>
            ),
          });
          presenterTabs.push({
            id: "debrief", label: "Debrief", icon: "💬", badge: T.debrief.length,
            panel: (<div className="qgrid" id="debrief">{T.debrief.map((x, i) => <div className="qcard" key={x}><span>Q{i + 1}</span>{x}</div>)}</div>),
          });
          if (T.answerKey) presenterTabs.push({ id: "answer-key", label: "Answer key", icon: "🔑", panel: (<div className="panel" id="answer-key"><Md>{T.answerKey}</Md></div>) });
          if (T.materials.length) presenterTabs.push({
            id: "materials", label: "Materials", icon: "📦", badge: T.materials.length,
            panel: (<ul className="matlist" id="materials">{T.materials.map((x) => <li key={x}>{x}</li>)}</ul>),
          });

          return (
            <>
              <div className="crumbs"><Link href={`/c/${slug}`}>{course.shortTitle}</Link><span>›</span><span>{day?.label}</span><span>›</span><span>Session {idx} of {course.modules.length}</span></div>
              <header className={`shero ${presenterView ? "pres" : ""}`}>
                <div className="shnum"><small>SESSION</small>{idx}<span>of {course.modules.length}</span></div>
                <div className="shmain">
                  <div className="shkick">{day?.label}{day?.title ? ` · ${day.title}` : ""}{presenterView ? " · Presenter run sheet" : ""}</div>
                  <h1>{m.title}</h1>
                  <p>{m.subtitle}</p>
                  <div className="shchips">
                    <span>🗓 {m.time}</span><span>⏱ {m.minutes} min</span>
                    {P.activities.length > 0 && <span>🛠️ {P.activities.length} activities</span>}
                    {showQuiz && P.quiz.length > 0 && <span>🧠 {P.quiz.length}-question check</span>}
                    {done.has(m.id) && <span className="ok">✓ Completed</span>}
                  </div>
                </div>
                {role === "presenter" && (
                  <div className="shactions">
                  <Link href={`/c/${slug}/m/${m.id}/present`} target="_blank" className="presentbtn">🖥️ Present slides</Link>
                  <details className="viewdrop">
                    <summary>{presenterView ? "🎤 Presenter view" : "👥 Participant view"} <span className="car">▼</span></summary>
                    <div className="vdpanel">
                      <div className="cbpanelh">Show this session as</div>
                      <Link href={`/c/${slug}/m/${m.id}`} className={`cbitem ${presenterView ? "" : "on"}`}>
                        <span className="sbnum">👥</span><span>Participant<small>What the room sees: teaching, activities, prompt, quiz</small></span><span />
                      </Link>
                      <Link href={`/c/${slug}/m/${m.id}?view=presenter`} className={`cbitem ${presenterView ? "on" : ""}`}>
                        <span className="sbnum">🎤</span><span>Presenter<small>Run sheet, role-play, facilitation, debrief, answer key</small></span><span />
                      </Link>
                      <Link href={`/c/${slug}/m/${m.id}/present`} className="cbitem" target="_blank">
                        <span className="sbnum">🖥️</span><span>Present on screen<small>Full-screen slides of this session to share with the room, with your notes</small></span><span />
                      </Link>
                    </div>
                  </details>
                  </div>
                )}
              </header>
              {isHidden && <div className="notice">This session is hidden from participants. Only presenters and admins can see it.</div>}
              <Tabs key={presenterView ? "p" : "a"} tabs={presenterView ? presenterTabs : participantTabs} />
            </>
          );
        })()}

        <nav className="pager">
          {prev ? <Link href={`/c/${slug}/m/${prev.id}${q}`}><small>← Previous</small>{prev.num} {prev.title}</Link> : <span style={{ flex: 1 }} />}
          {next ? <Link href={`/c/${slug}/m/${next.id}${q}`} style={{ textAlign: "right" }}><small>Next →</small>{next.num} {next.title}</Link> : <span style={{ flex: 1 }} />}
        </nav>
      </main>
      </div>
    </>
  );
}

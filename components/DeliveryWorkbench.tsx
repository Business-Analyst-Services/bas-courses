"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveResponse } from "@/lib/actions";

/* ------------------------------------------------------------------ *
 * Delivery Workbench — one backlog item followed through the Delivery
 * Horizon: roadmap → feature → stories → elaboration → iteration →
 * the week → review → roadmap update. State saves to the participant's
 * workbook (responses table, activity "workbench", prompt "state").
 * ------------------------------------------------------------------ */

type Story = {
  id: string; title: string; asA: string; iWant: string; soThat: string; split: string;
  invest: Record<string, boolean>; points: number | null; col: Col; blocked: boolean;
  scenarios: { id: string; name: string; given: string; when: string; then: string }[];
  nfrs: string[]; dor: Record<string, boolean>;
};
type Col = "backlog" | "todo" | "doing" | "done";
type Lane = "now" | "next" | "later";
type Item = { id: string; text: string; lane: Lane };
type State = {
  v: 1;
  outcome: string; roadmap: Item[]; featureId: string; feature: string; signal: string;
  stories: Story[]; focusId: string;
  capacity: number; iterationGoal: string; day: number; log: string[];
  feedback: { id: string; who: string; said: string; impact: "none" | "backlog" | "roadmap" | "strategy" }[];
  roadmapNote: string;
};

const INVEST: [string, string][] = [
  ["I", "Independent — can be built and released without waiting on another story"],
  ["N", "Negotiable — detail is a conversation, not a contract"],
  ["V", "Valuable — a user or the business gets something they can notice"],
  ["E", "Estimable — the team understands it enough to size it"],
  ["S", "Small — fits comfortably inside one iteration"],
  ["T", "Testable — we could write a Given–When–Then for it"],
];
const DOR: [string, string][] = [
  ["why", "Linked to the feature, outcome and roadmap item (the 'why' is visible)"],
  ["story", "Story or job story written from the user's point of view"],
  ["ac", "At least two Given–When–Then scenarios, including an edge case"],
  ["nfr", "Relevant non-functional requirements captured"],
  ["deps", "Dependencies and open questions resolved or owned"],
  ["est", "Estimated by the team"],
  ["amigos", "Three Amigos held (analyst, developer, tester)"],
];
const SPLITS = ["Workflow step", "Business rule", "Happy / unhappy path", "Data variation", "Interface or channel", "Simple first, enhance later", "Spike then build"];
const NFRS = ["Accessibility (WCAG 2.2 AA)", "Performance / response time", "Security and privacy", "Availability", "Audit and logging", "Plain language / readability", "Mobile-first"];
const POKER = [1, 2, 3, 5, 8, 13, 21];
const DAYS = [
  { d: "Mon", ev: "Iteration planning", ba: "Bring ready items; answer scope questions; help shape the iteration goal." },
  { d: "Tue", ev: "Stand-up · Three Amigos", ba: "Elaborate the next item just in time; capture clarifications on the card." },
  { d: "Wed", ev: "Stand-up · Backlog refinement", ba: "Slice and elaborate items for the next one to two iterations." },
  { d: "Thu", ev: "Stand-up · Stakeholder check-in", ba: "Show work in progress; test the acceptance criteria with a real user." },
  { d: "Fri", ev: "Iteration review · Retrospective", ba: "Gather feedback, translate it into backlog items, and send learning upward." },
];
const CURVEBALLS = [
  "A developer asks: what happens if the receiver replies after route lock?",
  "The tester finds the SMS is unreadable on a small screen.",
  "A stakeholder asks to add a 'call me' option mid-iteration.",
  "Legal flags that receiver mobile numbers need consent wording.",
  "The middleware team says the route planner only polls every 30 minutes.",
];
const TOOLS = {
  generic: { name: "Generic", roadmap: "Product roadmap", feature: "Feature", story: "Backlog item / story", ac: "Acceptance criteria", board: "Kanban board", iter: "Iteration", review: "Iteration review notes", where: "" },
  jira: { name: "Jira + Confluence", roadmap: "Jira Product Discovery / Advanced Roadmaps", feature: "Epic", story: "Story issue", ac: "Acceptance criteria field (or Xray tests)", board: "Jira board", iter: "Sprint", review: "Confluence review page", where: "Story maps often live in Miro or an Easy Agile add-on; designs link from Figma." },
  ado: { name: "Azure DevOps", roadmap: "Delivery Plans", feature: "Feature", story: "User Story", ac: "Acceptance Criteria field (+ Azure Test Plans)", board: "Boards", iter: "Iteration path / Sprint", review: "Wiki page", where: "Gherkin scenarios can run with SpecFlow or Reqnroll in the pipeline." },
} as const;
type ToolKey = keyof typeof TOOLS;

const uid = () => Math.random().toString(36).slice(2, 9);
const blankStory = (title = ""): Story => ({
  id: uid(), title, asA: "", iWant: "", soThat: "", split: "", invest: {}, points: null, col: "backlog", blocked: false,
  scenarios: [{ id: uid(), name: "Happy path", given: "", when: "", then: "" }], nfrs: [], dor: {},
});
const EMPTY: State = {
  v: 1, outcome: "", roadmap: [], featureId: "", feature: "", signal: "", stories: [], focusId: "",
  capacity: 20, iterationGoal: "", day: 0, log: [], feedback: [], roadmapNote: "",
};

function example(): State {
  const f = uid();
  const s1: Story = {
    ...blankStory("Receiver gets a delivery-window notice"),
    asA: "receiver expecting a large delivery", iWant: "a notice the evening before with a two-hour window", soThat: "I can plan around my shift",
    split: "Workflow step", invest: { I: true, N: true, V: true, E: true, S: true, T: true }, points: 5,
    scenarios: [
      { id: uid(), name: "Notice sent before route lock", given: "a consignment with a validated mobile number is on tomorrow's run", when: "the run is planned at 6 pm", then: "the receiver gets an SMS with a two-hour window and a confirm link by 7 pm" },
      { id: uid(), name: "No mobile number", given: "a consignment has no receiver mobile number", when: "the run is planned", then: "no SMS is sent and the consignment is flagged 'at risk' for the planner" },
    ],
    nfrs: ["Plain language / readability", "Mobile-first", "Security and privacy"],
    dor: { why: true, story: true, ac: true, nfr: true, deps: false, est: true, amigos: true }, col: "todo",
  };
  const s2: Story = {
    ...blankStory("Receiver confirms or chooses a safe drop"),
    asA: "receiver", iWant: "to confirm I'm home or pick a safe place in one tap", soThat: "the parcel arrives first time",
    split: "Happy / unhappy path", invest: { I: false, N: true, V: true, E: true, S: true, T: true }, points: 8,
    scenarios: [{ id: uid(), name: "Confirm before route lock", given: "a receiver has a window notice", when: "they tap 'I'll be home' before 5 am", then: "the route planner shows the consignment as confirmed" }],
    nfrs: ["Accessibility (WCAG 2.2 AA)"], dor: { why: true, story: true, ac: false, est: true },
  };
  const s3: Story = { ...blankStory("Re-book after a missed window"), split: "Simple first, enhance later", points: 13 };
  return {
    ...EMPTY,
    outcome: "On-time last-mile delivery 79% → ≥92% in 12 months",
    roadmap: [
      { id: f, text: "Receivers confirm before route lock", lane: "now" },
      { id: uid(), text: "Shippers book complete consignments", lane: "now" },
      { id: uid(), text: "Runs delivered without futile attempts", lane: "next" },
      { id: uid(), text: "Dynamic re-planning on the day", lane: "later" },
    ],
    featureId: f, feature: "Receiver delivery-window confirmation",
    signal: "≥70% of notified receivers confirm a window or safe drop before route lock",
    stories: [s1, s2, s3], focusId: s1.id,
    iterationGoal: "Receivers in the pilot depot get a delivery-window notice they can act on",
  };
}

/* ------------------------------ helpers ------------------------------ */
const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
function gherkin(s: Story) {
  return [`Feature: ${s.title || "Untitled story"}`, ...s.scenarios.flatMap((sc) => [
    "", `  Scenario: ${sc.name || "Unnamed"}`, `    Given ${sc.given || "…"}`, `    When ${sc.when || "…"}`, `    Then ${sc.then || "…"}`,
  ])].join("\n");
}
function toMarkdown(s: State, tool: ToolKey) {
  const T = TOOLS[tool];
  const lines = [
    `# Delivery thread`, ``, `**Outcome:** ${s.outcome}`, `**${T.roadmap}:** ${s.roadmap.find((r) => r.id === s.featureId)?.text ?? ""}`,
    `**${T.feature}:** ${s.feature} — signal: ${s.signal}`, `**${T.iter} goal:** ${s.iterationGoal}`, ``, `## ${T.story}s`,
  ];
  s.stories.forEach((st) => {
    lines.push(``, `### ${st.title} (${st.points ?? "?"} pts · ${st.col})`, `As a ${st.asA}, I want ${st.iWant}, so that ${st.soThat}.`, "```gherkin", gherkin(st), "```");
    if (st.nfrs.length) lines.push(`NFRs: ${st.nfrs.join(", ")}`);
  });
  if (s.feedback.length) { lines.push(``, `## Review feedback`); s.feedback.forEach((f) => lines.push(`- ${f.who}: "${f.said}" → ${f.impact}`)); }
  if (s.roadmapNote) lines.push(``, `## Roadmap update`, s.roadmapNote);
  return lines.join("\n");
}

/* ------------------------------ component ------------------------------ */
export default function DeliveryWorkbench({
  slug, initial, carried, startStep = 0,
}: { slug: string; initial: string; carried?: { feature?: string; vision?: string }; startStep?: number }) {
  const [s, setS] = useState<State>(() => { try { const p = JSON.parse(initial); if (p?.v === 1) return p; } catch {} return EMPTY; });
  const [step, setStep] = useState(startStep);
  const [tool, setTool] = useState<ToolKey>("generic");
  const [save, setSave] = useState<"" | "saving" | "saved" | "error">(initial ? "saved" : "");
  const [flash, setFlash] = useState("");
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const T = TOOLS[tool];

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveResponse(slug, "workbench", "state", JSON.stringify(s)).then(() => setSave("saved"), () => setSave("error"));
    }, 800);
  }, [s, slug]);

  const up = (p: Partial<State>) => setS((x) => ({ ...x, ...p }));
  const upStory = (id: string, p: Partial<Story>) => setS((x) => ({ ...x, stories: x.stories.map((st) => (st.id === id ? { ...st, ...p } : st)) }));
  const focus = s.stories.find((st) => st.id === s.focusId) ?? s.stories[0];
  const committed = s.stories.filter((st) => st.col !== "backlog");
  const committedPts = committed.reduce((a, st) => a + (st.points ?? 0), 0);
  const roadItem = s.roadmap.find((r) => r.id === s.featureId);
  const dorScore = (st: Story) => DOR.filter(([k]) => st.dor[k]).length;
  const investScore = (st: Story) => INVEST.filter(([k]) => st.invest[k]).length;

  const thread = useMemo(() => [
    { k: "Outcome", v: s.outcome, step: 0 },
    { k: "Roadmap item", v: roadItem ? `${roadItem.text} (${roadItem.lane})` : "", step: 0 },
    { k: T.feature.split(" (")[0], v: s.feature, step: 0 },
    { k: T.story, v: focus?.title ?? "", step: 1 },
    { k: "Acceptance criteria", v: focus && focus.scenarios.some((x) => x.then) ? `${focus.scenarios.filter((x) => x.then).length} scenario(s)` : "", step: 2 },
    { k: `${T.iter} goal`, v: s.iterationGoal, step: 3 },
    { k: "Increment", v: s.stories.some((x) => x.col === "done") ? `${s.stories.filter((x) => x.col === "done").length} item(s) done` : "", step: 4 },
    { k: "Feedback → roadmap", v: s.roadmapNote || (s.feedback.length ? `${s.feedback.length} piece(s) of feedback` : ""), step: 5 },
  ], [s, T, roadItem, focus]);

  const steps = ["1 · Roadmap to feature", "2 · Slice", "3 · Elaborate", "4 · Plan the iteration", "5 · Run the week", "6 · Review and roadmap"];

  return (
    <div className="wb">
      {/* top bar */}
      <div className="wb-top">
        <div className="wb-tools">
          <span className="wb-lbl">Show in:</span>
          {(Object.keys(TOOLS) as ToolKey[]).map((k) => (
            <button key={k} className={`wb-chip ${tool === k ? "on" : ""}`} onClick={() => setTool(k)}>{TOOLS[k].name}</button>
          ))}
        </div>
        <div className="wb-actions">
          <button className="wb-btn ghost" onClick={() => { if (confirmReplace(s)) { setS(example()); setFlash("Running case loaded — change anything to make it yours."); } }}>Load running case</button>
          <button className="wb-btn ghost" onClick={() => { navigator.clipboard?.writeText(toMarkdown(s, tool)); setFlash("Copied as Markdown — paste into Confluence, a wiki or a doc."); }}>Copy thread</button>
          <span className={`wb-save ${save}`}>{save === "saving" ? "Saving…" : save === "saved" ? "✓ Saved to your workbook" : save === "error" ? "Couldn't save — check your connection" : ""}</span>
        </div>
      </div>
      {flash && <div className="wb-flash" onAnimationEnd={() => setFlash("")}>{flash}</div>}
      {tool !== "generic" && <div className="wb-toolnote">Terms below are shown as they appear in <b>{T.name}</b>. {T.where}</div>}

      {/* traceability thread */}
      <div className="wb-thread" aria-label="Traceability thread">
        {thread.map((t, i) => (
          <button key={t.k} className={`wb-node ${t.v ? "ok" : ""}`} onClick={() => setStep(t.step)} title={`${t.k}: ${t.v || "not yet"}`}>
            <span className="wb-nk">{t.k}</span>
            <span className="wb-nv">{t.v || "—"}</span>
            {i < thread.length - 1 && <span className="wb-arrow" aria-hidden>›</span>}
          </button>
        ))}
      </div>

      {/* steps */}
      <div className="wb-steps" role="tablist">
        {steps.map((l, i) => <button key={l} role="tab" aria-selected={step === i} className={`wb-step ${step === i ? "on" : ""}`} onClick={() => setStep(i)}>{l}</button>)}
      </div>

      <div className="wb-panel">
        {step === 0 && (
          <section>
            <Intro title="Start from the roadmap, not the backlog" text={`Every story you build should trace back to an outcome on the roadmap. Pick the roadmap item you're delivering against now, then name the ${T.feature.toLowerCase()} that serves it and the signal that will tell you it worked.`} />
            {carried?.feature && !s.feature && (
              <div className="wb-carry">From your Initiative day: <b>{carried.feature}</b> <button className="wb-btn sm" onClick={() => up({ feature: carried.feature! })}>Use this</button></div>
            )}
            <Field label="Strategic or product outcome" value={s.outcome} onChange={(v) => up({ outcome: v })} placeholder="e.g. On-time last-mile delivery 79% → ≥92%" />
            <div className="wb-lanes">
              {(["now", "next", "later"] as Lane[]).map((lane) => (
                <div key={lane} className={`wb-lane ${lane}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const id = e.dataTransfer.getData("text"); up({ roadmap: s.roadmap.map((r) => (r.id === id ? { ...r, lane } : r)) }); }}>
                  <div className="wb-laneh">{lane === "now" ? "Now" : lane === "next" ? "Next" : "Later"}</div>
                  {s.roadmap.filter((r) => r.lane === lane).map((r) => (
                    <div key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData("text", r.id)}
                      className={`wb-card ${s.featureId === r.id ? "sel" : ""}`} onClick={() => up({ featureId: r.id })}>
                      <input value={r.text} onChange={(e) => up({ roadmap: s.roadmap.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)) })} onClick={(e) => e.stopPropagation()} />
                      <div className="wb-cardfoot">
                        {s.featureId === r.id ? <span className="wb-tag">delivering this</span> : <span className="wb-hint">click to deliver</span>}
                        <button className="wb-x" title="Remove" onClick={(e) => { e.stopPropagation(); up({ roadmap: s.roadmap.filter((x) => x.id !== r.id) }); }}>×</button>
                      </div>
                    </div>
                  ))}
                  <button className="wb-add" onClick={() => up({ roadmap: [...s.roadmap, { id: uid(), text: "New outcome", lane }] })}>+ Add</button>
                </div>
              ))}
            </div>
            <p className="wb-tip">Drag cards between columns. The roadmap is owned at the Initiative Horizon — at Delivery it's <b>context</b> that tells the team why this iteration matters.</p>
            <div className="wb-2">
              <Field label={`${T.feature} you're delivering`} value={s.feature} onChange={(v) => up({ feature: v })} placeholder="e.g. Receiver delivery-window confirmation" />
              <Field label="Signal that it worked" value={s.signal} onChange={(v) => up({ signal: v })} placeholder="e.g. ≥70% confirm before route lock" />
            </div>
            <Next onClick={() => setStep(1)} disabled={!s.feature} label="Slice it into stories" />
          </section>
        )}

        {step === 1 && (
          <section>
            <Intro title="Slice by value, not by layer" text={`A ${T.feature.toLowerCase()} is too big for one ${T.iter.toLowerCase()}. Split it into thin slices that each give a user something they can notice. Choose a splitting pattern, then check each slice against INVEST.`} />
            <div className="wb-stories">
              {s.stories.map((st) => {
                const n = investScore(st);
                return (
                  <div key={st.id} className={`wb-story ${s.focusId === st.id ? "sel" : ""}`}>
                    <input className="wb-title" value={st.title} placeholder="Story title" onChange={(e) => upStory(st.id, { title: e.target.value })} />
                    <select value={st.split} onChange={(e) => upStory(st.id, { split: e.target.value })}>
                      <option value="">Splitting pattern…</option>{SPLITS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <div className="wb-invest">
                      {INVEST.map(([k, tip]) => (
                        <button key={k} title={tip} className={`wb-letter ${st.invest[k] ? "on" : ""}`} onClick={() => upStory(st.id, { invest: { ...st.invest, [k]: !st.invest[k] } })}>{k}</button>
                      ))}
                      <span className={`wb-score ${n === 6 ? "good" : n >= 4 ? "mid" : "low"}`}>{n}/6</span>
                    </div>
                    {!st.invest.S && st.points && st.points >= 13 && <div className="wb-warn">Probably not Small — try splitting again.</div>}
                    {!st.invest.I && n > 0 && <div className="wb-warn">Not Independent — note the dependency, or re-slice.</div>}
                    <div className="wb-row">
                      <button className="wb-btn sm" onClick={() => { up({ focusId: st.id }); setStep(2); }}>Elaborate →</button>
                      <button className="wb-x" title="Remove" onClick={() => up({ stories: s.stories.filter((x) => x.id !== st.id), focusId: s.focusId === st.id ? "" : s.focusId })}>×</button>
                    </div>
                  </div>
                );
              })}
              <button className="wb-story add" onClick={() => { const n = blankStory(); up({ stories: [...s.stories, n], focusId: s.focusId || n.id }); }}>+ Add a slice</button>
            </div>
            <details className="wb-help"><summary>Hover a letter for INVEST · see splitting patterns</summary>
              <ul>{INVEST.map(([k, t]) => <li key={k}><b>{k}</b> — {t.split(" — ")[1]}</li>)}</ul>
              <p><b>Warning sign:</b> slices like "build the database", "build the API", "build the screen" are technical layers — none is valuable alone.</p>
            </details>
            <Next onClick={() => setStep(2)} disabled={!s.stories.length} label="Elaborate the first slice" />
          </section>
        )}

        {step === 2 && (
          focus ? (
            <section>
              <Intro title="From abstract to concrete" text="Write the story, then make it real with examples. Each Given–When–Then scenario becomes an acceptance criterion the tester can check — and, with BDD tools, an automated test." />
              <div className="wb-pick">
                Working on: <select value={focus.id} onChange={(e) => up({ focusId: e.target.value })}>{s.stories.map((st) => <option key={st.id} value={st.id}>{st.title || "Untitled"}</option>)}</select>
              </div>
              <div className="wb-us">
                <span>As a</span><input value={focus.asA} onChange={(e) => upStory(focus.id, { asA: e.target.value })} placeholder="receiver expecting a large delivery" />
                <span>I want</span><input value={focus.iWant} onChange={(e) => upStory(focus.id, { iWant: e.target.value })} placeholder="a notice with a two-hour window" />
                <span>so that</span><input value={focus.soThat} onChange={(e) => upStory(focus.id, { soThat: e.target.value })} placeholder="I can plan around my shift" />
              </div>
              <div className="wb-2 wb-ac">
                <div>
                  {focus.scenarios.map((sc, i) => (
                    <div key={sc.id} className="wb-sc">
                      <div className="wb-row"><input className="wb-scname" value={sc.name} onChange={(e) => upStory(focus.id, { scenarios: focus.scenarios.map((x) => (x.id === sc.id ? { ...x, name: e.target.value } : x)) })} />
                        {focus.scenarios.length > 1 && <button className="wb-x" onClick={() => upStory(focus.id, { scenarios: focus.scenarios.filter((x) => x.id !== sc.id) })}>×</button>}</div>
                      {(["given", "when", "then"] as const).map((k) => (
                        <label key={k} className="wb-gwt"><b>{k[0].toUpperCase() + k.slice(1)}</b>
                          <input value={sc[k]} onChange={(e) => upStory(focus.id, { scenarios: focus.scenarios.map((x) => (x.id === sc.id ? { ...x, [k]: e.target.value } : x)) })}
                            placeholder={i === 0 ? { given: "a consignment with a valid mobile is on tomorrow's run", when: "the run is planned at 6 pm", then: "the receiver gets an SMS with a two-hour window" }[k] : ""} />
                        </label>
                      ))}
                    </div>
                  ))}
                  <button className="wb-add" onClick={() => upStory(focus.id, { scenarios: [...focus.scenarios, { id: uid(), name: focus.scenarios.length === 1 ? "Edge case" : `Scenario ${focus.scenarios.length + 1}`, given: "", when: "", then: "" }] })}>+ Add scenario</button>
                  {focus.scenarios.length < 2 && <div className="wb-warn">Add an edge case — what happens when data is missing, late or wrong?</div>}
                  <div className="wb-nfr"><div className="wb-lbl">Non-functional requirements</div>
                    {NFRS.map((n) => <button key={n} className={`wb-chip ${focus.nfrs.includes(n) ? "on" : ""}`} onClick={() => upStory(focus.id, { nfrs: focus.nfrs.includes(n) ? focus.nfrs.filter((x) => x !== n) : [...focus.nfrs, n] })}>{n}</button>)}
                  </div>
                </div>
                <div>
                  <div className="wb-lbl">Live preview · {tool === "generic" ? "Gherkin" : T.ac}</div>
                  <pre className="wb-gherkin">{gherkin(focus)}</pre>
                  <div className="wb-dor">
                    <div className="wb-lbl">Definition of Ready <span className="wb-meter"><span style={{ width: `${pct(dorScore(focus), DOR.length)}%` }} /></span> {dorScore(focus)}/{DOR.length}</div>
                    {DOR.map(([k, t]) => (
                      <label key={k} className="wb-check"><input type="checkbox" checked={!!focus.dor[k]} onChange={() => upStory(focus.id, { dor: { ...focus.dor, [k]: !focus.dor[k] } })} /> {t}</label>
                    ))}
                  </div>
                </div>
              </div>
              <Next onClick={() => setStep(3)} label={`Plan the ${T.iter.toLowerCase()}`} />
            </section>
          ) : <Empty go={() => setStep(1)} />
        )}

        {step === 3 && (
          <section>
            <Intro title={`Plan the ${T.iter.toLowerCase()}`} text="Estimate together with planning-poker cards, set capacity, and pull in only items that are ready. The iteration goal says what changes for a user — it's the thread back to the roadmap." />
            <div className="wb-plan">
              <label className="wb-cap">Team capacity (points) <input type="number" min={1} value={s.capacity} onChange={(e) => up({ capacity: Math.max(1, +e.target.value || 1) })} /></label>
              <div className="wb-capbar"><span className={committedPts > s.capacity ? "over" : ""} style={{ width: `${Math.min(100, pct(committedPts, s.capacity))}%` }} /></div>
              <div className={`wb-capnote ${committedPts > s.capacity ? "over" : ""}`}>{committedPts} of {s.capacity} points committed{committedPts > s.capacity ? " — over capacity: drop or split something" : ""}</div>
            </div>
            <table className="wb-table"><thead><tr><th>{T.story}</th><th>Estimate</th><th>Ready</th><th>In this {T.iter.toLowerCase()}?</th></tr></thead>
              <tbody>{s.stories.map((st) => {
                const ready = dorScore(st) >= 5;
                const inIt = st.col !== "backlog";
                return (
                  <tr key={st.id}>
                    <td>{st.title || "Untitled"}</td>
                    <td><div className="wb-poker">{POKER.map((p) => <button key={p} className={st.points === p ? "on" : ""} onClick={() => upStory(st.id, { points: p })}>{p}</button>)}</div></td>
                    <td><span className={`wb-pill ${ready ? "good" : "low"}`}>{dorScore(st)}/{DOR.length}</span></td>
                    <td><button className={`wb-btn sm ${inIt ? "" : "ghost"}`} disabled={!ready && !inIt} title={!ready ? "Not ready yet — finish the Definition of Ready" : ""}
                      onClick={() => upStory(st.id, { col: inIt ? "backlog" : "todo" })}>{inIt ? "✓ Committed" : ready ? "Pull in" : "Not ready"}</button></td>
                  </tr>
                );
              })}</tbody></table>
            {s.stories.some((st) => st.points && st.points >= 13) && <div className="wb-warn">An item estimated 13+ is usually a sign it isn't understood or isn't small. Split it or run a spike.</div>}
            <Field label={`${T.iter} goal`} value={s.iterationGoal} onChange={(v) => up({ iterationGoal: v })} placeholder="e.g. Receivers in the pilot depot get a delivery-window notice they can act on" />
            {s.iterationGoal && !/receiver|user|customer|shipper|driver|planner/i.test(s.iterationGoal) && <div className="wb-warn">Does the goal name who benefits? Goals like "finish the API" describe work, not value.</div>}
            <Next onClick={() => setStep(4)} disabled={!committed.length} label="Run the week" />
          </section>
        )}

        {step === 4 && (
          <section>
            <Intro title="A week in the life" text={`Step through the ${T.iter.toLowerCase()} day by day. Move cards on the ${T.board.toLowerCase()} and see where the analyst adds value at each event. Throw a curveball to practise responding.`} />
            <div className="wb-week">
              {DAYS.map((d, i) => (
                <button key={d.d} className={`wb-day ${s.day === i ? "on" : ""} ${i < s.day ? "past" : ""}`} onClick={() => up({ day: i })}>
                  <b>{d.d}</b><span>{d.ev}</span>
                </button>
              ))}
            </div>
            <div className="wb-baday"><b>Analyst today:</b> {DAYS[s.day].ba}</div>
            <div className="wb-board">
              {(["todo", "doing", "done"] as Col[]).map((c) => (
                <div key={c} className="wb-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text"); upStory(id, { col: c }); }}>
                  <div className="wb-colh">{c === "todo" ? "To do" : c === "doing" ? "In progress" : "Done"} <span>{s.stories.filter((x) => x.col === c).length}</span></div>
                  {s.stories.filter((x) => x.col === c).map((st) => (
                    <div key={st.id} className={`wb-kcard ${st.blocked ? "blocked" : ""}`} draggable onDragStart={(e) => e.dataTransfer.setData("text", st.id)}>
                      <div>{st.title || "Untitled"}</div>
                      <div className="wb-cardfoot">
                        <span className="wb-hint">{st.points ?? "?"} pts</span>
                        <span>
                          <button className="wb-mini" title="Toggle blocked" onClick={() => upStory(st.id, { blocked: !st.blocked })}>{st.blocked ? "Unblock" : "Block"}</button>
                          {c !== "done" && <button className="wb-mini" onClick={() => upStory(st.id, { col: c === "todo" ? "doing" : "done", blocked: false })}>→</button>}
                        </span>
                      </div>
                      {st.blocked && <div className="wb-warn">Blocked items often hide an unanswered analysis question. What's the question, and who answers it?</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="wb-row wb-curve">
              <button className="wb-btn" onClick={() => { const c = CURVEBALLS[Math.floor(Math.random() * CURVEBALLS.length)]; up({ log: [`${DAYS[s.day].d}: ${c}`, ...s.log].slice(0, 12) }); }}>🎲 Throw a curveball</button>
              <button className="wb-btn ghost" disabled={s.day >= 4} onClick={() => up({ day: Math.min(4, s.day + 1) })}>Next day →</button>
            </div>
            {s.log.length > 0 && (
              <div className="wb-log">{s.log.map((l, i) => (
                <div key={i} className="wb-logrow"><span>{l}</span>
                  <span className="wb-row">
                    <button className="wb-mini" onClick={() => { const n = blankStory(`Follow-up: ${l.split(": ").slice(1).join(": ").slice(0, 60)}`); up({ stories: [...s.stories, n], log: s.log.filter((_, j) => j !== i) }); setFlash("Added to the backlog — it'll need slicing and elaborating."); }}>→ New backlog item</button>
                    <button className="wb-mini" onClick={() => up({ log: s.log.filter((_, j) => j !== i) })}>Resolved in conversation</button>
                  </span>
                </div>
              ))}</div>
            )}
            <Next onClick={() => setStep(5)} label="Go to the review" />
          </section>
        )}

        {step === 5 && (
          <section>
            <Intro title="Review — and send learning upward" text={`At the review, users and stakeholders react to the increment. Capture what they said, then decide where it goes: absorbed in the backlog, a change to the roadmap, or learning for the Strategy Horizon.`} />
            <div className="wb-done">{s.stories.filter((x) => x.col === "done").length ? <>Increment: {s.stories.filter((x) => x.col === "done").map((x) => x.title).join(" · ")}</> : <span className="wb-warn">Nothing is Done yet — go back to the board, or review what you'd show.</span>}</div>
            {s.feedback.map((f) => (
              <div key={f.id} className="wb-fb">
                <input value={f.who} placeholder="Who" onChange={(e) => up({ feedback: s.feedback.map((x) => (x.id === f.id ? { ...x, who: e.target.value } : x)) })} />
                <input value={f.said} placeholder="What they said or did" onChange={(e) => up({ feedback: s.feedback.map((x) => (x.id === f.id ? { ...x, said: e.target.value } : x)) })} />
                <select value={f.impact} onChange={(e) => up({ feedback: s.feedback.map((x) => (x.id === f.id ? { ...x, impact: e.target.value as typeof f.impact } : x)) })}>
                  <option value="none">No change</option><option value="backlog">New or changed backlog item</option><option value="roadmap">Change the roadmap</option><option value="strategy">Learning for Strategy</option>
                </select>
                <button className="wb-x" onClick={() => up({ feedback: s.feedback.filter((x) => x.id !== f.id) })}>×</button>
              </div>
            ))}
            <button className="wb-add" onClick={() => up({ feedback: [...s.feedback, { id: uid(), who: "", said: "", impact: "backlog" }] })}>+ Add feedback</button>
            {s.feedback.some((f) => f.impact === "roadmap") && (
              <div className="wb-roadupd">
                <div className="wb-lbl">Roadmap update — drag the cards to reflect what you learned</div>
                <div className="wb-lanes mini">
                  {(["now", "next", "later"] as Lane[]).map((lane) => (
                    <div key={lane} className={`wb-lane ${lane}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text"); up({ roadmap: s.roadmap.map((r) => (r.id === id ? { ...r, lane } : r)) }); }}>
                      <div className="wb-laneh">{lane[0].toUpperCase() + lane.slice(1)}</div>
                      {s.roadmap.filter((r) => r.lane === lane).map((r) => <div key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData("text", r.id)} className={`wb-card ${s.featureId === r.id ? "sel" : ""}`}>{r.text}</div>)}
                    </div>
                  ))}
                </div>
                <Field label="What changed on the roadmap, and why (for the Product Owner and stakeholders)" value={s.roadmapNote} onChange={(v) => up({ roadmapNote: v })} placeholder="e.g. 'Re-book after a miss' moved to Now: 1 in 5 pilot receivers asked for it at the review." />
              </div>
            )}
            {s.feedback.some((f) => f.impact === "strategy") && <div className="wb-info">Learning for Strategy: summarise it in a form decision-makers can act on, and take it to the monthly roadmap review or portfolio check-in.</div>}
            <div className="wb-final">
              <div className="wb-lbl">Your thread is {pct(thread.filter((t) => t.v).length, thread.length)}% complete</div>
              <button className="wb-btn" onClick={() => { const b = new Blob([toMarkdown(s, tool)], { type: "text/markdown" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "delivery-thread.md"; a.click(); }}>Download thread (.md)</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function confirmReplace(s: State) { return !s.feature && !s.stories.length ? true : window.confirm("Replace your workbench with the running case example?"); }
function Intro({ title, text }: { title: string; text: string }) { return <div className="wb-intro"><h3>{title}</h3><p>{text}</p></div>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="wb-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Next({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return <div className="wb-next"><button className="wb-btn" onClick={onClick} disabled={disabled}>{label} →</button></div>;
}
function Empty({ go }: { go: () => void }) { return <div className="wb-intro"><p>Add a story slice first.</p><button className="wb-btn" onClick={go}>Go to Slice</button></div>; }

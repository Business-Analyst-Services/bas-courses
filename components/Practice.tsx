"use client";
import { useMemo, useState } from "react";
import { saveResponse } from "@/lib/actions";
import { RESPONSE_EVENT } from "@/components/AiPrompt";
import type { Interactive, SprintSim, KanbanSim } from "@/lib/types";

/** Records the result in the participant's workbook (so presenters see it on the roster and it can feed AI prompts). */
function record(slug: string, id: string, value: string) {
  saveResponse(slug, id, "result", value).then(() =>
    window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, { detail: { activityId: id, promptId: "result", value } })), () => {});
}

export default function Practice({ slug, items, initial }: { slug: string; items: Interactive[]; initial: Record<string, string> }) {
  return (
    <div className="practice">
      {items.map((x) => x.type === "sprint"
        ? <Sprint key={x.id} slug={slug} sim={x} saved={initial[`${x.id}::result`]} />
        : <Kanban key={x.id} slug={slug} sim={x} saved={initial[`${x.id}::result`]} />)}
    </div>
  );
}

/* ---------------- Sprint planning ---------------- */
function Sprint({ slug, sim, saved }: { slug: string; sim: SprintSim; saved?: string }) {
  const [inSprint, setIn] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const byId = (id: string) => sim.items.find((i) => i.id === id)!;
  const pts = inSprint.reduce((s, id) => s + byId(id).points, 0);
  const move = (id: string, to: "sprint" | "backlog") => { setIn((v) => (to === "sprint" ? (v.includes(id) ? v : [...v, id]) : v.filter((x) => x !== id))); setSel(null); setChecked(false); };

  const issues = useMemo(() => {
    const out: { ok: boolean; text: string }[] = [];
    out.push(pts <= sim.capacity ? { ok: true, text: `Within capacity: ${pts} of ${sim.capacity} points.` } : { ok: false, text: `Over capacity: ${pts} points against ${sim.capacity}. The team can't commit to this — take something out.` });
    if (pts < sim.capacity * 0.6) out.push({ ok: false, text: `Only ${pts} of ${sim.capacity} points planned — is there another ready item that supports the goal?` });
    for (const id of inSprint) {
      const it = byId(id);
      if (!it.ready) out.push({ ok: false, text: `"${it.title}" isn't ready: ${it.readyNote ?? "it needs more elaboration"}. Elaborate it first, or leave it in the backlog.` });
      if (!it.goal) out.push({ ok: false, text: `"${it.title}" doesn't support the sprint goal. Only add it if there's spare capacity after goal items.` });
      for (const dep of it.dependsOn ?? []) if (!inSprint.includes(dep)) out.push({ ok: false, text: `"${it.title}" depends on "${byId(dep).title}", which isn't in the sprint.` });
    }
    const missedGoal = sim.items.filter((i) => i.goal && i.ready && i.mustHave && !inSprint.includes(i.id));
    for (const m of missedGoal) out.push({ ok: false, text: `"${m.title}" is ready and essential to the sprint goal, but it's not in the sprint.` });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inSprint, pts]);
  const good = issues.every((i) => i.ok);

  const check = () => {
    setChecked(true);
    const lines = [`Sprint plan (${pts}/${sim.capacity} pts): ${inSprint.map((id) => byId(id).title).join("; ") || "nothing planned"}`, good ? "Result: plan meets all checks." : `Issues: ${issues.filter((i) => !i.ok).map((i) => i.text).join(" ")}`];
    record(slug, sim.id, lines.join("\n"));
  };
  const card = (id: string) => {
    const it = byId(id);
    return (
      <div key={id} className={`pcard ${sel === id ? "sel" : ""} ${!it.ready ? "notready" : ""}`} draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", id)} onClick={() => setSel(sel === id ? null : id)}
        role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === id ? null : id); } }}
        aria-pressed={sel === id}>
        <div className="pct">{it.title}</div>
        <div className="pcm">
          <span className="pts">{it.points} pts</span>
          <span className={`val ${it.value}`}>{it.value} value</span>
          {it.goal && <span className="goal">🎯 goal</span>}
          {!it.ready && <span className="warn">⚠ not ready</span>}
          {it.dependsOn?.length ? <span className="dep">needs {it.dependsOn.map((d) => byId(d).short ?? d).join(", ")}</span> : null}
        </div>
      </div>
    );
  };
  const zone = (to: "sprint" | "backlog", ids: string[], title: string, sub: string) => (
    <div className={`pzone ${to}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/plain"), to)}
      onClick={(e) => { if (sel && e.target === e.currentTarget) move(sel, to); }}>
      <div className="pzh"><b>{title}</b><span>{sub}</span></div>
      {ids.map(card)}
      {sel && !ids.includes(sel) && <button className="pmove" onClick={() => move(sel, to)}>Move selected here ↓</button>}
      {!ids.length && !sel && <div className="pempty">{to === "sprint" ? "Drag stories here (or tap a story, then tap here)" : "Backlog is empty"}</div>}
    </div>
  );

  return (
    <div className="panel psim" id={sim.id}>
      <div className="acthead"><span className="actnum">🏃</span><div><div className="kicker" style={{ margin: 0 }}>Interactive · sprint planning</div><h3>{sim.title}</h3></div>{sim.minutes ? <span className="timer">⏱ {sim.minutes} min</span> : null}</div>
      <p>{sim.intro}</p>
      <div className="pgoal"><b>Sprint goal:</b> {sim.goal} · <b>Team capacity:</b> {sim.capacity} points</div>
      <div className="pcap"><div style={{ width: `${Math.min(100, (pts / sim.capacity) * 100)}%` }} className={pts > sim.capacity ? "over" : ""} /><span>{pts} / {sim.capacity} pts</span></div>
      <div className="pboard two">
        {zone("backlog", sim.items.filter((i) => !inSprint.includes(i.id)).map((i) => i.id), "Product backlog", "ordered by the Product Owner")}
        {zone("sprint", inSprint, sim.sprintName ?? "Sprint", "what the team commits to")}
      </div>
      <div className="btnrow2">
        <button className="btn" onClick={check}>Check my plan</button>
        <button className="btn ghost" onClick={() => { setIn([]); setChecked(false); }}>Reset</button>
        <button className="btn ghost" onClick={() => setShowModel(!showModel)}>{showModel ? "Hide" : "Show"} model plan</button>
        {saved && !checked && <span className="muted">Last saved: {saved.split("\n")[0]}</span>}
      </div>
      {checked && (
        <div className={`pfeed ${good ? "ok" : "bad"}`}>
          <b>{good ? "✓ A plan the team can commit to." : "Not quite — here's what a good Agile BA would flag:"}</b>
          <ul>{issues.map((i, k) => <li key={k} className={i.ok ? "ok" : "bad"}>{i.ok ? "✓" : "✗"} {i.text}</li>)}</ul>
        </div>
      )}
      {showModel && <div className="pfeed info"><b>Model plan:</b> {sim.model}</div>}
      {sim.debrief && <details className="pdebrief"><summary>Debrief questions</summary><ul>{sim.debrief.map((d) => <li key={d}>{d}</li>)}</ul></details>}
    </div>
  );
}

/* ---------------- Kanban flow ---------------- */
type CardState = { id: string; col: string; started?: number; done?: number; blocked?: string; blockerId?: string };
function Kanban({ slug, sim, saved }: { slug: string; sim: KanbanSim; saved?: string }) {
  const cols = sim.columns;
  const idx = (c: string) => cols.findIndex((x) => x.id === c);
  const start = () => sim.cards.map((c) => ({ id: c.id, col: c.col, started: idx(c.col) > 0 ? 1 : undefined }) as CardState);
  const [cards, setCards] = useState<CardState[]>(start);
  const [day, setDay] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([`Day 1. ${sim.events.find((e) => e.day === 1)?.text ?? "Start the day: pull work and move it forward."}`]);
  const [refusals, setRefusals] = useState(0);
  const [moves, setMoves] = useState(0);
  const [resolving, setResolving] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const title = (id: string) => sim.cards.find((c) => c.id === id)!.title;
  const doneCol = cols[cols.length - 1].id;
  const say = (s: string) => setLog((l) => [s, ...l].slice(0, 12));
  const movesPerDay = sim.movesPerDay ?? 3;

  const move = (id: string, to: string) => {
    setSel(null);
    const c = cards.find((x) => x.id === id)!; if (c.col === to) return;
    if (finished) return;
    if (c.blocked) { say(`🚫 "${title(id)}" is blocked: ${c.blocked}. Clear the blocker first.`); return; }
    const from = idx(c.col), dest = idx(to);
    if (dest < from) { say(`↩ Cards don't move backwards on this board — if "${title(id)}" needs rework, it stays where it is and gets attention.`); return; }
    if (dest > from + 1) { say(`⤳ "${title(id)}" can only move one column at a time.`); return; }
    const lim = cols[dest].wip; const count = cards.filter((x) => x.col === to).length;
    if (lim && count >= lim) { setRefusals((r) => r + 1); say(`⛔ WIP limit: ${cols[dest].name} already has ${count}/${lim}. Stop starting, start finishing — help move something out of ${cols[dest].name} first.`); return; }
    if (moves >= movesPerDay) { say(`⏳ The team has used its ${movesPerDay} moves for today. Click "Next day".`); return; }
    setMoves((m) => m + 1);
    setCards((cs) => cs.map((x) => x.id !== id ? x : { ...x, col: to, started: x.started ?? (from === 0 ? day : x.started), done: to === doneCol ? day : undefined }));
    say(`→ "${title(id)}" moved to ${cols[dest].name}.`);
  };

  const nextDay = () => {
    if (finished) return;
    const d = day + 1;
    if (d > sim.days) {
      setFinished(true);
      const done = cards.filter((c) => c.col === doneCol);
      const ct = done.map((c) => (c.done ?? d) - (c.started ?? 1) + 1);
      const avg = ct.length ? (ct.reduce((a, b) => a + b, 0) / ct.length).toFixed(1) : "—";
      const summary = `Kanban flow: ${done.length}/${sim.cards.length} cards done in ${sim.days} days · average cycle time ${avg} days · ${refusals} WIP-limit stops`;
      say(`🏁 ${summary}`);
      record(slug, sim.id, summary);
      return;
    }
    setDay(d); setMoves(0);
    const evs = sim.events.filter((e) => e.day === d);
    setCards((cs) => cs.map((c) => { const ev = evs.find((e) => e.cardId === c.id && e.block); return ev && c.col !== doneCol ? { ...c, blocked: ev.block, blockerId: ev.id } : c; }));
    say(`☀ Day ${d}. ${evs.map((e) => e.text).join(" ") || "Keep work flowing."}`);
  };

  const resolve = (cardId: string, optIdx: number) => {
    const c = cards.find((x) => x.id === cardId)!; const ev = sim.events.find((e) => e.id === c.blockerId)!;
    const opt = ev.options![optIdx];
    if (opt.correct) {
      setCards((cs) => cs.map((x) => x.id === cardId ? { ...x, blocked: undefined, blockerId: undefined } : x));
      say(`✅ Blocker cleared on "${title(cardId)}": ${opt.why}`);
      setResolving(null);
    } else say(`✗ "${opt.text}" — ${opt.why}`);
  };

  const doneCards = cards.filter((c) => c.col === doneCol);
  return (
    <div className="panel psim" id={sim.id}>
      <div className="acthead"><span className="actnum">🗂️</span><div><div className="kicker" style={{ margin: 0 }}>Interactive · Kanban flow</div><h3>{sim.title}</h3></div>{sim.minutes ? <span className="timer">⏱ {sim.minutes} min</span> : null}</div>
      <p>{sim.intro}</p>
      <div className="pstat"><span>📅 Day {Math.min(day, sim.days)} of {sim.days}</span><span>👣 Moves today {moves}/{movesPerDay}</span><span>✅ Done {doneCards.length}/{sim.cards.length}</span><span>⛔ WIP stops {refusals}</span></div>
      <div className="pboard kan" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(150px, 1fr))` }}>
        {cols.map((col) => {
          const here = cards.filter((c) => c.col === col.id);
          const full = col.wip != null && here.length >= col.wip;
          return (
            <div key={col.id} className={`pzone ${full ? "full" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/plain"), col.id)}
              onClick={(e) => { if (sel && e.target === e.currentTarget) move(sel, col.id); }}>
              <div className="pzh"><b>{col.name}</b><span>{col.wip ? `WIP ${here.length}/${col.wip}` : `${here.length}`}</span></div>
              {here.map((c) => (
                <div key={c.id} className={`pcard ${sel === c.id ? "sel" : ""} ${c.blocked ? "blocked" : ""}`} draggable={!c.blocked}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} onClick={() => setSel(sel === c.id ? null : c.id)}
                  role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === c.id ? null : c.id); } }}>
                  <div className="pct">{title(c.id)}</div>
                  <div className="pcm">
                    {c.started && <span className="pts">{c.col === doneCol ? `cycle ${(c.done ?? day) - c.started + 1}d` : `age ${day - c.started + 1}d`}</span>}
                    {c.blocked && <span className="warn">🚫 blocked</span>}
                  </div>
                  {c.blocked && <button className="pmove" onClick={(e) => { e.stopPropagation(); setResolving(c.id); }}>Act as the BA →</button>}
                </div>
              ))}
              {sel && !here.some((c) => c.id === sel) && <button className="pmove" onClick={() => move(sel, col.id)}>Move here</button>}
            </div>
          );
        })}
      </div>
      {resolving && (() => {
        const c = cards.find((x) => x.id === resolving)!; const ev = sim.events.find((e) => e.id === c.blockerId)!;
        return (
          <div className="pfeed info">
            <b>🚫 {title(resolving)} — {c.blocked}</b>
            <p style={{ margin: "6px 0" }}>What do you do?</p>
            <div className="popts">{ev.options!.map((o, k) => <button key={k} className="btn ghost" onClick={() => resolve(resolving, k)}>{o.text}</button>)}</div>
          </div>
        );
      })()}
      <div className="btnrow2">
        <button className="btn" onClick={nextDay} disabled={finished}>{day >= sim.days ? "Finish & see results" : "Next day →"}</button>
        <button className="btn ghost" onClick={() => { setCards(start()); setDay(1); setMoves(0); setRefusals(0); setFinished(false); setResolving(null); setLog(["Day 1. Restarted."]); }}>Restart</button>
        {saved && !finished && <span className="muted">Last saved: {saved}</span>}
      </div>
      <ol className="plog">{log.map((l, k) => <li key={k}>{l}</li>)}</ol>
      {finished && sim.lessons && <div className="pfeed ok"><b>What this shows</b><ul>{sim.lessons.map((l) => <li key={l}>{l}</li>)}</ul></div>}
      {sim.debrief && <details className="pdebrief"><summary>Debrief questions</summary><ul>{sim.debrief.map((d) => <li key={d}>{d}</li>)}</ul></details>}
    </div>
  );
}

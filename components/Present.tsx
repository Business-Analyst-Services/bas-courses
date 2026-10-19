"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Md from "@/components/Md";

export type Slide = { kind: string; kicker?: string; title: string; body?: ReactNode; notes?: string; reveal?: ReactNode };

/** Full-screen slide view for facilitators. ←/→ or space to move, F full screen, N notes, R reveal answer, Esc exit. */
export default function Present({ slides, exitHref, nextHref }: { slides: Slide[]; exitHref: string; nextHref?: string }) {
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const go = useCallback((d: number) => { setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))); setShown(false); }, [slides.length]);

  useEffect(() => {
    const h = location.hash.match(/^#(\d+)$/); if (h) setI(Math.min(slides.length - 1, Math.max(0, Number(h[1]) - 1)));
  }, [slides.length]);
  useEffect(() => { try { history.replaceState(null, "", `${location.pathname}${location.search}#${i + 1}`); } catch { /* ignore */ } }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) go(-1);
      else if (e.key === "Home") { setI(0); setShown(false); }
      else if (e.key === "End") { setI(slides.length - 1); setShown(false); }
      else if (e.key.toLowerCase() === "n") setNotes((v) => !v);
      else if (e.key.toLowerCase() === "r") setShown((v) => !v);
      else if (e.key.toLowerCase() === "f") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
      else if (e.key === "Escape" && !document.fullscreenElement) location.href = exitHref;
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, slides.length, exitHref]);

  const s = slides[i];
  return (
    <div className={`deck ${notes ? "withnotes" : ""}`}>
      <div className="deckstage" onClick={(e) => { if ((e.target as HTMLElement).closest("a,button")) return; go(e.clientX > window.innerWidth / 2 ? 1 : -1); }}>
        <section className={`slide slide-${s.kind}`} key={i}>
          {s.kicker && <div className="skick">{s.kicker}</div>}
          <h1>{s.title}</h1>
          {s.body && <div className="sbody">{s.body}</div>}
          {s.reveal && (shown ? <div className="sreveal">{s.reveal}</div> : <button className="srevealbtn" onClick={() => setShown(true)}>Reveal answer (R)</button>)}
          {i === slides.length - 1 && nextHref && <a className="snext" href={nextHref}>Next session →</a>}
        </section>
      </div>
      {notes && (
        <aside className="decknotes">
          <div className="olh">Presenter notes · slide {i + 1}</div>
          {s.notes ? <Md>{s.notes}</Md> : <p className="muted">No notes for this slide.</p>}
          <p className="muted" style={{ marginTop: 14 }}>Notes are only visible on this screen. Press N to hide before sharing your screen.</p>
        </aside>
      )}
      <div className="deckbar">
        <a href={exitHref}>✕ Exit</a>
        <button onClick={() => go(-1)} disabled={i === 0}>←</button>
        <span>{i + 1} / {slides.length}</span>
        <button onClick={() => go(1)} disabled={i === slides.length - 1}>→</button>
        <div className="deckprog"><div style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
        <button onClick={() => setNotes(!notes)}>{notes ? "Hide notes" : "Notes"} (N)</button>
        <button onClick={() => document.documentElement.requestFullscreen?.()}>Full screen (F)</button>
        <button onClick={() => { navigator.clipboard.writeText(location.href.split("#")[0]); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? "✓ Link copied" : "Copy link"}</button>
      </div>
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { setComplete } from "@/lib/actions";

export function CompleteButton({ slug, moduleId, done }: { slug: string; moduleId: string; done: boolean }) {
  const [d, setD] = useState(done);
  const [pending, start] = useTransition();
  return (
    <button className={`btn ${d ? "done" : ""}`} disabled={pending}
      onClick={() => start(async () => { await setComplete(slug, moduleId, !d); setD(!d); })}>
      {d ? "✓ Completed" : "Mark session complete"}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn ghost" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); }}>
      {ok ? "✓ Copied" : "Copy prompt"}
    </button>
  );
}

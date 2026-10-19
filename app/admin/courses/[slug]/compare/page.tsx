import Link from "next/link";
import { notFound } from "next/navigation";
import { getVersionBody, listVersions } from "@/lib/courses";
import type { Course, Module } from "@/lib/types";

const J = (x: unknown) => JSON.stringify(x ?? null);
const FIELDS: [string, (m: Module) => unknown][] = [
  ["Title / subtitle", (m) => [m.title, m.subtitle]], ["Timing", (m) => [m.time, m.minutes, m.dayId]],
  ["Big idea & overview", (m) => [m.participant.bigIdea, m.participant.overview]], ["Objectives", (m) => m.participant.objectives],
  ["Key points", (m) => m.participant.keyPoints], ["Teaching sections", (m) => m.participant.sections], ["Activities", (m) => m.participant.activities],
  ["AI prompt", (m) => m.participant.aiPrompt], ["Quiz", (m) => m.participant.quiz], ["Takeaways", (m) => m.participant.takeaways],
  ["Run sheet", (m) => [m.presenter.openingLine, m.presenter.beats]], ["Facilitation notes", (m) => [m.presenter.facilitationNotes, m.presenter.roleplay]],
  ["Debrief / answer key", (m) => [m.presenter.debrief, m.presenter.answerKey, m.presenter.whatGood, m.presenter.commonFailure]],
];
const HEAD: [string, (c: Course) => unknown][] = [
  ["Title", (c) => c.title], ["Tagline", (c) => c.tagline], ["Format / duration", (c) => [c.format, c.duration, c.delivery]],
  ["Outcomes", (c) => [c.outcomes, c.leaveWith]], ["Agenda", (c) => c.days], ["Worked example", (c) => c.caseStudy], ["Resources", (c) => c.resources],
];

export default async function Compare({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ a?: string; b?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const versions = await listVersions(slug);
  const a = Number(sp.a ?? 0), b = Number(sp.b ?? versions[0]?.version ?? 0);
  const [A, B] = await Promise.all([getVersionBody(slug, a), getVersionBody(slug, b)]);
  if (!A || !B) notFound();
  const ids = [...new Set([...A.modules.map((m) => m.id), ...B.modules.map((m) => m.id)])];
  const rows = ids.map((id) => {
    const ma = A.modules.find((m) => m.id === id), mb = B.modules.find((m) => m.id === id);
    if (!ma) return { id, m: mb!, kind: "add" as const, changes: [] as string[] };
    if (!mb) return { id, m: ma, kind: "del" as const, changes: [] as string[] };
    const changes = FIELDS.filter(([, f]) => J(f(ma)) !== J(f(mb))).map(([l]) => l);
    return { id, m: mb, kind: changes.length ? ("chg" as const) : ("same" as const), changes };
  });
  const head = HEAD.filter(([, f]) => J(f(A)) !== J(f(B))).map(([l]) => l);
  const sel = (name: string, val: number) => (
    <select name={name} defaultValue={val}>{versions.map((v) => <option key={v.version} value={v.version}>v{v.version} · {v.label}</option>)}</select>
  );
  return (
    <>
      <div className="crumbs"><Link href="/admin/courses">Courses</Link><span>›</span><Link href={`/admin/courses/${slug}#versions`}>{B.shortTitle}</Link><span>›</span><span>Compare</span></div>
      <h1 className="pagetitle">Compare versions</h1>
      <form className="filters">{sel("a", a)}<span style={{ alignSelf: "center" }}>→</span>{sel("b", b)}<button className="btn ghost" style={{ padding: "7px 14px" }}>Compare</button></form>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card tile"><div className="tv">{rows.filter((r) => r.kind === "add").length}</div><div className="tl">Sessions added</div></div>
        <div className="card tile"><div className="tv">{rows.filter((r) => r.kind === "del").length}</div><div className="tl">Sessions removed</div></div>
        <div className="card tile"><div className="tv">{rows.filter((r) => r.kind === "chg").length}</div><div className="tl">Sessions changed</div></div>
        <div className="card tile"><div className="tv">{head.length}</div><div className="tl">Course-level changes</div></div>
      </div>
      {head.length > 0 && <div className="panel"><h3>Course-level changes</h3><p>{head.join(" · ")}</p></div>}
      <div className="tablewrap diff">
        <table className="tbl">
          <thead><tr><th>Session</th><th>Change</th><th>What changed</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.m.num}</b> {r.m.title}<div style={{ fontSize: 11.5, color: "var(--grey)" }}>{r.id}</div></td>
                <td className={r.kind}>{({ add: "Added", del: "Removed", chg: "Changed", same: "No change" } as const)[r.kind]}</td>
                <td style={{ fontSize: 13 }}>{r.changes.join(" · ") || "—"}</td>
                <td>{r.kind !== "del" && <a href={`/c/${slug}/preview?v=${b}`} style={{ color: "var(--tealdk)", fontSize: 12.5 }}>Preview v{b}</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

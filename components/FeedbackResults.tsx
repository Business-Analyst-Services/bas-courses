import { fmtAvg, type QStat } from "@/lib/feedback";

/** Anonymised feedback results: averages, score spread and comments. Presenters and admins only. */
export default function FeedbackResults({ stats, respondents, showEmails = false }: { stats: QStat[]; respondents: number; showEmails?: boolean }) {
  if (!respondents) return <div className="panel"><p>No feedback has been submitted yet.</p></div>;
  void showEmails;
  return (
    <div className="fbres">
      {stats.map((s, i) => (
        <div className="panel fbr" key={s.q.id}>
          <div className="fbrh">
            <span className="fbn">{i + 1}</span>
            <div style={{ flex: 1 }}><b>{s.q.q}</b><small>{s.q.area}{s.q.modules?.length ? ` · sessions ${s.q.modules.join(", ")}` : ""} · {s.n} response{s.n === 1 ? "" : "s"}</small></div>
            {s.q.type !== "text" && <div className={`fbavg ${s.avg == null ? "" : (s.q.type === "nps" ? s.avg / 2 : s.avg) < 3.5 ? "low" : (s.q.type === "nps" ? s.avg / 2 : s.avg) >= 4.2 ? "high" : "mid"}`}>{fmtAvg(s)}{s.nps != null && <small>NPS {s.nps > 0 ? "+" : ""}{s.nps}</small>}</div>}
          </div>
          {s.q.type !== "text" ? (
            <div className="fbdist">
              {s.dist.map((c, k) => (s.q.type === "scale" && k === 0 ? null : (
                <div key={k} title={`${k}: ${c}`}><i style={{ height: `${s.n ? (c / Math.max(...s.dist, 1)) * 100 : 0}%` }} /><span>{k}</span></div>
              )))}
            </div>
          ) : s.comments.length ? (
            <ul className="fbcomments">{s.comments.map((c, k) => <li key={k}>{c}</li>)}</ul>
          ) : <p className="muted">No comments yet.</p>}
        </div>
      ))}
    </div>
  );
}

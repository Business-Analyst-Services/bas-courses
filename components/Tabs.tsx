"use client";
import { useEffect, useState, type ReactNode } from "react";

export type TabDef = { id: string; label: string; icon?: string; badge?: string | number; panel: ReactNode };

/** Tabbed session content. All panels render (so in-page anchors and saved fields still work); only one is shown.
 *  The tab follows the URL hash: #tab-<id>, or any element id inside a panel (e.g. links from the outline). */
export default function Tabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const sync = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h) return;
      if (h.startsWith("tab-") && tabs.some((t) => t.id === h.slice(4))) { setActive(h.slice(4)); return; }
      const el = document.getElementById(h);
      const owner = el?.closest<HTMLElement>("[data-tab]")?.dataset.tab;
      if (owner) { setActive(owner); requestAnimationFrame(() => el?.scrollIntoView({ block: "start" })); }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);
  const go = (id: string) => {
    setActive(id);
    history.replaceState(null, "", `#tab-${id}`);
    document.querySelector(".tabbar")?.scrollIntoView({ block: "nearest" });
  };
  const i = tabs.findIndex((t) => t.id === active);
  return (
    <div className="tabs">
      <div className="tabbar" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === active} className={`tab ${t.id === active ? "on" : ""}`} onClick={() => go(t.id)}>
            {t.icon && <span className="ti" aria-hidden>{t.icon}</span>}
            {t.label}
            {t.badge != null && <span className="tb">{t.badge}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t, k) => (
        <div key={t.id} role="tabpanel" data-tab={t.id} hidden={t.id !== active} className="tabpanel">
          {t.panel}
          <div className="tabnext">
            {k > 0 ? <button onClick={() => go(tabs[k - 1].id)}>← {tabs[k - 1].label}</button> : <span />}
            <span className="tabdots">{tabs.map((x, j) => <i key={x.id} className={j === i ? "on" : ""} />)}</span>
            {k < tabs.length - 1 ? <button className="fwd" onClick={() => go(tabs[k + 1].id)}>Next: {tabs[k + 1].label} →</button> : <span />}
          </div>
        </div>
      ))}
    </div>
  );
}

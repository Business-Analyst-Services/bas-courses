import type { SampleKit as Kit } from "@/lib/types";
import { CopyButton } from "@/components/Buttons";

const KIND: Record<string, string> = { blank: "Blank template", worked: "Worked example", pdf: "Printable template" };

/** Consistent three-part kit for every playbook: 1 Prompt · 2 Template files · 3 Sample outputs. */
export default function SampleKit({ kit }: { kit: Kit }) {
  const id = `kit-${kit.code.toLowerCase()}`;
  return (
    <section className="kit" id={id}>
      <div className="kithead">
        <span className="kitcode">{kit.code}</span>
        <div><div className="kicker" style={{ margin: 0 }}>Sample playbook</div><h3>{kit.title}</h3></div>
      </div>

      <div className="kitpart">
        <div className="kitlabel"><span>1</span>The prompt</div>
        <p className="kitnote">Paste into your organisation&apos;s approved AI tool, add your inputs, and run one step at a time. You review, decide and own every output.</p>
        <details>
          <summary>Show the full prompt</summary>
          <div className="pre">{kit.prompt}</div>
        </details>
        <div style={{ marginTop: 10 }}><CopyButton text={kit.prompt} /></div>
      </div>

      <div className="kitpart">
        <div className="kitlabel"><span>2</span>Template files</div>
        <div className="kitfiles">
          {kit.templates.map((t) => (
            <a key={t.href} href={t.href} className={`kitfile ${t.kind}`}>
              {t.preview && <img src={t.preview} alt={`${t.label} preview`} loading="lazy" />}
              <small>{KIND[t.kind]}</small>
              <b>{t.label.replace(/\.\w+$/, "").replace(/_/g, " ")}</b>
              <span>Download {(t.label.match(/\.(\w+)$/)?.[1] ?? "").toUpperCase()} ↓</span>
            </a>
          ))}
        </div>
      </div>

      <div className="kitpart">
        <div className="kitlabel"><span>3</span>Sample outputs</div>
        <div className="kitouts">
          {kit.outputs.map((o) => (
            <figure key={o.step} className="kitout">
              <a href={o.image} target="_blank" rel="noopener"><img src={o.image} alt={`${o.step}: ${o.artefact} sample output`} loading="lazy" /></a>
              <figcaption><b>{o.step}</b> · {o.artefact}<p>{o.caption}</p></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

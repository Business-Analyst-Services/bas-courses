// Checks every course JSON: required fields, unique ids, agenda links, beat minutes and quiz answers.
import fs from "node:fs";
const dir = "content/courses";
let errors = 0;
const err = (f, m) => { errors++; console.error(`✗ ${f}: ${m}`); };
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  let c;
  try { c = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); } catch (e) { err(f, "invalid JSON " + e.message); continue; }
  for (const k of ["slug", "title", "shortTitle", "tagline", "days", "modules", "outcomes", "leaveWith", "resources"]) if (c[k] == null) err(f, `missing ${k}`);
  const ids = new Set();
  for (const m of c.modules ?? []) {
    if (ids.has(m.id)) err(f, `duplicate module ${m.id}`); ids.add(m.id);
    if (!c.days.some((d) => d.id === m.dayId)) err(f, `${m.id} bad dayId`);
    const sum = (m.presenter?.beats ?? []).reduce((a, b) => a + b.minutes, 0);
    if (sum !== m.minutes) err(f, `${m.id} beats ${sum} ≠ ${m.minutes}`);
    for (const [i, q] of (m.participant?.quiz ?? []).entries()) if (!(q.a >= 0 && q.a < q.opts.length)) err(f, `${m.id} quiz ${i} answer out of range`);
    for (const k of ["bigIdea", "overview", "objectives", "keyPoints", "sections", "activities", "quiz", "takeaways"]) if (m.participant?.[k] == null) err(f, `${m.id} participant.${k} missing`);
    for (const k of ["purpose", "openingLine", "beats", "facilitationNotes", "whatGood", "commonFailure", "debrief", "materials"]) if (m.presenter?.[k] == null) err(f, `${m.id} presenter.${k} missing`);
  }
  for (const d of c.days) for (const b of d.blocks) if (b.moduleId && !ids.has(b.moduleId)) err(f, `block links missing module ${b.moduleId}`);
  for (const r of c.resources ?? []) if (r.href?.startsWith("/files/") && !fs.existsSync("private" + decodeURI(r.href))) err(f, `missing file ${r.href}`);
  console.log(`✓ ${f}: ${c.modules.length} modules`);
}
process.exit(errors ? 1 : 0);

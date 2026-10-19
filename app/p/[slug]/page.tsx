import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getViewer, getEnrolments } from "@/lib/access";
import { getAllCourses } from "@/lib/courses";
import { getPrograms } from "@/lib/programs";
import { ensureSchema, sql } from "@/lib/db";
import { fmtDate } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Program home: the courses in order, the viewer's cohort dates and progress across the whole program. */
export default async function ProgramHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getViewer();
  const [enr, programs, courses] = await Promise.all([getEnrolments(v), getPrograms(), getAllCourses()]);
  const p = programs.find((x) => x.slug === slug);
  if (!p || (p.status === "hidden" && !v.isAdmin)) notFound();
  const list = p.course_slugs.map((s) => courses.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => !!c);
  if (!list.some((c) => enr[c.slug])) redirect("/?denied=" + slug);
  await ensureSchema();
  const prog = (await sql`SELECT course_slug, count(*)::int AS n FROM progress WHERE user_id = ${v.userId} AND course_slug = ANY(${p.course_slugs}) GROUP BY course_slug`) as { course_slug: string; n: number }[];
  const dates = (await sql`SELECT e.course_slug, c.name, c.start_date::text, c.end_date::text FROM enrolments e JOIN cohorts c ON c.id = e.cohort_id
                          WHERE e.email = ${v.email} AND e.course_slug = ANY(${p.course_slugs})`) as { course_slug: string; name: string; start_date: string | null; end_date: string | null }[];
  const total = list.reduce((s, c) => s + c.modules.length, 0);
  const done = list.reduce((s, c) => s + Math.min(prog.find((x) => x.course_slug === c.slug)?.n ?? 0, c.modules.length), 0);

  return (
    <>
      <Nav enrolments={enr} isAdmin={v.isAdmin} />
      <main className="content">
        <section className="hero">
          <img className="hero-logo" src="/bas-logo.png" alt="" />
          <div className="hk">PROGRAM · {list.length} COURSES</div>
          <h1>{p.title}{p.description && <span>{p.description}</span>}</h1>
          <div className="stats">
            <div className="stat"><div className="v">{list.length}</div><div className="l">COURSES</div></div>
            <div className="stat"><div className="v">{total}</div><div className="l">SESSIONS</div></div>
            <div className="stat"><div className="v">{total ? Math.round((100 * done) / total) : 0}%</div><div className="l">COMPLETE</div></div>
          </div>
        </section>
        <h2 className="sec">Your path</h2>
        {list.map((c, i) => {
          const n = Math.min(prog.find((x) => x.course_slug === c.slug)?.n ?? 0, c.modules.length);
          const d = dates.find((x) => x.course_slug === c.slug);
          const open = !!enr[c.slug];
          const Card = (
            <div className={`panel ${open ? "" : "locked"}`} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 16, alignItems: "center", opacity: open ? 1 : 0.6 }}>
              <span className="stepchip" style={{ margin: 0, width: 40, height: 40, fontSize: 16 }}>{i + 1}</span>
              <div>
                <div className="kicker" style={{ marginBottom: 2 }}>{c.format}{d?.start_date ? ` · ${fmtDate(d.start_date)}${d.end_date && d.end_date !== d.start_date ? ` – ${fmtDate(d.end_date)}` : ""}` : ""}</div>
                <h3 style={{ margin: 0 }}>{c.title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--grey)", margin: "4px 0 0" }}>{c.tagline}</p>
              </div>
              <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--grey)" }}>
                {open ? <>{n}/{c.modules.length} sessions<span className="minibar" style={{ display: "block", width: 110, marginTop: 6 }}><div style={{ width: `${(100 * n) / c.modules.length}%` }} /></span></> : "Not enrolled"}
              </div>
            </div>
          );
          return open ? <Link key={c.slug} href={`/c/${c.slug}`} style={{ display: "block" }}>{Card}</Link> : <div key={c.slug}>{Card}</div>;
        })}
      </main>
    </>
  );
}

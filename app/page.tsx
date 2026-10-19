import Link from "next/link";
import Nav from "@/components/Nav";
import { getViewer, getEnrolments } from "@/lib/access";
import { getAllCourses } from "@/lib/courses";
import { getPrograms } from "@/lib/programs";
import { getProgress } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const v = await getViewer();
  const enr = await getEnrolments(v);
  const courses = await getAllCourses();
  const mine = courses.filter((c) => enr[c.slug]);
  const myPrograms = (await getPrograms()).filter((p) => (p.status !== "hidden" || v.isAdmin) && p.course_slugs.some((s) => enr[s]));
  const progress = Object.fromEntries(
    await Promise.all(mine.map(async (c) => [c.slug, (await getProgress(v.userId, c.slug)).size] as const)),
  );

  return (
    <>
      <Nav enrolments={enr} isAdmin={v.isAdmin} />
      <main className="content" style={{ maxWidth: 1180 }}>
        <section className="hero">
          <img className="hero-logo" src="/bas-logo.png" alt="" />
          <div className="hk">BUSINESS ANALYST SERVICES · COURSE PORTAL</div>
          <h1>G&apos;day {v.name.split(" ")[0]}<span>Your courses, workbooks and session materials</span></h1>
          <p className="hsub">Pick a course to open its agenda, session content and your saved workbook answers. Switch courses at any time from the menu at the top.</p>
          <div className="stats">
            <div className="stat"><div className="v">{mine.length}</div><div className="l">YOUR COURSES</div></div>
            <div className="stat"><div className="v">{mine.filter((c) => enr[c.slug] === "presenter").length}</div><div className="l">PRESENTING</div></div>
          </div>
        </section>

        {denied && <div className="notice">You&apos;re not enrolled in that course yet. Contact gday@business-analyst.services for access.</div>}

        {myPrograms.length > 0 && (
          <>
            <h2 className="sec">My programs</h2>
            <div className="coursegrid" style={{ marginBottom: 8 }}>
              {myPrograms.map((p) => (
                <Link key={p.slug} href={`/p/${p.slug}`} className="ccard" style={{ borderColor: "var(--teal)" }}>
                  <div className="meta">Program · {p.course_slugs.length} courses</div>
                  <h3>{p.title}</h3>
                  <p>{p.course_slugs.map((s) => courses.find((c) => c.slug === s)?.shortTitle ?? s).join(" → ")}</p>
                  <div className="foot"><span className="tealtag">Open program</span></div>
                </Link>
              ))}
            </div>
          </>
        )}
        <h2 className="sec">My courses</h2>
        {mine.length === 0 ? (
          <div className="panel">
            <h3>No courses yet</h3>
            <p>Your account ({v.email}) isn&apos;t enrolled in a course yet. Use the same email address you registered with, or contact <b>gday@business-analyst.services</b>.</p>
          </div>
        ) : (
          <div className="coursegrid">
            {mine.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="ccard">
                <div className="meta">{c.format}{v.isAdmin && c.settings.status !== "published" && <span className={`statuspill ${c.settings.status}`}>{c.settings.status}</span>}</div>
                <h3>{c.title}</h3>
                <p>{c.tagline}</p>
                <div className="foot">
                  <span className={`rolepill ${enr[c.slug]}`}>{enr[c.slug]}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--grey)" }}>
                    {progress[c.slug]}/{c.modules.length}
                    <span className="minibar"><div style={{ width: `${(100 * progress[c.slug]) / c.modules.length}%` }} /></span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {courses.some((c) => !enr[c.slug] && c.settings.catalogue && c.settings.status === "published") && (
          <>
            <h2 className="sec">Also from BAS</h2>
            <div className="coursegrid">
              {courses.filter((c) => !enr[c.slug] && c.settings.catalogue && c.settings.status === "published").map((c) => (
                <a key={c.slug} className="ccard locked" href="https://business-analyst.services" target="_blank" rel="noreferrer">
                  <div className="meta">{c.format}</div>
                  <h3>{c.title}</h3>
                  <p>{c.tagline}</p>
                  <div className="foot"><span className="tealtag">Enquire</span></div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="footer2">© Business Analyst Services · business-analyst.services · gday@business-analyst.services</footer>
    </>
  );
}

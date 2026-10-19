import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getAllCourses } from "@/lib/courses";
import type { Role } from "@/lib/access";

export default async function Nav({
  enrolments,
  current,
  isAdmin,
}: {
  enrolments: Record<string, Role>;
  current?: string;
  isAdmin?: boolean;
}) {
  const mine = (await getAllCourses()).filter((c) => enrolments[c.slug]);
  const cur = mine.find((c) => c.slug === current);
  return (
    <header className="nav">
      <div className="navin">
        <Link href="/" className="brand">
          <img className="bas-logo" src="/bas-mark.png" alt="BAS" />
          <div>
            <div className="t1">BUSINESS ANALYST SERVICES</div>
            <div className="t2">Course Portal</div>
          </div>
        </Link>
        {mine.length > 0 && (
          <details className="switcher">
            <summary>
              {cur ? cur.shortTitle : "Switch course"} <span style={{ opacity: 0.6, fontSize: 9 }}>▼</span>
            </summary>
            <div className="sw-drop">
              {mine.map((c) => (
                <Link key={c.slug} href={`/c/${c.slug}`} className={c.slug === current ? "on" : ""}>
                  <span>{c.shortTitle}</span>
                  <span className={`rolepill ${enrolments[c.slug]}`}>{enrolments[c.slug]}</span>
                </Link>
              ))}
            </div>
          </details>
        )}
        <div className="navright">
          <Link href="/" className="navlnk">My courses</Link>
          {isAdmin && <Link href="/admin" className="navlnk">Admin</Link>}
          <UserButton />
        </div>
      </div>
    </header>
  );
}

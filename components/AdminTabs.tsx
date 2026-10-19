"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/cohorts", label: "Cohorts" },
  { href: "/admin/enrolments", label: "Enrolments" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminTabs() {
  const path = usePathname();
  return (
    <div className="cbar">
      <div className="cbarin">
        <span className="cbtitle">Admin</span>
        <nav className="cbmenu">
          {TABS.map((t) => {
            const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
            return <Link key={t.href} href={t.href} className={`cbtab ${on ? "on" : ""}`}>{t.label}</Link>;
          })}
        </nav>
      </div>
    </div>
  );
}

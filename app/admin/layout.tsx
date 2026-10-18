import Nav from "@/components/Nav";
import AdminTabs from "@/components/AdminTabs";
import { requireAdmin, getEnrolments } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const v = await requireAdmin();
  const enr = await getEnrolments(v);
  return (
    <>
      <Nav enrolments={enr} isAdmin />
      <AdminTabs />
      <div className="shell" style={{ maxWidth: 1240 }}><main className="main">{children}</main></div>
    </>
  );
}

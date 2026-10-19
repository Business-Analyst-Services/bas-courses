import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CourseSidebar from "@/components/CourseSidebar";
import DeliveryWorkbench from "@/components/DeliveryWorkbench";
import { withSchedule } from "@/lib/schedule";
import { requireCourseRole } from "@/lib/access";
import { getProgress, getResponses } from "@/lib/data";
import { hasWorkbench } from "@/lib/workbench";

export const dynamic = "force-dynamic";

/** Interactive Workbench (Initiative Horizon): follow one backlog item from roadmap to review. */
export default async function Workbench({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ step?: string }> }) {
  const { slug } = await params;
  const { step } = await searchParams;
  if (!hasWorkbench(slug)) notFound();
  const { viewer, role, enrolments, course: baseCourse } = await requireCourseRole(slug);
  const { course, schedule } = await withSchedule(baseCourse);
  const [done, mine] = await Promise.all([getProgress(viewer.userId, slug), getResponses(viewer.userId, slug)]);
  const carried = { feature: mine["hi-s7-act1::hi-s7-act1-p5"] || mine["hi-s6-act1::hi-s6-act1-p1"] || undefined };
  const start = Math.min(5, Math.max(0, (parseInt(step ?? "1", 10) || 1) - 1));
  return (
    <>
      <Nav enrolments={enrolments} current={slug} isAdmin={viewer.isAdmin} />
      <CourseSidebar course={course} schedule={schedule} here={`/c/${slug}/workbench`} currentId="__workbench" done={done} role={role} />
      <div className="shell">
        <main className="main wbmain">
          <div className="kicker">{course.title}</div>
          <h1 className="pagetitle">Workbench: from roadmap to ready</h1>
          <p className="lead">Take one item from your roadmap all the way to a feature ready for delivery — then see how it plays out in a week of delivery and how the review feeds the roadmap. Use it alongside each session today; everything saves to your workbook.</p>
          <DeliveryWorkbench slug={slug} initial={mine["workbench::state"] ?? ""} carried={carried} startStep={start} />
        </main>
      </div>
    </>
  );
}

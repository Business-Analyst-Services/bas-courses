import { notFound } from "next/navigation";
import Present from "@/components/Present";
import { buildSlides } from "@/lib/slides";
import { requireCourseRole } from "@/lib/access";
import { getModule, moduleNeighbours } from "@/lib/courses";

export const dynamic = "force-dynamic";

/** Facilitator slide view of a session, generated from the session content. Presenters and admins only. */
export default async function PresentPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { course } = await requireCourseRole(slug, "presenter");
  const m = getModule(course, id);
  if (!m) notFound();
  const { next } = moduleNeighbours(course, m.id);
  const slides = buildSlides(course, m);
  return <Present slides={slides} exitHref={`/c/${slug}/m/${m.id}?view=presenter`} nextHref={next ? `/c/${slug}/m/${next.id}/present` : undefined} />;
}

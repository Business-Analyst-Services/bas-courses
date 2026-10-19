import { requireAdmin } from "@/lib/access";
import { getAllCourses } from "@/lib/courses";
import { ensureSchema, sql } from "@/lib/db";
import { backlogMarkdown, buildCohortReview, getBacklog } from "@/lib/review";

/** The cohort review and improvement backlog as a Markdown file, ready to drop into a content backlog or doc. */
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  await ensureSchema();
  const id = Number((await params).id);
  const c = ((await sql`SELECT name, course_slug FROM cohorts WHERE id = ${id}`) as { name: string; course_slug: string }[])[0];
  const course = c && (await getAllCourses()).find((x) => x.slug === c.course_slug);
  if (!c || !course) return new Response("Unknown cohort", { status: 404 });
  const md = backlogMarkdown(`${course.title} — ${c.name}: cohort review`, await getBacklog({ cohortId: id }), await buildCohortReview(course, id));
  const name = `${course.slug}-${c.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-review.md"` } });
}

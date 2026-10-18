import { requireAdmin } from "@/lib/access";
import { getCourse } from "@/lib/courses";

export async function GET(_r: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const c = await getCourse((await params).slug, { includeHidden: true });
  if (!c) return new Response("Not found", { status: 404 });
  const { settings: _s, ...body } = c;
  return new Response(JSON.stringify(body, null, 1), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${c.slug}.json"` },
  });
}

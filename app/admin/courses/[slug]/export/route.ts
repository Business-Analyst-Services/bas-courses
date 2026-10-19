import { requireAdmin } from "@/lib/access";
import { getCourse } from "@/lib/courses";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const ver = new URL(req.url).searchParams.get("v");
  const c = await getCourse((await params).slug, { includeHidden: true, version: ver == null ? null : Number(ver) });
  if (!c) return new Response("Not found", { status: 404 });
  const { settings: _s, version: _v, ...body } = c;
  return new Response(JSON.stringify(body, null, 1), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${c.slug}-v${c.version.n}.json"` },
  });
}

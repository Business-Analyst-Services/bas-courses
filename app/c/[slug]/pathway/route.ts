import { NextResponse, type NextRequest } from "next/server";
import { getCourse } from "@/lib/courses";
import { saveResponse } from "@/lib/actions";
import { PATHWAY_ACTIVITY, PATHWAY_PROMPT } from "@/lib/pathway";

/** /c/<slug>/pathway?p=B&next=/c/<slug>/m/x — save the participant's pathway, then go back. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  const p = req.nextUrl.searchParams.get("p") ?? "";
  const next = req.nextUrl.searchParams.get("next") ?? "";
  if (course?.pathways?.some((x) => x.id === p)) await saveResponse(slug, PATHWAY_ACTIVITY, PATHWAY_PROMPT, p);
  return NextResponse.redirect(new URL(next.startsWith(`/c/${slug}`) ? next : `/c/${slug}`, req.url));
}

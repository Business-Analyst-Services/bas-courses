import { NextResponse, type NextRequest } from "next/server";
import { getViewer, getEnrolments, previewCookie } from "@/lib/access";

/** /c/<slug>/preview?v=3 previews a version (presenters/admins); ?v=live returns to normal. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = req.nextUrl.searchParams.get("v") ?? "live";
  const res = NextResponse.redirect(new URL(`/c/${slug}`, req.url));
  const enr = await getEnrolments(await getViewer());
  if (enr[slug] !== "presenter") return res;
  if (v === "live" || isNaN(Number(v))) res.cookies.delete(previewCookie(slug));
  else res.cookies.set(previewCookie(slug), String(Number(v)), { path: "/", maxAge: 60 * 60 * 8, sameSite: "lax" });
  return res;
}

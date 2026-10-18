import { NextResponse, type NextRequest } from "next/server";
import { getCourse } from "@/lib/courses";
import { scheduleCookie } from "@/lib/schedule";

/** /c/<slug>/schedule?s=6wk&next=/c/<slug>/m/x — remember the viewer's schedule choice, then go back. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  const s = req.nextUrl.searchParams.get("s") ?? "";
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const dest = next.startsWith(`/c/${slug}`) ? next : `/c/${slug}`;
  const res = NextResponse.redirect(new URL(dest, req.url));
  if (course?.schedules?.some((x) => x.id === s)) {
    res.cookies.set(scheduleCookie(slug), s, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

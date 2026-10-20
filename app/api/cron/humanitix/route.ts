import { ensureSchema } from "@/lib/db";
import { syncAllHumanitix } from "@/lib/hx-sync";

/** Daily Humanitix sync, called by Vercel Cron with the CRON_SECRET bearer token. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  if (!process.env.HUMANITIX_API_KEY) return Response.json({ skipped: "HUMANITIX_API_KEY not set" });
  await ensureSchema();
  return Response.json(await syncAllHumanitix("cron"));
}

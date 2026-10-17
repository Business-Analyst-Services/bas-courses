import fs from "node:fs/promises";
import path from "node:path";
import { getViewer, getEnrolments } from "@/lib/access";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
};

/** Course files live in private/files/<course-slug>/… and are only served to enrolled users. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const [slug] = parts;
  const v = await getViewer();
  const enr = await getEnrolments(v);
  if (!enr[slug]) return new Response("Not enrolled", { status: 403 });
  const root = path.join(process.cwd(), "private", "files");
  const file = path.join(root, ...parts.map(decodeURIComponent));
  if (!file.startsWith(root + path.sep)) return new Response("Bad path", { status: 400 });
  try {
    const data = await fs.readFile(file);
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(file)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

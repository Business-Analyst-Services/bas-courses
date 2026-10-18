import { requireAdmin } from "@/lib/access";
import { courseTemplate } from "@/lib/validate";

export async function GET() {
  await requireAdmin();
  return new Response(JSON.stringify(courseTemplate(), null, 1), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="course-template.json"' },
  });
}

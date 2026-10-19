import type { LoadedCourse } from "@/lib/types";

/** Tells presenters which version they're looking at when it isn't simply the live one. */
export default function VersionBanner({ course, role }: { course: LoadedCourse; role: string }) {
  const v = course.version;
  if (v.reason === "live" || role !== "presenter") return null;
  return (
    <div className="verband">
      {v.reason === "preview" ? <>👁 Previewing <b>{v.label}</b> (v{v.n}). Participants still see the live version.</>
        : <>📌 This cohort is pinned to <b>{v.label}</b> (v{v.n}), not the live version.</>}
      {v.reason === "preview" && <a href={`/c/${course.slug}/preview?v=live`}>Exit preview</a>}
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import { saveResponse } from "@/lib/actions";

export default function ActivityField({
  slug, activityId, promptId, label, placeholder, initial,
}: {
  slug: string; activityId: string; promptId: string; label: string; placeholder?: string; initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">(initial ? "saved" : "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(v: string) {
    setState("saving");
    saveResponse(slug, activityId, promptId, v).then(
      () => setState("saved"),
      () => setState("error"),
    );
  }
  return (
    <div>
      <label htmlFor={`${activityId}-${promptId}`}>{label}</label>
      <textarea
        id={`${activityId}-${promptId}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setState("saving");
          if (timer.current) clearTimeout(timer.current);
          const v = e.target.value;
          timer.current = setTimeout(() => persist(v), 900);
        }}
        onBlur={() => { if (timer.current) { clearTimeout(timer.current); persist(value); } }}
      />
      <div className="savestate">
        {state === "saving" && "Saving…"}
        {state === "saved" && "✓ Saved to your workbook"}
        {state === "error" && "Couldn't save. Check your connection and try again."}
      </div>
    </div>
  );
}

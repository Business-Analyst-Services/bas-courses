"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Closes open menu dropdowns on outside click, Escape, when another opens, and after navigating. */
export default function DropdownCloser() {
  const path = usePathname();
  useEffect(() => {
    document.querySelectorAll("details.cbdrop[open], details.switcher[open]").forEach((d) => d.removeAttribute("open"));
  }, [path]);
  useEffect(() => {
    const sel = "details.cbdrop, details.switcher";
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      document.querySelectorAll(`${sel}`).forEach((d) => {
        if (d.hasAttribute("open") && !d.contains(t)) d.removeAttribute("open");
        else if (d.contains(t) && t.closest("a")) d.removeAttribute("open");
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") document.querySelectorAll(`${sel}`).forEach((d) => d.removeAttribute("open"));
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);
  return null;
}

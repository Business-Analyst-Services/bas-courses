import fs from "node:fs";
import path from "node:path";
import type { Course, Module } from "./types";

const DIR = path.join(process.cwd(), "content", "courses");
let cache: Course[] | null = null;

export function getCourses(): Course[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const list = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Course)
    .sort((a, b) => a.order - b.order);
  cache = list;
  return list;
}

export function getCourse(slug: string): Course | undefined {
  return getCourses().find((c) => c.slug === slug);
}

export function getModule(course: Course, id: string): Module | undefined {
  return course.modules.find((m) => m.id === id);
}

export function moduleNeighbours(course: Course, id: string) {
  const i = course.modules.findIndex((m) => m.id === id);
  return { prev: course.modules[i - 1], next: course.modules[i + 1] };
}

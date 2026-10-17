// Optional: creates tables up front (the app also creates them on first request).
// Usage: DATABASE_URL=... node scripts/db-setup.mjs
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const src = fs.readFileSync("lib/db.ts", "utf8");
const schema = src.split("SCHEMA = `")[1].split("`;")[0];
const sql = neon(process.env.DATABASE_URL);
for (const s of schema.split(";").map((x) => x.trim()).filter(Boolean)) await sql.query(s);
console.log("Schema ready.");

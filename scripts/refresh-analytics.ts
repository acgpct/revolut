import fs from "node:fs";
import path from "node:path";
import { parse } from "papaparse";
import { computeAnalytics } from "../src/lib/analytics";

const root = path.join(__dirname, "../..");
const csvPath = path.join(root, "fin_crime_data.csv");
const outPath = path.join(__dirname, "../public/analytics.json");

const csv = fs.readFileSync(csvPath, "utf8");
const { data, errors } = parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
const analytics = computeAnalytics(data as Record<string, string>[]);
fs.writeFileSync(outPath, JSON.stringify(analytics, null, 2));
console.log("Wrote", outPath);

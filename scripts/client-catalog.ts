import { readFileSync, writeFileSync } from "node:fs";
import { realEntities } from "../data/real";

const file = "data/real/presentation.json";
const content = JSON.stringify(realEntities) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== content) throw new Error("client_catalog_stale: run npm run catalog:client");
} else writeFileSync(file, content);
console.log(`UI catalog: ${realEntities.length}; raw evidence excluded; ${Buffer.byteLength(content)} bytes`);

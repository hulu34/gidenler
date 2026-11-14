import { readFileSync, writeFileSync } from "node:fs";
import { realEntities } from "../data/real";

const file = "data/real/presentation.json";
// Tekrarlanan sabit alanları göndermeyiz; presentation.ts aynı Entity'yi açar.
const compact = realEntities.map(({ id, isDemo, isReal, tier, experienceTotal, reservation, business, location, ...venue }) => {
  if (id !== `ent.r.${venue.slug}` || isDemo !== false || isReal !== true || tier !== "B" || experienceTotal !== 0 || reservation?.mode !== "contact" || business?.claimed !== false || location?.city !== "İstanbul") throw new Error(`client_catalog_contract_changed:${venue.slug}`);
  const { city: _city, ...local } = location;
  return { ...venue, location: local };
});
const content = JSON.stringify(compact) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== content) throw new Error("client_catalog_stale: run npm run catalog:client");
} else writeFileSync(file, content);
console.log(`UI catalog: ${realEntities.length}; raw evidence excluded; ${Buffer.byteLength(content)} bytes`);

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { activeEntities, realEntities, realVenueRecords, invalidRecord } from "../data/real";
import { realEntities as clientEntities } from "../data/real/presentation";
import { searchV3 } from "../lib/search";
import { inVenueSitemap, venueJsonLd } from "../lib/seo";
import rows from "../data/paket/katalog-972/kayitlar.json";
import proof from "../docs/katalog/katalog-972.json";

const base = "79d3cda69f76558f47d9fa681d30fd296f73b4ea";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const old = (path: string) => JSON.parse(execFileSync("git", ["show", `${base}:${path}`], { encoding: "utf8" }));
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const main = ["data/real/isletme.json", "data/real/presentation.json", "data/real/sor-index.json"].sort();
const changed = [
  ...git("diff", "--name-only", base).split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n"),
].filter(Boolean).sort();

assert.equal(git("merge-base", base, "HEAD"), base);
assert.deepEqual(changed, [
  "data/paket/katalog-972/kayitlar.json",
  ...main,
  "docs/katalog/katalog-972.json",
  "scripts/katalog-972-kabul-test.ts",
].sort());
assert.equal(proof.baseCommit, base);
assert.equal(proof.productionAdded + proof.previewAdded, 0);
assert.equal(rows.length, 25);
assert.equal(proof.sources.length, 25);
assert.deepEqual(proof.groups, { "Adile Sultan Ev Yemekleri": 25 });
assert.equal(proof.holdsPreserved.length, 10);
assert.equal(proof.resolvedSeparations.neighborhoodDeviations.length, 3);

for (const path of main as (keyof typeof proof.priorDigest)[]) {
  const before = old(path);
  const after = read(path);
  assert.equal(digest(before), proof.priorDigest[path], `${path}: 947 taban özeti`);
  assert.deepEqual(after.slice(0, before.length), before, `${path}: 947 ön eki değişmedi`);
  assert.deepEqual(after.slice(-25).map((x: { slug: string }) => x.slug), rows.map((x) => x.slug), `${path}: yeni sıra`);
  if (path.endsWith("/isletme.json")) assert.deepEqual(after.slice(-25), rows);
}

const prior = [...old("data/real/venues.json"), ...old("data/real/isletme.json")];
const independent = proof.sources.map((x) => x.independentSource);
assert.equal(new Set(independent).size, 25, "25 bağımsız URL tekil");
assert(!independent.some((url, i) => new URL(url).hostname === new URL(proof.sources[i].officialSource).hostname));

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const source = proof.sources[i];
  assert.equal(row.ref, `isletme/${row.slug}`);
  assert.equal(row.slug, source.slug);
  assert.equal(invalidRecord(row as (typeof realVenueRecords)[number]), null, row.slug);
  assert.equal(row.categoryId, "cat.restaurant");
  assert.equal(row.kaliteSinifi, "A-konumsuz");
  assert.equal(row.kind, "Lokanta");
  assert.deepEqual(row.cuisine, ["turkish"]);
  assert.equal(row.sourceUrl, source.officialSource);
  assert(source.independentDate >= "2026-08-27", `${row.slug}: 90 gün tazelik`);
  assert(!prior.some((x) => x.slug === row.slug || x.ref === row.ref), `${row.slug}: taban tekilliği`);
  for (const key of ["lat", "lng", "location", "osmRef", "phone", "openingHours", "photos", "menu", "rating", "instagram", "aliases"])
    assert(!Object.hasOwn(row, key), `${row.slug}: ${key} eklenmez`);
  const entity = activeEntities.find((x) => x.slug === row.slug);
  const client = clientEntities.find((x) => x.slug === row.slug);
  assert.equal(entity?.address, row.address);
  assert.equal(client?.address, row.address);
  assert.equal(entity?.location?.geo, undefined, `${row.slug}: Atlas pini yok`);
  assert.equal(client?.location?.geo, undefined, `${row.slug}: istemci Atlas pini yok`);
  assert.equal(searchV3(row.name, { limit: 8 }).exact[0]?.card.entity.slug, row.slug, `${row.slug}: arama`);
  assert(inVenueSitemap(entity!), `${row.slug}: sitemap`);
  assert(venueJsonLd(entity!, null, false), `${row.slug}: SEO`);
}

const existing = realVenueRecords.find((x) => x.slug === "adile-sultan-ev-yemekleri-uskudar")!;
assert.equal(existing.lat, 41.000883);
assert.equal(existing.lng, 29.052099);
assert(!Object.hasOwn(existing, "address"));
const mimar = rows.find((x) => x.slug === "adile-sultan-ev-yemekleri-uskudar-mimar-sinan-uskudar")!;
assert.equal(mimar.neighborhood, "Ahmediye");
assert.equal(mimar.address, "Ahmediye Mahallesi, Doktor Fahri Atabey Caddesi, No:18/B");
assert(!Object.hasOwn(mimar, "lat") && !Object.hasOwn(mimar, "lng"));
assert.equal(rows.filter((x) => x.slug.includes("acibadem")).length, 0, "Acıbadem hold kabul edilmedi");

for (const [slug, neighborhood] of Object.entries({
  "adile-sultan-ev-yemekleri-altunizade-uskudar": "Barbaros",
  "adile-sultan-ev-yemekleri-besiktas-besiktas": "Türkali",
  "adile-sultan-ev-yemekleri-kavacik-beykoz": "Kavacık",
  "adile-sultan-ev-yemekleri-sisli-kurtulus-sisli": "Bozkurt",
})) assert.equal(rows.find((x) => x.slug === slug)?.neighborhood, neighborhood, `${slug}: resmî mahalle`);

for (const term of ["kucukyali", "zumrutevler", "maslak", "serifali", "bati-atasehir", "cevizlibag"])
  assert(!rows.some((x) => x.slug.includes(term)), `${term}: hold kabul edilmedi`);

assert.equal(realVenueRecords.length, 972);
assert.equal(realEntities.length, 972);
assert.equal(activeEntities.length, 937);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.restaurant").length, 812);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.cafe").length, 114);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.bar").length, 11);
assert.equal(realEntities.length - activeEntities.length, 35);
for (const key of ["slug", "ref"] as const) assert.equal(new Set(realVenueRecords.map((x) => x[key])).size, 972);

console.log("PASS: +25 koordinatsız Adile Sultan restoranı; 972 toplam / 937 aktif / 812 aktif restoran; 10 hold grubu korundu; 0 deployed");

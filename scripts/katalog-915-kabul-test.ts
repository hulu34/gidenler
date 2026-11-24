import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { realVenueRecords, realEntities, activeEntities, invalidRecord } from "../data/real";
import next from "../data/paket/katalog-915/kayitlar.json";
import evidence from "../docs/katalog/katalog-915.json";

const base = "a7a13e2bcd432e68e2211c3d7a51158446099455";
const live = "9a2f2f482b65709e862397911438d99b06230e2c";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const old = (sha: string, path: string) => JSON.parse(git("show", `${sha}:${path}`));
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
const slugs = [
  "durumle-marmara-park-esenyurt",
  "perran-ocakbasi-macka-besiktas",
  "bigchefs-mrf-cadde-pendik",
];
const changeable = ["data/real/isletme.json", "data/real/presentation.json", "data/real/sor-index.json"].sort();
assert.equal(git("rev-parse", "HEAD").trim(), base);
assert.deepEqual(git("diff", "--name-only", base).trim().split("\n").sort(), changeable);
assert.deepEqual(next.map(r => r.slug), slugs);
assert.deepEqual(evidence.sources.map(r => r.slug), slugs);
assert.equal(new Set(evidence.sources.map(r => r.activitySource)).size, 3);
assert.equal(evidence.previewAdded + evidence.productionAdded, 0);
for (const path of changeable) {
  const before = old(base, path);
  const baseline = old(live, path);
  const after = JSON.parse(readFileSync(path, "utf8"));
  const prevSlugs = new Set(before.map((r: {slug: string}) => r.slug));
  assert.deepEqual(before.filter((r: {slug: string}) => baseline.some((x: {slug: string}) => x.slug === r.slug)), baseline, path);
  assert.deepEqual(after.slice(0,before.length), before, path);
  assert.deepEqual(after.slice(before.length).map((r: {slug: string}) => r.slug), slugs, path);
  assert(slugs.every(s => !prevSlugs.has(s)), path);
  if (path.endsWith("/isletme.json")) assert.deepEqual(after.slice(-3), next);
}
const oldRaw = [...old(base,"data/real/venues.json"), ...old(base,"data/real/isletme.json")];
const cross = [
  ["durumle", "marmarapark"], ["perran", "bayildim"], ["bigchef", "mrfcadde"]
];
for (let i = 0; i < next.length; i++) {
  const row = next[i]; const src = evidence.sources[i]; const [brand, marker] = cross[i];
  assert.equal(invalidRecord(row as (typeof realVenueRecords)[number]), null, row.slug);
  assert.equal(row.ref, "isletme/" + row.slug);
  assert.equal(row.categoryId, "cat.restaurant");
  assert.equal(row.kaliteSinifi, "A-konumsuz");
  assert.equal(row.sourceUrl, src.officialSource);
  assert.equal(new URL(row.sourceUrl).protocol, "https:");
  assert.equal(new URL(src.activitySource).protocol, "https:");
  assert.notEqual(new URL(src.activitySource).hostname, new URL(row.sourceUrl).hostname);
  assert(src.activityDate <= row.verifiedAt && src.activityDate >= "2026-10-15", row.slug);
  assert(!oldRaw.some(r => r.slug === row.slug || r.ref === row.ref || r.sourceUrl === row.sourceUrl || (fold(r.name ?? "").includes(brand) && fold((r.address ?? "") + r.name).includes(marker))), row.slug);
  for (const k of ["lat", "lng", "location", "osmRef", "phone", "openingHours", "photos", "menu", "rating", "instagram"]) assert(!Object.hasOwn(row,k), `${row.slug}: no ${k}`);
  const venue = activeEntities.find(r => r.slug === row.slug);
  assert.equal(venue?.address, row.address);
  assert.equal(venue?.location?.geo, undefined);
}
assert.equal(realVenueRecords.length, 915);
assert.equal(realEntities.length, 915);
assert.equal(activeEntities.length, 880);
for (const key of ["slug", "ref"] as const) assert.equal(new Set(realVenueRecords.map(r => r[key])).size, 915);
assert.equal(activeEntities.filter(r => r.categoryId === "cat.restaurant").length, 755);
assert(realEntities.some(r => r.slug === "perran-ocakbasi-kadikoy"));
for (const slug of ["il-gattopardo-galataport-beyoglu","burger-yiyelim-sancaktepe-bagcilar"]) assert(!realEntities.some(r => r.slug === slug));
console.log("PASS: +3 append-only; baseline 912 preserved, no duplicate or pin; 915 total / 880 active / 755 active restaurants; 0 deployed");

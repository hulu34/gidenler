import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { activeEntities, realEntities, realVenueRecords, invalidRecord } from "../data/real";
import { realEntities as clientEntities } from "../data/real/presentation";
import { searchV3 } from "../lib/search";
import { inVenueSitemap, venueJsonLd } from "../lib/seo";
import rows from "../data/paket/katalog-947/kayitlar.json";
import proof from "../docs/katalog/katalog-947.json";

const base = "99a2b463f36b6207c5d6176f28a3324c98d4d1d2";
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
  "data/paket/katalog-947/kayitlar.json",
  ...main,
  "docs/katalog/katalog-947.json",
  "scripts/katalog-947-kabul-test.ts",
].sort());
assert.equal(proof.baseCommit, base);
assert.equal(proof.productionAdded + proof.previewAdded, 0);
assert.equal(rows.length, 26);
assert.equal(proof.sources.length, 26);
assert.deepEqual(proof.groups, { "Adile Sultan Ev Yemekleri": 14, "Dürümle": 12 });
assert.equal(proof.priorUnpublishedReviewMatches.length, 5);
assert.equal(proof.rejected.length, 1);
assert.equal(proof.rejected[0].slug, "adile-sultan-ev-yemekleri-tuzla-postane-tuzla");

for (const path of main as (keyof typeof proof.priorDigest)[]) {
  const before = old(path);
  const after = read(path);
  assert.equal(digest(before), proof.priorDigest[path], `${path}: 921 taban özeti`);
  assert.deepEqual(after.slice(0, before.length), before, `${path}: 921 ön eki değişmedi`);
  assert.deepEqual(after.slice(-26).map((x: { slug: string }) => x.slug), rows.map((x) => x.slug), `${path}: yeni sıra`);
  if (path.endsWith("/isletme.json")) assert.deepEqual(after.slice(-26), rows);
}

const prior = [...old("data/real/venues.json"), ...old("data/real/isletme.json")];
const independent = proof.sources.map((x) => x.independentSource);
assert.equal(new Set(independent).size, 26, "26 bağımsız URL tekil");
assert(!independent.some((url, i) => new URL(url).hostname === new URL(proof.sources[i].officialSource).hostname));
assert.deepEqual(proof.priorUnpublishedReviewMatches.map((x) => x.slug).sort(), [
  "durumle-akyaka-park-avm-umraniye",
  "durumle-baglarbasi-cadde-gaziosmanpasa",
  "durumle-capitol-avm-uskudar",
  "durumle-hilltown-avm-maltepe",
  "durumle-metropol-avm-atasehir",
]);

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const source = proof.sources[i];
  assert.equal(row.ref, `isletme/${row.slug}`);
  assert.equal(row.slug, source.slug);
  assert.equal(invalidRecord(row as (typeof realVenueRecords)[number]), null, row.slug);
  assert.equal(row.categoryId, "cat.restaurant");
  assert.equal(row.kaliteSinifi, "A-konumsuz");
  assert.equal(row.sourceUrl, source.officialSource);
  assert(source.independentDate >= "2026-08-26", `${row.slug}: 90 gün tazelik`);
  assert(!prior.some((x) => x.slug === row.slug || x.ref === row.ref), `${row.slug}: taban tekilliği`);
  for (const key of ["lat", "lng", "location", "osmRef", "phone", "openingHours", "photos", "menu", "rating", "instagram", "aliases"])
    assert(!Object.hasOwn(row, key), `${row.slug}: ${key} eklenmez`);
  if (row.name.startsWith("Adile Sultan")) {
    assert.equal(row.kind, "Lokanta");
    assert.deepEqual(row.cuisine, ["turkish"]);
  } else {
    assert(row.name.startsWith("Dürümle"));
    assert.equal(row.kind, "Dönerci");
    assert.deepEqual(row.cuisine, ["doner"]);
  }
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

assert(!realEntities.some((x) => x.slug === "adile-sultan-ev-yemekleri-tuzla-postane-tuzla"));
for (const slug of ["zula-emaar-uskudar", "burger-yiyelim-sancaktepe-bagcilar"])
  assert(!realEntities.some((x) => x.slug === slug), `${slug}: mevcut hold korunur`);
assert.equal(realVenueRecords.length, 947);
assert.equal(realEntities.length, 947);
assert.equal(activeEntities.length, 912);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.restaurant").length, 787);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.cafe").length, 114);
assert.equal(activeEntities.filter((x) => x.categoryId === "cat.bar").length, 11);
assert.equal(realEntities.length - activeEntities.length, 35);
for (const key of ["slug", "ref"] as const) assert.equal(new Set(realVenueRecords.map((x) => x[key])).size, 947);

console.log("PASS: +26 koordinatsız restoran; 14 Adile Sultan + 12 Dürümle; 947 toplam / 912 aktif / 787 aktif restoran; 1 hold; 0 deployed");

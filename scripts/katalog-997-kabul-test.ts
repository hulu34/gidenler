import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { activeEntities, invalidRecord, realVenueRecords } from "../data/real";
import { realEntities as clientEntities } from "../data/real/presentation";
import { searchV3 } from "../lib/search";
import { inVenueSitemap, venueJsonLd } from "../lib/seo";
import rows from "../data/paket/katalog-997/kayitlar.json";
import proof from "../docs/katalog/katalog-997.json";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const base = "3dd2bae8c627934860641226a83e61988d8ad16f";
assert.equal(proof.baseCommit, base);
assert.equal(git("merge-base", base, "HEAD"), base);
const dataPaths = Object.keys(proof.priorDigest) as (keyof typeof proof.priorDigest)[];
const changed = [git("diff", "--name-only", base), git("ls-files", "--others", "--exclude-standard")]
  .flatMap((list) => list.split("\n").filter(Boolean)).sort();
assert.deepEqual(changed, [
  ...dataPaths, "data/paket/katalog-997/kayitlar.json", "docs/katalog/katalog-997.json",
  "scripts/katalog-997-kabul-test.ts", "scripts/sortest.ts",
].sort());
for (const path of dataPaths) {
  const prior = JSON.parse(git("show", `${base}:${path}`));
  const current = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(createHash("sha256").update(JSON.stringify(prior)).digest("hex"), proof.priorDigest[path]);
  assert.deepEqual(current.slice(0, prior.length), prior, path);
  assert.deepEqual(current.slice(prior.length).map((r: { slug: string }) => r.slug), rows.map((r) => r.slug));
  if (path.endsWith("/isletme.json")) assert.deepEqual(current.slice(prior.length), rows);
}

assert.equal(rows.length, 25);
assert.deepEqual(proof.groups, {
  "Maydonoz Döner": 9, "HD İskender": 5, Pidem: 4,
  "Etiler Marmaris": 3, "Bursa Kebap Evi": 3, "İBB (Kent Lokantaları)": 1,
});
assert.equal(proof.holdsPreserved.filter((r) => r.durum !== "MUKERRER").length, 18);
assert.equal(proof.holdsPreserved.filter((r) => r.durum === "MUKERRER").length, 1);
assert.equal(new Set(proof.sources.map((source) => source.independentSource)).size, 25);
for (const [index, row] of rows.entries()) {
  const source = proof.sources[index];
  assert.equal(row.slug, source.slugOneri);
  assert.equal(row.ref, `isletme/${row.slug}`);
  assert.equal(row.sourceUrl, source.officialSource);
  assert.notEqual(new URL(source.officialSource).hostname, new URL(source.independentSource).hostname);
  assert(source.independentDate >= "2026-08-27" && source.independentDate <= source.checkedAt);
  assert.equal(invalidRecord(row as (typeof realVenueRecords)[number]), null, row.slug);
  assert.equal(row.categoryId, "cat.restaurant");
  for (const key of ["lat", "lng", "location", "osmRef", "phone", "openingHours", "rating"])
    assert(!Object.hasOwn(row, key), `${row.slug}: ${key}`);
  const entity = activeEntities.find((venue) => venue.slug === row.slug);
  const client = clientEntities.find((venue) => venue.slug === row.slug);
  assert.equal(entity?.address, row.address);
  assert.equal(client?.address, row.address);
  assert.equal(entity?.location?.geo, undefined);
  assert.equal(client?.location?.geo, undefined);
  assert.equal(searchV3(row.name).exact[0]?.card.entity.slug, row.slug);
  assert(entity && inVenueSitemap(entity) && venueJsonLd(entity, null, false));
}

const originalPendik = realVenueRecords.find((r) => r.slug === "hd-iskender-yenisehir-mahallesi-pendik");
const originalKadikoy = realVenueRecords.find((r) => r.slug === "hd-iskender-caferaga-mahallesi-kadikoy");
assert.match(originalPendik?.address ?? "", /Dedepaşa/);
assert.match(originalKadikoy?.address ?? "", /Mühürdar/);
for (const [branch, neighborhood] of [["neomarin", "Kaynarca"], ["nautilus", "Acıbadem"], ["hd-iskender-trump", "Kuştepe"]])
  assert.equal(rows.find((r) => r.slug.includes(branch))?.neighborhood, neighborhood);
const kale = rows.find((r) => r.slug.includes("kale-center"));
assert(kale?.address.includes("Kale Center"));
assert.equal(kale?.neighborhood, undefined);
const ibb = proof.sources.find((r) => r.slugOneri === "ibb-atasehir-kent-lokantasi-atasehir");
assert.equal(ibb?.independentDate, "2026-09-05");
assert.equal(ibb?.independentDateType, "datePublished");
assert.equal(realVenueRecords.length, 997);
assert.equal(activeEntities.length, 962);
assert.equal(activeEntities.filter((r) => r.categoryId === "cat.restaurant").length, 837);
for (const key of ["slug", "ref"] as const) assert.equal(new Set(realVenueRecords.map((r) => r[key])).size, 997);
console.log("PASS: 25 yeni restoran; 997 toplam / 962 açık / 837 restoran; 18 bekleyen grup.");

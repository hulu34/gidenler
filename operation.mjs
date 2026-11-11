import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const plan = JSON.parse(readFileSync("plan.json", "utf8"));
assert.match(plan.host, /^gidenler-[a-z0-9]+-hulu34[.]vercel[.]app$/);
const access = process.env.GIDENLER_ADMIN_ACCESS;
assert.ok(access, "Existing Vercel automation credential missing");
const entries = JSON.parse(readFileSync("reviewed/data/paket/istanbul-6/venues-dalga6.json", "utf8"));
const slugs = entries.map(({ slug }) => slug);
assert.equal(slugs.length, 117);
assert.equal(new Set(slugs).size, 117);
assert.equal(new Set(entries.map(({ ref }) => ref)).size, 117);
assert.ok(entries.every(({ slug, wave }) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && wave === 6));
const origin = "https://" + plan.host;
async function admin(path, body) {
  const headers = { "x-vercel-protection-bypass": access };
  if (body) Object.assign(headers, { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin", Origin: origin });
  const response = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(70000),
  });
  assert.equal(response.status, 200, path.split("?")[0] + " failed");
  const result = await response.json();
  assert.equal(result.env, "production", "Wrong environment");
  return result;
}
const dbPath = "/api/admin/db/";
const status = await admin(dbPath);
const integrity = status.integrity;
assert.equal(status.db.writeGuard.ok, true);
assert.deepEqual(status.migrations.pending, []);
assert.equal(integrity.expected, plan.catalog);
assert.equal(integrity.present, 457);
assert.equal(integrity.duplicateSlugs, 0);
assert.equal(integrity.duplicateOsmRefs, 0);
assert.equal(integrity.missingOsmIdentifier, 0);
assert.equal(status.rollback.seed.places, 457);
if (plan.phase === "preflight") {
  assert.equal(integrity.ok, true);
} else {
  assert.equal(plan.phase, "seed");
  assert.equal(status.rollback.waves["6"].places, 0);
}
async function checkPlaces(expected) {
  const queue = [...slugs];
  let matched = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      const p = await admin(dbPath + "?rapor=profil&slug=" + slug);
      assert.equal(p.slug, slug);
      assert.equal(Boolean(p.place?.id), expected, slug);
      matched++;
    }
  }));
  return matched;
}
const checked = await checkPlaces(false);
const googlePath = "/api/admin/google-puan/?rapor=gunluk";
const google = await admin(googlePath);
const home = await fetch("https://www.gidenler.com/", { signal: AbortSignal.timeout(20000) });
assert.equal(home.status, 200);
const html = await home.text();
const top = [...html.matchAll(/data-top10-satir="([^"]+)"/g)].map((m) => m[1]);
assert.ok(top.length > 0, "Top 10 is missing");
const topHash = createHash("sha256").update(JSON.stringify(top)).digest("hex");
console.log(JSON.stringify({ phase: plan.phase, existing: integrity.present, checkedAbsent: checked, duplicates: 0, topItems: top.length, topHash, googleShown: google.site?.shown }));
if (plan.phase === "seed") {
  const result = await admin(dbPath, { target: "production", confirm: "EVET", action: "seed", slugs });
  console.log(JSON.stringify({ inserted: result.inserted, updated: result.updated, total: result.total, integrity: result.integrity }));
  assert.equal(result.inserted, 117);
  assert.equal(result.updated, 0);
  assert.equal(result.integrity.ok, true);
  const final = await admin(dbPath);
  assert.equal(final.integrity.ok, true);
  assert.equal(final.integrity.present, 574);
  assert.equal(final.rollback.waves["6"].places, 117);
  const ready = await checkPlaces(true);
  const googleAfter = await admin(googlePath);
  console.log(JSON.stringify({ productionPlaces: final.integrity.present, wave6Places: final.rollback.waves["6"].places, reviewPlaceIds: ready, googleShown: googleAfter.site?.shown }));
}

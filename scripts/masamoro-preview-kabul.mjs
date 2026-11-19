/** Prepared cloud acceptance. Do not run until the exact application SHA/Preview
 * and bounded bypass access are approved. No database key or write action. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const target = new URL(process.env.PREVIEW_URL ?? "https://invalid.example");
assert.match(target.hostname, /^gidenler-[a-z0-9-]+-hulu34\.vercel\.app$/);
assert.equal(target.protocol, "https:");
assert.equal(target.username + target.password + target.search + target.hash, "");
assert.equal(target.pathname, "/");
const expectedSha = process.env.EXPECTED_APPLICATION_SHA ?? "";
const expectedFingerprint = process.env.EXPECTED_PREVIEW_DB_FINGERPRINT ?? "";
const prodFingerprint = process.env.PRODUCTION_DB_FINGERPRINT ?? "";
assert.match(expectedSha, /^[0-9a-f]{40}$/);
assert.match(expectedFingerprint, /^[0-9a-f]{16}$/);
assert.match(prodFingerprint, /^[0-9a-f]{16}$/);
assert.notEqual(expectedFingerprint, prodFingerprint);
const bypass = process.env.VERCEL_BYPASS;
assert.ok(bypass && process.env.BROWSER_PACKAGE_JSON && process.env.EXPECTED_NEON_BRANCH);
const { chromium } = createRequire(process.env.BROWSER_PACKAGE_JSON)("@playwright/test");
const slug = "masamoro-lefkosa-guney-kibris";
const evidencePath = "/api/admin/db/?rapor=masamoro-preview";
const out = "masamoro-preview-evidence";
await mkdir(out, { recursive: true });
const results = [];
let browser, blockedWrites = 0;
const read = async (path) => {
  const url = new URL(path, target);
  assert.equal(url.origin, target.origin);
  const r = await fetch(url, { method: "GET", redirect: "error", headers: { "x-vercel-protection-bypass": bypass } });
  assert.equal(r.status, 200, "protected_read_failed");
  return r.json();
};
try {
  // This report bypasses the general admin status path, whose migrationStatus contains DDL.
  const before = await read(evidencePath);
  assert.equal(before.env, "preview");
  assert.equal(before.sourceSha, expectedSha);
  assert.equal(before.db.fingerprint, expectedFingerprint);
  assert.notEqual(before.db.fingerprint, prodFingerprint);
  if (before.db.branchId !== null) assert.equal(before.db.branchId, process.env.EXPECTED_NEON_BRANCH);
  assert.equal(before.pilot.slug, slug);
  assert.equal(before.pilot.count, 1);
  assert.equal(before.db.counts.places, 892);
  assert.equal(before.db.counts.pilot_rows, 0);
  results.push({ check: "exact_source_and_separate_database", passed: true });
  const health = await read("/api/health/");
  assert.equal(health.db, "ok");
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 950 }, serviceWorkers: "block" });
    await ctx.route("**/*", async (route) => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== target.origin) return route.abort();
      if (!["GET", "HEAD"].includes(req.method())) { blockedWrites++; return route.abort(); }
      // Account/session refresh and analytics are outside this catalog-only acceptance.
      if (url.pathname.startsWith("/api/")) return route.abort();
      return route.continue({ headers: { ...req.headers(), "x-vercel-protection-bypass": bypass } });
    });
    const page = await ctx.newPage();
    let pageExceptions = 0;
    page.on("pageerror", () => { pageExceptions++; });
    const search = await page.goto(new URL("/ara/?q=MasaMoro", target).href, { waitUntil: "networkidle", timeout: 45000 });
    assert.equal(search.status(), 200);
    const link = page.locator(`a[href="/mekan/${slug}/"]`).first();
    await link.waitFor({ state: "visible", timeout: 15000 });
    await link.click();
    await page.waitForURL(new URL(`/mekan/${slug}/`, target).href);
    await page.getByRole("heading", { level: 1, name: "MasaMoro", exact: true }).waitFor();
    const text = await page.locator("body").innerText();
    assert.match(text, /Stasandrou 2/);
    assert.match(text, /Lefkoşa \(güney\)/);
    assert.equal(await page.locator('iframe[src*="openstreetmap"],iframe[src*="google.com/maps"]').count(), 0);
    assert.equal(await page.locator('a[href^="tel:"]').count(), 0);
    assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count() > 0, true);
    const jsonld = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert.equal(jsonld.some(s => /MasaMoro/.test(s)), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
    assert.equal(pageExceptions, 0);
    await page.screenshot({ path: `${out}/masamoro-${width}.png`, fullPage: true });
    results.push({ check: `normal_search_detail_${width}`, passed: true });
    await page.goto(new URL("/mekan/menemen-besiktas/", target).href, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: /Menemen/i }).waitFor();
    results.push({ check: `menemen_preserved_${width}`, passed: true });
    await ctx.close();
  }
  const sitemap = await fetch(new URL("/sitemap.xml", target), { redirect: "error", headers: { "x-vercel-protection-bypass": bypass } });
  assert.equal(sitemap.status, 200);
  assert.equal((await sitemap.text()).includes(slug), false);
  const after = await read(evidencePath);
  assert.equal(after.sourceSha, expectedSha);
  assert.equal(after.db.fingerprint, expectedFingerprint);
  assert.deepEqual(after.db.counts, before.db.counts);
  results.push({ check: "sitemap_and_database_counts_unchanged", passed: true });
  const summary = { accepted: true, applicationSha: expectedSha, separateDatabaseVerified: true, writesSent: 0, blockedWrites, results };
  await writeFile(`${out}/public-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch {
  const summary = { accepted: false, applicationSha: expectedSha, writesSent: 0, results, failure: "bounded_acceptance_failed" };
  await writeFile(`${out}/public-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}

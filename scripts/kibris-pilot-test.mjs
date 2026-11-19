/** Local source acceptance. Real catalog generators feed the real UI loader
 * before initialization. No DB/HTTP/deployment or later search-index injection. */
import { readFile, writeFile, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";

const root = process.cwd();
const fixture = JSON.parse(await readFile("data/arastirma/kibris/masamoro-fixture.json", "utf8"));
const business = JSON.parse(await readFile("data/real/isletme.json", "utf8"));
const raw = fixture.record;
const scratch = await mkdtemp(join(tmpdir(), "gidenler-pr52-normal-yol-"));
const require = createRequire(import.meta.url);
const entry = `
export { invalidRecord, normalizeRealVenueRecord, realVenueRecords, realEntities, activeEntities, mergeRealVenues } from './data/real/index';
export { getEntity } from './data/entities';
export { getTopic } from './lib/api';
export { searchV3 } from './lib/search';
export { venueJsonLd, venueDescription, inVenueSitemap } from './lib/seo';
export { sheetVenues } from './lib/gpuan/venues';
export { catalogVisible, catalogPilotEnabled, validCatalogRegion, istanbulCatalogScope } from './lib/catalogRegion';
export { appendRealVenues } from './lib/db/appendVenues';
export { seedRealVenues } from './lib/db/seed';
export { VenueInfo } from './components/venue/VenueInfo';
export { mapLinks } from './lib/venue';
export { default as React } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`;
const digest = (x) => JSON.stringify(x);
const gates = [];
const gate = (name, pass, actual) => gates.push({ name, status: pass ? "GEÇTİ" : "BAŞARISIZ", ...(actual === undefined ? {} : { actual }) });
const throws = (fn, pattern) => { try { fn(); return false; } catch (e) { return pattern.test(String(e)); } };
const hasHit = (api) => { const s = api.searchV3("MasaMoro"); return [...s.exact, ...s.adjacent].some((h) => h.card.entity.slug === raw.slug); };
try {
  async function load(name, additions, { mode = "production", flag = "false", vercel = "" } = {}, stalePresentation) {
    let generated;
    const common = {
      bundle: true, platform: "node", format: "cjs", write: false, logLevel: "silent", tsconfig: resolve("tsconfig.json"),
      define: { "process.env.NODE_ENV": JSON.stringify(mode), "process.env.NEXT_PUBLIC_SHOW_DEMO": '"false"',
        "process.env.VERCEL_ENV": JSON.stringify(vercel), "process.env.NEXT_PUBLIC_KIBRIS_PILOT": JSON.stringify(flag) },
      plugins: [{ name: "local-source-fixture", setup(b) {
        b.onLoad({ filter: /[/\\]data[/\\]real[/\\]isletme\.json$/ }, () => ({ contents: JSON.stringify([...business, ...additions]), loader: "json" }));
        b.onLoad({ filter: /[/\\]data[/\\]real[/\\]presentation\.json$/ }, async ({ path }) => ({ contents: generated ?? await readFile(path, "utf8"), loader: "json" }));
      } }],
    };
    const cwd = join(scratch, name);
    await mkdir(join(cwd, "data/real"), { recursive: true });
    await symlink(join(root, "content"), join(cwd, "content"), "dir");
    for (const script of ["client-catalog", "sor-index"]) {
      const generator = await build({ ...common, entryPoints: [resolve(`scripts/${script}.ts`)] });
      const file = join(scratch, `${name}-${script}.cjs`);
      await writeFile(file, generator.outputFiles[0].text);
      const run = spawnSync(process.execPath, [file], { cwd, encoding: "utf8", env: { PATH: process.env.PATH, NODE_ENV: mode } });
      if (run.status !== 0) throw new Error(`local ${script} failed: ${run.stderr}`);
    }
    generated = stalePresentation ?? await readFile(join(cwd, "data/real/presentation.json"), "utf8");
    const result = await build({ ...common, stdin: { contents: entry, resolveDir: root, sourcefile: "pr52-local-acceptance.ts", loader: "ts" } });
    const file = join(scratch, `${name}.cjs`);
    await writeFile(file, result.outputFiles[0].text);
    return { api: require(file), generated, sor: await readFile(join(cwd, "data/real/sor-index.json"), "utf8") };
  }
  const baseline = await load("baseline", []);
  const enabled = await load("enabled", [raw], { mode: "development", flag: "true" });
  const twice = await load("repeat", [raw, JSON.parse(JSON.stringify(raw))], { mode: "development", flag: "true" });
  const a = enabled.api, e = a.getEntity(raw.slug);
  const normalized = a.normalizeRealVenueRecord(raw);
  gate("Eski Production tabanı 892/857; fixture yok", baseline.api.realEntities.length === 892 && baseline.api.activeEntities.length === 857 && !baseline.api.getEntity(raw.slug));
  gate("Null koordinat ve telefon normal girişte kabul", a.invalidRecord(raw) === null, a.invalidRecord(raw));
  gate("Normalleştirilmiş kayıtta bilinmeyen alanlar yok; 0,0 üretilmez", !Object.hasOwn(normalized, "lat") && !Object.hasOwn(normalized, "lng") && !Object.hasOwn(normalized, "phone"));
  gate("İstanbul ilçesi uydurmadan bölge kabul", a.invalidRecord(normalized) === null && normalized.district === "");
  gate("Gerçek istemci yükleyicisinde bölge korunur", digest(e?.bolge) === digest(raw.bolge), e?.bolge);
  gate("Gerçek detail/route modelinde Lefkoşa ve güney kimliği", a.getTopic(raw.slug)?.entity === e && e?.location?.city === "Lefkoşa" && e.bolge.kesim === "guney");
  gate("Kaynak kimliği korunur; OSM/pin yok", e?.source?.ref === raw.ref && e.source.provider === "business" && !e.location.geo);
  gate("Kaynak/provenance ham normal katalogda korunur", digest(a.realVenueRecords.find((r) => r.slug === raw.slug)?.provenance) === digest(raw.provenance));
  gate("Özgün araştırma kimliği normal ham export'ta korunur", a.realVenueRecords.find((r) => r.ref === raw.ref)?.researchId === fixture.manifestId);
  gate("Yerel açık pilot aramasında gerçek fixture bulunur", hasHit(a));
  gate("Bölge araması doğru Lefkoşa kaydını bulur", a.searchV3("MasaMoro Lefkoşa").exact.some((h) => h.card.entity === e)
    && a.searchV3("Lefkoşa", { city: "Lefkoşa" }).exact.some((h) => h.card.entity === e));
  globalThis.React = a.React;
  const infoHtml = a.renderToStaticMarkup(a.React.createElement(a.VenueInfo, { entity: e }));
  gate("Gerçek profil bilgi bileşeninde Lefkoşa/güney gösterilir; sahte OSM yok", /Lefkoşa \(güney\).*Kıbrıs/.test(infoHtml) && !/openstreetmap|İstanbul/.test(infoHtml) && a.mapLinks(e) === null);
  gate("Aynı kaynak iki kez verildiğinde tek kimlik", twice.api.realVenueRecords.filter((r) => r.ref === raw.ref).length === 1 && twice.api.realEntities.filter((r) => r.slug === raw.slug).length === 1);
  gate("Farklı JSON anahtar sırası aynı kimliği çoğaltmaz", a.mergeRealVenues([], [raw, Object.fromEntries(Object.entries(raw).reverse())]).records.length === 1);
  gate("Aynı kimlikte farklı içerik sessizce ezilmez", throws(() => a.mergeRealVenues([], [raw, { ...raw, address: "başka adres" }]), /regional_identity_conflict/));
  gate("Aynı ref farklı slug ile yeniden kullanılamaz", throws(() => a.mergeRealVenues([], [raw, { ...raw, slug: "baska-subenin-slugi" }]), /invalid_regional_record|regional_identity_conflict/));
  gate("İstanbul OSM kaydıyla slug çakışırsa eski kayıt yeniden adlandırılmaz", throws(() => a.mergeRealVenues([{ ...business[0], ref: "node/999999999", slug: raw.slug }], [raw]), /regional_identity_conflict/));
  for (const [name, patch] of [
    ["eksik kesim", { bolge: { alan: "kibris", bolge: "lefkosa" } }],
    ["bilinmeyen bölge", { bolge: { alan: "kibris", bolge: "istanbul", kesim: "guney" } }],
    ["çelişkili bölge/kesim", { bolge: { alan: "kibris", bolge: "girne", kesim: "guney" } }],
    ["bölge içinde izinsiz ek veri", { bolge: { ...raw.bolge, privateData: "must-not-reach-client" } }],
    ["sahte İstanbul ilçesi", { district: "Kadıköy" }], ["sıfır geometri", { lat: 0, lng: 0 }],
    ["tek eksen geometri", { lat: null, lng: 33.3 }], ["sahte OSM", { osmRef: "node/123" }],
  ]) gate(`Hatalı veri reddedilir: ${name}`, a.invalidRecord({ ...raw, ...patch }) !== null);
  const snapshot = baseline.api.realEntities;
  gate("892 İstanbul entity ve içerikleri aynen korunur", digest(a.realEntities.filter((x) => x.slug !== raw.slug)) === digest(snapshot));
  gate("İstanbul arama davranışı aynı", ["Menemen", "kebap", "Deniz ürünleri", "My Home Döner"].every((q) => digest(a.searchV3(q)) === digest(baseline.api.searchV3(q))));
  gate("Google/Excel listesi aynı; Kıbrıs kapsam dışı", digest(a.sheetVenues()) === digest(baseline.api.sheetVenues()) && !a.istanbulCatalogScope(raw));
  gate("Koordinat sonradan dolsa bile bölge Google filtresini aşmaz", !a.istanbulCatalogScope({ ...raw, lat: 35.1, lng: 33.3 }));
  gate("Sor gerçek üretici çıktısı byte düzeyinde aynı", enabled.sor === baseline.sor && twice.sor === baseline.sor);
  gate("Yerel pilot açıklamasında Lefkoşa; yanlış İstanbul damgası yok", /Lefkoşa/.test(a.venueDescription(e, null, false)) && !/İstanbul/.test(a.venueDescription(e, null, false)));
  gate("Pilot için kamu JSON-LD/ülke iddiası ve sitemap yok", a.venueJsonLd(e, null, false) === null && !a.inVenueSitemap(e));
  let executorCalls = 0;
  const noDb = new Proxy({}, { get() { executorCalls++; throw new Error("DB_MUST_NOT_BE_TOUCHED"); } });
  for (const [name, invoke] of [["append", () => a.appendRealVenues(noDb, [normalized], 892)], ["seed", () => a.seedRealVenues(noDb, [normalized])]]) {
    let rejected = false;
    try { await invoke(); } catch (error) { rejected = /regional_database_import_not_enabled/.test(String(error)); }
    gate(`İstanbul DB yazma yolu Kıbrıs'ı DB'ye dokunmadan reddeder: ${name}`, rejected && executorCalls === 0);
  }
  for (const [name, options, stale] of [
    ["yerel bayrak kapalı", { mode: "development", flag: "false" }],
    ["yerel bayrak tanımsız", { mode: "development", flag: "" }],
    ["Production bayrak açık", { mode: "production", flag: "true" }],
    ["VERCEL_ENV production", { mode: "development", flag: "true", vercel: "production" }],
    ["Preview production build", { mode: "production", flag: "true", vercel: "preview" }],
    ["Eski açık pilot artifact'ı Production'da", { mode: "production", flag: "true" }, enabled.generated],
  ]) {
    const v = await load(name.replaceAll(/[^a-zA-Z0-9]/g, "-"), [raw], options, stale);
    gate(`${name}: sunucu/UI arama ve detail kapalı`, !v.api.getEntity(raw.slug) && v.api.getTopic(raw.slug) === null && !hasHit(v.api) && v.api.realEntities.length === 892);
    gate(`${name}: eski entity/857 aktif/Sor korunur`, digest(v.api.realEntities) === digest(snapshot) && v.api.activeEntities.length === 857 && v.sor === baseline.sor);
    gate(`${name}: doğrudan SEO yardımcısı da veri üretmez`, v.api.venueDescription(e, null, false) === "" && v.api.venueJsonLd(e, null, false) === null && !v.api.inVenueSitemap(e));
  }
  const report = {
    scope: "Isolated local source fixture through actual catalog generators, entity/search/route model and guards; no DB connection or deployment",
    base: "9a2f2f482b65709e862397911438d99b06230e2c", fixtureId: fixture.manifestId, region: raw.bolge, localContractRef: raw.ref,
    passed: gates.filter((g) => g.status === "GEÇTİ").length, failed: gates.filter((g) => g.status === "BAŞARISIZ").length,
    localAcceptance: gates.every((g) => g.status === "GEÇTİ"), databaseCalls: executorCalls, gates,
    limits: ["Source identity merge is not a DB replay test", "No browser, real HTTP route, Preview, real AI, RY/YY importer or DB acceptance",
      "Pilot only in explicit local development/test; production builds including Preview remain disabled", "Research/active acceptance and publication authorization remain separate"],
  };
  const index = process.argv.indexOf("--report");
  if (index >= 0) await writeFile(resolve(process.argv[index + 1]), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.localAcceptance ? 0 : 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}

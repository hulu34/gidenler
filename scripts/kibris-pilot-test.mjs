/** Local source acceptance. Real catalog generators feed the real UI loader
 * before initialization. No DB/HTTP/deployment or later search-index injection. */
import { readFile, writeFile, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createHash } from "node:crypto";

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
export { catalogPreviewEnabled, catalogPreviewRequestAllowed } from './lib/catalogRegion';
export { readKibrisPreviewEvidence } from './lib/kibrisPreviewEvidence';
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
  async function load(name, additions, { mode = "production", flag = "false", vercel = "", contract = "", branch = "", host = "", browser,
    prodFingerprint = createHash("sha256").update("prod-test.example").digest("hex").slice(0, 16) } = {}, stalePresentation) {
    delete globalThis.window;
    let generated;
    const common = {
      bundle: true, platform: "node", format: "cjs", write: false, logLevel: "silent", tsconfig: resolve("tsconfig.json"),
      define: { "process.env.NODE_ENV": JSON.stringify(mode), "process.env.NEXT_PUBLIC_SHOW_DEMO": '"false"',
        "process.env.VERCEL_ENV": JSON.stringify(vercel), "process.env.NEXT_PUBLIC_KIBRIS_PILOT": JSON.stringify(flag),
        "process.env.NEXT_PUBLIC_KIBRIS_PREVIEW_CONTRACT": JSON.stringify(contract),
        "process.env.PRODUCTION_DB_FINGERPRINT": JSON.stringify(prodFingerprint),
        "process.env.VERCEL_GIT_COMMIT_REF": JSON.stringify(branch), "process.env.VERCEL_URL": JSON.stringify(host) },
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
    if (browser) globalThis.window = browser;
    return { api: require(file), generated, sor: await readFile(join(cwd, "data/real/sor-index.json"), "utf8") };
  }
  const baseline = await load("baseline", []);
  const enabled = await load("enabled", [raw], { mode: "development", flag: "true" });
  const twice = await load("repeat", [raw, JSON.parse(JSON.stringify(raw))], { mode: "development", flag: "true" });
  const a = enabled.api, e = a.getEntity(raw.slug);
  const normalized = a.normalizeRealVenueRecord(raw);
  gate("Gerçek pilot kaynak dosyası normal yola tek kayıt verir", a.realVenueRecords.filter(r => r.bolge).length === 1 && a.activeEntities.length === 857);
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
  const previewOptions = { mode: "production", flag: "true", vercel: "preview", contract: "masamoro-v1", branch: "inceleme/masamoro-preview-kabul-v1", host: "gidenler-masamoro-qa.vercel.app" };
  const p = await load("bounded-preview-source", [], previewOptions);
  const readQueries = [];
  const evidence = await p.api.readKibrisPreviewEvidence({ query: async (query) => {
    readQueries.push(query); return [{ branch_id: "preview-test-branch", places: 892, users: 20, accounts: 20, experiences: 12, ratings: 335, pilot_rows: 0 }];
  } }, "postgres://test:test@preview-test.example/db");
  gate("Preview kanıt yolu tek SELECT kullanır, DDL/yazma veya kişisel satır döndürmez", readQueries.length === 1 && /^\s*SELECT\b/.test(readQueries[0])
    && !/\b(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP)\b/i.test(readQueries[0]) && evidence.counts.pilot_rows === 0 && /^[0-9a-f]{16}$/.test(evidence.fingerprint)
    && !/postgres:|test:test|email|password/.test(JSON.stringify(evidence)));
  for (const host of ["prod-test.example", "prod-test-pooler.example"]) {
    let blocked = false;
    try { await p.api.readKibrisPreviewEvidence({ query: async () => { readQueries.push("BAD"); return []; } }, `postgres://test:test@${host}/db`); }
    catch (error) { blocked = /preview_database_not_isolated/.test(String(error)); }
    gate(`Production bağlantısında kanıt sorgusu bile çalışmaz: ${host}`, blocked && readQueries.length === 1);
  }
  const unknownProd = await load("missing-production-fingerprint", [], { ...previewOptions, prodFingerprint: "" });
  let unknownBlocked = false;
  try { await unknownProd.api.readKibrisPreviewEvidence({ query: async () => { readQueries.push("BAD"); return []; } }, "postgres://test:test@preview-test.example/db"); }
  catch (error) { unknownBlocked = /preview_database_not_isolated/.test(String(error)); }
  gate("Production parmak izi bilinmiyorsa kanıt sorgusu kapalı", unknownBlocked && readQueries.length === 1);
  gate("Production build içindeki yetkili Preview tek gerçek kaynağı otomatik yükler", p.api.catalogPreviewEnabled() && p.api.realVenueRecords.length === 893 && !!p.api.getTopic(raw.slug));
  gate("Preview pilotu İstanbul aktif/KPI ve Sor kapsamını değiştirmez", p.api.activeEntities.length === 857 && p.sor === baseline.sor);
  gate("Preview kaynak entity'si kanonik kimliği ve kaynak tarihini korur", p.api.getEntity(raw.slug)?.source?.ref === raw.ref && p.api.realVenueRecords.find(r => r.ref === raw.ref)?.researchId === fixture.manifestId);
  gate("Yalnız değişmez Preview host'una istek izni", p.api.catalogPreviewRequestAllowed(previewOptions.host)
    && !p.api.catalogPreviewRequestAllowed("www.gidenler.com") && !p.api.catalogPreviewRequestAllowed("gidenler-git-branch.vercel.app") && !p.api.catalogPreviewRequestAllowed(null));
  for (const [name, options] of [
    ["yanlış Preview sözleşmesi", { ...previewOptions, contract: "other" }],
    ["yanlış geliştirme dalı", { ...previewOptions, branch: "feature/investor-v1" }],
    ["production platform ortamı", { ...previewOptions, vercel: "production" }],
    ["bilinmeyen platform ortamı", { ...previewOptions, vercel: "" }],
    ["geçersiz değişmez host", { ...previewOptions, host: "www.gidenler.com" }],
  ]) {
    const v = await load(name.replaceAll(/[^a-zA-Z0-9]/g, "-"), [], options, p.generated);
    gate(`${name}: eski Preview artifact'ı bile arama/detail açamaz`, !v.api.getTopic(raw.slug) && !hasHit(v.api) && v.api.realEntities.length === 892);
  }
  for (const [name, context, hostname, visible] of [
    ["sunucu onaylı Preview", { enabled: true, host: previewOptions.host }, previewOptions.host, true],
    ["sunucu bağlamı yok", undefined, previewOptions.host, false],
    ["sunucu bağlamı ret", { enabled: false, host: previewOptions.host }, previewOptions.host, false],
    ["Preview artifact'ı Production alan adında", { enabled: true, host: previewOptions.host }, "www.gidenler.com", false],
  ]) {
    const browser = { location: { hostname }, __GIDENLER_KIBRIS_PREVIEW__: context };
    const v = await load(name.replaceAll(/[^a-zA-Z0-9]/g, "-"), [], { ...previewOptions, browser }, p.generated);
    gate(`İstemci başlangıcı ${name}: kaynak aramadan önce doğru filtrelenir`, hasHit(v.api) === visible && !!v.api.getTopic(raw.slug) === visible);
    delete globalThis.window;
  }
  const report = {
    scope: "Isolated local source fixture through actual catalog generators, entity/search/route model and guards; no DB connection or deployment",
    base: "9a2f2f482b65709e862397911438d99b06230e2c", fixtureId: fixture.manifestId, region: raw.bolge, localContractRef: raw.ref,
    passed: gates.filter((g) => g.status === "GEÇTİ").length, failed: gates.filter((g) => g.status === "BAŞARISIZ").length,
    localAcceptance: gates.every((g) => g.status === "GEÇTİ"), databaseCalls: executorCalls, gates,
    limits: ["Source identity merge is not a DB replay test", "No browser, real HTTP route, Preview, real AI, RY/YY importer or DB acceptance",
      "Preview authorization must pin the exact SHA, deployment and separate DB; local simulated Preview is not distributed acceptance", "Research/active acceptance and publication authorization remain separate"],
  };
  const index = process.argv.indexOf("--report");
  if (index >= 0) await writeFile(resolve(process.argv[index + 1]), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.localAcceptance ? 0 : 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}

/** Local diagnostic only. Injects the source fixture before the unchanged catalog
 * module loads, never into a search index afterwards. No DB, HTTP, API or import
 * command is used. Failed product gates remain failures in the JSON report. */
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";

const root = process.cwd();
const fixture = JSON.parse(await readFile("data/arastirma/kibris/masamoro-fixture.json", "utf8"));
const business = JSON.parse(await readFile("data/real/isletme.json", "utf8"));
const raw = fixture.record;
// JSON null is an unknown coordinate; do not manufacture a pin or an Istanbul district.
const normalized = Object.fromEntries(Object.entries(raw).filter(([k, v]) => !(v === null && ["lat", "lng", "phone"].includes(k))));
const scratch = await mkdtemp(join(tmpdir(), "gidenler-pr52-normal-yol-"));
const require = createRequire(import.meta.url);
const entry = `
import { invalidRecord, realVenueRecords, realEntities, activeEntities, mergeRealVenues } from './data/real/index';
import { getEntity } from './data/entities';
import { searchV3 } from './lib/search';
import { venueJsonLd } from './lib/seo';
import { sheetVenues } from './lib/gpuan/venues';
export { invalidRecord, realVenueRecords, realEntities, activeEntities, mergeRealVenues, getEntity, searchV3, venueJsonLd, sheetVenues };
`;
const digest = (x) => JSON.stringify(x);
try {
  async function load(name, additions) {
    let generated;
    const common = {
      bundle: true, platform: "node", format: "cjs", write: false, logLevel: "silent",
      tsconfig: resolve("tsconfig.json"),
      define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SHOW_DEMO": '"false"', "process.env.NEXT_PUBLIC_KIBRIS_PILOT": '"false"' },
      plugins: [{ name: "local-source-fixture", setup(b) {
        b.onLoad({ filter: /[/\\]data[/\\]real[/\\]isletme\.json$/ }, () => ({ contents: JSON.stringify([...business, ...additions]), loader: "json" }));
        b.onLoad({ filter: /[/\\]data[/\\]real[/\\]presentation\.json$/ }, async ({ path }) => ({ contents: generated ?? await readFile(path, "utf8"), loader: "json" }));
      } }],
    };
    // Run the unchanged real catalog generator in an empty temporary directory.
    // Its output is then the real client loader's input, never a search-index patch.
    const generator = await build({ ...common, entryPoints: [resolve("scripts/client-catalog.ts")] });
    const generatorFile = join(scratch, `${name}-generator.cjs`);
    const generatorCwd = join(scratch, name);
    await mkdir(join(generatorCwd, "data/real"), { recursive: true });
    await writeFile(generatorFile, generator.outputFiles[0].text);
    const run = spawnSync(process.execPath, [generatorFile], { cwd: generatorCwd, encoding: "utf8", env: { PATH: process.env.PATH, NODE_ENV: "production" } });
    if (run.status !== 0) throw new Error(`local client generator failed: ${run.stderr}`);
    generated = await readFile(join(generatorCwd, "data/real/presentation.json"), "utf8");
    const result = await build({ ...common, stdin: { contents: entry, resolveDir: root, sourcefile: "pr52-local-diagnostic.ts", loader: "ts" } });
    const file = join(scratch, `${name}.cjs`);
    await writeFile(file, result.outputFiles[0].text);
    return require(file);
  }
  const baseline = await load("baseline", []);
  const injected = await load("source-fixture", [normalized]);
  const twice = await load("source-fixture-twice", [normalized, normalized]);
  const entity = injected.getEntity(raw.slug);
  const hits = injected.searchV3("MasaMoro");
  const visible = [...hits.exact, ...hits.adjacent].some((x) => x.card.entity.slug === raw.slug);
  const jsonld = entity ? injected.venueJsonLd(entity, null, false) : null;
  const gates = [];
  const gate = (name, pass, actual) => gates.push({ name, status: pass ? "GEÇTİ" : "BAŞARISIZ", actual });
  gate("Production tabanı 892, fixture mevcut katalogda yok", baseline.realEntities.length === 892 && !baseline.getEntity(raw.slug), baseline.realEntities.length);
  gate("MasaMoro bilinmeyen JSON koordinatları normal validator ile kabul", baseline.invalidRecord(raw) === null, baseline.invalidRecord(raw));
  gate("Null kaldırıldıktan sonra bölgeyi İstanbul ilçesi uydurmadan kabul", baseline.invalidRecord(normalized) === null, baseline.invalidRecord(normalized));
  gate("Normal entity dönüşümünde bölge korunur", digest(entity?.bolge) === digest(raw.bolge), entity?.bolge ?? null);
  gate("Normal detail kimliği Lefkoşa; İstanbul damgası yok", !!entity && entity.location?.city !== "İstanbul" && /lefkoşa/i.test(entity.location?.city ?? ""), entity?.location);
  gate("Koordinatsız detail modelinde uydurma pin/0,0 yok", !!entity && !entity.location?.geo, entity?.location?.geo ?? null);
  gate("İşletme kimliği ve ana kaynak korunur, sahte OSM yok", entity?.source?.provider === "business" && entity?.source?.ref === raw.ref, entity?.source);
  gate("Kaynak/provenance listesi ham normal katalogda korunur", digest(injected.realVenueRecords.find((r) => r.slug === raw.slug)?.provenance) === digest(raw.provenance), "UI kişisel/ayrıntılı kanıt taşımaz; ham kayıt kaynakları karşılaştırılır");
  gate("Pilot kapalı ve Production modunda fixture aramada gizli", !visible, { visible });
  gate("Pilot kapalı ve Production modunda fixture detail kaydı gizli", !entity, { visible: !!entity });
  gate("Normal kaynak birleştiricisinde aynı kimlik iki kez bulunmaz", twice.realEntities.filter((r) => r.slug === raw.slug).length === 1, twice.realEntities.filter((r) => r.slug === raw.slug).length);
  gate("İstanbul 892 entity içeriği aynı", digest(injected.realEntities.filter((r) => r.slug !== raw.slug)) === digest(baseline.realEntities), injected.realEntities.length - 1);
  gate("İstanbul arama davranışı aynı", ["Menemen", "kebap", "Deniz ürünleri", "My Home Döner"].every((q) => digest(injected.searchV3(q)) === digest(baseline.searchV3(q))), "4 sorgu tam sonuç karşılaştırması");
  gate("Kıbrıs Google/Excel listesine sızmaz", !injected.sheetVenues().some((r) => r.slug === raw.slug) && digest(injected.sheetVenues()) === digest(baseline.sheetVenues()), "Mevcut business/koordinat filtresi korunur; yeni bölge filtresi henüz yok");
  gate("Kıbrıs SEO İstanbul/TR üretmez", !!jsonld && jsonld.address.addressRegion !== "İstanbul" && jsonld.address.addressCountry !== "TR", jsonld?.address);
  const report = {
    scope: "Local source injection before unchanged normal catalog/search/detail modules; no database or deployment",
    base: "9a2f2f482b65709e862397911438d99b06230e2c", researchHead: "29b9c9b74a32e5c320e9e1a507c2e2291c1563e4",
    fixtureId: fixture.manifestId, region: raw.bolge, transientSlug: raw.slug,
    passed: gates.filter((g) => g.status === "GEÇTİ").length,
    failed: gates.filter((g) => g.status === "BAŞARISIZ").length,
    integrationAccepted: gates.every((g) => g.status === "GEÇTİ"), gates,
    limits: ["No browser, RY/YY importer, database or Preview acceptance; repeated DB import not verified", "Fixture slug/ref is provisional; no permanent identity approval", "No runtime adapter implemented; failures describe current integration prerequisites"],
  };
  const outIndex = process.argv.indexOf("--report");
  if (outIndex >= 0) await writeFile(resolve(process.argv[outIndex + 1]), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.integrationAccepted ? 0 : 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}

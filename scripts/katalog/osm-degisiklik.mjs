/* OSM DEĞİŞİKLİK KÜMESİ KANITI — adayın son sürümünü oluşturan changeset'in düzenleyici uygulaması ve kaynak etiketi.
   Yerinde anket uygulamaları (StreetComplete, Every Door) ile yapılmış 2025+ düzenleme, mekânın o tarihte yerinde
   görüldüğünün OSM içi kanıtıdır. OSM API changeset uç noktası (100'erli toplu, saniyede ≤1 istek). Yalnız etiketler saklanır.
   Kullanım: node scripts/katalog/osm-degisiklik.mjs <ham-osm.json> <havuz.json> <cikti.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [rawP, hp, out] = process.argv.slice(2);
const RAW = new Map(JSON.parse(readFileSync(rawP, "utf8")).elements.map((e) => [`${e.type}/${e.id}`, e]));
const H = JSON.parse(readFileSync(hp, "utf8")).adaylar;
const C = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const ids = [...new Set(H.filter((a) => !a.esles && (a.ret.length === 0 || a.ret.every((r) => r === "zincir_marka_etiketi")) && RAW.get(a.ref)?.timestamp >= "2024")
  .map((a) => RAW.get(a.ref).changeset).filter((c) => c && !C[c]))];
console.log("changeset:", ids.length);
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  try {
    const r = await fetch(`https://api.openstreetmap.org/api/0.6/changesets.json?changesets=${batch.join(",")}`, { headers: { "user-agent": "gidenler-katalog/1.0 (+https://www.gidenler.com/)" }, signal: AbortSignal.timeout(30000) });
    const j = await r.json();
    for (const c of j.changesets ?? []) C[c.id] = { tarih: c.created_at?.slice(0, 10), uygulama: c.tags?.created_by ?? null, kaynak: c.tags?.source ?? null };
  } catch (e) { console.log("hata", String(e).slice(0, 60)); }
  await new Promise((z) => setTimeout(z, 1200));
}
writeFileSync(out, JSON.stringify(C));
const apps = {}; for (const c of Object.values(C)) { const k = (c.uygulama ?? "-").split(/[ /]/)[0]; apps[k] = (apps[k] ?? 0) + 1; }
console.log(Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 15));

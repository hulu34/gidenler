/* FAALİYET KANITI · KARAR — faaliyet-osm.mjs ve faaliyet-site.mjs ölçümlerinden, paket kurallarındaki güçlü kanıt türleriyle
   (paket-restoran.mjs E1–E4) kayıt başına karar. Standart gevşetilmez:
     E1 resmî site: ad + (sokak | telefon). Alan adını katalogda birden çok kayıt paylaşıyorsa (zincir/kurum) yalnız E4 sayılır.
     E2 OSM yerinde kontrol tarihi ≥ 2025-01 (check_date, survey:date, survey_date, check_date:opening_hours; source:date sayılmaz).
     E3 OSM son sürümü yerinde anket uygulamasıyla ≥ 2025-01 (StreetComplete, Every Door).
     E4 paylaşılan resmî sitede ad + sokak ve ilçe/mahalle aynı bölümde (±300 karakter).
   Uygulanmayanlar: kapanış kaydı olanlar (closed_confirmed/closed_suspected; güncel kanıt varsa çelişki listesine), OSM öğesi
   silinmiş ya da adı başka bir işletmeye dönmüş kayıtlar, sitesi park/satış alanına yönlenenler. Zayıf kanıt (sitede ad + ilçe,
   mobil düzenleyici) kaydedilir ama faaliyet kanıtı sayılmaz.
   Kullanım: npx tsx scripts/katalog/faaliyet-karar.mjs <osm.json> <site.json> <tarih> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
import { fold } from "../../lib/katalog/aday.ts";
const [osmP, siteP, tarih, out] = process.argv.slice(2);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const V = J("data/real/venues.json"), KAP = J("data/real/kapanis.json"), O = J(osmP), S = J(siteP);
const hedef = V.filter((v) => (v.wave ?? 0) <= 1 && !v.verifiedAt);
const ONSITE = /^(StreetComplete|Every ?Door)/i, MOBILE = /^(Organic ?Maps|CoMaps|OsmAnd|Go ?Map|Vespucci|MAPS\.ME)/i;
const PARK = /(^|\.)(hugedomains\.com|expireddomains\.com|sedo\.com|dan\.com|afternic\.com|godaddy\.com|parkingcrew\.net|bodis\.com|pxdx\.co|higgsfield\.app)$/i;
const AGREGATOR = /(^|\.)(restaurantguru\.com|dijital\.menu|menu\.app|qr-menu\.[a-z.]+|happy\.com\.tr|fiyatlar\.org)$/i;
const CHECK = ["check_date", "survey:date", "survey_date", "check_date:opening_hours"];
const sonTarih = (t) => CHECK.map((k) => t[k]).filter((x) => /^\d{4}-\d\d/.test(x ?? "")).sort().at(-1) ?? null;
const ayniAd = (a, b) => { const x = fold(a), y = fold(b); return x === y || x.includes(y) || y.includes(x); };
const sonuc = { uygulanan: [], uygulanmayan: [] };
for (const v of hedef) {
  const o = O.ogeler[v.ref]; const t = o?.tags ?? {}; const s = S[v.slug]; const m = s?.olcum; const k = KAP[v.slug];
  const kanit = [], zayif = [], engel = [], isaret = [];
  /* OSM güncel durum */
  if (!o?.visible) { engel.push("OSM öğesi silinmiş"); isaret.push(`OSM öğesi silinmiş (${O.tarih})`); }
  else {
    if (t.name && !ayniAd(t.name, v.name)) { engel.push("OSM adı değişmiş"); isaret.push(`OSM adı değişmiş: "${v.name}" → "${t.name}" (sürüm ${o.version}, ${o.timestamp?.slice(0, 10)})`); }
    const dis = Object.keys(t).filter((x) => /^(disused|was|abandoned|demolished|removed|razed):/.test(x));
    if (dis.length || !t.amenity) { engel.push("OSM kapanma etiketi"); isaret.push(`OSM: ${dis.join(", ") || "amenity etiketi kaldırılmış"}`); }
    const cd = sonTarih(t); if (cd && cd >= "2025-01") kanit.push(`OSM yerinde kontrol tarihi ${cd}`);
    const cs = O.changeset[o.changeset];
    if (cs && cs.tarih >= "2025-01" && ONSITE.test(cs.uygulama ?? "")) kanit.push(`OSM son düzenleme yerinde anket uygulamasıyla (${(cs.uygulama ?? "").split(" ")[0]}, ${cs.tarih}, changeset ${o.changeset})`);
    else if (cs && cs.tarih >= "2025-01" && MOBILE.test(cs.uygulama ?? "")) zayif.push(`OSM son düzenleme mobil uygulamadan (${(cs.uygulama ?? "").split(" ")[0]}, ${cs.tarih})`);
  }
  /* resmî site */
  let siteNot = s ? null : "kayıtlı resmî site yok";
  if (s) {
    if (s.alan && PARK.test(s.alan)) { siteNot = `site park/satış alanına yönleniyor (${s.kayitliAlan} → ${s.alan})`; isaret.push(siteNot); }
    else if (AGREGATOR.test(s.kayitliAlan ?? "") || AGREGATOR.test(s.alan ?? "")) siteNot = `kayıtlı bağlantı resmî site değil (${s.alan})`;
    else if (!m) siteNot = `site açılmadı (${s.denenen.map((d) => d.status || d.err).join(" / ")})`;
    else if (m.kapanisMetni) { siteNot = "sitede kapanış metni"; isaret.push("resmî sitede kapanış metni"); }
    else if (!m.ad) siteNot = "site açıldı, ad bulunamadı";
    else if (s.paylasilan > 1) {
      if (m.sokakBolgeYakin) kanit.push(`resmî şube sayfası (${s.tarih}): ad + sokak + ilçe/mahalle aynı bölümde${m.telefon ? " + telefon" : ""}`);
      else siteNot = `paylaşılan site (${s.paylasilan} kayıt): şube bölümü bulunamadı`;
    } else if (m.sokak || m.telefon) kanit.push(`resmî site (${s.tarih}): ad + ${[m.sokak && "sokak", m.telefon && "telefon"].filter(Boolean).join(" + ")} eşleşti`);
    else { siteNot = "site açıldı, ad var; sokak ve telefon yok"; if (m.ilce || m.mahalle) zayif.push(`resmî site (${s.tarih}): ad + ${m.mahalle ? "mahalle" : "ilçe"}`); }
    if (s.alan && s.kayitliAlan && s.alan !== s.kayitliAlan && !PARK.test(s.alan)) isaret.push(`site başka alana yönleniyor (${s.kayitliAlan} → ${s.alan})`);
  }
  if (k?.state === "closed_confirmed" || k?.state === "closed_suspected") engel.push(`kapanış kaydı (${k.state}, ${k.checkedAt})`);
  const satir = { slug: v.slug, ad: v.name, ilce: v.district, kategori: v.categoryId, dalga: v.wave ?? 0, kanit, zayif, isaret, site: siteNot };
  if (kanit.length && !engel.length) sonuc.uygulanan.push({ ...satir, alanlar: { verifiedAt: tarih, confidence: "güçlü", verification: kanit.join(" · ") } });
  else sonuc.uygulanmayan.push({ ...satir, neden: engel.length ? engel : ["güçlü faaliyet kanıtı bulunamadı"], celiski: kanit.length && engel.length ? kanit : undefined });
}
const say = (arr, f) => arr.reduce((m, x) => { for (const k of [].concat(f(x))) m[k] = (m[k] ?? 0) + 1; return m; }, {});
const ozet = {
  hedef: hedef.length, uygulanan: sonuc.uygulanan.length, uygulanmayan: sonuc.uygulanmayan.length,
  kanitTuru: say(sonuc.uygulanan, (x) => x.kanit.map((k) => k.startsWith("resmî site") ? "E1 resmî site" : k.startsWith("resmî şube") ? "E4 resmî şube sayfası" : k.startsWith("OSM yerinde") ? "E2 OSM yerinde kontrol" : "E3 OSM yerinde anket")),
  uygulanmayanNeden: say(sonuc.uygulanmayan, (x) => x.neden.map((n) => n.replace(/ \(.*$/, ""))),
  siteDurumu: say(sonuc.uygulanmayan.filter((x) => x.neden[0] === "güçlü faaliyet kanıtı bulunamadı"), (x) => (x.site ?? "—").replace(/ \(.*$/, "")),
  zayifKanitli: sonuc.uygulanmayan.filter((x) => x.zayif.length).length,
  isaretli: sonuc.uygulanan.concat(sonuc.uygulanmayan).filter((x) => x.isaret.length).length,
  kategori: say(sonuc.uygulanan, (x) => x.kategori),
};
writeFileSync(out, JSON.stringify({ _aciklama: `Tarihli faaliyet kanıtı olmayan ${hedef.length} kayıt (dalga 0–1) için ${tarih} kanıt toplaması. Kaynak: OpenStreetMap API (© OpenStreetMap katkıcıları, ODbL; yalnız etiket ve sürüm bilgisi), işletmelerin resmî siteleri (yalnız eşleşme ölçümü, içerik saklanmadı). Google verisi kullanılmadı. venues.json değiştirilmedi; uygulanan satırların alanları yayın sırasında faaliyet-uygula.mjs ile yazılır.`, tarih, osmTarihi: O.tarih, ozet, ...sonuc }, null, 1) + "\n");
console.log(JSON.stringify(ozet, null, 1));

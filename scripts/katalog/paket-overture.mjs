/* OVERTURE + RESMÎ SİTE KEŞİF PAKETİ (paket 16+). Tekrar kullanılabilir keşif döngüsü:
   1) Overture Maps Places adayı (güven ≥ 0,9, web sitesi var; ön süzgeç: platform/zincir kapsam dışı/katalogda olanlar çıkarıldı)
   2) resmî site ölçümü (ölçüm dosyası; sayfa içeriği saklanmaz): ad + (telefon | sokak), spam/park yok
   3) öncelik puanı ile N aday seçimi (bağımsız, gastronomi tanımı, ikonik tür, az temsil edilen ilçe, kanıt gücü)
   4) derin sınıflandırma — eksenler ayrı: kimlik, faaliyet, adres, tür, koordinat
      · A           : kimlik + faaliyet + kapı numaralı adres + kaynaklı tür + OSM koordinatı (restoranın OSM kaydı)
      · A-konumsuz  : aynısı, OSM koordinatı yok → işletme kaydı, lat/lng ve location YAZILMAZ (Overture noktası yalnız öneri dosyasında)
      · B / C       : eksik eksen yazılı → inceleme
   Overture güveni tek başına faaliyet ya da adres kanıtı sayılmaz. Overture koordinatı kayda yazılmaz (şema desteği Codex'te).
   Google verisi yok. Addan tür üretilmez.
   Kullanım: npx tsx scripts/katalog/paket-overture.mjs <klasör> <dalga> <tarih> <aday.json> <olcum.json> <ilce-sayim.json> <N> <osm-ham.json[,..]> -- <mevcut.json...> */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fold, meters, siteKey } from "../../lib/katalog/aday.ts";
import { districtOf } from "../../lib/katalog/geo.ts";
import { slugify } from "../osm-select.mjs";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [dir, waveS, tarih, adayP, olcP, ilceP, nS, osmP] = argv.slice(0, sep); const existing = argv.slice(sep + 1);
const wave = Number(waveS), N = Number(nS); const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const F = J("data/katalog/istanbul-ilceler.json"); const ILCE = J(ilceP);
const A = J(adayP), O = J(olcP); const HTTPS = process.env.HTTPS_MAP ? J(process.env.HTTPS_MAP) : {}; const ADRK = process.env.ADRES_KURTARMA ? J(process.env.ADRES_KURTARMA) : {};
const YER = new Set([...F.ilceler.map((d) => fold(d.ad)), ..."kumkapi karakoy galata taksim nisantasi bebek ortakoy kurucesme arnavutkoy emirgan yenikoy tarabya sultanahmet eminonu sirkeci balat fener moda caddebostan suadiye bostanci kalamis florya yesilkoy atakoy kozyatagi levent etiler maslak mecidiyekoy cihangir kuzguncuk cengelkoy beylerbeyi kandilli anadoluhisari rumelihisari istinye sariyer".split(" ")]);
const tok = (s) => fold(s).split(" ").filter((w) => w.length >= 3 && !GEN.has(w) && !YER.has(w));
const GEN = new Set(["restaurant", "restoran", "restorant", "restourant", "lokantasi", "lokanta", "cafe", "kafe", "ve", "the", "istanbul", "by", "salonu", "evi", "and", "bar", "balik", "kebap", "kebab", "grill", "et"]); const EX = existing.flatMap(J);
const OSMR = new Map(osmP.split(",").flatMap((p) => J(p).elements).map((e) => [`${e.type}/${e.id}`, e]));
const tel = (p) => (p ?? "").replace(/\D/g, "").slice(-10);
const fmtTel = (p) => { const d = tel(p); return d.length === 10 ? `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : null; };

/* tür: önce resmî sitenin kendi tanımı (başlık + açıklama), sonra OSM cuisine, sonra Overture kategorisi (genel "restaurant" sayılmaz) */
/* JS'de \b Türkçe harfleri (ı, ğ, ş, ü, ö, ç) kelime karakteri saymaz; sınırlar Unicode harf/rakam bakışıyla yeniden yazılır */
const LB = "(?<![\\p{L}\\p{N}])", LA = "(?![\\p{L}\\p{N}])";
const U = (re) => new RegExp(re.source.replace(/\\b(?=[(\[\p{L}])/gu, LB).replace(/\\b/g, LA), "iu");
const AILE0 = [
  ["Balık restoranı", ["seafood"], /\b(bal[ıi]k|bal[ıi]k[çc][ıi]s[ıi]|deniz [üu]r[üu]nleri|seafood|fish)\b/i],
  ["Meyhane", ["turkish"], /\bmeyhane/i],
  ["Kebapçı / Ocakbaşı", ["turkish", "kebab"], /\b(ocakba[şs][ıi]|kebap|kebab|kebap[çc][ıi]s[ıi]|adana kebap|urfa)\b/i],
  ["Steakhouse", ["steak_house"], /\b(steak ?house|steakhouse|et restoran|kasap|dry ?aged)\b/i],
  ["Pideci", ["turkish", "pide"], /\b(pide|lahmacun)\b/i],
  ["Dönerci", ["turkish", "kebab"], /\bd[öo]ner\b/i],
  ["Mantıcı", ["turkish", "dumplings"], /\bmant[ıi]\b/i],
  ["Lokanta", ["turkish"], /\b(esnaf lokantas[ıi]|ev yemekleri|lokanta)\b/i],
  ["Pizza", ["pizza"], /\b(pizza|pizzeria)\b/i],
  ["Burger", ["burger"], /\bburger\b/i],
  ["Sushi / Japon", ["japanese"], /\b(sushi|japon|japanese|ramen|izakaya)\b/i],
  ["İtalyan", ["italian"], /\b(italyan|italian|trattoria|osteria)\b/i],
  ["Asya mutfağı", ["asian"], /\b(uzak ?do[ğg]u|asian|asya|chinese|[çc]in mutfa|thai|kore)\b/i],
  ["Kahvaltı", ["breakfast"], /\bkahvalt[ıi]\b/i],
  ["Türk mutfağı", ["turkish"], /\b(t[üu]rk mutfa[ğg][ıi]|turkish (& ottoman )?cuisine|ottoman cuisine|anadolu mutfa[ğg][ıi]|osmanl[ıi] mutfa[ğg][ıi]|geleneksel t[üu]rk)\b/i],
];
const AILE = AILE0.map(([k, c, re]) => [k, c, U(re)]);
const OSMK = { seafood: "Balık restoranı", fish: "Balık restoranı", kebab: "Kebapçı / Ocakbaşı", turkish: "Türk mutfağı", pizza: "Pizza", burger: "Burger", sushi: "Sushi / Japon", japanese: "Sushi / Japon", italian: "İtalyan", steak_house: "Steakhouse", breakfast: "Kahvaltı", pide: "Pideci", meyhane: "Meyhane", regional: "Türk mutfağı" };
const OVK = { turkish_restaurant: ["Türk mutfağı", ["turkish"]], seafood_restaurant: ["Balık restoranı", ["seafood"]], fish_and_chips_restaurant: ["Balık restoranı", ["seafood"]], steakhouse: ["Steakhouse", ["steak_house"]], doner_kebab_restaurant: ["Dönerci", ["turkish", "kebab"]], barbecue_restaurant: ["Kebapçı / Ocakbaşı", ["turkish", "kebab"]], burger_restaurant: ["Burger", ["burger"]], pizza_restaurant: ["Pizza", ["pizza"]], italian_restaurant: ["İtalyan", ["italian"]], breakfast_and_brunch_restaurant: ["Kahvaltı", ["breakfast"]], mediterranean_restaurant: ["Akdeniz mutfağı", ["mediterranean"]], middle_eastern_restaurant: ["Orta Doğu mutfağı", ["middle_eastern"]], sushi_restaurant: ["Sushi / Japon", ["sushi"]], japanese_restaurant: ["Sushi / Japon", ["japanese"]], chinese_restaurant: ["Asya mutfağı", ["chinese"]], asian_restaurant: ["Asya mutfağı", ["asian"]], greek_restaurant: ["Yunan mutfağı", ["greek"]], indian_restaurant: ["Hint mutfağı", ["indian"]], french_restaurant: ["Fransız mutfağı", ["french"]], european_restaurant: ["Avrupa mutfağı", ["european"]], soup_restaurant: ["Çorbacı", ["soup"]], chicken_restaurant: ["Tavuk", ["chicken"]], vegetarian_restaurant: ["Vejetaryen", ["vegetarian"]], lebanese_restaurant: ["Lübnan mutfağı", ["lebanese"]], korean_restaurant: ["Kore mutfağı", ["korean"]], thai_restaurant: ["Tayland mutfağı", ["thai"]] };
const KAFE = U(/\b(cafe|caf[ée]|kafe|coffee|kahve(ci)?|espresso|\bbar\b|pub|lounge|nargile|hookah|pastane|patisserie|f[ıi]r[ıi]n|bakery|tatl[ıi]c[ıi]|dondurma|gelato|b[öo]rek[çc]i|simit)\b/i);
const REST = U(/\b(restoran|restaurant|lokanta|ocakba|kebap|kebab|bal[ıi]k|meyhane|pide|pizza|burger|steak|d[öo]ner|sofras|mutfa)/i);
const GASTRO = U(/\b([şs]ef|chef|fine dining|tad[ıi]m men[üu]|tasting menu|gastronomi|degustasyon|mevsimsel|seasonal|michelin|gault)\b/i);
const IKON = U(/\b(lokanta|ocakba[şs][ıi]|bal[ıi]k|meyhane|kebap|esnaf|tarihi|since|18\d\d|19\d\d|kurulu[şs]|ustas[ıi]|usta)\b/i);

/* 1–3: uygunluk ve seçim */
const HARIC = new Set(process.env.HARIC ? J(process.env.HARIC) : []); /* önceki paketlerde incelenmiş adaylar (sonuçları ne olursa olsun) yeniden seçilmez */
const elig = [], skip = { kanitsiz: 0, spamPark: 0, kafeBar: 0, acilmadi: 0 };
for (const a of A) { const o = O[a.id]; if (!o || HARIC.has(a.id)) continue;
  if (!o.status || o.status >= 400) { skip.acilmadi++; continue; }
  if (o.spam || o.park) { skip.spamPark++; continue; }
  if (!(o.nameOk && (o.telOk || o.streetOk))) { skip.kanitsiz++; continue; }
  const self = `${o.baslik} ${o.aciklama}`;
  if (KAFE.test(`${a.ad} ${self}`) && !REST.test(`${a.ad} ${self}`) && !OVK[a.takson]) { skip.kafeBar++; continue; }
  if (a.osm && ["cafe", "bar", "pub"].includes(a.osm.amenity)) { skip.kafeBar++; continue; }
  const az = ILCE[a.ilce] ?? 0;
  const puan = (a.zincirAlan ? 0 : 3) + (GASTRO.test(self) ? 3 : 0) + (IKON.test(`${a.ad} ${self}`) || ["seafood_restaurant", "barbecue_restaurant", "turkish_restaurant"].includes(a.takson) ? 2 : 0)
    + (az < 10 ? 3 : az < 25 ? 2 : az < 50 ? 1 : 0) + (o.telOk ? 1 : 0) + (o.streetOk ? 1 : 0) + (o.noOk ? 1 : 0) + (a.osm ? 1 : 0);
  elig.push({ a, o, puan }); }
elig.sort((x, y) => y.puan - x.puan || y.a.guven - x.a.guven);
const perHost = {}; const secim = [];
for (const x of elig) { if (secim.length >= N) break; const h = x.a.host; if ((perHost[h] = (perHost[h] ?? 0) + 1) > 3) continue; secim.push(x); }

/* 4: derin sınıflandırma */
const taken = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref)), exTel = new Set(EX.map((v) => tel(v.phone)).filter((t) => t.length === 10));
const TURK = (() => { try { return J(`${dir}/tur-karar.json`).kararlar; } catch { return {}; } })();
const ELLE = (() => { try { return J(`${dir}/elle-karar.json`).kararlar; } catch { return {}; } })();
const recs = [], rows = [], inceleme = [], oneri = [];
/* görünen ad: Overture adı SEO ekiyle uzunsa ilk anlamlı parça; tamamen küçük harfse baş harfler büyük (yeni ad üretilmez) */
const cleanName = (n) => { let x = n.trim(); if (x.length > 40) x = x.split(/\s+[–|-]\s+|\s*\|\s*|,\s+/)[0].trim(); if (x === x.toLocaleLowerCase("tr")) x = x.split(" ").map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1)).join(" "); return x; };
for (const { a: a0, o, puan } of secim) { const a = { ...a0, ad: cleanName(a0.ad), adOverture: a0.ad };
  const self = `${o.baslik} ${o.aciklama}`;
  const ov = { gersId: a.id, release: "2026-10-21.0", guven: Math.round(a.guven * 100) / 100, kaynaklar: a.kaynak, lisans: [...new Set(a.kaynak.map((k) => k === "Foursquare" ? "Apache-2.0" : k === "AllThePlaces" ? "CC0-1.0" : "CDLA-Permissive-2.0"))] };
  const eksik = [], neden = [];
  /* kimlik + faaliyet */
  const kimlik = `${a.zincirAlan ? "resmî şube sayfası" : "resmî site"} ${a.host}: ad + ${[o.telOk && "telefon", o.streetOk && "sokak", o.noOk && "kapı no"].filter(Boolean).join(" + ")} (${o.sayfa ?? o.final})`;
  const subeDuzeyi = !a.zincirAlan || o.telOk || (o.streetOk && o.noOk);
  if (!subeDuzeyi) neden.push("zincir: şube düzeyinde telefon/kapı no eşleşmesi yok");
  /* koordinat: yalnız OSM kaydı (restoran/fast food) */
  const osmE0 = a.osm && OSMR.get(a.osm.ref);
  /* OSM eşleşmesi sıkı: telefon aynı ya da yer adı/genel kelime dışında ortak ad kelimesi (ör. yalnız "Kumkapı" ortaklığı yetmez) */
  const osmName = osmE0 ? (osmE0.tags.name ?? osmE0.tags["name:en"] ?? "") : ""; const ta = tok(a.ad), to = tok(osmName);
  const osmTelOk = osmE0 && tel(osmE0.tags.phone ?? osmE0.tags["contact:phone"]) === tel(a.telefonlar[0]) && tel(a.telefonlar[0]).length === 10;
  const osmNameOk = ta.length > 0 && to.length > 0 && ta.filter((w) => to.includes(w)).length >= Math.min(2, ta.length, to.length);
  const osmE = osmE0 && (osmTelOk || osmNameOk) ? osmE0 : null;
  const osmOk = osmE && ["restaurant", "fast_food"].includes(osmE.tags.amenity);
  if (ELLE[a.id]) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, site: o.final, sinif: ELLE[a.id].sinif, eksik: ELLE[a.id].sinif === "B" ? [ELLE[a.id].neden] : [], neden: ELLE[a.id].sinif === "C" ? [ELLE[a.id].neden] : [], elle: true }); continue; }
  if (a.v906) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, sinif: "906", neden: [`906 havuzundaki kayıtla ortak: ${a.v906} (mevcut kimliği koruyarak paket 13 yöntemiyle yeniden doğrulanmalı)`] }); continue; }
  if (osmOk && exRef.has(a.osm.ref)) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, sinif: "çakışma", neden: [`OSM kaydı katalogda/pakette: ${a.osm.ref}`] }); continue; }
  /* adres */
  let adres = null, adresKaynak = null;
  const ovAdr = (a.adres ?? "").replace(/\s+/g, " ").trim();
  const noNorm = (s) => s.replace(/\bNo\s*[:.]?\s*/i, "No:").replace(/^(.*?)(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)$/, (m, p1, p2) => /No:/.test(m) ? m : `${p1}No:${p2}`);
  if (osmOk && osmE.tags["addr:street"] && /\d/.test(osmE.tags["addr:housenumber"] ?? "")) { adres = `${osmE.tags["addr:street"]} No:${osmE.tags["addr:housenumber"]}`; adresKaynak = "OSM kaydı (addr:street + addr:housenumber)" + (o.streetOk ? " + resmî sitede sokak" : ""); }
  else if (o.streetOk && o.noOk) {
    const seg = ovAdr.split(",").map((x) => x.trim()).find((x) => /(cad|cd|sok|sk|bulvar|blv|yolu|yokuş|meydan|sokağı|caddesi)/i.test(x) && /\d/.test(x));
    const m = seg && seg.match(/^(.*?)(?:\s*No\s*[:.]?\s*|\s+)(\d+[A-Za-z]?(?:\s*\/\s*[0-9A-Za-z]+)?)\b.*$/i);
    if (m && m[1].trim().length >= 4) { adres = `${m[1].trim().replace(/[,.]$/, "")} No:${m[2].replace(/\s+/g, "")}`; adresKaynak = "resmî sitede sokak + kapı no (adres metni Overture)"; } }
  /* adres kurtarma: resmî sitede yapılandırılmış adres (schema.org) ya da iletişim bloğunda "No <kapı>" ile aynı sokak */
  if (!adres && o.streetOk && ADRK[a.id] && (ADRK[a.id].ld || ADRK[a.id].blok)) {
    const seg = ovAdr.split(",").map((x) => x.trim()).find((x) => /(cad|cd|sok|sk|bulvar|blv|yolu|yokuş|meydan|sokağı|caddesi)/i.test(x) && /\d/.test(x));
    const m = seg && seg.match(/^(.*?)(?:\s*No\s*[:.]?\s*|\s+)(\d+[A-Za-z]?(?:\s*\/\s*[0-9A-Za-z]+)?)\b.*$/i);
    if (m && m[1].trim().length >= 4) { adres = `${m[1].trim().replace(/[,.]$/, "")} No:${m[2].replace(/\s+/g, "")}`; adresKaynak = ADRK[a.id].ld ? `resmî sitede yapılandırılmış adres (schema.org PostalAddress, ${ADRK[a.id].ld.sayfa})` : `resmî sitede iletişim bloğunda sokak + "No ${m[2]}" (${ADRK[a.id].blok.sayfa})`; } }
  if (!adres) eksik.push(o.streetOk ? "kapı numarası resmî kaynakta doğrulanmadı" : "adres resmî kaynakta doğrulanmadı");
  /* tür */
  let tur = null;
  const fam = AILE.filter(([, , re]) => re.test(self)); if (fam.length === 1) tur = { kind: fam[0][0], cuisine: fam[0][1], ifade: `resmî site başlığı/açıklaması: "${(self.match(fam[0][2]) || [""])[0]}"`, duzey: a.zincirAlan ? "marka" : "şube" };
  if (!tur && osmOk && osmE.tags.cuisine) { const c0 = osmE.tags.cuisine.split(";")[0].trim(); if (OSMK[c0]) tur = { kind: OSMK[c0], cuisine: osmE.tags.cuisine.split(";").map((x) => x.trim()), ifade: `OSM cuisine "${osmE.tags.cuisine}"`, duzey: "şube" }; }
  /* elle doğrulanmış tür (resmî site başlık/açıklama/menü) her şeyden önce gelir */
  if (TURK[a.id]) tur = { kind: TURK[a.id].kind, cuisine: TURK[a.id].cuisine, ifade: TURK[a.id].ifade, duzey: a.zincirAlan ? "marka" : "şube" };
  /* Overture kategorisi tek başına tür kanıtı DEĞİLDİR (paket 16 kalite turu); yalnız B gerekçesinde not edilir */
  if (!tur && OVK[a.takson]) eksik.push(`tür yalnız Overture kategorisinde ("${a.takson}"); resmî kaynakta doğrulanmadı`);
  if (false) tur = { kind: OVK[a.takson][0], cuisine: OVK[a.takson][1], ifade: `Overture kategorisi "${a.takson}" (işletmenin platform beyanı; kaynak ${a.kaynak.filter((k) => k !== "Overture").join("/")})`, duzey: "şube" };
  if (!tur && !OVK[a.takson]) eksik.push(fam.length > 1 ? `tür belirsiz (sitede birden çok tür: ${fam.map((f) => f[0]).join(", ")})` : "kaynaklı tür yok");
  /* mükerrer (son kontrol) */
  const t = tel(a.telefonlar[0]); const p = { lat: a.lat, lng: a.lng };
  /* aynı resmî site alanı + aynı ilçe = aynı işletme (Overture'da aynı restoranın ikinci POI'si; ör. Urfa'dan / Urfadan Kebapçı). Zincir alanlarında şube ayrımı telefon/adresle yapılır. */
  const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return null; } };
  const dup = EX.find((v) => (!a.zincirAlan && v.website && hostOf(v.website) === a.host && v.district === a.ilce) || (t.length === 10 && tel(v.phone) === t) || (fold(v.name) === fold(a.ad) && v.district === a.ilce) || (typeof v.lat === "number" && meters(v, p) < 100 && fold(v.name).split(" ")[0] === fold(a.ad).split(" ")[0]));
  if (dup) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, sinif: "çakışma", neden: [`mevcut kayıtla eşleşiyor: ${dup.slug}`] }); continue; }
  if (eksik.length || neden.length) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, site: o.final, sinif: neden.length ? "C" : "B", eksik, neden, kimlik, osm: a.osm?.ref ?? null, puan }); continue; }
  /* kayıt */
  const ilce = osmOk ? districtOf(osmE.lat ?? osmE.center?.lat, osmE.lon ?? osmE.center?.lon, F) : a.ilce;
  if (ilce !== a.ilce) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, sinif: "B", eksik: [`OSM noktası ilçesi (${ilce}) Overture ile uyuşmuyor`], neden: [] }); continue; }
  if (!osmOk && !o.ilceOk) { inceleme.push({ gersId: a.id, ad: a.ad, ilce: a.ilce, sinif: "B", eksik: ["ilçe resmî sitede geçmiyor (koordinatsız kayıtta ilçe kanıtı gerekir)"], neden: [] }); continue; }
  let slug = `${slugify(a.ad)}-${slugify(ilce)}`.replace(/--+/g, "-"); if (taken.has(slug)) { inceleme.push({ gersId: a.id, ad: a.ad, ilce, sinif: "çakışma", neden: [`slug çakışması: ${slug}`] }); continue; } taken.add(slug);
  const address = `${adres}, ${ilce}`; const phone = fmtTel(a.telefonlar[0]);
  const resmi = /^https:/.test(o.final) ? o.final : HTTPS[a.id] ?? null;
  if (!osmOk && !resmi) { inceleme.push({ gersId: a.id, ad: a.ad, ilce, sinif: "B", eksik: ["resmî site yalnız http (işletme kaydı https kaynak bağlantısı ister)"], neden: [] }); taken.delete(slug); continue; }
  /* paket içi mükerrer: aynı OSM kaydı, aynı telefon, aynı site, 40 m içinde aynı ad kelimesi */
  const twin = recs.find((r) => (osmOk && r.ref === a.osm.ref) || (phone && r.phone === phone) || new URL(r.website).host === new URL(resmi ?? o.final).host);
  if (twin) { inceleme.push({ gersId: a.id, ad: a.ad, ilce, sinif: "çakışma", neden: [`paket içinde aynı işletme: ${twin.slug}`] }); taken.delete(slug); continue; }
  const turTxt = `tür: ${tur.ifade} (${tur.duzey === "marka" ? "marka düzeyi" : "şube düzeyi"})`;
  const konumTxt = osmOk ? `konum: OSM restoran kaydı ${a.osm.ref} (Overture noktasına ${a.osm.d} m)` : "koordinat yazılmadı: OSM'de restoran kaydı yok, bugünkü şema Overture konumunu kabul etmiyor; harita noktası gösterilmez";
  const verification = `${kimlik} · faaliyet: resmî sitede güncel iletişim bilgisi (${o.tarih}) · adres: ${adresKaynak} · ${turTxt} · ${konumTxt} · aday kaynağı: Overture Maps ${a.id}`;
  const kalite = { kimlik: subeDuzeyi ? "resmî site, şube düzeyi" : "resmî site, marka düzeyi", faaliyet: "resmî site (güncel iletişim)", adres: "kapı numaralı", tur: tur.duzey === "marka" ? "kaynaklı, marka düzeyi" : "kaynaklı", koordinat: osmOk ? "OSM restoran kaydı" : "yok" };
  const base = { slug, name: a.ad, categoryId: "cat.restaurant", kind: tur.kind, district: ilce, address, ...(phone ? { phone } : {}), website: resmi ?? o.final, cuisine: tur.cuisine, importedAt: tarih };
  const v = osmOk
    ? { ref: a.osm.ref, ...base, lat: Math.round((osmE.lat ?? osmE.center.lat) * 1e6) / 1e6, lng: Math.round((osmE.lon ?? osmE.center.lon) * 1e6) / 1e6, osmAmenity: osmE.tags.amenity, wave, verifiedAt: tarih, confidence: "güçlü", verification, overture: ov, kaliteSinifi: "A", kalite }
    : { ref: `isletme/${slug}`, ...base, sourceKind: "official_site", sourceUrl: resmi, wave, verifiedAt: tarih, confidence: "güçlü", verification, overture: ov, kaliteSinifi: "A-konumsuz", kalite };
  recs.push(v);
  rows.push({ slug, ref: v.ref, tip: osmOk ? "osm_kaydi" : "isletme_kaydi_konumsuz", ad: a.ad, ilce, adres: address, koordinat: osmOk ? [v.lat, v.lng] : null, koordinatGuveni: osmOk ? "OSM restoran kaydı" : "yok (Overture önerisi ayrı)", tur: tur.kind, turKanitDuzeyi: tur.duzey === "marka" ? "marka" : "şube",
    faaliyet: "açık (resmî sitede güncel iletişim bilgisi, kontrol tarihi)", sinif: osmOk ? "A" : "A-konumsuz", zincir: a.zincirAlan ? a.host : null, sube: a.zincirAlan ? (a.ilce) : null,
    kanit: [kimlik, `adres: ${adresKaynak}`, turTxt, konumTxt], kaynak: [...(osmOk ? [`https://www.openstreetmap.org/${a.osm.ref}`] : []), resmi ?? o.final, `overture:${a.id}`], kontrolTarihi: tarih, oncelikPuani: puan, ...(a.adOverture !== a.ad ? { adOverture: a.adOverture } : {}), ...(a.v906 ? { v906: a.v906 } : {}) });
  if (!osmOk) oneri.push({ slug, gersId: a.id, lat: Math.round(a.lat * 1e6) / 1e6, lng: Math.round(a.lng * 1e6) / 1e6, guven: ov.guven, kaynaklar: a.kaynak, lisans: ov.lisans, ilceSiniri: districtOf(a.lat, a.lng, F), telefonEslesmesi: !!o.telOk,
    koordinatGuveni: o.telOk ? "KO3 adayı (tek kaynak: telefon resmî siteyle aynı; bağımsız ikinci konum kaynağı yok)" : "KO3 değil (telefon eşleşmesi yok)" });
}
mkdirSync(dir, { recursive: true });
const lines = (arr) => "[\n" + arr.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(`${dir}/kayitlar.json`, lines(recs.filter((v) => !v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/isletme-kayitlari.json`, lines(recs.filter((v) => v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/inceleme.json`, JSON.stringify({ _aciklama: "Paket 16 seçiminden A ya da A-konumsuz olamayanlar; her satırda eksik ya da neden.", kayitlar: inceleme }, null, 1));
writeFileSync(`${dir}/overture-oneri.json`, JSON.stringify({ _aciklama: "A-konumsuz kayıtlar için Overture Maps Places noktası (sürüm 2026-10-21.0). KAYDA YAZILMADI. Atıf: © Overture Maps Foundation; kaynak başına lisans (Meta/Microsoft CDLA-Permissive-2.0, Foursquare Apache-2.0, AllThePlaces CC0-1.0).", oneriler: oneri }, null, 1));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: `İstanbul Overture keşif paketi (dalga ${wave}). Aday Overture Maps Places'ten (© Overture Maps Foundation; kaynak başına lisans: Meta/Microsoft CDLA-Permissive-2.0, Foursquare Apache-2.0, AllThePlaces CC0-1.0); kimlik, faaliyet, adres ve tür restoranın resmî sitesinden ölçüldü (sayfa içeriği saklanmadı). Koordinat yalnız OSM restoran kaydından (© OpenStreetMap katkıcıları, ODbL); OSM'si olmayanlar A-konumsuz. kayitlar.json → venues.json, isletme-kayitlari.json → isletme.json. Google verisi yok.`, kontrolTarihi: tarih, eklenen: rows }, null, 1));
const cnt = (a) => a.reduce((m, x) => (m[x] = (m[x] ?? 0) + 1, m), {});
const oz = { dalga: wave, A: recs.length, sinif: cnt(rows.map((r) => r.sinif)), osmKaydi: recs.filter((v) => !v.ref.startsWith("isletme/")).length, isletmeKaydi: recs.filter((v) => v.ref.startsWith("isletme/")).length,
  uygunAday: elig.length, secilen: secim.length, onEleme: skip, inceleme: cnt(inceleme.map((x) => x.sinif)), incelemeNeden: cnt(inceleme.flatMap((x) => [...(x.eksik ?? []), ...(x.neden ?? [])].map((s) => s.split(":")[0].split(" (")[0]))),
  turKaynagi: cnt(rows.map((r) => r.kanit[2].includes("OSM cuisine") ? "OSM" : r.kanit[2].includes("Overture kategorisi") ? "Overture kategorisi" : "resmî site")), ilce: cnt(recs.map((v) => v.district)), tur: cnt(recs.map((v) => v.kind)), zincirSube: rows.filter((r) => r.zincir).length, v906Eslesen: rows.filter((r) => r.v906).length };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(oz, null, 1)); console.log(JSON.stringify(oz, null, 1));

/* ANA SAYFA V8 testleri (ağsız): En İyiler Top 10, kategoriler, eşitlik, kapalı/yanlış eşleşme, Google değişimi, Hype, ölçek. */
import { readFileSync } from "node:fs";
import { activeEntities, realEntities } from "../data/real";
import { CLOSED_CONFIRMED } from "../lib/closure";
import { HOME_LIST, GOOGLE_CHANGE } from "../lib/homeConfig";
import { byGoogle, computeHype, G_CATEGORIES, googleCategories, googleChanges, gItem, type GRating } from "../lib/homeRank";
import { HOME_SKIP } from "../components/home/HomeDiscover";
import { SIGNAL_RULES, type SignalRow } from "../lib/signals";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, info?: unknown) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}`, info ?? ""); } };

/* gerçek kayıtlardan sentetik puan haritası: deterministik puanlar (kimlik sırası) — üretimdeki sitede gösterilen kümenin yerine */
const ratings: Record<string, GRating> = {};
realEntities.forEach((e, i) => { if (i % 4 !== 3) ratings[e.slug] = { rating: [4.9, 4.7, 4.5, 4.3, 4.1, 3.9][i % 6], count: null, checkedAt: `2026-11-0${1 + (i % 7)}T03:00:00.000Z`, mapsUrl: null }; });

const cats = googleCategories(activeEntities, ratings, HOME_SKIP);
const all = cats.find((c) => c.key === "hepsi")!;
ok("En İyiler: Tüm restoranlar tam 10 kayıt", all.items.length === HOME_LIST.size, all.items.length);
ok("liste boyu merkezi ayardan (10) ve sinyal panoları da 10", HOME_LIST.size === 10 && SIGNAL_RULES.limit === 10);
ok("hiçbir kategori 10'u geçmez", cats.every((c) => c.items.length <= HOME_LIST.size));
ok("sıra yalnız puan: azalan", cats.every((c) => c.items.every((x, i) => i === 0 || c.items[i - 1].rating >= x.rating)));
const ties = all.items.filter((x) => x.rating === all.items[0].rating);
ok("eşit puanda deterministik: daha yeni doğrulama önce, sonra ad", ties.every((x, i) => i === 0 || ties[i - 1].checkedAt > x.checkedAt || (ties[i - 1].checkedAt === x.checkedAt && ties[i - 1].name.localeCompare(x.name, "tr") <= 0)));
ok("aynı girdi her zaman aynı sıra", JSON.stringify(googleCategories(activeEntities, ratings, HOME_SKIP)) === JSON.stringify(cats));
ok("değerlendirme sayısı yokken sıralama çalışır, sayı uydurulmaz", all.items.every((x) => x.count === null));
/* her kategori: listedeki her mekân kategori kuralını gerçekten sağlar */
const byKey = new Map(G_CATEGORIES.map((c) => [c.key, c]));
const ent = new Map(realEntities.map((e) => [e.slug, e]));
ok("her kategorideki her mekân o kategorinin gerçek türünde", cats.every((c) => c.items.every((x) => byKey.get(c.key)!.test(ent.get(x.slug)!))));
ok("yalnız gerçek veri bulunan kategoriler açılır (en az 3)", cats.every((c) => c.pool >= HOME_LIST.minCategory));
ok("Balık kategorisinde yalnız balık / deniz ürünü", (cats.find((c) => c.key === "balik")?.items ?? []).every((x) => { const e = ent.get(x.slug)!; return e.subcategory === "Balık restoranı" || (e.tags ?? []).some((t) => ["seafood", "fish"].includes(t)); }));
ok("Kafeler yalnız kafe, Tüm restoranlar yalnız restoran", (cats.find((c) => c.key === "kafe")?.items ?? []).every((x) => ent.get(x.slug)!.categoryId === "cat.cafe") && all.items.every((x) => ent.get(x.slug)!.categoryId === "cat.restaurant"));
/* kapalı ve vitrin kuralı */
const closedSlug = [...CLOSED_CONFIRMED][0];
ok("kesin kapalı mekân En İyiler'e girmez", !cats.some((c) => c.items.some((x) => CLOSED_CONFIRMED.has(x.slug))) && !!closedSlug);
ok("kurucuyla ilişkili mekân ana sayfa listelerinde yok", !cats.some((c) => c.items.some((x) => x.slug === "japon-erdal-beyoglu")));
/* yanlış eşleşme: googleRatingMap'te olmayan (reddedilmiş / tür uyuşmazlığı / onaysız) mekân hiç listeye giremez */
const first = all.items[0].slug; const without = { ...ratings }; delete without[first];
ok("doğrulanmış puanı olmayan (ret/yanlış tür/onaysız) mekân listeden çıkar", !googleCategories(activeEntities, without, HOME_SKIP).some((c) => c.items.some((x) => x.slug === first)));
ok("sosyal tesis Google sıralamasına alınmaz", !cats.some((c) => c.items.some((x) => /sosyal tesis/i.test(x.name))));
ok("Google puanı 5 üzerinden (0–5 aralığı), Gidenler puanına dönüştürülmez", cats.every((c) => c.items.every((x) => x.rating > 0 && x.rating <= 5 && !("score" in x))));
ok("byGoogle eşitlikte slug ile bile kararlı", byGoogle(gItem({ slug: "a", name: "X", categoryId: "cat.restaurant" }, { rating: 4, count: null, checkedAt: "2026-11-01", mapsUrl: null }), gItem({ slug: "b", name: "X", categoryId: "cat.restaurant" }, { rating: 4, count: null, checkedAt: "2026-11-01", mapsUrl: null })) < 0);

/* Google değişimi: gerçek geçmiş */
const now = new Date("2026-11-20T06:00:00Z");
const H = (slug: string, rating: number, d: string) => ({ slug, rating, checkedAt: `${d}T03:00:00.000Z` });
const hist = [H("a", 4.2, "2026-11-06"), H("a", 4.4, "2026-11-19"), H("b", 4.5, "2026-11-06"), H("b", 4.3, "2026-11-19"), H("c", 4.0, "2026-11-17"), H("c", 4.6, "2026-11-19"), H("d", 4.1, "2026-11-06"), H("d", 4.1, "2026-11-19")];
const ch = googleChanges(hist, () => true, now);
ok("yükselen: gerçek iki okuma arası fark (a +0,2)", ch.rising.length === 1 && ch.rising[0].slug === "a" && ch.rising[0].delta === 0.2 && ch.rising[0].days === 13);
ok("düşen: gerçek fark (b −0,2)", ch.falling.length === 1 && ch.falling[0].slug === "b" && ch.falling[0].delta === -0.2);
ok(`${GOOGLE_CHANGE.minSpanDays} günden kısa aralık değişim sayılmaz (c)`, !ch.rising.some((x) => x.slug === "c"));
ok("değişmeyen puan listeye girmez (d)", ![...ch.rising, ...ch.falling].some((x) => x.slug === "d"));
const young = googleChanges([H("a", 4.2, "2026-11-06"), H("a", 4.4, "2026-11-08")], () => true, new Date("2026-11-08T06:00:00Z"));
ok("geçmiş yetersizse liste boş ve hazır olacağı tarih bildirilir (sahte ok yok)", !young.rising.length && !young.falling.length && young.readyAt?.startsWith("2026-11-13") === true);
ok("geçerliliği kalkmış mekân (kapalı/ret) değişim listesine girmez", !googleChanges(hist, (s) => s !== "a", now).rising.length);

/* Hype: yalnız niyet sinyali */
const T = "2026-11-20", day = (n: number) => new Date(Date.parse(`${T}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
const onlyViews: SignalRow[] = ["a", "b", "c", "d"].map((slug) => ({ slug, kind: "view", day: T, n: 50 }));
ok("yalnız profil bakışı hype üretmez", computeHype(onlyViews, T).items.length === 0);
const intent: SignalRow[] = ["a", "b", "c"].flatMap((slug, i) => [{ slug, kind: "save" as const, day: day(i), n: 2 + i }, { slug, kind: "outbound" as const, day: day(i), n: 1 }]);
const hy = computeHype(intent, T);
ok("niyet sinyalleriyle hype: kaydet×3 + yönlendirme×2, puana göre", hy.items.length === 3 && hy.items[0].slug === "c" && hy.items[0].points === 4 * 3 + 2);
ok("tek mekânlık hype listesi yapılmaz (en az 3)", computeHype(intent.filter((r) => r.slug === "a"), T).items.length === 0);
ok("7 günden eski sinyal sayılmaz", computeHype(intent.map((r) => ({ ...r, day: day(9) })), T).items.length === 0);

/* ölçek: 2.000 / 5.000 kayıtta da Top 10 */
for (const N of [2000, 5000]) {
  const big = Array.from({ length: N }, (_, i) => ({ ...activeEntities[i % activeEntities.length], slug: `s-${i}`, name: `Mekân ${i}` }));
  const r: Record<string, GRating> = Object.fromEntries(big.map((e, i) => [e.slug, { rating: 3 + (i % 21) / 10, count: null, checkedAt: "2026-11-08T03:00:00.000Z", mapsUrl: null }]));
  const t0 = performance.now(); const c = googleCategories(big, r); const ms = performance.now() - t0;
  ok(`${N} kayıtta Top 10 (${Math.round(ms)} ms)`, c.every((x) => x.items.length <= 10) && c[0].items.length === 10 && ms < 1500);
}

/* kaynak kodu kuralları */
const hb = readFileSync("lib/homeBoard.ts", "utf8");
ok("pano satırları (popüler, hype, konuşulan, değişim, yedek) kesin kapalıyı dışlar: itemOf HOME_SKIP", /if \(!e \|\| HOME_SKIP\.has\(slug\)\) return null;/.test(hb) && !/HOME_EXCLUDE\.has\(slug\)/.test(hb));
const page = readFileSync("app/page.tsx", "utf8"), sor = readFileSync("components/home/HomeSor.tsx", "utf8");
ok("kompakt Sor: aynı /sor/?q= adresine gider (ikinci motor yok, soru korunur)", /sorHref\(t\)/.test(sor) && /HomeSorCompact/.test(page) && !/fetch\(["'`]\/api\/sor/.test(sor));
ok("demo hero (AskAI) değişmedi", /DEMO_VISIBLE \? <AskAI \/> : <QuickFind \/>/.test(page));
ok("G_TOP merkezi ayardan", /const G_TOP = HOME_LIST\.size/.test(readFileSync("lib/homeBoard.ts", "utf8")));

console.log(`\nana sayfa V8: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);

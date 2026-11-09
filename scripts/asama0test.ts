/* AŞAMA 0 GÜVENLİK TESTLERİ — npx tsx scripts/asama0test.ts
   1) Google: saklanan puanlar gösterilmez, otomatik okuma betikleri ve kaynak adaptörü çalışmaz, yazma uçları 410.
   2) İşletme paneli: demo dışında üretilmez/açılmaz.
   3) Rezervasyon: yalnız gerçek iletimde başarı; kanal yok / hata / zaman aşımı / yönlendirme başarı sayılmaz.
   4) Gidenler puanı Google verisi okumaz (izin listesi). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

let fails = 0, passes = 0, DONE = false;
/* Olay döngüsü erken boşalırsa (bekleyen söz) test GEÇMİŞ sayılmasın. */
process.on("exit", (c) => { if (!DONE && c === 0) { console.error("✗ test tamamlanmadan çıktı"); process.exitCode = 1; } });
const ok = (cond: unknown, name: string) => { if (cond) { passes++; console.log(`  ✓ ${name}`); } else { fails++; console.error(`  ✗ ${name}`); } };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

async function main() {
  console.log("1 · Google puanı");
  const policy = await import("../lib/gpuan/policy");
  ok(policy.STORED_GOOGLE_RATINGS_DISPLAY === false, "saklanan Google puanı gösterimi kapalı (sabit)");
  ok(policy.GOOGLE_SCRAPING_ENABLED === false, "otomatik okuma kapalı (sabit)");
  ok(!/process\.env/.test(src("lib/gpuan/policy.ts")), "politika ortam değişkeniyle açılamaz");

  const read = await import("../lib/gpuan/read");
  process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/yok"; // veritabanı olsa bile okunmamalı
  const map = await read.googleRatingMap();
  ok(Object.keys(map).length === 0, "googleRatingMap() boş döner (veritabanına gidilmez)");
  ok((await read.googleRatingOf("japon-erdal-beyoglu")) === null, "googleRatingOf() null döner");
  delete process.env.DATABASE_URL;

  const hb = src("lib/homeBoard.ts");
  ok(/if \(!db \|\| DEMO_VISIBLE \|\| !STORED_GOOGLE_RATINGS_DISPLAY\) return \[\];/.test(hb), "Google puan geçmişi yükselen/düşen hesabına girmez");
  ok(/window: "Gidenler ilgisi"/.test(hb), "Yükselenler Google kapalıyken yalnız Gidenler etkileşimi");

  const { mapsPageSource } = await import("../lib/gpuan/sources/mapsPage");
  let threw = "";
  try { await mapsPageSource(); } catch (e) { threw = (e as Error).message; }
  ok(threw === "google_scraping_disabled", "Maps sayfa adaptörü tarayıcı açmadan hata verir");

  for (const s of ["gpuan-guncelle", "gpuan-arama", "gpuan-pilot"]) {
    const r = spawnSync("npx", ["tsx", `scripts/${s}.ts`], { encoding: "utf8", env: { ...process.env, VERCEL_BYPASS: "", HOST: "127.0.0.1:1" }, timeout: 120_000 });
    ok(r.status === 3 && /kalıcı olarak kapalı/.test(r.stderr), `${s} betiği istek yapmadan çıkar (kod ${r.status})`);
  }

  process.env.DB_ADMIN_LOCAL = "1";
  const admin = await import("../app/api/admin/google-puan/route");
  const res = await admin.POST(new Request("http://localhost/api/admin/google-puan", { method: "POST", body: JSON.stringify({ target: "local", confirm: "EVET", op: "aktar", holder: "test-holder" }) }));
  ok(res.status === 410, `yönetim aktarımı (Excel → veritabanı) 410 (${res.status})`);
  delete process.env.DB_ADMIN_LOCAL;
  ok(/google_ratings_disabled/.test(src("app/api/moderation/google-puan/route.ts")), "moderasyon Google kararı yazma ucu kapalı");

  console.log("2 · İşletme paneli");
  const { businessPanelAllowed } = await import("../lib/business/access");
  ok(businessPanelAllowed({ demo: false }) === false, "demo dışında panel izni yok");
  ok(businessPanelAllowed({ demo: true }) === true, "yatırımcı demosunda (sahte veri) açık");
  const panel = await import("../app/isletme/[slug]/page");
  ok(panel.generateStaticParams().length === 0, "demo dışında hiçbir panel sayfası üretilmez");
  let nf = false;
  try { await panel.default({ params: Promise.resolve({ slug: "moda-lokantasi" }) }); } catch (e) { nf = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/.test(String((e as { digest?: string }).digest ?? e)); }
  ok(nf, "panel isteği 404 (notFound) — ara katmana güvenilmez");
  ok(/businessPanelAllowed\(\) && entity\.business\?\.claimed/.test(src("app/mekan/[slug]/page.tsx")), "mekân sayfası panel bağlantısını demo dışında göstermez");

  console.log("3 · Rezervasyon");
  const { forwardReservation, reservationResponse, reservationErrorText } = await import("../lib/reservationDelivery");
  const fake = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
  ok(await forwardReservation(undefined, {}) === "unavailable", "webhook tanımsız → unavailable");
  ok(await forwardReservation("http://ornek.test/h", {}, { fetch: fake(200) }) === "unavailable", "https olmayan webhook → unavailable");
  ok(await forwardReservation("bozuk adres", {}) === "unavailable", "geçersiz adres → unavailable");
  ok(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(204) }) === "forwarded", "2xx → forwarded");
  ok(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(500) }) === "failed", "500 → failed");
  ok(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(302) }) === "failed", "3xx → failed");
  const thrower = (async () => { throw new TypeError("ağ"); }) as unknown as typeof fetch;
  ok(await forwardReservation("https://ornek.test/h", {}, { fetch: thrower }) === "failed", "ağ hatası → failed");
  /* yavaş alıcı: 3 sn sonra 200 döner; 50 ms zaman aşımı önce düşmeli. Zamanlayıcı süreci canlı tutar (AbortSignal.timeout tutmaz). */
  const slow = ((_u: unknown, init: RequestInit) => new Promise((res, rej) => { const t = setTimeout(() => res(new Response(null, { status: 200 })), 3000); init.signal?.addEventListener("abort", () => { clearTimeout(t); rej(new Error("timeout")); }); })) as unknown as typeof fetch;
  ok(await forwardReservation("https://ornek.test/h", {}, { fetch: slow, timeoutMs: 50 }) === "failed", "zaman aşımı → failed");

  const u = reservationResponse(false, "unavailable", "GDN-1"), f = reservationResponse(false, "failed", "GDN-1"), s = reservationResponse(false, "forwarded", "GDN-1"), d = reservationResponse(true, null, "GDN-1");
  ok(u.status === 503 && u.body.forwarded === false && !u.body.code, "kanal yok → 503, kod yok");
  ok(f.status === 502 && f.body.forwarded === false && !u.body.status, "iletim hatası → 502");
  ok(s.status === 201 && s.body.forwarded === true && s.body.status === "talep", "gerçek iletim → 201 + forwarded:true");
  ok(d.status === 201 && d.body.status === "önizleme" && d.body.forwarded === false, "demo → önizleme, iletilmedi");
  for (const k of ["reservation_unavailable", "delivery_failed", "network", "bilinmeyen"]) ok(!/iletildi/i.test(reservationErrorText(k)) || /iletilmedi|iletilemedi/.test(reservationErrorText(k)), `hata metni "iletildi" demez (${k})`);
  const w = src("components/reservation/ReservationWidget.tsx");
  ok(/j\.status === "talep" && j\.forwarded === true/.test(w), "arayüz başarıyı yalnız forwarded:true ile gösterir");
  const route = await import("../app/api/rezervasyon/route");
  const rr = await route.POST(new Request("http://localhost/api/rezervasyon/", { method: "POST", body: JSON.stringify({ entitySlug: "kronotrop-cihangir-beyoglu", date: "2099-01-01", time: "19:00", party: 2, name: "Test", phone: "+905550000000", consent: true }) }));
  ok(rr.status === 409 || rr.status === 404, `ortak olmayan gerçek mekân başarı almaz (${rr.status})`);

  console.log("4 · Gidenler puanı");
  for (const f of ["weights", "compute", "published", "publishedCards"]) {
    const imports = src(`lib/score/${f}.ts`).match(/^import[^;]+;/gm) ?? [];
    ok(!imports.some((l) => /gpuan|providers\/google|googleRating|google_rating/i.test(l)), `lib/score/${f}.ts Google modülü içe aktarmaz`);
  }

  console.log(`\n${passes} geçti, ${fails} kaldı`);
  DONE = true;
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

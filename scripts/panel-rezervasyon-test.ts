import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;
let done = false;
process.on("exit", (code) => {
  if (!done && code === 0) process.exitCode = 1;
});

const check = (condition: unknown, name: string) => {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
};
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function main() {
  console.log("İşletme paneli");
  const { businessPanelAllowed } = await import("../lib/business/access");
  check(!businessPanelAllowed({ demo: false }), "demo dışında panel kapalı");
  check(businessPanelAllowed({ demo: true }), "yalnız demo verisinde panel açık");
  const panel = await import("../app/isletme/[slug]/page");
  check(panel.generateStaticParams().length === 0, "demo dışında panel sayfası üretilmiyor");
  let notFound = false;
  try { await panel.default({ params: Promise.resolve({ slug: "moda-lokantasi" }) }); }
  catch (error) { notFound = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/.test(String((error as { digest?: string }).digest ?? error)); }
  check(notFound, "panel isteği 404 dönüyor");
  check(/businessPanelAllowed\(\) && entity\.business\?\.claimed/.test(source("app/mekan/[slug]/page.tsx")), "mekân sayfası panel bağlantısını gizliyor");

  console.log("Rezervasyon iletimi");
  const { forwardReservation, reservationResponse, reservationErrorText } = await import("../lib/reservationDelivery");
  const fake = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
  check(await forwardReservation(undefined, {}) === "unavailable", "webhook yoksa kullanılamıyor");
  check(await forwardReservation("http://ornek.test/h", {}, { fetch: fake(200) }) === "unavailable", "HTTPS olmayan webhook reddediliyor");
  check(await forwardReservation("bozuk adres", {}) === "unavailable", "geçersiz adres reddediliyor");
  check(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(204) }) === "forwarded", "yalnız 2xx başarı");
  check(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(500) }) === "failed", "500 başarısız");
  check(await forwardReservation("https://ornek.test/h", {}, { fetch: fake(302) }) === "failed", "yönlendirme başarısız");
  const thrower = (async () => { throw new TypeError("ağ"); }) as unknown as typeof fetch;
  check(await forwardReservation("https://ornek.test/h", {}, { fetch: thrower }) === "failed", "ağ hatası başarısız");
  const slow = ((_url: unknown, init: RequestInit) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response(null, { status: 200 })), 3000);
    init.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("timeout")); });
  })) as unknown as typeof fetch;
  check(await forwardReservation("https://ornek.test/h", {}, { fetch: slow, timeoutMs: 50 }) === "failed", "zaman aşımı başarısız");

  const unavailable = reservationResponse(false, "unavailable", "GDN-1");
  const deliveryFailed = reservationResponse(false, "failed", "GDN-1");
  const success = reservationResponse(false, "forwarded", "GDN-1");
  const demo = reservationResponse(true, null, "GDN-1");
  check(unavailable.status === 503 && !unavailable.body.forwarded && !unavailable.body.code, "kanal yok: 503 ve kod yok");
  check(deliveryFailed.status === 502 && !deliveryFailed.body.forwarded && !deliveryFailed.body.code, "iletim hatası: 502 ve kod yok");
  check(success.status === 201 && success.body.forwarded && success.body.status === "talep", "gerçek iletim: 201 ve forwarded:true");
  check(demo.status === 201 && demo.body.status === "önizleme" && !demo.body.forwarded, "demo yalnız önizleme");
  for (const key of ["reservation_unavailable", "delivery_failed", "network", "bilinmeyen"]) {
    const text = reservationErrorText(key);
    check(!/iletildi/i.test(text) || /iletilmedi|iletilemedi/.test(text), `hata metni başarı iddia etmiyor: ${key}`);
  }
  check(/j\.status === "talep" && j\.forwarded === true/.test(source("components/reservation/ReservationWidget.tsx")), "arayüz yalnız forwarded:true ile başarı gösteriyor");

  console.log(`\n${passed} geçti, ${failed} kaldı`);
  done = true;
  process.exit(failed ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });

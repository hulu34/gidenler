/* Deneme eşiği · YALNIZ PREVIEW: geçiş, gerçek Neon (Preview dalı) üzerinde uçtan uca sunucu akışı, sayfa ve API korumaları.
   CANLI=1: www.gidenler.com, yalnız okuma (geçiş durumu, kart görünümü, API 401/403). Üretimde senaryo çalıştırılmaz.
   Log: doğru/yanlış, sayılar, bildirim metinleri (test hesapları) — gizli bilgi yok. Ekran görüntüleri şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik, baslikSizintisi } from "./yetkili.mjs";
const CANLI = process.env.CANLI === "1";
const HOST = CANLI ? "www.gidenler.com" : process.env.PREVIEW_HOST;
const ADMIN_HOST = CANLI ? process.env.ADAY_HOST : HOST;
const OUT = "out/esik"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const HP = CANLI ? {} : HB;
const admin = `https://${ADMIN_HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const SLUG = "leb-i-derya-beyoglu", BOS = "efes-pide-ve-lahmacun-sisli";

const durum = await (await fetch(admin, { headers: HB })).json().catch(() => ({}));
const env = durum.env;
ok(`hedef ortam ${CANLI ? "production (yalnız okuma)" : "preview"}`, CANLI ? env === "production" : env === "preview", `env=${env}`);
if (CANLI ? env !== "production" : env !== "preview") process.exit(1);

if (!CANLI) {
  const m = await fetch(admin, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "migrate", confirm: "EVET", target: "preview" }) });
  const mj = await m.json().catch(() => ({}));
  ok("Preview veritabanı: 0001_deneme_esigi uygulandı ya da zaten uygulanmış", m.ok && (mj.status?.pending ?? ["?"]).length === 0 && (mj.status?.applied ?? []).some((t) => t.tag === "0001_deneme_esigi"), JSON.stringify({ applied: mj.applied, pending: mj.status?.pending }).slice(0, 160));
  const s = await fetch(admin, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "esik-senaryo", confirm: "EVET", target: "preview", slug: SLUG }) });
  const sj = await s.json().catch(() => ({}));
  for (const r of sj.results ?? []) ok(`sunucu akışı (gerçek Neon): ${r.name}`, r.ok, r.info ?? "");
  ok("senaryo bütün olarak geçti", s.ok && sj.ok === true, sj.error ?? "");
  writeFileSync(`${OUT}/senaryo.json`, JSON.stringify(sj, null, 1));
  for (const u of ["A", "B"]) for (const n of sj.evidence?.[u] ?? []) console.log(`  kanıt ${u}: [${n.read ? "okundu" : "okunmadı"}] ${n.text} · ${n.scoredAt} · ${n.id}`);
} else {
  ok("canlı veritabanında geçiş bekleyen yok", Array.isArray(durum.migrations?.pending) && durum.migrations.pending.length === 0, JSON.stringify(durum.migrations?.pending ?? "?"));
}

/* API: oturum yoksa 401, başka kökenden 403 */
const api = `https://${HOST}/api/me/esik/`;
const g = await fetch(api, { headers: HP });
ok("API GET oturumsuz → 401", g.status === 401, `HTTP ${g.status}`);
const p1 = await fetch(api, { method: "POST", headers: { ...HP, "content-type": "application/json", origin: "https://kotu.example" }, body: JSON.stringify({ slug: SLUG, threshold: 8.3 }) });
ok("API POST başka kökenden → 403", p1.status === 403, `HTTP ${p1.status}`);
const p2 = await fetch(api, { method: "POST", headers: { ...HP, "content-type": "application/json", origin: `https://${HOST}` }, body: JSON.stringify({ slug: SLUG, threshold: 8.3, userId: "test-esik-a" }) });
ok("API POST aynı kökenden ama oturumsuz (kullanıcı kimliği gövdede verilse bile) → 401", p2.status === 401, `HTTP ${p2.status}`);
const b = await fetch(`https://${HOST}/api/me/bildirimler/`, { headers: HP });
ok("bildirim API oturumsuz → 401", b.status === 401, `HTTP ${b.status}`);

const br = await chromium.launch({ channel: "chrome" });
for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil-emulasyon", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
  const ctx = await br.newContext(o);
  await yetkiliBaslik(ctx, HOST, CANLI ? {} : { ...HB, "x-vercel-set-bypass-cookie": "true" }); const sizinti = baslikSizintisi(ctx, HOST);
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  for (const slug of CANLI ? [BOS] : [SLUG, BOS]) {
    await p.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const sel = dev === "masaustu" ? "#esik" : "#esik-mobil";
    const card = p.locator(sel);
    const visible = await card.isVisible().catch(() => false);
    if (dev !== "masaustu" && visible) { await card.locator("button[aria-expanded]").click(); await p.waitForTimeout(500); }
    const t = (await card.innerText().catch(() => "")).replace(/\s+/g, " ");
    const head = (await p.locator("header").first().innerText().catch(() => "")).replace(/\s+/g, " ");
    ok(`${dev} ${slug}: kart görünüyor (Deneme eşiğin, soru, 0,1 adımlı seçici, 'aşınca haber ver')`, visible && t.includes("Kaç puanın üstüne çıkarsa denemek istersin?") && t.includes("aşınca haber ver") && (await card.locator("button[aria-label='Eşiği 0,1 artır']").count()) === 1, t.slice(0, 120));
    if (slug === SLUG && !CANLI) ok(`${dev}: sayfa ve kart aynı yayımlanmış puanı gösteriyor (8,9)`, t.includes("Gidenler puanı 8,9") && head.includes("Gidenler puanı 8,9"), head.slice(0, 120));
    else ok(`${dev} ${slug}: puan yokken 'henüz yok' ve 'Yeterli deneyim oluşması bekleniyor'`, t.includes("Yeterli deneyim oluşması bekleniyor"), t.slice(0, 160));
    /* virgül/nokta ve sınır: 9,9'da artı kapalı; 10 yazılırsa uyarı ve düğme kapalı */
    const inp = card.locator("input[inputmode=decimal]");
    await inp.fill("8.3"); await inp.blur();
    const v1 = await inp.inputValue();
    await inp.fill("10"); await p.waitForTimeout(200);
    const dis10 = await card.locator("button", { hasText: "aşınca haber ver" }).isDisabled();
    await inp.fill("9,9"); await p.waitForTimeout(200);
    const plusOff = await card.locator("button[aria-label='Eşiği 0,1 artır']").isDisabled();
    ok(`${dev} ${slug}: 8.3 → 8,3; 10 kabul edilmez; 9,9'da artı kapalı`, v1 === "8,3" && dis10 && plusOff, `${v1} ${dis10} ${plusOff}`);
    await p.screenshot({ path: `${OUT}/${dev}-${slug}.png`, fullPage: false });
    await card.screenshot({ path: `${OUT}/${dev}-${slug}-kart.png` }).catch(() => {});
  }
  ok(`${dev}: sayfa hatası yok`, errs.filter((e) => !/vercel\.live/.test(e)).length === 0, errs.join(" | ").slice(0, 160));
  ok(`${dev}: test erişim başlığı üçüncü taraflara gitmiyor`, sizinti.size === 0);
  await ctx.close();
}
await br.close();
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);

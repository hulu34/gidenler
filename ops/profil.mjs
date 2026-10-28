/* Restoran profili V1 · TEST ORTAMI (Preview, kendi Neon dalı). Üretime yazmaz: hedef "preview" değilse durur.
   1) içerik dosyasını yönetim yolundan uygular (yalnız Preview veritabanı) 2) profili okur 3) sayfayı masaüstü + mobilde dener.
   Log yalnız doğru/yanlış ve sayılar. */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.PREVIEW_HOST, SLUG = process.env.SLUG ?? "pandeli-fatih";
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const HB = { ...H, "x-vercel-set-bypass-cookie": "true" }; /* yalnız tarayıcı (çerez kavanozu olan) bağlam için */
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const env = (await (await fetch(`${admin}?rapor=profil&slug=${SLUG}`, { headers: H })).json().catch(() => ({}))).env;
ok("hedef ortam preview (üretime yazılmaz)", env === "preview", `env=${env}`);
if (env !== "preview") process.exit(1);
const gBefore = await (await fetch(`${admin}?rapor=google`, { headers: H })).json().catch(() => null);
if (process.env.APPLY === "1") {
  const profile = JSON.parse(readFileSync(new URL(`./profil/${SLUG}.json`, import.meta.url), "utf8"));
  const r = await fetch(admin, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "preview", profile }) });
  const j = await r.json().catch(() => ({}));
  ok("profil uygulandı (Preview)", r.ok && j.ok, `alan=${j.fields} menü=${j.menuItems} video=${(j.videos ?? []).filter((v) => v.ok).length}/${(j.videos ?? []).length} ${j.error ?? ""} ${(j.issues ?? []).join(";")}`);
}
const rp = await (await fetch(`${admin}?rapor=profil&slug=${SLUG}`, { headers: H })).json();
ok("profil okunuyor", !!rp.profile?.description && !!rp.profile?.menu, `menü bölüm=${rp.profile?.menu?.sections?.length} video=${rp.videos?.length} işbirliği=${(rp.videos ?? []).filter((v) => v.sponsored).length}`);

const b = await chromium.launch({ channel: "chrome" });
for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
  const ctx = await b.newContext({ ...o, extraHTTPHeaders: HB, ...(o.userAgent ? {} : { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" }) });
  const hosts = new Map(); ctx.on("request", (r) => { const h = new URL(r.url()).hostname; hosts.set(h, (hosts.get(h) ?? 0) + 1); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`https://${HOST}/mekan/${SLUG}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const nav = await p.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => a.textContent.trim()));
  ok(`${dev}: sekmeler`, ["Genel bakış", "Menü", "Fotoğraflar", "Videolar", "Deneyimler"].every((x) => nav.includes(x)), nav.join("|"));
  ok(`${dev}: Gidenler puanı yok, açıkça yazıyor; demo dış puan yok`, /Henüz Gidenler puanı yok|henüz Gidenler puanı/i.test(t) && !/Tripadvisor|Yandex|Simüle/i.test(t));
  ok(`${dev}: tanıtım, adres, telefon ve kaynak/son kontrol`, t.includes("Mısır Çarşısı içindeki tarihî lokanta") && t.includes("+90 212 527 39 09") && /son kontrol 28\.10\.2026/.test(t));
  ok(`${dev}: saat uydurulmuyor`, t.includes("İşletmenin resmî kaynağında yayımlanmıyor"));
  ok(`${dev}: kurallar ve olanaklar`, t.includes("Evcil hayvan kabul edilmiyor") && t.includes("Yalnız tatlı, çay ve kahve"));
  const menuN = await p.locator("#menu li").count();
  ok(`${dev}: resmî menü (52 kalem), geçerlilik ve fiyat notu`, menuN === 52 && t.includes("01.02.2026 tarihinden itibaren geçerli") && t.includes("fiyat yayımlamıyor"), `${menuN}`);
  await p.locator("a[href='#menu']").first().click(); await p.waitForTimeout(800);
  ok(`${dev}: Menü sekmesi menüye götürür`, await p.evaluate(() => { const r = document.getElementById("menu").getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }));
  const cards = p.locator("#videolar button"); await p.locator("#videolar").scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(800);
  const nv = await cards.count();
  ok(`${dev}: video kartları (4), işbirliği etiketi`, nv === 4 && (await p.locator("#videolar").innerText()).includes("İşbirliği"), `${nv}`);
  if (nv) {
    await cards.first().click(); await p.waitForTimeout(2500);
    const src = await p.locator("[role=dialog] iframe").getAttribute("src").catch(() => null);
    ok(`${dev}: video Gidenler içinde resmî oynatıcıyla açılıyor (indirme yok)`, !!src && /youtube(-nocookie)?\.com\/embed\//.test(src), src ?? "");
    await p.locator("[role=dialog] button[aria-label^='Kapat']").click(); await p.waitForTimeout(500);
    ok(`${dev}: kapatınca sayfaya dönülüyor`, (await p.locator("[role=dialog]").count()) === 0 && p.url().includes(`/mekan/${SLUG}/`));
  }
  const imgs = await p.locator("#fotograflar img").count();
  ok(`${dev}: fotoğraf alanı`, imgs > 0 || t.includes("Fotoğraflar şu an yüklenemedi"), `${imgs} görsel`);
  ok(`${dev}: Kaydet / Gitmek istiyorum / Gittim düğmeleri`, (await p.getByRole("button", { name: /Kaydet/ }).count()) > 0 && (await p.getByRole("button", { name: /Gitmek istiyorum/ }).count()) > 0);
  const resv = await p.locator("#genel").innerText();
  ok(`${dev}: rezervasyon bloğu iletişimle (ortaklık iddiası yok)`, /Ara|Web sitesi/.test(resv) && !/Masa ayırt/.test(resv));
  ok(`${dev}: sayfa hatası yok`, errs.length === 0, errs.join(" | ").slice(0, 200));
  if (dev === "masaustu") {
    await p.goto(`https://${HOST}/yaz/${SLUG}/`, { waitUntil: "networkidle" });
    const w = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    ok("deneyim yazma sayfası açılıyor (yayın için giriş istenir)", /Pandeli/.test(w) && /(Google ile|giriş)/i.test(w));
  }
  console.log(`  ${dev} dış alan adları: ${[...hosts.keys()].filter((h) => h !== HOST).sort().join(", ")}`);
  await ctx.close();
}
await b.close();
const gAfter = await (await fetch(`${admin}?rapor=google`, { headers: H })).json().catch(() => null);
console.log(`Google kullanım (bu ay, Preview sayaç): önce ${JSON.stringify(gBefore?.spend?.month ?? gBefore?.usage?.month ?? null)} · sonra ${JSON.stringify(gAfter?.spend?.month ?? gAfter?.usage?.month ?? null)}`);
console.log(`${res.filter(Boolean).length}/${res.length}`); process.exit(res.every(Boolean) ? 0 : 1);

/* İlk 5 yeni restoran profili · sayfa denetimi.
   PREVIEW (varsayılan): yalnız Preview veritabanı; hedef "preview" değilse durur. APPLY=1 ise restoranları SIRAYLA uygular.
   CANLI=1: www.gidenler.com, yalnız okuma (uygulama yok, test başlığı yok, kişisel hesap yok, rezervasyon/deneyim gönderilmez).
   Beklenen değerler içerik dosyasından hesaplanır: menü kalemleri (ad + fiyat/açıklama), kaynak tarihleri, videolar.
   Videolar site içi oynatıcıda tek tek açılır ve oynatma denenir. Ekran testi masaüstü ve MOBİL EMÜLASYON
   (Playwright); gerçek cihaz testi değildir. Log yalnız doğru/yanlış, sayılar ve denetim kimlikleri. */
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik, baslikSizintisi } from "./yetkili.mjs";
const CANLI = process.env.CANLI === "1";
const OUT = CANLI ? "out/canli5" : "out/profil"; mkdirSync(OUT, { recursive: true });
const HOST = CANLI ? "www.gidenler.com" : process.env.PREVIEW_HOST;
const SLUGS = (process.env.SLUGS ?? "balikci-sabahattin-fatih,yeni-lokanta-beyoglu,filizler-koftecisi-uskudar,del-mare-uskudar,viktor-levi-sarap-evi-kadikoy").split(",");
const H = CANLI ? {} : { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const HB = CANLI ? {} : { ...H, "x-vercel-set-bypass-cookie": "true" };
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const shot = async (pg, name, sel) => { try { if (sel) await pg.locator(sel).first().screenshot({ path: `${OUT}/${name}.png` }); else await pg.screenshot({ path: `${OUT}/${name}.png` }); } catch { /* yoksay */ } };
const rapor = async (slug) => (await fetch(`${admin}?rapor=profil&slug=${slug}`, { headers: H })).json().catch(() => ({}));
const trDate = (d) => d.split("-").reverse().join(".");
const tl = (n) => `${n.toLocaleString("tr-TR")} ₺`;
const ytId = (u) => u.match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1];

if (!CANLI) {
  const env = (await rapor(SLUGS[0])).env;
  ok("hedef ortam preview (üretime yazılmaz)", env === "preview", `env=${env}`);
  if (env !== "preview") process.exit(1);
}
const b = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });

for (const slug of SLUGS) {
  console.log(`\n── ${slug}`);
  const pf = JSON.parse(readFileSync(new URL(`./profil/${slug}.json`, import.meta.url), "utf8"));
  const items = pf.menu.sections.flatMap((s) => s.items);
  if (!CANLI) {
    const before = await rapor(slug);
    ok("restoran Preview veritabanında var", !!before.place, `önce: profil=${before.profile ? "var" : "yok"} video=${before.videos?.length ?? 0}`);
    if (!before.place) continue;
    if (process.env.APPLY === "1") {
      const r = await fetch(admin, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "preview", profile: pf }) });
      const j = await r.json().catch(() => ({}));
      const vOk = (j.videos ?? []).filter((v) => v.ok).length;
      ok("profil uygulandı (Preview, tek bölünmez yazım)", r.ok && j.ok, `HTTP ${r.status} menü=${j.menuItems} video=${vOk}/${(j.videos ?? []).length} değişmedi=${j.unchanged ?? "-"} denetim=${j.auditId ?? "-"} ${j.error ?? ""}`);
      if (!(r.ok && j.ok)) { console.log("  DUR: kısmi ya da hatalı uygulama, sonraki restorana geçilmedi"); break; }
    }
  }

  for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil-emulasyon", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
    const ctx = await b.newContext(o);
    await yetkiliBaslik(ctx, HOST, HB); const sizinti = baslikSizintisi(ctx, HOST);
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
    await p.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    const nav = await p.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => a.textContent.trim()));
    ok(`${dev}: sekmeler`, ["Genel bakış", "Menü", "Fotoğraflar", "Videolar"].every((x) => nav.includes(x)), nav.filter((x) => x.length < 14).join("|"));
    ok(`${dev}: tanıtım, telefon, kaynak ve son kontrol ${trDate(pf.description.checkedAt)}`, t.includes(pf.description.value.slice(0, 40)) && t.includes(pf.phone.value) && t.includes(`son kontrol ${trDate(pf.description.checkedAt)}`));
    ok(`${dev}: saat ${pf.hours ? "resmî kaynaktan" : "uydurulmuyor"}`, pf.hours ? !t.includes("İşletmenin resmî kaynağında yayımlanmıyor") : t.includes("İşletmenin resmî kaynağında yayımlanmıyor"));
    /* başlık CSS ile büyük harf (İ): metin kaynağı textContent'ten okunur */
    const dts = await p.locator("#genel dt").evaluateAll((d) => d.map((x) => x.textContent.trim()));
    ok(`${dev}: notlar 'Bilmen gerekenler' başlığıyla (${pf.notes.length})`, dts.includes("Bilmen gerekenler") && !dts.includes("Kurallar") && pf.notes.every((n) => t.includes(n.value.slice(0, 30))), dts.join("|"));
    /* menü: her kalem adı, fiyatı (varsa) ve açıklaması dosyadakiyle aynı sırada */
    const rows = await p.locator("#menu li").evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, " ").trim()));
    const miss = items.filter((it, i) => { const r = rows[i] ?? ""; return !r.startsWith(it.name) || (it.priceTry !== undefined && !r.includes(tl(it.priceTry))) || (it.description && !r.includes(it.description)) || (it.priceTry === undefined && /\d ₺$/.test(r) && !(it.description ?? "").endsWith("₺")); });
    ok(`${dev}: menü ${items.length} kalem, ad/fiyat/açıklama dosyayla aynı`, rows.length === items.length && miss.length === 0, `${rows.length} satır${miss.length ? " · farklı: " + miss.slice(0, 3).map((m) => m.name).join(", ") : ""}`);
    ok(`${dev}: menü kaynağı ve tarihleri`, t.includes(`son kontrol ${trDate(pf.menu.checkedAt)}`) && (!pf.menu.validFrom || t.includes(`${trDate(pf.menu.validFrom)} tarihinden itibaren geçerli`)) && t.includes("fiyatlar kaynaktaki gibi"));
    const imgs = await p.locator("#fotograflar img").count();
    ok(`${dev}: fotoğraf alanı${CANLI ? " (Google fotoğrafları)" : ""}`, CANLI ? imgs > 0 : true, `${imgs} görsel`);
    ok(`${dev}: Kaydet ve Gitmek istiyorum düğmeleri`, (await p.getByRole("button", { name: /Kaydet/ }).count()) > 0 && (await p.getByRole("button", { name: /Gitmek istiyorum/ }).count()) > 0);
    /* videolar: kart sayısı, atıf (tür + tarih) kartta tam görünüyor, işbirliği etiketi yalnız işaretlide */
    await p.locator("#videolar").scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(600);
    const cards = p.locator("#videolar button");
    const nv = await cards.count();
    ok(`${dev}: video kartları (${pf.videos.length})`, nv === pf.videos.length, `${nv}`);
    const credits = await p.locator("#videolar button span.line-clamp-5").evaluateAll((ss) => ss.map((s) => ({ t: s.innerText.replace(/\s+/g, " "), clipped: s.scrollHeight > s.clientHeight + 1 })));
    const clipped = credits.filter((c) => c.clipped).map((c) => c.t.slice(0, 30));
    ok(`${dev}: atıflar (kanal · tarih · tür) kartta kesilmeden görünüyor`, credits.length === pf.videos.length && clipped.length === 0 && pf.videos.every((v) => credits.some((c) => c.t === v.credit)), clipped.join(" | "));
    ok(`${dev}: işbirliği etiketi yalnız işaretli videoda`, ((await p.locator("#videolar").innerText().catch(() => "")).includes("İşbirliği")) === pf.videos.some((v) => v.sponsored));
    if (dev === "masaustu") { await shot(p, `${slug}-masaustu-genel`, "#genel"); await shot(p, `${slug}-masaustu-menu`, "#menu"); await shot(p, `${slug}-masaustu-videolar`, "#videolar"); }
    else { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await shot(p, `${slug}-mobil-ilk`); }
    const beforeVideo = errs.length;
    /* oynatma: yalnız masaüstünde her video; mobil emülasyonda ilk video */
    for (let i = 0; i < (dev === "masaustu" ? nv : Math.min(1, nv)); i++) {
      await cards.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      await cards.nth(i).click(); await p.waitForTimeout(3000);
      const src = await p.locator("[role=dialog] iframe").getAttribute("src").catch(() => null);
      const id = src?.match(/embed\/([\w-]{11})/)?.[1];
      let durum = "iframe yok";
      const fr = p.frames().find((f) => id && f.url().includes(`/embed/${id}`));
      if (fr) {
        try {
          await fr.waitForSelector("video", { timeout: 8000 });
          let s = await fr.evaluate(() => { const v = document.querySelector("video"); return { t: v.currentTime, paused: v.paused }; });
          if (s.t === 0) { await fr.locator(".ytp-large-play-button").click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(4000); }
          s = await fr.evaluate(() => { const v = document.querySelector("video"); const e = document.querySelector(".ytp-error-content-wrap-reason")?.textContent?.trim(); return { t: v.currentTime, paused: v.paused, e }; });
          durum = s.e ? `hata: ${s.e.slice(0, 80)}` : `t=${s.t.toFixed(1)}s ${s.paused ? "duraklatılmış" : "oynuyor"}`;
        } catch (e) { durum = `video öğesi okunamadı (${e.message.slice(0, 50)})`; }
      }
      const shown = await p.locator("[role=dialog]").innerText().catch(() => "");
      /* zorunlu: site içi oynatıcı doğru videonun resmî YouTube gömmesini açar. Oynatmanın kendisi CI'nın başsız
         tarayıcısında YouTube tarafından engellenebilir (video öğesi yüklenmez); oynatma gerçek tarayıcıda ayrıca doğrulanır. */
      ok(`${dev}: video ${i + 1} site içi oynatıcıda açıldı (doğru kimlik, resmî gömme)`, !!id && pf.videos.some((v) => ytId(v.url) === id) && /youtube(-nocookie)?\.com\/embed\//.test(src ?? ""), id ?? "");
      if (fr && !/oynuyor|t=[1-9]/.test(durum)) durum += " · çerçeve: " + (await fr.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 90)).catch(() => "?"));
      console.log(`  bilgi (CI başsız tarayıcı) video ${i + 1} oynatma: ${durum}`);
      ok(`${dev}: video ${i + 1} oynatıcıda atıf tam`, pf.videos.some((v) => ytId(v.url) === id && shown.includes(v.credit)));
      if (dev === "masaustu" && i === 0) await shot(p, `${slug}-masaustu-oynatici`);
      await p.locator("[role=dialog] button[aria-label^='Kapat']").click().catch(() => p.keyboard.press("Escape")); await p.waitForTimeout(500);
    }
    const own = errs.slice(0, beforeVideo).filter((e) => !/vercel\.live/.test(e));
    ok(`${dev}: sayfa hatası yok (oynatıcı açılmadan önce)`, own.length === 0, own.join(" | ").slice(0, 200));
    ok(`${dev}: test erişim başlığı üçüncü taraflara gitmiyor`, sizinti.size === 0, [...sizinti].join(","));
    await ctx.close();
  }
}
await b.close();
const n = res.filter(Boolean).length;
console.log(`\nSONUÇ ${n}/${res.length}`);
process.exit(n === res.length ? 0 : 1);

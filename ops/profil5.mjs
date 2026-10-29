/* İlk 5 yeni restoran profili · TEST ORTAMI (Preview, kendi Neon dalı). Üretime yazmaz: hedef "preview" değilse durur.
   Restoranlar SIRAYLA işlenir (aynı restorana paralel yazım yok): önce durum, sonra uygulama, okuma ve sayfa denetimi.
   Beklenen değerler içerik dosyasından hesaplanır. Log yalnız doğru/yanlış, sayılar ve denetim kimlikleri. */
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS === "1"; if (SHOTS) mkdirSync("out/profil", { recursive: true });
const HOST = process.env.PREVIEW_HOST;
const SLUGS = (process.env.SLUGS ?? "balikci-sabahattin-fatih,yeni-lokanta-beyoglu,filizler-koftecisi-uskudar,del-mare-uskudar,viktor-levi-sarap-evi-kadikoy").split(",");
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const HB = { ...H, "x-vercel-set-bypass-cookie": "true" };
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const shot = async (pg, name, sel) => { if (!SHOTS) return; try { if (sel) await pg.locator(sel).first().screenshot({ path: `out/profil/${name}.png` }); else await pg.screenshot({ path: `out/profil/${name}.png` }); } catch { /* yoksay */ } };
const rapor = async (slug) => (await fetch(`${admin}?rapor=profil&slug=${slug}`, { headers: H })).json().catch(() => ({}));
const trDate = (d) => d.split("-").reverse().join(".");

const env = (await rapor(SLUGS[0])).env;
ok("hedef ortam preview (üretime yazılmaz)", env === "preview", `env=${env}`);
if (env !== "preview") process.exit(1);
const b = await chromium.launch({ channel: "chrome" });

for (const slug of SLUGS) {
  console.log(`\n── ${slug}`);
  const pf = JSON.parse(readFileSync(new URL(`./profil/${slug}.json`, import.meta.url), "utf8"));
  const nMenu = pf.menu.sections.reduce((a, s) => a + s.items.length, 0);
  const before = await rapor(slug);
  ok("restoran Preview veritabanında var", !!before.place, `önce: menü satırı=${before.counts?.menuRows} profil=${before.profile ? "var" : "yok"} video=${before.videos?.length ?? 0}`);
  if (!before.place) continue;
  if (process.env.APPLY === "1") {
    const r = await fetch(admin, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "preview", profile: pf }) });
    const j = await r.json().catch(() => ({}));
    const vOk = (j.videos ?? []).filter((v) => v.ok).length;
    ok("profil uygulandı (Preview, tek bölünmez yazım)", r.ok && j.ok, `HTTP ${r.status} alan=${j.fields} menü=${j.menuItems} video=${vOk}/${(j.videos ?? []).length} denetim=${j.auditId ?? "-"} ${j.error ?? ""} ${(j.issues ?? []).join(";")}`);
    for (const v of j.videos ?? []) if (!v.ok) console.log(`  video hatası: ${v.error}`);
  }
  const rp = await rapor(slug);
  ok("profil geri okunuyor", !!rp.profile?.description && rp.profile?.menu?.sections?.reduce((a, s) => a + s.items.length, 0) === nMenu && (rp.videos?.length ?? 0) === pf.videos.length,
    `menü=${rp.profile?.menu?.sections?.reduce((a, s) => a + s.items.length, 0)}/${nMenu} video=${rp.videos?.length}/${pf.videos.length} son denetim=${rp.audits?.[0]?.id ?? "-"}`);

  for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
    const ctx = await b.newContext({ ...o, extraHTTPHeaders: HB });
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
    await p.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    const nav = await p.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => a.textContent.trim()));
    ok(`${dev}: sekmeler`, ["Genel bakış", "Menü", "Fotoğraflar", "Videolar"].every((x) => nav.includes(x)), nav.join("|"));
    ok(`${dev}: tanıtım, telefon, kaynak ve son kontrol`, t.includes(pf.description.value.slice(0, 40)) && t.includes(pf.phone.value) && t.includes(`son kontrol ${trDate(pf.description.checkedAt)}`));
    ok(`${dev}: saat ${pf.hours ? "resmî kaynaktan" : "uydurulmuyor"}`, pf.hours ? !t.includes("İşletmenin resmî kaynağında yayımlanmıyor") : t.includes("İşletmenin resmî kaynağında yayımlanmıyor"));
    const menuN = await p.locator("#menu li").count();
    ok(`${dev}: resmî menü ${nMenu} kalem${pf.menu.validFrom ? ", geçerlilik tarihi" : ""}, fiyat notu`, menuN === nMenu && (!pf.menu.validFrom || t.includes(`${trDate(pf.menu.validFrom)} tarihinden itibaren geçerli`)) && t.includes("fiyatlar kaynaktaki gibi"), `${menuN}`);
    const notesOk = pf.notes.every((n) => t.includes(n.value.slice(0, 30)));
    ok(`${dev}: notlar (${pf.notes.length})`, notesOk);
    await p.locator("#videolar").scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(600);
    const nv = await p.locator("#videolar button").count();
    ok(`${dev}: video kartları (${pf.videos.length})`, nv === pf.videos.length, `${nv}`);
    ok(`${dev}: işbirliği etiketi yalnız işaretli videoda`, ((await p.locator("#videolar").innerText().catch(() => "")).includes("İşbirliği")) === pf.videos.some((v) => v.sponsored));
    ok(`${dev}: sayfa hatası yok (Preview araç çubuğu hariç)`, errs.filter((e) => !/vercel\.live/.test(e)).length === 0, errs.join(" | ").slice(0, 200));
    if (dev === "masaustu") {
      await p.evaluate(() => scrollTo(0, 0));
      await shot(p, `${slug}-masaustu-genel`, "#genel");
      await shot(p, `${slug}-masaustu-menu`, "#menu");
      await shot(p, `${slug}-masaustu-videolar`, "#videolar");
    } else {
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      await shot(p, `${slug}-mobil-ilk`);
      await p.locator("a[href='#menu']").first().click().catch(() => {}); await p.waitForTimeout(800);
      await shot(p, `${slug}-mobil-menu`);
    }
    await ctx.close();
  }
}
await b.close();
const n = res.filter(Boolean).length;
console.log(`\nSONUÇ ${n}/${res.length}`);
process.exit(n === res.length ? 0 : 1);

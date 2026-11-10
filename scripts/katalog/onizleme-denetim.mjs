/* PAKET ÖNİZLEME DENETİMİ — yeni mekânların profil, arama, deneyim formu ve sitemap'te gerçekten çalıştığını ölçer.
   Yalnız GET (veritabanına yazmaz). Kullanım: BASE=http://localhost:3456 node scripts/katalog/onizleme-denetim.mjs <venues-dalga.json> [pilot]
   Korumalı Preview için HB başlığı: VERCEL_BYPASS ortam değişkeni. Log yalnız sayı/durum. */
import { readFileSync } from "node:fs";
const B = process.env.BASE, HB = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : {};
const [pp, mode] = process.argv.slice(2); const P = JSON.parse(readFileSync(pp, "utf8"));
const res = []; const ok = (n, c, i = "") => { res.push(!!c); if (!c || process.env.AYRINTI) console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const t0 = []; const timed = async (u) => { const s = performance.now(); const r = await fetch(u, { headers: HB }); const b = await r.text(); t0.push(performance.now() - s); return { r, b }; };
let prof = 0, ara = 0, yaz = 0;
const q = [...P];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const v = q.shift();
  const { r, b } = await timed(`${B}/mekan/${v.slug}/`);
  const good = r.status === 200 && (b.includes(esc(v.name)) || b.includes(v.name)) && !/Application error/.test(b) && b.includes(v.district);
  ok(`profil ${v.slug}`, good, r.status); if (good) prof++;
  const a = await (await fetch(`${B}/api/ara/?q=${encodeURIComponent(v.name)}&limit=8`, { headers: HB })).json().catch(() => ({}));
  const hit = (a.items ?? []).some((i) => i.slug === v.slug); ok(`arama ${v.slug}`, hit); if (hit) ara++;
  const y = await fetch(`${B}/yaz/${v.slug}/`, { headers: HB }); ok(`form ${v.slug}`, y.status === 200, y.status); if (y.status === 200) yaz++;
} }));
const sm = await (await fetch(`${B}/sitemap.xml`, { headers: HB })).text();
const inSm = P.filter((v) => sm.includes(`/mekan/${v.slug}/`)).length;
ok(`sitemap ${inSm}/${P.length}`, mode === "pilot" ? true : inSm === P.length);
ok("ana sayfa 200", (await fetch(`${B}/`, { headers: HB })).status === 200);
const si = await fetch(`${B}/sehir/istanbul/`, { headers: HB }); ok("şehir sayfası /sehir/istanbul/ 200", si.status === 200);
const sa = await fetch(`${B}/sehir/ankara/`, { headers: HB }); const sab = await sa.text();
ok(mode === "pilot" ? "pilot: /sehir/ankara/ 200 ve noindex" : "pilot kapalı: /sehir/ankara/ 404", mode === "pilot" ? sa.status === 200 && /noindex/.test(sab) : sa.status === 404, sa.status);
const s = [...t0].sort((a, b) => a - b), pct = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]);
console.log(JSON.stringify({ kayit: P.length, profil: prof, arama_ilk8: ara, form: yaz, sitemap: inSm, profil_ms: { p50: pct(0.5), p95: pct(0.95) } }));
const k = res.filter((x) => !x).length; console.log(`ÖNİZLEME: ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);

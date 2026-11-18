/* RESMÎ SİTE ERİŞİM DENETİMİ (katalog kalite envanteri): kayıtlı web sitesi ve işletme kaynak bağlantısı açılıyor mu?
   Yalnız durum kodu ve son adres saklanır; sayfa içeriği saklanmaz. Nazik: alan adı başına bir istek, aynı anda 6, 20 sn zaman aşımı.
   Kullanım: node scripts/katalog/site-erisim.mjs <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs"; import { execFile } from "node:child_process"; import { promisify } from "node:util";
const ex = promisify(execFile); const [out] = process.argv.slice(2);
const all = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))].filter((r) => r.website || r.sourceUrl);
async function get(u) { try { const { stdout } = await ex("curl", ["-sS", "-L", "--http1.1", "-o", "/dev/null", "-m", "20", "-A", "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)", "-w", "%{http_code} %{url_effective}", u]); const [c, e] = stdout.trim().split(" "); return { status: +c, final: e }; } catch { return { status: 0 }; } }
const res = {}; const q = [...all]; let n = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const r = q.shift(); const u = r.website ?? r.sourceUrl; const g = await get(u);
  res[r.slug] = { url: u, status: g.status, final: g.final ?? null, https: /^https:/.test(g.final ?? u), tarih: "2026-11-12" }; if (++n % 100 === 0) console.log("ilerleme", n, "/", all.length); } }));
writeFileSync(out, JSON.stringify(res, null, 1)); const v = Object.values(res);
console.log("denenen", v.length, "açılan", v.filter((x) => x.status && x.status < 400).length, "4xx/5xx", v.filter((x) => x.status >= 400).length, "bağlantı yok", v.filter((x) => !x.status).length, "yalnız http", v.filter((x) => x.status && x.status < 400 && !x.https).length);

/* ÜRETİM · YALNIZ OKUMA: bekleyen Google eşleşmelerinin eşleştirme kanıtı (ad/mesafe/telefon/web özeti) ve
   son Excel. Yazma yok, Google'a istek yok. Çıktı şifreli; logda yalnız sayılar. */
import { mkdirSync, writeFileSync } from "node:fs";
const B = `https://${process.env.PROD_HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
mkdirSync("out/bek", { recursive: true });
const g = await (await fetch(`${B}/api/admin/db/?rapor=google`, { headers: H })).json();
if (g.env !== "production") { console.log("✗ ortam", g.env); process.exit(1); }
writeFileSync("out/bek/bekleyen.json", JSON.stringify({ pending: g.pending, stats: g.stats }, null, 1));
const x = await fetch(`${B}/api/admin/google-puan/?dosya=son`, { headers: H });
writeFileSync("out/bek/son.xlsx", Buffer.from(await x.arrayBuffer()));
console.log("bekleyen", (g.pending ?? []).length, "istatistik", JSON.stringify(g.stats), "excel", x.status);

/* ÜRETİM · sahip onayı 2026-11-06 ("Yes, approve"): A seviyesi kanıtlı 29 bekleyen eşleşmeye Google puanı onayı.
   Her karar gerekçeli, denetim kaydına yazılır, yalnız aynı place ID için geçerli. Ardından son Excel yeniden aktarılır.
   Önce her mekânın son Excel'deki place ID'si listedekiyle aynı mı bakılır; değilse o mekân atlanır. Log: yalnız sayılar. */
import { readFileSync } from "node:fs";
const B = `https://${process.env.PROD_HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const J = { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const A = `${B}/api/admin/google-puan/`;
const post = async (o) => { const r = await fetch(A, { method: "POST", headers: J, body: JSON.stringify({ target: "production", confirm: "EVET", holder: "sahip-onay-a", ...o }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const list = JSON.parse(readFileSync("ops/gpuan-onay-a.json", "utf8"));
const r0 = await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json();
if (r0.env !== "production") { console.log("✗ ortam", r0.env); process.exit(1); }
const waiting = new Map((r0.review ?? []).map((x) => [x.slug, x.placeId]));
let done = 0, skip = 0, fail = 0;
for (const x of list) {
  if (waiting.get(x.slug) !== x.placeId) { skip++; console.log(`atlandı (place ID ya da durum farklı) #${skip}`); continue; }
  const r = await post({ op: "karar", slug: x.slug, placeId: x.placeId, decision: "onay", note: x.note });
  if (r.s === 200 && r.j.ok) done++; else { fail++; console.log("✗ karar", r.s, r.j.error ?? ""); }
}
console.log(`karar yazılan ${done} · atlanan ${skip} · hata ${fail}`);
const lk = await post({ op: "kilit-al", ttl: 600 });
const fid = (await fetch(`${A}?dosya=son`, { headers: H })).headers.get("x-dosya-id");
const ak = await post({ op: "aktar", fileId: fid }); await post({ op: "kilit-birak" });
console.log("aktarım", ak.s, JSON.stringify({ status: ak.j.status, written: ak.j.written, hidden: ak.j.hidden, importable: ak.j.importable }), "kilit", lk.j.ok);
await new Promise((r) => setTimeout(r, 5000));
const r1 = await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json();
console.log("sonra", JSON.stringify({ shown: r1.site?.shown, hidden: r1.site?.hidden, final: r1.final }));
const ok = fail === 0 && ak.j.status === "applied" && r1.site?.shown === r0.site?.shown + done;
console.log(ok ? "SONUÇ ✓" : "SONUÇ ✗"); process.exit(ok ? 0 : 1);

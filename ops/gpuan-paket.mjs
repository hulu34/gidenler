/* GOOGLE PUAN TAMAMLAMA PAKETİ — HEDEF ortamda (preview | production) uygular:
   onay: bekleyen eşleşmeye gerekçeli puan onayı · yeni: arama ile bulunan Google kaydını "pending" kimlik + onay olarak ekler.
   Her kayıt sunucuda yeniden denetlenir (başka mekâna bağlı kimlik, onaylı başka eşleşme varsa reddedilir).
   Production'da yalnız sahip onayıyla çalıştırılır. Log: yalnız sayılar. */
import { readFileSync, writeFileSync } from "node:fs";
const T = process.env.HEDEF, B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const J = { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const A = `${B}/api/admin/google-puan/`;
const pre = process.env.NOT_ONEKI ?? "";
const post = async (o) => { const r = await fetch(A, { method: "POST", headers: J, body: JSON.stringify({ target: T, confirm: "EVET", holder: "tamamlama-paketi", ...o }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const P = JSON.parse(readFileSync("ops/gpuan-paket.json", "utf8"));
const r0 = await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json();
if (r0.env !== T) { console.log("✗ ortam", r0.env, "beklenen", T); process.exit(1); }
console.log("önce", JSON.stringify({ shown: r0.site?.shown, hidden: r0.site?.hidden }));
const waiting = new Map((r0.review ?? []).map((x) => [x.slug, x.placeId]));
const t = { onay: 0, onayAtlandi: 0, yeni: 0, yeniRet: {}, hata: 0 };
for (const x of P.onay) {
  if (waiting.get(x.slug) !== x.placeId) { t.onayAtlandi++; continue; }
  const r = await post({ op: "karar", slug: x.slug, placeId: x.placeId, decision: "onay", note: (pre + x.note).slice(0, 500) });
  r.s === 200 && r.j.ok ? t.onay++ : t.hata++;
}
for (const x of P.yeni) {
  const r = await post({ op: "eslesme-ekle", slug: x.slug, placeId: x.placeId, note: (pre + x.note).slice(0, 500) });
  if (r.s === 200 && r.j.ok) t.yeni++; else { const e = r.j.error ?? `http_${r.s}`; t.yeniRet[e] = (t.yeniRet[e] ?? 0) + 1; }
}
console.log("paket", JSON.stringify(t));
writeFileSync("out/paket-slugs.txt", [...P.onay, ...P.yeni].map((x) => x.slug).join(","));
process.exit(t.hata ? 1 : 0);

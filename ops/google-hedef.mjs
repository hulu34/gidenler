/* Hedefli Google eşleştirmesi · CANLI · tek seferlik, yönetici bağlantısıyla.
   ops/google-hedef.json: { "<slug>": "<Google Haritalar bağlantısı>" } (en çok 5). Mevcut google-match yolu ve onun
   bütçe/kota koruması kullanılır; harcama okunamıyorsa sunucu hiç çağrı yapmaz. Eşleşme yalnız bağlantıdaki işletme
   kimliği adaylardan biriyle birebir tutarsa yazılır (Place ID; yorum, puan, fotoğraf, konum yazılmaz).
   Log: durum, neden, çağrı sayısı ve aylık harcama özeti. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const HOST = process.env.ADAY_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const mapsUrls = JSON.parse(readFileSync(new URL("./google-hedef.json", import.meta.url), "utf8"));
const slugs = Object.keys(mapsUrls);
if (!slugs.length || slugs.length > 5) { console.log("✗ 1–5 mekân"); process.exit(1); }
mkdirSync("out/google-hedef", { recursive: true });
for (const s of slugs) {
  const r0 = await (await fetch(`${admin}?rapor=profil&slug=${s}`, { headers: H })).json();
  if (r0.env !== "production" || !r0.place) { console.log(`✗ ${s}: canlı ortam/mekân yok (${r0.env})`); process.exit(1); }
}
const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "google-match", confirm: "EVET", target: "production", slugs, mapsUrls }) });
const j = await r.json().catch(() => ({}));
writeFileSync("out/google-hedef/yanit.json", JSON.stringify(j, null, 1));
for (const x of j.results ?? []) console.log(`${["confirmed", "existing"].includes(x.status) ? "✓" : "✗"} ${x.slug} Google eşleşmesi · durum=${x.status} neden=${x.reason ?? "-"} aday=${x.candidate?.name ?? "-"} arama=${x.calls?.textSearch ?? "-"} doğrulama=${x.calls?.detailsEnterprise ?? "-"}`);
if (!r.ok || j.error) console.log(`✗ HTTP ${r.status} ${j.error ?? ""}`);
const sp = j.spend; if (sp) console.log(`  harcama (ay, USD): ${JSON.stringify(sp).replace(/"/g, "").slice(0, 220)}`);
process.exit(r.ok && !j.error ? 0 : 1);

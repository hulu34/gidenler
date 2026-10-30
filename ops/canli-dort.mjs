/* CANLI · onaylı dört profil. Önce Preview'da geri alma denenir (Durusu, yalnız Preview). Sonra üretimde SIRAYLA uygulanır; ilk hatada durur.
   Önceki hâl ve yanıtlar şifreli çıktıda; log yalnız doğru/yanlış, sayılar ve denetim numaraları. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const OUT = "out/canlid"; mkdirSync(OUT, { recursive: true });
const K = process.env.VERCEL_BYPASS, PR = process.env.PREVIEW_HOST, PD = process.env.PROD_HOST;
const H = { "x-vercel-protection-bypass": K, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const api = (h) => `https://${h}/api/admin/db/`;
const rapor = async (h, s) => (await fetch(`${api(h)}?rapor=profil&slug=${s}`, { headers: H })).json();
const post = (h, b) => fetch(api(h), { method: "POST", headers: H, body: JSON.stringify(b) });
const dur = (m) => { console.log(`✗ DURDU: ${m}`); process.exit(1); };
/* Preview geri alma denendi: son uygulamanın kaynak kaydını kaldırdı, önceki değere döndü (Durusu sitesi). */
{ const b = await rapor(PR, "durusu-club-restaurant-arnavutkoy"); console.log(`${b.profile?.address && !String(b.profile?.website?.value ?? "").includes("lezzetler") ? "✓" : "✗"} Preview geri alma sonrası: adres duruyor, son değişiklik kalktı · ${b.profile?.website?.value}`); if (!b.profile?.address || String(b.profile?.website?.value ?? "").includes("lezzetler")) dur("geri alma sonucu beklenen gibi değil"); }
const SLUGS = ["bafetto-pizza-kartal", "pidem-fatih", "ibb-eyupsultan-kent-lokantasi-eyupsultan", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"];
const once = {}; for (const s of SLUGS) { const r = await rapor(PD, s); if (r.env !== "production") dur(`ortam ${r.env}`); if (!r.place || r.profile) dur(`${s}: beklenmeyen önceki hâl`); once[s] = r; }
writeFileSync(`${OUT}/once.json`, JSON.stringify(once, null, 1)); console.log("✓ önceki hâl kaydedildi (4 kayıt, profil yok)");
const sonuc = [];
for (const s of SLUGS) {
  const profile = JSON.parse(readFileSync(new URL(`./veri42/${s}.json`, import.meta.url), "utf8"));
  const r = await post(PD, { action: "profile-apply", target: "production", confirm: "EVET", profile }); const j = await r.json().catch(() => ({}));
  writeFileSync(`${OUT}/${s}.json`, JSON.stringify(j, null, 1));
  const b = await rapor(PD, s); const ok = r.status === 200 && j.ok && b.profile?.address?.value === profile.address.value && b.place?.address === profile.address.value;
  console.log(`${ok ? "✓" : "✗"} ${s} · HTTP ${r.status} alan ${j.fields} denetim ${j.auditId ?? "yok"}`); sonuc.push({ s, audit: j.auditId, ok });
  if (!ok) dur(`${s} uygulanamadı; kalan kayıtlara geçilmedi`);
}
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify(sonuc, null, 1)); console.log("SONUÇ 4/4");

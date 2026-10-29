/* CANLI · OAuth test hesabını puan girdilerinden dışlar (user.kind "user" → "test"). Hedef yalnız e-posta özetiyle
   (SHA-256, küçük harf); depoda e-posta yok. MODE=once: yalnız eşleşmeyi gösterir. MODE=uygula: tek hesap değişir,
   denetim kaydı yazılır, ardından puan uzlaştırması (yazma anahtarı kapalıysa kuru) çalışır. */
const HOST = process.env.ADAY_HOST, MODE = process.env.MODE;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const HASH = "60482824c4e8a243a2ac530baf581ece83609d6bb9b7c5ffbcccd196d2432d50";
const body = { action: "hesap-test", target: "production", emailSha256: HASH, ...(MODE === "uygula" ? { confirm: "EVET" } : {}) };
const r = await fetch(`https://${HOST}/api/admin/db/`, { method: "POST", headers: H, body: JSON.stringify(body) });
const j = await r.json().catch(() => ({}));
if (MODE !== "uygula") { console.log(`${r.ok && j.matched === 1 ? "✓" : "✗"} önizleme · eşleşen hesap=${j.matched} tür=${(j.kinds ?? []).join(",")} ${j.error ?? ""}`); process.exit(r.ok && j.matched === 1 ? 0 : 1); }
console.log(`${r.ok && j.changed === 1 ? "✓" : "✗"} test hesabı işaretlendi · HTTP ${r.status} ${j.from ?? ""}→${j.to ?? ""} ${j.error ?? ""}`);
for (const x of j.rows ?? []) console.log(`  uzlaştırma: ${x.slug} · yazar ${x.authors} · deneyim ${x.reviews} · hesap ${x.score ?? "puan yok"} · ${x.action}`);
process.exit(r.ok && j.changed === 1 ? 0 : 1);

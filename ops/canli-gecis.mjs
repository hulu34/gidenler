/* CANLI · yalnız 0001_deneme_esigi geçişi (eklemeli: score_watches + notifications). Önce durum okunur:
   bekleyen geçiş TAM OLARAK bu olmalı ve uygulanmış geçişlerde değişiklik (drift) olmamalı; değilse durur.
   Başka hiçbir yönetim işlemi yapılmaz (tohum, Google, profil yok). */
const HOST = process.env.ADAY_HOST, MODE = process.env.MODE;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const d0 = await (await fetch(admin, { headers: H })).json();
const pend = d0.migrations?.pending ?? [], drift = d0.migrations?.drift ?? [];
console.log(`ÖNCE: env=${d0.env} uygulanmış=${(d0.migrations?.applied ?? []).map((a) => a.tag).join(",")} bekleyen=${pend.join(",")} drift=${drift.join(",") || "-"}`);
if (d0.env !== "production") { console.log("✗ canlı ortam değil"); process.exit(1); }
if (drift.length || pend.length !== 1 || pend[0] !== "0001_deneme_esigi") {
  if (!pend.length && (d0.migrations?.applied ?? []).some((a) => a.tag === "0001_deneme_esigi")) { console.log("✓ geçiş zaten uygulanmış"); process.exit(0); }
  console.log("✗ beklenmeyen geçiş durumu; durduruldu"); process.exit(1);
}
if (MODE !== "uygula") { console.log("✓ ön kontrol tamam (uygulanmadı)"); process.exit(0); }
const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "migrate", confirm: "EVET", target: "production" }) });
const j = await r.json().catch(() => ({}));
const okk = r.ok && (j.applied ?? []).includes("0001_deneme_esigi") && (j.status?.pending ?? ["?"]).length === 0 && !(j.status?.drift ?? []).length;
console.log(`${okk ? "✓" : "✗"} canlı geçiş · HTTP ${r.status} uygulanan=${(j.applied ?? []).join(",")} bekleyen=${(j.status?.pending ?? []).join(",") || "-"} ${j.error ?? ""}`);
process.exit(okk ? 0 : 1);

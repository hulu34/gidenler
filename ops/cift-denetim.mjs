/* ÜRETİM · YALNIZ OKUMA. 0004 öncesi çift deneyim ön denetimi. Yalnız GET ?rapor=puan (write:false kuru hesap) ve GET (geçiş durumu).
   POST yok, yazma yok. Log: ortam, sayılar ve slug; kullanıcı kimliği, metin veya e-posta yok.
   Kapsam sınırı: puan raporu yalnız yayımlanmış + önerilen + test/işletme dışı yazarları görür; pending/hidden ve test hesapları bu yolla görülmez. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, A = `https://${process.env.PROD_HOST}/api/admin/db/`;
const g = await fetch(A, { headers: H }); const d = await g.json().catch(() => ({}));
console.log("ortam", d.env, "http", g.status, "bekleyen_gecis", JSON.stringify(d.migrations?.pending ?? d.status?.pending ?? null));
if (d.env !== "production") { console.log("DUR: hedef üretim değil"); process.exit(1); }
const r = await fetch(`${A}?rapor=puan`, { headers: H }); const p = await r.json().catch(() => ({}));
console.log("puan http", r.status, "mekan", p.places, "yayin", p.publish);
const rows = p.rows ?? [];
const cift = rows.filter((x) => x.reviews > x.authors);
console.log("toplam_yayimli_deneyim", rows.reduce((s, x) => s + x.reviews, 0), "toplam_yazar_mekan_cifti", rows.reduce((s, x) => s + x.authors, 0));
console.log("AYNI_YAZAR_BIRDEN_FAZLA_YAYIMLI_DENEYIM_OLAN_MEKAN", cift.length, JSON.stringify(cift.map((x) => ({ slug: x.slug, reviews: x.reviews, authors: x.authors }))));
console.log("eylem_dagilimi", JSON.stringify(rows.reduce((m, x) => ((m[x.action] = (m[x.action] ?? 0) + 1), m), {})));

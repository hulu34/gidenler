/* CANLI · yalnız okuma: Japon Erdal'ın Google bağlantısı etkin mi, canlı sürüm yeni kodu çalıştırıyor mu. Hiçbir yazım yok. */
const HOST = process.env.ADAY_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const r = await (await fetch(`${admin}?rapor=profil&slug=japon-erdal-beyoglu`, { headers: H })).json();
ok("canlı ortam", r.env === "production", r.env);
const g = r.google?.identifiers ?? [];
ok("canlı sürüm Google eşleşme raporunu veriyor (yeni kod)", Array.isArray(r.google?.identifiers));
ok("Japon Erdal Google bağlantısı onaylı ve etkin, tek kayıt", g.length === 1 && g[0].status === "confirmed" && g[0].externalId === "ChIJTXrsLQC5yhQRxzcQykMqecg", g.map((x) => `${x.externalId}:${x.status}`).join(","));
ok("pasifleştirme denetimi yok (canlıda hiçbir eşleşme kapatılmadı)", (r.google?.audits ?? []).length === 0);
ok("profil duruyor (menü 4 kalem)", r.profile?.menu?.sections?.reduce((a, s) => a + s.items.length, 0) === 4);
const top = await (await fetch(admin, { headers: H })).json().catch(() => ({}));
ok("mükerrer inceleme listesi raporda", Array.isArray(top.duplicateReview), `aday çift=${top.duplicateReview?.length ?? "-"}`);
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);

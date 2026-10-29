/* Tek Google eşleşmesini pasifleştirme / geri etkinleştirme · YALNIZ PREVIEW (örnek kayıtlarla).
   Örnek eşleşmeler google-fixture ile kurulur (externalId TEST_FIXTURE_…) ve sonda yalnız onlar kaldırılır.
   Doğrulanan: önizleme tek kayıt; yanlış/eksik hedef reddi; yalnız hedef bağlantının değişmesi; restoran ve profil
   içeriğinin korunması; tekrar uygulama; geri etkinleştirme; denetim kaydı. Üretime hiçbir istek gitmez. */
const HOST = process.env.PREVIEW_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const rapor = async (s) => (await fetch(`${admin}?rapor=profil&slug=${s}`, { headers: H })).json();
const post = async (b) => { const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ target: "preview", ...b }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const icerik = (r) => JSON.stringify({ place: r.place, profile: r.profile, videos: r.videos, counts: r.counts });
/* örnek için Google kaydı OLMAYAN iki profilli mekân seçilir (varsa öncelik içerik dosyalarındaki restoranlar) */
const { readdirSync } = await import("node:fs");
const aday = readdirSync(new URL("./profil/", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
  .concat(["ciya-sofrasi-kadikoy", "kronotrop-cihangir-beyoglu", "leb-i-derya-beyoglu", "pandeli-fatih"]);
const secilen = [];
for (const s of aday) { const r = await rapor(s); if (r.place && !(r.google?.identifiers ?? []).length) secilen.push(s); if (secilen.length === 2) break; }
const [A, B] = secilen;
console.log(`  örnek mekânlar: ${secilen.join(", ")}`);

const a0 = await rapor(A ?? aday[0]);
ok("hedef ortam preview", a0.env === "preview", `env=${a0.env}`);
if (a0.env !== "preview" || secilen.length < 2) process.exit(1);
const fx = await post({ action: "google-fixture", confirm: "EVET", slugs: [A, B] });
const fa = fx.j.made?.find((m) => m.slug === A), fb = fx.j.made?.find((m) => m.slug === B);
ok("örnek eşleşmeler kuruldu (auto + confirmed)", fx.status === 200 && fa?.status === "auto" && fb?.status === "confirmed", JSON.stringify(fx.j).slice(0, 160));
if (!fa || !fb) { await post({ action: "google-fixture", confirm: "EVET", mode: "remove" }); process.exit(1); }
const A1 = await rapor(A), B1 = await rapor(B);
const st = (r, id) => r.google?.identifiers?.find((g) => g.id === id)?.status;

const pv = await post({ action: "google-disable", placeId: fa.placeId, identifierId: fa.identifierId });
ok("önizleme: yalnız etkilenecek tek kayıt gösterilir, değişiklik yok", pv.status === 200 && pv.j.preview === true && pv.j.target?.identifierId === fa.identifierId && pv.j.target?.next === "disabled" && st(await rapor(A), fa.identifierId) === "auto");
const yanlis = [
  await post({ action: "google-disable", confirm: "PASIFLESTIR", why: "test", admin: "ops" }),
  await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, why: "test hedef", admin: "ops" }),
  await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, identifierId: fb.identifierId, why: "test hedef", admin: "ops" }),
  await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, identifierId: fa.identifierId, slug: B, why: "test hedef", admin: "ops" }),
  await post({ action: "google-disable", confirm: "EVET", placeId: fa.placeId, identifierId: fa.identifierId, why: "test hedef", admin: "ops" }),
  await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, identifierId: fa.identifierId, admin: "ops" }),
];
const A2 = await rapor(A), B2 = await rapor(B);
ok("eksik/uyuşmayan hedef, yanlış onay sözcüğü, eksik neden: hepsi reddedilir, hiçbir şey değişmez",
  yanlis.every((y) => y.status === 400) && st(A2, fa.identifierId) === "auto" && st(B2, fb.identifierId) === "confirmed", yanlis.map((y) => y.j.error).join(","));

const d = await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, identifierId: fa.identifierId, slug: A, why: "Preview testi: yanlış eşleşme senaryosu", admin: "ops-test" });
const A3 = await rapor(A), B3 = await rapor(B);
ok("pasifleştirme uygulandı: hedef 'disabled'", d.status === 200 && d.j.after === "disabled" && st(A3, fa.identifierId) === "disabled", `denetim=${d.j.auditId}`);
ok("diğer eşleşme değişmedi", st(B3, fb.identifierId) === "confirmed" && icerik(B3) === icerik(B1));
ok("restoran ve profil içeriği (yer, menü, kaynaklar, videolar) korundu", icerik(A3) === icerik(A1));
const au = A3.google?.audits?.find((x) => x.id === d.j.auditId);
ok("denetim: neden, yönetici, zaman, önceki/yeni durum", au?.action === "google_disable" && au.actor === "admin:ops-test" && !!au.at && au.detail?.before === "auto" && au.detail?.after === "disabled" && au.detail?.why?.startsWith("Preview testi"));
const tekrar = await post({ action: "google-disable", confirm: "PASIFLESTIR", placeId: fa.placeId, identifierId: fa.identifierId, why: "tekrar uygulama", admin: "ops-test" });
ok("tekrar uygulama reddedilir, yeni denetim yok", tekrar.status === 400 && tekrar.j.error === "not_active" && (await rapor(A)).google.audits.length === A3.google.audits.length);
const sayfa = await fetch(`https://${HOST}/mekan/${A}/`, { headers: H });
ok("restoran sayfası açılıyor", sayfa.status === 200);

const epv = await post({ action: "google-enable", placeId: fa.placeId, identifierId: fa.identifierId });
const e = await post({ action: "google-enable", confirm: "ETKINLESTIR", placeId: fa.placeId, identifierId: fa.identifierId, slug: A, why: "Preview testi: geri etkinleştirme", admin: "ops-test" });
const A4 = await rapor(A);
const eau = A4.google?.audits?.find((x) => x.id === e.j.auditId);
ok("geri etkinleştirme: önizleme + açık onay; önceki durum geri geldi; denetim yazıldı",
  epv.j.preview === true && epv.j.target?.next === "auto" && e.status === 200 && st(A4, fa.identifierId) === "auto" && eau?.action === "google_enable" && eau.detail?.before === "disabled" && eau.detail?.after === "auto");
ok("geri etkinleştirmeden sonra içerik aynı", icerik(A4) === icerik(A1) && icerik(await rapor(B)) === icerik(B1));

const rm = await post({ action: "google-fixture", confirm: "EVET", mode: "remove" });
ok("yalnız örnek eşleşmeler kaldırıldı", rm.status === 200 && rm.j.removed === 2, `kaldırılan=${rm.j.removed}`);
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);

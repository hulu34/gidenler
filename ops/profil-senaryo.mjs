/* Restoran profili · kayıt senaryoları GERÇEK Neon HTTP sürücüsüyle (Preview, kendi Neon dalı). Üretime yazmaz.
   1 aynı içerik tekrar · 2 aynı gün değişen menü · 3 eşzamanlı iki uygulama · 4 yazım ortasında zorlanan hata
   5 geri alma · 6 bir videonun başarısız olması · 7 son durum: gerçek içerik. Log yalnız doğru/yanlış ve sayılar. */
import { readFileSync } from "node:fs";
const HOST = process.env.PREVIEW_HOST, SLUG = "pandeli-fatih";
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const rapor = async () => (await fetch(`${admin}?rapor=profil&slug=${SLUG}`, { headers: H })).json();
const apply = async (profile, extra = {}) => { const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "preview", profile, ...extra }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const base = JSON.parse(readFileSync(new URL(`./profil/${SLUG}.json`, import.meta.url), "utf8"));
const { videos, ...noVideo } = base;
const clone = () => structuredClone(noVideo);
const nItems = base.menu.sections.reduce((a, s) => a + s.items.length, 0);
const r0 = await rapor();
ok("hedef ortam preview", r0.env === "preview", `env=${r0.env}`);
if (r0.env !== "preview") process.exit(1);

/* başlangıç: gerçek içerik (yeni kodla) */
const a0 = await apply(clone());
ok("gerçek içerik uygulandı", a0.status === 200 && a0.j.ok, `alan=${a0.j.fields} menü=${a0.j.menuItems}`);
const r1 = await rapor();
/* 1 aynı içerik tekrar */
const a1 = await apply(clone());
const r2 = await rapor();
ok("1 · aynı içerik tekrar: menü ve kaynak kaydı çoğalmaz", a1.j.ok && a1.j.unchanged === true && r2.counts.menuRows === r1.counts.menuRows && r2.counts.provRows === r1.counts.provRows, `menü ${r1.counts.menuRows}→${r2.counts.menuRows} kaynak ${r1.counts.provRows}→${r2.counts.provRows}`);
/* 2 aynı gün değişen menü */
const fixed = clone(); fixed.menu.sections[1].items[0].name = "Közlenmiş Patlıcan Salatası (düzeltildi)";
const a2 = await apply(fixed); const r3 = await rapor();
ok("2 · aynı gün değişen menü uygulanır", a2.j.ok && r3.profile.menu.sections[1].items[0].name.endsWith("(düzeltildi)") && r3.profile.menu.sections.reduce((a, s) => a + s.items.length, 0) === nItems, `sürüm ${a0.j.menuVersion?.slice(0, 10)}→${a2.j.menuVersion?.slice(0, 10)}`);
/* 3 eşzamanlı iki uygulama */
const b1 = clone(); b1.menu.sections[0].items[0].name = "Günün Çorbası (B1)";
const b2 = clone(); b2.menu.sections[0].items[0].name = "Günün Çorbası (B2)";
const [c1, c2] = await Promise.all([apply(b1), apply(b2)]);
const r4 = await rapor(); const first = r4.profile.menu.sections[0].items[0].name;
ok("3 · eşzamanlı iki uygulama: tek ve tam bir sürüm, karışma yok", c1.j.ok && c2.j.ok && ["Günün Çorbası (B1)", "Günün Çorbası (B2)"].includes(first) && r4.profile.menu.sections.reduce((a, s) => a + s.items.length, 0) === nItems && r4.profile.menu.sections[1].items[0].name === "Közlenmiş Patlıcan Salatası", `sayfadaki: ${first}`);
/* 4 yazım ortasında zorlanan hata */
const snap = (r) => JSON.stringify({ p: r.profile, pl: r.place, c: r.counts, a: r.audits?.[0]?.id });
const s0 = snap(await rapor());
const broken = clone(); broken.phone.value = "+90 000 000 00 00"; broken.address.value = "YARIM KALMAMALI"; broken.menu.sections[0].items[0].name = "YARIM KALMAMALI";
const a4 = await apply(broken, { simulateFailure: true });
const s1 = snap(await rapor());
ok("4 · yazım ortasında hata: hiçbir şey değişmez (profil, kimlik, menü, kaynak, denetim)", a4.status === 500 && a4.j.error === "apply_failed_rolled_back" && s0 === s1, `durum=${a4.status}`);
/* 5 geri alma (yalnız son uygulama) */
const tel = clone(); tel.phone.value = "+90 212 999 99 99";
const a5 = await apply(tel); const r5 = await rapor();
const rb = await (await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-rollback", confirm: "GERI-AL", target: "preview", auditId: a5.j.auditId }) })).json();
const r6 = await rapor();
const old = await (await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-rollback", confirm: "GERI-AL", target: "preview", auditId: a0.j.auditId }) })).json();
ok("5 · geri alma: telefon ve kimlik alanı önceki haline döner; eski uygulama geri alınamaz", r5.profile.phone.value === "+90 212 999 99 99" && rb.ok && r6.profile.phone.value === "+90 212 527 39 09" && r6.place.phone === "+90 212 527 39 09" && old.ok === false && old.error === "not_latest");
/* 6 bir video başarısız */
const v6 = await apply(clone(), { }).then(() => fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "preview", profile: { ...clone(), videos: [...videos, { url: "https://www.youtube.com/watch?v=AAAAAAAAAAA", credit: "olmayan video" }] } }) }));
const j6 = await v6.json();
ok("6 · bir video başarısız: tam başarı raporlanmaz (207)", v6.status === 207 && j6.ok === false && j6.profileOk === true && j6.videosOk === videos.length && j6.videosTotal === videos.length + 1, `durum=${v6.status} video ${j6.videosOk}/${j6.videosTotal}`);
/* 7 son durum: gerçek içerik + videolar */
const a7 = await apply({ ...clone(), videos }); const r7 = await rapor();
ok("7 · son durum gerçek içerik ve 4 video", a7.status === 200 && a7.j.ok && r7.profile.menu.sections[0].items[0].name === "Günün Çorbası" && r7.profile.menu.sections[1].items[0].name === "Közlenmiş Patlıcan Salatası" && r7.videos.length === 4 && r7.profile.phone.value === "+90 212 527 39 09", `menü satırı ${r7.counts.menuRows}, kaynak ${r7.counts.provRows}`);
console.log(`${res.filter(Boolean).length}/${res.length}`); process.exit(res.every(Boolean) ? 0 : 1);

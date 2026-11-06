/* ÜRETİM · veri kalitesi yayını (sahip onayı 2026-11-06 "Yes, release it"). Alan adı atanmamış dağıtımda:
   son Excel'i yeni kurallarla YENİDEN AKTARIR (yanlış tür/kapalı kayıtlar gizlenir, sınırlı görünüm sayıları boşalır),
   ardından görünürlük kontrolleri. Silme yok. Log: yalnız sayılar. */
const B = `https://${process.env.PROD_HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const J = { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const A = `${B}/api/admin/google-puan/`;
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const post = async (o) => { const r = await fetch(A, { method: "POST", headers: J, body: JSON.stringify({ target: "production", confirm: "EVET", holder: "yayin-kalite-2", ...o }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const page = async (p) => { const r = await fetch(`${B}${p}`, { headers: H }); return { s: r.status, t: await r.text() }; };
const r0 = await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json();
ok("rapor ucu üretimde", r0.env === "production", JSON.stringify({ shown: r0.site?.shown, hidden: r0.site?.hidden }));
const lk = await post({ op: "kilit-al", ttl: 600 }); ok("kilit alındı (günlük işle çakışma yok)", lk.s === 200 && lk.j.ok);
const fid = (await fetch(`${A}?dosya=son`, { headers: H })).headers.get("x-dosya-id");
const ak = await post({ op: "aktar", fileId: fid });
await post({ op: "kilit-birak" });
ok("son Excel yeni kurallarla yeniden aktarıldı", ak.s === 200 && ak.j.status === "applied", JSON.stringify({ written: ak.j.written, changed: ak.j.changed, hidden: ak.j.hidden, importable: ak.j.importable, errors: (ak.j.errors ?? []).length }));
await new Promise((r) => setTimeout(r, 5000));
const r1 = await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json();
console.log("sonra", JSON.stringify({ shown: r1.site?.shown, hidden: r1.site?.hidden, final: r1.final }));
ok("sitede gösterilen 226, gizlenen 3", r1.site?.shown === 226 && r1.site?.hidden === 3, JSON.stringify(r1.site));
const g = (t) => /data-google-kayitli/.test(t);
for (const s of ["adile-hanim-konagi-beyoglu", "nostalji-cafe-ve-restaurant-sile", "millet-sofrasi-beykoz"]) { const p = await page(`/mekan/${s}/`); ok(`${s}: puan gizli, profil açık`, p.s === 200 && !g(p.t)); }
for (const s of ["pandeli-fatih", "hacibasar-kebap-atasehir"]) { const p = await page(`/mekan/${s}/`); ok(`${s}: doğru puan görünüyor`, p.s === 200 && g(p.t)); }
const home = await page("/"); ok("ana sayfada Nostalji yok, sıralı Google satırı yok", home.s === 200 && !/Nostalji Cafe/.test(home.t) && !home.t.includes("/mekan/gasto-nisantasi-sisli/"));
ok("ana sayfada değerlendirme sayısına dayalı Google sıralaması yok (Filizler 105 kalktı)", !/105 değerlendirme|351 değerlendirme/.test(home.t));
ok("nihai durumda 42 kapalı, 226 doğrulanmış", r1.final?.["Kalıcı kapalı"] === 42 && r1.final?.["Puan doğrulandı (sitede)"] === 226, JSON.stringify(r1.final));
const cp = await page("/mekan/gasto-nisantasi-sisli/"); ok("kesin kapalı profilde not", cp.s === 200 && /data-kapanis="kesin"/.test(cp.t));
const yn = await page("/yonetim/google-puan/"); ok("yönetici raporu korumalı adreste açılıyor", yn.s === 200 && /data-gpuan-rapor/.test(yn.t));
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);

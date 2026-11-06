/* ÜRETİM · Google puan sistemi durum kontrolü (sahip onayı 2026-11-06 "Evet, Production'a al").
   Yalnız okuma. Log: yalnız sayılar. */
const B = `https://${process.env.PROD_HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const j = async (p) => { const r = await fetch(`${B}${p}`, { headers: H }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const st = await j("/api/admin/google-puan/");
ok("yönetim ucu üretimde", st.s === 200 && st.j.env === "production", `${st.s} ${st.j.env}`);
ok("Excel mekân sayısı 456", st.j.venues === 456, st.j.venues);
console.log("puan istatistiği", JSON.stringify(st.j.stats ?? null), "dosya", (st.j.files ?? []).length, "aktarım", (st.j.imports ?? []).length);
const id = await j("/api/admin/google-puan/?rapor=kimlik");
const n = Object.keys(id.j.ids ?? {}).length; ok("üretim Google kimlikleri okunuyor", id.s === 200 && n > 300, n);
const www = await fetch("https://www.gidenler.com/api/admin/google-puan/"); ok("alan adında yönetim ucu kapalı", www.status === 404, www.status);
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);

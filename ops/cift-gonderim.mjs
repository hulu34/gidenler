/* E — ÇİFT GÖNDERİM · YALNIZ PREVIEW (izole Neon dalı). Gerçek uç /api/reviews, test hesabı oturumu.
   100 eşzamanlı aynı gönderim + zaman aşımı sonrası tekrar + farklı ay. Log yalnız sayı; kişisel veri yok. */
import { mkdirSync, writeFileSync } from "node:fs";
const HOST = process.env.PREVIEW_HOST, BASE = `https://${HOST}`, OUT = "out/cift"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const ad = `${BASE}/api/admin/db/`;
const son = []; const ok = (n, c, i = "") => { son.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(ad, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const d = await (await fetch(ad, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("geçişler (0004 dahil) Preview'a uygulandı", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0, JSON.stringify(mg.j.status?.pending ?? mg.j));
const yeniHesap = async () => (await admin({ action: "medya-test-oturum" })).j;
const U = await yeniHesap(), U2 = await yeniHesap(), U3 = await yeniHesap();
const apiOf = (u) => (p, { method = "GET", body } = {}) => fetch(`${BASE}${p}`, { method, body, redirect: "manual", headers: { ...HB, cookie: `${u.cookieName}=${u.cookieValue}`, ...(method !== "GET" ? { origin: BASE, "content-type": "application/json" } : {}) } });
const api = apiOf(U), api2 = apiOf(U2), api3 = apiOf(U3);
const SL = "kanaat-lokantasi-uskudar";
const m1 = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 7), m2 = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 7);
const g = { body: "Çift gönderim testi için yazılmış örnek deneyim metni; öğlen gidildi, servis hızlıydı ve sulu yemekler sıcaktı.", visitMonth: m1, overall: 8, ratings: {}, returnIntent: "evet", disclosure: "none" };
const sayOf = (a) => async () => ((await (await a(`/api/me/reviews/?slug=${SL}`)).json().catch(() => ({}))).reviews ?? []);
const say = sayOf(api), say2 = sayOf(api2), say3 = sayOf(api3);
ok("başlangıçta bu test hesabının deneyimi yok", (await say()).length === 0);
/* 100 eşzamanlı aynı gönderim */
const t0 = Date.now();
const rs = await Promise.all(Array.from({ length: 100 }, () => api("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g }) }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) })).catch((e) => ({ s: 0, j: { error: String(e).slice(0, 60) } }))));
const by = {}; for (const r of rs) { const k = `${r.s}${r.j?.replay ? "-tekrar" : r.j?.error ? "-" + r.j.error : ""}`; by[k] = (by[k] ?? 0) + 1; }
const kayit = await say();
const yeni = rs.filter((r) => r.s === 201).length;
console.log(`  · 100 eşzamanlı istek (${Date.now() - t0} ms): ${JSON.stringify(by)}; veritabanındaki deneyim ${kayit.length}; puan yeniden hesabını tetikleyen (201) ${yeni}`);
ok("E: 100 eşzamanlı aynı gönderim → veritabanında tek deneyim", kayit.length === 1, kayit.length);
ok("E: yalnız bir istek yeni kayıt (201) ve tek puan hesabı", yeni === 1, yeni);
ok("E: başarılı yanıtların hepsi aynı kaydı gösterir", rs.filter((r) => r.s === 200 || r.s === 201).every((r) => r.j.id === kayit[0]?.id));
ok("E: sunucu hatası yok (5xx/ağ)", rs.every((r) => r.s && r.s < 500), JSON.stringify(by));
/* zaman aşımı sonrası tekrar (ayrı hesap: saatlik 5 gönderim sınırı ilk turda doldu) — kilit süresi (15 sn) geçtikten sonra aynı gönderim */
const first2 = await api2("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g }) });
const f2 = await first2.json().catch(() => ({}));
await new Promise((r) => setTimeout(r, 16000));
const again = await api2("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g }) });
const aj = await again.json().catch(() => ({}));
ok("E: zaman aşımından sonra aynı gönderim başarı (tekrar) döner, yeni kayıt yok", first2.status === 201 && again.status === 200 && aj.replay === true && aj.id === f2.id, `${first2.status} → ${again.status} ${aj.replay ?? aj.error ?? ""}`);
ok("E: tekrardan sonra tek deneyim", (await say2()).length === 1);
const diff = await api2("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g, body: g.body + " Tatlı da güzeldi." }) });
ok("E: aynı ay, farklı metin ikinci kayıt açmaz (409 exists)", diff.status === 409 && (await diff.json().catch(() => ({}))).error === "exists", diff.status);
const diffScore = await api2("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g, overall: 3 }) });
ok("E: aynı metin farklı puanla tekrar sayılmaz (409, puan sessizce yutulmaz)", diffScore.status === 409, diffScore.status);
/* farklı ay: ayrı ve gerçek ikinci deneyim (ayrı hesap) */
const v1 = await api3("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g }) });
const v2 = await api3("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...g, visitMonth: m2, body: "Daha önceki bir ziyaretim; akşamüstü gittik, kuru fasulye iyiydi ama salon kalabalıktı." }) });
const son3 = await say3();
ok("E: farklı aydaki ziyaret ayrı deneyim olarak yazılır", v1.status === 201 && v2.status === 201 && son3.length === 2, `${v1.status} ${v2.status} n=${son3.length}`);
const son2 = [...(await say()), ...(await say2()), ...son3];
/* temizlik: test deneyimleri silinir (kullanıcı silme yolu) */
for (const [a, f] of [[api, say], [api2, say2], [api3, say3]]) for (const r of await f()) await a(`/api/reviews/${r.id}/`, { method: "DELETE" });
ok("temizlik: test deneyimleri kaldırıldı", [...(await say()), ...(await say2()), ...(await say3())].filter((r) => r.status !== "removed").length === 0);
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify({ by, kayit: kayit.length, yeni, son: son2.length }, null, 1));
const k = son.filter((x) => !x[1]).length; console.log(`SONUÇ ${son.length - k}/${son.length}`); process.exit(k ? 1 : 0);

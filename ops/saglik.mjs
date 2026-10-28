/* Sağlık kontrolü (yalnız okuma, Google'a ücretli çağrı yok): ana sayfa, mekân sayfası, Google durum ucu,
   korumasız erişim reddi, yönetim raporu (eşleşme sayıları, kuyruk, harcama), Redis anahtar denetimi. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TOPLU_HOST;
const auth = { "x-vercel-protection-bypass": BYPASS, "user-agent": "Mozilla/5.0 Chrome/130" };
const st = async (p, h = auth) => { try { const r = await fetch(`https://${HOST}${p}`, { headers: h, redirect: "manual" }); return { s: r.status, j: await r.json().catch(() => null) }; } catch { return { s: 0 }; } };
const checks = [];
const ok = (n, c, info = "") => { checks.push(c); console.log(`${c ? "✓" : "✗"} ${n} ${info}`); };
ok("korumasız istek reddediliyor", [302, 401, 403].includes((await st("/", {})).s));
ok("ana sayfa", (await st("/")).s === 200);
ok("mekân sayfası", (await st("/mekan/700-gram-kadikoy/")).s === 200);
const s1 = await st("/api/google/place/?slug=700-gram-kadikoy&part=status");
ok("Google durum ucu (ücretsiz, kayıtlı kimlik var)", s1.s === 200 && s1.j?.available === true);
const s2 = await st("/api/google/place/?slug=boyle-bir-mekan-yok&part=status");
ok("bilinmeyen mekân 404", s2.s === 404);
const g = await st("/api/admin/db/?rapor=google");
ok("yönetim raporu", g.s === 200 && g.j?.enabled === true, JSON.stringify({ stats: g.j?.stats, queue: g.j?.queue, spendUsd: g.j?.spend?.usd }));
const rd = await st("/api/admin/db/?rapor=redis");
ok("Redis okunuyor", rd.s === 200 && typeof rd.j?.total === "number", `anahtar=${rd.j?.total}`);
process.exit(checks.every(Boolean) ? 0 : 1);

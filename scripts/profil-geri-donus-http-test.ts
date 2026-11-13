/* PROFİL + VİDEO GERİ DÖNÜŞ KABULÜ (issue #41) — gerçek Next HTTP yönetim yolu + izole PostgreSQL (PGlite soketi).
   Production'a ya da Neon'a bağlanmaz. Sahte kullanıcı/deneyim/Google kaydı yalnız bu bellekteki veritabanında.
   Akış: PGlite (göçler + 793 mekân + sahte sabitler) → soket → `next start` (DB_DRIVER=pg, DB_ADMIN_LOCAL=1) → /api/admin/db.
   Kontroller ayrı ayrı raporlanır; her biri başarısız olsa da test sürer (kırmızı → yeşil kanıtı için).
   Ön koşul: `npm run build` (bu dalın derlemesi). Çalıştır: npx tsx scripts/profil-geri-donus-http-test.ts [--grup A,B,C,D,E] [--port 3601]
   oEmbed için YouTube'a gerçek istek atılır (anahtarsız); ağ hatası senaryosu yalnız yerel/Preview test kancasıyla. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { realVenueRecords } from "../data/real";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const GRUP = new Set((arg("--grup") ?? "A,B,C,D,E").split(","));
const PORT = Number(arg("--port") ?? 3601), DBPORT = Number(arg("--dbport") ?? 55441);
const BASE = `http://127.0.0.1:${PORT}`;
const PR40 = ["ulus-29-besiktas", "sunset-grill-ve-bar-besiktas", "topaz-beyoglu", "murver-beyoglu", "lokanta-1741-fatih", "1924-istanbul-beyoglu", "alaf-besiktas", "haci-abdullah-beyoglu", "kanaat-lokantasi-uskudar", "ciya-sofrasi-kadikoy", "tarihi-sultanahmet-koftecisi-selim-usta-fatih", "park-fora-besiktas"];
const PR39 = ["turk-fatih-tutak-sisli", "nicole-beyoglu", "mutfakkoz-kadikoy", "cuma-beyoglu", "fauna-atasehir", "aida-vino-e-cucina-kadikoy", "mikla-turkey-fusion-beyoglu", "aseka-beyoglu", "calipso-fish-maltepe", "rumelihisari-iskele-sariyer", "sade-bes-denizler-mutfagi-sisli", "deraliye-fatih", "tavaci-recep-usta-bostanci-maltepe", "ali-ocakbasi-karakoy-beyoglu"];
const prof = (slug: string) => JSON.parse(readFileSync(`content/profiles/${slug}.json`, "utf8")) as Record<string, any>;

let pass = 0, fail = 0; const kayit: { grup: string; ad: string; ok: boolean; ayrinti?: unknown }[] = [];
let grup = "";
const ok = (ad: string, k: boolean, d?: unknown) => { kayit.push({ grup, ad, ok: k, ...(k ? {} : { ayrinti: d }) }); if (k) pass++; else { fail++; console.log(`  ✗ [${grup}] ${ad}`, d === undefined ? "" : JSON.stringify(d).slice(0, 300)); } };

async function post(body: Record<string, unknown>) {
  const r = await fetch(`${BASE}/api/admin/db`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: "local", ...body }) });
  let j: any = null; try { j = await r.json(); } catch { /* boş */ }
  return { status: r.status, j };
}
const apply = (profile: Record<string, unknown>, extra: Record<string, unknown> = {}) => post({ action: "profile-apply", confirm: "EVET", profile, ...extra });
const rollback = (auditId: string) => post({ action: "profile-rollback", confirm: "GERI-AL", auditId });

async function main() {
  /* ── izole veritabanı ── */
  const pg = new PGlite(); const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x); await seedRealVenues(db, realVenueRecords);
  const q = async <T = any>(s: string, p: unknown[] = []) => (await pg.query<T>(s, p)).rows;
  const pid = async (slug: string) => (await q<{ id: string }>("select id from places where slug=$1", [slug]))[0]?.id;
  /* sahte sabitler: kullanıcı + deneyim + Google kimliği (hedef dışı veri bozulmamalı) ve önceden var olan ortak video */
  const pandeli = await pid("pandeli-fatih"), menemen = await pid("menemen-besiktas");
  await q(`insert into "user"(id,name,email,email_verified,created_at,updated_at) values('u_test','Test Kullanıcı','test@example.invalid',true,now(),now())`);
  await q(`insert into reviews(id,place_id,user_id,visited_on,overall,ratings,body,status,created_at,updated_at) values('rv_test',$1,'u_test','2026-11-01',8,'{"yemek":8}','Sahte test deneyimi','published',now(),now())`, [pandeli]);
  await q(`insert into place_identifiers(id,place_id,provider,external_id,created_at) values('pi_test',$1,'google','sahte-test-kimligi',now())`, [pandeli]).catch((e) => { console.log("place_identifiers sabiti eklenemedi:", String(e).slice(0, 120)); });
  await q(`insert into media_items(id,type,platform,url,external_id,storage_class,category,credit,source,status,sponsored,created_at) values('med_ortak','embed','youtube','https://www.youtube.com/watch?v=4NQLZfOqg2w','4NQLZfOqg2w','id_only','influencer','Önceki atıf (sahte)','editor','approved',true,now())`);
  await q(`insert into media_places(media_id,place_id) values('med_ortak',$1)`, [pandeli]);
  /* önceden kaldırılmış video (yeniden yayımlanmamalı) */
  await q(`insert into media_items(id,type,platform,url,external_id,storage_class,category,credit,source,status,sponsored,created_at) values('med_kaldirilmis','embed','youtube','https://www.youtube.com/watch?v=GKQ57GNhggQ','GKQ57GNhggQ','id_only','editor','Kaldırılmış (sahte)','editor','removed',false,now())`);
  const server = new PGLiteSocketServer({ db: pg, port: DBPORT, host: "127.0.0.1", maxConnections: 20 } as never);
  await server.start();

  /* ── gerçek Next sunucusu ── */
  let next: ChildProcess | null = null;
  if (!process.argv.includes("--no-server")) {
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${DBPORT}/postgres?sslmode=disable`, DB_DRIVER: "pg", DB_ADMIN_LOCAL: "1", NODE_ENV: "production" };
    for (const k of ["VERCEL", "VERCEL_ENV", "VERCEL_URL", "DATABASE_URL_UNPOOLED", "NEXT_PUBLIC_SHOW_DEMO"]) delete env[k];
    next = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"] });
    next.stderr?.on("data", (b) => { const s = String(b); if (/error/i.test(s)) process.stderr.write(`[next] ${s}`); });
    for (let i = 0; i < 120; i++) { try { const r = await fetch(`${BASE}/`); if (r.status) break; } catch { /* bekle */ } await new Promise((r) => setTimeout(r, 500)); }
  }

  const vids = async (slug: string) => q<{ id: string; external_id: string; credit: string; sponsored: boolean; status: string }>(
    `select m.id, m.external_id, m.credit, m.sponsored, m.status from media_items m join media_places mp on mp.media_id=m.id join places p on p.id=mp.place_id where p.slug=$1 and m.status='approved' order by m.external_id`, [slug]);
  const profVar = async (slug: string) => Number((await q<{ n: number }>(`select count(*)::int n from field_provenance fp join places p on p.id=fp.place_id where p.slug=$1 and fp.field like 'profile.%'`, [slug]))[0].n) > 0;
  const hedefDisi = async (haric: string[]) => createHash("sha256").update(JSON.stringify(await q(`select slug,name,address,phone,website,instagram,opening_hours,lat,lng from places where not (slug = any($1)) order by slug`, [haric]))).digest("hex");
  const korunan = async () => JSON.stringify({ u: await q(`select id,email from "user" order by id`), r: await q(`select id,place_id,status from reviews order by id`), pi: await q(`select count(*)::int n from place_identifiers`), ortak: await q(`select id,credit,sponsored,status from media_items where id in ('med_ortak','med_kaldirilmis') order by id`), ortakBag: await q(`select media_id,place_id from media_places where media_id in ('med_ortak','med_kaldirilmis') order by 1,2`) });
  const T0 = await korunan(), H0 = await hedefDisi([...PR40, ...PR39, "menemen-besiktas"]);

  /* Menemen: yayındaki profil ve tek sponsorlu videosu önceden uygulanmış durum (korunmalı) */
  const men = await apply(prof("menemen-besiktas"));
  const menV0 = JSON.stringify(await vids("menemen-besiktas"));
  ok("Menemen ön koşul: profil ve video uygulandı", men.status === 200 && (await profVar("menemen-besiktas")) && (await vids("menemen-besiktas")).length === 1, { s: men.status, e: men.j?.error });

  if (GRUP.has("A")) {
    grup = "A tekrar sonrası geri dönüş";
    const p = prof("ulus-29-besiktas");
    const a1 = await apply(p); const a2 = await apply(p);
    ok("ilk ve tekrar uygulama başarılı", a1.status === 200 && a2.status === 200, [a1.status, a2.status, a1.j?.error, a2.j?.error]);
    const r1 = await rollback(a1.j?.auditId);
    ok("tekrardan sonra asıl uygulama geri alınabilir (not_latest yok)", r1.status === 200, r1.j);
    ok("geri alma sonrası profil yok", !(await profVar("ulus-29-besiktas")));
    ok("geri alma sonrası video yok", (await vids("ulus-29-besiktas")).length === 0, await vids("ulus-29-besiktas"));
    const r1b = await rollback(a1.j?.auditId);
    ok("aynı geri almayı tekrar istemek güvenli (veri değişmez)", r1b.status === 200 && !(await profVar("ulus-29-besiktas")), r1b.j);
    const r2 = await rollback(a2.j?.auditId);
    ok("değişiklik yapmayan tekrarın geri alınması zararsız", r2.status === 200 && !(await profVar("ulus-29-besiktas")), r2.j);
    const a3 = await apply(p);
    ok("yeniden uygulama profil ve videoyu geri getirir", a3.status === 200 && (await profVar("ulus-29-besiktas")) && (await vids("ulus-29-besiktas")).length === (p.videos?.length ?? 0), { s: a3.status, v: (await vids("ulus-29-besiktas")).length });
    /* daha yeni farklı uygulama eski rollback ile ezilmemeli */
    const t = prof("topaz-beyoglu"); const b1 = await apply(t);
    const t2 = { ...t, description: { ...t.description, value: t.description.value + " (test: daha yeni farklı uygulama)" } };
    const b2 = await apply(t2); const rb = await rollback(b1.j?.auditId);
    const d = (await q<{ value: string }>(`select fp.value from field_provenance fp join places p on p.id=fp.place_id where p.slug='topaz-beyoglu' and fp.field='profile.description' order by fp.fetched_at desc, fp.id desc limit 1`))[0]?.value ?? "";
    ok("daha yeni farklı uygulama varken eski geri alma reddedilir", rb.status >= 400 && rb.status < 500 && d.includes("daha yeni farklı"), { s: rb.status, j: rb.j });
    const rb2 = await rollback(b2.j?.auditId); const rb1 = await rollback(b1.j?.auditId);
    ok("yeniden eskiye sırayla geri alma çalışır ve profil tamamen kalkar", rb2.status === 200 && rb1.status === 200 && !(await profVar("topaz-beyoglu")), [rb2.status, rb1.status, rb2.j, rb1.j]);
    /* eşzamanlı tekrar */
    const c = prof("murver-beyoglu"); const [c1, c2] = await Promise.all([apply(c), apply(c)]);
    const cv = await vids("murver-beyoglu");
    ok("eşzamanlı iki aynı uygulama: tek video ilişkisi, yinelenen yok", [c1.status, c2.status].some((s) => s === 200) && new Set(cv.map((v) => v.external_id)).size === cv.length && cv.length === c.videos.length, { s: [c1.status, c2.status], cv });
    for (const a of [c1, c2].filter((z) => z.j?.auditId)) await rollback(a.j.auditId);
    ok("eşzamanlı uygulamaların ikisi de geri alınınca profil ve video kalmaz", !(await profVar("murver-beyoglu")) && (await vids("murver-beyoglu")).length === 0, await vids("murver-beyoglu"));
  }

  if (GRUP.has("B")) {
    grup = "B 12 profil + 16 video tam geri dönüş";
    const ids: Record<string, string[]> = {};
    let toplamVideo = 0;
    for (const s of PR40) {
      const p = prof(s); toplamVideo += p.videos?.length ?? 0;
      const a = await apply(p); const b = await apply(p);
      ok(`${s}: uygula + tekrar uygula`, a.status === 200 && b.status === 200, [a.status, b.status, a.j?.error, b.j?.error, a.j?.videos?.filter((v: any) => !v.ok)]);
      ids[s] = [a.j?.auditId, b.j?.auditId].filter(Boolean);
    }
    const toplamV = (await Promise.all(PR40.map(vids))).flat().length;
    ok("12 profilde 16 video görünür (yinelenen yok)", toplamVideo === 16 && toplamV === 16, { beklenen: toplamVideo, var: toplamV });
    for (const s of PR40) {
      const [a1, a2] = ids[s];
      const r2 = await rollback(a2); const r1 = await rollback(a1);
      ok(`${s}: hedefli tam geri alma`, r1.status === 200 && r2.status === 200 && !(await profVar(s)), [r2.status, r2.j?.error, r1.status, r1.j?.error]);
      ok(`${s}: geri alma sonrası video görünmez`, (await vids(s)).length === 0, await vids(s));
    }
    for (const s of PR40) { const a = await apply(prof(s)); ok(`${s}: yeniden uygulanır`, a.status === 200 && (await profVar(s)), a.j?.error); ids[s] = [a.j?.auditId]; }
    ok("yeniden uygulamada da 16 video, yinelenen yok", (await Promise.all(PR40.map(vids))).flat().length === 16);
    for (const s of PR40) await rollback(ids[s][0]);
    ok("son geri almadan sonra 12 profilde video yok", (await Promise.all(PR40.map(vids))).flat().length === 0);
    grup = "B2 PR39 14 profil zinciri";
    for (const s of PR39) {
      const p = prof(s); const a = await apply(p); const b = await apply(p);
      const r1 = await rollback(a.j?.auditId);
      ok(`${s}: uygula → tekrar → asıl uygulamayı geri al`, a.status === 200 && b.status === 200 && r1.status === 200 && !(await profVar(s)), [a.status, b.status, r1.status, r1.j?.error]);
      const c = await apply(p); const r = await rollback(c.j?.auditId);
      ok(`${s}: yeniden uygula → geri al`, c.status === 200 && r.status === 200 && !(await profVar(s)), [c.status, r.status]);
    }
  }

  if (GRUP.has("C")) {
    grup = "C ortak medya";
    const s = "sunset-grill-ve-bar-besiktas"; const p = prof(s);
    const once = (await q(`select credit,sponsored,status from media_items where id='med_ortak'`))[0];
    const a = await apply(p);
    const sonra = (await q(`select credit,sponsored,status from media_items where id='med_ortak'`))[0];
    ok("ortak video eklenince önceki atıf ve sponsorluk değişmez", a.status === 200 && JSON.stringify(once) === JSON.stringify(sonra), { once, sonra, s: a.status });
    ok("ortak video iki mekânda da görünür", (await vids("pandeli-fatih")).some((v) => v.id === "med_ortak") && (await vids(s)).some((v) => v.id === "med_ortak"));
    const yanlis = await post({ action: "media-remove", confirm: "EVET", slug: "ulus-29-besiktas", id: "med_ortak" });
    ok("başka mekânı hedefleyen kaldırma reddedilir ve hiçbir yerde gizlemez", yanlis.status >= 400 && (await vids("pandeli-fatih")).some((v) => v.id === "med_ortak") && (await vids(s)).some((v) => v.id === "med_ortak"), { s: yanlis.status, j: yanlis.j });
    const rm = await post({ action: "media-remove", confirm: "EVET", slug: s, id: "med_ortak" });
    ok("mekâna özgü kaldırma yalnız o mekândan kaldırır", rm.status === 200 && !(await vids(s)).some((v) => v.id === "med_ortak") && (await vids("pandeli-fatih")).some((v) => v.id === "med_ortak"), { s: rm.status, j: rm.j, pandeli: await vids("pandeli-fatih") });
    const r = await rollback(a.j?.auditId);
    ok("profil geri alınınca ortak videonun öbür mekândaki ilişkisi ve atfı kalır", r.status === 200 && (await vids("pandeli-fatih")).some((v) => v.id === "med_ortak" && v.credit === "Önceki atıf (sahte)" && v.sponsored === true), { s: r.status, j: r.j });
    /* önceden kaldırılmış video örtük yeniden yayımlanmaz */
    const c = prof("ciya-sofrasi-kadikoy");
    const ck = { ...c, videos: [...c.videos, { url: "https://www.youtube.com/watch?v=GKQ57GNhggQ", credit: "test", category: "editor", sponsored: false }] };
    const ac = await apply(ck);
    const st = (await q(`select status from media_items where id='med_kaldirilmis'`))[0]?.status;
    ok("önceden kaldırılmış video örtük yeniden yayımlanmaz", st === "removed" && !(await vids("ciya-sofrasi-kadikoy")).some((v) => v.external_id === "GKQ57GNhggQ"), { s: ac.status, st, j: ac.j?.error });
    if (ac.j?.auditId) await rollback(ac.j.auditId);
    /* aynı video iki biçimde (watch + Shorts) tek ilişki */
    const k = prof("kanaat-lokantasi-uskudar");
    const kk = { ...k, videos: [...k.videos, { url: "https://www.youtube.com/watch?v=TbL4A4Cywe4", credit: k.videos[0].credit, category: "influencer", sponsored: false }] };
    const ak = await apply(kk); const kv = await vids("kanaat-lokantasi-uskudar");
    ok("watch ve Shorts biçimi aynı video: tek ilişki", ak.status === 200 && kv.filter((v) => v.external_id === "TbL4A4Cywe4").length === 1, { s: ak.status, kv });
    if (ak.j?.auditId) await rollback(ak.j.auditId);
    ok("Kanaat geri alındı; video kalmadı", (await vids("kanaat-lokantasi-uskudar")).length === 0);
  }

  if (GRUP.has("D")) {
    grup = "D kısmi video hatası";
    const s = "haci-abdullah-beyoglu"; const p = prof(s);
    const once = { prof: await profVar(s), v: JSON.stringify(await vids(s)) };
    const bozuk = { ...p, videos: [p.videos[0], { url: "https://www.youtube.com/watch?v=AAAAAAAAAAA", credit: "olmayan video", category: "influencer", sponsored: false }] };
    const a = await apply(bozuk);
    ok("ikinci video bulunamazsa başarı dönmez", a.status >= 400 && a.j?.ok !== true, { s: a.status, j: a.j && { ok: a.j.ok, error: a.j.error, profileOk: a.j.profileOk } });
    ok("ikinci video hatasında profil uygulanmış kalmaz, ilk video bağlanmaz", (await profVar(s)) === once.prof && JSON.stringify(await vids(s)) === once.v, { prof: await profVar(s), v: await vids(s) });
    const bozuk1 = { ...p, videos: [{ url: "https://www.youtube.com/watch?v=AAAAAAAAAAA", credit: "olmayan", category: "influencer", sponsored: false }, p.videos[0]] };
    const a1 = await apply(bozuk1);
    ok("ilk video hatasında da hiçbir şey uygulanmaz", a1.status >= 400 && (await profVar(s)) === once.prof && JSON.stringify(await vids(s)) === once.v, { s: a1.status });
    const ag = await apply(p, { simulateVideoFailure: "network" });
    ok("oEmbed ağ hatasında hiçbir şey uygulanmaz ve hata açık raporlanır", ag.status >= 400 && ag.j?.ok !== true && (await profVar(s)) === once.prof && JSON.stringify(await vids(s)) === once.v, { s: ag.status, e: ag.j?.error });
    const adb = await apply(p, { simulateFailure: true });
    ok("veritabanı ortasında hata: profil ve video ilişkisi kalmaz", adb.status >= 500 && (await profVar(s)) === once.prof && JSON.stringify(await vids(s)) === once.v, { s: adb.status, e: adb.j?.error });
    const iyi = await apply(p);
    ok("hatalardan sonra temiz uygulama çalışır", iyi.status === 200 && (await profVar(s)) && (await vids(s)).length === p.videos.length, { s: iyi.status });
    if (iyi.j?.auditId) await rollback(iyi.j.auditId);
  }

  if (GRUP.has("E")) {
    grup = "E korunan veri";
    ok("Menemen profili ve sponsorlu videosu değişmedi", (await profVar("menemen-besiktas")) && JSON.stringify(await vids("menemen-besiktas")) === menV0, await vids("menemen-besiktas"));
    ok("kullanıcı, deneyim, Google kimliği ve ortak/kaldırılmış medya kayıtları aynı", (await korunan()) === T0, JSON.parse(await korunan()));
    ok("hedef dışı mekânların kimlik alanları aynı", (await hedefDisi([...PR40, ...PR39, "menemen-besiktas"])) === H0);
    ok("katalog 793 mekân", Number((await q<{ n: number }>(`select count(*)::int n from places`))[0].n) === 793);
  }

  console.log(`profil-geri-donus-http-test: ${pass}/${pass + fail}`);
  mkdirSync("calisma/issue41", { recursive: true });
  writeFileSync(`calisma/issue41/http-${process.env.KANIT_ETIKET ?? "son"}.json`, JSON.stringify({ tarih: new Date().toISOString(), pass, fail, kayit }, null, 1) + "\n");
  next?.kill("SIGTERM"); await server.stop(); await pg.close();
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

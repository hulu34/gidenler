/* PROFİL + VİDEO GERİ DÖNÜŞ BİRİM TESTİ (issue #41) — iki yazım yolu:
   · "transaction": PostgreSQL (PGlite) db.transaction — yerel pg sürücüsüyle aynı yol.
   · "batch": Neon HTTP batch benzetimi — sorgular önceden kurulur, okuma araya girmeden tek BEGIN/COMMIT içinde çalışır;
     biri hata verirse hepsi geri alınır (Neon'un non-interactive transaction davranışı).
   oEmbed sahte fetch ile (ağ yok). Çalıştır: npx tsx scripts/profil-geri-donus-birim-test.ts */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { realVenueRecords } from "../data/real";
import { applyProfile, ProfileInput, readProfile, rollbackProfile } from "../lib/profile";
import { addPlaceVideo, planPlaceVideos, unlinkPlaceVideo, type VideoInput } from "../lib/media/store";

let pass = 0, fail = 0;
const ok = (ad: string, k: boolean, d?: unknown) => { if (k) pass++; else { fail++; console.log("  ✗", ad, d === undefined ? "" : JSON.stringify(d).slice(0, 300)); } };
const prof = (slug: string) => JSON.parse(readFileSync(`content/profiles/${slug}.json`, "utf8")) as Record<string, any>;
const parse = (raw: Record<string, any>) => { const { videos: _v, _kaynak_notu: _n, ...rest } = raw; return ProfileInput.parse(rest); };
/* sahte oEmbed: AAAAAAAAAAA bulunamaz, BBBBBBBBBBB ağ hatası, diğerleri bulunur */
const fakeFetch = (async (u: string) => {
  const id = decodeURIComponent(String(u)).match(/(?:v=|shorts\/)([\w-]{11})/)?.[1];
  if (id === "BBBBBBBBBBB") throw new Error("ağ hatası (sahte)");
  if (id === "AAAAAAAAAAA") return new Response("", { status: 404 });
  return new Response(JSON.stringify({ author_name: `Kanal ${id}` }), { status: 200, headers: { "content-type": "application/json" } });
}) as unknown as typeof fetch;

async function kur(mod: "transaction" | "batch") {
  const pg = new PGlite(); const base = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x); await seedRealVenues(base, realVenueRecords);
  let batchCalls = 0;
  if (mod === "batch") Object.assign(base, { batch: async (qs: PromiseLike<unknown>[]) => { batchCalls++; await pg.exec("BEGIN"); try { for (const q of qs) await q; await pg.exec("COMMIT"); } catch (e) { await pg.exec("ROLLBACK"); throw e; } } });
  return { pg, db: base, batchCalls: () => batchCalls };
}

async function senaryo(mod: "transaction" | "batch") {
  console.log(`\n── ${mod} ──`);
  const { pg, db, batchCalls } = await kur(mod);
  const q = async <T = any>(s: string, p: unknown[] = []) => (await pg.query<T>(s, p)).rows;
  const pid = async (slug: string) => (await q<{ id: string }>("select id from places where slug=$1", [slug]))[0].id;
  const vids = async (slug: string) => q<{ id: string; external_id: string; credit: string; sponsored: boolean }>(`select m.id,m.external_id,m.credit,m.sponsored from media_items m join media_places mp on mp.media_id=m.id join places p on p.id=mp.place_id where p.slug=$1 and m.status='approved' order by 2`, [slug]);
  const uyg = async (slug: string, raw = prof(slug), extra: { failMidway?: boolean; videos?: VideoInput[] } = {}) => {
    const plan = await planPlaceVideos(db, await pid(slug), extra.videos ?? raw.videos ?? [], fakeFetch);
    if (!plan.ok) return { ok: false as const, plan };
    return applyProfile(db, parse(raw), { videos: plan, failMidway: extra.failMidway });
  };
  /* önceden var olan ortak video: Pandeli'de, sponsorlu, farklı atıf */
  const pandeli = await pid("pandeli-fatih");
  await q(`insert into media_items(id,type,platform,url,external_id,storage_class,category,credit,source,status,sponsored,created_at) values('med_ortak','embed','youtube','https://www.youtube.com/watch?v=4NQLZfOqg2w','4NQLZfOqg2w','id_only','influencer','Önceki atıf','editor','approved',true,now())`);
  await q(`insert into media_places(media_id,place_id) values('med_ortak',$1)`, [pandeli]);

  /* A: tekrar sonrası tam geri dönüş */
  const a1 = await uyg("ulus-29-besiktas"), a2 = await uyg("ulus-29-besiktas");
  ok(`${mod} A: uygula + tekrar`, a1.ok && a2.ok && (a1 as any).effective === true && (a2 as any).effective === false);
  const r1 = await rollbackProfile(db, (a1 as any).auditId);
  ok(`${mod} A: tekrardan sonra asıl uygulama geri alınır`, r1.ok && (await readProfile(db, "ulus-29-besiktas")) === null && (await vids("ulus-29-besiktas")).length === 0, r1);
  const r1b = await rollbackProfile(db, (a1 as any).auditId);
  ok(`${mod} A: çift geri alma işlemsiz`, r1b.ok && (r1b as any).already === true);
  const r2 = await rollbackProfile(db, (a2 as any).auditId);
  ok(`${mod} A: değişiklik yapmayan tekrarın geri alınması zararsız`, r2.ok && (await readProfile(db, "ulus-29-besiktas")) === null);
  const a3 = await uyg("ulus-29-besiktas");
  ok(`${mod} A: yeniden uygulanır`, a3.ok && (a3 as any).effective && (await readProfile(db, "ulus-29-besiktas")) !== null && (await vids("ulus-29-besiktas")).length === 1);
  /* daha yeni farklı uygulama korunur */
  const t = prof("topaz-beyoglu"); const b1 = await uyg("topaz-beyoglu", t);
  const b2 = await uyg("topaz-beyoglu", { ...t, description: { ...t.description, value: `${t.description.value} (daha yeni)` } });
  const rb = await rollbackProfile(db, (b1 as any).auditId);
  ok(`${mod} A: daha yeni farklı uygulamayı eski geri alma ezemez`, !rb.ok && (rb as any).error === "newer_change" && (await readProfile(db, "topaz-beyoglu"))?.description?.value.includes("daha yeni") === true, rb);
  ok(`${mod} A: yeniden eskiye geri alma çalışır`, (await rollbackProfile(db, (b2 as any).auditId)).ok && (await rollbackProfile(db, (b1 as any).auditId)).ok && (await readProfile(db, "topaz-beyoglu")) === null);

  /* B: 12 profil + 16 video */
  const PR40 = ["ulus-29-besiktas", "sunset-grill-ve-bar-besiktas", "topaz-beyoglu", "murver-beyoglu", "lokanta-1741-fatih", "1924-istanbul-beyoglu", "alaf-besiktas", "haci-abdullah-beyoglu", "kanaat-lokantasi-uskudar", "ciya-sofrasi-kadikoy", "tarihi-sultanahmet-koftecisi-selim-usta-fatih", "park-fora-besiktas"];
  await rollbackProfile(db, (a3 as any).auditId);
  const ids: Record<string, string> = {};
  for (const s of PR40) { const a = await uyg(s); const b = await uyg(s); ok(`${mod} B: ${s} uygula + tekrar`, a.ok && b.ok); ids[s] = (a as any).auditId; }
  const tv = (await Promise.all(PR40.map(vids))).flat();
  ok(`${mod} B: 16 video, yinelenen ilişki yok`, tv.length === 16 && new Set(tv.map((v) => v.external_id)).size === 16, tv.length);
  const ortak = (await q(`select credit,sponsored,status from media_items where id='med_ortak'`))[0];
  ok(`${mod} C: ortak videonun atfı ve sponsorluğu korunur`, ortak.credit === "Önceki atıf" && ortak.sponsored === true && ortak.status === "approved", ortak);
  for (const s of PR40) { const r = await rollbackProfile(db, ids[s]); ok(`${mod} B: ${s} tam geri alma`, r.ok && (await readProfile(db, s)) === null && (await vids(s)).length === 0, r); }
  ok(`${mod} C: ortak video Pandeli'de kalır, atfı değişmez`, (await vids("pandeli-fatih")).some((v) => v.id === "med_ortak" && v.credit === "Önceki atıf" && v.sponsored));
  const kalan = await q(`select m.id, m.external_id, (select count(*)::int from media_places mp where mp.media_id=m.id) bag from media_items m where m.type='embed'`);
  ok(`${mod} B: oluşturulan video kayıtları geri almayla silinir (Pandeli'deki ortak hariç)`, kalan.length === 1 && kalan[0].id === "med_ortak", kalan);

  /* C: mekâna özgü kaldırma + yanlış mekân */
  const s1 = await uyg("sunset-grill-ve-bar-besiktas");
  const wrong = await unlinkPlaceVideo("ulus-29-besiktas", "med_ortak", db);
  ok(`${mod} C: başka mekânı hedefleyen kaldırma reddedilir`, !wrong.ok && (await vids("pandeli-fatih")).length === 1 && (await vids("sunset-grill-ve-bar-besiktas")).length === 2);
  const un = await unlinkPlaceVideo("sunset-grill-ve-bar-besiktas", "med_ortak", db);
  ok(`${mod} C: mekâna özgü kaldırma yalnız o mekânı etkiler`, un.ok && (await vids("pandeli-fatih")).length === 1 && !(await vids("sunset-grill-ve-bar-besiktas")).some((v) => v.id === "med_ortak"));
  await rollbackProfile(db, (s1 as any).auditId);
  /* önceden kaldırılmış video örtük yeniden yayımlanmaz */
  await q(`insert into media_items(id,type,platform,url,external_id,storage_class,credit,source,status,sponsored,created_at) values('med_kaldir','embed','youtube','https://www.youtube.com/watch?v=GKQ57GNhggQ','GKQ57GNhggQ','id_only','Kaldırılmış','editor','removed',false,now())`);
  const kp = await uyg("ciya-sofrasi-kadikoy", prof("ciya-sofrasi-kadikoy"), { videos: [...prof("ciya-sofrasi-kadikoy").videos, { url: "https://www.youtube.com/watch?v=GKQ57GNhggQ" }] });
  ok(`${mod} C: kaldırılmış video içeren uygulama hiçbir şey yazmaz`, !kp.ok && (await readProfile(db, "ciya-sofrasi-kadikoy")) === null && (await q(`select status from media_items where id='med_kaldir'`))[0].status === "removed");
  const ad = await addPlaceVideo({ slug: "ciya-sofrasi-kadikoy", url: "https://youtu.be/GKQ57GNhggQ" }, fakeFetch, db);
  ok(`${mod} C: tekil eklemede de kaldırılmış video yayımlanmaz`, !ad.ok && ad.error === "media_removed");
  /* watch + Shorts aynı video */
  const kk = prof("kanaat-lokantasi-uskudar");
  const kd = await uyg("kanaat-lokantasi-uskudar", kk, { videos: [...kk.videos, { url: "https://www.youtube.com/watch?v=TbL4A4Cywe4" }] });
  ok(`${mod} C: watch + Shorts tek ilişki`, kd.ok && (await vids("kanaat-lokantasi-uskudar")).length === 2);
  await rollbackProfile(db, (kd as any).auditId);

  /* D: kısmi video hatası ve veritabanı hatası */
  const h = prof("haci-abdullah-beyoglu");
  for (const [ad2, vv] of [["ikinci video bulunamaz", [h.videos[0], { url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" }]], ["ilk video bulunamaz", [{ url: "https://www.youtube.com/watch?v=AAAAAAAAAAA" }, h.videos[0]]], ["oEmbed ağ hatası", [h.videos[0], { url: "https://www.youtube.com/watch?v=BBBBBBBBBBB" }]], ["bozuk bağlantı", [{ url: "https://ornek.invalid/video" }]]] as const) {
    const r = await uyg("haci-abdullah-beyoglu", h, { videos: vv as unknown as VideoInput[] });
    ok(`${mod} D: ${ad2} → hiçbir şey yazılmaz`, !r.ok && (await readProfile(db, "haci-abdullah-beyoglu")) === null && (await vids("haci-abdullah-beyoglu")).length === 0, r);
  }
  const plan = await planPlaceVideos(db, await pid("haci-abdullah-beyoglu"), [{ url: "https://www.youtube.com/watch?v=BBBBBBBBBBB" }], fakeFetch);
  ok(`${mod} D: ağ hatası bulunamadıdan ayrı raporlanır`, !plan.ok && !plan.items[0].ok && plan.items[0].error === "oembed_unavailable");
  let threw = false;
  try { await uyg("haci-abdullah-beyoglu", h, { failMidway: true }); } catch { threw = true; }
  ok(`${mod} D: veritabanı ortasında hata → profil, menü görünümü ve video ilişkisi kalmaz`, threw && (await readProfile(db, "haci-abdullah-beyoglu")) === null && (await vids("haci-abdullah-beyoglu")).length === 0 && Number((await q(`select count(*)::int n from media_items where external_id = any($1)`, [h.videos.map((v: any) => v.url.match(/(?:v=|shorts\/)([\w-]{11})/)[1])]))[0].n) === 0);
  const temiz = await uyg("haci-abdullah-beyoglu");
  ok(`${mod} D: hatadan sonra temiz uygulama`, temiz.ok && (await vids("haci-abdullah-beyoglu")).length === 2);
  if (mod === "batch") ok("batch: yazımlar Neon HTTP batch yolundan geçti", batchCalls() > 20, batchCalls());

  /* eski kayıt uyumu: issue #41 öncesi uygulama (detail.media yok, ayrı profile_videos günlüğü) */
  const ah = prof("alaf-besiktas");
  const old = await applyProfile(db, parse(ah));
  const vr = await addPlaceVideo({ slug: "alaf-besiktas", url: ah.videos[0].url, credit: ah.videos[0].credit }, fakeFetch, db);
  await q(`update audit_log set detail = detail - 'media' - 'effective' where id=$1`, [(old as any).auditId]);
  await q(`insert into audit_log(id,actor,action,ref_table,ref_id,detail,at) values('legacy_pv','admin','profile_videos','places',null,$1,now())`, [JSON.stringify({ slug: "alaf-besiktas", of: (old as any).auditId, media: [{ id: (vr as any).id, created: true }] })]);
  const ro = await rollbackProfile(db, (old as any).auditId);
  ok(`${mod} uyum: eski kayıtlı uygulamanın oluşturduğu video da geri alınır`, ro.ok && (await vids("alaf-besiktas")).length === 0 && (await readProfile(db, "alaf-besiktas")) === null, ro);
  await pg.close();
}

async function main() { await senaryo("transaction"); await senaryo("batch"); console.log(`\nprofil-geri-donus-birim-test: ${pass}/${pass + fail}`); process.exit(fail ? 1 : 0); }
main().catch((e) => { console.error(e); process.exit(1); });

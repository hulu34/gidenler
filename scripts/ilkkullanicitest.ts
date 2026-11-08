/* İLK KULLANICI TESTLERİ (ağsız, gömülü Postgres): kampanya sayacı, mekân önerisi (mükerrer, birleştirme, karar, denetim),
   kampanya kodları, ana sayfa hiyerarşisi ve deneyim formu kuralları (kaynak koddan). */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { recordCampaign, campaignReport, measurable } from "../lib/kampanya/server";
import { ALL_CODES, CLIENT_STEPS, CREATOR_CODES, campaignLink, isCode } from "../lib/kampanya";
import { candidatesFor, decideSuggestion, suggestVenue, suggestionQueue, DISTRICTS } from "../lib/oneri";
import { nameKey } from "../lib/oneri/key";
import { activeEntities, realEntities } from "../data/real";
import { softHit } from "../lib/usage/rate";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, info?: unknown) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}`, info ?? ""); } };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const hdr = (ip: string, ua = "Mozilla/5.0 iPhone") => new Headers({ "x-forwarded-for": ip, "user-agent": ua });

async function main() {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x);

  console.log("\n1) Kampanya kodları ve bağlantılar");
  ok("10 içerik üreticisi kodu, hepsi benzersiz ve URL güvenli", CREATOR_CODES.length === 10 && new Set(ALL_CODES.map((c) => c.code)).size === ALL_CODES.length && ALL_CODES.every((c) => /^[a-z0-9-]{2,24}$/.test(c.code)));
  ok("bağlantı doğrudan deneyim akışına gider", campaignLink("ic03") === "https://www.gidenler.com/nerede-yedin/?k=ic03");
  ok("bilinmeyen kod kabul edilmez", !isCode("hacker") && !isCode("") && !isCode(null));
  ok("istemci 'tamam' ve 'oneri' adımlarını yazamaz (yalnız sunucu)", !CLIENT_STEPS.includes("tamam") && !CLIENT_STEPS.includes("oneri"));
  ok("kod listesinde kişi adı/hesap yok (depo herkese açık)", ALL_CODES.every((c) => !/@|instagram|tiktok/i.test(c.label)));

  console.log("\n2) Kampanya sayacı (toplu, kişisel verisiz)");
  const now = new Date("2026-11-08T10:00:00Z");
  await recordCampaign(db, "ic01", "ziyaret", hdr("1.1.1.1"), now);
  await recordCampaign(db, "ic01", "ziyaret", hdr("1.1.1.1"), now);
  await recordCampaign(db, "ic01", "ziyaret", hdr("2.2.2.2"), now);
  await recordCampaign(db, "ic01", "form", hdr("2.2.2.2"), now);
  await recordCampaign(db, "ic01", "tamam", hdr("2.2.2.2"), now);
  await recordCampaign(db, "ic02", "ziyaret", hdr("3.3.3.3"), now);
  const bad = await recordCampaign(db, "uydurma", "ziyaret", hdr("4.4.4.4"), now);
  const rep = await campaignReport(db, 30, now);
  const r1 = rep.rows.find((r) => r.code === "ic01")!;
  ok("aynı kişi aynı gün aynı adım tek sayılır", r1.steps.ziyaret === 2, r1.steps);
  ok("kaynak ayrı ayrı ölçülür", rep.rows.find((r) => r.code === "ic02")!.steps.ziyaret === 1 && r1.steps.tamam === 1);
  ok("bilinmeyen kod yazılmaz", bad === false && rep.total.ziyaret === 3);
  const raw = (await pg.query<{ visitor: string }>("select visitor from campaign_events")).rows;
  ok("tabloda ham IP yok (yalnız günlük özet)", raw.every((r) => !/\d+\.\d+\.\d+\.\d+/.test(r.visitor) && r.visitor.length === 32));
  const cols = (await pg.query<{ column_name: string }>("select column_name from information_schema.columns where table_name='campaign_events'")).rows.map((r) => r.column_name).sort();
  ok("tabloda yalnız gün/kod/adım/özet sütunları", JSON.stringify(cols) === JSON.stringify(["code", "day", "step", "visitor"]), cols);
  const prevEnv = process.env.VERCEL_ENV; process.env.VERCEL_ENV = "production";
  ok("üretimde bot ve test başlıklı istek sayılmaz", !measurable(new Headers({ "user-agent": "Googlebot/2.1" })) && !measurable(new Headers({ "user-agent": "Mozilla", "x-gidenler-test": "1" })) && measurable(new Headers({ "user-agent": "Mozilla/5.0" })));
  process.env.VERCEL_ENV = prevEnv;

  console.log("\n3) Mekân önerisi");
  const real = activeEntities.find((e) => e.name === "Çiya Sofrası")!;
  ok("var olan mekân aynı ilçede adayda 'aynı ilçe' olarak bulunur", candidatesFor("ciya sofrasi", real.location!.district!).some((c) => c.slug === real.slug && c.same && c.exact));
  const ex = await suggestVenue(db, { name: "Çiya Sofrası", district: real.location!.district! });
  ok("aynı ilçede aynı adlı mekân varsa öneri kaydedilmez, kullanıcıya sorulur", !ex.ok && ex.error === "exists" && ex.matches.some((m) => m.slug === real.slug));
  const forced = await suggestVenue(db, { name: "Çiya Sofrası", district: real.location!.district!, force: true });
  ok("kullanıcı 'farklı yer' derse adaylarıyla kuyruğa girer", forced.ok);
  const n1 = await suggestVenue(db, { name: "Deneme Ocakbaşı Kuzguncuk", district: "Üsküdar", locationNote: "İskele yanı" });
  const n2 = await suggestVenue(db, { name: "deneme  ocakbasi kuzguncuk", district: "Üsküdar" });
  const q = await suggestionQueue(db);
  const row = q.find((s) => s.id === (n1.ok ? n1.id : ""));
  ok("aynı ad + ilçe ikinci öneri yeni satır açmaz, sayaç artar", n1.ok && n2.ok && n2.merged && n1.ok && n2.id === n1.id && row?.requests === 2);
  ok("öneri 'open' durumda, mekân oluşmaz", row?.status === "open" && !realEntities.some((e) => nameKey(e.name) === nameKey("Deneme Ocakbaşı Kuzguncuk")));
  ok("ilçe listesi gerçek mekânlardan (≥30 ilçe)", DISTRICTS.length >= 30 && DISTRICTS.includes("Kadıköy"));
  const d0 = await decideSuggestion(db, "user:admin", n1.ok ? n1.id : "", "duplicate", "olmayan-mekan");
  ok("'var olan mekân' kararı gerçek mekân ister", !d0.ok);
  const d1 = await decideSuggestion(db, "user:admin", n1.ok ? n1.id : "", "accepted");
  const d2 = await decideSuggestion(db, "user:admin", n1.ok ? n1.id : "", "rejected");
  ok("karar bir kez verilir (açık olmayan öneri değişmez)", d1.ok && !d2.ok);
  const audit = await db.select().from(schema.auditLog).where(eq(schema.auditLog.refTable, "venue_suggestions"));
  ok("karar denetim kaydına yazılır", audit.length === 1 && audit[0].action === "venue_suggestion:accepted");

  const hits: boolean[] = []; for (let i = 0; i < 8; i++) hits.push(await softHit("test:oner", 6, 3600));
  ok("Redis yokken ücretsiz yollarda bellek içi sınır: 6 geçer, 7. reddedilir", hits.slice(0, 6).every(Boolean) && !hits[6] && !hits[7]);
  const or = src("app/api/mekan-oner/route.ts");
  ok("öneri API'si hız sınırından önce bağlantı/telefon reddeder; ücretli strictHit kullanılmaz", or.indexOf("contact(") < or.indexOf("softHit(") && !/strictHit/.test(or));

  console.log("\n4) Akış ve kurallar (kaynak kod)");
  const wf = src("app/yaz/[slug]/WriteForm.tsx");
  ok("başarı ekranı yalnız sunucu 2xx yanıtında (r.ok)", /if \(r\.ok\) \{\s*deleteDraft/.test(wf));
  ok("girişe giderken taslak saklanır; saklanamazsa giriş başlatılmaz", /const ok = keepDraft\(\);\s*if \(!ok\) \{ setError/.test(wf));
  ok("yazarken otomatik taslak (yalnız bu cihaz)", /saveDraft\(entitySlug, \{ body, month, ratings/.test(wf) && /data-otomatik-taslak/.test(wf));
  ok("hiçbir ekran 'doğrulandı' demez", !/ziyaretin doğrulandı|doğrulanmış ziyaret/i.test(wf));
  ok("fotoğraf seçici yalnız sunucu açık derse görünür", /setEnabled\(!!j\.enabled\)/.test(src("components/write/PhotoPicker.tsx")));
  const api = src("app/api/reviews/route.ts");
  ok("'kaydedildi' dönüşümü yalnız yeni gerçek kayıtta (tekrar gönderimde değil)", api.indexOf("if (r.replay)") < api.indexOf('"tamam"'));
  ok("deneyim API'si kaynak kodunu deneyime/puana yazmaz", /const \{ slug, kaynak, \.\.\.input \} = p\.data;/.test(api) && /createReview\(g\.db, g\.user, slug, input, rules\)/.test(api));
  const home = src("app/page.tsx");
  const iB = home.indexOf("<RealBoard />"), iS = home.indexOf("<SonYemekBolum />"), iD = home.indexOf("<HomeDiscover />"), iE = home.lastIndexOf("<RealExplore />");
  ok("ana sayfa sırası: sıralamalar → deneyim çağrısı → fotoğraflı keşif → semt/kategori", iB > 0 && iB < iS && iS < iD && iD < iE);
  ok("ilk ekranda deneyim çağrısı bağlantısı", /data-hero-deneyim/.test(home) && /href="#nerede-yedin"/.test(home));
  ok("demo dalı değişmedi (deneyim bölümü yalnız gerçek sitede)", /\{!DEMO_VISIBLE && <SonYemekBolum \/>\}/.test(home));
  const comp = src("components/deneyim/SonYemek.tsx");
  ok("bölüm gerçek dizin API'sini kullanır, ikinci veritabanı yok", /\/api\/ara\/\?q=/.test(comp) && !/venues\.json|realEntities/.test(comp));
  ok("seçim mevcut deneyim formuna gider", /router\.push\(`\/yaz\/\$\{h\.slug\}\/`\)/.test(comp));
  ok("ölçüme arama metni/mekân gönderilmez", !/track\([^)]*(q|slug)/.test(comp));

  console.log(`\nilk kullanıcı: ${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

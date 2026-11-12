/* Issue #25: tam Sor akışı, kontrollü sağlayıcı yanıtları. Gerçek model/ağ/Production erişimi yok. */
import assert from "node:assert/strict";
import { sor } from "../lib/sor/ask";
import { resetAIConfig } from "../lib/ai/config";
import { cache } from "../lib/ai/cache";
import { resetBetaForTests } from "../lib/sor/beta";
import { resetHarcamaForTests } from "../lib/sor/harcama";
import { resetKotaForTests } from "../lib/sor/kota";
import { emptyIntent, VENUES } from "../lib/sor/engine";

delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
delete process.env.DATABASE_URL; delete process.env.DATABASE_URL_UNPOOLED;
delete process.env.VERCEL_ENV; delete process.env.AI_LEDGER_FILE;
delete process.env.SOR_AI_PROVIDER; delete process.env.SOR_ALLOW_PAID;
process.env.GROQ_API_KEY = "isolated-fake-provider";
process.env.AI_PRIMARY_MODEL = "openai/gpt-oss-120b";
process.env.AI_FAST_PROVIDER = "groq"; process.env.AI_FAST_MODEL = "openai/gpt-oss-20b";
const originalFetch = globalThis.fetch;
let pass = 0, fail = 0, calls = 0;
let modelIntent: Record<string, unknown> = { action: "new", area: "Üsküdar" };
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  assert.equal(new URL(String(url)).host, "api.groq.com", "unexpected network destination");
  calls++;
  const body = JSON.parse(String(init?.body));
  const block = body.messages.at(-1).content.match(/<gidenler_data name="candidates"[^>]*>\n(.*?)\n<\/gidenler_data>/s);
  const payload = block ? { picks: JSON.parse(block[1]).slice(0, 5).map((v: { slug: string }) => ({ slug: v.slug, why: "Kayıtlı tür ve ilçe bilgisi." })), note: null } : modelIntent;
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }], usage: { prompt_tokens: 20, completion_tokens: 10 } }), { status: 200 });
}) as typeof fetch;

async function reset(ai: boolean) {
  process.env.AI_PRIMARY_PROVIDER = ai ? "groq" : "none";
  resetAIConfig(); resetBetaForTests(); resetHarcamaForTests(); resetKotaForTests(); await cache().clear(); calls = 0;
  modelIntent = { action: "new", area: "Üsküdar", cuisine: null, attrs: [] };
}
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); pass++; }
  catch (e) { fail++; console.error("FAIL", name, e instanceof Error ? e.message : e); }
}
const allDistrict = (r: Awaited<ReturnType<typeof sor>>, district: string) => {
  assert.ok(r.items.length); assert.ok(r.items.every(v => v.district === district));
};
const named = (r: Awaited<ReturnType<typeof sor>>, slug: string) => {
  assert.equal(r.items[0]?.slug, slug); assert.equal(r.understood.area, null); assert.equal(r.understood.district, null);
  assert.equal(r.understood.areaText, null); assert.equal(r.items.length, 1);
};

async function main() {
  for (const ai of [false, true]) {
    for (const query of ["Develi Samatya", "DEVELİ SAMATYA", "develi samatya", "Develi Samatya hakkında bilgi"]) {
      await test(`${ai ? "AI" : "kurallı"}: tam ad ${query}`, async () => {
        await reset(ai); const r = await sor({ query }); named(r, "develi-samatya-fatih");
        assert.equal(r.mode, ai ? "ai" : "veri"); if (!ai) assert.equal(calls, 0);
      });
    }
    for (const query of ["Üsküdar", "Uskudar", "Üsküdar'da kebap", "Beyoğlu'nda balık"]) {
      await test(`${ai ? "AI" : "kurallı"}: açık ilçe ${query}`, async () => {
        await reset(ai); const r = await sor({ query });
        const district = query.startsWith("Beyoğlu") ? "Beyoğlu" : "Üsküdar";
        assert.equal(r.understood.area, district); allDistrict(r, district);
      });
    }
    await test(`${ai ? "AI" : "kurallı"}: tam ad eski ilçeyi sıfırlar`, async () => {
      await reset(ai); named(await sor({ query: "Develi Samatya", context: { ...emptyIntent(), area: "Üsküdar", district: "Üsküdar" } }), "develi-samatya-fatih");
    });
    await test(`${ai ? "AI" : "kurallı"}: açık başka ilçe alternatifi`, async () => {
      await reset(ai); const r = await sor({ query: "Üsküdar'da Develi Samatya'ya alternatif kebapçı öner" });
      assert.equal(r.understood.name, null); allDistrict(r, "Üsküdar");
    });
    await test(`${ai ? "AI" : "kurallı"}: takipte başka ilçe`, async () => {
      await reset(ai); const first = await sor({ query: "Develi Samatya" });
      const r = await sor({ query: "Üsküdar'da benzer bir yer öner", context: first.context, shown: first.shown });
      allDistrict(r, "Üsküdar"); assert.ok(r.items.every(v => v.slug !== "develi-samatya-fatih"));
    });
  }
  for (const area of ["Üsküdar", "Fatih", "Kadıköy", "Atlantis"]) {
    await test(`AI: söylenmeyen ${area} koşulu alınmaz`, async () => {
      await reset(true); modelIntent.area = area; const r = await sor({ query: "Bir kebapçı öner" });
      assert.equal(r.understood.area, null); assert.equal(r.understood.district, null); assert.equal(r.mode, "ai");
    });
  }
  await test("AI: benzer isimli gerçek mekân başka ilçeye taşınmaz", async () => {
    await reset(true); modelIntent.area = "Fatih"; named(await sor({ query: "Çiya Sofrası" }), "ciya-sofrasi-kadikoy");
  });
  await test("AI: serbest metin alanında da uydurma ilçe alınmaz", async () => {
    await reset(true); modelIntent = { action: "new", area: null, area_text: "Üsküdar" }; named(await sor({ query: "Develi Samatya" }), "develi-samatya-fatih");
  });
  await test("AI: olumsuz ilçe koşulu korunur", async () => {
    await reset(true); const r = await sor({ query: "Üsküdar dışında kebap" });
    assert.equal(r.understood.notArea, "Üsküdar"); assert.equal(r.understood.area, null); assert.ok(r.items.every(v => v.district !== "Üsküdar"));
  });
  await test("AI: semt adı kendi ilçesiyle korunur", async () => {
    await reset(true); const r = await sor({ query: "Çengelköy'de kebap" });
    assert.equal(r.understood.area, "Çengelköy"); assert.equal(r.understood.district, "Üsküdar");
    const found = [...r.items, ...r.alternatives]; assert.ok(found.length); assert.ok(found.every(v => v.district === "Üsküdar"));
  });
  await test("AI: tekrar önbelleği yanlış ilçeyi geri getirmez", async () => {
    await reset(true); const first = await sor({ query: "Develi Samatya" }), count = calls;
    const again = await sor({ query: "Develi Samatya" }); named(first, "develi-samatya-fatih"); named(again, "develi-samatya-fatih");
    assert.deepEqual(again, first); assert.equal(calls, count);
  });
  await test("katalog: Develi ve Çiya kayıtlı ilçeleri değişmedi", async () => {
    assert.equal(VENUES.find(v => v.slug === "develi-samatya-fatih")?.district, "Fatih");
    assert.equal(VENUES.find(v => v.slug === "ciya-sofrasi-kadikoy")?.district, "Kadıköy");
  });
  console.log(`Sor ilçe regresyonu: ${pass} geçti, ${fail} kaldı. Gerçek sağlayıcı/ağ çağrısı: 0.`);
  process.exitCode = fail ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });

import { randomUUID } from "node:crypto";
import type { MediaStorage } from "./storage";

/* DEPOLAMA DENEMESİ — gerçek kovada küçük bir test dosyasıyla yazma, okuma, genel erişim, özel erişimin kapalılığı ve silme.
   Kullanıcı verisine dokunmaz; dosyalar sonda silinir. Sonuç ölçülendir: başarısız adım başarılı gösterilmez. */
export async function checkStorage(storage: MediaStorage, f: typeof fetch = fetch) {
  const id = `selftest-${randomUUID()}`;
  const priv = `pending/${id}/1.webp`, pub = `public/${id}/1.webp`;
  const body = Buffer.from("gidenler depolama denemesi");
  const steps: Array<{ step: string; ok: boolean; note?: string }> = [];
  const run = async (step: string, fn: () => Promise<boolean | void>, note?: string) => {
    try { const r = await fn(); steps.push({ step, ok: r !== false, note }); } catch (e) { steps.push({ step, ok: false, note: String((e as Error).message).slice(0, 120) }); }
  };
  const isReal = storage.provider === "s3", isCdn = isReal && !storage.publicViaApp;
  await run("özel kovaya yazma", () => storage.put(priv, body, "image/webp"));
  await run("özel kovadan okuma", async () => (await storage.get(priv))?.bytes.equals(body) === true);
  await run("genel kovaya yazma", () => storage.put(pub, body, "image/webp"));
  await run("genel kovadan okuma", async () => (await storage.get(pub))?.bytes.equals(body) === true);
  if (isCdn) {
    await run("genel adresten erişim", async () => (await f(storage.publicUrl(pub), { cache: "no-store" })).status === 200);
    await run("özel dosya genel adreste yok", async () => (await f(storage.publicUrl(`public/${priv}`), { cache: "no-store" })).status !== 200);
  }
  await run("silme", async () => { await storage.delete(priv); await storage.delete(pub); return !(await storage.get(priv)) && !(await storage.get(pub)); });
  if (storage.purge) await run("CDN temizleme", async () => { await storage.purge!([pub]); });
  else if (storage.publicViaApp) steps.push({ step: "CDN temizleme", ok: true, note: "özel alan adı yok; dosya uygulamadan sunulur, kaldırılan dosya en çok 10 dakika önbellekte kalabilir" });
  else steps.push({ step: "CDN temizleme", ok: false, note: "yapılandırılmamış; kaldırılan dosya en çok 1 saat önbellekte kalabilir" });
  if (isCdn) await run("silinen dosya genel adreste yok", async () => (await f(`${storage.publicUrl(pub)}?k=${id}`, { cache: "no-store" })).status === 404);
  return { provider: storage.provider, real: isReal, ok: steps.every((s) => s.ok), steps };
}

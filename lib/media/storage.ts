import { AwsClient } from "aws4fetch";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaBlobs } from "@/lib/db/schema";

/* DEPOLAMA ADAPTÖRÜ — sağlayıcıdan bağımsız. Anahtar öneki erişimi belirler: "pending/" özel, "public/" herkese açık.
   · s3: S3 uyumlu (R2 dahil). İki kova: özel ve genel; onaylanmamış dosya genel kovaya hiç yazılmaz.
   · db: yalnız Preview ve yerel test. Bayt Postgres'te durur; Production'da asla seçilmez ve kalıcı arşiv sayılmaz.
   Yapılandırma yoksa adaptör null döner: yükleme kapalıdır, onaylı listeler boş kalır, site çalışır. */
export interface StoredObject { bytes: Buffer; contentType: string }
export interface MediaStorage {
  provider: "db" | "s3" | "memory";
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /** Bir anahtardan diğerine taşır; hedef yazılmadan kaynak silinmez. */
  move(from: string, to: string): Promise<void>;
  publicUrl(key: string): string;
  /** CDN önbelleğinden düşürür. Yalnız yapılandırılmışsa vardır; yoksa genel dosya en çok 1 saat önbellekte kalabilir. */
  purge?(keys: string[]): Promise<void>;
  /** Özel alan adı yok: onaylı dosyalar uygulama üzerinden sunulur, kova doğrudan açılmaz. */
  publicViaApp?: boolean;
}
const FILE_ROUTE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/media/file/`;
const fileUrl = (key: string) => `${FILE_ROUTE}${key.split("/").map(encodeURIComponent).join("/")}`;

export function memoryStorage(fail: { put?: boolean } = {}): MediaStorage & { m: Map<string, StoredObject> } {
  const m = new Map<string, StoredObject>();
  return {
    provider: "memory", m,
    async put(k, bytes, contentType) { if (fail.put) throw new Error("storage_down"); m.set(k, { bytes, contentType }); },
    async get(k) { return m.get(k) ?? null; },
    async delete(k) { m.delete(k); },
    async move(a, b) { const v = m.get(a); if (!v) throw new Error("missing"); m.set(b, v); m.delete(a); },
    publicUrl: fileUrl,
  };
}

export function dbStorage(): MediaStorage {
  const need = () => { const d = getDb(); if (!d) throw new Error("no_db"); return d; };
  return {
    provider: "db",
    async put(key, bytes, contentType) { await need().insert(mediaBlobs).values({ key, data: bytes.toString("base64"), contentType }).onConflictDoUpdate({ target: mediaBlobs.key, set: { data: bytes.toString("base64"), contentType } }); },
    async get(key) { const [r] = await need().select().from(mediaBlobs).where(eq(mediaBlobs.key, key)).limit(1); return r ? { bytes: Buffer.from(r.data, "base64"), contentType: r.contentType } : null; },
    async delete(key) { await need().delete(mediaBlobs).where(eq(mediaBlobs.key, key)); },
    async move(a, b) { const o = await this.get(a); if (!o) throw new Error("missing"); await this.put(b, o.bytes, o.contentType); await this.delete(a); },
    publicUrl: fileUrl,
  };
}

export interface S3Config { endpoint: string; accessKeyId: string; secretAccessKey: string; privateBucket: string; publicBucket: string; publicBase?: string; region?: string; purge?: { zoneId: string; token: string } }
export function s3Storage(c: S3Config, f: typeof fetch = fetch): MediaStorage {
  const client = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: "s3", region: c.region ?? "auto" });
  const url = (key: string) => `${c.endpoint.replace(/\/$/, "")}/${key.startsWith("public/") ? c.publicBucket : c.privateBucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  /* askıda kalan depolama isteği işlevi bitirmesin: 10 sn sonra hata */
  const send = async (u: string, init: RequestInit) => { const s = await client.sign(u, init); return f(s, { signal: AbortSignal.timeout(10_000) }); };
  const self: MediaStorage = {
    provider: "s3",
    async put(key, bytes, contentType) {
      const r = await send(url(key), { method: "PUT", body: new Uint8Array(bytes), headers: { "content-type": contentType, "cache-control": !key.startsWith("public/") ? "private, no-store" : c.purge ? "public, max-age=3600, s-maxage=31536000" : "public, max-age=3600" } });
      if (!r.ok) throw new Error(`s3_put_${r.status}`);
    },
    async get(key) {
      const r = await send(url(key), { method: "GET" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`s3_get_${r.status}`);
      return { bytes: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? "application/octet-stream" };
    },
    async delete(key) { const r = await send(url(key), { method: "DELETE" }); if (!r.ok && r.status !== 404) throw new Error(`s3_delete_${r.status}`); },
    async move(a, b) { const o = await self.get(a); if (!o) throw new Error("missing"); await self.put(b, o.bytes, o.contentType); await self.delete(a); },
    publicUrl: (key) => (c.publicBase ? `${c.publicBase.replace(/\/$/, "")}/${key.replace(/^public\//, "").split("/").map(encodeURIComponent).join("/")}` : fileUrl(key)),
    publicViaApp: !c.publicBase,
  };
  if (c.purge) {
    const { zoneId, token } = c.purge;
    self.purge = async (keys) => {
      const r = await f(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ files: keys.map((k) => self.publicUrl(k)) }), signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`cdn_purge_${r.status}`);
    };
  }
  return self;
}

let testOverride: MediaStorage | null | undefined;
export const setStorageForTests = (s: MediaStorage | null | undefined) => { testOverride = s; };

/** Kova güvenliği: Production ve Preview aynı kovayı kullanamaz; özel ve genel kova ayrı olmalı. Sorun varsa yükleme kapanır. */
export function storageConfigIssue(env: NodeJS.ProcessEnv = process.env): string | null {
  const a = env.MEDIA_S3_PRIVATE_BUCKET, b = env.MEDIA_S3_PUBLIC_BUCKET;
  const required = [env.MEDIA_S3_ENDPOINT, env.MEDIA_S3_KEY, env.MEDIA_S3_SECRET, a, b];
  if (required.every((v) => !v)) return env.MEDIA_PUBLIC_BASE ? "eksik_degisken" : null;
  if (required.some((v) => !v)) return "eksik_degisken";
  if (!/^https:\/\/[^/]+\/?$/.test(env.MEDIA_S3_ENDPOINT!)) return "gecersiz_endpoint";
  if (env.MEDIA_PUBLIC_BASE && !/^https:\/\/[^/]+\/?$/.test(env.MEDIA_PUBLIC_BASE)) return "gecersiz_genel_adres";
  if (!!env.MEDIA_CF_ZONE_ID !== !!env.MEDIA_CF_PURGE_TOKEN) return "eksik_cdn_degiskeni";
  if (a === undefined || b === undefined) return null;
  if (a === b) return "ozel_ve_genel_ayni_kova";
  const names = `${a} ${b}`.toLowerCase();
  if (env.VERCEL_ENV === "production" && /preview|test|dev/.test(names)) return "productionda_test_kovasi";
  if (env.VERCEL_ENV !== "production" && /prod/.test(names)) return "testte_production_kovasi";
  return null;
}

/** Etkin depolama. Production'da yalnız tam S3 yapılandırması; Preview/yerelde yoksa test amaçlı veritabanı. */
export function getStorage(env: NodeJS.ProcessEnv = process.env): MediaStorage | null {
  if (testOverride !== undefined) return testOverride;
  const { MEDIA_S3_ENDPOINT: endpoint, MEDIA_S3_KEY: accessKeyId, MEDIA_S3_SECRET: secretAccessKey, MEDIA_S3_PRIVATE_BUCKET: privateBucket, MEDIA_S3_PUBLIC_BUCKET: publicBucket, MEDIA_PUBLIC_BASE: publicBase } = env;
  if (storageConfigIssue(env)) return null;
  const purge = env.MEDIA_CF_ZONE_ID && env.MEDIA_CF_PURGE_TOKEN ? { zoneId: env.MEDIA_CF_ZONE_ID, token: env.MEDIA_CF_PURGE_TOKEN } : undefined;
  if (endpoint && accessKeyId && secretAccessKey && privateBucket && publicBucket) return s3Storage({ endpoint, accessKeyId, secretAccessKey, privateBucket, publicBucket, publicBase, purge });
  return env.VERCEL_ENV === "production" ? null : dbStorage();
}

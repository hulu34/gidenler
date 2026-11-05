/* S3 PROTOKOL TESTİ — gerçek imzalı HTTP ile S3 uyumlu sunucuya (Actions'ta MinIO) karşı. R2 testi DEĞİLDİR; R2 bağlanınca aynı adaptör panelden denenir. */
import { s3Storage } from "../lib/media/storage";
import { checkStorage } from "../lib/media/storageCheck";
import { AwsClient } from "aws4fetch";

const endpoint = process.env.S3_TEST_ENDPOINT!, accessKeyId = process.env.S3_TEST_KEY!, secretAccessKey = process.env.S3_TEST_SECRET!;
let pass = 0, failed = 0;
const t = (n: string, c: unknown, x?: unknown) => { if (c) { pass++; console.log(`✓ ${n}`); } else { failed++; console.log(`✗ ${n}`, x ?? ""); } };
const conf = { endpoint, accessKeyId, secretAccessKey, privateBucket: "gidenler-test-ozel", publicBucket: "gidenler-test-genel", region: "us-east-1" };

async function main() {
  const admin = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "us-east-1" });
  for (const b of [conf.privateBucket, conf.publicBucket]) await admin.fetch(`${endpoint}/${b}`, { method: "PUT" });
  const s = s3Storage(conf);
  const body = Buffer.from("deneme");
  await s.put("pending/a/480.webp", body, "image/webp");
  const got = await s.get("pending/a/480.webp");
  t("yazma ve okuma", got?.bytes.equals(body) && got.contentType === "image/webp", got?.contentType);
  t("özel dosya imzasız okunamaz", (await fetch(`${endpoint}/${conf.privateBucket}/pending/a/480.webp`)).status === 403);
  t("onaylanmamış dosya genel kovada yok", (await admin.fetch(`${endpoint}/${conf.publicBucket}/pending/a/480.webp`)).status === 404);
  await s.move("pending/a/480.webp", "public/a/480.webp");
  t("taşıma: kaynak silinir, hedef genel kovada", !(await s.get("pending/a/480.webp")) && (await admin.fetch(`${endpoint}/${conf.publicBucket}/public/a/480.webp`)).status === 200);
  await s.delete("public/a/480.webp");
  t("silme", !(await s.get("public/a/480.webp")));
  await s.delete("public/a/480.webp");
  t("olmayan dosyayı silmek hata vermez", true);
  t("uygulama üzerinden sunum kipi", s.publicViaApp === true);
  const c = await checkStorage(s);
  t("panel denemesi geçer ve gerçek sürücü olarak raporlar", c.ok && c.real, c.steps);
  const bad = s3Storage({ ...conf, secretAccessKey: "yanlis-anahtar" });
  let threw = false; try { await bad.put("pending/b/480.webp", body, "image/webp"); } catch { threw = true; }
  t("yanlış anahtar başarı göstermez", threw);
  const cb = await checkStorage(bad);
  t("yanlış anahtarla panel denemesi başarısız", !cb.ok);
  const down = s3Storage({ ...conf, endpoint: "http://127.0.0.1:9" });
  let threw2 = false; try { await down.put("pending/c/480.webp", body, "image/webp"); } catch { threw2 = true; }
  t("depo kapalıyken hata", threw2);
  console.log(`SONUÇ ${pass}/${pass + failed}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

/* Restoran profili · CANLI (Production) adımları. MODE:
   once     — yalnız okuma: Pandeli'nin canlı veritabanındaki mevcut hali (geri dönüş için şifreli çıktı)
   uygula   — Pandeli içeriğini canlı veritabanına uygular (onaylı; yalnız pandeli-fatih)
   Log yalnız doğru/yanlış ve sayılar. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const HOST = process.env.ADAY_HOST, SLUG = "pandeli-fatih", MODE = process.env.MODE;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const rapor = async () => (await fetch(`${admin}?rapor=profil&slug=${SLUG}`, { headers: H })).json();
mkdirSync("out/canli", { recursive: true });
const r0 = await rapor();
console.log(`ortam=${r0.env} · profil ${r0.profile ? "VAR" : "yok"} · menü satırı ${r0.counts?.menuRows} · kaynak ${r0.counts?.provRows} · video ${r0.videos?.length} · denetim ${r0.audits?.length}`);
if (r0.env !== "production") { console.log("✗ canlı ortam değil"); process.exit(1); }
writeFileSync(`out/canli/${MODE}-once.json`, JSON.stringify(r0, null, 1));
if (MODE === "uygula") {
  const profile = JSON.parse(readFileSync(new URL(`./profil/${SLUG}.json`, import.meta.url), "utf8"));
  const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "production", profile }) });
  const j = await r.json().catch(() => ({}));
  writeFileSync(`out/canli/uygula-yanit.json`, JSON.stringify(j, null, 1));
  console.log(`${r.status === 200 && j.ok ? "✓" : "✗"} canlı uygulama · durum=${r.status} profil=${j.profileOk} alan=${j.fields} menü=${j.menuItems} video=${j.videosOk}/${j.videosTotal} denetim=${j.auditId ?? "-"} ${j.error ?? ""}`);
  const r1 = await rapor();
  writeFileSync(`out/canli/uygula-sonra.json`, JSON.stringify(r1, null, 1));
  console.log(`sonra: menü bölüm ${r1.profile?.menu?.sections?.length} · kalem ${r1.profile?.menu?.sections?.reduce((a, s) => a + s.items.length, 0)} · video ${r1.videos?.length} · telefon ${r1.profile?.phone?.value}`);
  process.exit(r.status === 200 && j.ok ? 0 : 1);
}

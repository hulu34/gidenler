/* İlk 5 yeni restoran · CANLI (Production) adımları. Kapsam YALNIZ bu beş slug; başka restorana yazılmaz.
   MODE=once   — yalnız okuma: her restoranın canlı veritabanındaki mevcut hali (profil, menü sürümü, video kimlikleri) şifreli yedek
   MODE=uygula — önce aynı yedek, sonra restoranları SIRAYLA uygular. Bir restoranda hata ya da kısmi uygulama (207) olursa DURUR,
                 sonrakilere geçmez. Log yalnız doğru/yanlış, sayılar ve geri dönüş kimlikleri (denetim / menü sürümü / video kimliği).
   Önceki menü sürümü ve profil, şifreli yedekteki *-once.json içinde (profile.menu ve kaynak kayıtları). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const HOST = process.env.ADAY_HOST, MODE = process.env.MODE;
const SLUGS = ["balikci-sabahattin-fatih", "yeni-lokanta-beyoglu", "filizler-koftecisi-uskudar", "del-mare-uskudar", "viktor-levi-sarap-evi-kadikoy"];
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const rapor = async (s) => (await fetch(`${admin}?rapor=profil&slug=${s}`, { headers: H })).json();
mkdirSync("out/canli5", { recursive: true });
const ozet = (r) => `profil ${r.profile ? "VAR" : "yok"} · menü kalemi ${r.profile?.menu?.sections?.reduce((a, s) => a + s.items.length, 0) ?? 0} · video ${r.videos?.length ?? 0} [${(r.videos ?? []).map((v) => v.id).join(",")}] · son denetim ${r.audits?.[0]?.id ?? "-"}`;
let hata = false;
for (const s of SLUGS) {
  const r0 = await rapor(s);
  if (r0.env !== "production") { console.log(`✗ ${s}: canlı ortam değil (${r0.env})`); process.exit(1); }
  if (!r0.place) { console.log(`✗ ${s}: restoran canlı veritabanında yok`); process.exit(1); }
  writeFileSync(`out/canli5/${s}-once.json`, JSON.stringify(r0, null, 1));
  console.log(`\n── ${s}\n  ÖNCE: ${ozet(r0)}`);
}
if (MODE === "uygula") {
  for (const s of SLUGS) {
    const profile = JSON.parse(readFileSync(new URL(`./profil/${s}.json`, import.meta.url), "utf8"));
    const n = profile.menu.sections.reduce((a, x) => a + x.items.length, 0);
    const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "profile-apply", confirm: "EVET", target: "production", profile }) });
    const j = await r.json().catch(() => ({}));
    writeFileSync(`out/canli5/${s}-yanit.json`, JSON.stringify(j, null, 1));
    const r1 = await rapor(s);
    writeFileSync(`out/canli5/${s}-sonra.json`, JSON.stringify(r1, null, 1));
    const okk = r.status === 200 && j.ok === true && j.videosOk === profile.videos.length && r1.profile?.menu?.sections?.reduce((a, x) => a + x.items.length, 0) === n && r1.videos?.length === profile.videos.length;
    console.log(`${okk ? "✓" : "✗"} ${s} canlı uygulama · HTTP ${r.status} alan=${j.fields} menü=${j.menuItems}/${n} menüSürümü=${j.menuVersion ?? "-"} video=${j.videosOk}/${j.videosTotal} denetim=${j.auditId ?? "-"} ${j.error ?? ""}`);
    console.log(`  SONRA: ${ozet(r1)}`);
    for (const v of j.videos ?? []) if (!v.ok) console.log(`  video hatası: ${v.error}`);
    if (!okk) { hata = true; console.log("  DUR: hata ya da kısmi uygulama; sonraki restoranlara geçilmedi"); break; }
  }
}
process.exit(hata ? 1 : 0);

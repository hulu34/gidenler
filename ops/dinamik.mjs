/* Dinamik canlı veri testi (aday Production dağıtımı): yeniden derleme olmadan
   · Google eşleşmesi veritabanından mı geliyor (onaylı: rozet yeri var; bekletilen: yok)
   · Video değişikliği önbelleği hemen geçersiz kılıyor mu (Agora videosu kaldır → sayfa günceller → geri ekle) */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TEST_HOST;
const H = { "x-vercel-protection-bypass": BYPASS, "user-agent": "Mozilla/5.0 Chrome/130" };
const page = async (slug) => (await fetch(`https://${HOST}/mekan/${slug}/?t=${Date.now()}`, { headers: H })).text();
const badge = (h) => h.includes("Google puanı yükleniyor");
const video = (h) => (h.match(/>Video<\/span><span class="sr-only">(var|henüz yok)/) ?? [])[1];
const post = async (b) => (await fetch(`https://${HOST}/api/admin/db/`, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify({ confirm: "EVET", target: "production", ...b }) })).json();
const until = async (slug, want, label) => { const t0 = Date.now(); for (let i = 0; i < 20; i++) { const v = video(await page(slug)); if (v === want) { console.log(`✓ ${label}: ${v} (${Math.round((Date.now() - t0) / 1000)} sn)`); return true; } await new Promise((r) => setTimeout(r, 3000)); } console.log(`✗ ${label}: beklenen ${want}`); return false; };

const ag = await page("agora-meyhanesi-1890-fatih"), aga = await page("aga-ocakbasi-beyoglu"), ciya = await page("ciya-sofrasi-kadikoy");
console.log(`${badge(ag) ? "✓" : "✗"} onaylı eşleşme (Agora): Google rozeti yeri sunucudan`);
console.log(`${!badge(aga) ? "✓" : "✗"} bekletilen eşleşme (AGA): Google yok`);
console.log(`${video(ciya) === "var" ? "✓" : "✗"} profil tamlığı Çiya: Video ${video(ciya)}`);
console.log(`profil tamlığı Agora başlangıç: Video ${video(ag)}`);
const vids = (await (await fetch(`https://${HOST}/api/media/agora-meyhanesi-1890-fatih/`, { headers: H })).json()).videos ?? [];
const v = vids[0];
if (!v) { console.log("Agora videosu yok"); process.exit(1); }
const r1 = await post({ action: "media-remove", id: v.id });
console.log("yayından kaldır:", r1.ok);
const a = await until("agora-meyhanesi-1890-fatih", "henüz yok", "kaldırınca sayfa güncellendi (derlemesiz)");
const r2 = await post({ action: "media-add", slug: "agora-meyhanesi-1890-fatih", url: v.url, credit: v.credit });
console.log("geri ekle:", r2.ok, r2.created === false ? "(aynı kayıt, mükerrer yok)" : "");
const b = await until("agora-meyhanesi-1890-fatih", "var", "geri ekleyince sayfa güncellendi");
process.exit(a && b ? 0 : 1);

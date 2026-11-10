/* SEYREK İLÇE PAKETİ (dalga 5) denetimi. Çalıştır: npx tsx scripts/seyrektest.ts */
import { readFileSync } from "node:fs";
import raw from "../data/real/venues.json";

let pass = 0, fail = 0;
const ok = (n: string, c: unknown, i?: unknown) => { if (c) pass++; else { fail++; console.log("✗", n, i ?? ""); } };
type R = { slug: string; ref: string; name: string; district: string; kind: string; address?: string; lat?: number; lng?: number; wave?: number; verifiedAt?: string; confidence?: string; verification?: string };
const all = raw as R[];
const w5 = all.filter((v) => v.wave === 5);
const P = JSON.parse(readFileSync("data/paket/seyrek-paket.json", "utf8")) as { eklenen: Array<{ slug: string; kaynak: string[]; kontrolTarihi: string; kanitSeviyesi: string; ilce: string; mahalle: string | null; tur: string }>; inceleme: Array<{ neden: string[] }> };

ok("ilk 456 kayıt aynen (dalga 0–1)", all.filter((v) => (v.wave ?? 0) < 2).length === 456);
ok("140/104/206 paketleri bu dalda YOK (ayrı yayın paketleri)", !all.some((v) => v.wave === 2 || v.wave === 3 || v.wave === 4));
ok(`dalga 5: ${w5.length} kayıt = paket dosyası`, w5.length === P.eklenen.length && w5.every((v) => P.eklenen.some((e) => e.slug === v.slug)));
ok("her kayıtta OSM kaynağı, sokak adresi, koordinat (İstanbul içi)", w5.every((v) => /^(node|way|relation)\/\d+$/.test(v.ref) && !!v.address && typeof v.lat === "number" && v.lat > 40.8 && v.lat < 41.6 && typeof v.lng === "number" && v.lng > 27.9 && v.lng < 29.95));
ok("her kayıtta doğrulama tarihi, güven ve kanıt (Google'sız)", w5.every((v) => v.verifiedAt === "2026-11-10" && (v.confidence === "güçlü" || v.confidence === "orta") && !!v.verification && !/google/i.test(v.verification)));
ok("her paket satırında ad/ilçe/tür, kaynak bağlantısı (OSM + kanıt) ve kontrol tarihi", P.eklenen.every((e) => e.ilce && e.tur && e.kontrolTarihi === "2026-11-10" && (e.kaynak.length >= 2 || e.kanitSeviyesi.includes("OSM yerinde")) && e.kaynak[0].startsWith("https://www.openstreetmap.org/")));
ok("kaynaklarda Google bağlantısı yok", P.eklenen.every((e) => e.kaynak.every((u) => !/google\.|goo\.gl|g\.co\//i.test(u))));
ok("yalnız 'Restoran' türünde kayıt yok (inceleme listesine gitti)", w5.every((v) => v.kind !== "Restoran"));
const slugs = new Set<string>(); const refs = new Set<string>();
ok("slug ve OSM kaydı tekrarsız (tüm katalogda)", all.every((v) => !slugs.has(v.slug) && slugs.add(v.slug)) && all.filter((v) => /^(node|way|relation)\//.test(v.ref)).every((v) => !refs.has(v.ref) && refs.add(v.ref)));
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const near = (a: R, b: R) => Math.hypot(((a.lat ?? 0) - (b.lat ?? 0)) * 111000, ((a.lng ?? 0) - (b.lng ?? 0)) * 84000);
ok("aynı ad + 150 m içinde ikinci kayıt yok", w5.every((v) => !all.some((o) => o.slug !== v.slug && fold(o.name) === fold(v.name) && near(o, v) < 150)));
ok("seyrek ilçelere gidiyor (Kadıköy, Beşiktaş, Beyoğlu, Fatih, Şişli yok)", w5.every((v) => !["Kadıköy", "Beşiktaş", "Beyoğlu", "Fatih", "Şişli"].includes(v.district)));
ok("inceleme listesinde her satırın nedeni yazılı", P.inceleme.every((r) => r.neden.length > 0));
const sor = readFileSync("data/real/sor-index.json", "utf8");
ok("yeni mekânlar Sor dizininde", w5.every((v) => sor.includes(`"${v.slug}"`)));
console.log(`\nseyrek paket: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);

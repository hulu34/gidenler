/* KAPANIŞ İŞARETLERİ · UYGULAMA — kapanis-kararlari-*.json'u data/real/kapanis.json'a yazar. Varsayılan kip yalnız denetimdir.
   - "kural" satırları (görünür etkisi yok): mevcut kayda not ("note" sonuna " · 12 Kasım: …") ve ikinci kaynak ("sources"),
     ya da yeni closed_suspected kaydı. Mevcut state, checkedAt ve diğer alanlar değişmez.
   - "sahip" satırları (profil ve listeleri etkileyebilir) yalnız --sahip=<slug,slug|hepsi> ile, sahip onayı verilenler uygulanır;
     yama alanları kayda yazılır, eski not korunur ve yeninin önüne eklenir.
   Kayıt beklenen durumda değilse (state değişmiş, yeni şüphe zaten var) atlanır ve raporlanır. Production veritabanına bir şey yazmaz.
   --sahip=onayli: karar dosyasında sahip onayı (onay.karar = "onaylandı") kayıtlı olanların hepsi uygulanır (yayın komutu).
   --yalniz=<slug>: yalnız o kaydın kural satırı (ve onaylıysa sahip satırı) uygulanır; tek tek test için.
   Kullanım: node scripts/katalog/kapanis-uygula.mjs <kapanis-kararlari.json> [--yaz] [--sahip=a,b|hepsi] [--yalniz=slug] */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2); const kp = args[0];
const yaz = args.includes("--yaz"); const sahipArg = args.find((a) => a.startsWith("--sahip="))?.slice(8) ?? "";
const K = JSON.parse(readFileSync(kp, "utf8"));
const P = "data/real/kapanis.json"; const KAP = JSON.parse(readFileSync(P, "utf8"));
const yalniz = args.find((a) => a.startsWith("--yalniz="))?.slice(9) ?? null;
const onayli = new Set(sahipArg === "hepsi" ? K.sahip.map((x) => x.slug) : sahipArg === "onayli" ? K.sahip.filter((x) => x.onay?.karar === "onaylandı").map((x) => x.slug) : sahipArg.split(",").filter(Boolean));
const rapor = { kural: 0, sahip: 0, atlanan: [], bilinmeyenOnay: [...onayli].filter((s) => !K.sahip.some((x) => x.slug === s)) };
const kaynakEkle = (r, s) => { if (!s?.length) return r; const eski = r.sources ?? []; return { ...r, sources: [...eski, ...s.filter((u) => !eski.includes(u))] }; };
for (const x of K.kural) {
  if (yalniz && x.slug !== yalniz) continue;
  const r = KAP[x.slug];
  if (x.islem === "yeni-supheli") {
    if (r) { rapor.atlanan.push(`${x.slug}: kapanış kaydı zaten var (${r.state})`); continue; }
    KAP[x.slug] = x.kayit; rapor.kural++; continue;
  }
  if (!r || r.state !== x.durum) { rapor.atlanan.push(`${x.slug}: durum ${r?.state ?? "yok"} (beklenen ${x.durum})`); continue; }
  if ((r.note ?? "").includes(x.ek)) { rapor.atlanan.push(`${x.slug}: not zaten var`); continue; }
  KAP[x.slug] = kaynakEkle({ ...r, note: `${r.note} · ${x.ek}` }, x.sources); rapor.kural++;
}
for (const x of K.sahip) {
  if (!onayli.has(x.slug) || (yalniz && x.slug !== yalniz)) continue;
  const r = KAP[x.slug];
  if (!r) { rapor.atlanan.push(`${x.slug}: kapanış kaydı yok`); continue; }
  if (r.state === x.yama.state && r.checkedAt === x.yama.checkedAt) { rapor.atlanan.push(`${x.slug}: zaten uygulanmış`); continue; }
  const { sources, note, ...alan } = x.yama;
  KAP[x.slug] = kaynakEkle({ ...r, ...alan, note: `${note} · önceki kayıt (${r.checkedAt}, ${r.state}): ${r.note}` }, sources); rapor.sahip++;
}
if (yaz) writeFileSync(P, JSON.stringify(KAP, null, 1) + "\n");
console.log(JSON.stringify({ kip: yaz ? "yazıldı" : "yalnız denetim", yalniz, sahipOnayli: [...onayli], ...rapor }, null, 1));

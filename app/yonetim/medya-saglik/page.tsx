import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getStorage, storageConfigIssue } from "@/lib/media/storage";
import { StorageCheck } from "./StorageCheck";
import { staffRole } from "@/lib/media/photoArchive";
import { mediaHealth } from "@/lib/media/health";
import { opsLastDays } from "@/lib/ops";
import { MONTHLY_USD_CAP, spendReport } from "@/lib/usage/counter";

/* YÖNETİM · MEDYA SAĞLIĞI — yalnız okuma. Google'a hiç istek atmaz; "Google'a bağlı" sayısı izin politikasından gelir, ödenen çağrı değildir. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · medya sağlığı", robots: { index: false, follow: false } };

const OPS_LABEL: Record<string, string> = { "search:empty": "Sonuçsuz arama", "page:error": "Sayfa hatası", "review:send_failed": "Deneyim gönderilemedi", "upload:client_failed": "Yükleme bağlantı hatası", "moderation:failed": "Moderasyon işlemi başarısız", "upload:storage_failed": "Depolama hatası" };
async function googleSpend() {
  try { const r = await spendReport(); return r ? { usd: r.usd.toFixed(2), cap: MONTHLY_USD_CAP } : null; } catch { return null; }
}

const Stat = ({ k, v, note }: { k: string; v: number | string | null; note?: string }) => (
  <div className="border-t border-line pt-2">
    <dt className="text-[12px] font-semibold text-ink-3">{k}</dt>
    <dd className="text-[24px] font-extrabold tabular-nums">{v ?? "—"}</dd>
    {note && <p className="text-[11.5px] text-ink-3">{note}</p>}
  </div>
);

export default async function Page() {
  const db = getDb();
  const u = db ? await currentUser(await headers()) : null;
  const role = db && u ? await staffRole(db, u.id).catch(() => null) : null;
  if (!db || !u || !role) notFound();
  const storage = getStorage(), issue = storageConfigIssue();
  const h = await mediaHealth(db, storage);
  const a = h.archive;
  const ops = await opsLastDays().catch(() => []);
  const spend = await googleSpend();
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Medya sağlığı</h1>
      <p className="mt-1 text-[13px] text-ink-3">Kayıtlardan hesaplanır. "—" ölçülemedi demektir. </p>
      <p data-storage-state className="mt-2 text-[14px] font-semibold">Depolama: {issue ? `kapalı, yapılandırma hatası (${issue})` : !storage ? "yapılandırılmamış, yükleme kapalı" : storage.provider === "s3" ? "kalıcı (S3 uyumlu)" : "TEST DEPOLAMASI, kalıcı arşiv değil"}{storage?.provider === "s3" && !storage.purge ? " · CDN temizliği yapılandırılmamış: kaldırılan dosya en çok 1 saat önbellekte kalabilir" : ""}</p>
      <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold underline underline-offset-2"><a href="/yonetim/fotograf-moderasyon/">Moderasyon</a>{role === "admin" && <a href="/yonetim/medya-editor/">İzinli fotoğraflar</a>}</nav>
      {role === "admin" && <StorageCheck />}
      <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Stat k="Toplam restoran" v={h.total} />
        <Stat k="Kendi kapağı olan" v={h.ownCover} note={Object.entries(h.ownBySource).map(([k, v]) => `${k}: ${v}`).join(" · ")} />
        <Stat k="Editör seçimi kapak" v={h.selectedCover} />
        <Stat k="Google'a bağımlı" v={h.googleOnly} note="Eşleşmesi kullanılabilir, kendi kapağı yok; çağrı sayısı değil" />
        <Stat k="Kapağı hiç olmayan" v={h.noCover} />
        <Stat k="Bekleyen" v={a?.pending ?? null} />
        <Stat k="Onaylı" v={a?.approved ?? null} note={a ? Object.entries(a.bySource).map(([k, v]) => `${k}: ${v}`).join(" · ") : undefined} />
        <Stat k="Kullanıcı fotoğrafı olan restoran" v={a?.withGallery ?? null} />
        <Stat k="Reddedilen" v={a?.rejected ?? null} />
        <Stat k="Kaldırılan" v={a?.removed ?? null} />
        <Stat k="Hak kaydı eksik" v={a ? a.missingRights + h.registryMissingRights : h.registryMissingRights} note="Kullanıcı ve izinli fotoğraf" />
        <Stat k="Depolama hatası" v={ops.find((o) => o.key === "upload:storage_failed")?.n ?? 0} note="Son 7 gün" />
        <Stat k="Kırık dosya" v={a?.broken ?? null} note="Son 50 onaylı" />
        <Stat k="Son 7 gün yüklenen" v={a?.uploadedLast7 ?? null} />
        <Stat k="Silinmeyi bekleyen dosya" v={a?.cleanupOpen ?? null} note={a?.cleanupStuck ? `${a.cleanupStuck} tanesi 3+ denemede` : undefined} />
        <Stat k="Son 7 gün onaylanan" v={a?.approvedLast7 ?? null} />
        <Stat k="Şube kanıtı bekleyen izinli fotoğraf" v={h.heldRegistry} note="Bağlanmadı" />
      </dl>
      <h2 className="mt-10 text-[17px] font-extrabold">Ürün sağlığı · son 7 gün</h2>
      <p className="mt-1 text-[12.5px] text-ink-3">Uygulama içi sayaçlar; kullanıcı ve sorgu metni tutulmaz. Sunucu 5xx sayısı burada yok, Vercel günlüklerindedir.</p>
      {ops.length ? <ul className="mt-2 grid gap-1 text-[14px] sm:grid-cols-2">{ops.map((o) => <li key={o.key} className="flex justify-between border-b border-line py-1"><span>{OPS_LABEL[o.key] ?? o.key}</span><b className="tabular-nums">{o.n}</b></li>)}</ul> : <p className="mt-2 text-[13px]">Kayıtlı olay yok (0).</p>}
      <h2 className="mt-8 text-[17px] font-extrabold">Google bütçesi</h2>
      {spend ? <p className="mt-1 text-[14px]">Bu ay tahmini {spend.usd} USD · aylık tavan {spend.cap} USD. Faturadan doğrulanmamıştır.</p> : <p className="mt-1 text-[13px] text-ink-3">Redis yapılandırılmamış; harcama sayacı okunamadı.</p>}
      <h2 className="mt-10 text-[17px] font-extrabold">En çok fotoğrafı olan restoranlar</h2>
      {h.topRestaurants.length ? <ol className="mt-2 list-decimal pl-5 text-[14px]">{h.topRestaurants.map((r) => <li key={r.slug}><a className="underline underline-offset-2" href={`/mekan/${r.slug}/`}>{r.slug}</a> · {r.n}</li>)}</ol> : <p className="mt-2 text-[13px] text-ink-3">Henüz onaylı fotoğraf yok.</p>}
    </div>
  );
}

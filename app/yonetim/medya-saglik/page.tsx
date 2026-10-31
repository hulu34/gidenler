import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/media/storage";
import { staffRole } from "@/lib/media/photoArchive";
import { mediaHealth } from "@/lib/media/health";

/* YÖNETİM · MEDYA SAĞLIĞI — yalnız okuma. Google'a hiç istek atmaz; "Google'a bağlı" sayısı izin politikasından gelir, ödenen çağrı değildir. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · medya sağlığı", robots: { index: false, follow: false } };

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
  if (!db || !u || !(await staffRole(db, u.id).catch(() => null))) notFound();
  const h = await mediaHealth(db, getStorage());
  const a = h.archive;
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Medya sağlığı</h1>
      <p className="mt-1 text-[13px] text-ink-3">Kayıtlardan hesaplanır. "—" ölçülemedi demektir. Depolama: {h.storage ?? "yapılandırılmamış"}.</p>
      <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Stat k="Toplam restoran" v={h.total} />
        <Stat k="Kendi kapağı olan" v={h.ownCover} note={Object.entries(h.ownBySource).map(([k, v]) => `${k}: ${v}`).join(" · ")} />
        <Stat k="Editör seçimi kapak" v={h.selectedCover} />
        <Stat k="Google izni olan, kapağı yok" v={h.googleOnly} note="Politika sayısı, çağrı değil" />
        <Stat k="Kapağı hiç olmayan" v={h.noCover} />
        <Stat k="Bekleyen" v={a?.pending ?? null} />
        <Stat k="Onaylı" v={a?.approved ?? null} note={a ? Object.entries(a.bySource).map(([k, v]) => `${k}: ${v}`).join(" · ") : undefined} />
        <Stat k="Galerisi olan restoran" v={a?.withGallery ?? null} />
        <Stat k="Reddedilen" v={a?.rejected ?? null} />
        <Stat k="Kaldırılan" v={a?.removed ?? null} />
        <Stat k="Hak kaydı eksik" v={a?.missingRights ?? null} />
        <Stat k="Kırık dosya" v={a?.broken ?? null} note="Son 50 onaylı" />
        <Stat k="Son 7 gün onaylanan" v={a?.approvedLast7 ?? null} />
        <Stat k="Şüpheli şube eşleşmesi" v={h.suspiciousBranch} note="Bu raporda henüz ölçülmüyor" />
      </dl>
      <h2 className="mt-10 text-[17px] font-extrabold">En çok fotoğrafı olan restoranlar</h2>
      {h.topRestaurants.length ? <ol className="mt-2 list-decimal pl-5 text-[14px]">{h.topRestaurants.map((r) => <li key={r.slug}><a className="underline underline-offset-2" href={`/mekan/${r.slug}/`}>{r.slug}</a> · {r.n}</li>)}</ol> : <p className="mt-2 text-[13px] text-ink-3">Henüz onaylı fotoğraf yok.</p>}
    </div>
  );
}

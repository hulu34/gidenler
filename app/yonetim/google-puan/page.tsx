import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { staffRole } from "@/lib/media/photoArchive";
import { dailyReport } from "@/lib/gpuan/store";
import { GoogleDecision } from "./GoogleDecision";

/* YÖNETİM · GOOGLE PUANI GÜNLÜK RAPORU — yetki sunucuda (oturum + staff_roles). Yetkisiz kişi sayfanın varlığını da görmez.
   Sabah tek bakış: son çalışma, siteye yazılan/gizlenen, hata, inceleme bekleyen. Google'a istek yok. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · Google puanı", robots: { index: false, follow: false } };

const tr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
function Tile({ k, v, tone }: { k: string; v: string | number; tone?: "ok" | "warn" | "bad" }) {
  const c = tone === "bad" ? "border-neg text-neg" : tone === "warn" ? "border-line-2 text-ink" : "border-line text-ink";
  return <div className={`rounded-xl border px-4 py-3 ${c}`}><div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{k}</div><div className="mt-1 text-[26px] font-extrabold tnum">{v}</div></div>;
}

/** Korumalı dağıtım adresi (Vercel Authentication arkasında): rapor salt okunur görülebilir; karar yine personel oturumu ister. */
function protectedHost(h: Headers) {
  if (!process.env.VERCEL) return false;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].map((x) => (x ?? "").toLowerCase()).filter((x) => x.endsWith(".vercel.app")).includes(host);
}

export default async function Page() {
  const db = getDb();
  const h = await headers();
  const u = db ? await currentUser(h).catch(() => null) : null;
  const role = db && u ? await staffRole(db, u.id).catch(() => null) : null;
  if (!db || (!role && !protectedHost(h))) notFound();
  const r = await dailyReport(db);
  const failed = r.lastImport?.status === "rejected";
  /* Her sabah 06:00 ana + 08:30 yedek çalışma; ikisi de kaçarsa son aktarım 27 saatten eski olur */
  const lateHours = r.lastImport ? Math.floor((Date.now() - Date.parse(r.lastImport.at)) / 3.6e6) : null;
  const late = lateHours === null || lateHours > 27;
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7" data-gpuan-rapor>
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Google puanı · günlük rapor</h1>
      <p className="mt-1 max-w-[75ch] text-[13px] text-ink-3">Her sabah 06:00 çalışmasının (tetiklenmezse 08:30 yedeğinin) sonucu. Google puanı 5 üzerindendir, Gidenler puanı değildir. Kaynak geçicidir (Google Maps herkese açık sayfası; hizmet şartları riski raporda).</p>
      <p className={`mt-4 text-[14px] font-semibold ${failed ? "text-neg" : "text-ink"}`}>
        Son çalışma: {tr(r.lastRun.at)} · aktarım {r.lastImport ? (r.lastImport.status === "applied" ? "uygulandı" : "REDDEDİLDİ — site verisi değişmedi") : "yok"} ({tr(r.lastImport?.at)})
      </p>
      {late ? <p className="mt-2 text-[14px] font-semibold text-neg" data-gecikme>Günlük çalışma gecikti: son aktarım {lateHours === null ? "hiç yok" : `${lateHours} saat önce`}. Site son doğru veriyi göstermeye devam ediyor; 45 günü geçen puanlar kendiliğinden gizlenir.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile k="Bugün denenen (TR günü)" v={r.lastRun.attempted} />
        <Tile k="Bugün güncellenen puan" v={r.lastRun.updated} />
        <Tile k="Bugün değişmeyen puan" v={r.lastRun.unchanged} />
        <Tile k="Hata / engel" v={`${r.lastRun.errors} / ${r.lastRun.blocked}`} tone={r.lastRun.blocked ? "bad" : r.lastRun.errors ? "warn" : "ok"} />
        <Tile k="İnceleme bekleyen" v={r.review.length} tone={r.review.length ? "warn" : "ok"} />
        <Tile k="Şüpheli eşleşme" v={r.wrong.length} tone={r.wrong.length ? "warn" : "ok"} />
        <Tile k="Sitede gösterilen" v={r.site.shown} />
        <Tile k="Sitede gizlenen" v={r.site.hidden} />
        <Tile k="Kesin kapalı" v={r.closures.confirmed} />
        <Tile k="Kapanma şüphesi" v={r.closures.suspected.length} />
        <Tile k="45 günü geçen (gizli)" v={r.site.stale} tone={r.site.stale ? "warn" : "ok"} />
        <Tile k="Son Excel sürümü" v={r.file ? tr(r.file.createdAt) : "yok"} tone={r.file ? "ok" : "bad"} />
      </div>
      {r.lastImport?.errors?.length ? <ul className="mt-3 list-disc pl-5 text-[13px] text-neg">{r.lastImport.errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}

      <h2 className="mt-10 text-[18px] font-bold">Nihai durum (her mekân için tek cevap)</h2>
      <table className="mt-2 text-[13px]"><tbody>{Object.entries(r.final).map(([k, v]) => <tr key={k}><td className="py-0.5 pr-6 text-ink-2">{k}</td><td className="tnum font-semibold">{v}</td></tr>)}</tbody></table>

      <h2 className="mt-10 text-[18px] font-bold">İnceleme bekleyenler ({r.review.length})</h2>
      <p className="text-[12px] text-ink-3">Eşleşmesi onay bekleyen ya da türü elle doğrulanmalı. Onay yalnız bu place ID için geçerlidir; gerekçe zorunlu, her karar denetim kaydına yazılır.</p>
      <GoogleDecision rows={r.review} canDecide={role === "admin"} />

      <h2 className="mt-10 text-[18px] font-bold">Yanlış eşleşme şüphesi ({r.wrong.length})</h2>
      <GoogleDecision rows={r.wrong} canDecide={role === "admin"} />

      <h2 className="mt-10 text-[18px] font-bold">Okuma hataları ({r.readErrors.length})</h2>
      <ul className="mt-2 text-[13px] text-ink-2">{r.readErrors.slice(0, 60).map((x) => <li key={x.slug}>{x.name} · {x.district} — {x.reason}</li>)}</ul>

      <h2 className="mt-10 text-[18px] font-bold">Kapanma şüphesi — elle inceleme ({r.closures.suspected.length})</h2>
      <ul className="mt-2 text-[13px] text-ink-2">{r.closures.suspected.map((x) => <li key={x.slug}><a className="underline" href={`/mekan/${x.slug}/`}>{x.slug}</a> — {x.note}</li>)}</ul>

      <h2 className="mt-10 text-[18px] font-bold">Son aktarımlar</h2>
      <table className="mt-2 text-[13px]"><tbody>{r.recentImports.map((i) => <tr key={i.at}><td className="pr-6">{tr(i.at)}</td><td className="pr-6">{i.status === "applied" ? "uygulandı" : "reddedildi"}</td><td className="tnum pr-6">yazılan {i.written}</td><td className="tnum">gizlenen {i.hidden}</td></tr>)}</tbody></table>
    </div>
  );
}

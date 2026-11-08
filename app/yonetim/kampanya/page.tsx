import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adminAccess } from "@/lib/yonetim/access";
import { campaignReport } from "@/lib/kampanya/server";
import { CAMPAIGN_MESSAGE, CREATOR_CODES, STEPS, campaignLink } from "@/lib/kampanya";

/* YÖNETİM · KAMPANYA DÖNÜŞÜMÜ — "İstanbul'da en son nerede yemek yedin?" akışı. Sayılar günlük tekil ziyaretçi toplamıdır
   (ziyaretçi özeti günlük tuzla; günler arası kişi eşleştirilemez — KVKK gereği bilinçli tasarım). "Kaydedildi" ve "Mekân önerdi"
   yalnız sunucuda gerçek kayıt oluşunca yazılır. Üretimde bot, önizleme ve test hesabı sayılmaz. Tahmini/sahte sayı yok. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · Kampanya", robots: { index: false, follow: false } };

const pct = (a: number | undefined, b: number | undefined) => (a && b ? `%${Math.round((100 * a) / b)}` : "—");

export default async function Page({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const a = await adminAccess();
  if (!a) notFound();
  const days = Math.min(120, Math.max(1, Number((await searchParams).gun) || 30));
  const r = await campaignReport(a.db, days);
  const origin = process.env.VERCEL_ENV === "production" ? "https://www.gidenler.com" : `https://${a.host}`;
  const cols = STEPS.map(([k, l]) => ({ k, l }));
  const rows = [...r.rows].sort((x, y) => (y.steps.ziyaret ?? 0) - (x.steps.ziyaret ?? 0));
  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-8 sm:px-7" data-kampanya-rapor>
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Kampanya · İstanbul&apos;da en son nerede yemek yedin?</h1>
      <p className="mt-1 max-w-[86ch] text-[13px] text-ink-3">
        Son {days} gün ({r.since} sonrası). Hücreler günlük tekil ziyaretçi toplamıdır. Kişisel veri, arama metni ve seçilen mekân saklanmaz.
        &ldquo;Kaydedildi&rdquo; yalnız sunucuda yeni deneyim oluştuğunda sayılır. Kampanya kaynağı sıralamaya ve Gidenler puanına girmez.
      </p>
      <p className="mt-3 flex gap-3 text-[13px] font-semibold">{[7, 30, 90].map((d) => <a key={d} href={`?gun=${d}`} className={d === days ? "text-accent-ink" : "underline decoration-line-2 underline-offset-4"}>{d} gün</a>)}</p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-[13px] tnum">
          <thead><tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-[0.1em] text-ink-3">
            <th className="py-2 pr-3">Kaynak</th>{cols.map((c) => <th key={c.k} className="px-2 py-2 text-right" title={c.l}>{c.l}</th>)}<th className="px-2 py-2 text-right">Ziyaret → kayıt</th><th className="px-2 py-2 text-right">Form → kayıt</th>
          </tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.code} className="border-b border-line" data-kampanya-satir={o.code}>
                <td className="py-2 pr-3"><span className="font-semibold">{o.label}</span> <span className="text-ink-3">· {o.code}</span></td>
                {cols.map((c) => <td key={c.k} className="px-2 py-2 text-right">{o.steps[c.k] ?? 0}</td>)}
                <td className="px-2 py-2 text-right font-semibold">{pct(o.steps.tamam, o.steps.ziyaret)}</td>
                <td className="px-2 py-2 text-right">{pct(o.steps.tamam, o.steps.form)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-ink font-bold" data-kampanya-toplam><td className="py-2 pr-3">Toplam</td>{cols.map((c) => <td key={c.k} className="px-2 py-2 text-right">{r.total[c.k] ?? 0}</td>)}<td className="px-2 py-2 text-right">{pct(r.total.tamam, r.total.ziyaret)}</td><td className="px-2 py-2 text-right">{pct(r.total.tamam, r.total.form)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Yarım kalan akış = formu açıp kayda ulaşmayanlar ({Math.max(0, (r.total.form ?? 0) - (r.total.tamam ?? 0))}). Başarısız kayıt denemeleri &ldquo;Kayıt başarısız&rdquo; sütununda. Oranlar günlük tekil sayılardan hesaplanır: aynı kişi bir gün bağlantıyı görüp başka gün kaydederse oran %100&apos;ü geçebilir; bu bir hata değildir, kişiler günler arasında bilinçli olarak eşleştirilmez.</p>

      <h2 className="mt-12 text-[18px] font-extrabold">İçerik üreticisi bağlantıları</h2>
      <p className="mt-1 max-w-[80ch] text-[13px] text-ink-3">Her üreticiye kendi bağlantısını ver. Bağlantı doğrudan deneyim akışını açar. Kod–kişi eşleşmesini depoda değil, kendi notunda tut. Önerilen metin: &ldquo;{CAMPAIGN_MESSAGE}&rdquo;</p>
      <ul className="mt-3 divide-y divide-line border-y border-line text-[13.5px]">
        {CREATOR_CODES.map((c) => <li key={c.code} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-semibold">{c.label}</span><code className="select-all break-all text-ink-2" data-kampanya-baglanti>{campaignLink(c.code, origin)}</code></li>)}
      </ul>
    </div>
  );
}

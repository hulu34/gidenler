import Link from "next/link";
import { LegalRequestForm } from "@/app/hukuki-basvuru/LegalRequestForm";

export const metadata = { title: "Hukuki başvuru · Gidenler" };

/**
 * HUKUKİ BAŞVURU — ciddi ve nötr. Avukat metni gibi davranmaz, süre ya da sonuç
 * taahhüdü vermez, sahte e-posta uydurmaz. Form, başvuru metnini hazırlar;
 * gönderim kanalı prototipte yoktur ve bunu açıkça söyler.
 */
export default function LegalPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Hukuki başvuru</p>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Bir içerikle ilgili hukuki talebiniz varsa.</h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">Bu sayfa, Gidenler&apos;de yer alan bir içerikle ilgili hukuki talep veya hak ihlali bildirimi için hangi bilgilerin gerektiğini açıklar. Kural ihlali bildirimi için deneyim kartındaki &ldquo;bildir&rdquo; yeterlidir; <Link href="/kurallar/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Kurallar</Link>.</p>
      </header>

      <div className="mt-9 grid gap-x-14 gap-y-10 border-t-2 border-line-strong pt-7 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Başvuru türleri</h2>
            <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line text-[14.5px]">
              {["İçerik kaldırma talebi", "Kişilik hakkı bildirimi", "Mahremiyet / kişisel veri", "Fikri mülkiyet", "İşletme veya kişi adına yetkili başvuru", "Diğer hukuki talepler"].map((x) => <li key={x} className="py-2">{x}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Süreç</h2>
            <ol className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-[14px] leading-relaxed text-ink-2">
              {["Başvuru alınır.", "Kimlik / temsil yetkisi ve ilgili içerik doğrulanır.", "Talep kapsamına göre değerlendirilir.", "Gerekirse taraflardan ek bilgi istenir.", "Sonuç, başvuruda verilen iletişim bilgisi üzerinden bildirilir."].map((x, i) => <li key={x} className="flex gap-3"><span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>{x}</li>)}
            </ol>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">Değerlendirme süresi talebin türüne ve belgelerin eksiksizliğine bağlıdır; kesin süre ya da sonuç taahhüdü verilmez. Gidenler bir acil durum servisi değildir: fiziksel tehlike veya suç durumunda önce yetkili makamlara başvurun.</p>
          </section>
        </div>
        <LegalRequestForm />
      </div>
    </div>
  );
}

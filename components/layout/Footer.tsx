import Link from "next/link";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Demo örneklerine giden bağlantılar (uzman profili, liste, işletme paneli) yalnız yatırımcı demosunda. */
const DEMO_ONLY = new Set(["/@denizyer/", "/liste/istanbulda-japon-mutfagi-2026/", "/isletme/moda-lokantasi/"]);
const ALL_COLS: Array<[string, Array<[string, string]>]> = [
  ["Gidenler", [["Keşfet", "/kesfet/"], ["Ara", "/ara/"], ["Sor Gidenler", "/sor/"], ["Nasıl çalışır", "/nasil-calisir/"]]],
  ["Topluluk", [["Uzmanlar", "/@denizyer/"], ["Listeler", "/liste/istanbulda-japon-mutfagi-2026/"], ["Benim Gidenler'im", "/benim/"], ["Kurallar", "/kurallar/"]]],
  ["İşletmeler", [["İşletmeler için", "/isletmeler/"], ["İşletme paneli", "/isletme/moda-lokantasi/"]]],
  ["Güven", [["Nasıl çalışır", "/nasil-calisir/"], ["Kurallar", "/kurallar/"], ["Hukuki başvuru", "/hukuki-basvuru/"]]],
];
const COLS = ALL_COLS.map(([t, links]) => [t, links.filter(([, h]) => DEMO_VISIBLE || !DEMO_ONLY.has(h))] as [string, Array<[string, string]>]);

/** Gerçek site mimarisi: her bağlantı bir yere gider. Mobilde iki sütun. */
export function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-line-strong">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-5 py-10 sm:px-7">
        <div className="grid gap-x-10 gap-y-7 sm:grid-cols-[auto_1fr]">
          <Link href="/" className="font-[family-name:var(--font-brand)] text-[26px] leading-none">
            gidenler<span className="text-accent-ink">.</span>
          </Link>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {COLS.map(([title, links]) => (
              <nav key={title} aria-label={title} className="flex flex-col gap-2">
                <span className="label">{title}</span>
                {links.map(([label, href]) => (
                  <Link key={label + href} href={href} className="text-[13px] font-semibold text-ink-2 hover:text-ink">{label}</Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <p className="max-w-[74ch] text-[12px] leading-relaxed text-ink-3">
          {DEMO_VISIBLE ? (
            <>
              İki tür kayıt vardır: &ldquo;Gerçek mekân&rdquo; etiketli işletmelerin kimlik bilgisi
              OpenStreetMap&apos;ten gelir ve henüz puanı yoktur; &ldquo;demo&rdquo; etiketli kayıtların
              işletmesi, deneyimleri ve dış kaynak puanları prototip için üretilmiştir, gerçek hiçbir
              işletmeye veya kişiye ait değildir.
            </>
          ) : (
            <>Mekânların kimlik bilgisi © OpenStreetMap katkıcıları (ODbL); henüz puanları yoktur, puan gerçek deneyimlerle oluşur.</>
          )}{" "}
          Gidenler puanı yalnızca Gidenler&apos;e
          yazılan deneyimlerden hesaplanır — dış kaynak puanlarının ortalaması değildir.
          Hekim ve avukat gibi meslek mevzuatı kısıtlı kategorilerde platform puan üretmez,
          özet cümlesi kurmaz ve reklam göstermez.
        </p>
      </div>
    </footer>
  );
}

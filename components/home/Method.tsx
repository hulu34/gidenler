import Link from "next/link";

/* YÖNTEM — yatırımcı ve kullanıcı için tek bakışta "neden farklı". Her iddia ölçülebilir bir şeye bağlanır. */
const ITEMS: Array<{ k: string; t: string; d: string }> = [
  { k: "01", t: "Puan değil, eğri", d: "Her mekân aylık deneyim serisidir. Yükselişi ve düşüşü, ortalama değişmeden önce görürsün." },
  { k: "02", t: "Senin koşulun", d: "Aynı yer randevuya iyi, iş yemeğine kötü olabilir. Gidenler gün, saat, kişi ve bağlama göre seçer." },
  { k: "03", t: "Uzlaşı ve kanıt", d: "Her öneride kaç deneyim (n), tekrar gitme oranı ve görüşlerin ne kadar dağınık olduğu yazar." },
  { k: "04", t: "Uydurma yok", d: "AI yalnızca Gidenler verisindeki gerçek mekânlardan seçer; kanıt zayıfsa \"güven: sınırlı\" der." },
];

export function Method() {
  return (
    <section aria-labelledby="h-method" className="reveal">
      <div className="kunye"><h2 id="h-method">Nasıl çalışır</h2><Link href="/nasil-calisir/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Yöntem →</Link></div>
      <ol className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((i) => (
          <li key={i.k} className="flex flex-col gap-2">
            <span className="tnum font-[family-name:var(--font-brand)] text-[2.25rem] leading-none text-accent-ink">{i.k}</span>
            <span className="text-[17px] font-bold tracking-[-0.015em]">{i.t}</span>
            <span className="text-[14px] leading-relaxed text-ink-2">{i.d}</span>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y-2 border-line-strong py-6">
        <p className="font-[family-name:var(--font-brand)] text-[clamp(1.75rem,3.6vw,2.5rem)] leading-tight">Nereye gideceğini sor; gidenler cevap versin.</p>
        <a href="#sor" className="h-12 rounded-[3px] bg-accent px-6 text-[15px] font-semibold leading-[3rem] text-on-accent transition-transform hover:-translate-y-0.5">Gidenler AI&apos;a sor ↑</a>
      </div>
    </section>
  );
}

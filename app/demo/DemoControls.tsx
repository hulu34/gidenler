"use client";

import Link from "next/link";
import { useState } from "react";
import { enterInvestorDemo, exitInvestorDemo, resetDemo, useUserData } from "@/lib/store";

const FLOW: { step: string; href: string; title: string; note: string }[] = [
  { step: "01", href: "/", title: "Ana sayfa", note: "Devam et + Sana göre. Moda için 'gitmek istiyorum' hâlâ açık." },
  { step: "02", href: "/sor/", title: "Sor Gidenler", note: "Hazır soru: Sakura %94, Moda, Köz — üç farklı neden. 'Daha ucuz' ve 'Date için' sırayı gerçekten değiştirir." },
  { step: "03", href: "/mekan/sakura-omakase/", title: "Sakura Omakase · 9,4", note: "Olağanüstü · yükseliyor · %96 uyum. Date %99, Aile %63. 'Neden %96?' açıklar. Sonra: Gitmek istiyorum." },
  { step: "04", href: "/benim/", title: "Benim Gidenler'im", note: "Devam et: Moda ve Sakura. Gittim → hızlı tepki → deneyim. Döngü burada kapanır." },
  { step: "05", href: "/@denizyer/", title: "@denizyer", note: "Neyi biliyor, seninle %87 zevk uyumu. Takipçi sayısı güvenin ölçüsü değil." },
  { step: "06", href: "/birlikte/?g=abc123", title: "Birlikte Nereye?", note: "Dört kişi, tek sonuç; kısıtlar açık." },
  { step: "07", href: "/isletme/moda-lokantasi/", title: "İşletme paneli", note: "Aynı veri işletmeye 'neden değişti?' sorusunu cevaplar." },
  { step: "08", href: "/mekan/asma-teras/", title: "Asma Teras · 5,4", note: "Zayıf · geriliyor · düşük uyum. 'Ne oldu?' açık: şef değişimi, fiyat artışı." },
];

export function DemoControls() {
  const data = useUserData();
  const [flash, setFlash] = useState<string | null>(null);
  const on = data.demoMode === "investor";
  const counts = {
    want: Object.values(data.relationships).filter((r) => r.state === "want_to_go").length,
    saved: Object.values(data.relationships).filter((r) => r.state === "saved").length,
    visited: Object.values(data.relationships).filter((r) => r.state === "visited" || r.state === "experienced").length,
    reactions: data.reactions.length,
    follows: data.follows.length,
  };

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1.4fr]">
      <section className="flex flex-col gap-5" aria-labelledby="demo-durum">
        <h2 id="demo-durum" className="label">Hesap durumu</h2>
        <p className="text-[15px] font-semibold">
          {on ? "Sunum modu açık — yaşanmış hesap yüklü." : "Sunum modu kapalı — normal kullanıcı hesabı."}
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-3">
          {[["Gitmek istiyorum", counts.want], ["Kaydedilen", counts.saved], ["Gidilen", counts.visited], ["Hızlı tepki", counts.reactions], ["Takip", counts.follows], ["Liste", data.lists.filter((l) => l.entityIds.length).length]].map(([k, v]) => (
            <div key={k as string} className="flex flex-col border-t border-line pt-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">{k}</dt>
              <dd className="tnum text-[20px] font-extrabold leading-tight">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          {on ? (
            <>
              <button type="button" onClick={() => { resetDemo(); setFlash("Sunum başlangıç durumuna döndü."); }}
                className="h-10 border-2 border-ink bg-ink px-4 text-[13px] font-bold uppercase tracking-[0.1em] text-paper hover:bg-accent hover:border-accent">
                Sunumu sıfırla
              </button>
              <button type="button" onClick={() => { exitInvestorDemo(); setFlash("Sunum modundan çıkıldı; normal hesabın olduğu gibi duruyor."); }}
                className="h-10 border-2 border-line-2 px-4 text-[13px] font-bold uppercase tracking-[0.1em] hover:border-ink">
                Sunumdan çık
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { enterInvestorDemo(); setFlash("Sunum modu açıldı."); }}
              className="h-10 border-2 border-ink bg-ink px-4 text-[13px] font-bold uppercase tracking-[0.1em] text-paper hover:bg-accent hover:border-accent">
              Sunum modunu başlat
            </button>
          )}
          {flash && <span className="text-[12.5px] text-ink-3" role="status">{flash}</span>}
        </div>
        <p className="max-w-[52ch] text-[12.5px] leading-relaxed text-ink-3">
          Kısayol: herhangi bir sayfaya <code className="bg-sunk px-1">?demo=investor</code> ekle; mod sayfalar arasında korunur. <code className="bg-sunk px-1">?demo=reset</code> başlangıca döner, <code className="bg-sunk px-1">?demo=off</code> çıkar. Sunum verisi ayrı tutulur; normal hesabına dokunmaz.
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="demo-akis">
        <h2 id="demo-akis" className="label">Sunum akışı</h2>
        <ol className="flex flex-col divide-y divide-line border-t border-line">
          {FLOW.map((f) => (
            <li key={f.step}>
              <Link href={f.href} className="group grid grid-cols-[36px_1fr] gap-x-3 py-3 hover:bg-sunk sm:grid-cols-[36px_220px_1fr]">
                <span className="tnum text-[12px] font-bold text-ink-3">{f.step}</span>
                <span className="text-[14.5px] font-bold group-hover:text-accent-ink">{f.title}</span>
                <span className="col-start-2 text-[12.5px] leading-snug text-ink-3 sm:col-start-3">{f.note}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

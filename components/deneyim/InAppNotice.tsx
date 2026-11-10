"use client";

import { useEffect, useState } from "react";
import { androidIntent, inAppBrowser, type InApp } from "@/lib/inapp";
import { track } from "@/lib/kampanya/client";

/** Uygulama içi tarayıcıyı (Instagram vb.) yalnız istemcide algılar; sunucu çıktısında hiçbir şey yoktur. */
export function useInApp(): InApp | null {
  const [v, setV] = useState<InApp | null>(null);
  useEffect(() => { setV(inAppBrowser(navigator.userAgent)); }, []);
  return v;
}

/**
 * "Bu sayfayı tarayıcında aç" — Google, uygulama içi tarayıcılarda girişi engellediği için.
 * `hash`: taslak ve kampanya kodunu taşıyan # parçası (form verir; arama sayfasında yok). Kopyalanan bağlantı ve
 * Android'deki "Chrome'da aç" aynı adresi açar; Instagram'ın kendi "tarayıcıda aç" menüsü de adres çubuğundaki # ile açar.
 */
export function InAppNotice({ app, context, hash = "", tooLong = 0 }: { app: InApp; context: "arama" | "form" | "giris"; hash?: string; tooLong?: number }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { track("uygulamaici"); }, []);
  const href = () => `${location.origin}${location.pathname}${location.search}${hash}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(href()); setCopied(true); }
    catch { window.prompt("Bağlantıyı kopyala:", href()); }
  };
  const lead = context === "arama"
    ? <>Deneyimini paylaşmak için Google ile giriş yapacaksın; Google bu girişe {app.name} içindeki tarayıcıda izin vermiyor. Başlamadan önce sayfayı tarayıcında aç.</>
    : context === "form"
      ? <>Google, {app.name} içindeki tarayıcıda girişe izin vermiyor. Yayınlamak için sayfayı tarayıcında aç; <b>yazdıkların bağlantıyla birlikte taşınır</b>.</>
      : <>Google, {app.name} içindeki tarayıcıda girişe izin vermiyor. Giriş yapmak için sayfayı tarayıcında aç.</>;
  return (
    <div role="note" data-uygulama-ici={app.name} className="flex flex-col gap-2.5 rounded-[14px] border-2 border-ink bg-[var(--accent-soft)] p-4 text-left">
      <p className="text-[14px] font-bold leading-snug">{app.name} içinden açtın</p>
      <p className="text-[13.5px] leading-relaxed text-ink-2">{lead}</p>
      {tooLong > 0 && <p role="alert" data-uygulama-ici-uzun className="text-[13px] font-semibold text-neg-ink">Metnin {tooLong.toLocaleString("tr-TR")} karakteri aşıyor. Bağlantıyla yalnız ilk {tooLong.toLocaleString("tr-TR")} karakter taşınır ve daha uzun bir deneyim yayınlanamaz; aktarmadan önce kısalt.</p>}
      <ol className="flex flex-col gap-1 text-[13px] leading-relaxed text-ink-2">
        <li>1. {app.ios ? "Sağ üstteki ••• menüsüne dokun." : "Sağ üstteki ⋮ menüsüne dokun."}</li>
        <li>2. &ldquo;Tarayıcıda aç&rdquo; ({app.ios ? "Safari" : "Chrome"}) seçeneğini seç.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        {app.android && !hash && <a href={androidIntent(href())} data-uygulama-ici-ac className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-[13.5px] font-bold text-paper">Chrome&apos;da aç</a>}
        <button type="button" onClick={copy} data-uygulama-ici-kopyala className="inline-flex min-h-11 items-center rounded-[10px] border-2 border-ink bg-paper px-4 text-[13.5px] font-bold">
          {copied ? `Kopyalandı — ${app.ios ? "Safari" : "tarayıcı"} adres çubuğuna yapıştır` : "Bağlantıyı kopyala"}
        </button>
      </div>
    </div>
  );
}

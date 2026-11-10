/* GECE OPERASYONU (10 Kasım) birim testleri — uygulama içi tarayıcı, # aktarımı, yasal sayfalar, kampanya adımı.
   Çalıştır: npx tsx scripts/gecetest.ts */
import { readFileSync, existsSync } from "node:fs";
import { androidIntent, decodeHandoff, encodeHandoff, inAppBrowser } from "../lib/inapp";
import { CLIENT_STEPS, STEPS } from "../lib/kampanya";

let pass = 0, fail = 0;
const ok = (n: string, c: unknown) => { if (c) pass++; else { fail++; console.log("✗", n); } };

/* gerçek kullanıcı aracısı dizgeleri */
const UA = {
  igIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.32.104 (iPhone15,2; iOS 18_1; tr_TR; tr; scale=3.00; 1179x2556; 655574148)",
  igAnd: "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 Instagram 352.0.0.38.100 Android (34/14; 480dpi; 1080x2340; samsung; SM-S911B; dm1q; qcom; tr_TR; 650181412)",
  fbIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.104;FBBV/123;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBLC/tr_TR]",
  tiktok: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.193 Mobile Safari/537.36 trill_340301 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.3.1 ByteLocale/tr BytedanceWebview/d8a21c6",
  wv: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  chromeAnd: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  crios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
ok("Instagram iOS algılanır", inAppBrowser(UA.igIos)?.name === "Instagram" && inAppBrowser(UA.igIos)?.ios);
ok("Instagram Android algılanır", inAppBrowser(UA.igAnd)?.name === "Instagram" && inAppBrowser(UA.igAnd)?.android);
ok("Facebook iOS algılanır", inAppBrowser(UA.fbIos)?.name === "Facebook");
ok("TikTok algılanır", inAppBrowser(UA.tiktok)?.name === "TikTok");
ok("genel Android WebView algılanır", inAppBrowser(UA.wv)?.name === "Uygulama");
for (const k of ["safari", "chromeAnd", "crios", "desktop"] as const) ok(`gerçek tarayıcı (${k}) uygulama içi sayılmaz`, inAppBrowser(UA[k]) === null);
ok("boş UA", inAppBrowser("") === null);

const it = androidIntent("https://www.gidenler.com/nerede-yedin/?k=ic03");
ok("Android intent: yol + kod korunur, geri dönüş adresi var", it.startsWith("intent://www.gidenler.com/nerede-yedin/?k=ic03#Intent;scheme=https;") && it.includes("S.browser_fallback_url=https%3A%2F%2Fwww.gidenler.com%2Fnerede-yedin%2F%3Fk%3Dic03") && it.endsWith(";end"));

const h = { b: "Çok güzel bir akşamdı; İskender ve şöbiyet harikaydı. Garsonlar ilgiliydi — tekrar gideceğiz!", m: "2026-11", o: 9, r: { service: 8, "front-desk": 7 }, ri: "evet", rel: "none", k: "ic07" };
const enc = encodeHandoff(h);
ok("# parçası #aktar= ile başlar, adres güvenli karakterler", enc.startsWith("#aktar=") && /^[#A-Za-z0-9_=-]+$/.test(enc));
const dec = decodeHandoff(enc);
ok("Türkçe metin ve puanlar gidip gelir", dec?.b === h.b && dec?.o === 9 && dec?.r?.service === 8 && dec?.r?.["front-desk"] === 7 && dec?.k === "ic07" && dec?.m === "2026-11" && dec?.ri === "evet");
ok("uzun metin 3.000 karakterde kesilir", (decodeHandoff(encodeHandoff({ b: "x".repeat(9000) }))?.b ?? "").length === 3000);
ok("yalnız kod taşınabilir", decodeHandoff(encodeHandoff({ k: "ic01" }))?.k === "ic01" && decodeHandoff(encodeHandoff({ k: "ic01" }))?.b === undefined);
ok("bozuk # → null", decodeHandoff("#aktar=%%%") === null && decodeHandoff("#esik") === null && decodeHandoff("") === null);
const evil = "#aktar=" + Buffer.from(JSON.stringify({ b: 5, o: 99, r: { "<script>": 3, ok: 50 }, k: "../../x", m: "yarın", ri: "x".repeat(40) })).toString("base64url");
const de = decodeHandoff(evil);
ok("yabancı alanlar elenir (tip, aralık, anahtar biçimi)", de !== null && de.b === undefined && de.o === undefined && Object.keys(de.r ?? {}).length === 0 && de.k === undefined && de.m === undefined && de.ri === undefined);

ok("kampanya adımı 'uygulamaici' tanımlı ve istemci bildirebilir", STEPS.some(([k]) => k === "uygulamaici") && CLIENT_STEPS.includes("uygulamaici"));
ok("'tamam' ve 'oneri' hâlâ yalnız sunucuda", !CLIENT_STEPS.includes("tamam") && !CLIENT_STEPS.includes("oneri"));

/* kaynak kuralları */
const src = (p: string) => readFileSync(p, "utf8");
ok("/gizlilik/ ve /kullanim-kosullari/ sayfaları var", existsSync("app/gizlilik/page.tsx") && existsSync("app/kullanim-kosullari/page.tsx"));
const gz = src("app/gizlilik/page.tsx");
ok("gizlilik metni gerçek işlemeyi anlatır (Ad S., 120 gün, 14 gün, oturumda IP, KVKK 11)", ["Ad S.", "120 gün", "14 gün", "IP adresi ve tarayıcı bilgisi", "11. maddesi"].every((x) => gz.includes(x)));
ok("altbilgide iki yasal bağlantı", src("components/layout/Footer.tsx").includes('"/gizlilik/"') && src("components/layout/Footer.tsx").includes('"/kullanim-kosullari/"'));
ok("altbilgi artık 'henüz puanları yoktur' demiyor", !src("components/layout/Footer.tsx").includes("henüz puanları yoktur"));
ok("sitemap iki yasal sayfayı içerir", src("app/sitemap.ts").includes('"/gizlilik/"') && src("app/sitemap.ts").includes('"/kullanim-kosullari/"'));
const wf = src("app/yaz/[slug]/WriteForm.tsx");
ok("form: uygulama içinde Google düğmesi yerine tarayıcıda aç", wf.includes('account === "anon" && inApp ?') && wf.includes("InAppNotice"));
ok("form: # aktarımı okunduktan sonra adresten silinir", wf.includes("decodeHandoff(location.hash)") && wf.includes("history.replaceState(null, \"\", location.pathname + location.search)"));
ok("Benim ve eşik kartı da uygulama içinde Google'a yönlendirmez", src("components/auth/AccountBox.tsx").includes("InAppNotice") && src("components/venue/ThresholdCard.tsx").includes("inAppBrowser(navigator.userAgent)"));

console.log(`\ngece: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);

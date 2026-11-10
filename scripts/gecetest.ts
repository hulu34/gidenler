/* GECE OPERASYONU (10 Kasım) birim testleri — uygulama içi tarayıcı, # aktarımı, yasal sayfalar, kampanya adımı.
   Çalıştır: npx tsx scripts/gecetest.ts */
import { readFileSync, existsSync } from "node:fs";
import { HANDOFF_MAX, androidIntent, decodeHandoff, encodeHandoff, handoffPlan, inAppBrowser, isHandoffHash, sameDraft } from "../lib/inapp";
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
ok("sınır = deneyim API sınırı (6.000)", HANDOFF_MAX === 6000 && readFileSync("lib/community/reviewApi.ts", "utf8").includes("body: z.string().max(6000)"));
const longTr = "Şişli'deki ğüçlü İskender, ılık şöbiyet ve çay. ".repeat(200).slice(0, 6000);
ok("6.000 karakterlik Türkçe metin eksiksiz taşınır", decodeHandoff(encodeHandoff({ b: longTr }))?.b === longTr);
ok("6.000 üstü metin 6.000'de kesilir (form bunu aktarmadan önce söyler)", (decodeHandoff(encodeHandoff({ b: "ş".repeat(9000) }))?.b ?? "").length === 6000);
ok("6.000 karakterlik aktarım adresi Safari/Chrome sınırlarının çok altında (<20 bin)", encodeHandoff({ b: longTr, r: { service: 8 }, k: "ic01" }).length < 20000);
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
ok("gizlilik metni gerçek işlemeyi anlatır (Ad S., 120 gün, 14 gün, oturumda IP, KVKK 11)", ["Ad S.", "120 günden", "35 günden", "14 gün", "IP adresi ve tarayıcı bilgisi", "11. maddesi"].every((x) => gz.includes(x)));
ok("altbilgide iki yasal bağlantı", src("components/layout/Footer.tsx").includes('"/gizlilik/"') && src("components/layout/Footer.tsx").includes('"/kullanim-kosullari/"'));
ok("altbilgi artık 'henüz puanları yoktur' demiyor", !src("components/layout/Footer.tsx").includes("henüz puanları yoktur"));
ok("sitemap iki yasal sayfayı içerir", src("app/sitemap.ts").includes('"/gizlilik/"') && src("app/sitemap.ts").includes('"/kullanim-kosullari/"'));
const wf = src("app/yaz/[slug]/WriteForm.tsx");
ok("form: uygulama içinde Google düğmesi yerine tarayıcıda aç", wf.includes('account === "anon" && inApp ?') && wf.includes("InAppNotice"));
ok("form: # aktarımı okunduktan sonra adresten silinir", wf.includes("decodeHandoff(location.hash)") && wf.includes("history.replaceState(null, \"\", location.pathname + location.search)"));
ok("Benim ve eşik kartı da uygulama içinde Google'a yönlendirmez", src("components/auth/AccountBox.tsx").includes("InAppNotice") && src("components/venue/ThresholdCard.tsx").includes("inAppBrowser(navigator.userAgent)"));

ok("ana sayfa üst çağrısı marka mesajını kısaltmaz (İstanbul'da … en son … nerede yemek yedin?)", (() => { const h = src("app/page.tsx"); const i = h.indexOf("data-hero-deneyim"); const seg = h.slice(i, i + 900); return seg.includes("İstanbul&apos;da") && seg.includes("en son") && seg.includes("nerede yemek yedin?") && !seg.includes('sm:hidden">En son'); })());
ok("kampanya sayfası paylaşım görselini açıkça verir", src("app/nerede-yedin/page.tsx").includes('url: "/opengraph-image"'));
ok("Seçki paylaşım kartında görsel (kapak ya da site kartı)", src("app/seckisi/sayfa.tsx").includes('"/opengraph-image"'));
ok("form: uygulama içindeyken üst metin Google girişi istemez", wf.includes('account === "anon" && inApp\n              ? <>Yazmaya başlayabilirsin.') || wf.includes("Yazmaya başlayabilirsin. Yayınlamak için sayfayı tarayıcında açıp"));
ok("kampanya panosu hücreleri adım anahtarlı (data-adim)", src("app/yonetim/kampanya/page.tsx").includes("data-adim={c.k}"));

/* hedef tarayıcıda karar: aktarım mevcut taslağın ÜZERİNE YAZMAZ */
const M = "2026-11";
const L = { body: "Bu cihazda yazdığım farklı bir metin, kırk karakteri rahatça geçiyor.", month: M, ratings: {}, overall: 6, returnIntent: "hayır", relationship: "none" };
const H = encodeHandoff({ b: "Instagram'da yazdığım metin; şöbiyet ve İskender çok iyiydi, servis hızlıydı.", m: M, o: 9, ri: "evet", k: "ic02" });
ok("adreste aktarım yok → none", handoffPlan("", L, M).kind === "none" && handoffPlan("#esik", L, M).kind === "none");
ok("hedefte taslak yok → tek adımda uygula", handoffPlan(H, null, M).kind === "apply");
ok("hedefte boş taslak → uygula", handoffPlan(H, { ...L, body: "  ", overall: null }, M).kind === "apply");
ok("hedefte FARKLI taslak → seçim sorulur (üzerine yazılmaz)", handoffPlan(H, L, M).kind === "choose");
const same = handoffPlan(H, null, M); 
ok("hedefte AYNI taslak → seçim sorulmaz", same.kind === "apply" && handoffPlan(H, { ...same.draft, body: same.draft.body + "  " }, M).kind === "apply");
ok("bozuk / yarım kopyalanmış bağlantı → broken (mevcut taslak değişmez)", handoffPlan("#aktar=%%%", L, M).kind === "broken" && handoffPlan(H.slice(0, 25), L, M).kind === "broken" && isHandoffHash("#aktar=x"));
ok("yalnız kampanya kodu → code (taslağa dokunulmaz)", handoffPlan(encodeHandoff({ k: "ic01" }), L, M).kind === "code");
const hold = handoffPlan(H, null, M, true);
ok("yayımlanmış deneyim düzenlenirken → hold (taslak yok, farklı ya da aynı taslak fark etmez; forma uygulanmaz)", hold.kind === "hold" && hold.draft.overall === 9 && handoffPlan(H, L, M, true).kind === "hold" && handoffPlan(H, hold.draft, M, true).kind === "hold");
ok("düzenleme kipinde de bozuk bağlantı / yalnız kod → aynı kural (broken / code)", handoffPlan("#aktar=%%%", null, M, true).kind === "broken" && handoffPlan(encodeHandoff({ k: "ic01" }), null, M, true).kind === "code" && handoffPlan("", null, M, true).kind === "none");
ok("sameDraft: puan farkı farklı sayılır", !sameDraft(L, { ...L, overall: 7 }) && sameDraft(L, { ...L, body: ` ${L.body}\n` }));
const wf2 = readFileSync("app/yaz/[slug]/WriteForm.tsx", "utf8");
ok("form: seçim beklerken otomatik kayıt ve # güncellemesi durur, yayın kapalı", wf2.includes("if (!touched || mine || sent || incoming) return;") && wf2.includes('account !== "anon" || incoming) return;') && wf2.includes("!busy && !incoming &&"));
ok("form: seçim ekranı ve bozuk bağlantı uyarısı var", wf2.includes("data-taslak-secim") && wf2.includes("data-taslak-gelen") && wf2.includes("data-taslak-mevcut") && wf2.includes("data-aktarim-bozuk"));
ok("form: 6.000 üstü metin aktarmadan önce uyarılır", wf2.includes("tooLong={body.length > HANDOFF_MAX ? HANDOFF_MAX : 0}") && readFileSync("components/deneyim/InAppNotice.tsx", "utf8").includes("data-uygulama-ici-uzun"));
ok("form: aynı sekme bağlantısı düzenleme kipinde 'hold' alır; sonradan anlaşılan düzenleme kipi gelen taslağı bekletir", wf2.includes("handoffPlan(location.hash, local, months[0][0], !!mine)") && wf2.includes('if (plan.kind === "hold") { setHeld(plan.draft);') && wf2.includes("setHeld(arrived.current); setIncoming(null); setUnsaved(false);") && wf2.includes("if (arrivedHash.current && !location.hash) history.replaceState"));
ok("form: bekleyen taslak kutusu (ayrı ziyaret / kopyala / bırak); yayın ve silmede bekleyen taslak silinmez", wf2.includes("data-aktarim-duzenleme") && wf2.includes("data-aktarim-ayri") && wf2.includes("data-aktarim-gelen-kopyala") && wf2.includes("data-aktarim-birak") && (wf2.match(/if \(!held\) deleteDraft\(entitySlug\)/g) ?? []).length === 2);
ok("yerel taslak API sınırıyla aynı (5.000'de sessiz kesme yok)", readFileSync("lib/drafts.ts", "utf8").includes("d.body.slice(0, 6000)"));

ok("gizlilik: veri sorumlusu bölümü ve # aktarımının gerçek davranışı (sunucuya gitmez, paylaşma uyarısı, seçim)", (() => { const g = readFileSync("app/gizlilik/page.tsx", "utf8"); return g.includes('["sorumlu", "Veri sorumlusu"') && g.includes("sunucuya gönderilmez") && g.includes("bu bağlantıyı başkasıyla paylaşma") && g.includes("hangisiyle devam edeceğini sen seçersin") && g.includes("yayımlanmış deneyimini düzenliyorsan getirdiğin taslak düzenlemene uygulanmaz"); })());
ok("form: sayfa açıkken yapıştırılan bağlantı (yalnız # değişimi) da işlenir", readFileSync("app/yaz/[slug]/WriteForm.tsx", "utf8").includes('window.addEventListener("hashchange", onHash)'));
const wf3 = readFileSync("app/yaz/[slug]/WriteForm.tsx", "utf8");
ok("depolama reddederse: metin forma konur, # adreste kalır, kopyala + yeniden dene", wf3.includes("data-aktarim-kaydedilemedi") && wf3.includes("data-aktarim-kopyala") && wf3.includes("data-aktarim-yeniden") && /if \(persist\(plan\.draft\)\) history\.replaceState[\s\S]{0,120}else \{/.test(wf3));
ok("aynı sekme: formdaki kaydedilmemiş metin karşılaştırmaya girer", wf3.includes("const onForm: DraftLike | null = !mine && (body.trim() || overall !== null)") && wf3.includes("Bu sayfada şu an yazılı olan"));
console.log(`\ngece: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);

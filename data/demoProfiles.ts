/* ──────────────────────────────────────────────────────────────────────────
   YATIRIMCI DEMOSU · MEKÂN PROFİLLERİ — kurgusal tanıtım, örnek menü ve arayüz simülasyonu videoları.
   · Hiçbiri gerçek bir işletmeye ait değildir; fiyatlar örnektir, üreticiler kurgusaldır.
   · Görseller ve klipler özgür lisanslı TEMSİLİ içeriktir (Wikimedia Commons); künyesi her öğede.
   · Hiçbir dış servise istek atılmaz: her şey public/media/demo/ altından sunulur.
   ────────────────────────────────────────────────────────────────────────── */

import type { PriceBands } from "@/lib/types";

export interface DemoMenuItem { id: string; name: string; desc: string; price: string; photo: string }
export interface DemoMenuGroup { title: string; items: DemoMenuItem[] }
export interface DemoVideo {
  id: string; src: string; poster: string; title: string; kind: string; dish: string;
  /** kurgusal üretici — gerçek bir hesap değildir */
  creator: string;
  clip: { author: string; license: string; sourceUrl: string };
}
export interface DemoProfile {
  intro: string;
  cuisine: string;
  atmosphere: string;
  /** öne çıkan yemekler: menüdeki öğe kimlikleri */
  highlights: string[];
  goodFor: string[];
  /** örnek kişi başı bütçe — menü fiyatlarıyla tutarlı; mekân bilgisindeki bant da buradan gelir */
  priceBands: PriceBands;
  hours: string;
  amenities: string[];
  menu: DemoMenuGroup[];
  videos: DemoVideo[];
}

const img = (slug: string, k: string) => `/media/demo/${slug}/${k}-480.webp`;
const vid = (slug: string, name: string) => ({ src: `/media/demo/${slug}/video/${name}.mp4`, poster: `/media/demo/${slug}/video/${name}.webp` });
const C = (author: string, license: string, file: string) => ({ author, license, sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}` });

export const DEMO_PROFILES: Record<string, DemoProfile> = {
  "moda-lokantasi": {
    intro: "Moda'nın arka sokağında, öğle saatinde kapısında sıra olan bir esnaf lokantası. Tencere yemekleri sabah pişer, vitrinden seçilir; kuru fasulye ve etli nohut müdavimlerin klasiği. Nisanda gelen mevsim menüsüyle zeytinyağlılar öne çıktı.",
    cuisine: "Ev yemeği · esnaf lokantası",
    atmosphere: "Sade, aydınlık, hızlı servis; öğlen kalabalık, akşamüstü sakin.",
    highlights: ["kuru-fasulye", "etli-nohut", "firin-sutlac"],
    goodFor: ["Hızlı öğle yemeği", "Tek başına", "Aile ile hafta sonu"],
    priceBands: { lunch: [300, 550], dinner: [500, 900], basis: "demo" },
    hours: "Her gün 11.00 – 23.00 · tencere yemekleri genelde 15.00'e kadar",
    amenities: ["Paket servis", "Kartla ödeme", "Bebek sandalyesi", "Vejetaryen seçenek"],
    menu: [
      { title: "Tencere yemekleri", items: [
        { id: "kuru-fasulye", name: "Kuru fasulye, tereyağlı pilav", desc: "Gece ıslatılan fasulye, kemik suyu ve salça; yanında tereyağlı pirinç pilavı.", price: "260 ₺", photo: img("moda-lokantasi", "01") },
        { id: "etli-nohut", name: "Etli nohut", desc: "Kuzu kuşbaşıyla ağır ateşte pişen nohut; ekmek banmalık suyuyla.", price: "240 ₺", photo: img("moda-lokantasi", "05") },
        { id: "karniyarik", name: "Karnıyarık", desc: "Közlenmiş patlıcan, kıymalı iç; fırından çıkar çıkmaz servis.", price: "290 ₺", photo: img("moda-lokantasi", "02") },
        { id: "dana-haslama", name: "Dana haşlama", desc: "Sebzeli berrak et suyu, yumuşak dana incik; limonla.", price: "340 ₺", photo: img("moda-lokantasi", "03") },
      ] },
      { title: "Zeytinyağlı ve yanlar", items: [
        { id: "taze-fasulye", name: "Zeytinyağlı taze fasulye", desc: "Mevsim menüsünden; soğuk servis.", price: "180 ₺", photo: img("moda-lokantasi", "04") },
        { id: "cacik", name: "Cacık", desc: "Süzme yoğurt, salatalık, kuru nane.", price: "90 ₺", photo: img("moda-lokantasi", "07") },
      ] },
      { title: "Tatlı", items: [
        { id: "firin-sutlac", name: "Fırın sütlaç", desc: "Üstü kızarmış, tarçınsız gelir; isteyene tarçın.", price: "140 ₺", photo: img("moda-lokantasi", "06") },
      ] },
    ],
    videos: [
      { id: "moda-nohut", ...vid("moda-lokantasi", "nohut"), title: "Etli nohut kıvamını nasıl buluyor?", kind: "Mutfaktan kısa video", dish: "Etli nohut", creator: "Tencere Defteri", clip: C("Slashme", "CC BY-SA 4.0", "Slowcooker_melt.webm") },
      { id: "moda-kazan", ...vid("moda-lokantasi", "kazan"), title: "Sabah onda ilk kazanlar kaynıyor", kind: "Mutfak arkası", dish: "Günün tencere yemekleri", creator: "Semt Lokantaları", clip: C("Anselm Schüler", "CC BY-SA 4.0", "Pot_of_pasta_boiling.webm") },
      { id: "moda-iskele", ...vid("moda-lokantasi", "iskele"), title: "Yemekten sonra Moda iskelesine yürüyüş", kind: "Semt turu", dish: "Fırın sütlaç", creator: "Kadıköy Yürüyüşleri", clip: C("VikiPicture", "CC BY-SA 3.0", "İstanbul_-_Kadıköy,_Moda_v1-_Mart_2013.webm") },
    ],
  },

  "koz-durum": {
    intro: "Rasimpaşa'da gece geç saate kadar açık, mangal başında ayakta yenen bir dürümcü. Adana ve kuşbaşı köz ateşinde, lavaş taş fırından sıcak gelir. Yüzlerce deneyimde puan aylardır aynı bantta: hız ve istikrar burada öne çıkan şey.",
    cuisine: "Ocakbaşı · dürüm",
    atmosphere: "Kalabalık, hızlı, sokak ruhlu; gece yarısından sonra da dolu.",
    highlights: ["adana-durum", "kusbasi-sis", "acili-ezme"],
    goodFor: ["Gece atıştırması", "Arkadaşlarla", "Hızlı ve ucuz yemek"],
    priceBands: { lunch: [250, 400], dinner: [300, 550], basis: "demo" },
    hours: "Her gün 11.00 – 03.00",
    amenities: ["Ayakta tezgâh", "Paket servis", "Kartla ödeme", "Gece geç saate kadar"],
    menu: [
      { title: "Dürümler", items: [
        { id: "adana-durum", name: "Adana dürüm", desc: "Zırhla çekilmiş acılı kıyma, közde; soğan-sumak ve maydanozla lavaşta.", price: "280 ₺", photo: img("koz-durum", "01") },
        { id: "kusbasi-durum", name: "Kuşbaşı dürüm", desc: "Marine kuzu kuşbaşı, közlenmiş biber ve domatesle.", price: "310 ₺", photo: img("koz-durum", "04") },
      ] },
      { title: "Porsiyonlar", items: [
        { id: "adana-porsiyon", name: "Adana porsiyon", desc: "İki şiş Adana, közlenmiş biber-domates, lavaş ve bulgur pilavı.", price: "420 ₺", photo: img("koz-durum", "00") },
        { id: "kusbasi-sis", name: "Kuşbaşı şiş", desc: "Kuzu kuşbaşı, ateşin en sıcak yerinde kısa pişirme.", price: "460 ₺", photo: img("koz-durum", "05") },
        { id: "karisik-sis", name: "Karışık şiş tabağı", desc: "Adana, kuşbaşı ve tavuk şiş; iki kişilik.", price: "520 ₺", photo: img("koz-durum", "06") },
      ] },
      { title: "Meze ve ekmek", items: [
        { id: "acili-ezme", name: "Acılı ezme", desc: "Elde doğranmış domates, biber, nar ekşisi.", price: "90 ₺", photo: img("koz-durum", "08") },
        { id: "haydari-ezme", name: "Haydari ve ezme tabağı", desc: "Süzme yoğurtlu haydari ile acılı ezme bir arada.", price: "140 ₺", photo: img("koz-durum", "09") },
        { id: "lavas", name: "Taş fırın lavaş", desc: "Her masaya sıcak gelir.", price: "İkram", photo: img("koz-durum", "07") },
      ] },
    ],
    videos: [
      { id: "koz-sis", ...vid("koz-durum", "sis"), title: "Şişler közde: altı saniyelik tur", kind: "Ocakbaşı kısa video", dish: "Kuşbaşı şiş", creator: "Gece Dürümcüleri", clip: C("驭龙飞车手", "CC BY 4.0", "Freshippo_torch_meat_skewers.webm") },
      { id: "koz-ates", ...vid("koz-durum", "ates"), title: "Köz ateşi servisten önce böyle hazırlanıyor", kind: "Mutfak arkası", dish: "Adana dürüm", creator: "Ateş Başı Notlar", clip: C("Berser25", "CC BY-SA 4.0", "Приготування_кулішу_або_польової_каші_у_казані.webm") },
    ],
  },

  "asma-teras": {
    intro: "Beşiktaş'ta Boğaz'a bakan bir çatı katı restoranı: meze, ızgara balık ve kokteyl. Manzara hâlâ en güçlü yanı; şubattaki şef değişimi ve mayıstaki fiyat artışından sonra deneyimlerde lezzet ve fiyat/performans eleştirisi arttı.",
    cuisine: "Meze · ızgara balık · kokteyl bar",
    atmosphere: "Gün batımında kalabalık, akşam loş ve müzikli; kışın şömineli iç salon.",
    highlights: ["sefin-mezeleri", "izgara-levrek", "teras-kokteyli"],
    goodFor: ["Özel gün", "Manzaralı akşam yemeği", "Kokteyl"],
    priceBands: { dinner: [1400, 2200], basis: "demo" },
    hours: "Her gün 17.00 – 01.00 · mutfak 23.30'da kapanır",
    amenities: ["Rezervasyon", "Teras", "Kokteyl bar", "Vale"],
    menu: [
      { title: "Mezeler", items: [
        { id: "meze-tabagi", name: "Soğuk meze tabağı", desc: "Günün dört mezesi: humus, atom, patlıcan, fava.", price: "520 ₺", photo: img("asma-teras", "02") },
        { id: "sefin-mezeleri", name: "Şefin meze seçkisi", desc: "İki kişilik; yeni şefin mevsim mezeleriyle.", price: "980 ₺", photo: img("asma-teras", "03") },
      ] },
      { title: "Ana yemek", items: [
        { id: "izgara-levrek", name: "Izgara levrek", desc: "Bütün levrek, roka ve közlenmiş limonla.", price: "1.150 ₺", photo: img("asma-teras", "04") },
      ] },
      { title: "İçecekler", items: [
        { id: "teras-kokteyli", name: "Teras kokteyli", desc: "Narenciye, rezene şurubu ve köpük; günbatımı saatinin klasiği.", price: "520 ₺", photo: img("asma-teras", "05") },
        { id: "asma-martini", name: "Asma Martini", desc: "Kuru martini, zeytin.", price: "560 ₺", photo: img("asma-teras", "06") },
      ] },
      { title: "Tatlı", items: [
        { id: "kunefe", name: "Kaymaklı künefe", desc: "Antep fıstıklı, kaymakla sıcak servis.", price: "380 ₺", photo: img("asma-teras", "07") },
        { id: "baklava-kahve", name: "Baklava ve Türk kahvesi", desc: "Üç dilim fıstıklı baklava, yanında kahve.", price: "360 ₺", photo: img("asma-teras", "08") },
      ] },
    ],
    videos: [
      { id: "asma-vapur", ...vid("asma-teras", "vapur"), title: "Terastan akşam vapuru", kind: "Manzara", dish: "Teras kokteyli", creator: "Boğaz Akşamları", clip: C("Kurmanbek", "CC BY-SA 4.0", "A_ferry_in_the_Bosphorus_20251015.webm") },
      { id: "asma-kopru", ...vid("asma-teras", "kopruler"), title: "Gelmeden önce: Boğaz yukarıdan", kind: "Şehir manzarası", dish: "Şefin meze seçkisi", creator: "Masa Manzara", clip: C("VikiPicture", "CC BY-SA 4.0", "Bridges_spanning_the_Bosphorus_strait,_Aug_2014.webm") },
      { id: "asma-bogaz", ...vid("asma-teras", "bogaz"), title: "Gün batımına on altı saniye", kind: "Zaman atlamalı", dish: "Izgara levrek", creator: "İstanbul Akşamüstü", clip: C("Yiğit Karakuş", "CC BY 3.0", "Bosphorus_Timelapse.webm") },
    ],
  },
};

export const demoProfileOf = (slug: string): DemoProfile | undefined => DEMO_PROFILES[slug];

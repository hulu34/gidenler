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
/** menü öğesi; görsel o mekânın temsili galerisinden */
const M = (id: string, name: string, desc: string, price: string, slug: string, k: string): DemoMenuItem => ({ id, name, desc, price, photo: img(slug, k) });
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

  /* ── sunum akışındaki diğer restoranlar (yükselen / düşen listeleri) ── */
  "tarcin-lokantasi": {
    intro: "Büyükada'da iskeleye yürüme mesafesinde, ev yemeği pişiren küçük bir esnaf lokantası. Sabah kurulan tencerelerden çorba, zeytinyağlı ve etli yemekler; öğleden sonra tatlıya çay eşlik ediyor. Son aylarda porsiyon ve meze övgüleri arttı; hafta sonu öğlende sıra bekleniyor.",
    cuisine: "Ev yemeği · esnaf lokantası",
    atmosphere: "Ada sakinliği, sade masalar; vapur saatlerinde kalabalık.",
    highlights: ["hunkar-begendi", "izmir-kofte", "revani"],
    goodFor: ["Ada gezisinde öğle yemeği", "Aile ile", "Tek başına hızlı yemek"],
    priceBands: { lunch: [200, 350], dinner: [250, 400], basis: "demo" },
    hours: "Her gün 11.00 – 22.00 · tencere yemekleri 16.00'ya kadar",
    amenities: ["Paket servis", "Kartla ödeme", "Bebek sandalyesi", "Bahçe masası"],
    menu: [
      { title: "Çorba", items: [M("mercimek", "Mercimek çorbası", "Süzme kırmızı mercimek, tereyağında pul biber.", "95 ₺", "tarcin-lokantasi", "00")] },
      { title: "Tencere yemekleri", items: [
        M("hunkar-begendi", "Hünkâr beğendi", "Közlenmiş patlıcanlı beğendi üstünde kuzu yahni.", "290 ₺", "tarcin-lokantasi", "01"),
        M("izmir-kofte", "İzmir köfte", "Fırında patates, biber ve domates sosuyla; yanında cacık.", "240 ₺", "tarcin-lokantasi", "02"),
        M("etli-bamya", "Etli bamya", "Limonlu, ekşili; dana kuşbaşıyla.", "220 ₺", "tarcin-lokantasi", "03"),
        M("yaprak-sarma", "Etli yaprak sarma", "Kıymalı pirinç iç, sarımsaklı yoğurtla.", "230 ₺", "tarcin-lokantasi", "04"),
        M("bezelye", "Bezelye yemeği", "Havuç ve patatesle, zeytinyağlı.", "160 ₺", "tarcin-lokantasi", "05"),
      ] },
      { title: "Tatlı ve çay", items: [
        M("revani", "Revani", "Cevizli, şerbeti hafif.", "110 ₺", "tarcin-lokantasi", "06"),
        M("cay", "Demlik çay", "Tavşan kanı, ince belli bardakta.", "30 ₺", "tarcin-lokantasi", "07"),
      ] },
    ],
    videos: [
      { id: "tarcin-lokantasi-vapur", ...vid("tarcin-lokantasi", "vapur"), title: "Adaya geçmeden: iskelede akşam vapuru", kind: "Semt turu", dish: "Demlik çay", creator: "Ada Defteri", clip: { author: "Kurmanbek", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:View_of_Haydarpa%C5%9Fa_railway_station_and_the_Bosphorus_from_Kad%C4%B1k%C3%B6y_Pier_20250818.webm" } },
      { id: "tarcin-lokantasi-hunkar", ...vid("tarcin-lokantasi", "hunkar"), title: "Hünkâr beğendi yakından", kind: "Fotoğraf klibi", dish: "Hünkâr beğendi", creator: "Tencere Notları", clip: { author: "E4024", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:H%C3%BCnkarbe%C4%9Fendi.jpg" } },
    ],
  },

  "erguvan-lokantasi": {
    intro: "Balat'ın renkli evlerinin arasında, öğle saatlerinde mahalle esnafının doyduğu bir lokanta. Günün yemekleri tezgâhtan seçiliyor; dolma, kuru köfte ve orman kebabı en çok sorulanlar. Lezzet övgüsü yüksek, öğlen kalabalığı en sık şikâyet.",
    cuisine: "Ev yemeği · esnaf lokantası",
    atmosphere: "Küçük salon, paylaşılan masalar; öğlen yoğun, akşam sakin.",
    highlights: ["biber-dolmasi", "orman-kebabi", "kazandibi"],
    goodFor: ["Balat yürüyüşünde öğle", "Bütçe dostu yemek", "Tek başına"],
    priceBands: { lunch: [200, 350], dinner: [250, 400], basis: "demo" },
    hours: "Her gün 11.30 – 23.00",
    amenities: ["Paket servis", "Kartla ödeme", "Vejetaryen seçenek"],
    menu: [
      { title: "Çorba", items: [M("yayla", "Yayla çorbası", "Yoğurtlu, naneli; pirinçle.", "90 ₺", "erguvan-lokantasi", "01")] },
      { title: "Ana yemekler", items: [
        M("biber-dolmasi", "Etli biber dolması", "Kıymalı pirinç iç, domates sosunda.", "230 ₺", "erguvan-lokantasi", "02"),
        M("kuru-kofte", "Kuru köfte, pilav", "Izgara köfte, tereyağlı pirinç pilavı ve közlenmiş biber.", "250 ₺", "erguvan-lokantasi", "03"),
        M("orman-kebabi", "Orman kebabı", "Kuşbaşı, patates, havuç ve bezelye; ağır ateşte.", "270 ₺", "erguvan-lokantasi", "04"),
        M("musakka", "Musakka", "Kızarmış patlıcan ve kıyma, fırında.", "240 ₺", "erguvan-lokantasi", "05"),
        M("domatesli-pilav", "Domatesli pilav", "Yanına ya da tek başına.", "80 ₺", "erguvan-lokantasi", "06"),
      ] },
      { title: "Tatlı", items: [
        M("kazandibi", "Kazandibi", "Altı karamelize, tarçınla.", "120 ₺", "erguvan-lokantasi", "07"),
        M("asure", "Aşure", "Kuru meyve ve cevizle; mevsiminde.", "100 ₺", "erguvan-lokantasi", "08"),
      ] },
    ],
    videos: [
      { id: "erguvan-lokantasi-tersane", ...vid("erguvan-lokantasi", "tersane"), title: "Balat'tan Haliç kıyısına beş dakika", kind: "Semt turu", dish: "Kuru köfte, pilav", creator: "Haliç Yürüyüşleri", clip: { author: "VikiPicture", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:%C4%B0stanbul_-_Hali%C3%A7,_Ta%C5%9Fk%C4%B1zak_Tersanesi_-_Mart_2013.webm" } },
      { id: "erguvan-lokantasi-dolma", ...vid("erguvan-lokantasi", "dolma"), title: "Günün dolması tabakta", kind: "Fotoğraf klibi", dish: "Etli biber dolması", creator: "Esnaf Sofrası", clip: { author: "E4024", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Etli_biber_dolmas%C4%B1_in_a_white_plate.jpg" } },
    ],
  },

  "lokanta-sardunya": {
    intro: "Eyüp'te, Pierre Loti yokuşuna yakın, Haliç'e bakan bir esnaf lokantası. Çorba ve tencere yemekleri sabah pişiyor; hamsili pilav Karadeniz usulü. Servis övülüyor, son aylarda rezervasyon ve bekleme şikâyetleri arttı ve puan geriledi.",
    cuisine: "Ev yemeği · Karadeniz dokunuşu",
    atmosphere: "Ağaçlı iç salon, manzaralı birkaç masa; hafta sonu yoğun.",
    highlights: ["hamsili-pilav", "oturtma", "irmik-helvasi"],
    goodFor: ["Eyüp ziyaretinde öğle", "Aile ile", "Manzaralı ucuz yemek"],
    priceBands: { lunch: [220, 380], dinner: [250, 420], basis: "demo" },
    hours: "Her gün 11.30 – 23.00",
    amenities: ["Manzaralı masa", "Kartla ödeme", "Paket servis"],
    menu: [
      { title: "Çorbalar", items: [
        M("yayla", "Yayla çorbası", "Kıtır ekmekli.", "90 ₺", "lokanta-sardunya", "01"),
        M("tavuk-suyu", "Tavuk suyu çorba", "Limonlu, terbiyeli.", "95 ₺", "lokanta-sardunya", "06"),
      ] },
      { title: "Ana yemekler", items: [
        M("hamsili-pilav", "Hamsili pilav", "Fırında, hamsi kaplı iç pilav; mevsiminde.", "320 ₺", "lokanta-sardunya", "03"),
        M("oturtma", "Patates-patlıcan oturtma", "Kıymalı, domates soslu.", "230 ₺", "lokanta-sardunya", "02"),
        M("etli-bamya", "Etli bamya", "Ekşili, dana etiyle.", "220 ₺", "lokanta-sardunya", "04"),
        M("yogurtlu-dolma", "Yoğurtlu biber dolması", "Etli dolma, sarımsaklı yoğurt ve tereyağlı sosla.", "240 ₺", "lokanta-sardunya", "05"),
      ] },
      { title: "Tatlı", items: [M("irmik-helvasi", "Dondurmalı irmik helvası", "Sıcak helva, kaymaklı dondurma; yanında çay.", "130 ₺", "lokanta-sardunya", "07")] },
    ],
    videos: [
      { id: "lokanta-sardunya-deniz-ucagi", ...vid("lokanta-sardunya", "deniz-ucagi"), title: "Yemekten önce Haliç manzarası", kind: "Manzara", dish: "Hamsili pilav", creator: "Tepeden Şehir", clip: { author: "VikiPicture", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Seaplane_landing,_Hali%C3%A7,_%C4%B0stanbul_-_May_2013.webm" } },
      { id: "lokanta-sardunya-hamsili", ...vid("lokanta-sardunya", "hamsili"), title: "Fırından yeni çıkan hamsili pilav", kind: "Fotoğraf klibi", dish: "Hamsili pilav", creator: "Karadeniz Mutfağı Notları", clip: { author: "gülin vardar", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Hamsili_pilav_-_Flickr_-_gulinvardar.jpg" } },
    ],
  },

  "meyhane-sardunya": {
    intro: "Yeldeğirmeni'nde, eski bir apartmanın zemin katında küçük bir meyhane. Soğuk mezeler dolaptan seçiliyor, sıcaklar ve balık mevsimine göre değişiyor. Meze övgüsü yüksek; rezervasyonsuz gelenlerin kapıda kalması son aylardaki en sık şikâyet.",
    cuisine: "Meyhane · meze ve mevsim balığı",
    atmosphere: "Sıkışık masalar, yüksek sohbet; hafta sonu geç saate kadar dolu.",
    highlights: ["atom", "hamsi-lakerda", "izgara-tabak"],
    goodFor: ["Arkadaşlarla akşam", "Uzun sofra", "Balık mevsimi"],
    priceBands: { dinner: [1200, 1900], basis: "demo" },
    hours: "Her gün 17.00 – 01.00 · mutfak 23.30'a kadar",
    amenities: ["Rezervasyon önerilir", "Kartla ödeme", "Sokak masası"],
    menu: [
      { title: "Soğuk mezeler", items: [
        M("atom", "Atom", "Süzme yoğurt, kurutulmuş acı biber, tereyağı.", "140 ₺", "meyhane-sardunya", "01"),
        M("hamsi-lakerda", "Hamsi lakerda", "Tuzlanmış hamsi, kırmızı soğan.", "220 ₺", "meyhane-sardunya", "02"),
        M("ezme-haydari", "Ezme ve haydari", "İkili tabak.", "160 ₺", "meyhane-sardunya", "04"),
        M("patlican", "Közlenmiş patlıcan salatası", "Biber, domates, nar ekşisi.", "150 ₺", "meyhane-sardunya", "05"),
      ] },
      { title: "Sıcaklar", items: [
        M("midye-dolma", "Midye dolma", "Baharatlı pirinçle, limonla; 6 adet.", "180 ₺", "meyhane-sardunya", "03"),
        M("midye-tava", "Midye tava", "Tarator sosla.", "260 ₺", "meyhane-sardunya", "06"),
        M("kalamar", "Kalamar tava", "Tarator ve kırmızı soğanla.", "340 ₺", "meyhane-sardunya", "07"),
      ] },
      { title: "Balık", items: [
        M("hamsi-tava", "Hamsi tava", "Mısır unlu, mevsiminde.", "330 ₺", "meyhane-sardunya", "08"),
        M("izgara-tabak", "Izgara balık ve deniz ürünleri tabağı", "İki kişilik; günün balığı, karides, midye.", "1.450 ₺", "meyhane-sardunya", "09"),
      ] },
    ],
    videos: [
      { id: "meyhane-sardunya-izgara", ...vid("meyhane-sardunya", "izgara"), title: "Balık ızgarada: on altı saniye", kind: "Ocakbaşı kısa video", dish: "Izgara balık tabağı", creator: "Meze ve Balık", clip: { author: "Hanifah12", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Roasting_fish.webm" } },
      { id: "meyhane-sardunya-tabak", ...vid("meyhane-sardunya", "tabak"), title: "İki kişilik deniz tabağı", kind: "Fotoğraf klibi", dish: "Izgara balık ve deniz ürünleri tabağı", creator: "Yeldeğirmeni Akşamları", clip: { author: "Marek Ślusarczyk (Tupungato) Photo portfolio", license: "CC BY 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:01_Food_in_Gran_Canaria_-_fish_and_seafood_mixed_grill_plate.jpg" } },
    ],
  },

  "meyhane-nar": {
    intro: "Teşvikiye'nin çınarlı sokağında, meze dolabı kapıdan görünen bir meyhane. Havyar-lakerda-çiroz tabağı ve şakşuka öne çıkıyor; balıklar ızgarada. Konum en çok övülen şey, fiyat seviyesi en sık şikâyet; puan son çeyrekte biraz geriledi.",
    cuisine: "Meyhane · meze ve ızgara balık",
    atmosphere: "Şık ama samimi; akşam erken saatte sakin, gece kalabalık.",
    highlights: ["havyar-lakerda", "saksuka", "uskumru"],
    goodFor: ["İş sonrası akşam yemeği", "Kutlama", "Küçük grup"],
    priceBands: { dinner: [1400, 2200], basis: "demo" },
    hours: "Her gün 17.00 – 01.00",
    amenities: ["Rezervasyon", "Vale", "Kartla ödeme"],
    menu: [
      { title: "Soğuk mezeler", items: [
        M("havyar-lakerda", "Havyar, lakerda ve çiroz", "Üçlü tuzlu balık tabağı.", "480 ₺", "meyhane-nar", "01"),
        M("ezme-humus", "Ezme, humus ve haydari", "Üçlü meze.", "220 ₺", "meyhane-nar", "02"),
        M("saksuka", "Şakşuka", "Patlıcan, biber, domates sos.", "170 ₺", "meyhane-nar", "03"),
        M("haydari", "Haydari", "Süzme yoğurt, dereotu, nane.", "130 ₺", "meyhane-nar", "04"),
      ] },
      { title: "Sıcaklar", items: [
        M("midye-tava", "Midye tava", "Çubukta, taratorla.", "280 ₺", "meyhane-nar", "05"),
        M("kalamar", "Kalamar tava", "Taratorla.", "380 ₺", "meyhane-nar", "06"),
      ] },
      { title: "Balık", items: [
        M("hamsi-tava", "Hamsi tava", "Mevsiminde.", "360 ₺", "meyhane-nar", "07"),
        M("uskumru", "Izgara uskumru", "Bütün, roka ve kırmızı soğanla.", "620 ₺", "meyhane-nar", "08"),
        M("enginar", "Zeytinyağlı enginar ve bakla", "Mevsiminde; dereotlu.", "260 ₺", "meyhane-nar", "09"),
      ] },
    ],
    videos: [
      { id: "meyhane-nar-saksuka", ...vid("meyhane-nar", "saksuka"), title: "Meze dolabından: şakşuka", kind: "Fotoğraf klibi", dish: "Şakşuka", creator: "Meyhane Masası", clip: { author: "E4024", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Eggplant_and_green_pepper_%C5%9Fak%C5%9Fuka_(shakshuka).jpg" } },
      { id: "meyhane-nar-uskumru", ...vid("meyhane-nar", "uskumru"), title: "Izgara uskumru servise hazır", kind: "Fotoğraf klibi", dish: "Izgara uskumru", creator: "Çınaraltı Notları", clip: { author: "se7en", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fish_on_dish_(14967972879).jpg" } },
    ],
  },

  "fistik": {
    intro: "Ankara Ayrancı'da yalnız akşam açılan, tek oturumlu tadım menüsüyle çalışan küçük bir restoran. Menü mevsime göre yedi tabak; açılış ikramıyla başlayıp tatlı ikramıyla bitiyor. Servis övülüyor, tabaklar arası bekleme en sık eleştiri.",
    cuisine: "Fine dining · mevsimsel tadım menüsü",
    atmosphere: "Sakin, loş, az masa; acele etmeyen bir akşam.",
    highlights: ["tadim-menusu", "mevsim-tabagi", "tatli-ikrami"],
    goodFor: ["Özel gün", "İki kişilik akşam", "İş yemeği"],
    priceBands: { dinner: [4500, 6500], basis: "demo" },
    hours: "Salı – Cumartesi 19.00 – 23.00 · pazar ve pazartesi kapalı",
    amenities: ["Yalnız rezervasyonla", "Şarap eşleşmesi", "Vejetaryen menü (ön bildirimle)"],
    menu: [
      { title: "Tadım menüsü", items: [
        M("tadim-menusu", "Yedi tabaklık tadım menüsü", "Mevsim menüsü; açılış ikramından tatlıya.", "4.200 ₺", "fistik", "01"),
        M("acilis", "Açılış ikramı", "Menüye dahil; şefin günlük küçük tabağı.", "Menüde", "fistik", "00"),
        M("ikinci-tabak", "İkinci tabak", "Mevsim sebzesi ve kızarmış tahıl.", "Menüde", "fistik", "02"),
        M("ucuncu-tabak", "Üçüncü tabak", "Fırında, hafif tütsülü.", "Menüde", "fistik", "03"),
        M("kucuk-tabaklar", "Küçük tabaklar", "Paylaşım için üç ara tabak.", "Menüde", "fistik", "04"),
        M("mevsim-tabagi", "Mevsim tabağı", "Şefin pazardan seçtikleri.", "Menüde", "fistik", "05"),
        M("ana-dana", "Ana yemek · dana", "Izgara dana, közlenmiş domates, yeşillik.", "Menüde", "fistik", "06"),
        M("tatli-ikrami", "Tatlı ikramı ve kahve", "Kapanış tabağı.", "Menüde", "fistik", "07"),
      ] },
    ],
    videos: [
      { id: "fistik-amuse", ...vid("fistik", "amuse"), title: "Açılış ikramı yakından", kind: "Fotoğraf klibi", dish: "Açılış ikramı", creator: "Ankara Masaları", clip: { author: "Syced", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Amuse-bouche,_L%27Anthocyane,_Lannion.jpg" } },
      { id: "fistik-tabaklar", ...vid("fistik", "tabaklar"), title: "Küçük tabaklar: tadım menüsünden", kind: "Fotoğraf klibi", dish: "Küçük tabaklar", creator: "Tadım Defteri", clip: { author: "Syced", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Amuse-bouche,_L%27Anthocyane,_Lannion_(46776).jpg" } },
    ],
  },

  "sedef-kahvalti": {
    intro: "Caddebostan'da sahile bakan terasıyla bilinen bir kahvaltı salonu. Serpme kahvaltı iki kişiden başlıyor; sahanlar ayrıca. Servis ve manzara övülüyor; hafta sonu bekleme, kalabalık ve ses en sık şikâyetler.",
    cuisine: "Kahvaltı · serpme ve sahanlar",
    atmosphere: "Hafta içi sakin; pazar sabahı kalabalık ve gürültülü.",
    highlights: ["serpme", "menemen", "sucuklu-yumurta"],
    goodFor: ["Hafta sonu kahvaltısı", "Aile ile", "Arkadaşlarla uzun sofra"],
    priceBands: { lunch: [450, 750], basis: "demo" },
    hours: "Her gün 08.00 – 16.00 · hafta sonu 08.00'de sıra başlar",
    amenities: ["Teras", "Rezervasyon (hafta içi)", "Bebek sandalyesi", "Kartla ödeme"],
    menu: [
      { title: "Serpme", items: [
        M("serpme", "Serpme kahvaltı", "Peynirler, zeytinler, reçeller, bal-kaymak, simit; kişi başı.", "620 ₺", "sedef-kahvalti", "00"),
        M("serpme-ikili", "İki kişilik serpme, sahanla", "Serpmeye bir sahan eklenmiş hali.", "1.350 ₺", "sedef-kahvalti", "01"),
      ] },
      { title: "Sahanlar", items: [
        M("sahanda-yumurta", "Sahanda yumurta", "Tereyağında üç yumurta.", "160 ₺", "sedef-kahvalti", "02"),
        M("menemen", "Menemen", "Domates, biber, beyaz peynir; köy ekmeğiyle.", "220 ₺", "sedef-kahvalti", "03"),
        M("sucuklu-yumurta", "Sucuklu yumurta", "Kasap sucuğu.", "260 ₺", "sedef-kahvalti", "04"),
      ] },
      { title: "Fırından ve içecek", items: [
        M("simit", "Simit", "Sabah fırından.", "35 ₺", "sedef-kahvalti", "05"),
        M("borek", "Peynirli börek", "Günlük açma yufka.", "140 ₺", "sedef-kahvalti", "06"),
        M("cay", "Sınırsız çay", "Serpmeye dahil; tek bardak 30 ₺.", "30 ₺", "sedef-kahvalti", "07"),
      ] },
    ],
    videos: [
      { id: "sedef-kahvalti-serpme", ...vid("sedef-kahvalti", "serpme"), title: "Pazar sabahı serpme kahvaltı", kind: "Fotoğraf klibi", dish: "Serpme kahvaltı", creator: "Kahvaltı Rotası", clip: { author: "E4024", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Breakfast_in_Turkey.jpg" } },
      { id: "sedef-kahvalti-sucuk", ...vid("sedef-kahvalti", "sucuk"), title: "Sahanda sucuklu yumurta", kind: "Fotoğraf klibi", dish: "Sucuklu yumurta", creator: "Sahil Sabahları", clip: { author: "E4024", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Sucuk_ve_yumurta.jpg" } },
    ],
  },

  "ayva-firin-pizza": {
    intro: "Ataşehir'de odun fırınlı, Napoli usulü ince kenarlı pizza yapan bir pizzacı. Hamur 48 saat mayalanıyor; menü kısa: margherita, marinara ve birkaç mevsim pizzası. Fırın övülüyor ama kalabalık ve bekleme şikâyetleri yüksek; puan düşük bantta olsa da son aylarda toparlanıyor.",
    cuisine: "Napoli usulü pizza · odun fırını",
    atmosphere: "Açık mutfak, fırın sıcağı; akşamları kalabalık.",
    highlights: ["margherita", "bufala", "tiramisu"],
    goodFor: ["Arkadaşlarla akşam", "Aile ile", "Hızlı akşam yemeği"],
    priceBands: { lunch: [500, 800], dinner: [650, 1100], basis: "demo" },
    hours: "Her gün 12.00 – 23.00",
    amenities: ["Paket servis", "Açık mutfak", "Kartla ödeme"],
    menu: [
      { title: "Klasikler", items: [
        M("margherita", "Margherita", "Domates, fior di latte, fesleğen.", "420 ₺", "ayva-firin-pizza", "01"),
        M("marinara", "Marinara", "Domates, sarımsak, kekik; peynirsiz.", "360 ₺", "ayva-firin-pizza", "05"),
        M("bufala", "Bufala margherita", "Manda mozzarellasıyla.", "560 ₺", "ayva-firin-pizza", "03"),
      ] },
      { title: "Mevsim pizzaları", items: [
        M("ceri", "Çeri domatesli", "Çeri domates, burrata parçaları.", "540 ₺", "ayva-firin-pizza", "04"),
        M("beyaz", "Mantarlı beyaz pizza", "Domatessiz; mantar, mozzarella, yeşil biber.", "520 ₺", "ayva-firin-pizza", "08"),
        M("calzone", "Calzone", "Ricotta, mozzarella, salam; kapalı.", "500 ₺", "ayva-firin-pizza", "07"),
      ] },
      { title: "Tatlı", items: [M("tiramisu", "Tiramisu", "Mascarpone, espresso.", "260 ₺", "ayva-firin-pizza", "09")] },
    ],
    videos: [
      { id: "ayva-firin-pizza-kesim", ...vid("ayva-firin-pizza", "kesim"), title: "Odun fırınından çıkan pizza kesiliyor", kind: "Masadan kısa video", dish: "Mevsim pizzası", creator: "Hamur ve Ateş", clip: { author: "Thilo Parg", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Trento_Pizza_cut_with_scissors.webm" } },
      { id: "ayva-firin-pizza-firin", ...vid("ayva-firin-pizza", "firin"), title: "Fırın 450 derecede", kind: "Fotoğraf klibi", dish: "Margherita", creator: "Pizza Notları", clip: { author: "Beboplu", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Brick-oven-thumbnail.jpg" } },
    ],
  },

  "ekin-pide": {
    intro: "Kuruçeşme'de, Boğaz'a iki adım mesafede taş fırınlı bir pideci. Kaşarlı ve kıymalı pide hızlı çıkıyor, lahmacun ince. Hız ve porsiyon övülüyor; son aylarda fiyat artışı ve gürültü eleştirileri çoğaldı, puan geriledi.",
    cuisine: "Pide · lahmacun · taş fırın",
    atmosphere: "Hızlı, gürültülü, fırın başında hareketli.",
    highlights: ["kasarli-pide", "kiymali-pide", "lahmacun"],
    goodFor: ["Hızlı öğle", "Gece çıkışı", "Paket servis"],
    priceBands: { lunch: [200, 350], dinner: [250, 400], basis: "demo" },
    hours: "Her gün 11.30 – 00.00",
    amenities: ["Paket servis", "Kartla ödeme", "Gece geç saate kadar"],
    menu: [
      { title: "Pideler", items: [
        M("kasarli-pide", "Kaşarlı pide", "Bol kaşar, tereyağı.", "230 ₺", "ekin-pide", "01"),
        M("kasarli-yumurtali", "Kaşarlı yumurtalı pide", "Ortasında yumurta.", "250 ₺", "ekin-pide", "02"),
        M("kiymali-pide", "Kıymalı pide", "Soğan, biber, domatesli kıyma.", "250 ₺", "ekin-pide", "03"),
        M("kusbasili", "Kuşbaşılı pide", "Dana kuşbaşı, biber.", "290 ₺", "ekin-pide", "04"),
        M("karadeniz", "Karadeniz usulü pide", "Kapalı kenar, ortada yumurta ve tereyağı.", "270 ₺", "ekin-pide", "05"),
        M("pastirmali", "Pastırmalı yumurtalı pide", "Kayseri pastırması.", "320 ₺", "ekin-pide", "06"),
      ] },
      { title: "Lahmacun", items: [
        M("lahmacun", "Lahmacun", "İnce hamur, acılı kıyma.", "130 ₺", "ekin-pide", "07"),
        M("lahmacun-yesillik", "Lahmacun, yeşillik tabağı", "İki lahmacun, maydanoz, soğan, limon.", "280 ₺", "ekin-pide", "08"),
      ] },
    ],
    videos: [
      { id: "ekin-pide-firin", ...vid("ekin-pide", "firin"), title: "Taş fırın sabah ısınırken", kind: "Fotoğraf klibi", dish: "Kaşarlı pide", creator: "Fırın Başı", clip: { author: "Sadikaltiparmak", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Kiymalipidefrini.jpg" } },
      { id: "ekin-pide-lahmacun", ...vid("ekin-pide", "lahmacun"), title: "İnce hamur lahmacun", kind: "Fotoğraf klibi", dish: "Lahmacun", creator: "Gece Pidecileri", clip: { author: "Benoît Prieur", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Armenian_lahmacun_(1).JPG" } },
    ],
  },

  "iskele-burger": {
    intro: "Kadıköy rıhtımında, vapur saatlerine göre dolup boşalan bir burgerci. Ekmek kendi fırınlarından; patates ve soğan halkası yanında. Ekmek ve konum övülüyor; kalabalık, porsiyon ve rezervasyon şikâyetleri arttı, puan son çeyrekte geriledi.",
    cuisine: "Burger · patates · milkshake",
    atmosphere: "Hızlı ve kalabalık; akşamüstü iskele manzaralı.",
    highlights: ["cheeseburger", "patates", "milkshake"],
    goodFor: ["Vapur öncesi hızlı yemek", "Arkadaşlarla", "Gece atıştırması"],
    priceBands: { lunch: [400, 650], dinner: [450, 700], basis: "demo" },
    hours: "Her gün 12.00 – 00.00",
    amenities: ["Paket servis", "Kartla ödeme", "Dışarıda masa"],
    menu: [
      { title: "Burgerler", items: [
        M("cheeseburger", "Klasik cheeseburger", "150 g dana köfte, cheddar, turşu, domates, marul.", "380 ₺", "iskele-burger", "00"),
        M("dana-burger", "Dana burger", "Kırmızı soğan, cheddar, özel sos.", "360 ₺", "iskele-burger", "01"),
        M("cift-peynirli", "Çift peynirli burger", "İki kat cheddar.", "420 ₺", "iskele-burger", "03"),
        M("menu", "Burger menü", "Burger, tırtıklı patates ve içecek.", "520 ₺", "iskele-burger", "04"),
      ] },
      { title: "Yanlar", items: [
        M("patates", "Patates kızartması", "Kaya tuzuyla.", "140 ₺", "iskele-burger", "05"),
        M("sogan-halkasi", "Soğan halkası", "Biralı hamurda.", "160 ₺", "iskele-burger", "06"),
      ] },
      { title: "İçecek", items: [M("milkshake", "Çilekli milkshake", "Kremşantili.", "190 ₺", "iskele-burger", "07")] },
    ],
    videos: [
      { id: "iskele-burger-patates", ...vid("iskele-burger", "patates"), title: "Patatesler yağda", kind: "Mutfaktan kısa video", dish: "Patates kızartması", creator: "Rıhtım Lezzetleri", clip: { author: "Pohled 111", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Hranolky_jako_p%C5%99%C3%ADloha_01.webm" } },
      { id: "iskele-burger-burger", ...vid("iskele-burger", "burger"), title: "Klasik cheeseburger yakından", kind: "Fotoğraf klibi", dish: "Klasik cheeseburger", creator: "Burger Haritası", clip: { author: "Dallaire8888", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:190524-classic-american-cheeseburger-ew-207p.jpg" } },
    ],
  },
};

export const demoProfileOf = (slug: string): DemoProfile | undefined => DEMO_PROFILES[slug];

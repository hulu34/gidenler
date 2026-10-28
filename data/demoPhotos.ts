import type { VenuePhoto } from "@/lib/types";

/* YATIRIMCI DEMOSU · TEMSİLİ GÖRSELLER — üretilmiş dosya; künye Wikimedia Commons sayfalarından.
   Görseller demo mekânların kendisi DEĞİLDİR: konsepte uygun, özgür lisanslı temsili karelerdir.
   Optimize WebP (480/960/1600), public/media/demo/<slug>/ altında. */

const P = (slug: string, k: string, category: VenuePhoto["category"], alt: string, author: string, license: string, sourceUrl: string, w: number, h: number): VenuePhoto => ({
  src: `/media/demo/${slug}/${k}-960.webp`, srcSet: [480, 960, 1600].map((x) => `/media/demo/${slug}/${k}-${x}.webp ${x}w`).join(", "), full: `/media/demo/${slug}/${k}-1600.webp`,
  category, alt, credit: author, license, sourceUrl, addedBy: "demo", w, h,
});

export const DEMO_PHOTOS: Record<string, VenuePhoto[]> = {
  "moda-lokantasi": [
    P("moda-lokantasi", "00", "ic", "Günün tencere yemekleri vitrinde", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:A_Turkish_restaurant.jpg", 1600, 840),
    P("moda-lokantasi", "01", "yemek", "Kuru fasulye ve tereyağlı pilav", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Kuru-pilav.jpg", 1600, 1200),
    P("moda-lokantasi", "02", "yemek", "Karnıyarık", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:KARNIYARIK_in_Ankara.jpg", 1600, 1200),
    P("moda-lokantasi", "03", "yemek", "Dana haşlama", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Dana_ha%C5%9Flama_at_an_esnaf_restaurant.jpg", 1600, 1200),
    P("moda-lokantasi", "04", "yemek", "Zeytinyağlı taze fasulye", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Green_bean_dishes_of_Turkey.jpg", 1600, 1200),
    P("moda-lokantasi", "05", "yemek", "Etli nohut", "J Doll", "CC BY 3.0", "https://commons.wikimedia.org/wiki/File:French_Lentil_Soup_(140491423).jpeg", 1600, 1067),
    P("moda-lokantasi", "06", "yemek", "Fırın sütlaç", "Wiki leylek", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Baked_Rice_Pudding_11.06.2025.jpg", 900, 1184),
    P("moda-lokantasi", "07", "yemek", "Cacık", "Rainer Zenz", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Cacik-1.jpg", 1600, 1400),
    P("moda-lokantasi", "08", "ic", "Tezgâh ve servis hattı", "Basak", "CC0", "https://commons.wikimedia.org/wiki/File:20241224_A%C5%9F%C3%A7_Fettah_Esnaf_Lokantas%C4%B1,_Bursa.jpg", 1600, 1600),
    P("moda-lokantasi", "09", "dis", "Moda'nın arka sokakları", "Wiki leylek", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Cem_Karaca_Statue_in_Kad%C4%B1k%C3%B6y_Moda_19.05.2025_03.jpg", 1600, 2133),
  ],
  "koz-durum": [
    P("koz-durum", "00", "diger", "Közde Adana", "Abdulsalam Al Dabbagh", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Iraqi_Kebab.jpg", 997, 650),
    P("koz-durum", "01", "yemek", "Közde Adana dürüm", "Jarrod Baniqued", "CC0", "https://commons.wikimedia.org/wiki/File:Breakfast_D%C3%BCr%C3%BCm.jpg", 1600, 1623),
    P("koz-durum", "02", "diger", "Köz ateşi", "SuvranilDebnath", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Garden_BBQ.png", 741, 683),
    P("koz-durum", "03", "ic", "Mangal başı", "Jwslubbock", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Grilling_kebabs_in_Adana.jpg", 1600, 900),
    P("koz-durum", "04", "yemek", "Lavaşta közlenmiş et", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Kuzu_%C5%9Fi%C5%9F_(without_the_skewers).jpg", 1600, 1200),
    P("koz-durum", "05", "yemek", "Kuşbaşı şiş", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Kuzu_%C5%9Fi%C5%9F_at_Ankara.jpg", 1600, 1200),
    P("koz-durum", "06", "yemek", "Şiş", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Kuzu_%C3%A7%C3%B6p_%C5%9Fi%C5%9F_kebap.jpg", 1600, 1200),
    P("koz-durum", "07", "yemek", "Taş fırında lavaş", "Ji-Elle", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Fabrication_du_lavash_%C3%A0_Noravank_(3).jpg", 1600, 1280),
    P("koz-durum", "08", "yemek", "Acılı ezme", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Ezme_(details).jpg", 1600, 1200),
    P("koz-durum", "09", "yemek", "Haydari ve ezme", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Ezme,_Hummus_and_Haydari.jpg", 1600, 1200),
    P("koz-durum", "10", "dis", "Gece sokak", "M. PINARCI", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Been_There_-_panoramio.jpg", 1152, 1440),
  ],
  "asma-teras": [
    P("asma-teras", "00", "dis", "Terastan Boğaz'da gün batımı", "Aykhan Zayedzadeh", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Bosphorus_Bridge,_2022_photo_02.jpg", 1600, 720),
    P("asma-teras", "01", "dis", "Ağaçlı teras masası", "Maurice Flesier", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:A_view_from_inside_a_restaurant_in_B%C3%BCy%C3%BCkada.jpg", 1600, 1063),
    P("asma-teras", "02", "yemek", "Meze tabağı", "Dr. Bernd Gross", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Karisik_Meze_Tabagi_-_Vorspeisen.JPG", 1600, 901),
    P("asma-teras", "03", "yemek", "Şefin meze seçkisi", "Dreamchef", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Meze-Taba%C4%9F%C4%B1.jpg", 1600, 1067),
    P("asma-teras", "04", "yemek", "Izgara levrek", "Benreis", "CC BY 3.0", "https://commons.wikimedia.org/wiki/File:Levrek_Izgara_Beykoz_Koru_Sosyal_Tesisleri.JPG", 1600, 1067),
    P("asma-teras", "05", "icecek", "Teras kokteyli", "Ralf Roletschek", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:15-09-26-RalfR-WLC-0059.jpg", 1600, 2772),
    P("asma-teras", "06", "icecek", "Martini", "Dennis Mojado", "CC BY 2.0", "https://commons.wikimedia.org/wiki/File:Cocktail1.jpg", 427, 640),
    P("asma-teras", "07", "yemek", "Kaymaklı künefe", "E4024", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:F%C4%B1st%C4%B1kl%C4%B1_k%C3%BCnefe_in_Ankara.jpg", 1600, 1200),
    P("asma-teras", "08", "yemek", "Baklava ve Türk kahvesi", "JIP", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Baklava_and_coffee_at_restaurant_Halikarnas.jpg", 1600, 1200),
    P("asma-teras", "09", "diger", "Gece Boğaz", "Choi2451", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:A_night_view_of_Bosphorus_Bridge_on_January_30th,_2015.jpg", 1600, 960),
    P("asma-teras", "10", "ic", "Bar", "www.Pixel.la Free Stock Photos", "CC0", "https://commons.wikimedia.org/wiki/File:Alcohol-bar-glass-shooters_(24218636552).jpg", 1600, 1067),
    P("asma-teras", "11", "ic", "Şömineli iç salon", "Saalihafatima", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Cozy_Fireplace.jpg", 1600, 1600),
  ],
};

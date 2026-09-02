import type {
  CommercialRelationship, Disclosure, Experience, ExperienceRatings,
  ReturnIntent, VerificationMethod, Visit,
} from "@/lib/types";

/** Ham kayıt: `overall` alt puanlardan sunucuda hesaplanır, veride tutulmaz. */
export type RawExperience = Omit<Experience, "overall">;

const DISCLOSURE_LABEL: Record<CommercialRelationship, string | undefined> = {
  none: undefined,
  invited: "İşletmenin daveti",
  gifted: "Ürün / hizmet sağlandı",
  sponsored: "Sponsorlu iş birliği",
  employee: "Çalışan",
  owner_related: "İşletmeyle bağlantılı",
  unknown: "Beyan edilmedi",
};

const disc = (relationship: CommercialRelationship = "none"): Disclosure => ({
  relationship,
  label: DISCLOSURE_LABEL[relationship],
  declaredByAuthor: relationship !== "none" && relationship !== "unknown",
});

let n = 0;
interface Opt {
  method?: VerificationMethod;
  rel?: CommercialRelationship;
  down?: number;
  response?: RawExperience["response"];
}

function E(
  entity: string, author: string, visitedAt: string, body: string,
  ratings: ExperienceRatings, ret: ReturnIntent, helpful: number, opt: Opt = {},
): RawExperience {
  n += 1;
  const id = `exp.${100 + n}`;
  const method = opt.method ?? "yok";
  const verified = method !== "yok" && method !== "sonra";
  return {
    id,
    entityId: `ent.${entity}`,
    authorId: `u.${author}`,
    visitId: `visit.${100 + n}`,
    body,
    visitedAt,
    verification: { verified, method, verifiedAt: verified ? visitedAt : undefined },
    ratings,
    returnIntent: ret,
    disclosure: disc(opt.rel),
    helpfulVotes: helpful,
    notHelpfulVotes: opt.down ?? Math.max(1, Math.round(helpful * 0.04)),
    createdAt: visitedAt,
    state: "published",
    response: opt.response,
  };
}

const D = (t: number, s: number, v: number, a: number, c: number): ExperienceRatings =>
  ({ taste: t, service: s, value: v, atmosphere: a, cleanliness: c });
const C = (d: number, f: number, s: number, v: number, a: number): ExperienceRatings =>
  ({ drink: d, food: f, service: s, value: v, atmosphere: a });
const H = (r: number, c: number, l: number, s: number, v: number): ExperienceRatings =>
  ({ room: r, cleanliness: c, location: l, service: s, value: v });
const P = (com: number, tim: number, tr: number): ExperienceRatings =>
  ({ communication: com, time: tim, transparency: tr });

export const experiences: RawExperience[] = [
  /* ═══════════════ MODA LOKANTASI ═══════════════ */
  E("moda-lokantasi", "kirmizibiletci", "2026-08-14",
    "Öğle arasında gittim, 12.15 gibi. Sıra yoktu ama 12.40'ta kapıya kadar dolmuştu — erken gitmenin tek sebebi bu. Fırında kuru fasulye günün yemeğiydi, tencerede pişmiş tadı geliyor, ısıtılmış değil. Hesap iki kişi ana yemek + ayran 640 lira. Üç yıl önce yarısıydı, ama porsiyon da o zamankinden büyük.",
    D(9.4, 8.6, 8.0, 7.2, 9.0), "evet", 214, { method: "fiş", down: 6 }),
  E("moda-lokantasi", "sokakvesofra", "2026-08-09",
    "Kadıköy'de esnaf lokantası yazısı yazacaksam buradan başlamam gerekiyor. On yıldır aynı mutfak, aynı el. Fark ettiğim tek şey: eskiden tezgâhta on iki çeşit olurdu, şimdi sekiz. Menü daraldı ama daralan kısmı iyi seçmişler.",
    D(9.2, 8.8, 8.2, 7.4, 9.0), "evet", 188, { method: "konum" }),
  E("moda-lokantasi", "yorgun-kartograf", "2026-07-25",
    "Cumartesi 13.30'da gittik, kırk dakika ayakta bekledik. Yemekle bir alıp veremediğim yok ama içerisi o saatte konuşulacak gibi değil; masalar birbirine çok yakın, yan masanın sohbetini ezberledim. Hafta içi gidin.",
    D(8.8, 6.4, 7.6, 4.8, 8.4), "evet", 167, {
      down: 11,
      response: {
        id: "res.1", experienceId: "exp.103", authorLabel: "Moda Lokantası", verifiedBusiness: true,
        body: "Hafta sonu yoğunluğu konusunda haklısınız. Eylülden itibaren cumartesi ve pazar için sıra numarası veriyoruz, ayakta beklemeyi bitirmeye çalışıyoruz. Masa aralıklarını genişletmek için de altı masayı çıkardık.",
        respondedAt: "2026-07-28", state: "published",
      },
    }),
  E("moda-lokantasi", "nazli-ada", "2026-08-02",
    "Tek başına gidip bir tabak alıp oturmak hâlâ şehrin en ucuz terapisi. Akşamüstü 17.00 civarı boş oluyor, kimse acele ettirmiyor. Çorba + zeytinyağlı 280 lira.",
    D(9.0, 9.2, 8.8, 8.4, 8.8), "evet", 189, { method: "konum", down: 7 }),
  E("moda-lokantasi", "gri-pazartesi", "2026-05-02",
    "İlk defa gittim ve beklentim yüksekti, o yüzden düşük not vereceğim. Yemekler iyi, hizmet iyi, ama internetteki övgüler insanı 'hayatının yemeği' beklentisine sokuyor ve öyle bir şey olmuyor. İyi bir esnaf lokantası. Fazlası değil, eksiği de değil.",
    D(7.2, 7.8, 6.8, 6.6, 8.6), "emin değil", 94, { down: 38 }),
  E("moda-lokantasi", "mor-kaskol", "2026-07-09",
    "Fiyat konusunda uyarayım: geçen sonbahar iki kişi 380 liraya kalkıyorduk, şimdi 640. Yemek aynı kalitede, hatta daha iyi. Ama artık 'ucuz esnaf lokantası' diye gitmeyin, öyle bir yer kalmadı.",
    D(9.2, 8.4, 6.2, 7.4, 9.0), "evet", 158, { method: "fiş", down: 12 }),
  E("moda-lokantasi", "nazli-ada", "2026-02-13",
    "Şubatta iki kişi 340 liraya kalkmıştık; çorba, ana yemek, tatlı dahil. O zamanki fiyat/performans bugün aranır. Yemek kalitesi düşmedi, tam tersi — ama cüzdan tarafı başka bir hikâye oldu.",
    D(8.8, 8.8, 9.2, 7.8, 8.8), "evet", 141, { method: "fiş", down: 5 }),
  E("moda-lokantasi", "kirmizibiletci", "2025-11-08",
    "Kasımda ilk kez gitmiştim ve o zaman şaşırmıştım: bu fiyata bu yemek nasıl oluyor diye. Aradan geçen zamanda mutfak aynı kaldı, fiyat değişti. Yine de not düşeyim, o gün servis kusursuzdu.",
    D(9.0, 9.0, 9.4, 8.0, 9.0), "evet", 96, { method: "konum", down: 2 }),

  /* ═══════════════ SAKURA OMAKASE ═══════════════ */
  E("sakura-omakase", "denizyer", "2026-08-21",
    "On altı servislik menü, iki saat on dakika. Şefin elinden çıkan pirinç sıcaklığı doğru — bu cümle klişe gibi duruyor ama İstanbul'da doğru yapan üç yer var, burası biri. Balığın çoğu ithal, bunu açıkça söylüyorlar; söylemeyenlerden iyi. Kişi başı 6.800 lira, içecek hariç. Bu fiyatın karşılığını veriyor mu: evet, ama yılda bir kez.",
    D(9.6, 9.4, 7.2, 9.0, 9.6), "evet", 412, { method: "rezervasyon", down: 9 }),
  E("sakura-omakase", "nazli-ada", "2026-07-18",
    "Japon mutfağı yazdığım otuz yedinci yer. Teknik olarak en iyilerinden ama en sevdiğim değil — sayaç arkasında konuşulmuyor, her şey fazla sessiz ve fazla ciddi. Omakase bir gösteri değil ama bir sohbettir de. Yemek 9,5; akşam 8.",
    D(9.5, 8.6, 7.0, 7.4, 9.4), "evet", 267, { method: "rezervasyon", down: 14 }),
  E("sakura-omakase", "denizyer", "2026-04-06",
    "Nisandaki menüde ilk kez yerli çipura kullandılar ve işe yaradı. Aynı hafta iki farklı şef arkadaşım da gitti, ikisi de aynı servisi öne çıkardı. Bu yazıyı işletmenin davetiyle gittiğim akşam için yazıyorum — hesabı ben ödemedim, o yüzden fiyat/performans puanı vermiyorum diyemem, veriyorum ama bu bilgiyle okuyun.",
    D(9.2, 9.0, 6.4, 8.8, 9.4), "evet", 198, { method: "rezervasyon", rel: "invited", down: 22 }),
  E("sakura-omakase", "mor-kaskol", "2026-06-11",
    "Doğum günü için gittik, güzeldi ama bu paraya bu porsiyon bana ağır geldi. Çıkışta hâlâ acıktım demek istemiyorum, dedim.",
    D(8.4, 8.8, 5.6, 8.6, 9.2), "emin değil", 88, { down: 19 }),

  /* ═══════════════ ATEŞ STEAKHOUSE ═══════════════ */
  E("ates-steak", "denizyer", "2026-08-05",
    "Kırk gün dry age antrikot. Et iyi, pişirme doğru, sos gereksiz — ki bu bir övgü. Sorun serviste: siparişten sonra otuz beş dakika bekledik ve kimse gelip bir şey söylemedi. Bu fiyat aralığında beklemek sorun değil, bilgilendirilmemek sorun.",
    D(9.0, 6.2, 7.4, 8.2, 8.8), "evet", 234, { method: "fiş", down: 11 }),
  E("ates-steak", "gri-pazartesi", "2026-07-22",
    "Etten anlamam, o yüzden sadece deneyimi yazıyorum: mekân gürültülü, masa aralıkları dar, garson iyi. Hesap üç kişi 5.400.",
    D(8.2, 7.8, 6.6, 6.0, 8.4), "emin değil", 74),
  E("ates-steak", "kirmizibiletci", "2026-05-30",
    "Öğle menüsü akşamın yarı fiyatı ve aynı mutfak. Kimse bunu söylemiyor, ben söyleyeyim.",
    D(8.8, 8.0, 9.0, 7.6, 8.6), "evet", 156, { method: "fiş" }),

  /* ═══════════════ KÖZ DÜRÜM ═══════════════ */
  E("koz-durum", "sokakvesofra", "2026-08-24",
    "Gece 01.30. Kuyruk on iki kişi, bekleme yedi dakika. Dürümün eti közden yeni inmiş, lavaş ısıtılmış değil pişirilmiş. Fiyat 190 lira ve bu sene üçüncü zam. Yine de Kadıköy'de bu saatte bu kalitede tek adres.",
    D(9.4, 8.6, 9.0, 6.8, 7.8), "evet", 386, { method: "konum", down: 8 }),
  E("koz-durum", "nazli-ada", "2026-08-11",
    "Ayakta yiyorsun, oturacak yer yok, kimse de bunu sorun etmiyor. Acılısını isteyin, tereyağlısını istemeyin.",
    D(9.0, 8.2, 9.2, 6.4, 7.4), "evet", 201, { method: "konum" }),
  E("koz-durum", "bahar-gecikmesi", "2026-06-19",
    "Hijyen konusunda tereddüt edenler için: tezgâh açık, her şeyi görüyorsun. Ben rahatladım.",
    D(8.6, 8.0, 9.0, 6.0, 8.2), "evet", 112),

  /* ═══════════════ ASMA TERAS ═══════════════ */
  E("asma-teras", "mor-kaskol", "2026-08-08",
    "İki sene önce şehrin en iyi teraslarından biriydi. Bu yaz gittiğimde mutfak bambaşkaydı; aynı menü, başka bir tabak. Manzara hâlâ manzara ama insan manzaraya gelmiyor.",
    D(4.8, 5.6, 3.9, 8.8, 7.2), "hayır", 178, { method: "rezervasyon", down: 5 }),
  E("asma-teras", "denizyer", "2026-07-29",
    "Şubatta mutfak şefi değişti, temmuzda gittim ve fark bir tabakta anlaşılıyor. Menü aynı kalmış, tarifler aynı değil. Kokteyl tarafı hâlâ iyi; oraya gidin, yemek siparişi vermeyin.",
    D(5.0, 5.8, 4.2, 8.9, 7.6), "hayır", 291, { method: "fiş", down: 16 }),
  E("asma-teras", "gri-pazartesi", "2026-07-14",
    "Rezervasyonsuz girmek imkânsız, rezervasyonla da yirmi dakika bekliyorsun. Kokteyller iyi. Yemek siparişi vermeyin, sadece içki için gidin derim.",
    D(5.2, 5.0, 4.4, 9.0, 7.6), "emin değil", 112, { down: 8 }),
  E("asma-teras", "kirmizibiletci", "2026-06-20",
    "Açıldığı sene haftada bir gidiyordum. Bu sene ikinci gidişim ve muhtemelen sonuncusu. Fiyatlar iki katına çıkarken porsiyonlar küçüldü.",
    D(5.6, 6.2, 3.6, 8.6, 7.8), "hayır", 143, { method: "fiş", down: 11 }),

  /* ═══════════════ BALIKÇI SOKAĞI ═══════════════ */
  E("balikci-sokagi", "kirmizibiletci", "2026-08-05",
    "Kalabalık grup için en rahat yerlerden biri. On kişi gittik, tek masa verdiler, siparişleri karıştırmadılar. Balık günlük, fiyatı tabelada yazıyor — meze tabağını sormadan getirmiyorlar, bu bile başlı başına bir sebep.",
    D(8.8, 9.2, 7.6, 8.8, 8.4), "evet", 132, { method: "rezervasyon", down: 4 }),
  E("balikci-sokagi", "bahar-gecikmesi", "2026-06-28",
    "Hesap beklediğimden yüksek geldi ama kalem kalem yazılmıştı ve sorduğum her kalemin cevabı vardı. Pahalı olmakla kazık atmak arasındaki farkı bilenlerdenler.",
    D(8.4, 8.6, 6.8, 8.2, 8.0), "evet", 88, { down: 6 }),
  E("balikci-sokagi", "sokakvesofra", "2026-07-16",
    "Karaköy'de balıkçı çok, dürüst balıkçı az. Buranın farkı: ne olduğunu söylüyorlar. Levrek yoksa levrek yok diyorlar, çipurayı levrek diye satmıyorlar.",
    D(8.6, 9.0, 7.8, 8.4, 8.2), "evet", 174, { method: "konum" }),

  /* ═══════════════ KUZEY KAHVE ═══════════════ */
  E("kuzey-kahve", "filtrekayit", "2026-08-19",
    "Üç ayrı sabah, üç ayrı barista, aynı fincan. Tutarlılık kahvede en zor iş ve burada var. Çekirdek kendi kavurmaları değil ama seçimleri iyi. Sabah 8'de açık ve o saatte sessiz — Kadıköy'de bu kombinasyon nadir.",
    C(9.4, 7.4, 8.8, 8.2, 9.0), "evet", 256, { method: "konum", down: 4 }),
  E("kuzey-kahve", "nazli-ada", "2026-07-30",
    "Öğleden sonra 15.00'ten sonra yer bulmak imkânsız. Laptopla gideceksen sabah git, yoksa ayakta kahveni içip çıkarsın.",
    C(8.8, 7.0, 8.0, 8.0, 6.4), "evet", 74, { down: 2 }),
  E("kuzey-kahve", "mor-kaskol", "2026-06-12",
    "Sütlü kahveler zayıf, filtre güçlü. Menüdeki ilk üç şey iyi, gerisi doldurma.",
    C(8.0, 6.6, 8.2, 7.8, 8.0), "evet", 91),

  /* ═══════════════ DEMLİK ROASTERY ═══════════════ */
  E("demlik-roastery", "filtrekayit", "2026-08-27",
    "Kendi kavuruyorlar ve kavurma tarihini paket üstüne yazıyorlar — bu sektörde hâlâ istisna. Espresso bazlı içecekler ortalama, filtre tarafı şehrin en iyi üçünde. Tadım oturumu ücretsiz ve gerçekten öğretici.",
    C(9.6, 7.2, 9.0, 7.4, 8.6), "evet", 312, { method: "fiş", down: 5 }),
  E("demlik-roastery", "yorgun-kartograf", "2026-07-03",
    "Fiyatlar Beşiktaş ortalamasının üstünde. Kahveyi ciddiye alıyorsan değer, sadece kafein arıyorsan gereksiz.",
    C(8.8, 6.8, 8.4, 6.2, 8.0), "evet", 96, { down: 9 }),

  /* ═══════════════ TAŞ FIRIN CİHANGİR ═══════════════ */
  E("tas-firin-cihangir", "filtrekayit", "2026-08-12",
    "Ekşi maya ekmek günde iki kez çıkıyor: 08.00 ve 16.00. İkinci partiyi bekleyin, ilk parti fırından erken alınıyor ve iç yapısı sıkı kalıyor. Bunu üç haftada altı kez giderek anladım.",
    C(7.8, 9.4, 8.2, 8.8, 8.0), "evet", 298, { method: "fiş", down: 7 }),
  E("tas-firin-cihangir", "kirmizibiletci", "2026-07-19",
    "Hafta içi sabah kahvaltısı için şehirdeki en iyi fiyat/performans. Hafta sonu aynı kahvaltı iki katı ve bir saat kuyruk. Aynı mekân, iki farklı deneyim.",
    C(7.6, 9.0, 8.0, 8.6, 7.8), "evet", 198, { method: "konum" }),

  /* ═══════════════ HOTEL PAYİTAHT ═══════════════ */
  E("hotel-payitaht", "uzun-koridor", "2026-08-16",
    "İki gece kaldım. Oda küçük ama tavan yüksek; ikisi bir araya gelince küçüklük sorun olmuyor. Arka cepheden oda isteyin — ön cephe sabah altıda çöp kamyonuyla uyandırıyor.",
    H(7.6, 8.8, 9.6, 8.4, 8.2), "evet", 67, { method: "rezervasyon", down: 3 }),
  E("hotel-payitaht", "yorgun-kartograf", "2026-06-24",
    "Kahvaltı ücretli ve o parayı sokağın karşısındaki esnaf lokantasında iki kişi yiyorsunuz. Resepsiyondaki çocuk bunu bana kendisi söyledi.",
    H(7.2, 8.4, 9.4, 9.0, 8.6), "evet", 89, { down: 2 }),

  /* ═══════════════ REGÜLE KATEGORİ ═══════════════ */
  E("dr-demo", "kirmizibiletci", "2026-08-11",
    "Randevu saati 14.00'tü, 15.40'ta girebildim. Muayenede acelesi yoktu, sorduğum her şeyi cevapladı. Sorun sekretarya tarafında, hekimde değil.",
    P(9.0, 4.2, 8.6), "evet", 112, {
      method: "rezervasyon", down: 4,
      response: {
        id: "res.2", experienceId: "exp.134", authorLabel: "Dr. A.Y.", verifiedBusiness: true,
        body: "Randevu gecikmeleri konusunda haklısınız. Temmuzdan itibaren ikinci bir sekreterle çalışıyoruz, ortalama bekleme yirmi dakikaya indi.",
        respondedAt: "2026-08-13", state: "published",
      },
    }),
  E("dr-demo", "bahar-gecikmesi", "2026-05-27",
    "Muayene ücretini randevu alırken telefonda söylüyorlar, kapıda sürpriz yok. Bunu ayrıca yazıyorum çünkü aksi çok yaygın.",
    P(8.4, 6.0, 9.4), "evet", 64, { down: 2 }),
];

/** Ziyaretler deneyimlerden türetilir — Visit ≠ Experience ayrımı korunur. */
export const visits: Visit[] = experiences.map((e) => ({
  id: e.visitId,
  userId: e.authorId,
  entityId: e.entityId,
  visitedAt: e.visitedAt,
  verification: e.verification,
}));

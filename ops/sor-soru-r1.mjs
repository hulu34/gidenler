/* Sor Gidenler · regresyon seti r1 (2026-11-03). Sahibin listelediği hata türleri için, v3 sonuçları görülmeden yazıldı.
   Motor bunlara göre ayarlanmaz; beklentiler yanıta göre değiştirilmez. Anahtarlar sor-soru-v3.mjs ile aynı. */
const JE = "japon-erdal-beyoglu";
export const SORU = [
  /* bütçe: pahalı mekân "uygun" diye öne çıkmaz */
  ["Hesaplı bir lokanta önerir misin", { k: ["Lokanta"], notSlug: ["yeni-lokanta-beyoglu", "lokanta-by-divan-sisli"], honest: 1, noJE: 1 }],
  ["Ucuz esnaf lokantası Beyoğlu", { d: "Beyoğlu", k: ["Lokanta"], notSlug: ["yeni-lokanta-beyoglu"], honest: 1, noJE: 1 }],
  ["Öğrenci bütçesine uygun yemek, Kadıköy", { d: "Kadıköy", honest: 1, noJE: 1 }],
  ["300 TL altında akşam yemeği Beşiktaş", { d: "Beşiktaş", honest: 1, noJE: 1 }],
  /* semt: başka ilçe ana öneri olmaz */
  ["Kadıköy'de meyhane", { d: "Kadıköy", k: ["Meyhane", "Restoran"], noJE: 1 }],
  ["Moda'da kahve", { d: "Kadıköy", k: ["Kahveci", "Kafe"], noJE: 1 }],
  ["Cihangir'de kahvaltı", { d: "Beyoğlu", noJE: 1 }],
  ["Bağdat Caddesi'nde burger", { dAny: ["Kadıköy", "Maltepe"], k: ["Burger"], noJE: 1 }],
  /* yemek türü: Samsun pidesi yalnız lahmacuncuyla eşdeğer sayılmaz */
  ["Samsun pidesi yiyebileceğim yer", { k: ["Pideci", "Restoran", "Lokanta"], min: 1 }],
  ["Kadıköy'de Samsun pidesi", { d: "Kadıköy", noJE: 1 }],
  ["Beşiktaş'ta kapalı pide", { d: "Beşiktaş", noJE: 1 }],
  /* nitelik: kayıtta yoksa iddia yok */
  ["Boğaz manzaralı balık restoranı", { k: ["Balık restoranı"], honest: 1, noJE: 1 }],
  ["Sakin ve romantik bir meyhane, Beyoğlu", { d: "Beyoğlu", honest: 1, noJE: 1 }],
  ["Çocuklu aile için uygun bir yer, Ataşehir", { d: "Ataşehir", honest: 1, noJE: 1 }],
  /* sözcük tuzakları */
  ["pide nerede yenir", { k: ["Pideci", "Kebapçı / Ocakbaşı"], notSlug: ["yeni-lokanta-beyoglu"] }],
  ["Boğaz'da kahvaltı", { notSlug: ["boga-kagithane"], noJE: 1 }],
  ["Adana kebap yiyelim", { k: ["Kebapçı / Ocakbaşı"], notD: "Adalar", noJE: 1 }],
  ["Adalar'da balık", { d: "Adalar", noJE: 1 }],
  /* tarafsızlık */
  ["Beyoğlu'nda bir şeyler yiyelim", { d: "Beyoğlu", noJE: 1 }],
  ["İstanbul'da en iyi pide", { k: ["Pideci", "Restoran"] }],
  /* puan uydurma */
  ["En yüksek puanlı restoran hangisi", { honest: 1, noJE: 1 }],
  ["Kadıköy'de en popüler kebapçı", { d: "Kadıköy", k: ["Kebapçı / Ocakbaşı"], honest: 1, noJE: 1 }],
  /* olumsuz tercih */
  ["Beşiktaş'ta balık olmayan bir akşam yemeği", { d: "Beşiktaş", notK: ["Balık restoranı"], min: 1, noJE: 1 }],
  ["Şişli'de pizza ya da burger dışında bir şey", { d: "Şişli", notK: ["Pizza", "Burger"], min: 1, noJE: 1 }],
];
export const TAKIP = [
  [["Karaköy'de güzel bir akşam yemeği öner.", { d: "Beyoğlu", noJE: 1 }],
   ["Daha ekonomik olsun.", { keep: "Karaköy", d: "Beyoğlu", honest: 1 }],
   ["Kadıköy tarafına bakalım.", { d: "Kadıköy", attrKeep: "ekonomik" }],
   ["Kebap olmasın.", { d: "Kadıköy", notK: ["Kebapçı / Ocakbaşı"], attrKeep: "ekonomik" }],
   ["Başka öner.", { d: "Kadıköy", notK: ["Kebapçı / Ocakbaşı"], fresh: 1 }],
   ["Peki dört kişi gidersek?", { d: "Kadıköy", notK: ["Kebapçı / Ocakbaşı"], party: 4 }]],
  [["Beşiktaş'ta kebap", { d: "Beşiktaş" }], ["kebap olmasın", { d: "Beşiktaş", notK: ["Kebapçı / Ocakbaşı"] }], ["aslında kebap olsun", { d: "Beşiktaş", k: ["Kebapçı / Ocakbaşı"] }]],
];
export { JE };

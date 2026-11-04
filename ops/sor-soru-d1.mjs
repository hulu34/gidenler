/* Sor Gidenler · d1 (2026-11-04): canlıda görülen iki sorunun d966b95 düzeltmesi için küçük gerçek model kontrolü.
   Groq kotası Production ile ortak; bu yüzden az soru. Beklentiler yanıta göre değiştirilmez. */
export const SORU = [
  ["Galata'da Samsun pidesi", { d: "Beyoğlu", k: ["Pideci"], noJE: 0 }],
  ["Fatih'te kuru fasulye", { d: "Fatih", noJE: 1 }],
  ["Kadıköy'de mantı", { d: "Kadıköy", noJE: 1 }],
];
export const TAKIP = [
  [["Fatih'te köfte", { d: "Fatih" }], ["Bodrum'da balık", { none: 1 }]],
  [["Kadıköy'de balık", { d: "Kadıköy", k: ["Balık restoranı"] }], ["İzmir'de kahvaltı", { none: 1 }], ["Beşiktaş'ta kahvaltı", { d: "Beşiktaş" }]],
];

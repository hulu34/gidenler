/**
 * HARİTADA GİDENLER — demo konumlar.
 * Gerçek harita servisi yok; şematik bir yüzey. Kullanıcı konumu alınmaz.
 * Koordinatlar okunabilirlik için seyreltilmiş demo değerlerdir.
 */
export const demoGeo: Record<string, { lat: number; lng: number; district: string }> = {
  "ent.moda-lokantasi":     { lat: 40.978, lng: 29.022, district: "Kadıköy" },
  "ent.koz-durum":          { lat: 40.998, lng: 29.031, district: "Kadıköy" },
  "ent.kuzey-kahve":        { lat: 40.984, lng: 29.036, district: "Kadıköy" },
  "ent.sakura-omakase":     { lat: 41.050, lng: 28.986, district: "Şişli" },
  "ent.ates-steak":         { lat: 41.040, lng: 29.017, district: "Beşiktaş" },
  "ent.asma-teras":         { lat: 41.033, lng: 29.006, district: "Beşiktaş" },
  "ent.demlik-roastery":    { lat: 41.046, lng: 29.005, district: "Beşiktaş" },
  "ent.balikci-sokagi":     { lat: 41.021, lng: 28.975, district: "Beyoğlu" },
  "ent.tas-firin-cihangir": { lat: 41.030, lng: 28.986, district: "Beyoğlu" },
};

/* İLÇE SINIRLARI — nokta hangi ilçede? (OSM idari sınırları, admin_level=6; © OpenStreetMap katkıcıları, ODbL)
   Sınırlar data/katalog/<sehir>-ilceler.json dosyasında sadeleştirilmiş çizgiler olarak durur (scripts/katalog/sinir-hazirla.mjs).
   Çift-tek kuralı halka birleştirmeden de çalışır: bir noktadan çıkan ışının bütün sınır parçalarını kesme sayısı. */
export type LatLng = [number, number];
export interface IlceSiniri { ad: string; osm: string; bbox: [number, number, number, number]; cizgiler: LatLng[][] }
export interface SinirDosyasi { sehir: string; kaynak: string; lisans: string; tarih: string; ilceler: IlceSiniri[] }

export function inside(lat: number, lng: number, d: IlceSiniri): boolean {
  const [s, w, n, e] = d.bbox;
  if (lat < s || lat > n || lng < w || lng > e) return false;
  let c = false;
  for (const line of d.cizgiler) {
    for (let i = 0, j = line.length - 1; i < line.length; j = i++) {
      if (i === 0) continue; // çizgi kapalı değil: yalnız ardışık noktalar
      const [ay, ax] = line[i - 1], [by, bx] = line[i];
      if ((ay > lat) !== (by > lat) && lng < ((bx - ax) * (lat - ay)) / (by - ay) + ax) c = !c;
    }
  }
  return c;
}

/** Noktanın ilçesi; hiçbirinde değilse null (il dışı ya da kıyı/deniz). */
export function districtOf(lat: number, lng: number, f: SinirDosyasi): string | null {
  for (const d of f.ilceler) if (inside(lat, lng, d)) return d.ad;
  return null;
}

/** Katalogdaki yazım ↔ OSM yazımı (ör. "Kâğıthane" → "Kağıthane"). */
export const canonDistrict = (s: string) => s.replace(/â/g, "a").replace(/Â/g, "A");

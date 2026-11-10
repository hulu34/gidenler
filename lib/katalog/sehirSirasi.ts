/* Genişleme sırası: TÜİK ADNKS il nüfusuna göre, dosyadan hesaplanır (kodda sabit sıra yok). Yeni TÜİK yayınında yalnız
   data/katalog/iller-tuik-2025.json yenilenir (kaynak, referans tarihi ve dosya güncelleme tarihiyle). */
import IL from "@/data/katalog/iller-tuik-2025.json";
import { sehirOf, type SehirDurum } from "@/lib/sehir";
export const genislemeSirasi = () => [...IL.iller].sort((a, b) => b.nufus - a.nufus)
  .map((i, k) => ({ sira: k + 1, id: i.id, ad: i.ad, plaka: i.plaka, nufus: i.nufus, durum: sehirOf(i.id)?.durum ?? ("plan" as SehirDurum) }));
export const nufusKaynagi = { kaynak: IL.kaynak, referansTarihi: IL.referansTarihi, guncelleme: IL.dosyaGuncelleme };

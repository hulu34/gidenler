import type { EntityEvent } from "@/lib/types";

/**
 * DEMO VERİ — "NE OLDU?"
 * Puanın neden değiştiğini olaylarla açıklamaya çalışır.
 * Korelasyon nedensellik değildir: "Şef değişiminin ardından…" denir,
 * "şef değiştiği için düştü" denmez. confidence olayın gerçekleştiğine
 * dair güvendir; etkisine dair değil.
 */
export const entityEvents: EntityEvent[] = [
  /* ─── Asma Teras: düşüş hikâyesi ─── */
  {
    id: "ev.asma.chef", entityId: "ent.asma-teras", type: "chef_change",
    title: "Mutfak şefi değişti",
    description: "Şubat 2026'da yazılan üç deneyimde mutfak ekibinin değiştiğinden söz ediliyor; işletme teyit etmedi.",
    occurredAt: "2026-02-10", confidence: "medium", sourceType: "deneyimlerden çıkarım",
    relatedSignals: [
      { period: "Mart–Mayıs", label: "Lezzet 8,1 → 7,3", direction: "down" },
      { period: "Haziran", label: "Mutfak kalitesi eleştirileri %34 arttı", direction: "up" },
      { period: "Ağustos", label: "Gidenler puanı 5,4", direction: "down" },
    ],
    isDemo: true,
  },
  {
    id: "ev.asma.price", entityId: "ent.asma-teras", type: "price_change",
    title: "Menü fiyatları yükseldi",
    description: "Mayıs 2026'dan itibaren deneyimlerde 'pahalı' teması belirgin biçimde artıyor; işletmeden bir açıklama yok.",
    occurredAt: "2026-05-01", confidence: "medium", sourceType: "deneyimlerden çıkarım",
    relatedSignals: [
      { period: "Mayıs–Temmuz", label: "Fiyat / performans 6,2 → 4,0", direction: "down" },
      { period: "Temmuz", label: "Tekrar gitme niyeti %38", direction: "down" },
    ],
    isDemo: true,
  },

  /* ─── Moda Lokantası: fiyat algısı hikâyesi ─── */
  {
    id: "ev.moda.menu", entityId: "ent.moda-lokantasi", type: "menu_change",
    title: "Mevsim menüsüne geçildi",
    description: "İşletme Nisan 2026'da menüyü mevsime göre yenilediğini bildirdi.",
    occurredAt: "2026-04-06", confidence: "high", sourceType: "işletme beyanı",
    relatedSignals: [
      { period: "Nisan–Haziran", label: "Lezzet 8,3 → 8,9", direction: "up" },
      { period: "Haziran", label: "'Aranan yemek o gün yoktu' notu 22 deneyimde", direction: "up" },
    ],
    isDemo: true,
  },
  {
    id: "ev.moda.price", entityId: "ent.moda-lokantasi", type: "price_change",
    title: "Menü fiyatları güncellendi",
    description: "İşletme Haziran 2026'da fiyat güncellemesi yaptığını bildirdi.",
    occurredAt: "2026-06-15", confidence: "high", sourceType: "işletme beyanı",
    relatedSignals: [
      { period: "Temmuz–Ağustos", label: "Fiyat / performans 8,4 → 8,0", direction: "down" },
      { period: "Ağustos", label: "'Fiyat artışı' teması %22 arttı", direction: "up" },
      { period: "Ağustos", label: "Gidenler puanı 8,7 — yükselişini sürdürdü", direction: "up" },
    ],
    isDemo: true,
  },

  /* ─── Sakura: talep hikâyesi ─── */
  {
    id: "ev.sakura.guide", entityId: "ent.sakura-omakase", type: "award",
    title: "Bir gastronomi rehberinde listelendi",
    description: "Mart 2026'da kamuya açık bir rehber listesinde yer aldı.",
    occurredAt: "2026-03-20", confidence: "high", sourceType: "kamuya açık kaynak",
    relatedSignals: [
      { period: "Nisan–Haziran", label: "Deneyim hacmi %41 arttı", direction: "up" },
      { period: "Haziran", label: "'Rezervasyon bulmak zor' notu 9 deneyimde", direction: "up" },
      { period: "Ağustos", label: "Lezzet 9,3 — değişmedi", direction: "flat" },
    ],
    isDemo: true,
  },
];

export const eventsOf = (entityId: string) =>
  entityEvents.filter((e) => e.entityId === entityId).sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));

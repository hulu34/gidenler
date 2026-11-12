# Codex için: Sor Gidenler ad eşleşmesi hatası ("yüksek" → "Yüksel Balık")

Durum: **öneri.** `lib/sor/engine.ts` dosyası PR #18'de değiştiği için Claude bu dosyaya dokunmadı.

Paket 16 (PR #19) yayımlandığında katalogda "Yüksel Balık" (Bakırköy) bulunur ve aşağıdaki hata ortaya çıkar. Paket 16–18'in yayını bu düzeltmeye bağlıdır.

## Tekrar üretim
1. Paket 16'yı kataloğa ekleyin:
   ```
   node scripts/katalog/pakete-ekle.mjs data/paket/istanbul-16/kayitlar.json
   node scripts/katalog/isletme-ekle.mjs data/paket/istanbul-16/isletme-kayitlari.json
   npx tsx scripts/sor-index.ts
   ```
2. `npx tsx scripts/sortest.ts` sonucu: 321/322.
   - Kalan: `✗ En yüksek puanlı restoran hangisi · puan sıralaması yokken uydurulmaz, açıkça söylenir ["Yüksel Balık/Balık restoranı/Bakırköy"]`.

## Neden
`matchName`, sorudaki "yuksek" kelimesini `within1` (tek harf farkı) ile "yuksel" adına eşliyor. "Balık" kelimesi `NAME_NOISE` listesinde olduğu için mekân adı tek kelimeye ("yuksel") iniyor.

## Önerilen düzeltme
`QUERY_NOISE` listesine sıralama sözcüklerini ekleyin:
```ts
"verilen", "kural", "kurallari",
/* sıralama sözcükleri ad değildir: "en yüksek puanlı" Yüksel Balık değildir */ "yuksek", "puan", "puanli", "puani",
```
- Yerel benzetimde (Production + paket 7–18) bu değişiklikle sortest 322/322 geçiyor.
- "Yüksel Balık" tam adıyla aranınca yine bulunur: QUERY_NOISE yalnız tek kelimelik eşleşmeyi engeller.

## Önerilen ek regresyon testleri (`scripts/sortest.ts`)

| Sorgu | Beklenen |
|---|---|
| "en yüksek puanlı kebapçı" | ad eşleşmesi yok; tür filtresi (kebap) + "puan sıralaması yok" açıklaması |
| "yüksek puanlı balıkçı Bakırköy" | ad eşleşmesi yok (Yüksel Balık seçilmez); bölge + tür filtresi |
| "Yüksel Balık" | Yüksel Balık bulunur (tam ad) |
| "puanı yüksek meyhane" | ad eşleşmesi yok |

Aynı risk benzer adlarda da var: kısa bir sorgu kelimesi, adın genel kelimeler çıkarıldıktan sonra kalan tek kelimesine bir harf farkla yakınsa yanlış eşleşme olur (ör. "puan" → "Puan Restoran"). Her yeni katalog paketinden sonra sortest yeniden çalıştırılmalı.

## Benzetimde doğrulama (`parseQuery`, düzeltme uygulanmış yerel kopya, 2026-11-11)

| Sorgu | Ad | İlçe | Mutfak |
|---|---|---|---|
| "Yüksel Balık" | yuksel-balik-bakirkoy | — | — |
| "en yüksek puanlı restoran hangisi" | — | — | — |
| "yüksek puanlı balıkçı Bakırköy" | — | Bakırköy | balik |
| "puanı yüksek meyhane" | — | — | meyhane |
| "en yüksek puanlı kebapçı" | — | — | kebap |

Düzeltmesiz sortest sonucu 321/322, düzeltmeyle 322/322 (Production + paket 7–18).

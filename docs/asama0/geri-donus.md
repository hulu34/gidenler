# Aşama 0 — yedek ve geri dönüş planı

## Değişikliğin veriye etkisi

Bu değişiklik veritabanına **yazmaz**: göç yok, tablo, satır ya da sütun değişikliği yok. Google tabloları olduğu gibi duruyor; yalnız okunmuyor ve yazılmıyor. Bu yüzden geri dönüş yalnız kod düzeyindedir.

## Yayından önce alınacak yedek (proje sahibi yapar)

Neon panelinde (Vercel → Storage → `gidenler-db` → Neon Console):

1. Branches → **Create branch** → kaynak: Production'ın ana dalı, ad: `yedek-asama0-20261109`, "current data".
2. Dalın oluştuğunu ve tablo sayılarının ana dalla aynı olduğunu kontrol edin.
3. Bu dal en az 14 gün tutulur.

Neon'un zamana göre geri yükleme (PITR) özelliği de saklama süresi içinde ek bir güvencedir. Yedek, Claude tarafından alınamadı: production bağlantı bilgilerini yerel diske indirme izni verilmedi.

## Geri dönüş yolları

| Ne geri alınacak | Nasıl | Süre |
|---|---|---|
| Production kodu | Vercel → Deployments → önceki Production dağıtımı → **Instant Rollback** (Aşama 0 öncesi son dağıtım: `gidenler-qhete9i0l-hulu34.vercel.app`, 9 Kasım) | 1 dk |
| Kod (kalıcı) | `git revert <aşama0 commit>`, ardından `feature/investor-v1`'e itme | 5 dk |
| Google günlük işi | `gh workflow enable "Google puan gunluk"` — **karar gereği yapılmamalı** | — |
| Veri | Gerekmez (yazma yok). Beklenmedik durumda Neon yedek dalından geri yükleme yapılır | 10 dk |

## Bilinen etki

- Ana sayfadaki "En iyiler · Top 10 (Google puanına göre)" bölümü, "Düşenler" ve Google'a dayalı yedek listeler kaybolur. "Yükselenler" yalnız Gidenler etkileşimini gösterir ve veri yetersizse açıklama notu çıkar.
- Mekân sayfasında saklanan Google puanı rozeti görünmez. Resmî Places API ile anlık gösterim (`googleUsable`) kodda aynen duruyor ve Production'da `GOOGLE_PLACES_*` ayarlarına bağlı.
- Arama, harita ve karşılaştırma sayfalarına Google puanı gelmez.
- İşletme paneli yalnız yatırımcı demosunda açılır.
- Rezervasyon: şu an Production'da `RESERVATION_WEBHOOK_URL` tanımlı değil. Gerçek bir rezervasyon ortağı olsaydı bundan sonra 503 alır ve kullanıcıya "iletilmedi" denirdi. Bugün gerçek mekânlarda ortak yok; demo kayıtlar "önizleme" olarak kalıyor.

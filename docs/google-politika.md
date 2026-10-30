# Google Places izin politikası

Her mekân Google'a kapalı doğar. Sınıf izin vermez; ücretli çağrı için açık karar gerekir.

## Kapı

`lib/providers/googlePolicy.ts`, `googleCallAllowed(slug)`. Sıra: anahtar açık → politika `izinli` → D değil → eşleşme `confirmed` (`allowAuto` varsa `auto`) → Redis bütçesi → çağrı. Satır yoksa, bozuksa ya da veritabanı okunamazsa çağrı yok. Eşleştirme aramaları da aynı karardan geçer.

Politika: `field_provenance`, alan `policy.google`. Ekleme yönlü; en yeni satır geçerli. Yazım: `POST /api/admin/db/` `action: google-policy-set`, `confirm: POLITIKA`, `slugs`, `mode` (`kapali`, `baglanti`, `izinli`), `priority` (A-D), `why`, `admin`, isteğe bağlı `allowAuto`, `estimatedCostUsd`. Rapor: `?rapor=google-politika`.

Yeni bir ücretli Google çağrısı bu kapıdan geçmeden eklenmez.

## Bütçe

Aylık tavan 100 USD, günlük 3 USD; ikisi de aynı atomik Redis betiğinde. Ortam değişkenleri yalnız aşağı çeker. IP başına saatte 10 sayfa görüntüsü. Google içeriği yalnız kullanıcı isteyince yüklenir. Google verisi saklanmaz, önbelleğe alınmaz; yalnız `place_id` tutulur.

## Zenginleştirmeden önce üç soru

Bir restoranı zenginleştirmeden veya API işi açmadan önce cevaplanır:

- A. Gidenler'in gastronomi ve kullanıcı deneyimi için ne kadar önemli?
- B. Dış hizmete veya uzun araştırmaya gerçekten ihtiyaç var mı?
- C. Kullanıcıya katkısı, maliyetine ve zamanına değer mi?

Cevap olumsuzsa kayıt temel kayıt olarak kalır. Eksik alan tek başına iş nedeni değildir. Zincir şubeleri ve kamu tesisleri varsayılan olarak düşük önceliklidir; istisna somut gerekçe ister.

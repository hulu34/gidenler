# Eski Google puan verisi — hukuki inceleme ve güvenli temizleme planı

Durum (9 Kasım 2026): otomatik okuma durdu, gösterim ve sıralama kapalı (`lib/gpuan/policy.ts`). **Veri henüz silinmedi.** Silme işlemi bu plan onaylanınca yapılır.

## 1. Kapsam: nerede ne var

| Yer | İçerik | Not |
|---|---|---|
| Neon `google_ratings` | Mekân başına son okuma (puan, değerlendirme sayısı, Maps adresi, place ID) | Gösterimi kapalı |
| Neon `google_rating_history` | Tüm okumaların geçmişi | Sıralamada kullanımı kapalı |
| Neon `google_rating_files` | Excel sürümleri (base64), görünen ad/adres sütunlarıyla | Yalnız yönetim indirir |
| Neon `google_rating_imports` | Aktarım kayıtları (`detail` içinde sayılar) | |
| Neon `google_rating_decisions` | Yönetici kararları ve kanıt (`evidence`) | Kanıtta Google'da görünen ad/adres olabilir |
| Neon `google_rating_lock` | Kilit | İçerik yok |
| Neon Preview dalları | Yukarıdakilerin kopyaları | Her Preview dalı ayrıca temizlenmeli |
| Neon yedek dalları ve PITR geçmişi | Geçmiş anlık görüntüler | Saklama süresi dolunca kendiliğinden düşer |
| GitHub Actions eserleri | `gpuan-gunluk-sifreli`, aday doğrulama çıktıları (şifreli, 30 gün) | Elle silinebilir |
| Sahibin bilgisayarı | Çözülmüş Excel/rapor kopyaları (varsa) | Sahip temizler |
| `place_identifiers` (`provider='google'`) | **Yalnız place ID** | Google şartları place ID'nin saklanmasına izin verir; silinmez |

## 2. Hukuki inceleme (avukata sorulacaklar)

1. Hukuken gerekiyorsa delil olarak saklama: Bir uyuşmazlık veya bildirim ihtimaline karşı, verinin bir kopyası silinmeden önce şifreli ve erişimi kısıtlı olarak, belirli bir süre (ör. 90 gün) saklanmalı mı? Yoksa derhâl ve tamamen silmek mi tercih edilmeli?
2. Google'dan bildirim gelmesi hâlinde nasıl yanıt verilecek ve hangi kanıt (durdurma tarihi, silme tutanağı) sunulacak?
3. `google_rating_decisions.evidence` ve Excel sütunlarında yer alan "Google'da görünen ad/adres" alanları kişisel veri sayılır mı? (Genelde işletme verisidir. Şahıs işletmesinde KVKK açısından ayrıca bakılmalı.)
4. Sitede daha önce gösterilmiş Google puanları için kamuya açık bir açıklama gerekli mi? Arama motoru önbelleğindeki eski sayfalar nasıl ele alınacak?

## 3. Temizleme adımları (onaydan sonra; her adım geri alınabilir sırayla)

1. **Kanıt paketi:** Satır sayıları, tarih aralığı, workflow devre dışı bırakma kaydı (`gh run list` çıktısı) ve bu belgeden oluşan tutanak hazırlanır. Ham veri bu pakete girmez.
2. **(Hukuk "sakla" derse)** İlgili tabloların şifreli dökümü alınır (sahibin açık anahtarıyla, `ops/gpuan-yedek.pem`), erişimi kısıtlı yerde tutulur ve silme tarihi yazılır.
3. **Neon yedek dalı:** Silmeden hemen önce Production'dan `yedek-google-temizlik-<tarih>` dalı açılır. Bu dal tabloları 7 gün içinde geri getirme imkânı verir ve süre sonunda silinir.
4. **Tek işlemde silme** (Production, sonra her Preview dalı):
   ```sql
   BEGIN;
   DELETE FROM google_rating_history; DELETE FROM google_ratings;
   DELETE FROM google_rating_files;   DELETE FROM google_rating_imports;
   DELETE FROM google_rating_decisions; DELETE FROM google_rating_lock;
   COMMIT;
   ```
   Tablolar **kaldırılmaz**, yalnız boşaltılır. Böylece şema, göç geçmişi ve `rollback.ts` bozulmaz. Tabloların kaldırılması ayrı bir göçle, kod tarafı temizlendikten sonra yapılır.
5. **Denetim:** Altı tablonun satır sayısı 0 olmalı. `audit_log`'a `google_cleanup` kaydı yazılır (actor, tarih, silinen satır sayıları).
6. **Eserler:** GitHub Actions'taki `gpuan-*` ve `aday-*` eserleri silinir (`gh api -X DELETE repos/hulu34/gidenler/actions/artifacts/<id>`).
7. **Yedek dalı** süre sonunda silinir. PITR geçmişi Neon'un saklama süresi dolunca kendiliğinden düşer.
8. **Kod temizliği (ayrı PR):** `lib/gpuan/sources/mapsPage.ts`, `scripts/gpuan-guncelle.ts`, `gpuan-arama.ts`, `gpuan-pilot.ts`, `.github/workflows/gpuan-gunluk.yml` ve `ops/olcum`'daki `aday.yml` kaldırılır. Google sekmesi bileşenleri Places UI Kit kararına göre ya silinir ya da yeniden yazılır.

## 4. Geri dönüş

Silme işlemi 3. adımdaki yedek dalı süresince geri alınabilir. Kod değişikliği (gösterim kapatma) veriyi silmez. `lib/gpuan/policy.ts` dosyasındaki sabit kod incelemesiyle değiştirilmedikçe eski veri gösterilmez.

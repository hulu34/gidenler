# Toplu teslim manifesti — Ek 1 (15 Kasım 2026)

Dal: `arastirma/toplu-teslim-ek-1` (#56 `4fbd882` üstünde) · Ek: `data/arastirma/toplu-teslim/ek-1.json` · Test: `scripts/arastirmatopluteslimek1test.ts`

**Yalnız araştırma eki.**
- #56 manifesti değişmedi; test bunu `4fbd882` ile karşılaştırıyor.
- Kataloğa eklenmedi, veritabanına yazılmadı, canlıda sayılmaz.
- #57 (`d4aa855`) ve kabul dalı değişmedi.
- #57'nin 12 restoranı bu ekin kapsamında değil; bu ekteki hiçbir kayıt canlı sayılmaz.
- Canlı taban: İş Production `7924559` (848 kayıt / 813 aktif / 688 aktif restoran) üstünde başladı. #57 bu iş sürerken birleşti ve Production dalı `d4aa855` oldu (860 kayıt / 825 aktif / 700 aktif restoran). Canlı dağıtım doğrulaması Codex ve Pilot'ta.

## Kapsam ve tek sınırlı tur

Kapsam yalnız #56'nın sorunlu havuzu: 52 çözülemeyen eşleşme (`baska-kayitla-eslesmis`) ve 14 eksik adres (`eksik-adres`). Tur şöyle yapıldı:

1. **Yerel eşleşme (ağ erişimi yok):** 52 kaydın PR #50 eşleşmesi 124 uzak dalda ve Production `7924559`'un `data/` dosyalarında arandı (44.728 ad kaydı), aynı ilçe şartıyla. 40 kaydın bağlı kaydı bulundu; çoğu #48 ya da eski paketlerin `inceleme.json` dosyalarında, "kapı no resmî kaynakta doğrulanmadı" ya da "kaynaklı tür yok" gerekçesiyle bekletilmiş Overture adayı.
2. **Kayıtlı resmî site:** Bağlı kayıtta resmî site kayıtlıysa (23 kayıt) yalnız o URL birer kez açıldı. Erişim engeli aşılmadı.
3. **Kayıtlı G&M sayfası:** Eşleşenlerin türü için yalnız kayıtlı G&M 2026 sayfası açıldı (15). Rehber puanı ve metni saklanmadı.
4. **14 eksik adres:** Kayıtlı yeni resmî URL yok, bu yüzden hiçbir sayfa açılmadı; öncelik ve gerekçe yazıldı.

Genel tarama, arama motoru, ücretli kaynak, işletmeye mesaj ve yayın yok.

## Sonuç

| | Kayıt |
|---|---:|
| **İyi kanıtlı** | **12** (11 restoran, 1 bar) |
| Belirsiz (öncelik 1: 15, öncelik 2: 26, öncelik 3: 12) | 53 |
| Zaten yayımlanmış (#56 hatası, düzeltme) | 1 (Lokanta by Divan) |
| Toplam (52 + 14) | 66 |

### İyi kanıtlı 12

Hepsinde şu koşullar sağlanıyor:
- **Kaynaklar:** Kayıtlı resmî site bugün açık ve G&M 2026 rehberiyle (Aralık 2025) aynı ad, sokak ve kapı numarasını veriyor. Bi Nevi Deli dışında telefon da aynı.
- **Tür:** G&M'nin mutfak etiketinden alındı.
- **Durum:** Yayımlanmamış ve #57'nin dışında.

| Kayıt | İlçe | Kategori / tür | Kapı no | Telefon |
|---|---|---|---|---|
| Madera | Şişli | restoran / Modern mutfak | Darülbedai Cad. 4 | eşleşti |
| Roka İstanbul | Beyoğlu | restoran / Dünya mutfağı | Meclis-i Mebusan 14 (resmî 14/2E) | eşleşti |
| Parma Sole | Şile | restoran / Modern mutfak | Kozalı Cad. 23 | eşleşti |
| Novikov Restaurant | Beşiktaş | restoran / Dünya mutfağı | Muallim Naci Cad. 62 | eşleşti |
| Muutto Anatolian Tapas Bar | Beyoğlu | restoran / Şef restoranı* | Meclis-i Mebusan Cad. 8 | eşleşti |
| Madhu's | Beşiktaş | restoran / Dünya mutfağı | Acısu Sok. 19 | eşleşti |
| Maderia Sushi Bar | Şişli | restoran / Dünya mutfağı | Süleyman Nazif Sok. 29-35 | eşleşti |
| İnari Piku Etiler | Beşiktaş | restoran / Dünya mutfağı | Nispetiye Cad. 89 (Etiler şubesi) | eşleşti |
| Havuş Lokantası | Bakırköy | restoran / Geleneksel mutfak | Rauf Orbay Cad. 4, iç kapı 7 | eşleşti |
| Gina | Şişli | restoran / Dünya mutfağı | Kanyon, Büyükdere Cad. 164 (Kanyon şubesi) | eşleşti |
| Bi Nevi Deli | Beşiktaş | restoran / Modern mutfak | Dilhayat Sok. 10/1 | resmî sayfada yok |
| The Townhouse | Kadıköy | **bar** / Bar | Plaj Yolu Sok. 13 | eşleşti |

\* "Şef restoranı" katalog tür listesinde yok (`kindKatalogdaVar: false`).

### Belirsiz 53 (öncelik sırası)

| Öncelik | Kayıt | Gerekçe |
|---|---:|---|
| 1 | 15 | Tek eksikleri var. **İç kapı çelişkisi:** MYK (23A ↔ 23C), Pizza Emirgan / La Boom (14/A ↔ 14/B), Akbabalı (11 ↔ 7), Madam Despina, Sofram (sokak). **Kapı no yok ya da telefon farklı:** Frankie, Frankie Bar, Parlé (AVM). **Resmî sayfa başka işletmenin:** Chalet. **İki ayrı resmî adres:** Çakı. **Resmî sayfada adres yok:** Bado. **Tür etiketi yok** (adres ve telefon birebir): Az Çok Thai, Slow Bebek, Zambak |
| 2 | 26 | Resmî kaynak eksik. MICHELIN 2026 + G&M 2026 iki editoryal kaynak var ama işletmeci kaynağı yok (Seraf Vadi, Nazende Cadde, Monteverdi, Gün Lokantası, Foxy, Basta! Neo-Bistro, Balıkçı Kahraman, Avlu, Aqua, Apartıman Yeniköy, Akira Back, Ahmet Ustam vb.). Ya da adres yer tarifi/AVM düzeyinde (Natolia İstanbul, Başak Cafe, Meşhur Balkan, İBB Çırpıcı) veya kapı no tek kaynakta (Fasuli, Rumeli Tulumbacısı) |
| 3 | 12 | Eşleşme yerel dosyalarda bulunamadı (Fes Cafe, Şırdancı Remzi, Seraf Restaurant vb.) ya da kayıt taşınmış veya ilçesi belirsiz (Brasserie Noir, Hodan, Hüsrev; The Red Balloon'un G&M ilçesi Production'dan farklı) |

## #56 düzeltmeleri (`duzeltmeler56`; manifest dosyası değiştirilmedi)

1. **Lokanta by Divan İstanbul:** Production'da zaten "Lokanta by Divan" (`lokanta-by-divan-sisli`, Asker Ocağı Cad. No:1) olarak yayımlanmış. #56, ad farkı nedeniyle eşleşmeyi kaçırmıştı. Aynı denetim diğer 750 kayıtta yapıldı; benzer adlı başka eşleşmeler farklı adresteki ayrı şubeler.
2. **Nappo Pizza:** İlçe alanına not yazılmıştı. Kaynak (G&M) ilçe vermiyor, bu yüzden alan boş (`null`). Production değeri (Şişli) ayrı alanda; tahminle doldurulmadı.
3. **Platform + editoryal istisnası (3 kayıt: Alaçatı Gurme-i ALA, Meşhur Yayla Kokoreçcisi, Pita Cafe):** #56'da "sahip kararı" diye yazmıştım. Doğru dayanak şu: bu Claude oturumunda kullanıcının 15.11.2026 tarihli **"Platform + editoryal yeter"** mesajı. Bu mesaj Codex ve Pilot hattında doğrudan kullanıcı onayı olarak doğrulanmadı, bu yüzden üç kayıt **`DOGRULANMAMIS`** işaretlendi. #57 ilk ikisini ayrıca şu gerekçeyle bekletti: platform sayfası tam sokak ve kapı numarasını vermiyor. Kabul için Harun'un doğrudan teyidi gerekiyor.

## Yayımlanmış kayıt bulguları (düzeltme yapılmadı)

YorumS ayrıntılı kimlik listesini hazırlıyor; tahminle düzeltme yapılmadı.

| Kayıt | Bulgu |
|---|---|
| Eleos Yeşilköy | Kapı no çelişkisi: G&M 2026 "Yeşilbahçe Sok. No:5" ↔ #48 ve Production "No:9". YorumS dry-run'ı da aynı bulguyu verdi |
| Suna'nın Yeri | G&M "Kandilli İskele Cad. No:4A" ↔ Production "No:17" |
| Deraliye | G&M "Ticarethane Sok. No:13" ↔ Production "No:10" |
| 1924 İstanbul, Pandeli, Lokanta Göktürk, Liman İstanbul, Kör Agop | #56'da kapı no boş. YorumS'un "beş kayıtta kapı yok" bulgusuyla sayı aynı; liste YorumS'tan gelince karşılaştırılmalı |

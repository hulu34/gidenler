# 884 tabanında sekiz restoranlık birleşik aday

Production `bcaef512ca8a5feac20b07c36a006bfd97d19750`; doğrulanan Git tree `74d2ae4de0e741f7aa2207f1da4a436430874f55`. Eski 883 araştırma satırı güncel 884 katalogla yeniden karşılaştırıldı: 160 satırın doğrulanmış mevcut kaydı var (159 tekil slug), 723 satırın kesin kimlik bağı yok. Bunlar canlı toplamı değildir; ad/ilçe benzerliği otomatik kabul sayılmaz. Claude'un bu havuz dışındaki 10 yerel önerisi ayrıca incelendi: sekiz kod adayı, iki bekleyen.

Kod adayları: Bcante, Antakya İşi Sokak Lezzetleri, Cipriani İstanbul, Korecan Korean Restaurant, Jie Fişekhane, Jash Cihangir, Rebel Burgers, Hona. Hedef 892 toplam / 857 aktif / 732 aktif restoran; 114 kafe, 11 bar ve 35 kapalı aynı. Sekizi A-konumsuz / wave25. İşletmeci sayfaları normal tarayıcıda yeniden açıldı; kaynak ve tarih sınırları `birlesik-884-kabul.json` içinde.

Markus, 2025 kapanış duyurusu aynası ile açık duran site arasındaki faaliyet çelişkisi nedeniyle bekliyor; birincil yeniden açılış teyidi yok. Kesin kapalı hükmü verilmedi. Lahmacun Sanatı'nın bağımsız kaynak tarihi 2024-12-20; daha yeni kimliği eşleşen bağımsız faaliyet kanıtı bulunamadı. Maderia kullanıcının isteğiyle bekler. Mama Bowl Moda mevcut Kozyatağı kaydıyla eşzamanlı ayrı şube diye üretilmez. Kıbrıs PR73 ve mevcut restoranların kategori düzeltmeleri bu pakete alınmadı.

Hona için 70/A adresi işletmeci ve 11.09.2026 Al-Monitor mekân yazısında eşleşir. Eski 49A aynı kapı diye sunulmaz. Jie'nin Fişekhane sekmesi kullanıldı, Ataşehir adresi alınmadı. Jash'ta işletmecinin Pürtelaş Hasan Efendi mahalle adı ve mevcut Meyhane türü seçildi; menü ile bağımsız tanım bu seçimi destekler. Yeni taksonomi yaratılmadı, mevcut 884 kaydın türü değiştirilmedi.

Antakya İşi için CB ilk yayın 17.02.2025, yeniden yayın 18.11.2026; bu yeni saha ziyareti değildir. 2026 başlıklı Yemek.com yazısının gün/ayı bilinmiyor. Antakya ve Jash faaliyet tazeliği orta olarak açık kalır. Diğer liste yazılarının tarihi mekâna özel ziyaret veya o gün açık olduğunun teyidi sayılmaz. Bcante'nin platform tarihi bir ziyaretçi kaydına aittir; kişi/yorum/puan aktarılmaz. Cipriani ve Jie için mutfak işletmeci tanımından seçildi; bağlı PDF/QR menüler bütünüyle okunmuş sayılmaz.

Eski 884 kaydın bütün alanları ve sırası, kullanıcılar/deneyimler, Menemen/izinler, Sor güvenliği, Google 06.00/08.30, Excel ve şifreli yedek korunur. Telefon/saat/Instagram, kesin konum/OSM, görsel/puan/ödül, menü/fiyat eklenmez. Sor ve istemci indeksi son birleşik katalogdan üretilir.

`test:birlesik884` kesin892 sayımını ve eski884 alan korumasını; gerçek PGlite/migration/ekleyiciyle sekiz ekleme, tekrar0, yanlış taban ve kimlik çelişkisinde ret, kullanıcı ilişkisi varken geri alma reddi ve güvenli hedefli geri almayı sınar. Tekrar/geri alma karşılaştırması tüm public tabloları kapsar. Önceki PR72 testi tarihî884 altkümesini korur; bu pakette güncel toplamı yeni kesin kapı denetler.

Gerçek Preview henüz oluşturulmadı ve DB'ye uygulanmadı. Son SHA için kullanıcı izni alınacak; önceki PR72 izinleri yeni pakete taşınmaz. READY veya derleme içi smoke gerçek dağıtılmış kabul değildir. Gerçek kabul tamamlanınca Production yayını için ayrıca açık onay gerekir.

Geri dönüş kodu `bcaef512ca8a5feac20b07c36a006bfd97d19750`. Veri yalnız bu sekiz yeni slug ve ilişkileriyle hedefli geri alınabilir; kullanıcı ilişkisi varsa silme durur. Tüm DB resetlenmez.

Yerel sonuç: 20 paket / 1.021 kontrol geçti; tip kontrolü ve derleme geçti. Aynı kilitli bağımlılık kurulumu kullanıldı, temiz ağ kurulumu iddiası yok. Genel dbtest ise hem Production884tabanında hem892adayında293geçti/3kaldı: iki test koordinatsız ilk no_match kaydıyla yakınkonum/telefon senaryosunu kurmaya çalışıyor; üçüncü test2arama ve limitdoğruyken4sonuçsatırını eski<=3sınırında reddediyor. Bu başarısızlıklar saklanmadı; Google kodu/testi/otomasyonu değiştirilmedi. Yeni paketin gerçekPGlite veri kapısı20/20. Ana sayfa scriptgzip327345→327874bayt (+529,%0,162).

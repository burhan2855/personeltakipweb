Personel Takip Sistemi - README
================================

## Web Uygulaması

### Özellikler:
✅ Personel Listesi Yönetimi
✅ Puantaj Girişi ve Hesaplama
✅ Bordro Görüntüleme ve Yazdırma
✅ Excel'e Aktarma
✅ LocalStorage ile Veri Saklama
✅ Responsive Tasarım
✅ Türkçe Para Birimi Formatı

### Kullanım:
1. index.html dosyasını tarayıcıda açın
2. Personel ekleyin
3. Puantaj girişi yapın
4. Bordro görüntüleyin
5. Excel'e aktarın

### Hesaplama Mantığı:
- Aylık çalışma günü: 26 gün
- Günlük ücret = Maaş / 26
- Saatlik ücret = Günlük ücret / 8
- Yıllık izinde kesinti YOK
- Ücretsiz izin ve raporda günlük ücretten kesinti
- Eksik çalışma günlük ücretten düşülür

### Teknolojiler:
- HTML5
- CSS3 (Modern Gradients, Animations)
- Vanilla JavaScript
- SheetJS (Excel Export)
- LocalStorage

---

## Excel Dosyası

Excel 2016 Türkçe uyumlu .xlsm dosyası oluşturulacak.

### Sayfalar:
1. Personel Listesi
2. Puantaj
3. Bordro

### Özellikler:
- VBA Makrolar
- Otomatik Hesaplamalar
- Veri Doğrulama
- Türk Lirası Formatı

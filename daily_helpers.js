// ===== GÜNLÜK PUANTAJ SİSTEMİ =====
// Bu dosya günlük puantaj takibi için app.js'e eklenecek fonksiyonları içerir

// Günlük puantaj hesaplama
function calculateDailyPuantaj(personel, puantajData) {
    const gunlukSaat = parseFloat(personel.gunlukSaat) || 8;
    const mesaiCarpan = parseFloat(personel.mesaiCarpan) || 1.5;
    const maas = parseFloat(personel.maas) || 0;

    // Günlük ücret hesaplama (30 gün üzerinden)
    const gunlukUcret = maas / 30;
    const saatlikUcret = gunlukUcret / gunlukSaat;

    // Çalışma saatleri
    const toplamSaat = parseFloat(puantajData.toplamSaat) || 0;
    const mesaiSaat = parseFloat(puantajData.mesaiSaat) || 0;

    // Mesai ücreti
    const mesaiUcreti = mesaiSaat * saatlikUcret * mesaiCarpan;

    // Eksik Mesai Ücreti (Kesintisi)
    const eksikMesaiSaat = parseFloat(puantajData.eksikMesaiSaat) || 0;
    const eksikMesaiUcreti = eksikMesaiSaat * saatlikUcret;

    // Ek ödemeler ve kesintiler
    const yemekUcreti = parseFloat(puantajData.yemek) || 0;
    const yolUcreti = parseFloat(puantajData.yol) || 0;
    const primUcreti = parseFloat(puantajData.prim) || 0;
    const avansUcreti = parseFloat(puantajData.avans) || 0;
    const digerOdeme = parseFloat(puantajData.digerOdeme) || 0;
    const digerKesinti = parseFloat(puantajData.digerKesinti) || 0;

    // İzin durumuna göre ücret
    let netCalismaUcreti = 0;

    if (puantajData.izinTuru === 'calisti') {
        // Çalıştı - normal ücret + mesai
        netCalismaUcreti = gunlukUcret + mesaiUcreti;
    } else if (puantajData.izinTuru === 'yillik') {
        // Yıllık izin - tam ücret ödenir
        netCalismaUcreti = gunlukUcret;
    } else if (puantajData.izinTuru === 'ucretsiz' || puantajData.izinTuru === 'yok') {
        // Ücretsiz izin veya gelmedi - ücret yok
        netCalismaUcreti = 0;
    } else if (puantajData.izinTuru === 'rapor') {
        // Rapor - tam ücret ödenir
        netCalismaUcreti = gunlukUcret;
    }

    // Toplam hesaplama: (Çalışma + Yemek + Yol + Prim + Diğer Ödeme) - (Avans + Diğer Kesinti + Eksik Mesai)
    const gunlukToplamUcret = netCalismaUcreti + yemekUcreti + yolUcreti + primUcreti + digerOdeme - avansUcreti - digerKesinti - eksikMesaiUcreti;

    return {
        gunlukUcret,
        saatlikUcret,
        toplamSaat,
        mesaiSaat,
        mesaiUcreti,
        gunlukToplamUcret,
        yemekUcreti,
        yolUcreti,
        primUcreti,
        avansUcreti,
        eksikMesaiSaat,
        eksikMesaiUcreti,
        digerOdeme,
        digerKesinti
    };
}

// Tarih formatla
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: 'long', year: 'numeric', weekday: 'short' };
    return date.toLocaleDateString('tr-TR', options);
}

// Saat formatla
function formatTime(timeStr) {
    if (!timeStr) return '-';
    return timeStr;
}

// Durum metni
function getDurumText(izinTuru) {
    const durumlar = {
        'calisti': '✅ Çalıştı',
        'yillik': '🏖️ Yıllık İzin',
        'ucretsiz': '❌ Ücretsiz İzin',
        'rapor': '🏥 Rapor',
        'yok': '⭕ Gelmedi'
    };
    return durumlar[izinTuru] || izinTuru;
}

// Bugünün tarihini al
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

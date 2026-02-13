// ===== Data Storage =====
class DataManager {
    constructor() {
        this.personelList = this.loadData('personelList') || [];
        this.puantajList = this.loadData('puantajList') || [];
        this.userList = this.loadData('userList') || [];

        // Default Admin User if list is empty
        if (this.userList.length === 0) {
            this.registerUser({
                name: 'Administrator',
                username: 'admin',
                password: '123' // Simple default
            });
        }
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Personel Methods
    addPersonel(personel) {
        personel.id = Date.now().toString();
        this.personelList.push(personel);
        this.saveData('personelList', this.personelList);
        return personel;
    }

    updatePersonel(id, personel) {
        const index = this.personelList.findIndex(p => p.id === id);
        if (index !== -1) {
            this.personelList[index] = { ...this.personelList[index], ...personel };
            this.saveData('personelList', this.personelList);
            return this.personelList[index];
        }
        return null;
    }

    deletePersonel(id) {
        this.personelList = this.personelList.filter(p => p.id !== id);
        this.puantajList = this.puantajList.filter(p => p.personelId !== id);
        this.saveData('personelList', this.personelList);
        this.saveData('puantajList', this.puantajList);
    }

    getPersonel(id) {
        return this.personelList.find(p => p.id === id);
    }

    // Puantaj Methods
    addPuantaj(puantaj) {
        puantaj.id = Date.now().toString();
        this.puantajList.push(puantaj);
        this.saveData('puantajList', this.puantajList);
        return puantaj;
    }

    updatePuantaj(id, puantaj) {
        const index = this.puantajList.findIndex(p => p.id === id);
        if (index !== -1) {
            this.puantajList[index] = { ...this.puantajList[index], ...puantaj };
            this.saveData('puantajList', this.puantajList);
            return this.puantajList[index];
        }
        return null;
    }

    deletePuantaj(id) {
        this.puantajList = this.puantajList.filter(p => p.id !== id);
        this.saveData('puantajList', this.puantajList);
    }

    getPuantajByPersonelAndMonth(personelId, month) {
        return this.puantajList.find(p => p.personelId === personelId && p.donem === month);
    }

    // User Methods
    registerUser(user) {
        // Check if username exists
        if (this.userList.some(u => u.username === user.username)) {
            return false;
        }

        user.id = Date.now().toString();
        this.userList.push(user);
        this.saveData('userList', this.userList);
        return true;
    }

    loginUser(username, password) {
        // First check special hardcoded admin for backward compatibility if desired, 
        // but now we rely on userList mostly.
        if (username === 'admin' && password === '123456' && !this.userList.some(u => u.username === 'admin')) {
            return { name: 'Administrator', username: 'admin' };
        }

        // Password hashing should be done here in production, 
        // but for this local simple app plain text is stored as requested/implied context
        return this.userList.find(u => u.username === username && u.password === password);
    }
}

// ===== Utility Functions =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(amount);
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function formatMonthYear(monthStr) {
    const [year, month] = monthStr.split('-');
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${months[parseInt(month) - 1]} ${year}`;
}

// ===== Calculation Functions =====
function calculatePuantaj(personel, puantajData) {
    const maas = parseFloat(personel.maas) || 0;
    const yemek = parseFloat(personel.yemek) || 0;
    const yol = parseFloat(personel.yol) || 0;
    const prim = parseFloat(puantajData.prim) || 0;
    const mesai = parseFloat(puantajData.mesai) || 0;

    // Personel bazlı çalışma saatleri
    const gunlukSaat = parseFloat(personel.gunlukSaat) || 8;
    const mesaiCarpan = parseFloat(personel.mesaiCarpan) || 1.5;

    // Aylık çalışma günü
    const aylikGun = parseFloat(puantajData.calismaGun) || 30;
    const gunlukUcret = maas / aylikGun;
    const saatlikUcret = gunlukUcret / gunlukSaat;

    // İzin kesintisi
    let izinKesinti = 0;
    const izinGun = parseFloat(puantajData.izinGun) || 0;

    if (puantajData.izinTuru === 'ucretsiz') {
        izinKesinti = gunlukUcret * izinGun;
    } else if (puantajData.izinTuru === 'rapor') {
        izinKesinti = gunlukUcret * izinGun;
    }
    // Yıllık izinde kesinti yok

    // Eksik çalışma kesintisi
    const eksikGun = parseFloat(puantajData.eksikGun) || 0;
    const eksikKesinti = gunlukUcret * eksikGun;

    // Toplam hesaplama
    const toplamKazanc = maas + yemek + yol + prim + mesai;
    const toplamKesinti = izinKesinti + eksikKesinti;
    const netHakedis = toplamKazanc - toplamKesinti;

    return {
        maas,
        yemek,
        yol,
        prim,
        mesai,
        izinKesinti,
        eksikKesinti,
        toplamKazanc,
        toplamKesinti,
        netHakedis,
        gunlukUcret,
        saatlikUcret,
        mesaiCarpan
    };
}

// ===== Time Calculation Helper =====
function calculateOvertimeHours(girisSaati, cikisSaati, gunlukSaat) {
    if (!girisSaati || !cikisSaati) return 0;

    const [girisHour, girisMin] = girisSaati.split(':').map(Number);
    const [cikisHour, cikisMin] = cikisSaati.split(':').map(Number);

    const girisDecimal = girisHour + (girisMin / 60);
    const cikisDecimal = cikisHour + (cikisMin / 60);

    let toplamSaat = cikisDecimal - girisDecimal;

    // Gece yarısını geçen vardiyalar için
    if (toplamSaat < 0) {
        toplamSaat += 24;
    }

    // Mesai saati = Toplam çalışma - Günlük normal saat
    const mesaiSaat = Math.max(0, toplamSaat - gunlukSaat);

    return mesaiSaat;
}


// ===== App Controller =====
class App {
    constructor() {
        this.dataManager = new DataManager();
        this.currentEditPersonelId = null;
        this.currentEditPuantajId = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.renderPersonelList();
        this.renderPuantajList();
        this.updateStats();
        this.populateSelects();

        // Set default dates
        document.getElementById('puantajMonth').value = getCurrentMonth();
        document.getElementById('bordroMonth').value = getCurrentMonth();

        // Set today's date for daily puantaj
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        if (document.getElementById('puantajTarih')) {
            document.getElementById('puantajTarih').value = dateStr;
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });
    }

    navigateToPage(page) {
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(page).classList.add('active');
    }

    setupEventListeners() {
        // Personel Modal
        document.getElementById('addPersonelBtn').addEventListener('click', () => this.openPersonelModal());
        document.getElementById('personelForm').addEventListener('submit', (e) => this.handlePersonelSubmit(e));

        // Puantaj Modal
        document.getElementById('addPuantajBtn').addEventListener('click', () => this.openPuantajModal());
        document.getElementById('puantajForm').addEventListener('submit', (e) => this.handlePuantajSubmit(e));

        // Puantaj calculations
        document.getElementById('puantajPersonel').addEventListener('change', () => this.updatePuantajCalculation());
        document.getElementById('puantajGirisSaati').addEventListener('input', () => this.updatePuantajCalculation());
        document.getElementById('puantajCikisSaati').addEventListener('input', () => this.updatePuantajCalculation());

        // Ek ödeme ve kesintiler
        ['puantajYemek', 'puantajYol', 'puantajPrim', 'puantajAvans', 'puantajDigerOdeme', 'puantajDigerKesinti', 'puantajEksikMesaiSaat'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updatePuantajCalculation());
        });

        // İzin durumu değiştiğinde hesaplamayı güncelle
        document.querySelectorAll('input[name="izinTuru"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updatePuantajCalculation();
            });
        });

        // Filters
        document.getElementById('puantajMonth').addEventListener('change', () => this.renderPuantajList());
        document.getElementById('puantajPersonelFilter').addEventListener('change', () => this.renderPuantajList());

        // Bordro
        document.getElementById('showBordroBtn').addEventListener('click', () => this.showBordro());

        // Export
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());

        // Backup & Restore
        document.getElementById('backupBtn').addEventListener('click', () => this.backupData());
        document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
        document.getElementById('restoreInput').addEventListener('change', (e) => this.restoreData(e));

        // Date Range Checkbox Logic
        const aralikCheckbox = document.getElementById('puantajAralikSecimi');
        if (aralikCheckbox) {
            aralikCheckbox.addEventListener('change', (e) => {
                const bitisDiv = document.getElementById('divBitisTarihi');
                const bitisInput = document.getElementById('puantajBitisTarihi');
                const baslangicInput = document.getElementById('puantajTarih');

                if (e.target.checked) {
                    bitisDiv.style.display = 'block';
                    bitisInput.required = true;
                    // Set default end date same as start date if empty
                    if (!bitisInput.value && baslangicInput.value) {
                        bitisInput.value = baslangicInput.value;
                    }
                } else {
                    bitisDiv.style.display = 'none';
                    bitisInput.required = false;
                }
            });
        }
    }

    // ===== Personel Management =====
    openPersonelModal(personelId = null) {
        this.currentEditPersonelId = personelId;
        const modal = document.getElementById('personelModal');
        const title = document.getElementById('personelModalTitle');

        if (personelId) {
            const personel = this.dataManager.getPersonel(personelId);
            title.textContent = 'Personel Düzenle';
            document.getElementById('personelId').value = personel.id;
            document.getElementById('personelAd').value = personel.ad;
            document.getElementById('personelBankaMaas').value = personel.bankaMaas || 0;
            document.getElementById('personelEldenMaas').value = personel.eldenMaas || 0;
            document.getElementById('personelTel').value = personel.tel || '';
            document.getElementById('personelIban').value = personel.iban || '';
            document.getElementById('personelIzin').value = personel.izinHakki;
            document.getElementById('personelGunlukSaat').value = personel.gunlukSaat || 8;
            document.getElementById('personelMesaiCarpan').value = personel.mesaiCarpan || 1.5;
        } else {
            title.textContent = 'Yeni Personel Ekle';
            document.getElementById('personelForm').reset();
            document.getElementById('personelId').value = '';
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    handlePersonelSubmit(e) {
        e.preventDefault();

        const bankaMaas = parseFloat(document.getElementById('personelBankaMaas').value) || 0;
        const eldenMaas = parseFloat(document.getElementById('personelEldenMaas').value) || 0;
        const personelData = {
            ad: document.getElementById('personelAd').value,
            bankaMaas: bankaMaas,
            eldenMaas: eldenMaas,
            maas: bankaMaas + eldenMaas, // Toplam maaş (Hesaplamalar için)
            tel: document.getElementById('personelTel').value,
            iban: document.getElementById('personelIban').value,
            izinHakki: parseInt(document.getElementById('personelIzin').value) || 14,
            gunlukSaat: parseFloat(document.getElementById('personelGunlukSaat').value) || 8,
            mesaiCarpan: parseFloat(document.getElementById('personelMesaiCarpan').value) || 1.5
        };

        if (this.currentEditPersonelId) {
            this.dataManager.updatePersonel(this.currentEditPersonelId, personelData);
        } else {
            this.dataManager.addPersonel(personelData);
        }

        this.closePersonelModal();
        this.renderPersonelList();
        this.updateStats();
        this.populateSelects();
    }

    deletePersonel(id) {
        if (confirm('Bu personeli silmek istediğinizden emin misiniz? Tüm puantaj kayıtları da silinecektir.')) {
            this.dataManager.deletePersonel(id);
            this.renderPersonelList();
            this.renderPuantajList();
            this.updateStats();
            this.populateSelects();
        }
    }

    renderPersonelList() {
        const tbody = document.getElementById('personelTableBody');
        const personelList = this.dataManager.personelList;

        if (personelList.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
                        <div class="empty-state-content">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="32" fill="#f3f4f6"/>
                                <path d="M32 20c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 20c-6.7 0-12 3.3-12 6v2h24v-2c0-2.7-5.3-6-12-6z" fill="#9ca3af"/>
                            </svg>
                            <p>Henüz personel eklenmemiş</p>
                            <button class="btn btn-primary" onclick="app.openPersonelModal()">İlk Personeli Ekle</button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = personelList.map(personel => `
            <tr>
                <td><strong>${personel.ad}</strong></td>
                <td>
                    <div style="font-size: 13px;">Banka: ${formatCurrency(personel.bankaMaas || 0)}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Elden: ${formatCurrency(personel.eldenMaas || 0)}</div>
                </td>
                <td>${formatCurrency(personel.maas)}</td>
                <td>${personel.gunlukSaat || 8} saat</td>
                <td>x${personel.mesaiCarpan || 1.5}</td>
                <td>${personel.izinHakki} Gün</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.openPersonelModal('${personel.id}')">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deletePersonel('${personel.id}')">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ===== Puantaj Management =====
    openPuantajModal(puantajId = null) {
        this.currentEditPuantajId = puantajId;
        const modal = document.getElementById('puantajModal');
        const title = document.getElementById('puantajModalTitle');

        if (puantajId) {
            const puantaj = this.dataManager.puantajList.find(p => p.id === puantajId);
            title.textContent = 'Puantaj Düzenle';
            document.getElementById('puantajId').value = puantaj.id;
            document.getElementById('puantajPersonel').value = puantaj.personelId;
            document.getElementById('puantajTarih').value = puantaj.tarih;
            document.getElementById('puantajGirisSaati').value = puantaj.girisSaati || '09:00';
            document.getElementById('puantajCikisSaati').value = puantaj.cikisSaati || '18:00';
            document.querySelector(`input[name = "izinTuru"][value = "${puantaj.izinTuru || 'calisti'}"]`).checked = true;
            document.getElementById('puantajYemek').value = puantaj.yemek || 0;
            document.getElementById('puantajYol').value = puantaj.yol || 0;
            document.getElementById('puantajPrim').value = puantaj.prim || 0;
            document.getElementById('puantajAvans').value = puantaj.avans || 0;
            document.getElementById('puantajDigerOdeme').value = puantaj.digerOdeme || 0;
            document.getElementById('puantajDigerOdemeAciklama').value = puantaj.digerOdemeAciklama || '';
            document.getElementById('puantajDigerKesinti').value = puantaj.digerKesinti || 0;
            document.getElementById('puantajDigerKesintiAciklama').value = puantaj.digerKesintiAciklama || '';
            document.getElementById('puantajEksikMesaiSaat').value = puantaj.eksikMesaiSaat || 0;
            document.getElementById('puantajNot').value = puantaj.not || '';
        } else {
            title.textContent = 'Yeni Puantaj Ekle';
            document.getElementById('puantajForm').reset();
            document.getElementById('puantajId').value = '';

            // Set today's date
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            document.getElementById('puantajTarih').value = `${year} -${month} -${day} `;

            document.getElementById('puantajGirisSaati').value = '09:00';
            document.getElementById('puantajCikisSaati').value = '18:00';
            document.querySelector('input[name="izinTuru"][value="calisti"]').checked = true;
        }

        // Düzenleme modunda aralık seçimini gizle ve sıfırla
        const aralikDiv = document.getElementById('puantajAralikSecimi').closest('div');
        const aralikCheckbox = document.getElementById('puantajAralikSecimi');
        const bitisDiv = document.getElementById('divBitisTarihi');

        if (puantajId) {
            aralikDiv.style.display = 'none';
            aralikCheckbox.checked = false;
            bitisDiv.style.display = 'none';
        } else {
            aralikDiv.style.display = 'flex';
            aralikCheckbox.checked = false;
            bitisDiv.style.display = 'none';
        }

        this.updatePuantajCalculation();
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    updatePuantajCalculation() {
        const personelId = document.getElementById('puantajPersonel').value;
        if (!personelId) {
            document.getElementById('puantajToplamSaat').value = 0;
            document.getElementById('puantajMesaiSaat').value = 0;
            document.getElementById('puantajEksikMesaiSaat').value = 0;
            document.getElementById('puantajMesaiUcret').value = 0;
            document.getElementById('puantajEksikMesaiUcret').value = 0;
            document.getElementById('puantajGunlukUcret').value = 0;
            return;
        }

        const personel = this.dataManager.getPersonel(personelId);
        const girisSaati = document.getElementById('puantajGirisSaati').value;
        const cikisSaati = document.getElementById('puantajCikisSaati').value;
        const gunlukSaat = parseFloat(personel.gunlukSaat) || 8;

        let toplamSaat = 0;
        let mesaiSaat = 0;
        let eksikMesaiSaat = 0;
        const izinTuru = document.querySelector('input[name="izinTuru"]:checked').value;

        // Saat farkını hesapla (Sadece çalıştı durumunda)
        if (girisSaati && cikisSaati && izinTuru === 'calisti') {
            const [girisH, girisM] = girisSaati.split(':').map(Number);
            const [cikisH, cikisM] = cikisSaati.split(':').map(Number);

            let diff = (cikisH + cikisM / 60) - (girisH + girisM / 60);
            if (diff < 0) diff += 24; // Gece vardiyası

            toplamSaat = diff;
            mesaiSaat = Math.max(0, toplamSaat - gunlukSaat);
            eksikMesaiSaat = Math.max(0, gunlukSaat - toplamSaat);
        }

        document.getElementById('puantajToplamSaat').value = toplamSaat.toFixed(1);
        document.getElementById('puantajMesaiSaat').value = mesaiSaat.toFixed(1);
        document.getElementById('puantajEksikMesaiSaat').value = eksikMesaiSaat.toFixed(1);

        // Ücretleri hesapla
        const puantajData = {
            toplamSaat: toplamSaat,
            mesaiSaat: mesaiSaat,
            izinTuru: document.querySelector('input[name="izinTuru"]:checked').value,
            yemek: parseFloat(document.getElementById('puantajYemek').value) || 0,
            yol: parseFloat(document.getElementById('puantajYol').value) || 0,
            prim: parseFloat(document.getElementById('puantajPrim').value) || 0,
            avans: parseFloat(document.getElementById('puantajAvans').value) || 0,
            digerOdeme: parseFloat(document.getElementById('puantajDigerOdeme').value) || 0,
            digerKesinti: parseFloat(document.getElementById('puantajDigerKesinti').value) || 0,
            eksikMesaiSaat: parseFloat(document.getElementById('puantajEksikMesaiSaat').value) || 0
        };

        const calc = calculateDailyPuantaj(personel, puantajData);

        document.getElementById('puantajMesaiUcret').value = calc.mesaiUcreti.toFixed(2);
        document.getElementById('puantajEksikMesaiUcret').value = calc.eksikMesaiUcreti.toFixed(2);
        document.getElementById('puantajGunlukUcret').value = calc.gunlukToplamUcret.toFixed(2);
    }

    handlePuantajSubmit(e) {
        e.preventDefault();

        const personelId = document.getElementById('puantajPersonel').value;
        const isAralik = document.getElementById('puantajAralikSecimi') ? document.getElementById('puantajAralikSecimi').checked : false;

        // Base Data Object (without date)
        const baseData = {
            personelId: personelId,
            girisSaati: document.getElementById('puantajGirisSaati').value,
            cikisSaati: document.getElementById('puantajCikisSaati').value,
            toplamSaat: parseFloat(document.getElementById('puantajToplamSaat').value) || 0,
            mesaiSaat: parseFloat(document.getElementById('puantajMesaiSaat').value) || 0,
            izinTuru: document.querySelector('input[name="izinTuru"]:checked').value,
            yemek: parseFloat(document.getElementById('puantajYemek').value) || 0,
            yol: parseFloat(document.getElementById('puantajYol').value) || 0,
            prim: parseFloat(document.getElementById('puantajPrim').value) || 0,
            avans: parseFloat(document.getElementById('puantajAvans').value) || 0,
            digerOdeme: parseFloat(document.getElementById('puantajDigerOdeme').value) || 0,
            digerOdemeAciklama: document.getElementById('puantajDigerOdemeAciklama').value,
            digerKesinti: parseFloat(document.getElementById('puantajDigerKesinti').value) || 0,
            digerKesintiAciklama: document.getElementById('puantajDigerKesintiAciklama').value,
            eksikMesaiSaat: parseFloat(document.getElementById('puantajEksikMesaiSaat').value) || 0,
            not: document.getElementById('puantajNot').value
        };

        if (isAralik) {
            const startStr = document.getElementById('puantajTarih').value;
            const endStr = document.getElementById('puantajBitisTarihi').value;

            if (!startStr || !endStr) {
                alert('Lütfen başlangıç ve bitiş tarihlerini giriniz.');
                return;
            }

            const startDate = new Date(startStr);
            const endDate = new Date(endStr);

            if (endDate < startDate) {
                alert('Bitiş tarihi başlangıç tarihinden önce olamaz.');
                return;
            }

            // Loop through dates
            let current = new Date(startDate);
            while (current <= endDate) {
                // LOCAL date string generation (YYYY-MM-DD) to avoid timezone/UTC shift
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                // Check if record exists for this date and person
                const existingRecord = this.dataManager.puantajList.find(p => p.personelId === personelId && p.tarih === dateStr);

                const newData = { ...baseData, tarih: dateStr };

                if (existingRecord) {
                    this.dataManager.updatePuantaj(existingRecord.id, newData);
                } else {
                    this.dataManager.addPuantaj(newData);
                }

                current.setDate(current.getDate() + 1);
            }
        } else {
            // Single Date
            const dateStr = document.getElementById('puantajTarih').value;
            const puantajData = { ...baseData, tarih: dateStr };

            if (this.currentEditPuantajId) {
                this.dataManager.updatePuantaj(this.currentEditPuantajId, puantajData);
            } else {
                // Check duplicate for single entry too (optional but good practice)
                const existingRecord = this.dataManager.puantajList.find(p => p.personelId === personelId && p.tarih === dateStr);
                if (existingRecord) {
                    if (confirm(`Bu tarihte(${dateStr}) zaten bir kayıt var.Güncellemek ister misiniz?`)) {
                        this.dataManager.updatePuantaj(existingRecord.id, puantajData);
                    } else {
                        return; // Cancel
                    }
                } else {
                    this.dataManager.addPuantaj(puantajData);
                }
            }
        }

        this.closePuantajModal();
        this.renderPuantajList();
        this.updateStats();
    }

    deletePuantaj(id) {
        if (confirm('Bu puantaj kaydını silmek istediğinizden emin misiniz?')) {
            this.dataManager.deletePuantaj(id);
            this.renderPuantajList();
            this.updateStats();
        }
    }

    renderPuantajList() {
        const tbody = document.getElementById('puantajTableBody');
        const monthFilter = document.getElementById('puantajMonth').value;
        const personelFilter = document.getElementById('puantajPersonelFilter').value;

        // Filtrele
        let filteredList = this.dataManager.puantajList.filter(p => {
            // Tarih kontrolü (Eğer tarih yoksa veya format uymuyorsa atla - eski kayıtlar için)
            if (!p.tarih) return false;

            const pMonth = p.tarih.substring(0, 7); // YYYY-MM
            let matchMonth = true;
            if (monthFilter) {
                matchMonth = pMonth === monthFilter;
            }

            const matchPersonel = !personelFilter || p.personelId === personelFilter;
            return matchMonth && matchPersonel;
        });

        // Tarihe göre sırala (yeni tarih üstte)
        filteredList.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

        if (filteredList.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-state-content">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="32" fill="#f3f4f6" />
                                <path d="M20 16h24v4H20v-4zm0 8h24v4H20v-4zm0 8h24v4H20v-4zm0 8h16v4H20v-4z" fill="#9ca3af" />
                            </svg>
                            <p>Bu kriterlere uygun kayıt bulunamadı</p>
                        </div>
                    </td>
                </tr >
                `;
            return;
        }

        tbody.innerHTML = filteredList.map(puantaj => {
            const personel = this.dataManager.getPersonel(puantaj.personelId);
            if (!personel) return '';

            // Hesaplama yap (görselleştirme için)
            const calc = calculateDailyPuantaj(personel, puantaj);

            return `
                < tr >
                <td>${formatDate(puantaj.tarih)}</td>
                <td><strong>${personel.ad}</strong></td>
                <td>${formatTime(puantaj.girisSaati)}</td>
                <td>${formatTime(puantaj.cikisSaati)}</td>
                <td>${puantaj.toplamSaat ? puantaj.toplamSaat + ' saat' : '-'}</td>
                <td>${puantaj.mesaiSaat > 0 ? `<span class="badge badge-success">+${puantaj.mesaiSaat} saat</span>` : '-'}</td>
                <td><span class="badge ${puantaj.izinTuru === 'calisti' ? 'badge-success' : 'badge-warning'}">${getDurumText(puantaj.izinTuru)}</span></td>
                <td>${formatCurrency(calc.gunlukToplamUcret)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.openPuantajModal('${puantaj.id}')">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deletePuantaj('${puantaj.id}')">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr >
                `;
        }).join('');
    }

    // ===== Bordro =====
    // ===== Bordro =====
    showBordro() {
        const personelId = document.getElementById('bordroPersonelSelect').value;
        const monthSelect = document.getElementById('bordroMonth').value;
        document.getElementById('exportPDF').style.display = 'none';

        if (!personelId || !monthSelect) {
            alert('Lütfen personel ve dönem seçiniz');
            return;
        }

        const personel = this.dataManager.getPersonel(personelId);

        // Seçilen aya ait tüm puantaj kayıtlarını bul
        const monthlyRecords = this.dataManager.puantajList.filter(p =>
            p.personelId === personelId && p.tarih && p.tarih.startsWith(monthSelect)
        );

        if (monthlyRecords.length === 0) {
            alert('Seçilen personel ve dönem için puantaj kaydı bulunamadı');
            return;
        }

        // Aylık toplamları hesapla
        let totalMesaiUcreti = 0;
        let totalMesaiSaati = 0;
        let totalCalisilanGun = 0;
        let totalYillikIzinGun = 0;
        let totalRaporGun = 0;
        let totalUcretsizIzinGun = 0;
        let totalDevamsizGun = 0;

        const bankaMaas = parseFloat(personel.bankaMaas) || 0;
        const eldenMaas = parseFloat(personel.eldenMaas) || 0;
        const aylikMaas = bankaMaas + eldenMaas;

        const gunlukUcretBase = aylikMaas / 30;
        let totalNormalUcret = aylikMaas;
        let totalDevamsizlikKesintisi = 0;

        // Ek ödemeler toplamı
        let totalYemekEkstra = 0;
        let totalYolEkstra = 0;
        let totalPrim = 0;
        let totalAvans = 0;
        let totalDigerOdeme = 0;
        let totalDigerKesinti = 0;
        let totalEksikMesaiUcreti = 0;

        monthlyRecords.forEach(record => {
            const calc = calculateDailyPuantaj(personel, record);
            totalMesaiUcreti += calc.mesaiUcreti;
            totalMesaiSaati += calc.mesaiSaat;

            totalYemekEkstra += (calc.yemekUcreti || parseFloat(record.yemek) || 0);
            totalYolEkstra += (calc.yolUcreti || parseFloat(record.yol) || 0);
            totalPrim += (calc.primUcreti || parseFloat(record.prim) || 0);
            totalAvans += (calc.avansUcreti || parseFloat(record.avans) || 0);
            totalDigerOdeme += (calc.digerOdeme || parseFloat(record.digerOdeme) || 0);
            totalDigerKesinti += (calc.digerKesinti || parseFloat(record.digerKesinti) || 0);
            totalEksikMesaiUcreti += (calc.eksikMesaiUcreti || 0);

            if (record.izinTuru === 'calisti') {
                totalCalisilanGun++;
            } else if (record.izinTuru === 'yillik') {
                totalYillikIzinGun++;
            } else if (record.izinTuru === 'rapor') {
                totalRaporGun++;
            } else if (record.izinTuru === 'ucretsiz') {
                totalUcretsizIzinGun++;
                totalDevamsizlikKesintisi += gunlukUcretBase;
            } else if (record.izinTuru === 'yok') {
                totalDevamsizGun++;
                totalDevamsizlikKesintisi += gunlukUcretBase;
            }
        });

        // Show bordro
        document.getElementById('bordroEmpty').style.display = 'none';
        document.getElementById('bordroContent').style.display = 'block';

        // Fill header
        document.getElementById('bordroPersonelName').textContent = personel.ad;
        if (personel.tel) {
            document.getElementById('bordroTelRow').style.display = 'block';
            document.getElementById('bordroPersonelTel').textContent = personel.tel;
        } else {
            document.getElementById('bordroTelRow').style.display = 'none';
        }
        document.getElementById('bordroPeriod').textContent = formatMonthYear(monthSelect);
        document.getElementById('bordroDate').textContent = new Date().toLocaleDateString('tr-TR');

        // Fill content
        const kazanclarTable = document.getElementById('bordroKazanclar');
        let html = `
                < tr >
                <td>Normal Çalışma Ücreti (Aylık Sabit)</td>
                <td>${formatCurrency(totalNormalUcret)}</td>
            </tr >
            <tr>
                <td>Mesai Ücreti (${totalMesaiSaati.toFixed(1)} saat)</td>
                <td>${formatCurrency(totalMesaiUcreti)}</td>
            </tr>
            <tr>
                <td>Yemek Ücreti (${totalCalisilanGun} gün)</td>
                <td>${formatCurrency(totalYemekEkstra)}</td>
            </tr>
            <tr>
                <td>Yol Ücreti (${totalCalisilanGun} gün)</td>
                <td>${formatCurrency(totalYolEkstra)}</td>
            </tr>
            `;

        if (totalPrim > 0) html += `< tr ><td>Prim</td><td>${formatCurrency(totalPrim)}</td></tr > `;
        if (totalDigerOdeme > 0) html += `< tr ><td>Diğer Ödeme</td><td>${formatCurrency(totalDigerOdeme)}</td></tr > `;

        kazanclarTable.innerHTML = html;

        // Kesintiler
        const kesintilerTable = document.getElementById('bordroKesintiler');
        let kesintiHtml = '';

        if (totalAvans > 0) kesintiHtml += `< tr ><td>Avans</td><td>${formatCurrency(totalAvans)}</td></tr > `;
        if (totalDevamsizlikKesintisi > 0) {
            kesintiHtml += `< tr ><td>Devamsızlık / Ücretsiz İzin Kesintisi (${totalUcretsizIzinGun + totalDevamsizGun} gün)</td><td>${formatCurrency(totalDevamsizlikKesintisi)}</td></tr > `;
        }
        if (totalEksikMesaiUcreti > 0) kesintiHtml += `< tr ><td>Eksik Mesai Kesintisi</td><td>${formatCurrency(totalEksikMesaiUcreti)}</td></tr > `;
        if (totalDigerKesinti > 0) kesintiHtml += `< tr ><td>Diğer Kesinti</td><td>${formatCurrency(totalDigerKesinti)}</td></tr > `;

        if (kesintiHtml === '') {
            kesintiHtml = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">Kesinti bulunmamaktadır</td></tr>';
        }
        kesintilerTable.innerHTML = kesintiHtml;

        // Toplamlar
        const toplamKazanc = totalNormalUcret + totalMesaiUcreti + totalYemekEkstra + totalYolEkstra + totalPrim + totalDigerOdeme;
        const toplamKesinti = totalAvans + totalDigerKesinti + totalEksikMesaiUcreti + totalDevamsizlikKesintisi;
        const netOdeme = toplamKazanc - toplamKesinti;

        // Banka ve Elden Bölünmesi
        // Banka ve Elden Bölünmesi
        let bankaNet = bankaMaas;

        // Eğer toplam net ödeme banka maaşından düşükse, banka ödemesi net ödemeye eşitlenir
        if (netOdeme < bankaNet) {
            bankaNet = Math.max(0, netOdeme);
        }

        const eldenNet = netOdeme - bankaNet;

        document.getElementById('bordroToplamKazanc').textContent = formatCurrency(toplamKazanc);
        document.getElementById('bordroToplamKesinti').textContent = formatCurrency(toplamKesinti);
        document.getElementById('bordroBankaNet').textContent = formatCurrency(bankaNet);

        const eldenEl = document.getElementById('bordroEldenNet');
        eldenEl.textContent = formatCurrency(eldenNet);

        // Elden ödeme negatif veya 0 ise stil ekle/kaldır
        if (eldenNet < 0) {
            eldenEl.parentElement.classList.add('negative');
        } else {
            eldenEl.parentElement.classList.remove('negative');
        }
        document.getElementById('bordroNetOdeme').textContent = formatCurrency(netOdeme);

        // IBAN Göster
        if (personel.iban) {
            document.getElementById('bordroIbanSection').style.display = 'block';
            document.getElementById('bordroIbanValue').textContent = personel.iban;
        } else {
            document.getElementById('bordroIbanSection').style.display = 'none';
        }

        // PDF İndir butonunu göster
        document.getElementById('exportPDF').style.display = 'flex';
    }

    // ===== Stats =====
    updateStats() {
        const totalPersonel = this.dataManager.personelList.length;
        const totalMaas = this.dataManager.personelList.reduce((sum, p) => sum + parseFloat(p.maas), 0);

        const currentMonth = getCurrentMonth();

        // Bu ayki günlük puantaj kayıtlarını bul
        const currentMonthPuantajs = this.dataManager.puantajList.filter(p => p.tarih && p.tarih.startsWith(currentMonth));

        // Günlük hakedişleri topla
        let totalBordro = 0;
        currentMonthPuantajs.forEach(puantaj => {
            const personel = this.dataManager.getPersonel(puantaj.personelId);
            if (personel) {
                const calc = calculateDailyPuantaj(personel, puantaj);
                totalBordro += calc.gunlukToplamUcret;
            }
        });

        document.getElementById('totalPersonel').textContent = totalPersonel;
        document.getElementById('totalMaas').textContent = formatCurrency(totalMaas);
        document.getElementById('totalBordro').textContent = formatCurrency(totalBordro);
    }

    // ===== Helper Functions =====
    closePersonelModal() {
        const modal = document.getElementById('personelModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        this.currentEditPersonelId = null;
    }

    closePuantajModal() {
        const modal = document.getElementById('puantajModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        this.currentEditPuantajId = null;
    }

    deletePuantaj(id) {
        if (confirm('Bu puantaj kaydını silmek istediğinizden emin misiniz?')) {
            this.dataManager.deletePuantaj(id);
            this.renderPuantajList();
            this.updateStats();
        }
    }

    // ===== Populate Selects =====
    populateSelects() {
        const personelList = this.dataManager.personelList;
        const options = personelList.map(p => `<option value="${p.id}">${p.ad}</option>`).join('');

        document.getElementById('puantajPersonel').innerHTML = '<option value="">Seçiniz</option>' + options;
        document.getElementById('puantajPersonelFilter').innerHTML = '<option value="">Tüm Personel</option>' + options;
        document.getElementById('bordroPersonelSelect').innerHTML = '<option value="">Personel Seçiniz</option>' + options;
    }

    // ===== Export to Excel =====
    exportToExcel() {
        const wb = XLSX.utils.book_new();

        // 1. Personel Listesi Sheet
        const personelData = [
            ['Personel Adı Soyadı', 'Maaş', 'Yıllık İzin Hakkı', 'Günlük Çalışma Saati', 'Mesai Çarpanı'],
            ...this.dataManager.personelList.map(p => [
                p.ad,
                p.maas,
                p.izinHakki,
                p.gunlukSaat || 8,
                p.mesaiCarpan || 1.5
            ])
        ];
        const personelSheet = XLSX.utils.aoa_to_sheet(personelData);
        XLSX.utils.book_append_sheet(wb, personelSheet, 'Personel Listesi');

        // 2. Puantaj Sheet
        const puantajData = [
            ['Tarih', 'Personel', 'Giriş', 'Çıkış', 'Çalışma (Saat)', 'Mesai (Saat)', 'Eksik Mesai (Saat)', 'Durum', 'Toplam Ücret (₺)', 'Not'],
            ...this.dataManager.puantajList.map(p => {
                const personel = this.dataManager.getPersonel(p.personelId);
                if (!personel) return null;
                const calc = calculateDailyPuantaj(personel, p);
                return [
                    p.tarih,
                    personel.ad,
                    p.girisSaati,
                    p.cikisSaati,
                    p.toplamSaat,
                    p.mesaiSaat,
                    p.eksikMesaiSaat || 0,
                    getDurumText(p.izinTuru),
                    calc.gunlukToplamUcret,
                    p.not || ''
                ];
            }).filter(row => row !== null)
        ];
        const puantajSheet = XLSX.utils.aoa_to_sheet(puantajData);
        XLSX.utils.book_append_sheet(wb, puantajSheet, 'Puantaj Kayıtları');

        // Save file
        const fileName = `Personel_Takip_Sistemi_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // ===== Export to PDF (Bordro) =====
    exportToPDF() {
        const element = document.getElementById('bordroContent');
        const personelName = document.getElementById('bordroPersonelName').textContent;
        const period = document.getElementById('bordroPeriod').textContent;

        const opt = {
            margin: 10,
            filename: `Bordro_${personelName}_${period}.pdf`.replace(/\s+/g, '_'),
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // New Promise-based usage:
        html2pdf().set(opt).from(element).save();
    }



    // ===== Auth Functions =====
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        const user = this.dataManager.loginUser(username, password);

        if (user) {
            // Login Success
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('registerContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            // Optional: Show welcome message or user name
        } else {
            // Login Failed
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    // Show Register Screen
    showRegister(e) {
        e.preventDefault();
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('registerContainer').style.display = 'flex';
        // Reset form
        document.getElementById('registerForm').reset();
        document.getElementById('registerError').style.display = 'none';
        document.getElementById('registerSuccess').style.display = 'none';
    }

    // Show Login Screen
    showLogin(e) {
        e.preventDefault();
        document.getElementById('registerContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'flex';
        // Reset form
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    }

    // Handle Register
    handleRegister(e) {
        e.preventDefault();

        const name = document.getElementById('regName').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');

        const newUser = {
            name: name,
            username: username,
            password: password
        };

        const isSuccess = this.dataManager.registerUser(newUser);

        if (isSuccess) {
            successDiv.style.display = 'block';
            errorDiv.style.display = 'none';

            // Redirect to login after 1.5 seconds
            setTimeout(() => {
                this.showLogin(e);
            }, 1500);
        } else {
            errorDiv.textContent = 'Bu kullanıcı adı zaten kullanılıyor!';
            errorDiv.style.display = 'block';
            successDiv.style.display = 'none';
        }
    }

    // ===== Backup & Restore =====
    backupData() {
        const data = {
            personelList: this.dataManager.personelList,
            puantajList: this.dataManager.puantajList,
            userList: this.dataManager.userList,
            backupDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `Personel_Takip_Yedek_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    restoreData(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('DİKKAT: Yükleyeceğiniz yedek dosyası mevcut verilerin üzerine yazılacaktır. Devam etmek istiyor musunuz?')) {
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.personelList && Array.isArray(data.personelList)) {
                    this.dataManager.personelList = data.personelList;
                    this.dataManager.saveData('personelList', data.personelList);
                }

                if (data.puantajList && Array.isArray(data.puantajList)) {
                    this.dataManager.puantajList = data.puantajList;
                    this.dataManager.saveData('puantajList', data.puantajList);
                }

                if (data.userList && Array.isArray(data.userList)) {
                    this.dataManager.userList = data.userList;
                    this.dataManager.saveData('userList', data.userList);
                }

                alert('Veriler başarıyla geri yüklendi! Sayfa yenileniyor...');
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert('Hata: Geçersiz yedek dosyası!');
            }
        };
        reader.readAsText(file);
    }

    // ===== Modal Functions =====
    closePersonelModal() {
        document.getElementById('personelModal').classList.remove('active');
    }

    closePuantajModal() {
        document.getElementById('puantajModal').classList.remove('active');
    }
}

// ===== Global Modal Functions (for onclick handlers in HTML) =====
function closePersonelModal() {
    if (window.app) {
        window.app.closePersonelModal();
    }
}

function closePuantajModal() {
    if (window.app) {
        window.app.closePuantajModal();
    }
}

// ===== Initialize App =====
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app; // Make globally accessible

    // Explicitly bind the auth methods to window.app for HTML inline calls if needed,
    // though the class instance 'app' is already global. 
    // Just ensuring no scope issues.
});


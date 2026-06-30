// Database engine using localStorage & Google Sheets for AIKON

// Paste your Google Apps Script Web App Deployment URL here to connect to Google Sheets
// Example: const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycb.../exec";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzLHeXIo6sg-QcLp6U9bxfdZ7aQTGSz-Y5TE0b8Ve2FzQ2M33XQFkfEj00wCzW-aktI/exec";

const DEFAULT_DATABASE = {
    sop: [
        { id: 1, judul: "SOP Pendaftaran Peserta JKN Mandiri Baru", unit: "Kepesertaan & Pelayanan", deskripsi: "Panduan alur administrasi dan syarat administrasi pendaftaran peserta pekerja bukan penerima upah (PBPU).", tanggal: "2026-01-15", link: "https://drive.google.com/drive/folders/mock-sop-1" },
        { id: 2, judul: "SOP Klaim Rawat Inap Tingkat Lanjut (RITL)", unit: "Manajemen Klaim (Jaminan)", deskripsi: "Tatacara verifikasi berkas klaim RITL rumah sakit provider BPJS Kesehatan.", tanggal: "2026-02-10", link: "https://drive.google.com/drive/folders/mock-sop-2" },
        { id: 3, judul: "SOP Pelayanan Pengaduan di Front Office Kantor Cabang", unit: "Front Office (FO)", deskripsi: "Standard response time dan penanganan keluhan langsung peserta BPJS.", tanggal: "2026-03-01", link: "https://drive.google.com/drive/folders/mock-sop-3" },
        { id: 4, judul: "SOP Kredensialing Faskes Tingkat Pertama (FKTP)", unit: "Kepesertaan & Pelayanan", deskripsi: "Prosedur penilaian kelayakan sarana prasarana klinik dan dokter keluarga baru.", tanggal: "2026-04-18", link: "https://drive.google.com/drive/folders/mock-sop-4" }
    ],
    regulasi: [
        { id: 1, nomor: "Perpres No. 59 Tahun 2024", tentang: "Perubahan Ketiga atas Perpres No. 82 Tahun 2018 tentang Jaminan Kesehatan", tanggal: "2024-05-08", status: "Aktif", link: "https://drive.google.com/drive/folders/mock-reg-1" },
        { id: 2, nomor: "Permenkes No. 3 Tahun 2023", tentang: "Standar Tarif Pelayanan Kesehatan dalam Penyelenggaraan Program Jaminan Kesehatan", tanggal: "2023-01-09", status: "Aktif", link: "https://drive.google.com/drive/folders/mock-reg-2" },
        { id: 3, nomor: "Perdirjohan BPJS No. 2 Tahun 2024", tentang: "Petunjuk Teknis Verifikasi Klaim Berbasis Luaran Klinis", tanggal: "2024-03-12", status: "Aktif", link: "https://drive.google.com/drive/folders/mock-reg-3" }
    ],
    panduan: [
        { id: 1, judul: "Panduan Teknis Bridging SIMRS V2 BPJS", modul: "Aplikasi Internal", deskripsi: "Langkah integrasi sistem SIMRS dengan vclaim api versi terbaru.", link: "https://drive.google.com/drive/folders/mock-guide-1" },
        { id: 2, judul: "Buku Saku Penanganan Fraud Program JKN", modul: "Kepatuhan Internal", deskripsi: "Panduan deteksi dini fraud klaim oleh faskes maupun oknum internal.", link: "https://drive.google.com/drive/folders/mock-guide-2" }
    ],
    dokumen: [
        { id: 1, nama: "Formulir Rekonsiliasi Iuran Badan Usaha JKN", tipe: "Microsoft Excel (.xlsx)", tanggal: "2026-05-20", link: "https://drive.google.com/drive/folders/mock-doc-1" },
        { id: 2, nama: "Form Pengajuan Kredensialing FKTP Baru", tipe: "PDF Dokumentasi", tanggal: "2026-05-18", link: "https://drive.google.com/drive/folders/mock-doc-2" },
        { id: 3, nama: "Template Surat Kuasa Pembuatan Kartu PBI", tipe: "Microsoft Word (.docx)", tanggal: "2026-05-22", link: "https://drive.google.com/drive/folders/mock-doc-3" }
    ],
    faq: [
        { id: 1, pertanyaan: "Bagaimana jika kartu JKN KIS hilang?", jawaban: "Peserta dapat mencetak kartu digital KIS melalui aplikasi Mobile JKN tanpa biaya administrasi." },
        { id: 2, pertanyaan: "Berapa lama batas waktu pengajuan klaim rumah sakit?", jawaban: "Batas pengajuan klaim rumah sakit adalah tanggal 10 bulan berikutnya setelah bulan pelayanan." },
        { id: 3, pertanyaan: "Apakah bayi baru lahir wajib langsung didaftarkan?", jawaban: "Ya, bayi dari peserta JKN wajib didaftarkan maksimal 28 hari sejak kelahiran untuk menjamin coverage." }
    ],
    users: [
        { id: 1, npp: "12345", nama: "Budi Santoso", unit: "Kepesertaan & Pelayanan", status: "Aktif" },
        { id: 2, npp: "98321", nama: "Siti Rahmawati", unit: "Front Office (FO)", status: "Aktif" },
        { id: 3, npp: "kcternate2503", nama: "Admin KC Ternate", unit: "TI & Dukungan Operasional", status: "Aktif" }
    ]
};

// Initialize Local DB if empty
if (!localStorage.getItem('aikon_database')) {
    localStorage.setItem('aikon_database', JSON.stringify(DEFAULT_DATABASE));
}

// Main DB Controller
window.AikonDB = {
    get: function () {
        return JSON.parse(localStorage.getItem('aikon_database')) || DEFAULT_DATABASE;
    },
    save: function (db) {
        localStorage.setItem('aikon_database', JSON.stringify(db));
        window.dispatchEvent(new Event('aikon_db_changed'));

        // Push update to Google Sheets if configured
        if (GOOGLE_SHEET_URL) {
            this.syncToCloud();
        }
    },
    getTable: function (table) {
        return this.get()[table] || [];
    },
    addRow: function (table, data) {
        const db = this.get();
        if (!db[table]) db[table] = [];
        data.id = db[table].length > 0 ? Math.max(...db[table].map(item => item.id || 0)) + 1 : 1;
        db[table].push(data);
        this.save(db);
        return data;
    },
    updateRow: function (table, index, data) {
        const db = this.get();
        if (db[table] && db[table][index]) {
            const originalId = db[table][index].id;
            db[table][index] = { ...data, id: originalId };
            this.save(db);
            return true;
        }
        return false;
    },
    deleteRow: function (table, index) {
        const db = this.get();
        if (db[table] && db[table][index] !== undefined) {
            db[table].splice(index, 1);
            this.save(db);
            return true;
        }
        return false;
    },

    // Sync Local Database to Google Sheet Web App
    syncToCloud: function () {
        const db = this.get();
        const tables = ['sop', 'regulasi', 'panduan', 'dokumen', 'faq', 'users'];
        const schemas = {
            sop: ['id', 'judul', 'unit', 'deskripsi', 'tanggal', 'link'],
            regulasi: ['id', 'nomor', 'tentang', 'tanggal', 'status', 'link'],
            panduan: ['id', 'judul', 'modul', 'deskripsi', 'link'],
            dokumen: ['id', 'nama', 'tipe', 'tanggal', 'link'],
            faq: ['id', 'pertanyaan', 'jawaban'],
            users: ['id', 'npp', 'nama', 'unit', 'status']
        };

        tables.forEach(table => {
            fetch(GOOGLE_SHEET_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify({
                    action: 'sync',
                    table: table,
                    headers: schemas[table],
                    rows: db[table]
                })
            })
                .then(() => console.log(`Synced table ${table} to Google Sheets.`))
                .catch(err => console.error('Failed to sync to Google Sheets:', err));
        });
    },

    // Fetch and sync local storage from Google Sheets on page load
    fetchFromCloud: function () {
        if (!GOOGLE_SHEET_URL) return;

        fetch(GOOGLE_SHEET_URL)
            .then(res => res.json())
            .then(data => {
                if (data && typeof data === 'object') {
                    // Save cloud data into local storage database
                    localStorage.setItem('aikon_database', JSON.stringify(data));
                    window.dispatchEvent(new Event('aikon_db_changed'));
                    console.log('Successfully fetched and synchronized database from Google Sheets!');
                }
            })
            .catch(err => console.error('Error fetching database from Google Sheets:', err));
    }
};

// Initial Cloud Fetch on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.AikonDB.fetchFromCloud();
});

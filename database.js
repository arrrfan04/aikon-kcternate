// Database engine using localStorage & Google Sheets for AIKON

// Paste your Google Apps Script Web App Deployment URL here to connect to Google Sheets
// Example: const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycb.../exec";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzLHeXIo6sg-QcLp6U9bxfdZ7aQTGSz-Y5TE0b8Ve2FzQ2M33XQFkfEj00wCzW-aktI/exec";

const DEFAULT_DATABASE = {
    sop: [
        { id: 1, kode: "SOP-KP-01", judul: "SOP Pendaftaran Peserta JKN Mandiri Baru", kategori: "Administrasi Kepesertaan", deskripsi: "Panduan alur administrasi dan syarat administrasi pendaftaran peserta pekerja bukan penerima upah (PBPU).", tanggal: "2026-01-15", link: "https://drive.google.com/drive/folders/mock-sop-1" },
        { id: 2, kode: "SOP-KL-02", judul: "SOP Klaim Rawat Inap Tingkat Lanjut (RITL)", kategori: "Verifikasi Klaim", deskripsi: "Tatacara verifikasi berkas klaim RITL rumah sakit provider BPJS Kesehatan.", tanggal: "2026-02-10", link: "https://drive.google.com/drive/folders/mock-sop-2" },
        { id: 3, kode: "SOP-FO-03", judul: "SOP Pelayanan Pengaduan di Front Office Kantor Cabang", kategori: "Pelayanan FKTP", deskripsi: "Standard response time dan penanganan keluhan langsung peserta BPJS.", tanggal: "2026-03-01", link: "https://drive.google.com/drive/folders/mock-sop-3" },
        { id: 4, kode: "SOP-KP-04", judul: "SOP Kredensialing Faskes Tingkat Pertama (FKTP)", kategori: "Pelayanan FKTP", deskripsi: "Prosedur penilaian kelayakan sarana prasarana klinik dan dokter keluarga baru.", tanggal: "2026-04-18", link: "https://drive.google.com/drive/folders/mock-sop-4" }
    ],
    regulasi: [
        { id: 1, nomor: "Perpres No. 59 Tahun 2024", tentang: "Perubahan Ketiga atas Perpres No. 82 Tahun 2018 tentang Jaminan Kesehatan", jenis: "Undang-Undang / Perpres", tanggal: "2024-05-08", masa_berlaku: "2029-12-31", link: "https://drive.google.com/drive/folders/mock-reg-1", ringkasan: "Mengatur tentang perbaikan sistem jaminan kesehatan nasional di tingkat primer." },
        { id: 2, nomor: "Permenkes No. 3 Tahun 2023", tentang: "Standar Tarif Pelayanan Kesehatan dalam Penyelenggaraan Program Jaminan Kesehatan", jenis: "Undang-Undang / Perpres", tanggal: "2023-01-09", masa_berlaku: "2028-12-31", link: "https://drive.google.com/drive/folders/mock-reg-2", ringkasan: "Pemberlakuan tarif kapitasi dan non kapitasi terbaru bagi faskes tingkat pertama." },
        { id: 3, nomor: "Perdir BPJS No. 2 Tahun 2024", tentang: "Petunjuk Teknis Verifikasi Klaim Berbasis Luaran Klinis", jenis: "Peraturan Direksi BPJS", tanggal: "2024-03-12", masa_berlaku: "2027-03-12", link: "https://drive.google.com/drive/folders/mock-reg-3", ringkasan: "Ketentuan verifikasi klaim klinis berdasarkan luaran medis pasien." }
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
        { id: 1, nama: "Budi Santoso", npp: "12345", unit: "Bagian Kepesertaan", password: "12345", status: "Aktif" },
        { id: 2, nama: "Siti Rahmawati", npp: "98321", unit: "Bagian Pelayanan Peserta", password: "98321", status: "Aktif" },
        { id: 3, nama: "Admin KC Ternate", npp: "kcternate2503", unit: "Bagian SDMUK", password: "adminkcternate123", status: "Aktif" }
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
            sop: ['id', 'kode', 'judul', 'kategori', 'tanggal', 'link', 'deskripsi'],
            regulasi: ['id', 'nomor', 'tentang', 'jenis', 'tanggal', 'masa_berlaku', 'link', 'ringkasan'],
            panduan: ['id', 'judul', 'modul', 'deskripsi', 'link'],
            dokumen: ['id', 'nama', 'tipe', 'tanggal', 'link'],
            faq: ['id', 'pertanyaan', 'jawaban'],
            users: ['id', 'nama', 'npp', 'unit', 'password', 'status']
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
                    // Merge cloud data with existing local database to prevent wiping out tables not in the cloud
                    const localDb = window.AikonDB.get();
                    const mergedDb = { ...localDb };
                    
                    Object.keys(data).forEach(table => {
                        if (Array.isArray(data[table])) {
                            mergedDb[table] = data[table];
                        }
                    });

                    localStorage.setItem('aikon_database', JSON.stringify(mergedDb));
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

// Helper function to trigger direct file download
window.downloadFile = function (url, filename) {
    if (!url || url === '#' || url.trim() === '') return;

    // Check if it's a Google Drive file link (not folders)
    const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
        const fileId = driveFileMatch[1];
        window.location.href = `https://docs.google.com/uc?export=download&id=${fileId}`;
        return;
    }

    // Check if it's a Google Docs document link
    const docFileMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docFileMatch) {
        const fileId = docFileMatch[1];
        window.location.href = `https://docs.google.com/document/d/${fileId}/export?format=docx`;
        return;
    }

    // Check if it's a Google Sheets link
    const sheetFileMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetFileMatch) {
        const fileId = sheetFileMatch[1];
        window.location.href = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
        return;
    }

    // Check if it's a Google Slides link
    const slideFileMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slideFileMatch) {
        const fileId = slideFileMatch[1];
        window.location.href = `https://docs.google.com/presentation/d/${fileId}/export/pdf`;
        return;
    }

    // Try fetching same-origin or CORS-enabled files to force local download
    const isGoogle = url.includes('drive.google.com') || url.includes('docs.google.com');
    if (!isGoogle && (url.startsWith('http') || url.startsWith('/') || url.startsWith('.') || url.startsWith('assets/'))) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.blob();
            })
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename || url.substring(url.lastIndexOf('/') + 1) || 'unduh_dokumen';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(() => {
                // Fallback for CORS: Open in a new tab with download attribute
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'unduh_dokumen';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
    } else {
        // External non-fetchable links (like Google Drive folder links)
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'unduh_dokumen';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

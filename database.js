// Database engine using localStorage & Google Sheets for AIKON

// Paste your Google Apps Script Web App Deployment URL here to connect to Google Sheets
// Example: const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycb.../exec";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyT92rCmLFZ28skXle4wYv_MULIpkgAcMA-1qtGd70AAaCpP7b3visWVsC1FE8384DW/exec";


const DEFAULT_DATABASE = {
    regulasi: [],
    panduan: [],
    faq: [],
    users: [],
    activities: [],
    onboarding: [],
    feedback: []
};

// Initialize Local DB if empty or outdated (missing link properties or onboarding)
let shouldResetDb = false;
try {
    const existingDb = localStorage.getItem('aikon_database');
    if (!existingDb) {
        shouldResetDb = true;
    } else {
        const parsed = JSON.parse(existingDb);
        if (!parsed.onboarding || !parsed.activities) {
            shouldResetDb = true;
        }
    }
} catch (e) {
    shouldResetDb = true;
}

if (shouldResetDb) {
    console.log('Outdated database schema detected, resetting to DEFAULT_DATABASE...');
    localStorage.setItem('aikon_database', JSON.stringify(DEFAULT_DATABASE));
}

// Main DB Controller
window.AikonDB = {
    _hasFetchedFromCloud: false,
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

    addActivity: function (action, title, desc, type) {
        const db = this.get();
        if (!db.activities) db.activities = [];
        const id = db.activities.length > 0 ? Math.max(...db.activities.map(item => item.id || 0)) + 1 : 1;
        
        const now = new Date();
        const timeString = now.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        const newActivity = {
            id: id,
            action: action,
            title: title,
            desc: desc,
            time: timeString,
            type: type
        };
        db.activities.unshift(newActivity);
        
        // Membatasi maksimal 10 log aktivitas
        while (db.activities.length > 10) {
            db.activities.pop();
        }
        this.save(db);
    },

    // Sync Local Database to Google Sheet Web App
    syncToCloud: function () {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        
        if (!this._hasFetchedFromCloud) {
            console.warn("Sync to cloud dibatalkan: Data belum di-fetch dari cloud. Mencegah overwrite data kosong.");
            return;
        }
        
        this._syncTimeout = setTimeout(() => {
            const db = this.get();
            const tables = ['regulasi', 'panduan', 'faq', 'users', 'activities', 'onboarding', 'feedback'];
            const schemas = {
                regulasi: ['id', 'nomor', 'tentang', 'jenis', 'tanggal', 'masa_berlaku', 'link', 'ringkasan'],
                panduan: ['id', 'judul', 'modul', 'deskripsi', 'link'],
                faq: ['id', 'pertanyaan', 'jawaban'],
                users: ['id', 'nama', 'npp', 'unit', 'password', 'status'],
                activities: ['id', 'action', 'title', 'desc', 'time', 'type'],
                onboarding: ['id', 'title', 'content'],
                feedback: ['id', 'user_npp', 'user_name', 'query', 'feedback_type', 'komentar', 'tanggal']
            };

            tables.forEach(table => {
                fetch(GOOGLE_SHEET_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify({
                        action: 'sync',
                        table: table,
                        headers: schemas[table],
                        rows: db[table] || []
                    })
                })
                    .then(() => console.log(`Synced table ${table} to Google Sheets.`))
                    .catch(err => console.error('Failed to sync to Google Sheets:', err));
            });
        }, 1000);
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
                    window.AikonDB._hasFetchedFromCloud = true;
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

// Global smart chatbot answering function for AIKON
window.aikonChatRespond = function(query) {
    const q = query.toLowerCase().trim();
    
    // 1. Smart Greetings Handling
    if (q.match(/^(halo|hai|hello|selamat pagi|selamat siang|selamat sore|selamat malam|assalamualaikum)/)) {
        return `Halo! Saya adalah <strong>AIKON Smart Assistant</strong> 🤖. Saya siap membantu Anda mencari dokumen rujukan, SOP, regulasi, dan informasi penting secara cepat.<br><br>
        Anda dapat menanyakan hal-hal seperti:<br>
        • <em>"SOP bayi baru lahir"</em><br>
        • <em>"Regulasi tarif kapitasi"</em><br>
        • <em>"Panduan aplikasi VClaim"</em><br>
        • <em>"Update terbaru bulan ini"</em><br><br>
        Ada yang bisa saya bantu hari ini?`;
    }

    // 2. Smart Contacts/Help Desk Handling
    if (q.includes('kontak') || q.includes('telepon') || q.includes('alamat') || q.includes('kantor') || q.includes('bantuan') || q.includes('hubung') || q.includes('call center')) {
        return `Berikut adalah informasi <strong>Pusat Bantuan & Kantor Cabang Ternate</strong>:<br><br>
        📞 <strong>Telepon Kantor Cabang:</strong> 021165 (Fast Response)<br>
        📍 <strong>Alamat Kantor:</strong> Jl. Cempaka, Maliaro, Kec. Ternate Tengah, Kota Ternate, Maluku Utara<br><br>
        Anda juga dapat membaca buku panduan penggunaan aplikasi secara detail di halaman <a href="bantuan.html" style="color:var(--primary-blue); font-weight:600;">Bantuan</a>.`;
    }

    // 3. Smart Onboarding Status Checker
    if (q.includes('onboarding') || q.includes('modul') || q.includes('kuis') || q.includes('selesai') || q.includes('tahap') || q.includes('progres belajar')) {
        const currentUser = JSON.parse(localStorage.getItem('aikon_current_user')) || { npp: '12345', nama: 'Pegawai' };
        const userProgressKey = 'aikon_onboarding_progress_' + currentUser.npp;
        const progress = JSON.parse(localStorage.getItem(userProgressKey)) || { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
        const completed = Object.values(progress).filter(Boolean).length;
        const percent = Math.round((completed / 6) * 100);
        
        return `Status program <strong>Onboarding</strong> Anda saat ini, Yth. <strong>${currentUser.nama}</strong>:<br><br>
        📊 <strong>Progres Penyelesaian:</strong> ${percent}% (${completed} dari 6 modul selesai)<br><br>
        Silakan pelajari seluruh modul panduan dan kuis evaluasi secara berurutan di menu <a href="onboarding.html" style="color:var(--primary-blue); font-weight:600;">Onboarding</a> untuk meningkatkan progres adaptasi Anda.`;
    }

    let category = '';
    let categoryName = '';
    
    if (q.includes('regulasi') || q.includes('peraturan') || q.includes('perpres') || q.includes('kebijakan') || q.includes('undang')) {
        category = 'regulasi';
        categoryName = 'Regulasi';
    } else if (q.includes('panduan') || q.includes('juknis') || q.includes('petunjuk') || q.includes('modul')) {
        category = 'panduan';
        categoryName = 'DJP/Panduan Kerja';
    } else if (q.includes('faq') || q.includes('tanya') || q.includes('bagaimana') || q.includes('apakah') || q.includes('mengapa') || q.includes('kenapa') || q.includes('berapa')) {
        category = 'faq';
        categoryName = 'FAQ';
    } else if (q.includes('update') || q.includes('terbaru') || q.includes('notifikasi') || q.includes('kabar') || q.includes('info baru')) {
        category = 'update';
        categoryName = 'Update & Notifikasi';
    }

    const db = window.AikonDB.get();

    // Specific category handling for update/latest updates
    if (category === 'update') {
        const regulasiItems = db.regulasi.map(item => ({
            type: 'Regulasi',
            title: item.nomor,
            desc: item.tentang,
            date: item.tanggal,
            link: item.link || '#'
        }));
        const sopItems = db.sop.map(item => ({
            type: 'SOP',
            title: item.judul,
            desc: item.deskripsi,
            date: item.tanggal,
            link: item.link || '#'
        }));
        const allUpdates = [...regulasiItems, ...sopItems].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (allUpdates.length === 0) {
            return `Belum ada update atau notifikasi terbaru saat ini di halaman Update.`;
        }
        
        let responseHtml = `Berikut adalah <strong>Update & Notifikasi Terbaru</strong> dari sistem:<br><br>`;
        allUpdates.slice(0, 3).forEach((item, index) => {
            responseHtml += `${index + 1}. <strong>[${item.type}] ${item.title}</strong><br>`;
            responseHtml += `<em>${item.desc}</em> (${item.date})<br>`;
            if (item.link && item.link !== '#') {
                responseHtml += `<a href="${item.link}" target="_blank" style="color:var(--primary-blue); font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px; margin-bottom:8px; font-weight:600;"><i data-lucide="external-link" style="width:14px; height:14px; vertical-align:middle;"></i> Lihat Dokumen</a> `;
                responseHtml += `<a href="#" onclick="event.preventDefault(); downloadFile('${item.link}', '${item.title.replace(/'/g, "\\'")}')" style="color:var(--success-green); font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px; margin-bottom:8px; font-weight:600;"><i data-lucide="download" style="width:14px; height:14px; vertical-align:middle;"></i> Unduh Dokumen</a><br>`;
            } else {
                responseHtml += `<br>`;
            }
        });
        responseHtml += `Pantau seluruh pembaruan resmi di halaman <a href="update.html" style="color:var(--primary-blue); font-weight:600;">Update</a>.`;
        return responseHtml;
    }

    // 4. Tokenization & Scoring Matching Algorithm
    const stopwords = new Set([
        'dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'pada', 'adalah', 'dengan', 
        'saya', 'tanya', 'bagaimana', 'apakah', 'menurut', 'dokumen', 'surat', 
        'file', 'tentang', 'apa', 'siapa', 'mengapa', 'kenapa', 'bagaimanakah', 
        'ini', 'itu', 'atau', 'ada', 'bisa', 'dapat', 'ingin', 'mau', 'tolong', 
        'carikan', 'tampilkan', 'info', 'informasi', 'sistem', 'aplikasi'
    ]);
    
    const tokens = q.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(w => w.length > 1 && !stopwords.has(w));
    const scoredResults = [];

    const scoreItem = (title, desc, type, extra = '', link = '#') => {
        let score = 0;
        const lowerTitle = (title || '').toLowerCase();
        const lowerDesc = (desc || '').toLowerCase();
        const lowerExtra = (extra || '').toLowerCase();

        // Exact match boosts
        if (lowerTitle.includes(q)) score += 50;
        if (lowerDesc.includes(q)) score += 20;

        // Token match scoring
        tokens.forEach(token => {
            if (lowerTitle.includes(token)) score += 15;
            if (lowerDesc.includes(token)) score += 5;
            if (lowerExtra.includes(token)) score += 5;
        });

        // Category matching weight
        if (category && type.toLowerCase().includes(category)) {
            score += 10;
        }

        if (score > 0) {
            scoredResults.push({ score, type, title, desc, link });
        }
    };

    // Calculate scores for all entries
    db.sop.forEach(item => {
        scoreItem(item.judul, item.deskripsi || '', 'SOP', item.kode + ' ' + (item.kategori || item.unit), item.link);
    });
    db.regulasi.forEach(item => {
        scoreItem(item.nomor, item.tentang + '. ' + (item.ringkasan || ''), 'Regulasi', item.jenis, item.link);
    });
    db.panduan.forEach(item => {
        scoreItem(item.judul, item.deskripsi || '', 'Panduan', item.modul, item.link);
    });
    db.dokumen.forEach(item => {
        scoreItem(item.nama, 'Tipe berkas: ' + item.tipe, 'Dokumen', '', item.link);
    });
    db.faq.forEach(item => {
        scoreItem(item.pertanyaan, item.jawaban, 'FAQ', '', '#');
    });

    // Sort results by relevance score descending
    scoredResults.sort((a, b) => b.score - a.score);

    if (scoredResults.length > 0) {
        const topResult = scoredResults[0];
        let responseHtml = '';

        if (topResult.score >= 50) {
            responseHtml += `Saya menemukan hasil yang sangat relevan dengan pertanyaan Anda:<br><br>`;
            if (topResult.type === 'FAQ') {
                responseHtml += `<strong>Pertanyaan:</strong> ${topResult.title}<br><strong>Jawaban:</strong> ${topResult.desc}`;
            } else {
                responseHtml += `<strong>[${topResult.type}] ${topResult.title}</strong><br>${topResult.desc}<br><br>`;
                if (topResult.link && topResult.link !== '#') {
                    responseHtml += `<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">`;
                    responseHtml += `<a href="${topResult.link}" target="_blank" style="background:var(--primary-blue); color:white; padding:6px 12px; border-radius:6px; font-size:12px; display:inline-flex; align-items:center; gap:6px; font-weight:600; text-decoration:none;"><i data-lucide="external-link" style="width:14px; height:14px; vertical-align:middle;"></i> Lihat Dokumen</a>`;
                    responseHtml += `<a href="#" onclick="event.preventDefault(); downloadFile('${topResult.link}', '${topResult.title.replace(/'/g, "\\'")}')" style="background:var(--success-green); color:white; padding:6px 12px; border-radius:6px; font-size:12px; display:inline-flex; align-items:center; gap:6px; font-weight:600; text-decoration:none;"><i data-lucide="download" style="width:14px; height:14px; vertical-align:middle;"></i> Unduh Dokumen</a>`;
                    responseHtml += `</div>`;
                }
            }

            if (scoredResults.length > 1) {
                responseHtml += `<br><br><hr style="border:none; border-top:1px solid #E2E8F0; margin:16px 0;"><span style="font-size:12px; color:var(--text-muted); font-weight:600;">Dokumen/Informasi terkait lainnya:</span><br><br>`;
                scoredResults.slice(1, 3).forEach((res, index) => {
                    responseHtml += `${index + 1}. <strong>[${res.type}] ${res.title}</strong> `;
                    if (res.link && res.link !== '#') {
                        responseHtml += `<a href="${res.link}" target="_blank" style="color:var(--primary-blue); font-size:11px; text-decoration:none; font-weight:600;">[Lihat <i data-lucide="external-link" style="width:11px; height:11px; vertical-align:middle; display:inline-block;"></i>]</a> `;
                        responseHtml += `<a href="#" onclick="event.preventDefault(); downloadFile('${res.link}', '${res.title.replace(/'/g, "\\'")}')" style="color:var(--success-green); font-size:11px; text-decoration:none; font-weight:600;">[Unduh <i data-lucide="download" style="width:11px; height:11px; vertical-align:middle; display:inline-block;"></i>]</a>`;
                    }
                    responseHtml += `<br><span style="font-size:11px; color:var(--text-muted);">${res.desc.slice(0, 80)}...</span><br><br>`;
                });
            }
        } else {
            responseHtml += `Berikut beberapa rujukan informasi yang relevan dengan pencarian Anda:<br><br>`;
            scoredResults.slice(0, 3).forEach((res, index) => {
                responseHtml += `${index + 1}. <strong>[${res.type}] ${res.title}</strong><br>`;
                responseHtml += `<span style="font-size:12px; color:var(--text-muted);">${res.desc}</span><br>`;
                if (res.link && res.link !== '#') {
                    responseHtml += `<a href="${res.link}" target="_blank" style="color:var(--primary-blue); font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:2px; font-weight:600; margin-top:4px; margin-bottom:8px;"><i data-lucide="external-link" style="width:12px; height:12px; vertical-align:middle;"></i> Lihat Dokumen</a> `;
                    responseHtml += `<a href="#" onclick="event.preventDefault(); downloadFile('${res.link}', '${res.title.replace(/'/g, "\\'")}')" style="color:var(--success-green); font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:2px; font-weight:600; margin-top:4px; margin-bottom:8px;"><i data-lucide="download" style="width:12px; height:12px; vertical-align:middle;"></i> Unduh Dokumen</a><br>`;
                } else {
                    responseHtml += `<br>`;
                }
            });
        }
        return responseHtml;
    } else {
        return `Maaf, saya tidak menemukan dokumen atau jawaban yang cocok untuk pencarian: "${query}".<br><br>
        💡 <strong>Tips Pencarian AIKON:</strong><br>
        • Gunakan kata kunci inti yang lebih spesifik (contoh: "tarif", "klaim bayi", "onboarding", "alamat").<br>
        • Buka menu <a href="knowledge-base.html" style="color:var(--primary-blue); font-weight:600;">Knowledge Base</a> untuk melihat daftar lengkap dokumen.<br>
        • Kunjungi halaman <a href="bantuan.html" style="color:var(--primary-blue); font-weight:600;">Bantuan</a> jika memerlukan kontak person.`;
    }
};

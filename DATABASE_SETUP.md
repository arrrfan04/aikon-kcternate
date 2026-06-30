# Panduan Setup Database Google Sheets - AIKON

Ikuti langkah-langkah di bawah ini untuk menghubungkan website AIKON dengan spreadsheet Google Sheets Anda secara gratis dan instan menggunakan Google Apps Script.

---

## Langkah 1: Buat Google Sheet
1. Buka [Google Sheets](https://sheets.new).
2. Ubah judul dokumen menjadi `AIKON Database`.
3. Buat **6 sheet (tab)** di bagian bawah dengan nama persis seperti berikut:
   - `sop`
   - `regulasi`
   - `panduan`
   - `dokumen`
   - `faq`
   - `users`
4. Di baris pertama (Header) setiap sheet, isi kolom-kolomnya sesuai tabel berikut:

| Nama Sheet | Kolom A | Kolom B | Kolom C | Kolom D | Kolom E | Kolom F |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **sop** | `id` | `judul` | `unit` | `deskripsi` | `tanggal` | `link` |
| **regulasi** | `id` | `nomor` | `tentang` | `tanggal` | `status` | `link` |
| **panduan** | `id` | `judul` | `modul` | `deskripsi` | `link` | |
| **dokumen** | `id` | `nama` | `tipe` | `tanggal` | `link` | |
| **faq** | `id` | `pertanyaan` | `jawaban` | | | |
| **users** | `id` | `npp` | `nama` | `unit` | `status` | |

---

## Langkah 2: Deploy Google Apps Script
1. Pada Google Sheet Anda, klik menu **Extensions** > **Apps Script**.
2. Hapus kode default di editor, lalu paste kode JavaScript berikut:

```javascript
function doGet(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  var data = {};
  
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var sheetData = [];
    
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      headers.forEach(function(header, idx) {
        record[header] = row[idx];
      });
      sheetData.push(record);
    }
    data[name] = sheetData;
  });
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var params = JSON.parse(e.postData.contents);
  var action = params.action; // 'add', 'delete', 'sync'
  var tableName = params.table;
  var sheet = spreadsheet.getSheetByName(tableName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Sheet not found'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'sync') {
    // Overwrite sheet with full data
    sheet.clearContents();
    var headers = params.headers;
    sheet.appendRow(headers);
    
    var rows = params.rows;
    rows.forEach(function(row) {
      var newRow = headers.map(function(h) { return row[h] || ''; });
      sheet.appendRow(newRow);
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Unknown action'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Klik tombol **Save** (icon disket).
4. Klik tombol **Deploy** di kanan atas > **New deployment**.
5. Pilih type **Web app** (klik icon gear).
6. Konfigurasi:
   - **Description**: `AIKON Web App API`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` (Penting agar web dapat mengakses tanpa login akun Google).
7. Klik **Deploy** dan setujui izin akses akun Google Anda jika diminta.
8. Salin **Web app URL** yang diberikan (biasanya diawali dengan `https://script.google.com/macros/s/.../exec`).

---

## Langkah 3: Hubungkan ke Website
1. Buka file `database.js` pada project web AIKON Anda.
2. Temukan baris berikut di paling atas:
   ```javascript
   const GOOGLE_SHEET_URL = "";
   ```
3. Tempelkan URL Apps Script yang Anda salin tadi di dalam tanda kutip:
   ```javascript
   const GOOGLE_SHEET_URL = "URL_DEPLOYMENT_ANDA_DI_SINI";
   ```
4. Simpan file `database.js`. Website Anda sekarang terhubung langsung dan menggunakan Google Sheets sebagai database utama!

/**
 * ============================================================
 * LEADS WHATSAPP TRACKER — Google Apps Script Backend
 * ============================================================
 *
 * CARA PASANG:
 * 1. Buka Google Sheets yang berisi data leads (pastikan ada kolom nomor telepon).
 * 2. Menu Extensions > Apps Script.
 * 3. Hapus isi Code.gs bawaan, tempel seluruh kode ini.
 * 4. Klik Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL deployment, masukkan ke .env.local:
 *    NEXT_PUBLIC_LEADS_SHEET_API="https://script.google.com/macros/s/.../exec"
 * 6. Jalankan fungsi seedInitialChatted() sekali:
 *    - Pilih fungsi seedInitialChatted di dropdown atas editor
 *    - Klik tombol Run (▶)
 *    - Authorize jika diminta
 * ============================================================
 */

function normalizePhone_(raw) {
  if (!raw) return '';
  var digits = raw.toString().replace(/\D/g, '');
  if (digits.length < 5) return '';
  if (digits.indexOf('0') === 0) digits = '62' + digits.substring(1);
  else if (digits.indexOf('8') === 0) digits = '62' + digits;
  else if (digits.indexOf('620') === 0) digits = '62' + digits.substring(3);
  return digits;
}

function ensureColumns_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var statusCol = -1;
  var chattedCol = -1;

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim();
    if (h === 'Status_Chat') statusCol = i + 1;
    if (h === 'Chatted_At') chattedCol = i + 1;
  }

  var nextCol = sheet.getLastColumn() + 1;

  if (statusCol === -1) {
    statusCol = nextCol;
    sheet.getRange(1, statusCol).setValue('Status_Chat');
    nextCol++;
  }
  if (chattedCol === -1) {
    chattedCol = nextCol;
    sheet.getRange(1, chattedCol).setValue('Chatted_At');
  }

  return { statusCol: statusCol, chattedCol: chattedCol };
}

function findPhoneColumn_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var candidates = [
    'nomor_wa', 'nomor wa', 'phone', 'telepon', 'no_hp', 'no hp',
    'whatsapp', 'no_telp', 'nomor_standar', 'nomor', 'hp', 'no telp',
    'nationalPhoneNumber', 'internationalPhoneNumber'
  ];

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim().toLowerCase();
    for (var j = 0; j < candidates.length; j++) {
      if (h === candidates[j]) return i + 1;
    }
  }

  for (var k = 0; k < headers.length; k++) {
    var h2 = headers[k].toString().trim().toLowerCase();
    if (h2.indexOf('phone') !== -1 || h2.indexOf('nomor') !== -1 || h2.indexOf('hp') !== -1 || h2.indexOf('wa') !== -1) {
      return k + 1;
    }
  }

  return 1;
}

function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server busy, coba lagi.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var cols = ensureColumns_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var phoneCol = findPhoneColumn_();
    var chatted = [];

    if (lastRow > 1) {
      var statusValues = sheet.getRange(2, cols.statusCol, lastRow - 1, 1).getValues();
      var phoneValues = sheet.getRange(2, phoneCol, lastRow - 1, 1).getValues();

      for (var i = 0; i < statusValues.length; i++) {
        var st = statusValues[i][0].toString().trim();
        if (st === 'Sudah') {
          var norm = normalizePhone_(phoneValues[i][0]);
          if (norm) chatted.push(norm);
        }
      }
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      chatted: chatted
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server busy, coba lagi.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var body = JSON.parse(e.postData ? e.postData.contents : '{}');
    var rawPhone = body.phone || '';
    var targetNorm = normalizePhone_(rawPhone);

    if (!targetNorm) {
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Nomor telepon tidak valid.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var cols = ensureColumns_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var phoneCol = findPhoneColumn_();
    var found = false;

    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, phoneCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < phoneValues.length; i++) {
        var norm = normalizePhone_(phoneValues[i][0]);
        if (norm === targetNorm) {
          var row = i + 2;
          sheet.getRange(row, cols.statusCol).setValue('Sudah');
          sheet.getRange(row, cols.chattedCol).setValue(new Date().toISOString());
          found = true;
          break;
        }
      }
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      found: found,
      phone: targetNorm
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function seedInitialChatted() {
  var SEED_NUMBERS = [
    '085119302628', '081259528818', '085100031911', '085161262561',
    '085722552212', '08112109991',  '081321307311', '085891385526',
    '085878026341', '085965982678', '08992280007',  '085875109098',
    '081215951695', '0895384195060','08157938155',  '0895327003456',
    '081130006789', '081255277785', '082244681797', '085204226322',
    '085755852344', '085784582261', '081944970885', '089516564400',
    '087859104286', '08155555323',  '081222111388', '0881036697022',
    '08990367165',  '08981309325',  '082131008657', '081334455891',
    '08980080309'
  ];

  var seedSet = {};
  for (var s = 0; s < SEED_NUMBERS.length; s++) {
    var n = normalizePhone_(SEED_NUMBERS[s]);
    if (n) seedSet[n] = true;
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var cols = ensureColumns_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var phoneCol = findPhoneColumn_();
    var matched = 0;

    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, phoneCol, lastRow - 1, 1).getValues();
      var statusValues = sheet.getRange(2, cols.statusCol, lastRow - 1, 1).getValues();

      for (var i = 0; i < phoneValues.length; i++) {
        var norm = normalizePhone_(phoneValues[i][0]);
        if (norm && seedSet[norm]) {
          var currentStatus = statusValues[i][0].toString().trim();
          if (currentStatus !== 'Sudah') {
            var row = i + 2;
            sheet.getRange(row, cols.statusCol).setValue('Sudah');
            sheet.getRange(row, cols.chattedCol).setValue(new Date().toISOString());
            matched++;
          }
        }
      }
    }

    lock.releaseLock();
    SpreadsheetApp.getUi().alert(
      'Seed Selesai!\n\n' +
      'Total nomor di daftar seed: ' + SEED_NUMBERS.length + '\n' +
      'Baris yang berhasil ditandai "Sudah": ' + matched
    );

  } catch (err) {
    lock.releaseLock();
    SpreadsheetApp.getUi().alert('Error saat seeding: ' + err.toString());
  }
}

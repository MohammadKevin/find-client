/**
 * ============================================================
 * LEADS WHATSAPP TRACKER & PIPELINE CRM — Google Apps Script
 * ============================================================
 *
 * FITUR UTAMA:
 * 1. Dropdown otomatis pada kolom Status_Chat:
 *    [Sudah Di-Chat, Belum Di-Chat, Perlu Follow-up, Deal / Selesai, Ditolak]
 * 2. Header rapi & format nomor otomatis.
 * 3. doGet: Mengambil seluruh data leads untuk sinkronisasi Pipeline CRM.
 * 4. doPost: Update status & timestamp saat tombol "Chat WA" diklik.
 * 5. seedInitialChatted: Menandai 33 nomor riwayat awal.
 * 6. formatAndSetupSheet: Merapikan & membuat dropdown 1-klik.
 *
 * CARA PAKAI:
 * 1. Buka Google Sheets > Extensions > Apps Script.
 * 2. Tempel seluruh kode ini ke Code.gs.
 * 3. Jalankan fungsi "formatAndSetupSheet" sekali dari dropdown atas (klik Run).
 * 4. Klik Deploy > Manage deployments > Edit > Version: New version > Anyone > Deploy.
 * ============================================================
 */

var STATUS_OPTIONS = [
  'Sudah Di-Chat',
  'Belum Di-Chat',
  'Perlu Follow-up',
  'Deal / Selesai',
  'Ditolak'
];

function normalizePhone_(raw) {
  if (!raw) return '';
  var digits = raw.toString().replace(/\D/g, '');
  if (digits.length < 5) return '';
  if (digits.indexOf('0') === 0) digits = '62' + digits.substring(1);
  else if (digits.indexOf('8') === 0) digits = '62' + digits;
  else if (digits.indexOf('620') === 0) digits = '62' + digits.substring(3);
  return digits;
}

function applyStatusDropdown_(sheet, statusColIndex, startRow, numRows) {
  if (!statusColIndex || statusColIndex < 1 || !numRows || numRows < 1) return;
  try {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUS_OPTIONS, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(startRow, statusColIndex, numRows, 1).setDataValidation(rule);
  } catch (err) {}
}

function ensureColumns_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  var statusCol = -1;
  var chattedCol = -1;

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim().toLowerCase();
    if (h === 'status_chat' || h === 'status') statusCol = i + 1;
    if (h === 'chatted_at' || h === 'waktu_kontak' || h === 'tanggal_chat') chattedCol = i + 1;
  }

  var nextCol = lastCol + 1;

  if (statusCol === -1) {
    statusCol = nextCol;
    sheet.getRange(1, statusCol).setValue('Status_Chat');
    nextCol++;
  }
  if (chattedCol === -1) {
    chattedCol = nextCol;
    sheet.getRange(1, chattedCol).setValue('Chatted_At');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    applyStatusDropdown_(sheet, statusCol, 2, Math.max(lastRow - 1, 50));
  }

  return { statusCol: statusCol, chattedCol: chattedCol };
}

function findPhoneColumn_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return 1;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  var candidates = [
    'nomor_wa', 'nomor wa', 'phone', 'telepon', 'no_hp', 'no hp',
    'whatsapp', 'no_telp', 'nomor_standar', 'nomor', 'hp', 'no telp',
    'nationalphonenumber', 'internationalphonenumber'
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

  return 2;
}

function formatAndSetupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.appendRow([
      'Nama_Bisnis',
      'Nomor_WA',
      'Nomor_Standar',
      'Status_Chat',
      'Chatted_At',
      'Alamat',
      'Kategori',
      'Catatan'
    ]);
    lastRow = 1;
    lastCol = 8;
  }

  var cols = ensureColumns_();
  var statusCol = cols.statusCol;

  try {
    sheet.setFrozenRows(1);
    var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 38);
  } catch (err) {}

  var totalRows = Math.max(sheet.getLastRow() - 1, 50);
  applyStatusDropdown_(sheet, statusCol, 2, totalRows);

  try {
    for (var c = 1; c <= sheet.getLastColumn(); c++) {
      sheet.autoResizeColumn(c);
    }
  } catch (err) {}

  SpreadsheetApp.getUi().alert('Format & Dropdown Status_Chat Berhasil Diterapkan!');
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
    var lastCol = sheet.getLastColumn();
    var phoneCol = findPhoneColumn_();
    var chatted = [];
    var data = [];

    if (lastRow > 1) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rawPhone = row[phoneCol - 1] ? row[phoneCol - 1].toString().trim() : '';
        var norm = normalizePhone_(rawPhone);
        var statusRaw = row[cols.statusCol - 1] ? row[cols.statusCol - 1].toString().trim() : '';
        var chattedAtVal = row[cols.chattedCol - 1] ? row[cols.chattedCol - 1].toString().trim() : '';

        var leadName = 'Prospek';
        var leadAddress = '';
        var leadCategory = 'general';
        var leadNotes = '';

        for (var h = 0; h < headers.length; h++) {
          var hName = headers[h].toString().trim().toLowerCase();
          if (hName.indexOf('nama') !== -1 || hName.indexOf('name') !== -1 || hName.indexOf('title') !== -1 || hName.indexOf('bisnis') !== -1) {
            if (row[h]) leadName = row[h].toString().trim();
          } else if (hName.indexOf('alamat') !== -1 || hName.indexOf('address') !== -1 || hName.indexOf('lokasi') !== -1) {
            if (row[h]) leadAddress = row[h].toString().trim();
          } else if (hName.indexOf('kategori') !== -1 || hName.indexOf('category') !== -1) {
            if (row[h]) leadCategory = row[h].toString().trim();
          } else if (hName.indexOf('catatan') !== -1 || hName.indexOf('notes') !== -1 || hName.indexOf('keterangan') !== -1) {
            if (row[h]) leadNotes = row[h].toString().trim();
          }
        }

        if (norm) {
          var stLow = statusRaw.toLowerCase();
          var resolvedStatus = 'new';
          var isChatted = false;

          if (stLow === 'sudah' || stLow === 'sudah di-chat' || stLow === 'contacted' || stLow === 'sudah dichat') {
            resolvedStatus = 'contacted';
            isChatted = true;
          } else if (stLow === 'follow-up' || stLow === 'perlu follow-up' || stLow === 'followup') {
            resolvedStatus = 'followup';
            isChatted = true;
          } else if (stLow === 'deal' || stLow === 'deal / selesai' || stLow === 'closed' || stLow === 'selesai') {
            resolvedStatus = 'closed';
            isChatted = true;
          } else if (stLow === 'ditolak' || stLow === 'rejected' || stLow === 'tolak') {
            resolvedStatus = 'rejected';
          } else {
            resolvedStatus = 'new';
          }

          data.push({
            phone: rawPhone || norm,
            normalizedPhone: norm,
            name: leadName || ('Prospek ' + (i + 1)),
            address: leadAddress,
            category: leadCategory,
            notes: leadNotes,
            status: resolvedStatus,
            statusDisplay: statusRaw || 'Belum Di-Chat',
            contactedAt: chattedAtVal
          });

          if (isChatted) {
            chatted.push(norm);
          }
        }
      }
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      total: data.length,
      data: data,
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
    var targetNorm = normalizePhone_(rawPhone || body.normalizedPhone);
    var name = body.name || '';
    var address = body.address || '';
    var category = body.category || '';
    var statusInput = body.status || 'Sudah Di-Chat';
    var contactedAt = body.contactedAt || new Date().toISOString();

    var statusToSave = 'Sudah Di-Chat';
    if (statusInput === 'new' || statusInput === 'Belum Di-Chat' || statusInput === 'Belum') {
      statusToSave = 'Belum Di-Chat';
    } else if (statusInput === 'followup' || statusInput === 'Perlu Follow-up') {
      statusToSave = 'Perlu Follow-up';
    } else if (statusInput === 'closed' || statusInput === 'Deal / Selesai' || statusInput === 'Deal') {
      statusToSave = 'Deal / Selesai';
    } else if (statusInput === 'rejected' || statusInput === 'Ditolak') {
      statusToSave = 'Ditolak';
    } else {
      statusToSave = 'Sudah Di-Chat';
    }

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
    var lastCol = sheet.getLastColumn();
    var phoneCol = findPhoneColumn_();
    var found = false;

    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, phoneCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < phoneValues.length; i++) {
        var norm = normalizePhone_(phoneValues[i][0]);
        if (norm === targetNorm) {
          var row = i + 2;
          sheet.getRange(row, cols.statusCol).setValue(statusToSave);
          sheet.getRange(row, cols.chattedCol).setValue(contactedAt);

          if (name && name !== 'Prospek') {
            var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
            for (var h = 0; h < headers.length; h++) {
              var hName = headers[h].toString().trim().toLowerCase();
              if (hName.indexOf('nama') !== -1 || hName.indexOf('name') !== -1) {
                var currentVal = sheet.getRange(row, h + 1).getValue();
                if (!currentVal || currentVal.toString().indexOf('Prospek') !== -1) {
                  sheet.getRange(row, h + 1).setValue(name);
                }
                break;
              }
            }
          }
          found = true;
          break;
        }
      }
    }

    if (!found) {
      if (lastRow === 0) {
        sheet.appendRow([
          'Nama_Bisnis',
          'Nomor_WA',
          'Nomor_Standar',
          'Status_Chat',
          'Chatted_At',
          'Alamat',
          'Kategori',
          'Catatan'
        ]);
        lastRow = 1;
      }
      sheet.appendRow([
        name || 'Prospek',
        "'" + (rawPhone || targetNorm),
        "'" + targetNorm,
        statusToSave,
        contactedAt,
        address || '',
        category || 'general',
        ''
      ]);
      applyStatusDropdown_(sheet, cols.statusCol, sheet.getLastRow(), 1);
      found = true;
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      found: found,
      phone: targetNorm,
      statusSaved: statusToSave
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

      for (var i = 0; i < phoneValues.length; i++) {
        var norm = normalizePhone_(phoneValues[i][0]);
        if (norm && seedSet[norm]) {
          var row = i + 2;
          sheet.getRange(row, cols.statusCol).setValue('Sudah Di-Chat');
          sheet.getRange(row, cols.chattedCol).setValue(new Date().toISOString());
          matched++;
        }
      }
    }

    applyStatusDropdown_(sheet, cols.statusCol, 2, Math.max(lastRow, 50));
    lock.releaseLock();

    SpreadsheetApp.getUi().alert(
      'Seed Selesai!\n\n' +
      'Total nomor terdaftar di riwayat: ' + SEED_NUMBERS.length + '\n' +
      'Baris yang berhasil ditandai "Sudah Di-Chat": ' + matched
    );

  } catch (err) {
    lock.releaseLock();
    SpreadsheetApp.getUi().alert('Error saat seeding: ' + err.toString());
  }
}

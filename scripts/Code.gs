/**
 * ============================================================
 * LEADS MACHINE CRM — Google Apps Script (v2.1)
 * ============================================================
 * 
 * STRUKTUR 11 KOLOM CRM:
 * 1.  Nama Bisnis (business_name)
 * 2.  Kategori (category)
 * 3.  No Telepon (phone_number)
 * 4.  Link Google Maps (maps_url)
 * 5.  Rating (rating)
 * 6.  Jumlah Ulasan (review_count)
 * 7.  Website Asli (website)
 * 8.  Status Lead (lead_status)        [NEW, QUALIFIED, CONTACTED, INTERESTED, LOST_FRANCHISE, CLOSED, UNQUALIFIED_FRANCHISE, UNQUALIFIED_CORPORATE]
 * 9.  Alasan Penolakan (rejection_reason) [Franchise, No Budget, Already Has Vendor, No Response, Corporate]
 * 10. Draft Pitch WA (generated_pitch)
 * 11. Terakhir Disinkron (last_sync_at)
 *
 * CARA SETUP SPREADSHEET BARU:
 * 1. Buka Google Spreadsheet baru (kosong).
 * 2. Klik Extensions > Apps Script.
 * 3. Hapus kode bawaan, lalu tempel seluruh isi skrip ini ke Code.gs.
 * 4. Pada dropdown fungsi di bagian atas, pilih "initNewLeadsCrmSheet" lalu klik Run.
 * 5. Klik Deploy > New deployment:
 *    - Select type: Web app
 *    - Description: Leads CRM API v2
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Salin URL Web App yang dihasilkan ke file .env.local:
 *    GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
 * ============================================================
 */

var SHEET_NAME = 'Leads CRM';

var HEADERS = [
  'Nama Bisnis',
  'Kategori',
  'No Telepon',
  'Link Google Maps',
  'Rating',
  'Jumlah Ulasan',
  'Website Asli',
  'Status Lead',
  'Alasan Penolakan',
  'Draft Pitch WA',
  'Terakhir Disinkron'
];

var STATUS_OPTIONS = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'INTERESTED',
  'IN_PROGRESS',
  'LOST_FRANCHISE',
  'LOST_REJECTED',
  'CLOSED',
  'UNQUALIFIED_FRANCHISE',
  'UNQUALIFIED_CORPORATE'
];

var REJECTION_OPTIONS = [
  'Franchise',
  'No Budget',
  'Already Has Vendor',
  'No Response',
  'Corporate',
  'Belum butuh penawaran'
];

function getOrCreateLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0);
  }
  return sheet;
}

function normalizePhone_(raw) {
  if (!raw) return '';
  var digits = raw.toString().replace(/\D/g, '');
  if (digits.length < 5) return '';
  if (digits.indexOf('0') === 0) digits = '62' + digits.substring(1);
  else if (digits.indexOf('8') === 0) digits = '62' + digits;
  else if (digits.indexOf('620') === 0) digits = '62' + digits.substring(3);
  return digits;
}

function applyDropdownValidation_(sheet, colIndex, options, startRow, numRows) {
  if (!colIndex || colIndex < 1 || !numRows || numRows < 1) return;
  try {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(options, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(startRow, colIndex, numRows, 1).setDataValidation(rule);
  } catch (err) {}
}

function initNewLeadsCrmSheet() {
  var sheet = getOrCreateLeadsSheet_();
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();

  if (lastCol === 0 || lastRow === 0) {
    sheet.appendRow(HEADERS);
  } else {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  try {
    sheet.setFrozenRows(1);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setBackground('#F3F4F6')
      .setFontColor('#111827')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 38);
  } catch (err) {}

  var totalRows = Math.max(sheet.getLastRow() - 1, 100);
  applyDropdownValidation_(sheet, 8, STATUS_OPTIONS, 2, totalRows);
  applyDropdownValidation_(sheet, 9, REJECTION_OPTIONS, 2, totalRows);

  try {
    for (var c = 1; c <= HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
  } catch (err) {}

  SpreadsheetApp.getUi().alert('Inisialisasi Tab "' + SHEET_NAME + '" Berhasil Diterapkan!');
}

function getHeaderMap_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim().toLowerCase().replace(/[\s_-]/g, '');
    map[h] = i;
  }
  return map;
}

function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server sedang sibuk. Silakan coba sesaat lagi.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var sheet = getOrCreateLeadsSheet_();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var leads = [];
    var contactedNumbers = [];

    if (lastRow > 1 && lastCol > 0) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var hMap = getHeaderMap_(headers);

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var name = (hMap['namabisnis'] !== undefined ? row[hMap['namabisnis']] : (hMap['businessname'] !== undefined ? row[hMap['businessname']] : row[0])) || '';
        var category = (hMap['kategori'] !== undefined ? row[hMap['kategori']] : (hMap['category'] !== undefined ? row[hMap['category']] : row[1])) || 'general';
        var phone = (hMap['notelepon'] !== undefined ? row[hMap['notelepon']] : (hMap['phonenumber'] !== undefined ? row[hMap['phonenumber']] : (hMap['nomorwa'] !== undefined ? row[hMap['nomorwa']] : row[2]))) || '';
        var normPhone = normalizePhone_(phone);
        var mapsUrl = (hMap['linkgooglemaps'] !== undefined ? row[hMap['linkgooglemaps']] : (hMap['mapsurl'] !== undefined ? row[hMap['mapsurl']] : row[3])) || '';
        var rating = Number(hMap['rating'] !== undefined ? row[hMap['rating']] : row[4]) || 0;
        var reviewCount = Number(hMap['jumlahulasan'] !== undefined ? row[hMap['jumlahulasan']] : (hMap['reviewcount'] !== undefined ? row[hMap['reviewcount']] : row[5])) || 0;
        var website = (hMap['websiteasli'] !== undefined ? row[hMap['websiteasli']] : (hMap['website'] !== undefined ? row[hMap['website']] : row[6])) || '';
        var status = (hMap['statuslead'] !== undefined ? row[hMap['statuslead']] : (hMap['leadstatus'] !== undefined ? row[hMap['leadstatus']] : row[7])) || 'NEW';
        var rejection = (hMap['alasanpenolakan'] !== undefined ? row[hMap['alasanpenolakan']] : (hMap['rejectionreason'] !== undefined ? row[hMap['rejectionreason']] : row[8])) || '';
        var pitch = (hMap['draftpitchwa'] !== undefined ? row[hMap['draftpitchwa']] : (hMap['generatedpitch'] !== undefined ? row[hMap['generatedpitch']] : row[9])) || '';
        var lastSync = (hMap['terakhirdisinkron'] !== undefined ? row[hMap['terakhirdisinkron']] : (hMap['lastsyncat'] !== undefined ? row[hMap['lastsyncat']] : row[10])) || '';

        if (normPhone) {
          if (status === 'CONTACTED' || status === 'INTERESTED' || status === 'CLOSED' || status === 'Sudah Di-Chat') {
            contactedNumbers.push(normPhone);
          }

          leads.push({
            business_name: name.toString().trim(),
            category: category.toString().trim(),
            phone_number: phone.toString().trim(),
            normalized_phone: normPhone,
            maps_url: mapsUrl.toString().trim(),
            rating: rating,
            review_count: reviewCount,
            website: website.toString().trim() || null,
            lead_status: status.toString().trim(),
            rejection_reason: rejection.toString().trim() || null,
            generated_pitch: pitch.toString().trim(),
            last_sync_at: lastSync.toString().trim(),
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      total: leads.length,
      contacted: contactedNumbers,
      data: leads
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server sedang sibuk memproses sinkronisasi lain.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var sheet = getOrCreateLeadsSheet_();
    var contents = e.postData ? e.postData.contents : '{}';
    var payload = JSON.parse(contents);

    if (payload.action === 'bulk_resync' && Array.isArray(payload.leads)) {
      sheet.clearContents();
      sheet.appendRow(HEADERS);

      var rowsToInsert = [];
      for (var b = 0; b < payload.leads.length; b++) {
        var l = payload.leads[b];
        rowsToInsert.push([
          l.business_name || '',
          l.category || 'general',
          "'" + (l.phone_number || l.normalized_phone || ''),
          l.maps_url || '',
          l.rating || 0,
          l.review_count || 0,
          l.website || '',
          l.lead_status || 'QUALIFIED',
          l.rejection_reason || '',
          l.generated_pitch || '',
          l.last_sync_at || new Date().toISOString()
        ]);
      }

      if (rowsToInsert.length > 0) {
        sheet.getRange(2, 1, rowsToInsert.length, HEADERS.length).setValues(rowsToInsert);
      }

      try {
        sheet.setFrozenRows(1);
        var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
        headerRange
          .setBackground('#F3F4F6')
          .setFontColor('#111827')
          .setFontWeight('bold')
          .setFontFamily('Arial')
          .setFontSize(10)
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle');
        sheet.setRowHeight(1, 38);
      } catch (err) {}

      var totalRows = Math.max(rowsToInsert.length, 50);
      applyDropdownValidation_(sheet, 8, STATUS_OPTIONS, 2, totalRows);
      applyDropdownValidation_(sheet, 9, REJECTION_OPTIONS, 2, totalRows);

      try {
        for (var col = 1; col <= HEADERS.length; col++) {
          sheet.autoResizeColumn(col);
        }
      } catch (err) {}

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Bulk resync berhasil diperbarui ke tab ' + SHEET_NAME,
        inserted: rowsToInsert.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var phone = payload.phone_number || payload.phone || '';
    var normalizedPhone = payload.normalized_phone || payload.normalizedPhone || normalizePhone_(phone);
    var name = payload.business_name || payload.name || 'Prospek';
    var category = payload.category || 'general';
    var mapsUrl = payload.maps_url || payload.address || '';
    var rating = Number(payload.rating || 0);
    var reviewCount = Number(payload.review_count || 0);
    var website = payload.website || '';
    var status = payload.lead_status || payload.status || 'QUALIFIED';
    var rejectionReason = payload.rejection_reason || payload.rejectionReason || '';
    var pitch = payload.generated_pitch || payload.pitch || '';
    var syncAt = payload.last_sync_at || payload.contactedAt || new Date().toISOString();

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      initNewLeadsCrmSheet();
      lastRow = sheet.getLastRow();
      lastCol = sheet.getLastColumn();
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var hMap = getHeaderMap_(headers);
    var foundRow = -1;

    var phoneColIdx = (hMap['notelepon'] !== undefined ? hMap['notelepon'] : (hMap['phonenumber'] !== undefined ? hMap['phonenumber'] : 2)) + 1;

    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, phoneColIdx, lastRow - 1, 1).getValues();
      for (var r = 0; r < phoneValues.length; r++) {
        var existingNorm = normalizePhone_(phoneValues[r][0]);
        if (existingNorm && existingNorm === normalizedPhone) {
          foundRow = r + 2;
          break;
        }
      }
    }

    var rowData = [
      name,
      category,
      "'" + (phone || normalizedPhone),
      mapsUrl,
      rating,
      reviewCount,
      website,
      status,
      rejectionReason,
      pitch,
      syncAt
  'LOST_REJECTED',
  'IN_PROGRESS'
];

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, HEADERS.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    var totalRows = Math.max(sheet.getLastRow() - 1, 50);
    applyDropdownValidation_(sheet, 8, STATUS_OPTIONS, 2, totalRows);
    applyDropdownValidation_(sheet, 9, REJECTION_OPTIONS, 2, totalRows);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data lead berhasil disinkronkan ke ' + SHEET_NAME,
      data: {
        business_name: name,
        normalized_phone: normalizedPhone,
        lead_status: status
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

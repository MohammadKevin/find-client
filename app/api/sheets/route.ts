import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeWhatsAppNumber,
  INITIAL_CONTACTED_NUMBERS,
  INITIAL_CONTACTED_SET,
} from '@/lib/phone-utils';

export const GOOGLE_APPS_SCRIPT_SAMPLE_CODE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(contents);

    var phone = data.phone || '';
    var normalizedPhone = data.normalizedPhone || phone;
    var name = data.name || 'Prospek';
    var status = data.status || 'Sudah Di-Chat';
    var contactedAt = data.contactedAt || new Date().toISOString();
    var address = data.address || '';
    var category = data.category || '';

    var lastRow = sheet.getLastRow();
    var foundRow = -1;

    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < phoneValues.length; i++) {
        if (phoneValues[i][0].toString().trim() === normalizedPhone.toString().trim()) {
          foundRow = i + 2;
          break;
        }
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 4).setValue(status);
      sheet.getRange(foundRow, 5).setValue(contactedAt);
      if (name && name !== 'Prospek') sheet.getRange(foundRow, 3).setValue(name);
    } else {
      if (lastRow === 0) {
        sheet.appendRow([
          'Nomor_WA',
          'Nomor_Standar',
          'Nama_Bisnis',
          'Status_Chat',
          'Waktu_Kontak',
          'Alamat',
          'Kategori'
        ]);
      }
      sheet.appendRow([
        "'" + phone,
        "'" + normalizedPhone,
        name,
        status,
        contactedAt,
        address,
        category
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Status berhasil dicatat di Google Sheets',
      data: { phone: normalizedPhone, status: status }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var results = [];

    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (row[1]) {
          results.push({
            phone: row[0],
            normalizedPhone: row[1].toString().trim(),
            name: row[2],
            status: row[3] || 'Sudah Di-Chat',
            contactedAt: row[4],
            address: row[5],
            category: row[6]
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: results
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customSheetUrl = searchParams.get('sheetUrl');
    const targetUrl =
      customSheetUrl ||
      process.env.GOOGLE_SHEETS_WEBAPP_URL ||
      process.env.NEXT_PUBLIC_LEADS_SHEET_API;

    const contactedSet = new Set<string>(INITIAL_CONTACTED_SET);
    const remoteRecords: Array<{
      phone: string;
      normalizedPhone: string;
      name: string;
      address?: string;
      category?: string;
      status: string;
      contactedAt: string;
    }> = [];

    let sheetsConnected = false;
    let syncError: string | null = null;

    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          next: { revalidate: 0 },
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success') {
            sheetsConnected = true;

            if (Array.isArray(json.data)) {
              for (const item of json.data) {
                const clean = normalizeWhatsAppNumber(item.normalizedPhone || item.phone);
                if (clean) {
                  if (item.status === 'contacted' || item.status === 'Sudah' || item.status === 'Sudah Di-Chat') {
                    contactedSet.add(clean);
                  }
                  remoteRecords.push({
                    phone: item.phone || clean,
                    normalizedPhone: clean,
                    name: item.name || 'Prospek',
                    address: item.address || '',
                    category: item.category || 'general',
                    status: item.status || 'new',
                    contactedAt: item.contactedAt || '',
                  });
                }
              }
            }

            if (Array.isArray(json.chatted)) {
              for (const p of json.chatted) {
                const clean = normalizeWhatsAppNumber(p);
                if (clean) contactedSet.add(clean);
              }
            }
          }
        } else {
          syncError = `HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (fetchErr) {
        syncError = fetchErr instanceof Error ? fetchErr.message : 'Koneksi ke Google Sheets gagal';
      }
    }

    return NextResponse.json({
      success: true,
      sheetsConnected,
      syncError,
      initialCount: INITIAL_CONTACTED_NUMBERS.length,
      totalContacted: contactedSet.size,
      contactedNumbers: Array.from(contactedSet),
      remoteRecords,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone,
      name = '',
      address = '',
      category = '',
      status = 'Sudah',
      sheetUrl,
      contactedAt = new Date().toISOString(),
    } = body;

    const normalizedPhone = normalizeWhatsAppNumber(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon tidak valid untuk disimpan.' },
        { status: 400 }
      );
    }

    const targetUrl =
      sheetUrl ||
      process.env.GOOGLE_SHEETS_WEBAPP_URL ||
      process.env.NEXT_PUBLIC_LEADS_SHEET_API;
    let syncedToSheets = false;
    let sheetResponse: unknown = null;

    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            normalizedPhone,
            name,
            address,
            category,
            status,
            contactedAt,
          }),
        });

        if (res.ok) {
          syncedToSheets = true;
          try {
            sheetResponse = await res.json();
          } catch {
            sheetResponse = { status: 'success' };
          }
        }
      } catch {
        syncedToSheets = false;
      }
    }

    return NextResponse.json({
      success: true,
      syncedToSheets,
      normalizedPhone,
      status,
      message: syncedToSheets
        ? 'Status berhasil dicatat dan disinkronkan ke Google Sheets.'
        : 'Status berhasil dicatat secara lokal.',
      sheetResponse,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

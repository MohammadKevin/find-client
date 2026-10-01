import {
  evaluateLeadQualification,
  LeadEntity,
  LeadStatus,
} from '../lib/lead-qualification';
import { generateOutreachMessage } from '../lib/template-generator';
import { normalizeWhatsAppNumber, INITIAL_CONTACTED_NUMBERS } from '../lib/phone-utils';

interface RawLeadInput {
  business_name?: string;
  name?: string;
  category?: string;
  phone_number?: string;
  phone?: string;
  maps_url?: string;
  address?: string;
  rating?: number | string;
  review_count?: number | string;
  website?: string | null;
  lead_status?: string;
  status?: string;
  rejection_reason?: string;
  generated_pitch?: string;
  last_sync_at?: string;
}

async function resyncToNewSpreadsheet() {
  console.log('===============================================================');
  console.log('📊 LEADS MACHINE: SINKRONISASI AWAL KE SPREADSHEET BARU (11 KOLOM)');
  console.log('===============================================================\n');

  const cliTargetUrl = process.argv[2];
  const targetUrl =
    cliTargetUrl ||
    process.env.GOOGLE_SHEETS_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_LEADS_SHEET_API ||
    '';

  if (!targetUrl) {
    console.error('❌ ERROR: URL Google Sheets Web App belum disediakan!');
    console.log('\nPenggunaan:');
    console.log('  npx tsx scripts/resync-to-new-sheet.ts <GOOGLE_SHEETS_WEBAPP_URL>');
    console.log('  atau set GOOGLE_SHEETS_WEBAPP_URL di file .env.local\n');
    process.exit(1);
  }

  console.log(`🔗 Endpoint Web App Tujuan: ${targetUrl}\n`);

  let sourceData: RawLeadInput[] = [];

  try {
    console.log('📥 Mencoba memuat data prospek dari Google Sheets saat ini...');
    const fetchRes = await fetch(targetUrl, { method: 'GET' });
    if (fetchRes.ok) {
      const json = await fetchRes.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        sourceData = json.data;
        console.log(`✅ Berhasil mengambil ${sourceData.length} data dari remote sheet.`);
      }
    }
  } catch {
    console.log('ℹ️ Menggunakan database kontak awal sistem sebagai baseline.');
  }

  if (sourceData.length === 0) {
    console.log(`📦 Memuat ${INITIAL_CONTACTED_NUMBERS.length} riwayat kontak bawaan sistem...`);
    sourceData = INITIAL_CONTACTED_NUMBERS.map((num, idx) => ({
      business_name: `Prospek Riwayat ${idx + 1}`,
      category: 'general',
      phone_number: num,
      maps_url: 'Google Maps Indonesia',
      rating: 4.8,
      review_count: 24,
      website: null,
      lead_status: 'CONTACTED',
      rejection_reason: '',
    }));
  }

  const cleanBatch: LeadEntity[] = [];
  let franchiseCount = 0;
  let corporateCount = 0;
  let highPriorityCount = 0;
  let qualifiedCount = 0;
  let contactedCount = 0;

  for (let i = 0; i < sourceData.length; i++) {
    const raw = sourceData[i];
    const name = (raw.business_name || raw.name || `Prospek ${i + 1}`).trim();
    const rawPhone = (raw.phone_number || raw.phone || '').toString().trim();
    const normalizedPhone = normalizeWhatsAppNumber(rawPhone);

    if (!normalizedPhone) continue;

    const category = (raw.category || 'general').trim();
    const mapsUrl = (raw.maps_url || raw.address || '').trim();
    const rating = Number(raw.rating || 0);
    const reviewCount = Number(raw.review_count || 0);
    const website = raw.website ? raw.website.trim() : null;
    const prevStatus = (raw.lead_status || raw.status || 'QUALIFIED').trim().toUpperCase();

    const qual = evaluateLeadQualification({
      name,
      website,
      rating,
      reviewCount,
    });

    let finalStatus: LeadStatus = 'QUALIFIED';
    let finalRejection = raw.rejection_reason || null;
    let finalPriority = qual.priorityScore;

    if (qual.isFranchise) {
      finalStatus = 'LOST_FRANCHISE';
      finalRejection = 'Franchise';
      finalPriority = 'DISQUALIFIED';
      franchiseCount++;
    } else if (qual.isCorporate) {
      finalStatus = 'UNQUALIFIED_CORPORATE';
      finalRejection = 'Corporate';
      finalPriority = 'DISQUALIFIED';
      corporateCount++;
    } else if (
      prevStatus === 'CONTACTED' ||
      prevStatus === 'SUDAH' ||
      prevStatus === 'SUDAH DI-CHAT'
    ) {
      finalStatus = 'CONTACTED';
      contactedCount++;
    } else if (prevStatus === 'INTERESTED' || prevStatus === 'FOLLOWUP') {
      finalStatus = 'INTERESTED';
    } else if (prevStatus === 'CLOSED' || prevStatus === 'DEAL') {
      finalStatus = 'CLOSED';
    } else {
      finalStatus = 'QUALIFIED';
      qualifiedCount++;
    }

    if (finalPriority === 'HIGH') {
      highPriorityCount++;
    }

    const pitch =
      raw.generated_pitch ||
      generateOutreachMessage({
        businessName: name,
        category,
        rating,
        userRatingCount: reviewCount,
        address: mapsUrl,
      });

    cleanBatch.push({
      id: `lead-${normalizedPhone}`,
      business_name: name,
      category,
      phone_number: rawPhone || normalizedPhone,
      normalized_phone: normalizedPhone,
      maps_url: mapsUrl,
      rating,
      review_count: reviewCount,
      website,
      priority_score: finalPriority,
      lead_status: finalStatus,
      rejection_reason: finalRejection as any,
      generated_pitch: pitch,
      last_sync_at: new Date().toISOString(),
      qualification_notes: qual.qualificationNotes,
      is_ideal_target: qual.isIdealTarget,
    });
  }

  console.log('\n📈 RINGKASAN AUDIT DATA BERSIH:');
  console.log('---------------------------------------------------------------');
  console.log(`Total Leads Valid : ${cleanBatch.length}`);
  console.log(`Franchise Blocked : ${franchiseCount} (Status: LOST_FRANCHISE)`);
  console.log(`Corporate Skipped : ${corporateCount} (Status: UNQUALIFIED_CORPORATE)`);
  console.log(`Target Ideal/High : ${highPriorityCount} (10-100 review / no web)`);
  console.log(`Riwayat Kontak    : ${contactedCount} (Status: CONTACTED)`);
  console.log(`Siap Diprospek    : ${qualifiedCount} (Status: QUALIFIED)`);
  console.log('---------------------------------------------------------------\n');

  console.log('🚀 Mengirim batch resync ke tab "Leads CRM" di Google Spreadsheet...');

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk_resync',
        leads: cleanBatch,
      }),
    });

    const resJson = await res.json().catch(() => null);

    if (res.ok) {
      console.log('\n🎉 SUKSES! Spreadsheet baru telah terisi dengan 11 kolom rapi:');
      console.log('  1. Nama Bisnis');
      console.log('  2. Kategori');
      console.log('  3. No Telepon');
      console.log('  4. Link Google Maps');
      console.log('  5. Rating');
      console.log('  6. Jumlah Ulasan');
      console.log('  7. Website Asli');
      console.log('  8. Status Lead (dengan Dropdown)');
      console.log('  9. Alasan Penolakan (dengan Dropdown)');
      console.log(' 10. Draft Pitch WA');
      console.log(' 11. Terakhir Disinkron\n');
    } else {
      console.warn('⚠️ Google Sheets merespons gagal:', resJson);
    }
  } catch (err) {
    console.error('❌ Gagal menghubungi endpoint Google Sheets:', err);
  }
}

if (require.main === module) {
  resyncToNewSpreadsheet().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

export { resyncToNewSpreadsheet };

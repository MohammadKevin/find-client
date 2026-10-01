import { NextRequest, NextResponse } from 'next/server';
import { normalizeWhatsAppNumber } from '@/lib/phone-utils';
import { LeadStatus, RejectionReason } from '@/lib/lead-qualification';

const FRANCHISE_REJECTION_KEYWORDS = [
  'franchise',
  'waralaba',
  'cabang',
  'kantor pusat',
  'dari pusat',
  'pusat kami',
  'punya pusat',
  'wewenang pusat',
  'sudah franchise',
  'kebijakan pusat',
  'tanya pusat',
  'pusat',
];

const POSITIVE_INTEREST_KEYWORDS = [
  'harga',
  'biaya',
  'tarif',
  'paket',
  'ongkos',
  'berapa',
  'fee',
  'pricelist',
  'price list',
  'budget',
  'biayanya',
  'harganya',
  'contoh',
  'portofolio',
  'portfolio',
  'demo',
  'tertarik',
  'minat',
  'bisa lihat',
  'gimana caranya',
  'caranya',
  'info lengkap',
  'boleh',
  'silahkan',
  'mau',
  'kirim',
  'kirimkan',
];

const MEETING_KEYWORDS = [
  'ketemu',
  'ktmu',
  'kapan',
  'meet',
  'meeting',
  'ketemuan',
  'tatap muka',
  'ke kantor',
  'ngobrol langsung',
  'bisa ketemu',
];

export interface IncomingIntentResult {
  intent: 'LOST_FRANCHISE' | 'INTERESTED' | 'MEETING' | 'UNKNOWN';
  leadStatus: LeadStatus;
  rejectionReason: RejectionReason;
  suggestedReply: string;
  shouldNotifyOwner: boolean;
  takeoverAlertMessage?: string;
}

export function detectIncomingIntent(message: string): IncomingIntentResult {
  const lower = message.toLowerCase().trim();

  const isFranchiseReject = FRANCHISE_REJECTION_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );
  if (isFranchiseReject) {
    return {
      intent: 'LOST_FRANCHISE',
      leadStatus: 'LOST_FRANCHISE',
      rejectionReason: 'Franchise',
      suggestedReply:
        'Baik Kak/Bapak/Ibu, terima kasih banyak atas informasinya dan mohon maaf jika sempat mengganggu waktunya. Sukses selalu untuk usahanya! 🙏',
      shouldNotifyOwner: false,
    };
  }

  const isMeeting = MEETING_KEYWORDS.some((kw) => lower.includes(kw));
  if (isMeeting) {
    return {
      intent: 'MEETING',
      leadStatus: 'INTERESTED',
      rejectionReason: null,
      suggestedReply: `Halo Kak/Bapak/Ibu, terima kasih banyak atas undangannya! 🙏\n\nPerkenalkan saya Kevin. Untuk presentasi atau share screen demo alur sistemnya, saya sangat siap melalui Google Meet/Zoom singkat 10-15 menit atau diskusi via WhatsApp. Kira-kira lebih nyaman opsi yang mana Kak?`,
      shouldNotifyOwner: true,
      takeoverAlertMessage: '🚨 PROSPEK MENGAJAK MEETING / KETEMUAN! Segera ambil alih chat.',
    };
  }

  const isPositiveInterest = POSITIVE_INTEREST_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );
  if (isPositiveInterest) {
    return {
      intent: 'INTERESTED',
      leadStatus: 'INTERESTED',
      rejectionReason: null,
      suggestedReply: `Halo Kak/Bapak/Ibu, terima kasih atas respons positifnya! Terkait demo alur pemesanan dan katalog interaktif, saya sudah siapkan konsep ringkasnya. Boleh saya kirimkan tautan preview desainnya ke nomor ini Kak?`,
      shouldNotifyOwner: true,
      takeoverAlertMessage: '🔥 PROSPEK TERTARIK / TANYA HARGA / CONTOH! Segera hubungi prospek.',
    };
  }

  return {
    intent: 'UNKNOWN',
    leadStatus: 'CONTACTED',
    rejectionReason: null,
    suggestedReply: `Halo Kak, terima kasih sudah membalas! Apakah ada bagian dari sistem alur otomatis atau stand akrilik QR kasir yang ingin Kakak tanyakan lebih lanjut?`,
    shouldNotifyOwner: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let sender = '';
    let message = '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      sender = (body.sender || body.from || '').toString().trim();
      message = (body.message || body.text || '').toString().trim();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        sender = (formData.get('sender') || formData.get('from') || '').toString().trim();
        message = (formData.get('message') || formData.get('text') || '').toString().trim();
      }
    } else {
      const rawText = await req.text().catch(() => '');
      try {
        const parsed = JSON.parse(rawText);
        sender = (parsed.sender || parsed.from || '').toString().trim();
        message = (parsed.message || parsed.text || '').toString().trim();
      } catch {
      }
    }

    if (!sender || !message) {
      return NextResponse.json(
        { status: 'ignored', reason: 'Field sender atau message tidak ditemukan dalam payload.' },
        { status: 200 }
      );
    }

    const normalizedSender = normalizeWhatsAppNumber(sender);
    const intentAnalysis = detectIncomingIntent(message);

    const sheetUrl =
      process.env.GOOGLE_SHEETS_WEBAPP_URL || process.env.NEXT_PUBLIC_LEADS_SHEET_API;
    let sheetSynced = false;

    if (sheetUrl) {
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: sender,
            normalizedPhone: normalizedSender,
            status: intentAnalysis.leadStatus,
            rejectionReason: intentAnalysis.rejectionReason,
            lastSyncAt: new Date().toISOString(),
            contactedAt: new Date().toISOString(),
          }),
        });
        sheetSynced = true;
      } catch {
      }
    }

    const ownerNotificationUrl = process.env.OWNER_NOTIFICATION_WEBHOOK_URL;
    let notifiedOwner = false;

    if (intentAnalysis.shouldNotifyOwner && ownerNotificationUrl) {
      try {
        await fetch(ownerNotificationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: intentAnalysis.takeoverAlertMessage,
            sender: normalizedSender,
            incomingMessage: message,
            timestamp: new Date().toISOString(),
          }),
        });
        notifiedOwner = true;
      } catch {
      }
    }

    const token = process.env.FONNTE_TOKEN || process.env.FONNTE_API_TOKEN;
    let autoReplied = false;

    if (token && intentAnalysis.suggestedReply && intentAnalysis.intent === 'LOST_FRANCHISE') {
      try {
        const formData = new FormData();
        formData.append('target', sender);
        formData.append('message', intentAnalysis.suggestedReply);
        formData.append('countryCode', '62');

        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: token },
          body: formData,
        });
        autoReplied = true;
      } catch {
      }
    }

    return NextResponse.json({
      status: 'success',
      sender: normalizedSender,
      intent: intentAnalysis.intent,
      leadStatus: intentAnalysis.leadStatus,
      rejectionReason: intentAnalysis.rejectionReason,
      suggestedReply: intentAnalysis.suggestedReply,
      shouldNotifyOwner: intentAnalysis.shouldNotifyOwner,
      notifiedOwner,
      sheetSynced,
      autoReplied,
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan internal pada webhook.';
    return NextResponse.json({ status: 'error', message: errorMsg }, { status: 500 });
  }
}

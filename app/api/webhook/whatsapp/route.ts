import { NextRequest, NextResponse } from 'next/server';

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

const PRICING_KEYWORDS = [
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
];

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let sender = '';
    let message = '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      sender = (body.sender || body.from || '').toString().trim();
      message = (body.message || body.text || '').toString().trim();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
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

    const token = process.env.FONNTE_TOKEN || process.env.FONNTE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { status: 'error', message: 'FONNTE_TOKEN belum dikonfigurasi di environment variable.' },
        { status: 500 }
      );
    }

    const lowerMsg = message.toLowerCase();
    let replyText: string | null = null;
    let matchedIntent: 'meeting' | 'pricing' | null = null;

    const isMeeting = MEETING_KEYWORDS.some((kw) => lowerMsg.includes(kw));
    const isPricing = PRICING_KEYWORDS.some((kw) => lowerMsg.includes(kw));

    if (isMeeting) {
      matchedIntent = 'meeting';
      replyText = `Halo Kak/Bapak/Ibu, terima kasih banyak atas responsnya! 🙏

Perkenalkan, saya Kevin. Kebetulan saat ini saya masih berstatus sebagai siswa di SMK Telkom Malang, jadi untuk jam sekolah aktivitas saya difokuskan di kelas.

Namun untuk diskusi konsep atau presentasi preview website, saya sangat siap dan fleksibel melalui:
1. Google Meet / Zoom (10–15 menit) untuk share screen demo desain & alur fiturnya
2. Diskusi langsung via WhatsApp Chat / Call di luar jam sekolah

Kira-kira Kakak/Bapak/Ibu lebih nyaman ngobrol via chat terlebih dahulu atau atur jadwal singkat via Google Meet? Terima kasih banyak atas kesempatannya!`;
    } else if (isPricing) {
      matchedIntent = 'pricing';
      replyText = `Halo Kak/Bapak/Ibu, terima kasih atas ketertarikannya!

Untuk biaya pembuatan website di tempat kami sangat terjangkau & fleksibel menyesuaikan kebutuhan UMKM / Instansi lokal:

Estimasi Paket Website:
• Landing Page Profil / Katalog Ringkas: mulai Rp300.000 – Rp450.000
• Website Katalog Interaktif + Direct Order WhatsApp: Rp500.000 – Rp700.000
(Sudah termasuk integrasi tombol WhatsApp, desain responsif mobile-friendly, dan optimasi dasar di Google Maps/Search).

Kira-kira kebutuhan utama bisnis saat ini lebih ke landing page profil resmi atau katalog visual produk ya Kak? Biar bisa saya siapkan preview desain yang paling pas.`;
    }

    if (!replyText) {
      return NextResponse.json(
        { status: 'success', replied: false, message: 'Tidak ada kata kunci yang cocok untuk auto-reply.' },
        { status: 200 }
      );
    }

    const outgoingFormData = new FormData();
    outgoingFormData.append('target', sender);
    outgoingFormData.append('message', replyText);
    outgoingFormData.append('countryCode', '62');

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: outgoingFormData,
    });

    const fonnteData = await fonnteRes.json().catch(() => null);

    if (!fonnteRes.ok || (fonnteData && fonnteData.status === false)) {
      return NextResponse.json(
        {
          status: 'error',
          replied: false,
          error: fonnteData?.reason || 'Gagal mengirim pesan balasan via Fonnte.',
          details: fonnteData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      replied: true,
      matchedIntent,
      target: sender,
      data: fonnteData,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan internal pada webhook.';
    return NextResponse.json({ status: 'error', message: errorMsg }, { status: 500 });
  }
}

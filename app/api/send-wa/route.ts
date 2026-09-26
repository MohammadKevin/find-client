import { NextRequest, NextResponse } from 'next/server';
import { cleanPhoneNumber } from '@/lib/phone-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { target, message, token: customToken } = body;

    if (!target || typeof target !== 'string') {
      return NextResponse.json(
        { error: 'Nomor tujuan (target) wajib diisi.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Pesan (message) tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const phoneAnalysis = cleanPhoneNumber(target);
    if (!phoneAnalysis.isValid || !phoneAnalysis.isMobile) {
      return NextResponse.json(
        {
          error: `Nomor ${target} bukan nomor WhatsApp seluler yang valid (${phoneAnalysis.notes}).`,
        },
        { status: 400 }
      );
    }

    const token = customToken || process.env.FONNTE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            'FONNTE_API_TOKEN belum dikonfigurasi di file .env.local atau dikirimkan di payload.',
        },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append('target', phoneAnalysis.cleaned);
    formData.append('message', message.trim());
    formData.append('countryCode', '62');

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await fonnteRes.json().catch(() => null);

    if (!fonnteRes.ok || (data && data.status === false)) {
      const reason = data?.reason || data?.message || 'Gagal mengirim pesan melalui Fonnte Gateway.';
      return NextResponse.json(
        {
          error: reason,
          details: data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      target: phoneAnalysis.cleaned,
      message: 'Pesan WhatsApp berhasil dikirim.',
      data,
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan pada server saat mengirim pesan.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

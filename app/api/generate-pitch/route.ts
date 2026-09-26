import { NextRequest, NextResponse } from 'next/server';
import { generateOutreachMessage } from '@/lib/template-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      businessName,
      category = 'general',
      address = '',
      rating = 0,
      userRatingCount = 0,
      senderName = 'Mohammad Kevin',
      senderRole = 'freelance web developer',
      geminiKey: customGeminiKey,
    } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: 'Nama bisnis wajib disertakan.' },
        { status: 400 }
      );
    }

    const apiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    const fallbackText = generateOutreachMessage({
      businessName,
      category,
      senderName,
      senderRole,
    });

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        businessName,
        message: fallbackText,
        source: 'template_fallback',
      });
    }

    const prompt = `Anda adalah seorang copywriter sales outreach WhatsApp profesional dan ramah di Indonesia.
Tugas Anda: Buat pesan WhatsApp personalisasi, singkat, padat, sopan, dan persuasif dari seorang freelance web developer bernama "${senderName}" (${senderRole}) kepada pemilik/admin bisnis "${businessName}".

Konteks Bisnis:
- Nama Bisnis: ${businessName}
- Kategori/Fokus: ${category}
- Alamat: ${address || 'Indonesia'}
- Rating Google: ${rating > 0 ? `${rating} bintang (${userRatingCount} ulasan)` : 'Tidak ada ulasan'}
- Masalah: Bisnis ini belum memiliki website resmi di Google Maps, padahal reputasinya bagus.

Instruksi Penulisan:
1. Sapa dengan ramah (Halo Kak/Admin/Bapak/Ibu ${businessName}).
2. Sebutkan nama saya (${senderName}, ${senderRole}).
3. Apresiasi bisnis mereka (misal sebut lokasi/reputasi di Google Maps).
4. Soroti keunggulan memiliki website resmi sesuai kategorinya:
   - Jika UMKM/Kuliner/Retail: katalog visual interaktif, daftar harga tanpa tanya manual, tombol order langsung ke WA.
   - Jika Jasa/Bimbel/Klinik/Bengkel: profil resmi, jam operasional, kredibilitas di pencarian Google, booking praktis.
5. Berikan penawaran tanpa beban (Call to Action halus): Tawaran membuatkan preview / demo desain gratis terlebih dahulu atau kirim portofolio.
6. Hindari bahasa kaku atau terlalu formal/kuno. Gunakan gaya bahasa Indonesia modern yang natural, hangat, dan profesional.
7. Output HANYA teks pesan WhatsApp yang siap kirim tanpa tanda kutip pembuka/penutup atau penjelasan tambahan.`;

    const modelsToTry = [
      'gemini-2.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ];
    let generatedText = '';

    for (const model of modelsToTry) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            generatedText = candidate.trim();
            break;
          }
        }
      } catch {
        // Fallback to next model
      }
    }

    const finalMessage = generatedText || fallbackText;

    return NextResponse.json({
      success: true,
      businessName,
      message: finalMessage,
      source: generatedText ? 'gemini_ai' : 'template_fallback',
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan server saat generate AI pitch.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

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
      marketMode = 'indo',
      geminiKey: customGeminiKey,
    } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: 'Nama bisnis wajib disertakan.' },
        { status: 400 }
      );
    }

    const apiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    const isGlobal =
      marketMode === 'global' ||
      /\b(london|manchester|birmingham|berlin|munich|paris|amsterdam|dublin|sydney|melbourne|new york|los angeles|chicago|singapore|dubai|uk|usa|australia|germany|france)\b/i.test(
        address
      );

    const fallbackText = isGlobal
      ? `Hi ${businessName} Team,

I noticed your great ${rating > 0 ? `${rating}-star ` : ''}reputation on Google Maps around ${address || 'your local area'}.

I'm ${senderName}, a ${senderRole}. I noticed you don't have a modern official website linked to your Google Business profile yet.

I specialize in building clean, ultra-fast, mobile-friendly websites with online booking & direct quote requests to help local businesses convert more search visitors into paying clients.

Would you be open to a quick free mockup preview for ${businessName}? I'd be happy to put together a complimentary interactive design concept for you to review with zero obligation.

Best regards,
${senderName} | Web Developer`
      : generateOutreachMessage({
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

    const prompt = isGlobal
      ? `You are an expert B2B sales copywriter crafting cold outreach messages (email & WhatsApp) in professional English for an overseas freelance web developer named "${senderName}" (${senderRole}) reaching out to local business owners/managers in Europe, the UK, US, Australia, and internationally.

Business Context:
- Company Name: ${businessName}
- Industry/Niche: ${category}
- Location: ${address || 'Local area'}
- Google Reviews: ${rating > 0 ? `${rating} stars (${userRatingCount} reviews)` : 'Positive reputation'}
- Key Opportunity: Great local reputation on Google Maps, but currently missing a modern, fast, mobile-friendly official website.

Writing Instructions:
1. Warm, professional, concise, direct tone (under 120 words).
2. Compliment their Google reputation/location genuinely.
3. Highlight tangible business benefits: modern mobile-first landing page, instant customer booking/contact forms, Google search conversion.
4. Frictionless Call-to-Action (Soft Offer): Offer to create a free, zero-obligation interactive preview mockup of their website.
5. Output ONLY the ready-to-send cold outreach message text without quotation marks or extra conversational filler.`
      : `Anda adalah seorang copywriter sales outreach WhatsApp profesional dan ramah di Indonesia.
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
4. Soroti keunggulan memiliki website resmi sesuai kategorinya.
5. Berikan penawaran tanpa beban (Call to Action halus): Tawaran membuatkan preview / demo desain gratis terlebih dahulu atau kirim portofolio.
6. Hindari bahasa kaku. Gunakan gaya bahasa Indonesia modern yang natural, hangat, dan profesional.
7. Output HANYA teks pesan yang siap kirim.`;

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
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
      marketMode: isGlobal ? 'global' : 'indo',
      source: generatedText ? 'gemini_ai' : 'template_fallback',
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan server saat generate AI pitch.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

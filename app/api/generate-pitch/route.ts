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
      senderEmail = 'mhmdkevin198@gmail.com',
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

I came across ${businessName} on Google Maps and noticed your great ${rating > 0 ? `${rating}-star ` : ''}reputation around ${address || 'your local area'}.

I'm ${senderName}, a ${senderRole}. I noticed you don't have an official modern website linked to your Google business profile yet.

I specialize in building clean, ultra-fast, mobile-friendly websites with online booking, service showcases, and direct quote forms designed specifically to help local businesses convert search visitors into paying customers.

Would you be open to a quick, complimentary mockup preview for ${businessName}? I'd be happy to put together a free design concept for you to review with zero obligation.

Best regards,
${senderName}
Email: ${senderEmail}
Web & Mobile Developer`
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
      ? `You are an expert B2B cold email copywriter crafting highly effective, personalized cold outreach emails for an overseas freelance web developer named "${senderName}" (${senderRole}, email: ${senderEmail}) pitching local business owners/decision-makers in the UK, Europe, US, or Australia.

Business Target Context:
- Company Name: ${businessName}
- Industry/Niche: ${category}
- Location: ${address || 'Local area'}
- Google Reviews: ${rating > 0 ? `${rating} stars (${userRatingCount} reviews)` : 'Positive reputation'}
- Core Opportunity: Great Google Maps reputation, but currently missing a modern, fast, mobile-optimized website.

Cold Email Writing Guidelines:
1. Subject Line + Body: Write a punchy subject line on the first line (e.g., "Subject: Quick question regarding website for ${businessName}"), followed by a blank line and the email body.
2. Tone: Warm, professional, concise, zero-fluff, highly respectful (under 110 words total).
3. Value Proposition: Highlight increased search customer capture, mobile conversion, and direct online quote/booking forms.
4. Soft Call-to-Action (Frictionless): Offer to build a free, zero-obligation interactive design mockup for ${businessName}.
5. Sign-off with:
   Best regards,
   ${senderName}
   ${senderEmail}
   Freelance Web Developer
6. Output ONLY the subject line and email body ready to send.`
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

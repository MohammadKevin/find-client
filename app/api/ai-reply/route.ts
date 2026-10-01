import { NextRequest, NextResponse } from 'next/server';
import { detectIncomingIntent } from '@/app/api/webhook/whatsapp/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      incomingMessage,
      businessName = 'Klien',
      category = 'general',
      replyGoal = 'helpful',
      senderName = 'Mohammad Kevin',
      senderRole = 'freelance web developer',
      geminiKey: customGeminiKey,
    } = body;

    if (!incomingMessage || typeof incomingMessage !== 'string') {
      return NextResponse.json(
        { error: 'Pesan dari klien (incomingMessage) wajib diisi.' },
        { status: 400 }
      );
    }

    const intentAnalysis = detectIncomingIntent(incomingMessage);
    const apiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    if (intentAnalysis.intent === 'LOST_FRANCHISE') {
      return NextResponse.json({
        success: true,
        businessName,
        reply: intentAnalysis.suggestedReply,
        intent: intentAnalysis.intent,
        leadStatus: intentAnalysis.leadStatus,
        source: 'intent_engine',
      });
    }

    const prompt = `Anda adalah asisten komunikasi outreach WhatsApp untuk seorang freelance web developer bernama "${senderName}" (${senderRole}).

Konteks Percakapan:
- Nama Bisnis: ${businessName}
- Kategori Usaha: ${category}
- Pesan Klien: "${incomingMessage}"
- Arah Balasan: ${replyGoal}

PEDOMAN BALASAN (VALUE-FIRST):
1. Bahasa Indonesia santai, ramah, to-the-point, dan sopan (Kak/Pak/Bu).
2. Jika klien menanyakan harga/biaya:
   - Jelaskan dengan transparan: Konsep alur katalog ringkas/booking mulai Rp300rb - Rp450rb, dan paket lengkap interaktif + stand akrilik QR kasir Rp500rb - Rp700rb.
3. Jika klien mengajak ketemuan tatap muka:
   - Sampaikan dengan sopan untuk diskusi efektif via Google Meet / Zoom singkat 10-15 menit untuk share screen demo alur sistem, atau diskusi WhatsApp Call.
4. Jika klien minta contoh / portofolio:
   - Tawarkan pembuatan preview/demo desain tanpa biaya terlebih dahulu.
5. Panjang pesan maksimal 50-70 kata. Output HANYA teks balasan siap kirim tanpa tanda petik atau narasi tambahan.`;

    let generatedReply = '';

    if (apiKey) {
      const modelsToTry = [
        'gemini-2.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.5-flash',
      ];

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
                  temperature: 0.6,
                  maxOutputTokens: 300,
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) {
              generatedReply = candidate.trim().replace(/^["']|["']$/g, '');
              break;
            }
          }
        } catch {
        }
      }
    }

    const finalReply = generatedReply || intentAnalysis.suggestedReply;

    return NextResponse.json({
      success: true,
      businessName,
      reply: finalReply,
      intent: intentAnalysis.intent,
      leadStatus: intentAnalysis.leadStatus,
      source: generatedReply ? 'gemini_ai' : 'rule_fallback',
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan server saat membuat balasan AI.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

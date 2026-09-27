import { NextRequest, NextResponse } from 'next/server';

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

    const apiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    const prompt = `Anda adalah asisten sales & copywriter WhatsApp profesional untuk seorang freelance web developer bernama "${senderName}" (${senderRole}) yang saat ini masih siswa di SMK Telkom Malang.

Konteks Percakapan:
- Nama Klien / Bisnis: ${businessName}
- Kategori Usaha: ${category}
- Pesan yang diterima dari Klien: "${incomingMessage}"
- Tujuan / Arah Balasan: ${replyGoal}

Pedoman Khusus Menjawab:
1. Jawab dengan sangat ramah, sopan, natural (gaya bahasa WhatsApp Indonesia modern), to-the-point, dan tidak bertele-tele.
2. Jika klien bertanya harga:
   - Berikan estimasi transparan & terjangkau: Landing Page Profil/Katalog Ringkas Rp300rb–Rp450rb, Katalog Interaktif + Direct WA Order Rp500rb–Rp700rb.
3. Jika klien mengajak ketemuan tatap muka di kantor/lokasi:
   - Jelaskan dengan sopan bahwa Kevin masih berstatus siswa di SMK Telkom Malang (fokus kelas saat jam sekolah).
   - Tawarkan alternatif efektif: Google Meet / Zoom singkat 10-15 menit untuk share screen demo preview desain, atau diskusi santai via WA Chat/Call di luar jam sekolah.
4. Jika klien ragu atau meminta portofolio:
   - Tawarkan pembuatan preview/demo desain awal secara gratis tanpa ikatan biaya terlebih dahulu.
5. Format output HANYA berupa teks pesan WhatsApp siap kirim tanpa tanda kutip pembuka/penutup atau narasi tambahan.`;

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
              generatedReply = candidate.trim();
              break;
            }
          }
        } catch {
        }
      }
    }

    if (!generatedReply) {
      const lower = incomingMessage.toLowerCase();
      if (lower.includes('harga') || lower.includes('biaya') || lower.includes('tarif') || lower.includes('berapa')) {
        generatedReply = `Halo Kak/Bapak/Ibu ${businessName}, untuk pembuatan website di tempat kami sangat terjangkau mulai dari Rp300.000 - Rp450.000 (Landing page profil/katalog ringkas) hingga Rp500.000 - Rp700.000 (Katalog interaktif + order WA lengkap).

Kira-kira kebutuhan utama saat ini lebih ke profil resmi atau katalog produk ya Kak?`;
      } else if (lower.includes('ketemu') || lower.includes('meet') || lower.includes('kapan') || lower.includes('kantor')) {
        generatedReply = `Halo Kak ${businessName}, terima kasih atas undangannya! 🙏

Perkenalkan saya Kevin. Kebetulan saya masih berstatus siswa di SMK Telkom Malang, jadi saat jam sekolah kegiatan saya fokus di kelas. 

Namun untuk diskusi atau presentasi konsep website, saya sangat siap via Google Meet / Zoom singkat 10-15 menit untuk share screen demo desainnya, atau via WhatsApp Call di luar jam sekolah. Kira-kira lebih nyaman yang mana Kak?`;
      } else {
        generatedReply = `Halo Kak ${businessName}, terima kasih atas responnya! Terkait hal tersebut, saya dengan senang hati bisa buatkan preview/demo desain gratisnya terlebih dahulu agar bisa dilihat kecocokannya untuk ${businessName}. Boleh saya siapkan contohnya terlebih dahulu Kak?`;
      }
    }

    return NextResponse.json({
      success: true,
      reply: generatedReply,
      source: apiKey && generatedReply ? 'gemini_ai' : 'smart_rule_engine',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat membuat balasan AI.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

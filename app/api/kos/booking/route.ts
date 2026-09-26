import { NextRequest, NextResponse } from 'next/server';
import { generateInitial35Rooms, RoomItem, TenantData, formatRupiah } from '@/lib/kos-data';
import { cleanPhoneNumber } from '@/lib/phone-utils';

let globalRoomsCache: RoomItem[] | null = null;
const globalBookingsArchive: TenantData[] = [];

function getRooms(): RoomItem[] {
  if (!globalRoomsCache) {
    globalRoomsCache = generateInitial35Rooms();
  }
  return globalRoomsCache;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      roomNumber,
      fullName,
      whatsapp,
      checkInDate,
      durationMonths = 1,
      ktpBase64,
      selfieBase64,
      notes = '',
    } = body;

    if (!roomNumber || !fullName || !whatsapp || !checkInDate) {
      return NextResponse.json(
        { error: 'Lengkapi semua field wajib: Kamar, Nama, WhatsApp, dan Tanggal Masuk.' },
        { status: 400 }
      );
    }

    if (!ktpBase64 || !selfieBase64) {
      return NextResponse.json(
        { error: 'Foto KTP dan Foto Diri/Wajah wajib diunggah untuk verifikasi identitas.' },
        { status: 400 }
      );
    }

    const rooms = getRooms();
    const roomIndex = rooms.findIndex((r) => r.roomNumber === roomNumber);

    if (roomIndex === -1) {
      return NextResponse.json({ error: 'Nomor kamar tidak valid.' }, { status: 404 });
    }

    const room = rooms[roomIndex];
    if (room.status === 'occupied') {
      return NextResponse.json(
        { error: `Kamar ${roomNumber} saat ini sudah terisi. Silakan pilih kamar lain yang masih tersedia.` },
        { status: 400 }
      );
    }

    const phoneAnalysis = cleanPhoneNumber(whatsapp);
    const months = Number(durationMonths) || 1;
    const totalPaid = room.priceMonthly * months;

    const tenantRecord: TenantData = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: fullName.trim(),
      whatsapp: phoneAnalysis.cleaned || whatsapp.trim(),
      checkInDate,
      durationMonths: months,
      totalPaid,
      ktpImageUrl: ktpBase64,
      selfieImageUrl: selfieBase64,
      notes,
      status: 'pending_verification',
      createdAt: new Date().toISOString().split('T')[0],
    };

    room.status = 'pending';
    room.tenant = tenantRecord;
    globalBookingsArchive.unshift(tenantRecord);

    const notificationMessage = `Halo Admin Kos Graha Surabaya!

Ada Booking Baru Masuk:
• Kamar: ${room.roomNumber} (${room.type}, Lantai ${room.floor})
• Nama Penyewa: ${tenantRecord.name}
• No WhatsApp: +${tenantRecord.whatsapp}
• Tanggal Masuk: ${tenantRecord.checkInDate}
• Durasi Sewa: ${tenantRecord.durationMonths} Bulan
• Estimasi Total: ${formatRupiah(tenantRecord.totalPaid)}
• Dokumen: KTP & Foto Wajah sudah terunggah di Admin Dashboard.

Mohon buka Admin Dashboard untuk verifikasi & approve booking ini. Terima kasih!`;

    const fonnteToken = process.env.FONNTE_TOKEN || process.env.FONNTE_API_TOKEN;
    const adminPhone = '62895629460144';

    if (fonnteToken) {
      try {
        const formData = new FormData();
        formData.append('target', adminPhone);
        formData.append('message', notificationMessage);
        formData.append('countryCode', '62');

        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: fonnteToken },
          body: formData,
        });
      } catch {
        // Notification failure shouldn't fail booking
      }
    }

    return NextResponse.json({
      success: true,
      message: `Booking Kamar ${room.roomNumber} berhasil disubmit. Admin akan segera menghubungi Anda melalui WhatsApp.`,
      booking: tenantRecord,
      room,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses booking.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateInitial35Rooms, RoomItem, RoomStatus } from '@/lib/kos-data';

let globalRoomsCache: RoomItem[] | null = null;

function getRooms(): RoomItem[] {
  if (!globalRoomsCache) {
    globalRoomsCache = generateInitial35Rooms();
  }
  return globalRoomsCache;
}

export async function GET() {
  try {
    const rooms = getRooms();
    return NextResponse.json({
      success: true,
      total: rooms.length,
      rooms,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal mengambil data kamar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { roomId, status, priceMonthly } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID wajib disertakan.' }, { status: 400 });
    }

    const rooms = getRooms();
    const index = rooms.findIndex((r) => r.id === roomId || r.roomNumber === roomId);

    if (index === -1) {
      return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 });
    }

    if (status) {
      rooms[index].status = status as RoomStatus;
      if (status === 'available') {
        rooms[index].tenant = null;
      }
    }

    if (typeof priceMonthly === 'number' && priceMonthly > 0) {
      rooms[index].priceMonthly = priceMonthly;
    }

    return NextResponse.json({
      success: true,
      message: `Kamar ${rooms[index].roomNumber} berhasil diperbarui.`,
      room: rooms[index],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal memperbarui kamar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export type RoomStatus = 'available' | 'occupied' | 'pending' | 'maintenance';

export interface RoomItem {
  id: string;
  roomNumber: string;
  floor: number;
  type: 'Deluxe AC' | 'Standard AC' | 'VIP Room';
  priceMonthly: number;
  status: RoomStatus;
  facilities: string[];
  dimensions: string;
  tenant?: TenantData | null;
}

export interface TenantData {
  id: string;
  name: string;
  whatsapp: string;
  checkInDate: string;
  durationMonths: number;
  totalPaid: number;
  ktpImageUrl: string;
  selfieImageUrl: string;
  notes?: string;
  status: 'active' | 'pending_verification' | 'checked_out';
  createdAt: string;
}

export interface MonthlyReportSummary {
  monthYear: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  pendingRooms: number;
  maintenanceRooms: number;
  occupancyRate: number; // percentage
  actualRevenue: number; // total revenue from occupied rooms
  potentialRevenue: number; // total revenue if 100% occupied
  floorRevenues: {
    floor: number;
    occupied: number;
    revenue: number;
  }[];
}

export function generateInitial35Rooms(): RoomItem[] {
  const rooms: RoomItem[] = [];

  // Lantai 1: Kamar 101 - 115 (15 Kamar)
  for (let i = 1; i <= 15; i++) {
    const num = `10${i < 10 ? `0${i}` : i}`;
    const isVip = i <= 3;
    rooms.push({
      id: `room-${num}`,
      roomNumber: num,
      floor: 1,
      type: isVip ? 'VIP Room' : 'Deluxe AC',
      priceMonthly: isVip ? 1650000 : 1350000,
      status: i % 4 === 0 ? 'occupied' : i === 7 ? 'pending' : 'available',
      facilities: isVip
        ? ['AC Daikin', 'Kamar Mandi Dalam (Water Heater)', 'Kasur Springbed Queen', 'Smart TV 32"', 'Meja Kerja & Lemari', 'WiFi 100 Mbps']
        : ['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'],
      dimensions: isVip ? '4 x 5 meter' : '3.5 x 4 meter',
      tenant: i % 4 === 0
        ? {
            id: `tenant-${num}`,
            name: `Penyewa Kamar ${num}`,
            whatsapp: '6281234567890',
            checkInDate: '2026-09-01',
            durationMonths: 6,
            totalPaid: isVip ? 1650000 * 6 : 1350000 * 6,
            ktpImageUrl: '',
            selfieImageUrl: '',
            status: 'active',
            createdAt: '2026-09-01',
          }
        : null,
    });
  }

  // Lantai 2: Kamar 201 - 215 (15 Kamar)
  for (let i = 1; i <= 15; i++) {
    const num = `20${i < 10 ? `0${i}` : i}`;
    rooms.push({
      id: `room-${num}`,
      roomNumber: num,
      floor: 2,
      type: 'Deluxe AC',
      priceMonthly: 1350000,
      status: i % 3 === 0 ? 'occupied' : 'available',
      facilities: ['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'],
      dimensions: '3.5 x 4 meter',
      tenant: i % 3 === 0
        ? {
            id: `tenant-${num}`,
            name: `Penyewa Kamar ${num}`,
            whatsapp: '6285785001234',
            checkInDate: '2026-09-10',
            durationMonths: 3,
            totalPaid: 1350000 * 3,
            ktpImageUrl: '',
            selfieImageUrl: '',
            status: 'active',
            createdAt: '2026-09-10',
          }
        : null,
    });
  }

  // Lantai 3: Kamar 301 - 305 (5 Kamar)
  for (let i = 1; i <= 5; i++) {
    const num = `30${i}`;
    rooms.push({
      id: `room-${num}`,
      roomNumber: num,
      floor: 3,
      type: 'Standard AC',
      priceMonthly: 1200000,
      status: i === 2 ? 'occupied' : i === 5 ? 'maintenance' : 'available',
      facilities: ['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'],
      dimensions: '3 x 3.5 meter',
      tenant: i === 2
        ? {
            id: `tenant-${num}`,
            name: `Penyewa Kamar ${num}`,
            whatsapp: '6289562946014',
            checkInDate: '2026-08-15',
            durationMonths: 12,
            totalPaid: 1200000 * 12,
            ktpImageUrl: '',
            selfieImageUrl: '',
            status: 'active',
            createdAt: '2026-08-15',
          }
        : null,
    });
  }

  return rooms;
}

export function calculateMonthlyReport(rooms: RoomItem[]): MonthlyReportSummary {
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const pendingRooms = rooms.filter((r) => r.status === 'pending').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  let actualRevenue = 0;
  let potentialRevenue = 0;

  const floorStats: Record<number, { occupied: number; revenue: number }> = {
    1: { occupied: 0, revenue: 0 },
    2: { occupied: 0, revenue: 0 },
    3: { occupied: 0, revenue: 0 },
  };

  rooms.forEach((r) => {
    potentialRevenue += r.priceMonthly;
    if (r.status === 'occupied') {
      actualRevenue += r.priceMonthly;
      if (floorStats[r.floor]) {
        floorStats[r.floor].occupied += 1;
        floorStats[r.floor].revenue += r.priceMonthly;
      }
    }
  });

  const floorRevenues = [
    { floor: 1, occupied: floorStats[1].occupied, revenue: floorStats[1].revenue },
    { floor: 2, occupied: floorStats[2].occupied, revenue: floorStats[2].revenue },
    { floor: 3, occupied: floorStats[3].occupied, revenue: floorStats[3].revenue },
  ];

  const now = new Date();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return {
    monthYear,
    totalRooms,
    occupiedRooms,
    availableRooms,
    pendingRooms,
    maintenanceRooms,
    occupancyRate,
    actualRevenue,
    potentialRevenue,
    floorRevenues,
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

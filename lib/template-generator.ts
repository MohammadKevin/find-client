export type OutreachCategory =
  | 'kos'
  | 'wedding'
  | 'properti'
  | 'rental'
  | 'umkm'
  | 'jasa'
  | 'general';

export interface CategoryOption {
  id: OutreachCategory;
  label: string;
  badge: string;
  description: string;
}

export const OUTREACH_CATEGORIES: CategoryOption[] = [
  {
    id: 'umkm',
    label: 'UMKM, Kuliner & Retail (Katalog & Stand QR)',
    badge: 'Katalog & Stand QR Kasir',
    description: 'Katalog visual cepat, order direct-to-WA, plus stand akrilik QR review kasir untuk mendongkrak bintang 5.',
  },
  {
    id: 'kos',
    label: 'Kos-Kosan & Homestay (Booking & Kamar)',
    badge: 'Katalog Kamar & KTP',
    description: 'Katalog ketersediaan live, verifikasi KTP penyewa aman, dan auto-reminder jatuh tempo WA.',
  },
  {
    id: 'jasa',
    label: 'Klinik, Bimbel & Jasa Servis (Reservasi & Profil)',
    badge: 'Reservasi & Stand QR',
    description: 'Jadwal layanan instan tanpa chat manual panjang plus stand akrilik QR Google Maps di meja resepsionis.',
  },
  {
    id: 'wedding',
    label: 'Wedding, Event & Fotografi (Galeri & Jadwal)',
    badge: 'Galeri HD & Booking',
    description: 'Showcase portofolio visual estetik, rincian paket pricelist, dan booking tanggal acara.',
  },
  {
    id: 'properti',
    label: 'Kontraktor, Arsitek & Desain Interior',
    badge: 'Portofolio & Estimasi RAB',
    description: 'Showcase proyek hasil bangun/renovasi, testimoni, dan konsultasi estimasi anggaran proyek.',
  },
  {
    id: 'rental',
    label: 'Rental Mobil, Motor & Sewa Alat',
    badge: 'Katalog Armada & Jadwal',
    description: 'Katalog ketersediaan unit armada, syarat sewa cepat, dan booking langsung ke admin WA.',
  },
  {
    id: 'general',
    label: 'Bisnis Independen Lokal (Value-First)',
    badge: 'Otomasi Alur & Stand QR',
    description: 'Audit ringan, optimasi alur order/reservasi pelanggan, dan stand akrilik QR review kasir.',
  },
];

const KOS_KEYWORDS = [
  'kos',
  'kost',
  'kostan',
  'kosan',
  'homestay',
  'guesthouse',
  'guest house',
  'penginapan',
  'asrama',
  'wisma',
  'residence',
  'boarding house',
  'kontrakan',
  'villa',
];

const WEDDING_KEYWORDS = [
  'wedding',
  'wo',
  'organizer',
  'fotografer',
  'fotografi',
  'photography',
  'videografi',
  'mua',
  'makeup',
  'make up',
  'dekorasi',
  'sewa gaun',
  'jas',
  'kebaya',
  'undangan',
  'event organizer',
  'eo',
];

const PROPERTI_KEYWORDS = [
  'kontraktor',
  'arsitek',
  'interior',
  'renovasi',
  'mebel',
  'furniture',
  'baja ringan',
  'kanopi',
  'aluminium',
  'kusen',
  'tukang',
  'plafon',
  'kitchen set',
];

const RENTAL_KEYWORDS = [
  'rental',
  'sewa mobil',
  'sewa motor',
  'rent car',
  'persewaan',
  'sewa kamera',
  'sewa alat',
  'camping',
  'outdoor',
  'tour',
  'travel',
  'charter',
];

const UMKM_KEYWORDS = [
  'konveksi',
  'florist',
  'bunga',
  'katering',
  'catering',
  'bakery',
  'kue',
  'roti',
  'sablon',
  'kaos',
  'baju',
  'fashion',
  'butik',
  'kerajinan',
  'souvenir',
  'percetakan',
  'printing',
  'toko',
  'distributor',
  'grosir',
  'snack',
  'kuliner',
  'frozen food',
  'hijab',
  'sepatu',
  'tas',
  'cafe',
  'kafe',
  'warung',
  'resto',
  'restoran',
  'kedai',
  'depot',
];

const JASA_KEYWORDS = [
  'bimbel',
  'bimbingan',
  'les',
  'kursus',
  'daycare',
  'sekolah',
  'klinik',
  'dokter',
  'apotek',
  'dental',
  'gigi',
  'bengkel',
  'servis',
  'service',
  'cuci',
  'carwash',
  'salon',
  'barbershop',
  'spa',
  'laundry',
  'notaris',
  'kantor',
  'konsultan',
  'logistik',
  'ekspedisi',
  'gym',
  'fitness',
  'studio',
  'fisioterapi',
  'terapi',
];

export function detectCategory(businessName: string, query?: string): OutreachCategory {
  const combined = `${businessName} ${query || ''}`.toLowerCase();

  for (const kw of KOS_KEYWORDS) {
    if (combined.includes(kw)) return 'kos';
  }
  for (const kw of WEDDING_KEYWORDS) {
    if (combined.includes(kw)) return 'wedding';
  }
  for (const kw of PROPERTI_KEYWORDS) {
    if (combined.includes(kw)) return 'properti';
  }
  for (const kw of RENTAL_KEYWORDS) {
    if (combined.includes(kw)) return 'rental';
  }
  for (const kw of UMKM_KEYWORDS) {
    if (combined.includes(kw)) return 'umkm';
  }
  for (const kw of JASA_KEYWORDS) {
    if (combined.includes(kw)) return 'jasa';
  }

  return 'general';
}

export interface GenerateTemplateParams {
  businessName: string;
  category?: OutreachCategory | string;
  senderName?: string;
  senderRole?: string;
  rating?: number;
  userRatingCount?: number;
  address?: string;
}

export function generateOutreachMessage({
  businessName,
  category = 'general',
}: GenerateTemplateParams): string {
  const name = businessName ? businessName.trim() : 'Bapak/Ibu';

  if (category === 'kos') {
    return `Halo Kak/Pak di ${name}, salam kenal! Saya perhatikan ulasan dan lokasi kosnya di Google Maps sudah sangat strategis.

Biar calon penghuni tidak bolak-balik tanya kamar kosong dan verifikasi KTP lebih rapi, saya bisa bantu siapkan katalog kamar live & alur booking otomatis. Plus desain stand akrilik QR review di resepsionis.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
  }

  if (category === 'wedding') {
    return `Halo Kak di ${name}, salam kenal! Saya lihat hasil karya dan review ${name} di Google Maps sangat estetik dan berkelas.

Biar calon pengantin bisa langsung cek pricelist dan booking jadwal tanpa chat manual panjang, saya bisa bantu siapkan showcase portofolio interaktif langsung ke WhatsApp.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
  }

  if (category === 'properti') {
    return `Halo Pak/Bu di ${name}, salam kenal! Portofolio pengerjaan ${name} di Google Maps terlihat sangat rapi dan kredibel.

Biar calon klien proyek bisa langsung lihat galeri hasil renovasi & estimasi konsultasi anggaran dengan cepat, saya bisa siapkan halaman portofolio interaktif.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Bapak/Ibu?`;
  }

  if (category === 'rental') {
    return `Halo Kak/Pak di ${name}, salam kenal! Saya perhatikan rental ${name} di Google Maps rating ulasannya sangat bagus.

Biar calon penyewa bisa langsung cek ketersediaan armada & syarat sewa tanpa bolak-balik tanya admin, saya bisa bantu siapkan katalog booking otomatis ke WhatsApp.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
  }

  if (category === 'umkm') {
    return `Halo Kak/Pak di ${name}, salam kenal! Saya perhatikan ulasan ${name} di Google Maps sangat ramai dan positif.

Supaya admin tidak kewalahan balas chat tanya menu & harga berulang kali, saya bisa bantu buatkan katalog order instan langsung ke WA plus stand akrilik QR review untuk di meja kasir.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
  }

  if (category === 'jasa') {
    return `Halo Kak/Pak di ${name}, salam kenal! Saya lihat reputasi layanan ${name} di Google Maps sudah sangat bagus.

Biar jadwal reservasi dan info layanan bisa dicek otomatis tanpa antre chat, saya bisa siapkan alur booking ringkas plus stand akrilik QR Google review di kasir/resepsionis.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
  }

  return `Halo Kak/Pak di ${name}, salam kenal! Saya lihat profil dan ulasan ${name} di Google Maps sangat positif di area sekitar.

Biar alur order pelanggan tidak manual dan bisa tambah ulasan bintang 5 lewat stand akrilik QR di kasir, saya bisa bantu buatkan sistem alur praktis langsung terhubung ke WhatsApp.

Boleh saya buatkan demo alur/sistemnya dulu tanpa biaya Kak?`;
}

export function createWhatsAppOutreachUrl(
  phone: string,
  params: GenerateTemplateParams
): string {
  const message = generateOutreachMessage(params);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedText}`;
}

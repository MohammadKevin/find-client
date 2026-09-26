export type OutreachCategory = 'umkm' | 'jasa' | 'general';

export interface CategoryOption {
  id: OutreachCategory;
  label: string;
  badge: string;
  description: string;
}

export const OUTREACH_CATEGORIES: CategoryOption[] = [
  {
    id: 'umkm',
    label: 'UMKM / Retail (Konveksi, Florist, Katering, Toko)',
    badge: 'Katalog & Order',
    description: 'Fokus pada katalog visual, daftar harga, dan alur order praktis tanpa chat manual panjang.',
  },
  {
    id: 'jasa',
    label: 'Instansi / Jasa (Bimbel, Kursus, Klinik, Bengkel)',
    badge: 'Profil & Kredibilitas',
    description: 'Fokus pada landing page profil resmi, jam layanan/jadwal, kredibilitas Google, dan tombol kontak langsung.',
  },
  {
    id: 'general',
    label: 'Umum / Standar',
    badge: 'Penawaran Website',
    description: 'Pendekatan umum pembuatan website modern dan profesional untuk meningkatkan branding bisnis.',
  },
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
  'mebel',
  'furniture',
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
  'arsitek',
  'kontraktor',
  'logistik',
  'ekspedisi',
  'penginapan',
  'hotel',
  'homestay',
  'kost',
  'kos',
  'gym',
  'fitness',
  'studio',
  'tour',
  'travel',
];

export function detectCategory(businessName: string, query?: string): OutreachCategory {
  const combined = `${businessName} ${query || ''}`.toLowerCase();

  for (const kw of UMKM_KEYWORDS) {
    if (combined.includes(kw)) {
      return 'umkm';
    }
  }

  for (const kw of JASA_KEYWORDS) {
    if (combined.includes(kw)) {
      return 'jasa';
    }
  }

  return 'general';
}

export interface GenerateTemplateParams {
  businessName: string;
  category?: OutreachCategory | string;
  senderName?: string;
  senderRole?: string;
}

export function generateOutreachMessage({
  businessName,
  category = 'general',
  senderName = '',
  senderRole = 'freelance web developer',
}: GenerateTemplateParams): string {
  const name = businessName ? businessName.trim() : 'Bapak/Ibu';
  const intro = senderName
    ? `Saya ${senderName}, ${senderRole}.`
    : `Saya ${senderRole}.`;

  if (category === 'umkm') {
    return `Halo Kak/Admin ${name}, salam kenal! ${intro}

Saya perhatikan produk ${name} sangat menarik dan potensial di Google Maps.

Saya ingin menawarkan pembuatan website katalog visual interaktif & daftar harga untuk ${name} agar pelanggan bisa langsung:
- Melihat katalog produk lengkap dengan foto berkualitas
- Mengecek daftar harga terupdate tanpa perlu bolak-balik tanya admin
- Alur pemesanan langsung terhubung ke WhatsApp

Dengan website katalog, tim ${name} bisa hemat waktu melayani chat tanya harga berulang kali dan penjualan jadi lebih praktis.

Apakah saat ini ${name} ada rencana untuk memiliki website katalog resmi sendiri? Jika berkenan, saya bisa buatkan preview/demo desain gratisnya terlebih dahulu untuk dilihat. Terima kasih banyak!`;
  }

  if (category === 'jasa') {
    return `Halo Bapak/Ibu/Admin ${name}, salam kenal! ${intro}

Saya menemukan profil ${name} di Google Maps dengan ulasan yang sangat baik.

Saya melihat ${name} belum memiliki website resmi. Saya ingin menawarkan pembuatan landing page profil profesional untuk ${name} yang memuat:
- Informasi lengkap profil layanan & keunggulan
- Jadwal operasional, paket layanan, dan daftar harga resmi
- Testimoni pelanggan untuk memperkuat kredibilitas di pencarian Google
- Tombol konsultasi / booking langsung ke WhatsApp

Website resmi sangat penting agar calon klien merasa lebih percaya dan mudah mendapatkan info valid tanpa harus mencari ke mana-mana.

Boleh saya buatkan contoh preview/demo singkatnya terlebih dahulu untuk ${name}? Terima kasih banyak atas waktunya!`;
  }

  return `Halo Kak/Admin ${name}, salam kenal! ${intro}

Saya melihat profil bisnis ${name} di Google Maps memiliki potensi pasar yang sangat bagus, namun sepertinya belum memiliki website resmi.

Saya ingin menawarkan pembuatan website modern, cepat, dan mobile-friendly yang dirancang khusus untuk meningkatkan kredibilitas serta mempermudah calon pelanggan menemukan dan menghubungi ${name}.

Apakah saat ini ada kebutuhan atau rencana untuk pembuatan website resmi ${name}? Jika tertarik, saya dengan senang hati bisa mengirimkan portofolio atau membuatkan preview desain awal secara gratis. Terima kasih!`;
}

export function createWhatsAppOutreachUrl(
  phone: string,
  params: GenerateTemplateParams
): string {
  const message = generateOutreachMessage(params);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedText}`;
}

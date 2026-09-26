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
    id: 'kos',
    label: 'Kos-Kosan & Homestay (Booking & Kamar)',
    badge: 'Katalog Kamar & KTP',
    description: 'Fokus pada katalog kamar live, form booking online dengan upload KTP aman, dan auto-reminder tagihan WA.',
  },
  {
    id: 'umkm',
    label: 'UMKM & Kuliner (Konveksi, Florist, Katering, Toko)',
    badge: 'Katalog & Order WA',
    description: 'Fokus pada katalog visual, daftar harga, dan alur order praktis tanpa chat manual panjang.',
  },
  {
    id: 'jasa',
    label: 'Instansi, Bimbel & Klinik (Profil & Jadwal)',
    badge: 'Profil & Kredibilitas',
    description: 'Fokus pada landing page profil resmi, jam layanan/jadwal dokter, kredibilitas Google, dan tombol kontak langsung.',
  },
  {
    id: 'wedding',
    label: 'Wedding, Event & Fotografi (Portofolio & Paket)',
    badge: 'Galeri & Booking Tanggal',
    description: 'Fokus showcase galeri foto/video megah, rincian paket pricelist, dan booking jadwal acara.',
  },
  {
    id: 'properti',
    label: 'Kontraktor, Arsitek & Desain Interior',
    badge: 'Showcase Proyek & RAB',
    description: 'Fokus portofolio hasil bangun/renovasi, testimoni klien, dan formulir konsultasi estimasi anggaran.',
  },
  {
    id: 'rental',
    label: 'Rental Mobil, Motor & Sewa Alat',
    badge: 'Katalog Armada & Jadwal',
    description: 'Fokus katalog unit armada/barang sewa, cek tanggal ketersediaan, dan syarat booking cepat.',
  },
  {
    id: 'general',
    label: 'Umum / Standar',
    badge: 'Penawaran Website',
    description: 'Pendekatan umum pembuatan website modern dan profesional untuk meningkatkan branding bisnis.',
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
  'kusen',
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

  if (category === 'kos') {
    return `Halo Bapak/Ibu/Admin ${name}, salam kenal! ${intro}

Saya menemukan profil ${name} di Google Maps dan melihat lokasi serta fasilitasnya sangat potensial untuk calon penghuni baru.

Saya ingin menawarkan pembuatan Website Manajemen & Booking Kamar Resmi untuk ${name} yang dilengkapi fitur:
- Katalog ketersediaan kamar live (Tersedia / Terisi) agar calon penyewa bisa cek kamar kosong langsung
- Formulir booking online + upload foto KTP penyewa (tersimpan aman & privat untuk verifikasi)
- Pengingat otomatis tagihan sewa ke WhatsApp anak kos tiap jatuh tempo (bebas repot nagih manual)
- Rekap keuangan & pemasukan bulanan otomatis

Website ini bisa dibuat sekali bayar tanpa ada biaya langganan bulanan selamanya. Boleh saya buatkan contoh preview/demo gratisnya terlebih dahulu untuk dilihat Bapak/Ibu? Terima kasih! 🙏`;
  }

  if (category === 'wedding') {
    return `Halo Kak/Admin ${name}, salam kenal! ${intro}

Saya melihat portofolio ${name} di Google Maps sangat berkelas dan banyak ulasan positif dari klien.

Saya ingin menawarkan pembuatan Website Showcase & Booking Portofolio Resmi untuk ${name} agar calon pengantin bisa langsung:
- Melihat galeri foto & video hasil karya berkualitas tinggi (HD)
- Mengecek rincian paket pricelist dan fasilitas yang didapat
- Konsultasi booking jadwal tanggal acara langsung ke WhatsApp

Dengan website resmi, citra brand ${name} akan terlihat jauh lebih eksklusif dan terpercaya dibanding hanya mengandalkan media sosial. Boleh saya buatkan preview desain awalnya secara gratis untuk dilihat Kak? Terima kasih!`;
  }

  if (category === 'properti') {
    return `Halo Bapak/Ibu/Admin ${name}, salam kenal! ${intro}

Saya melihat profil ${name} di Google Maps memiliki reputasi pengerjaan yang sangat baik.

Saya ingin menawarkan pembuatan Website Profil & Portofolio Proyek Resmi untuk ${name} yang menampilkan:
- Galeri proyek hasil bangun/renovasi/interior (Before & After)
- Penjelasan alur kerja, standar material, dan legalitas
- Formulir konsultasi & estimasi anggaran proyek (RAB) langsung ke WhatsApp

Website resmi sangat penting agar calon klien proyek merasa yakin dan percaya menyerahkan proyek bernilai besar ke ${name}. Boleh saya kirimkan portofolio atau buatkan demo desain gratisnya dulu Bapak/Ibu? Terima kasih!`;
  }

  if (category === 'rental') {
    return `Halo Kak/Admin ${name}, salam kenal! ${intro}

Saya melihat layanan rental ${name} di Google Maps memiliki rating yang sangat bagus.

Saya ingin menawarkan pembuatan Website Katalog Armada & Booking Sewa untuk ${name} agar pelanggan bisa langsung:
- Mengecek daftar unit kendaraan/alat lengkap dengan foto dan tarif harian/mingguan
- Mengetahui syarat sewa dan ketersediaan unit
- Alur pemesanan langsung terhubung ke WhatsApp admin

Website ini membuat calon penyewa baru dari Google Maps bisa langsung order tanpa harus tanya-tanya spesifikasi unit berulang kali. Boleh saya buatkan preview demo singkatnya terlebih dahulu Kak? Terima kasih!`;
  }

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

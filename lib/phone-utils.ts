export interface PhoneAnalysis {
  raw: string;
  cleaned: string;
  isValid: boolean;
  isMobile: boolean;
  type: 'mobile' | 'landline' | 'invalid' | 'unknown';
  formattedDisplay: string;
  notes?: string;
}

const INDONESIAN_LANDLINE_PREFIXES = [
  '21',   // Jakarta, Tangerang, Bekasi, Depok
  '22',   // Bandung, Cimahi
  '231',  // Cirebon
  '232',  // Kuningan
  '233',  // Majalengka
  '234',  // Indramayu
  '24',   // Semarang
  '251',  // Bogor
  '252',  // Lebak
  '253',  // Pandeglang
  '254',  // Serang, Cilegon
  '260',  // Subang
  '261',  // Sumedang
  '262',  // Garut
  '263',  // Cianjur
  '264',  // Purwakarta
  '265',  // Tasikmalaya, Ciamis, Banjar
  '266',  // Sukabumi
  '267',  // Karawang
  '271',  // Solo / Surakarta, Sragen, Karanganyar, Sukoharjo, Klaten
  '272',  // Klaten
  '273',  // Wonogiri
  '274',  // Yogyakarta, Sleman, Bantul, Gunungkidul, Kulon Progo
  '275',  // Purworejo
  '276',  // Boyolali
  '280',  // Majenang, Cilacap barat
  '281',  // Purwokerto, Banyumas, Purbalingga
  '282',  // Cilacap
  '283',  // Tegal, Brebes
  '284',  // Pemalang
  '285',  // Pekalongan, Batang
  '286',  // Banjarnegara, Wonosobo
  '287',  // Kebumen
  '291',  // Kudus, Jepara, Demak
  '292',  // Purwodadi, Grobogan
  '293',  // Magelang, Temanggung
  '294',  // Kendal, Weleri
  '295',  // Pati, Rembang
  '296',  // Blora, Cepu
  '297',  // Karimun Jawa
  '298',  // Salatiga, Ambarawa
  '31',   // Surabaya, Sidoarjo, Gresik, Bangkalan
  '321',  // Mojokerto, Jombang
  '322',  // Lamongan
  '323',  // Sampang
  '324',  // Pamekasan
  '325',  // Bawean
  '328',  // Sumenep
  '331',  // Jember
  '332',  // Bondowoso
  '333',  // Banyuwangi
  '334',  // Lumajang
  '335',  // Probolinggo
  '338',  // Situbondo
  '341',  // Malang, Batu
  '342',  // Blitar
  '343',  // Pasuruan
  '351',  // Madiun, Magetan, Ngawi
  '352',  // Ponorogo
  '353',  // Bojonegoro
  '354',  // Kediri
  '355',  // Tulungagung, Trenggalek
  '356',  // Tuban
  '357',  // Pacitan
  '358',  // Nganjuk
  '361',  // Denpasar, Badung, Gianyar, Tabanan
  '362',  // Singaraja, Buleleng
  '363',  // Karangasem
  '365',  // Negara, Jembrana
  '366',  // Klungkung, Bangli
  '368',  // Baturiti
  '370',  // Mataram, Lombok Barat/Tengah
  '371',  // Sumbawa
  '372',  // Sumbawa Barat
  '373',  // Dompu
  '374',  // Bima
  '376',  // Lombok Timur
  '380',  // Kupang
  '411',  // Makassar, Maros, Gowa
  '541',  // Samarinda
  '542',  // Balikpapan
  '61',   // Medan, Binjai, Deli Serdang
  '711',  // Palembang
  '751',  // Padang
  '761',  // Pekanbaru
  '778',  // Batam
];

export function cleanPhoneNumber(rawPhone?: string | null): PhoneAnalysis {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      raw: '',
      cleaned: '',
      isValid: false,
      isMobile: false,
      type: 'invalid',
      formattedDisplay: '-',
      notes: 'Nomor telepon tidak tersedia',
    };
  }

  const rawTrimmed = rawPhone.trim();
  const digitsOnly = rawTrimmed.replace(/\D/g, '');

  if (!digitsOnly || digitsOnly.length < 5) {
    return {
      raw: rawTrimmed,
      cleaned: '',
      isValid: false,
      isMobile: false,
      type: 'invalid',
      formattedDisplay: rawTrimmed,
      notes: 'Format nomor tidak valid atau terlalu pendek',
    };
  }

  let normalized = digitsOnly;
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (normalized.startsWith('8')) {
    normalized = '62' + normalized;
  } else if (!normalized.startsWith('62')) {
    if (normalized.startsWith('620')) {
      normalized = '62' + normalized.slice(3);
    }
  }

  if (normalized.startsWith('628')) {
    const isMobileValid = normalized.length >= 10 && normalized.length <= 15;
    return {
      raw: rawTrimmed,
      cleaned: normalized,
      isValid: isMobileValid,
      isMobile: true,
      type: 'mobile',
      formattedDisplay: formatIndonesianPhone(normalized),
      notes: isMobileValid ? 'Nomor WhatsApp Valid (Seluler)' : 'Panjang nomor seluler tidak umum',
    };
  }

  if (normalized.startsWith('62')) {
    const localPart = normalized.slice(2);
    const isKnownLandline = INDONESIAN_LANDLINE_PREFIXES.some((prefix) =>
      localPart.startsWith(prefix)
    );

    const startsWithLandlineDigit = ['2', '3', '4', '5', '7', '9'].some((d) =>
      localPart.startsWith(d)
    );

    if (isKnownLandline || startsWithLandlineDigit) {
      return {
        raw: rawTrimmed,
        cleaned: normalized,
        isValid: true,
        isMobile: false,
        type: 'landline',
        formattedDisplay: formatIndonesianPhone(normalized),
        notes: 'Nomor Telepon Kantor / Kabel (PSTN) - Bukan WhatsApp',
      };
    }
  }

  return {
    raw: rawTrimmed,
    cleaned: normalized,
    isValid: normalized.length >= 7,
    isMobile: false,
    type: 'unknown',
    formattedDisplay: formatIndonesianPhone(normalized),
    notes: 'Tipe nomor tidak teridentifikasi sebagai seluler Indonesia',
  };
}

export function formatIndonesianPhone(phone: string): string {
  if (!phone) return '-';
  if (phone.startsWith('628')) {
    const p1 = phone.slice(0, 4); // 6281
    const p2 = phone.slice(4, 8); // 2345
    const p3 = phone.slice(8);    // 6789
    return `+${p1.slice(0, 2)} ${p1.slice(2)}-${p2}-${p3}`;
  }
  if (phone.startsWith('62')) {
    return `+62 ${phone.slice(2)}`;
  }
  return phone;
}

export function isValidWhatsApp(phone?: string | null): boolean {
  const analysis = cleanPhoneNumber(phone);
  return analysis.isValid && analysis.isMobile;
}

export function getWhatsAppDirectUrl(phone: string, message?: string): string | null {
  const analysis = cleanPhoneNumber(phone);
  if (!analysis.isValid || !analysis.isMobile) {
    return null;
  }
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${analysis.cleaned}${textParam}`;
}

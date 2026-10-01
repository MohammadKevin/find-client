export interface PhoneAnalysis {
  raw: string;
  cleaned: string;
  isValid: boolean;
  isMobile: boolean;
  type: 'mobile' | 'landline' | 'international' | 'invalid' | 'unknown';
  formattedDisplay: string;
  notes?: string;
  countryCode?: string;
}

const INDONESIAN_LANDLINE_PREFIXES = [
  '21', '22', '231', '232', '233', '234', '24', '251', '252', '253', '254',
  '260', '261', '262', '263', '264', '265', '266', '267', '271', '272', '273',
  '274', '275', '276', '280', '281', '282', '283', '284', '285', '286', '287',
  '291', '292', '293', '294', '295', '296', '297', '298', '31', '321', '322',
  '323', '324', '325', '328', '331', '332', '333', '334', '335', '338', '341',
  '342', '343', '351', '352', '353', '354', '355', '356', '357', '358', '361',
  '362', '363', '365', '366', '368', '370', '371', '372', '373', '374', '376',
  '380', '411', '541', '542', '61', '711', '751', '761', '778',
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

  if (rawTrimmed.startsWith('08') || rawTrimmed.startsWith('+62') || rawTrimmed.startsWith('628') || rawTrimmed.startsWith('0')) {
    let normalized = digitsOnly;
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.slice(1);
    } else if (normalized.startsWith('8')) {
      normalized = '62' + normalized;
    } else if (normalized.startsWith('620')) {
      normalized = '62' + normalized.slice(3);
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
        notes: isMobileValid ? 'WhatsApp Seluler Indonesia' : 'Panjang nomor tidak lazim',
        countryCode: 'ID',
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
          notes: 'Nomor Kantor PSTN / Kabel (Bukan WA)',
          countryCode: 'ID',
        };
      }
    }
  }

  let intlCleaned = digitsOnly;
  if (rawTrimmed.startsWith('+')) {
    intlCleaned = digitsOnly;
  }

  if (intlCleaned.length >= 7 && intlCleaned.length <= 16) {
    let detectedCountry = 'Global';
    if (intlCleaned.startsWith('44')) detectedCountry = 'UK';
    else if (intlCleaned.startsWith('1')) detectedCountry = 'US/CA';
    else if (intlCleaned.startsWith('49')) detectedCountry = 'DE';
    else if (intlCleaned.startsWith('33')) detectedCountry = 'FR';
    else if (intlCleaned.startsWith('31')) detectedCountry = 'NL';
    else if (intlCleaned.startsWith('61')) detectedCountry = 'AU';
    else if (intlCleaned.startsWith('65')) detectedCountry = 'SG';
    else if (intlCleaned.startsWith('971')) detectedCountry = 'UAE';

    return {
      raw: rawTrimmed,
      cleaned: intlCleaned,
      isValid: true,
      isMobile: true,
      type: 'international',
      formattedDisplay: `+${intlCleaned}`,
      notes: `Nomor Internasional (${detectedCountry})`,
      countryCode: detectedCountry,
    };
  }

  return {
    raw: rawTrimmed,
    cleaned: digitsOnly,
    isValid: digitsOnly.length >= 7,
    isMobile: true,
    type: 'unknown',
    formattedDisplay: rawTrimmed,
    notes: 'Nomor Internasional / Luar Negeri',
  };
}

export function formatIndonesianPhone(phone: string): string {
  if (!phone) return '-';
  if (phone.startsWith('628')) {
    const p1 = phone.slice(0, 4);
    const p2 = phone.slice(4, 8);
    const p3 = phone.slice(8);
    return `+${p1.slice(0, 2)} ${p1.slice(2)}-${p2}-${p3}`;
  }
  if (phone.startsWith('62')) {
    return `+62 ${phone.slice(2)}`;
  }
  return phone;
}

export function normalizeWhatsAppNumber(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits || digits.length < 5) return '';

  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (normalized.startsWith('8')) {
    normalized = '62' + normalized;
  } else if (normalized.startsWith('620')) {
    normalized = '62' + normalized.slice(3);
  }

  return normalized;
}

export function toLocalIdPhone(phone?: string | null): string {
  if (!phone) return '';
  const normalized = normalizeWhatsAppNumber(phone);
  if (normalized.startsWith('62')) {
    return '0' + normalized.slice(2);
  }
  return normalized;
}

export const INITIAL_CONTACTED_NUMBERS: string[] = [];

export const INITIAL_CONTACTED_SET = new Set<string>();

export function getInitialContactedRegistry(): Record<
  string,
  { cleanPhone: string; contactedAt: string; businessName: string; status: 'contacted' }
> {
  return {};
}

export function isPhoneContacted(
  phone?: string | null,
  phoneRegistry?: Record<string, { status?: string }>
): boolean {
  if (!phone) return false;
  const clean = normalizeWhatsAppNumber(phone);
  if (!clean) return false;
  if (INITIAL_CONTACTED_SET.has(clean)) return true;
  if (phoneRegistry && phoneRegistry[clean]) {
    const st = phoneRegistry[clean].status;
    return st === 'contacted' || st === 'followup' || st === 'closed';
  }
  return false;
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

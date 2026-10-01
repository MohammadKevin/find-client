export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'IN_PROGRESS'
  | 'LOST_FRANCHISE'
  | 'LOST_REJECTED'
  | 'CLOSED'
  | 'UNQUALIFIED_FRANCHISE'
  | 'UNQUALIFIED_CORPORATE';

export type RejectionReason =
  | 'Franchise'
  | 'No Budget'
  | 'Already Has Vendor'
  | 'No Response'
  | 'Corporate'
  | null;

export type PriorityScore = 'HIGH' | 'MEDIUM' | 'LOW' | 'DISQUALIFIED';

export interface LeadQualificationResult {
  status: LeadStatus;
  priorityScore: PriorityScore;
  rejectionReason: RejectionReason;
  isIdealTarget: boolean;
  qualificationNotes: string;
  isFranchise: boolean;
  isCorporate: boolean;
  hasFreeWebsite: boolean;
}

export interface LeadEntity {
  id: string;
  business_name: string;
  category: string;
  phone_number: string;
  normalized_phone: string;
  maps_url: string;
  rating: number;
  review_count: number;
  website: string | null;
  priority_score: PriorityScore;
  lead_status: LeadStatus;
  rejection_reason: RejectionReason;
  generated_pitch: string;
  last_sync_at: string;
  qualification_notes?: string;
  is_ideal_target: boolean;
}

export const FRANCHISE_BLACKLIST_KEYWORDS = [
  'cabang',
  'unit',
  'franchise',
  'kemitraan',
  'alfamart',
  'indomaret',
  'kumon',
  'sakamoto',
  'mixue',
  'kopi kenangan',
  'spbu',
  'pertamina',
  'apf',
  'j&t',
  'jne',
  'lawson',
  'point coffee',
  'janji jiwa',
  'kfc',
  'mcdonald',
  'mcdonalds',
  'richeese',
  'chatime',
  'starbucks',
  'dunkin',
  'hokben',
  'solaria',
  'fore coffee',
  'indomaret point',
  'alfamidi',
  'si cepat',
  'sicepat',
  'anteraja',
  'tiki',
  'pos indonesia',
  'ninja express',
  'wahana express',
  'haus!',
  'teh solo',
  'esteh indonesia',
  'es teh indonesia',
];

export const FREE_WEBSITE_DOMAINS = [
  'blogspot.com',
  'wordpress.com',
  'linktr.ee',
  'site.google.com',
  'sites.google.com',
  'wixsite.com',
  'carrd.co',
  'canva.site',
  'myshopify.com',
  'tokoko.id',
  'biolinky.co',
  'page.link',
  'weebly.com',
  'yolasite.com',
  'strikingly.com',
];

export const CORPORATE_DOMAINS = [
  '.co.id',
  '.ac.id',
  '.go.id',
  '.mil.id',
  '.or.id',
  '.sch.id',
];

export function isFranchiseOrBlacklisted(name?: string | null): {
  isFranchise: boolean;
  matchedKeyword?: string;
} {
  if (!name || typeof name !== 'string') {
    return { isFranchise: false };
  }

  const normalizedName = ` ${name.toLowerCase().replace(/[^\w\s&]/g, ' ')} `;

  for (const keyword of FRANCHISE_BLACKLIST_KEYWORDS) {
    const pattern = new RegExp(`(^|\\s|[^a-zA-Z0-9])${keyword.replace(/&/g, '\\&')}($|\\s|[^a-zA-Z0-9])`, 'i');
    if (pattern.test(normalizedName) || normalizedName.includes(` ${keyword.toLowerCase()} `)) {
      return { isFranchise: true, matchedKeyword: keyword };
    }
  }

  return { isFranchise: false };
}

export function isFreeWebsiteDomain(website?: string | null): boolean {
  if (!website || typeof website !== 'string') return false;
  const lower = website.toLowerCase();
  return FREE_WEBSITE_DOMAINS.some((domain) => lower.includes(domain));
}

export function isCorporateWebsiteDomain(website?: string | null): boolean {
  if (!website || typeof website !== 'string') return false;
  const lower = website.toLowerCase();
  return CORPORATE_DOMAINS.some((domain) => lower.includes(domain));
}

export function evaluateLeadQualification(params: {
  name: string;
  website?: string | null;
  rating?: number;
  reviewCount?: number;
}): LeadQualificationResult {
  const { name, website, rating = 0, reviewCount = 0 } = params;

  const franchiseCheck = isFranchiseOrBlacklisted(name);
  if (franchiseCheck.isFranchise) {
    return {
      status: 'UNQUALIFIED_FRANCHISE',
      priorityScore: 'DISQUALIFIED',
      rejectionReason: 'Franchise',
      isIdealTarget: false,
      qualificationNotes: `Terdeteksi jaringan franchise/cabang (${franchiseCheck.matchedKeyword})`,
      isFranchise: true,
      isCorporate: false,
      hasFreeWebsite: false,
    };
  }

  const cleanWebsite = typeof website === 'string' ? website.trim() : '';
  const hasWebsite = Boolean(cleanWebsite && cleanWebsite.length > 0);
  const isCorporate = hasWebsite && isCorporateWebsiteDomain(cleanWebsite);

  if (isCorporate) {
    return {
      status: 'UNQUALIFIED_CORPORATE',
      priorityScore: 'DISQUALIFIED',
      rejectionReason: 'Corporate',
      isIdealTarget: false,
      qualificationNotes: 'Domain korporat/institusi nasional (.co.id/.ac.id)',
      isFranchise: false,
      isCorporate: true,
      hasFreeWebsite: false,
    };
  }

  const isFreeWeb = hasWebsite && isFreeWebsiteDomain(cleanWebsite);
  const noWebsiteOrFree = !hasWebsite || isFreeWeb;

  const isIdealReviewCount = reviewCount >= 10 && reviewCount <= 100;
  const isGrowingBusiness = reviewCount >= 5 && reviewCount <= 250;

  let priorityScore: PriorityScore = 'LOW';
  let isIdealTarget = false;
  let notes = '';

  if (noWebsiteOrFree && isIdealReviewCount) {
    priorityScore = 'HIGH';
    isIdealTarget = true;
    notes = `Target Ideal: ${!hasWebsite ? 'Tanpa Website' : 'Domain Gratisan'} + ${reviewCount} ulasan (${rating}⭐) - Potensi tinggi otomasi alur/stand akrilik QR`;
  } else if (noWebsiteOrFree && isGrowingBusiness) {
    priorityScore = 'HIGH';
    isIdealTarget = true;
    notes = `Prioritas Tinggi: ${!hasWebsite ? 'Belum Ada Website' : 'Domain Gratisan'} & bisnis aktif (${reviewCount} ulasan)`;
  } else if (noWebsiteOrFree) {
    priorityScore = 'HIGH';
    isIdealTarget = false;
    notes = `Prioritas Tinggi: ${!hasWebsite ? 'Belum Memiliki Website' : 'Memakai Domain Gratisan'}`;
  } else if (isIdealReviewCount) {
    priorityScore = 'MEDIUM';
    isIdealTarget = false;
    notes = `Review Ideal (${reviewCount} ulasan), sudah ada website mandiri (potensi redesign/add-on otomasi)`;
  } else {
    priorityScore = 'LOW';
    isIdealTarget = false;
    notes = `Sudah memiliki website dan ${reviewCount} ulasan`;
  }

  return {
    status: 'QUALIFIED',
    priorityScore,
    rejectionReason: null,
    isIdealTarget,
    qualificationNotes: notes,
    isFranchise: false,
    isCorporate: false,
    hasFreeWebsite: isFreeWeb,
  };
}

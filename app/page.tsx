'use client';

import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPhone, faPaperPlane, faDownload, faCheckCircle, faTimesCircle, 
  faSync, faFileExcel, faBullseye, faMagic, faQuoteLeft, faUsers, faBolt, 
  faRobot, faClock, faCheckDouble, faBars, faTimes, faLock, faSignOutAlt, 
  faLayerGroup, faExclamationTriangle, faExternalLinkSquare, faCopy,
  faMapMarkerAlt, faStar, faEye, faMessage, faChevronDown, faMobileAlt,
  faArrowRight, faEnvelope, faCheckSquare, faDatabase, faSlidersH, faFilter,
  faCrosshairs, faShieldAlt, faShield, faLayerGroup as faLayered, faStarOfLife
} from '@fortawesome/free-solid-svg-icons';

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Mapping helper to replace the missing Lucide components with FontAwesome
const Icon = ({ icon, className }: { icon: any; className?: string }) => (
  <FontAwesomeIcon icon={icon} className={className} />
);

// Map common names to icon objects
  

import {
  generateOutreachMessage,
  detectCategory,
  OutreachCategory,
  OUTREACH_CATEGORIES,
} from '@/lib/template-generator';
import type { PlaceLead } from '@/app/api/places/route';
import {
  evaluateLeadQualification,
  LeadStatus,
  RejectionReason,
  PriorityScore,
} from '@/lib/lead-qualification';
import {
  normalizeWhatsAppNumber,
  isPhoneContacted,
  getInitialContactedRegistry,
} from '@/lib/phone-utils';
import { getRandomDelayMs } from '@/lib/whatsapp-queue';

type ActiveTab = 'mission' | 'search' | 'crm' | 'copilot' | 'templates' | 'export';
type OutreachStatus = 'new' | 'contacted' | 'followup' | 'closed' | 'rejected' | 'in_progress' | 'lost_franchise' | 'lost_rejected';
type CrmFilterStatus = 'all' | 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'INTERESTED' | 'IN_PROGRESS' | 'LOST_FRANCHISE' | 'LOST_REJECTED' | 'CLOSED';

interface LeadWithMeta extends PlaceLead {
  status: OutreachStatus;
  leadStatus: LeadStatus;
  selectedCategory: OutreachCategory;
  aiMessage?: string;
  generatedPitch?: string;
  customNotes?: string;
  addedAt?: string;
  lastSyncAt?: string;
  rejectionReason: RejectionReason;
  website?: string | null;
}

interface ContactedPhoneRecord {
  cleanPhone: string;
  contactedAt: string;
  businessName: string;
  status: OutreachStatus;
}

interface RemoteSheetRecord {
  business_name?: string;
  nama_bisnis?: string;
  name?: string;
  category?: string;
  kategori?: string;
  phone_number?: string;
  no_telepon?: string;
  phone?: string;
  normalized_phone?: string;
  normalizedPhone?: string;
  maps_url?: string;
  link_google_maps?: string;
  address?: string;
  rating?: number | string;
  review_count?: number | string;
  jumlah_ulasan?: number | string;
  website?: string | null;
  website_asli?: string | null;
  lead_status?: string;
  status_lead?: string;
  status?: string;
  rejection_reason?: RejectionReason;
  alasan_penolakan?: RejectionReason;
  rejectionReason?: RejectionReason;
  priority_score?: PriorityScore;
  priorityScore?: PriorityScore;
  generated_pitch?: string;
  draft_pitch_wa?: string;
  pitch?: string;
  last_sync_at?: string;
  terakhir_disinkron?: string;
  contactedAt?: string;
}

const POPULAR_CITIES = [
  'Malang',
  'Surabaya',
  'Solo',
  'Jogja',
  'Semarang',
  'Bandung',
  'Jakarta',
  'Bekasi',
  'Tangerang',
  'Denpasar',
];

export interface RegionGroup {
  region: string;
  cities: string[];
}

export const INDONESIA_REGIONS: RegionGroup[] = [
  {
    region: 'Jawa Timur',
    cities: ['Malang', 'Surabaya', 'Sidoarjo', 'Kediri', 'Jember', 'Batu', 'Madiun'],
  },
  {
    region: 'Jabodetabek & Jabar',
    cities: ['Jakarta', 'Bandung', 'Bekasi', 'Tangerang', 'Depok', 'Bogor', 'Cirebon'],
  },
  {
    region: 'Jawa Tengah & DIY',
    cities: ['Semarang', 'Solo', 'Jogja', 'Purwokerto', 'Magelang', 'Kudus', 'Tegal'],
  },
  {
    region: 'Sumatera',
    cities: ['Medan', 'Palembang', 'Pekanbaru', 'Batam', 'Padang', 'Lampung', 'Banda Aceh'],
  },
  {
    region: 'Bali & Nusa Tenggara',
    cities: ['Denpasar', 'Badung', 'Mataram', 'Kupang'],
  },
  {
    region: 'Kalimantan',
    cities: ['Samarinda', 'Balikpapan', 'Banjarmasin', 'Pontianak'],
  },
  {
    region: 'Sulawesi & Timur',
    cities: ['Makassar', 'Manado', 'Palu', 'Kendari', 'Jayapura', 'Ambon'],
  },
];

export const GLOBAL_REGIONS: RegionGroup[] = [
  {
    region: 'United Kingdom',
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow'],
  },
  {
    region: 'Europe (DE, FR, NL)',
    cities: ['Berlin', 'Munich', 'Paris', 'Amsterdam', 'Rotterdam', 'Dublin', 'Frankfurt'],
  },
  {
    region: 'United States & Canada',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Toronto', 'Vancouver'],
  },
  {
    region: 'Australia & APAC',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Singapore', 'Auckland'],
  },
  {
    region: 'Middle East',
    cities: ['Dubai', 'Abu Dhabi', 'Doha', 'Riyadh'],
  },
];

export const GLOBAL_POPULAR_CITIES = [
  'London',
  'Manchester',
  'Berlin',
  'Amsterdam',
  'Paris',
  'Sydney',
  'New York',
  'Los Angeles',
  'Singapore',
  'Dubai',
];

export const PRESET_CATEGORIES = [
  { label: 'Semua Kategori', query: '' },
  { label: 'Kos-Kosan & Homestay', query: 'Kos Kosan Homestay' },
  { label: 'Bimbel & Kursus Les', query: 'Bimbel Kursus Bimbingan Belajar' },
  { label: 'Klinik Dokter Gigi & Medis', query: 'Klinik Dokter Gigi' },
  { label: 'Wedding Organizer & MUA', query: 'Wedding Organizer MUA' },
  { label: 'Kontraktor & Arsitek', query: 'Kontraktor Arsitek Desain Interior' },
  { label: 'Konveksi & Percetakan', query: 'Konveksi Sablon Percetakan' },
  { label: 'Rental Mobil & Motor', query: 'Rental Mobil Persewaan Motor' },
  { label: 'Cafe & Resto Kuliner', query: 'Cafe Resto Kuliner Kedai' },
  { label: 'Bengkel & Cuci Mobil', query: 'Bengkel Mobil Carwash Motor' },
];

export const GLOBAL_PRESET_CATEGORIES = [
  { label: 'All Global Categories', query: '' },
  { label: 'Emergency Plumbers & Heating', query: 'Plumber Heating Emergency' },
  { label: 'Dental & Orthodontic Clinics', query: 'Dentist Dental Clinic' },
  { label: 'Roofing & Solar Contractors', query: 'Roofing Solar Contractor' },
  { label: 'Electricians & Smart Home', query: 'Electrician Contractor' },
  { label: 'Auto Detailing & Ceramic Coating', query: 'Auto Detailing Ceramic' },
  { label: 'Artisan Bakery & Specialty Cafe', query: 'Artisan Bakery Cafe' },
  { label: 'Law Firms & Solicitors', query: 'Law Firm Solicitor' },
  { label: 'Landscaping & Tree Surgery', query: 'Landscaping Garden Tree' },
  { label: 'Veterinary Clinics', query: 'Veterinary Clinic Vet' },
];

export interface CuratedRecommendation {
  id: string;
  title: string;
  city: string;
  query: string;
  category: OutreachCategory;
  categoryName: string;
  tag: string;
  opportunityBadge: string;
  description: string;
}

export const RECOMMENDATIONS: CuratedRecommendation[] = [
  {
    id: 'kos-malang',
    title: 'Kos Mahasiswa & Homestay',
    city: 'Malang',
    query: 'Kos Kosan di Malang',
    category: 'kos',
    categoryName: 'Properti & Hunian',
    tag: 'Tinggi Mahasiswa',
    opportunityBadge: 'Katalog Kamar & KTP',
    description: 'Pemilik kos butuh alur booking online aman dengan upload KTP penyewa dan auto-reminder tagihan WA.',
  },
  {
    id: 'konveksi-surabaya',
    title: 'Konveksi & Sablon Kaos',
    city: 'Surabaya',
    query: 'Konveksi Kaos di Surabaya',
    category: 'umkm',
    categoryName: 'Industri Kreatif',
    tag: 'Pusat Bisnis',
    opportunityBadge: 'Katalog Visual WA',
    description: 'Konveksi butuh katalog visual instan dan daftar harga agar calon pemesan tidak tanya-tanya manual via chat panjang.',
  },
  {
    id: 'wedding-solo',
    title: 'Wedding Organizer & MUA',
    city: 'Solo',
    query: 'Wedding Organizer di Solo',
    category: 'wedding',
    categoryName: 'Jasa Pernikahan',
    tag: 'Portofolio Mewah',
    opportunityBadge: 'Showcase Portofolio',
    description: 'WO butuh galeri foto/video HD dan rincian paket pricelist untuk calon pengantin booking jadwal acara.',
  },
  {
    id: 'klinik-jogja',
    title: 'Klinik Dokter Gigi & Estetika',
    city: 'Jogja',
    query: 'Klinik Dokter Gigi di Jogja',
    category: 'jasa',
    categoryName: 'Kesehatan & Medis',
    tag: 'Tinggi Kepercayaan',
    opportunityBadge: 'Profil & Jadwal Dokter',
    description: 'Klinik butuh landing page resmi dengan jadwal praktek dan tombol konsultasi langsung ke WA.',
  },
  {
    id: 'rental-bandung',
    title: 'Rental Mobil & Sewa Motor',
    city: 'Bandung',
    query: 'Rental Mobil di Bandung',
    category: 'rental',
    categoryName: 'Pariwisata & Transportasi',
    tag: 'Wisata Ramai',
    opportunityBadge: 'Katalog Armada & Jadwal',
    description: 'Rental butuh katalog unit kendaraan live dengan tarif harian dan syarat booking cepat.',
  },
  {
    id: 'arsitek-semarang',
    title: 'Kontraktor & Desain Interior',
    city: 'Semarang',
    query: 'Kontraktor Bangun Rumah di Semarang',
    category: 'properti',
    categoryName: 'Properti & Konstruksi',
    tag: 'Tiket Proyek Besar',
    opportunityBadge: 'Portofolio & Estimasi RAB',
    description: 'Kontraktor butuh galeri proyek Before & After dan formulir estimasi anggaran proyek.',
  },
];

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  NEW: {
    label: 'NEW',
    bg: 'bg-amber-50 text-amber-800',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: faMagic,
  },
  QUALIFIED: {
    label: 'QUALIFIED',
    bg: 'bg-sky-50 text-sky-800',
    text: 'text-sky-800',
    border: 'border-sky-200',
    icon: faBullseye,
  },
  CONTACTED: {
    label: 'CONTACTED',
    bg: 'bg-emerald-50 text-emerald-800',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: faPaperPlane,
  },
  INTERESTED: {
    label: 'INTERESTED',
    bg: 'bg-indigo-50 text-indigo-800',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    icon: faBolt,
  },
  LOST_FRANCHISE: {
    label: 'LOST_FRANCHISE',
    bg: 'bg-rose-50 text-rose-800',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: faTimesCircle,
  },
  CLOSED: {
    label: 'CLOSED',
    bg: 'bg-purple-50 text-purple-800',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: faCheckCircle,
  },
  IN_PROGRESS: {
    label: 'IN_PROGRESS',
    bg: 'bg-cyan-50 text-cyan-800',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: faClock,
  },
  LOST_REJECTED: {
    label: 'LOST_REJECTED',
    bg: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: faTimesCircle,
  },
};

export default function LeadFinderApp() {
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInputs, setPinInputs] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [isAppLoading, setIsAppLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mission');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [marketMode, setMarketMode] = useState<'indo' | 'global'>('indo');

  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Malang');
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(PRESET_CATEGORIES[1].query);
  const [filterNoWebsiteOnly, setFilterNoWebsiteOnly] = useState(false);
  const [filterValidWaOnly, setFilterValidWaOnly] = useState(false);
  const [filterIdealOnly, setFilterIdealOnly] = useState(false);
  const [excludeFranchiseToggle, setExcludeFranchiseToggle] = useState(true);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);

  const [phoneRegistry, setPhoneRegistry] = useState<Record<string, ContactedPhoneRecord>>({});

  const [googleSheetsUrl] = useState(() => {
    return process.env.NEXT_PUBLIC_LEADS_SHEET_API || '';
  });

  const [dispatchCooldown, setDispatchCooldown] = useState<number>(0);

  const [serpApiKey] = useState(process.env.SERPAPI_API_KEY || '');
  const [geminiApiKey] = useState(process.env.GEMINI_API_KEY || '');
  const [fonnteToken] = useState(process.env.FONNTE_TOKEN || '');
  const [senderName] = useState(process.env.SENDER_NAME || 'Mohammad Kevin');
  const [senderRole] = useState(process.env.SENDER_ROLE || 'freelance web developer');

  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [leads, setLeads] = useState<LeadWithMeta[]>([]);
  const [savedStatuses, setSavedStatuses] = useState<Record<string, OutreachStatus>>({});
  const [savedLeadsCrm, setSavedLeadsCrm] = useState<LeadWithMeta[]>([]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewModalLead, setPreviewModalLead] = useState<LeadWithMeta | null>(null);
  const [editedMessage, setEditedMessage] = useState('');

  const [crmStatusFilter, setCrmStatusFilter] = useState<CrmFilterStatus>('all');
  const [isSyncingCrm, setIsSyncingCrm] = useState(false);

  const [copilotIncomingMessage, setCopilotIncomingMessage] = useState('');
  const [copilotClientName, setCopilotClientName] = useState('');
  const [copilotCategory, setCopilotCategory] = useState<OutreachCategory>('general');
  const [copilotPhone, setCopilotPhone] = useState('');
  const [copilotGeneratedReply, setCopilotGeneratedReply] = useState('');
  const [copilotIntent, setCopilotIntent] = useState<string | null>(null);
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState(false);
  const [isSendingCopilot, setIsSendingCopilot] = useState(false);

  const [existingCrmPhones, setExistingCrmPhones] = useState<Set<string>>(new Set());

  const [missionDailyTarget, setMissionDailyTarget] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leads_mission_target');
      return saved ? Number(saved) : 20;
    }
    return 20;
  });
  const [missionTodaySent, setMissionTodaySent] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leads_mission_today');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [missionTodayReplies, setMissionTodayReplies] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leads_mission_replies');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [missionWeekMeetings, setMissionWeekMeetings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leads_mission_meetings');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [missionAutoSchedule, setMissionAutoSchedule] = useState(false);
  const [isMissionSending, setIsMissionSending] = useState(false);

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentDelay?: number } | null>(null);

  const handlePinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinInputs];
    newPin[index] = value;
    setPinInputs(newPin);
    setPinError(false);

    if (value && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    const currentPin = newPin.join('');
    if (currentPin.length === 4) {
      if (currentPin === '1992') {
        sessionStorage.setItem('leadfinder_auth_pin', '1992');
        setIsAppLoading(true);
        setIsAuthenticated(true);
        setTimeout(() => {
          setIsAppLoading(false);
        }, 400);
      } else {
        setPinError(true);
        setTimeout(() => setPinInputs(['', '', '', '']), 500);
        pinInputRefs[0].current?.focus();
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinInputs[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('leadfinder_auth_pin');
    setPinInputs(['', '', '', '']);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (dispatchCooldown > 0) {
      const interval = setInterval(() => {
        setDispatchCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [dispatchCooldown]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    try {
      const pin = sessionStorage.getItem('leadfinder_auth_pin');
      if (pin === '1992') {
        setIsAuthenticated(true);
      }
      const storedRegistry = localStorage.getItem('lead_phone_registry');
      if (storedRegistry) {
        setPhoneRegistry(JSON.parse(storedRegistry));
      }
      const storedCrm = localStorage.getItem('lead_saved_crm_records');
      if (storedCrm) {
        setSavedLeadsCrm(JSON.parse(storedCrm));
      }
    } catch {}
  }, []);

  const mapRemoteRecordToLead = (record: RemoteSheetRecord, idx: number): LeadWithMeta => {
    const name = record.business_name || record.nama_bisnis || record.name || `Prospek ${idx + 1}`;
    const rawPhone = record.phone_number || record.no_telepon || record.phone || '';
    const clean = normalizeWhatsAppNumber(record.normalized_phone || record.normalizedPhone || rawPhone);
    const rawStatus = (record.lead_status || record.status_lead || record.status || 'QUALIFIED').toUpperCase();

    let statusUpper: LeadStatus = 'QUALIFIED';
    let statusResolved: OutreachStatus = 'new';

    if (rawStatus === 'CONTACTED' || rawStatus === 'SUDAH' || rawStatus === 'SUDAH DI-CHAT') {
      statusUpper = 'CONTACTED';
      statusResolved = 'contacted';
    } else if (rawStatus === 'INTERESTED' || rawStatus === 'FOLLOWUP' || rawStatus === 'PERLU FOLLOW-UP') {
      statusUpper = 'INTERESTED';
      statusResolved = 'followup';
    } else if (rawStatus === 'CLOSED' || rawStatus === 'DEAL' || rawStatus === 'DEAL / SELESAI') {
      statusUpper = 'CLOSED';
      statusResolved = 'closed';
    } else if (rawStatus === 'IN_PROGRESS') {
      statusUpper = 'IN_PROGRESS';
      statusResolved = 'in_progress';
    } else if (rawStatus === 'LOST_REJECTED') {
      statusUpper = 'LOST_REJECTED';
      statusResolved = 'lost_rejected';
    } else if (
      rawStatus === 'LOST_FRANCHISE' ||
      rawStatus === 'DITOLAK' ||
      rawStatus === 'REJECTED' ||
      rawStatus === 'UNQUALIFIED_FRANCHISE' ||
      rawStatus === 'UNQUALIFIED_CORPORATE'
    ) {
      statusUpper = rawStatus === 'UNQUALIFIED_CORPORATE' ? 'UNQUALIFIED_CORPORATE' : 'LOST_FRANCHISE';
      statusResolved = 'rejected';
    } else if (rawStatus === 'NEW') {
      statusUpper = 'NEW';
      statusResolved = 'new';
    }

    const website = record.website || record.website_asli || null;
    const rating = Number(record.rating || 0);
    const reviewCount = Number(record.review_count || record.jumlah_ulasan || 0);

    const qual = evaluateLeadQualification({
      name,
      website,
      rating,
      reviewCount,
    });

    return {
      id: `sheet-${clean || idx}`,
      name,
      formattedAddress: record.maps_url || record.link_google_maps || record.address || 'Alamat Google Maps',
      nationalPhoneNumber: rawPhone || clean,
      internationalPhoneNumber: rawPhone || clean,
      websiteUri: website,
      website,
      hasWebsite: Boolean(website && website.trim().length > 0),
      rating,
      userRatingCount: reviewCount,
      types: [],
      primaryType: record.category || record.kategori || 'business',
      phoneAnalysis: {
        raw: rawPhone,
        cleaned: clean,
        isValid: Boolean(clean),
        isMobile: true,
        type: 'mobile',
        formattedDisplay: rawPhone || clean,
      },
      qualification: qual,
      priorityScore: (record.priority_score || record.priorityScore || qual.priorityScore) as PriorityScore,
      leadStatus: statusUpper,
      rejectionReason: record.rejection_reason || record.alasan_penolakan || record.rejectionReason || null,
      isIdealTarget: qual.isIdealTarget,
      status: statusResolved,
      selectedCategory: ((record.category || record.kategori) as OutreachCategory) || 'general',
      aiMessage: record.generated_pitch || record.draft_pitch_wa || record.pitch || '',
      generatedPitch: record.generated_pitch || record.draft_pitch_wa || record.pitch || '',
      lastSyncAt: record.last_sync_at || record.terakhir_disinkron || record.contactedAt || '',
      addedAt: record.last_sync_at || record.terakhir_disinkron || record.contactedAt || new Date().toLocaleDateString('id-ID'),
    };
  };

  const syncCrmFromSheet = async (forceSheetOnly = true) => {
    setIsSyncingCrm(true);
    try {
      const res = await fetch(
        `/api/sheets${googleSheetsUrl ? `?sheetUrl=${encodeURIComponent(googleSheetsUrl)}` : ''}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        const nextRegistry: Record<string, ContactedPhoneRecord> = {};
        if (Array.isArray(data.contactedNumbers)) {
          data.contactedNumbers.forEach((p: string) => {
            nextRegistry[p] = {
              cleanPhone: p,
              contactedAt: new Date().toISOString(),
              businessName: 'Database Google Sheets',
              status: 'contacted',
            };
          });
        }
        setPhoneRegistry(nextRegistry);
        try {
          localStorage.setItem('lead_phone_registry', JSON.stringify(nextRegistry));
        } catch {}

        if (Array.isArray(data.remoteRecords)) {
          const sheetLeads: LeadWithMeta[] = data.remoteRecords.map((record: RemoteSheetRecord, idx: number) =>
            mapRemoteRecordToLead(record, idx)
          );

          setSavedLeadsCrm(sheetLeads);
          const phoneSet = new Set<string>();
          sheetLeads.forEach((l) => {
            const p = l.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(l.nationalPhoneNumber);
            if (p) phoneSet.add(p);
          });
          setExistingCrmPhones(phoneSet);
          try {
            localStorage.setItem('lead_saved_crm_records', JSON.stringify(sheetLeads));
          } catch {}

          if (sheetLeads.length === 0) {
            showToast('success', 'Google Sheets terhubung (Spreadsheet kosong / 0 prospek).');
          } else {
            showToast('success', `Berhasil memuat ${sheetLeads.length} data murni dari Google Sheets.`);
          }
        }
      } else {
        showToast('error', data.error || 'Gagal tersambung ke Google Sheets.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi.';
      showToast('error', msg);
    } finally {
      setIsSyncingCrm(false);
    }
  };

  const resetCacheAndSyncSheet = async () => {
    try {
      localStorage.removeItem('lead_saved_crm_records');
      localStorage.removeItem('lead_phone_registry');
      localStorage.removeItem('lead_outreach_statuses');
      setSavedLeadsCrm([]);
      setPhoneRegistry({});
      setSavedStatuses({});
    } catch {}
    await syncCrmFromSheet(true);
  };

  useEffect(() => {
    let isMounted = true;
    const initialSync = async () => {
      try {
        const res = await fetch(
          `/api/sheets${googleSheetsUrl ? `?sheetUrl=${encodeURIComponent(googleSheetsUrl)}` : ''}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          const nextRegistry: Record<string, ContactedPhoneRecord> = {};
          if (Array.isArray(data.contactedNumbers)) {
            data.contactedNumbers.forEach((p: string) => {
              nextRegistry[p] = {
                cleanPhone: p,
                contactedAt: new Date().toISOString(),
                businessName: 'Database Google Sheets',
                status: 'contacted',
              };
            });
          }
          setPhoneRegistry(nextRegistry);
          try {
            localStorage.setItem('lead_phone_registry', JSON.stringify(nextRegistry));
          } catch {}

if (Array.isArray(data.remoteRecords)) {
          const sheetLeads: LeadWithMeta[] = data.remoteRecords.map((record: RemoteSheetRecord, idx: number) =>
            mapRemoteRecordToLead(record, idx)
          );
          setSavedLeadsCrm(sheetLeads);

          const phoneSet = new Set<string>();
          sheetLeads.forEach((l) => {
            const p = l.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(l.nationalPhoneNumber);
            if (p) phoneSet.add(p);
          });
          setExistingCrmPhones(phoneSet);
            try {
              localStorage.setItem('lead_saved_crm_records', JSON.stringify(sheetLeads));
            } catch {}
          }
        }
      } catch {}
    };

    initialSync();
    return () => {
      isMounted = false;
    };
  }, [googleSheetsUrl]);

  const updateLeadStatus = (placeId: string, newStatus: string, rejectionReason?: RejectionReason) => {
    const statusUpper = newStatus.toUpperCase() as LeadStatus;
    const outreachMapped: OutreachStatus =
      statusUpper === 'CONTACTED'
        ? 'contacted'
        : statusUpper === 'INTERESTED'
        ? 'followup'
        : statusUpper === 'CLOSED'
        ? 'closed'
        : statusUpper === 'LOST_FRANCHISE' || statusUpper === 'UNQUALIFIED_FRANCHISE' || statusUpper === 'UNQUALIFIED_CORPORATE'
        ? 'rejected'
        : 'new';

    const updatedStatuses = { ...savedStatuses, [placeId]: outreachMapped };
    setSavedStatuses(updatedStatuses);
    try {
      localStorage.setItem('lead_outreach_statuses', JSON.stringify(updatedStatuses));
    } catch {}

    let targetLeadToSync: LeadWithMeta | null = null;

    setSavedLeadsCrm((prev) => {
      const updated = prev.map((l) => {
        if (l.id === placeId) {
          const updatedLead: LeadWithMeta = {
            ...l,
            leadStatus: statusUpper,
            status: outreachMapped,
            rejectionReason: rejectionReason !== undefined ? rejectionReason : (statusUpper === 'LOST_FRANCHISE' ? 'Franchise' : l.rejectionReason),
            lastSyncAt: new Date().toISOString(),
          };
          targetLeadToSync = updatedLead;
          return updatedLead;
        }
        return l;
      });
      try {
        localStorage.setItem('lead_saved_crm_records', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === placeId) {
          const updated = {
            ...lead,
            leadStatus: statusUpper,
            status: outreachMapped,
            rejectionReason: rejectionReason !== undefined ? rejectionReason : lead.rejectionReason,
          };
          if (!targetLeadToSync) targetLeadToSync = updated;
          return updated;
        }
        return lead;
      })
    );

    if (targetLeadToSync) {
      const l: LeadWithMeta = targetLeadToSync;
      const cleanPhone = l.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(l.nationalPhoneNumber);
      fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: l.nationalPhoneNumber || cleanPhone,
          normalizedPhone: cleanPhone,
          business_name: l.name,
          category: l.selectedCategory || 'general',
          maps_url: l.formattedAddress || '',
          rating: l.rating || 0,
          review_count: l.userRatingCount || 0,
          website: l.websiteUri || l.website || null,
          lead_status: statusUpper,
          rejection_reason: l.rejectionReason || null,
          generated_pitch: l.generatedPitch || l.aiMessage || '',
          last_sync_at: new Date().toISOString(),
          sheetUrl: googleSheetsUrl || undefined,
        }),
      }).catch(() => {});
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalQuery = (query || `${selectedCategoryPreset} di ${selectedCity}`).trim();
    if (!finalQuery) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: finalQuery,
          apiKey: serpApiKey || undefined,
          marketMode,
          excludeFranchise: excludeFranchiseToggle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Terjadi kesalahan saat mencari prospek.');
        return;
      }

      if (Array.isArray(data.places)) {
        const newPlaces: PlaceLead[] = data.places;

        // Duplicate detection: filter out leads already in CRM or current search
        const dedupedPlaces = newPlaces.filter((place) => {
          const p = place.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(place.nationalPhoneNumber);
          if (!p) return true;
          if (existingCrmPhones.has(p)) return false;
          if (leads.some((l) => l.phoneAnalysis?.cleaned === p)) return false;
          return true;
        });

        const dupCount = newPlaces.length - dedupedPlaces.length;
        if (dupCount > 0) {
          showToast('success', `${dupCount} prospek duplikat dilewati (sudah ada di CRM).`);
        }

        const enhanced: LeadWithMeta[] = dedupedPlaces.map((place: PlaceLead) => {
          const detectedCat = detectCategory(place.name, finalQuery);
          const currentStatus: OutreachStatus = isPhoneContacted(place.phoneAnalysis?.cleaned, phoneRegistry)
            ? 'contacted'
            : 'new';

          return {
            ...place,
            status: currentStatus,
            leadStatus: place.leadStatus || 'QUALIFIED',
            selectedCategory: detectedCat,
            rejectionReason: place.rejectionReason || null,
          };
        });

        setLeads(enhanced);
        showToast(
          'success',
          `Menemukan ${enhanced.length} prospek baru (${dupCount} duplikat, ${data.excludedFranchiseCount || 0} franchise diblokir).`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi server pencarian.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      if (filterNoWebsiteOnly && item.hasWebsite) return false;
      if (filterValidWaOnly && (!item.phoneAnalysis.isValid || !item.phoneAnalysis.isMobile)) return false;
      if (filterIdealOnly && !item.isIdealTarget) return false;
      if (minRatingFilter > 0 && item.rating < minRatingFilter) return false;
      return true;
    });
  }, [leads, filterNoWebsiteOnly, filterValidWaOnly, filterIdealOnly, minRatingFilter]);

  const handleOpenWhatsAppManual = (lead: LeadWithMeta) => {
    const cleanP = lead.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
    if (!cleanP) return;

    const pitch =
      lead.generatedPitch ||
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        rating: lead.rating,
        userRatingCount: lead.userRatingCount,
        address: lead.formattedAddress,
      });

    updateLeadStatus(lead.id, 'CONTACTED');
    window.open(`https://wa.me/${cleanP}?text=${encodeURIComponent(pitch)}`, '_blank');
  };

  const handleGenerateAiPitch = async (lead: LeadWithMeta) => {
    setGeneratingAiId(lead.id);
    try {
      const res = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: lead.name,
          category: lead.selectedCategory,
          address: lead.formattedAddress,
          rating: lead.rating,
          userRatingCount: lead.userRatingCount,
          senderName,
          senderRole,
          marketMode,
          geminiKey: geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, generatedPitch: data.message, aiMessage: data.message } : l))
        );
        showToast('success', `Draf pitch AI value-first untuk "${lead.name}" selesai.`);
      }
    } catch {
      showToast('error', 'Gagal membuat pitch AI.');
    } finally {
      setGeneratingAiId(null);
    }
  };

  const handleSendSingleWhatsApp = async (lead: LeadWithMeta) => {
    const cleanP = lead.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
    if (!cleanP) return;

    const message =
      lead.generatedPitch ||
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        rating: lead.rating,
        userRatingCount: lead.userRatingCount,
        address: lead.formattedAddress,
      });

    setSendingId(lead.id);
    try {
      const res = await fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: cleanP,
          message,
          token: fonnteToken || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateLeadStatus(lead.id, 'CONTACTED');
        setDispatchCooldown(15);
        showToast('success', `Pesan WhatsApp terkirim ke ${lead.name} (${cleanP}).`);
      } else {
        showToast('error', data.error || 'Gagal mengirim pesan via Gateway.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan.');
    } finally {
      setSendingId(null);
    }
  };

  const handleBatchGenerateAi = async () => {
    const targetLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    if (targetLeads.length === 0) return;

    setIsBatchGenerating(true);
    let done = 0;
    for (const lead of targetLeads) {
      setBatchProgress({ current: done + 1, total: targetLeads.length });
      await handleGenerateAiPitch(lead);
      done++;
    }
    setIsBatchGenerating(false);
    setBatchProgress(null);
    showToast('success', `Selesai membuat ${done} draf pitch AI.`);
  };

  const handleBatchSendWhatsApp = async () => {
    const targetLeads = leads.filter(
      (l) => selectedLeadIds.includes(l.id) && l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile
    );
    if (targetLeads.length === 0) return;

    setIsBatchSending(true);
    for (let i = 0; i < targetLeads.length; i++) {
      const lead = targetLeads[i];
      const randomDelay = i === 0 ? 0 : getRandomDelayMs(45, 120);

      setBatchProgress({
        current: i + 1,
        total: targetLeads.length,
        currentDelay: Math.round(randomDelay / 1000),
      });

      if (randomDelay > 0) {
        await new Promise((r) => setTimeout(r, randomDelay));
      }

      await handleSendSingleWhatsApp(lead);
    }

    setIsBatchSending(false);
    setBatchProgress(null);
    setSelectedLeadIds([]);
    showToast('success', 'Pengiriman antrean WhatsApp massal selesai.');
  };

  const handleGenerateCopilotReply = async () => {
    if (!copilotIncomingMessage.trim()) return;
    setIsGeneratingCopilot(true);
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomingMessage: copilotIncomingMessage,
          businessName: copilotClientName || 'Klien',
          category: copilotCategory,
          senderName,
          senderRole,
          geminiKey: geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCopilotGeneratedReply(data.reply);
        setCopilotIntent(data.intent || null);
        showToast('success', 'Balasan cerdas AI berhasil dibuat.');
      }
    } catch {
      showToast('error', 'Gagal membuat balasan AI Copilot.');
    } finally {
      setIsGeneratingCopilot(false);
    }
  };

  const handleSendCopilotReply = async () => {
    const cleanPhone = normalizeWhatsAppNumber(copilotPhone);
    if (!cleanPhone || !copilotGeneratedReply) {
      showToast('error', 'Nomor telepon tujuan atau draf balasan kosong.');
      return;
    }

    setIsSendingCopilot(true);
    try {
      const res = await fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: cleanPhone,
          message: copilotGeneratedReply,
          token: fonnteToken || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Balasan terkirim ke ${cleanPhone}!`);
        setCopilotIncomingMessage('');
        setCopilotGeneratedReply('');
      } else {
        showToast('error', data.error || 'Gagal mengirim via Gateway.');
      }
    } catch {
      showToast('error', 'Kesalahan jaringan saat mengirim balasan.');
    } finally {
      setIsSendingCopilot(false);
    }
  };

  const handleDownloadCsv = () => {
    const listToExport = activeTab === 'crm' ? savedLeadsCrm : filteredLeads;
    if (listToExport.length === 0) {
      showToast('error', 'Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'Nama_Bisnis',
      'Kategori',
      'No_Telepon',
      'Link_Maps',
      'Rating',
      'Jumlah_Ulasan',
      'Website_Asli',
      'Status_Lead',
      'Alasan_Penolakan',
      'Draft_Pitch_WA',
      'Terakhir_Disinkron',
    ];

    const rows = listToExport.map((l) => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.selectedCategory || l.primaryType || 'general'}"`,
      `"${l.phoneAnalysis?.cleaned || l.nationalPhoneNumber || ''}"`,
      `"${(l.formattedAddress || '').replace(/"/g, '""')}"`,
      l.rating || 0,
      l.userRatingCount || 0,
      `"${l.websiteUri || l.website || ''}"`,
      `"${l.leadStatus || 'NEW'}"`,
      `"${l.rejectionReason || ''}"`,
      `"${(l.generatedPitch || l.aiMessage || '').replace(/"/g, '""')}"`,
      `"${l.lastSyncAt || new Date().toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leads_CRM_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Ekspor ${listToExport.length} baris CSV berhasil.`);
  };

  const handleDownloadWaList = () => {
    const listToExport = activeTab === 'crm' ? savedLeadsCrm : filteredLeads;
    const phoneList = listToExport
      .filter((l) => l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile)
      .map((l) => l.phoneAnalysis.cleaned);

    if (phoneList.length === 0) {
      showToast('error', 'Tidak ada nomor WhatsApp yang valid.');
      return;
    }

    const textContent = Array.from(new Set(phoneList)).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_WhatsApp_${phoneList.length}_Nomor.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Berhasil mengunduh ${phoneList.length} nomor WhatsApp.`);
  };

  if (!hasMounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 antialiased">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <FontAwesomeIcon icon={faLock} className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Leads Machine CRM</h1>
            <p className="text-xs text-slate-500 mt-1">Masukkan 4-digit PIN keamanan operator</p>
          </div>

          <div className="flex justify-center gap-3">
            {pinInputs.map((val, idx) => (
              <input
                key={idx}
                ref={pinInputRefs[idx]}
                type="password"
                maxLength={1}
                value={val}
                onChange={(e) => handlePinInput(idx, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border transition outline-none ${
                  pinError
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
            ))}
          </div>

          {pinError ? (
            <p className="text-xs text-rose-600 font-medium">PIN tidak cocok. Silakan coba lagi.</p>
          ) : (
            <p className="text-[11px] text-slate-400 font-mono">Default: 1992</p>
          )}
        </div>
      </div>
    );
  }

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs animate-pulse">
            <FontAwesomeIcon icon={faBullseye} className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800">Menyiapkan CRM Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex text-slate-900 antialiased font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-150">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                : 'bg-rose-950 text-rose-100 border-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR (No Navbar) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                <FontAwesomeIcon icon={faBullseye} className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-bold text-xs tracking-tight text-slate-900 flex items-center gap-1">
                  Leads Machine
                  <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    v2.1
                  </span>
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-500 font-medium">Sheets Sync Live</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
            </button>
          </div>

          {/* Market Switcher Widget */}
          <div className="mt-4 p-1 bg-slate-100 rounded-lg flex items-center text-[11px] font-semibold">
            <button
              onClick={() => {
                setMarketMode('indo');
                setSelectedCity('Malang');
              }}
              className={`flex-1 py-1.5 rounded-md transition text-center cursor-pointer ${
                marketMode === 'indo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🇮🇩 Indonesia
            </button>
            <button
              onClick={() => {
                setMarketMode('global');
                setSelectedCity('London');
              }}
              className={`flex-1 py-1.5 rounded-md transition text-center cursor-pointer ${
                marketMode === 'global' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🌍 Global B2B
            </button>
          </div>

          {/* Main Navigation Menu */}
          <nav className="mt-4 space-y-1 flex-1">
            <button
              onClick={() => {
                setActiveTab('mission');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'mission'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faBolt} className={`h-4 w-4 ${activeTab === 'mission' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Misi Harian</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                {missionDailyTarget - missionTodaySent > 0 ? missionDailyTarget - missionTodaySent : 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faSearch} className={`h-4 w-4 ${activeTab === 'search' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Discovery &amp; Search</span>
              </div>
              {leads.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeTab === 'search' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {leads.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('crm');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faLayerGroup} className={`h-4 w-4 ${activeTab === 'crm' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Pipeline CRM (11-Kolom)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  activeTab === 'crm' ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {savedLeadsCrm.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('copilot');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'copilot'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faQuoteLeft} className={`h-4 w-4 ${activeTab === 'copilot' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>AI Copilot (Chat)</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                AI
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('templates');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faMagic} className={`h-4 w-4 ${activeTab === 'templates' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Pitch Templates</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('export');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faDownload} className={`h-4 w-4 ${activeTab === 'export' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Export &amp; Database</span>
              </div>
            </button>
          </nav>

          {/* Sidebar Footer: Stats + Logout */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                <p className="text-[9px] font-bold text-emerald-700">{missionTodaySent}</p>
                <p className="text-[7px] text-emerald-500 uppercase">Terkirim</p>
              </div>
              <div className="p-1.5 rounded bg-blue-50 border border-blue-200">
                <p className="text-[9px] font-bold text-blue-700">{missionTodayReplies}</p>
                <p className="text-[7px] text-blue-500 uppercase">Reply</p>
              </div>
              <div className="p-1.5 rounded bg-purple-50 border border-purple-200">
                <p className="text-[9px] font-bold text-purple-700">{missionWeekMeetings}</p>
                <p className="text-[7px] text-purple-500 uppercase">Meeting</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                  MK
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">Mohammad Kevin</p>
                  <p className="text-[10px] text-slate-400">Operator</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Kunci / Logout"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Sticky Sub-Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight capitalize truncate">
                {activeTab === 'mission' && 'Misi Harian — Kirim 20 WA per Hari'}
                {activeTab === 'search' && (marketMode === 'global' ? 'Global Prospecting (UK, US, EU)' : 'Discovery & Lead Qualification')}
                {activeTab === 'crm' && 'Pipeline CRM (Google Sheets Mirror)'}
                {activeTab === 'copilot' && 'AI Response Copilot (Incoming Chat Manager)'}
                {activeTab === 'templates' && 'Value-First Pitch Studio'}
                {activeTab === 'export' && 'Export Database & WhatsApp Numbers'}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {activeTab === 'mission' && `Target: ${missionDailyTarget} WA/hari | Kirim ${missionTodaySent} | Sisa ${Math.max(0, missionDailyTarget - missionTodaySent)}`}
                {activeTab === 'search' && 'Cari bisnis lokal independen dengan ulasan 10–100 & tanpa website'}
                {activeTab === 'crm' && 'Single Source of Truth 11-kolom sinkron realtime ke Google Spreadsheet'}
                {activeTab === 'copilot' && 'Deteksi penolakan franchise otomatis atau take over lead berminat'}
                {activeTab === 'templates' && 'Draf outreach 60–80 kata tanpa frasa klise sales'}
                {activeTab === 'export' && 'Unduh data prospek murni format CSV & TXT'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'crm' && (
              <button
                onClick={() => syncCrmFromSheet(true)}
                disabled={isSyncingCrm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faSync} className={`h-3.5 w-3.5 text-slate-500 ${isSyncingCrm ? 'animate-spin' : ''}`} />
                <span>{isSyncingCrm ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>
            )}
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <div className="p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* VIEW 0: DAILY MISSION */}
          {activeTab === 'mission' && (
            <div className="space-y-5">
              {/* Mission Progress Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Progress Misi Hari Ini</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Kirim {missionDailyTarget} pesan WA per hari untuk dapat 1 klien/minggu</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-emerald-600">{missionTodaySent}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">dari {missionDailyTarget} target</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (missionTodaySent / missionDailyTarget) * 100)}%` }}
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                    <p className="text-lg font-mono font-bold text-emerald-700">{missionTodaySent}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Terkirim</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <p className="text-lg font-mono font-bold text-blue-700">{missionTodayReplies}</p>
                    <p className="text-[10px] text-blue-600 font-semibold uppercase">Reply</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                    <p className="text-lg font-mono font-bold text-purple-700">{missionWeekMeetings}</p>
                    <p className="text-[10px] text-purple-600 font-semibold uppercase">Meeting Minggu Ini</p>
                  </div>
                </div>

                {missionTodaySent >= missionDailyTarget && (
                  <div className="mt-4 p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-center">
                    <p className="text-xs font-bold text-emerald-800">🎉 Target harian tercapai! Kerja bagus.</p>
                  </div>
                )}
              </div>

              {/* Daily Target Config */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Konfigurasi Misi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Harian (WA)</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={missionDailyTarget}
                      onChange={(e) => setMissionDailyTarget(Number(e.target.value))}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        localStorage.setItem('leads_mission_target', String(missionDailyTarget));
                        showToast('success', `Target harian diatur ke ${missionDailyTarget} WA.`);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Simpan Target
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Reset progress hari ini?')) {
                          setMissionTodaySent(0);
                          localStorage.removeItem('leads_mission_today');
                          showToast('success', 'Progress hari ini direset.');
                        }
                      }}
                      className="px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      Reset Hari Ini
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions — Auto Pick & Send */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Aksi Cepat Outreach</h4>

                {/* Available Leads Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-mono font-bold text-slate-900">{savedLeadsCrm.filter(l => l.leadStatus === 'NEW').length}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">NEW belum dikirim</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-mono font-bold text-slate-900">{savedLeadsCrm.filter(l => l.leadStatus === 'QUALIFIED').length}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">QUALIFIED siap kirim</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-mono font-bold text-indigo-700">{savedLeadsCrm.filter(l => l.leadStatus === 'INTERESTED').length}</p>
                    <p className="text-[9px] text-indigo-500 uppercase font-semibold">INTERESTED follow-up</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-mono font-bold text-cyan-700">{savedLeadsCrm.filter(l => l.leadStatus === 'IN_PROGRESS').length}</p>
                    <p className="text-[9px] text-cyan-500 uppercase font-semibold">IN_PROGRESS deal</p>
                  </div>
                </div>

                {/* Auto-pick & Generate + Send Batch */}
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      const remaining = Math.max(0, missionDailyTarget - missionTodaySent);
                      if (remaining === 0) {
                        showToast('success', 'Target harian sudah tercapai! 🎉');
                        return;
                      }

                      // Pick leads from CRM that are NEW or QUALIFIED and have valid mobile phone
                      const candidates = savedLeadsCrm
                        .filter((l) =>
                          (l.leadStatus === 'NEW' || l.leadStatus === 'QUALIFIED') &&
                          l.phoneAnalysis?.isValid &&
                          l.phoneAnalysis?.isMobile
                        )
                        .slice(0, remaining);

                      if (candidates.length === 0) {
                        showToast('error', 'Tidak ada prospek baru yang siap dikirim. Cari prospek dulu di Discovery.');
                        return;
                      }

                      setIsMissionSending(true);
                      let sentCount = 0;

                      for (let i = 0; i < candidates.length; i++) {
                        const lead = candidates[i];
                        const cleanP = lead.phoneAnalysis.cleaned;
                        if (!cleanP) continue;

                        // Generate pitch if not exists
                        let pitch = lead.generatedPitch || lead.aiMessage || '';
                        if (!pitch) {
                          try {
                            const res = await fetch('/api/generate-pitch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                businessName: lead.name,
                                category: lead.selectedCategory,
                                address: lead.formattedAddress,
                                rating: lead.rating,
                                userRatingCount: lead.userRatingCount,
                                senderName,
                                senderRole,
                                marketMode,
                                geminiKey: geminiApiKey || undefined,
                              }),
                            });
                            const data = await res.json();
                            if (data.success && data.message) {
                              pitch = data.message;
                            } else {
                              pitch = generateOutreachMessage({
                                businessName: lead.name,
                                category: lead.selectedCategory,
                                rating: lead.rating,
                                userRatingCount: lead.userRatingCount,
                                address: lead.formattedAddress,
                              });
                            }
                          } catch {
                            pitch = generateOutreachMessage({
                              businessName: lead.name,
                              category: lead.selectedCategory,
                              rating: lead.rating,
                              userRatingCount: lead.userRatingCount,
                              address: lead.formattedAddress,
                            });
                          }
                        }

                        // Send via Fonnte
                        try {
                          const res = await fetch('/api/send-wa', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              target: cleanP,
                              message: pitch,
                              token: fonnteToken || undefined,
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            updateLeadStatus(lead.id, 'CONTACTED');
                            sentCount++;
                            const newTotal = missionTodaySent + sentCount;
                            setMissionTodaySent(newTotal);
                            localStorage.setItem('leads_mission_today', String(newTotal));
                          }
                        } catch {}

                        // Random delay between sends (except last)
                        if (i < candidates.length - 1) {
                          const delay = getRandomDelayMs(45, 120);
                          await new Promise((r) => setTimeout(r, delay));
                        }
                      }

                      setIsMissionSending(false);
                      showToast('success', `Selesai! ${sentCount} pesan terkirim hari ini. Total: ${missionTodaySent + sentCount}/${missionDailyTarget}`);
                    }}
                    disabled={isMissionSending}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <FontAwesomeIcon icon={faBolt} className={`h-5 w-5 ${isMissionSending ? 'animate-spin' : ''}`} />
                    <span>{isMissionSending ? 'Mengirim...' : `Kirim Sisa Target Hari Ini (${Math.max(0, missionDailyTarget - missionTodaySent)})`}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('search')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-slate-500" />
                    <span>Cari Prospek Baru</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: DISCOVERY & SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Control Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Kota / Wilayah Target
                      </label>
                      <select
                        aria-label="Pilih Kota Target"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900 cursor-pointer"
                      >
                        {marketMode === 'indo'
                          ? INDONESIA_REGIONS.map((grp) => (
                              <optgroup key={grp.region} label={grp.region}>
                                {grp.cities.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                              </optgroup>
                            ))
                          : GLOBAL_REGIONS.map((grp) => (
                              <optgroup key={grp.region} label={grp.region}>
                                {grp.cities.map((city) => (
                                  <option key={city} value={city}>
                                    {city} ({grp.region.split(' ')[0]})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                      </select>
                    </div>

                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Kata Kunci Pencarian (Google Maps)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={`Misal: ${selectedCategoryPreset || 'Kos Mahasiswa'} di ${selectedCity}`}
                          className="w-full text-xs font-medium py-2 pl-3 pr-24 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="absolute right-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <FontAwesomeIcon icon={faSearch} className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>{isLoading ? 'Mencari...' : 'Cari'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fast Category Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Preset:</span>
                    {(marketMode === 'indo' ? PRESET_CATEGORIES : GLOBAL_PRESET_CATEGORIES).map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryPreset(cat.query);
                          setQuery(cat.query ? `${cat.query} di ${selectedCity}` : '');
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          selectedCategoryPreset === cat.query
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Filter Switches */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={excludeFranchiseToggle}
                        onChange={(e) => setExcludeFranchiseToggle(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <FontAwesomeIcon icon={faShieldAlt} className="h-3.5 w-3.5 text-emerald-600" />
                        Blokir Jaringan Franchise (Indomaret, Sakamoto, dll)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterIdealOnly}
                        onChange={(e) => setFilterIdealOnly(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <FontAwesomeIcon icon={faBullseye} className="h-3.5 w-3.5 text-blue-600" />
                        Target Ideal Saja (10–100 Ulasan &amp; No Web)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterNoWebsiteOnly}
                        onChange={(e) => setFilterNoWebsiteOnly(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium text-slate-700">Tanpa Website Resmi Saja</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterValidWaOnly}
                        onChange={(e) => setFilterValidWaOnly(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium text-slate-700">WA Seluler Valid Saja</span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Search Results List */}
              {leads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Hasil Pencarian ({filteredLeads.length} dari {leads.length})
                      </span>
                      {selectedLeadIds.length > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {selectedLeadIds.length} dipilih
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (selectedLeadIds.length === filteredLeads.length) {
                          setSelectedLeadIds([]);
                        } else {
                          setSelectedLeadIds(filteredLeads.map((l) => l.id));
                        }
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {selectedLeadIds.length === filteredLeads.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredLeads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      const cleanP = lead.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
                      const isContacted = lead.status === 'contacted';

                      return (
                        <div
                          key={lead.id}
                          className={`bg-white border rounded-xl p-4 transition shadow-xs flex flex-col justify-between ${
                            lead.isIdealTarget
                              ? 'border-emerald-300 ring-1 ring-emerald-100'
                              : isSelected
                              ? 'border-slate-900 ring-1 ring-slate-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Top row: Checkbox, Name, Badges */}
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedLeadIds((prev) =>
                                    prev.includes(lead.id) ? prev.filter((i) => i !== lead.id) : [...prev, lead.id]
                                  )
                                }
                                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="font-bold text-xs text-slate-900 truncate" title={lead.name}>
                                    {lead.name}
                                  </h3>
                                  {lead.isIdealTarget && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Target Ideal
                                    </span>
                                  )}
                                  {isContacted && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Sudah Di-Chat
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5" title={lead.formattedAddress}>
                                  {lead.formattedAddress}
                                </p>
                              </div>
                            </div>

                            {/* Middle metrics: Phone, Website, Rating */}
                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-[11px]">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Kontak WA</span>
                                <span className="font-mono font-medium text-slate-800 truncate block">
                                  {cleanP || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Website</span>
                                <span className="truncate block font-medium">
                                  {lead.websiteUri ? (
                                    <a
                                      href={lead.websiteUri}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <span>Ada</span>
                                      <FontAwesomeIcon icon={faExternalLinkSquare} className="h-2 w-2" />
                                    </a>
                                  ) : (
                                    <span className="text-amber-800">Tanpa Web</span>
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Ulasan Maps</span>
                                <span className="font-mono font-medium text-slate-800">
                                  {lead.rating > 0 ? `${lead.rating} ★ (${lead.userRatingCount || 0})` : '-'}
                                </span>
                              </div>
                            </div>

                            {/* Pitch Snippet / Notes */}
                            {lead.generatedPitch ? (
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-sans line-clamp-2">
                                &quot;{lead.generatedPitch}&quot;
                              </div>
                            ) : null}
                          </div>

                          {/* Bottom Action Bar */}
                          <div className="pt-3 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleGenerateAiPitch(lead)}
                              disabled={generatingAiId === lead.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs"
                            >
                              <FontAwesomeIcon icon={faMagic} className={`h-3 w-3 text-purple-600 ${generatingAiId === lead.id ? 'animate-spin' : ''}`} />
                              <span>{lead.generatedPitch ? 'Draf Ulang' : 'Draf AI'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenWhatsAppManual(lead)}
                                disabled={!cleanP}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPaperPlane} className="h-3 w-3 text-emerald-600" />
                                <span>Chat WA</span>
                              </button>

                              <button
                                onClick={() => handleSendSingleWhatsApp(lead)}
                                disabled={!cleanP || sendingId === lead.id || dispatchCooldown > 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-xs"
                              >
                                <FontAwesomeIcon icon={faBolt} className="h-3 w-3 text-emerald-400" />
                                <span>{sendingId === lead.id ? 'Kirim...' : 'Kirim'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Floating Batch Action Dock */}
              {selectedLeadIds.length > 0 && (
                <div className="sticky bottom-4 z-30 bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-150">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center justify-center font-mono">
                      {selectedLeadIds.length}
                    </span>
                    <span className="text-xs font-semibold">Prospek Terpilih</span>
                    {batchProgress && (
                      <span className="text-[11px] text-emerald-400 font-mono">
                        (Proses {batchProgress.current}/{batchProgress.total} {batchProgress.currentDelay ? `| Jeda: ${batchProgress.currentDelay}s` : ''})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchGenerateAi}
                      disabled={isBatchGenerating || isBatchSending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5" />
                      <span>Draf AI Semua</span>
                    </button>

                    <button
                      onClick={handleBatchSendWhatsApp}
                      disabled={isBatchGenerating || isBatchSending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faBolt} className="h-3.5 w-3.5 fill-current" />
                      <span>Kirim WA Semua (Jeda 45-120s)</span>
                    </button>

                    <button
                      onClick={() => setSelectedLeadIds([])}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: PIPELINE CRM (11-KOLOM SPREADSHEET MIRROR) */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              {/* Top Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pipeline CRM Outreach (11 Kolom Google Sheets)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Single Source of Truth terhubung langsung ke Google Sheets. Seluruh perubahan status tersinkron realtime.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => syncCrmFromSheet(true)}
                    disabled={isSyncingCrm}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer"
                  >
<FontAwesomeIcon icon={faSync} className={`h-3.5 w-3.5 text-slate-500 ${isSyncingCrm ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCrm ? 'Sinkron...' : 'Sync Sheet'}</span>
                  </button>
                  <button
                    onClick={resetCacheAndSyncSheet}
                    disabled={isSyncingCrm}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faSync} className="h-3.5 w-3.5 text-rose-600" />
                    <span>Reset Cache &amp; Sync</span>
                  </button>
                  <button
                    onClick={handleDownloadWaList}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                    <span>Download WA</span>
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faFileExcel} className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Funnel Visualization */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Funnel Pipeline & Konversi</h4>
                <div className="space-y-2">
                  {(() => {
                    const total = savedLeadsCrm.length || 1;
                    const stages = [
                      { key: 'NEW', label: 'NEW', color: 'bg-amber-400' },
                      { key: 'QUALIFIED', label: 'QUALIFIED', color: 'bg-blue-400' },
                      { key: 'CONTACTED', label: 'CONTACTED', color: 'bg-emerald-400' },
                      { key: 'INTERESTED', label: 'INTERESTED', color: 'bg-indigo-400' },
                      { key: 'IN_PROGRESS', label: 'IN_PROGRESS', color: 'bg-cyan-400' },
                      { key: 'CLOSED', label: 'CLOSED (DEAL)', color: 'bg-purple-400' },
                    ];
                    return stages.map((stage, idx) => {
                      const count = savedLeadsCrm.filter((l) => (l.leadStatus || 'NEW').toUpperCase() === stage.key).length;
                      const pct = Math.round((count / total) * 100);
                      const prevCount = idx === 0 ? total : savedLeadsCrm.filter((l) => {
                        const s = (l.leadStatus || 'NEW').toUpperCase();
                        return stages.slice(0, idx).some((st) => st.key === s);
                      }).length || 1;
                      const convRate = count > 0 ? Math.round((count / prevCount) * 100) : 0;
                      return (
                        <div key={stage.key} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 w-32">{stage.label}</span>
                            <span className="font-mono text-slate-600">{count} prospek</span>
                            <span className="font-mono text-slate-400 w-16 text-right">{pct}% dari total</span>
                            <span className="font-mono text-emerald-600 w-20 text-right">{idx === 0 ? '—' : `${convRate}% konversi`}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stage.color} rounded-full transition-all duration-300`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {savedLeadsCrm.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <p className="text-slate-700">
                      <span className="font-bold text-slate-900">Conversion Rate Keseluruhan:</span>{' '}
                      {(() => {
                        const closed = savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'CLOSED').length;
                        const contacted = savedLeadsCrm.filter((l) => {
                          const s = (l.leadStatus || '').toUpperCase();
                          return s === 'CONTACTED' || s === 'INTERESTED' || s === 'IN_PROGRESS' || s === 'CLOSED';
                        }).length;
                        return contacted > 0 ? `${Math.round((closed / contacted) * 100)}%` : '0%';
                      })()}{' '}
                      (CLOSED / CONTACTED)
                    </p>
                    <p className="text-slate-700">
                      <span className="font-bold text-slate-900">Estimasi Revenue Pipeline:</span>{' '}
                      {(() => {
                        const interested = savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'INTERESTED').length;
                        const inProgress = savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'IN_PROGRESS').length;
                        const avgDeal = 2500000;
                        const estRevenue = (interested + inProgress) * avgDeal;
                        return `Rp ${estRevenue.toLocaleString('id-ID')} (${interested + inProgress} prospek x Rp 2.500.000 rata-rata deal)`;
                      })()}
                    </p>
                    <p className="text-slate-500 italic">
                      {(() => {
                        const totalLeads = savedLeadsCrm.length;
                        if (totalLeads === 0) return 'Belum ada data prospek.';
                        const closed = savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'CLOSED').length;
                        const contacted = savedLeadsCrm.filter((l) => {
                          const s = (l.leadStatus || '').toUpperCase();
                          return s === 'CONTACTED' || s === 'INTERESTED' || s === 'IN_PROGRESS' || s === 'CLOSED';
                        }).length;
                        const closeRate = closed / Math.max(1, totalLeads);
                        const neededProspects = closeRate > 0 ? Math.ceil(1 / closeRate) - totalLeads : 7 - contacted;
                        return `Estimasi butuh ${Math.max(0, neededProspects)} prospek lagi untuk dapat 1 klien berikutnya.`;
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setCrmStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'all'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Prospek ({savedLeadsCrm.length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('NEW')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'NEW'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  ⏳ NEW ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'NEW' || l.status === 'new').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('QUALIFIED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'QUALIFIED'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  🎯 QUALIFIED ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'QUALIFIED').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('CONTACTED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'CONTACTED'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  ✅ CONTACTED ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'CONTACTED' || l.status === 'contacted').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('INTERESTED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'INTERESTED'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  🔥 INTERESTED ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'INTERESTED' || l.status === 'followup').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('IN_PROGRESS')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'IN_PROGRESS'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200'
                  }`}
                >
                  ⏳ IN_PROGRESS ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'IN_PROGRESS').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('LOST_FRANCHISE')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'LOST_FRANCHISE'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  🚫 LOST_FRANCHISE ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'LOST_FRANCHISE' || (l.leadStatus || '').toUpperCase() === 'UNQUALIFIED_FRANCHISE').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('LOST_REJECTED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'LOST_REJECTED'
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  ❌ LOST_REJECTED ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'LOST_REJECTED').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('CLOSED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'CLOSED'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  🤝 CLOSED ({savedLeadsCrm.filter((l) => (l.leadStatus || '').toUpperCase() === 'CLOSED' || l.status === 'closed').length})
                </button>
              </div>

              {/* 11-Column Data Table */}
              {savedLeadsCrm.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <FontAwesomeIcon icon={faFileExcel} className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Belum ada prospek tersimpan</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Data di Google Spreadsheet saat ini kosong (0 prospek). Silakan cari prospek via Google Places untuk menambah leads baru atau klik &quot;Sync Sheet&quot;.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => setActiveTab('search')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      <FontAwesomeIcon icon={faSearch} className="h-3.5 w-3.5" />
                      <span>Cari Prospek Baru</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-3">Nama Bisnis</th>
                          <th className="px-3 py-3">Kategori</th>
                          <th className="px-3 py-3">No Telepon</th>
                          <th className="px-3 py-3">Link Maps</th>
                          <th className="px-3 py-3">Rating</th>
                          <th className="px-3 py-3">Website Asli</th>
                          <th className="px-3 py-3">Status Lead</th>
                          <th className="px-3 py-3">Alasan Tolak</th>
                          <th className="px-3 py-3">Draft Pitch</th>
                          <th className="px-3 py-3">Terakhir Sync</th>
                          <th className="px-3 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {savedLeadsCrm
                          .filter((l) => {
                            const currentStatus = (l.leadStatus || 'NEW').toUpperCase();
                            if (crmStatusFilter === 'all') return true;
                            if (crmStatusFilter === 'NEW') return currentStatus === 'NEW' || l.status === 'new';
                            if (crmStatusFilter === 'CONTACTED') return currentStatus === 'CONTACTED' || l.status === 'contacted';
                            if (crmStatusFilter === 'INTERESTED') return currentStatus === 'INTERESTED' || l.status === 'followup';
                            if (crmStatusFilter === 'IN_PROGRESS') return currentStatus === 'IN_PROGRESS';
                            if (crmStatusFilter === 'CLOSED') return currentStatus === 'CLOSED' || l.status === 'closed';
                            if (crmStatusFilter === 'LOST_FRANCHISE') {
                              return currentStatus === 'LOST_FRANCHISE' || currentStatus === 'UNQUALIFIED_FRANCHISE';
                            }
                            if (crmStatusFilter === 'LOST_REJECTED') return currentStatus === 'LOST_REJECTED';
                            return currentStatus === crmStatusFilter;
                          })
                          .map((lead) => {
                            const cleanP =
                              lead.phoneAnalysis?.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
                            const currentStatus = (lead.leadStatus || (lead.status === 'contacted' ? 'CONTACTED' : lead.status === 'closed' ? 'CLOSED' : lead.status === 'followup' ? 'INTERESTED' : lead.status === 'rejected' ? 'LOST_FRANCHISE' : 'NEW')).toUpperCase();

                            return (
                              <tr key={lead.id} className="hover:bg-slate-50/70 transition text-[11px]">
                                <td className="px-3 py-2.5 font-semibold text-slate-900 max-w-[180px]">
                                  <div className="font-semibold text-slate-900 truncate" title={lead.name}>
                                    {lead.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate" title={lead.formattedAddress}>
                                    {lead.formattedAddress}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 capitalize">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-[10px]">
                                    {lead.selectedCategory || lead.primaryType || 'general'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 font-mono">
                                  {cleanP ? (
                                    <span className="text-emerald-700 font-medium">{cleanP}</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                      `${lead.name} ${lead.formattedAddress}`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                    title="Buka di Google Maps"
                                  >
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3" />
                                    <span>Maps</span>
                                  </a>
                                </td>
                                <td className="px-3 py-2.5 font-mono tabular-nums whitespace-nowrap">
                                  {lead.rating > 0 ? `${lead.rating} ★ (${lead.userRatingCount || 0})` : '-'}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {lead.websiteUri || lead.website ? (
                                    <a
                                      href={lead.websiteUri || lead.website || '#'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5 truncate max-w-[100px]"
                                    >
                                      <span>{lead.websiteUri || lead.website}</span>
                                      <FontAwesomeIcon icon={faExternalLinkSquare} className="h-2.5 w-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-medium text-[10px] border border-amber-200">
                                      Tanpa Web
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <select
                                    aria-label="Status Lead CRM"
                                    value={currentStatus}
                                    onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                                    className={`text-[10px] font-semibold py-1 px-1.5 rounded border focus:outline-none cursor-pointer ${
                                      STATUS_CONFIG[currentStatus]?.bg || 'bg-slate-50'
                                    } ${STATUS_CONFIG[currentStatus]?.border || 'border-slate-200'}`}
                                  >
                                    <option value="NEW">NEW</option>
                                    <option value="QUALIFIED">QUALIFIED</option>
                                    <option value="CONTACTED">CONTACTED</option>
                                    <option value="INTERESTED">INTERESTED</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="LOST_FRANCHISE">LOST_FRANCHISE</option>
                                    <option value="LOST_REJECTED">LOST_REJECTED</option>
                                    <option value="CLOSED">CLOSED</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <select
                                    aria-label="Alasan Penolakan"
                                    value={lead.rejectionReason || ''}
                                    onChange={(e) => updateLeadStatus(lead.id, currentStatus, (e.target.value as RejectionReason) || null)}
                                    className="text-[10px] py-1 px-1.5 rounded border border-slate-200 bg-white text-slate-700 cursor-pointer"
                                  >
                                    <option value="">- (Tidak ada)</option>
                                    <option value="Franchise">Franchise</option>
                                    <option value="No Budget">No Budget</option>
                                    <option value="Already Has Vendor">Already Has Vendor</option>
                                    <option value="No Response">No Response</option>
                                    <option value="Corporate">Corporate</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <button
                                    onClick={() => {
                                      const pitch =
                                        lead.generatedPitch ||
                                        lead.aiMessage ||
                                        generateOutreachMessage({
                                          businessName: lead.name,
                                          category: lead.selectedCategory,
                                          rating: lead.rating,
                                          userRatingCount: lead.userRatingCount,
                                          address: lead.formattedAddress,
                                        });
                                      navigator.clipboard.writeText(pitch);
                                      showToast('success', `Draft pitch untuk ${lead.name} disalin!`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium border border-slate-200 cursor-pointer"
                                    title="Klik untuk menyalin draft pitch"
                                  >
                                    <FontAwesomeIcon icon={faCopy} className="h-2.5 w-2.5 text-slate-500" />
                                    <span>Salin</span>
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 text-[10px] text-slate-400 whitespace-nowrap">
                                  {lead.lastSyncAt ? new Date(lead.lastSyncAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    <button
                                      onClick={() => handleOpenWhatsAppManual(lead)}
                                      disabled={!lead.phoneAnalysis?.isMobile && !cleanP}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-300 cursor-pointer"
                                      title="Buka WhatsApp manual"
                                    >
                                      <FontAwesomeIcon icon={faPaperPlane} className="h-2.5 w-2.5 text-emerald-600" />
                                      <span>WA</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setCopilotClientName(lead.name);
                                        setCopilotPhone(cleanP || '');
                                        setCopilotCategory(lead.selectedCategory);
                                        setActiveTab('copilot');
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[10px] border border-purple-200 cursor-pointer"
                                      title="Buka Copilot Balas AI"
                                    >
                                      <FontAwesomeIcon icon={faQuoteLeft} className="h-2.5 w-2.5" />
                                      <span>AI</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: AI RESPONSE COPILOT */}
          {activeTab === 'copilot' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Input Client Message */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faMessage} className="h-4 w-4 text-purple-600" />
                    Pesan Masuk dari Calon Klien
                  </h3>
                  {copilotIntent && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        copilotIntent === 'LOST_FRANCHISE'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : copilotIntent === 'INTERESTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      Intent: {copilotIntent}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Klien / Bisnis</label>
                    <input
                      type="text"
                      value={copilotClientName}
                      onChange={(e) => setCopilotClientName(e.target.value)}
                      placeholder="Misal: Kos Mawar / Pak Budi"
                      className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor WhatsApp</label>
                    <input
                      type="text"
                      value={copilotPhone}
                      onChange={(e) => setCopilotPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full text-xs font-mono py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Tempel Isi Chat dari Klien
                  </label>
                  <textarea
                    rows={6}
                    value={copilotIncomingMessage}
                    onChange={(e) => setCopilotIncomingMessage(e.target.value)}
                    placeholder="Contoh: 'Ini franchise dari pusat kak' atau 'Berapa biaya pembuatannya dan bisa lihat contohnya?'"
                    className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 resize-none"
                  />
                </div>

                <button
                  onClick={handleGenerateCopilotReply}
                  disabled={isGeneratingCopilot || !copilotIncomingMessage.trim()}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FontAwesomeIcon icon={faRobot} className={`h-4 w-4 ${isGeneratingCopilot ? 'animate-spin text-purple-400' : ''}`} />
                  <span>{isGeneratingCopilot ? 'Menganalisis Intent & Draf...' : 'Buat Balasan AI Value-First'}</span>
                </button>
              </div>

              {/* Right Column: AI Output & Dispatch */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faMagic} className="h-4 w-4 text-emerald-600" />
                      Draf Balasan Siap Kirim
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">50–70 Kata</span>
                  </div>

                  <textarea
                    rows={9}
                    value={copilotGeneratedReply}
                    onChange={(e) => setCopilotGeneratedReply(e.target.value)}
                    placeholder="Hasil balasan AI value-first akan muncul di sini. Anda dapat langsung mengeditnya sebelum dikirim..."
                    className="w-full text-xs font-sans py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (!copilotGeneratedReply) return;
                      navigator.clipboard.writeText(copilotGeneratedReply);
                      showToast('success', 'Balasan AI disalin ke clipboard!');
                    }}
                    disabled={!copilotGeneratedReply}
                    className="flex-1 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5 text-slate-500" />
                    <span>Salin Pesan</span>
                  </button>

                  <button
                    onClick={handleSendCopilotReply}
                    disabled={isSendingCopilot || !copilotGeneratedReply || !copilotPhone}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                    <span>{isSendingCopilot ? 'Mengirim...' : 'Kirim via WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: PITCH TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Koleksi Template Value-First (Audit Ringan &amp; Stand QR Kasir)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Template ramah 60–80 kata tanpa kalimat klise sales untuk outreach WhatsApp efektif.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {OUTREACH_CATEGORIES.map((cat) => {
                  const samplePitch = generateOutreachMessage({
                    businessName: `Contoh Bisnis ${cat.label.split(' ')[0]}`,
                    category: cat.id,
                  });

                  return (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {cat.badge}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">~65 kata</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-2">{cat.label}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">{cat.description}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
                        {samplePitch}
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(samplePitch);
                          showToast('success', `Template "${cat.label}" disalin!`);
                        }}
                        className="w-full py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FontAwesomeIcon icon={faCopy} className="h-3 w-3 text-slate-500" />
                        <span>Salin Template</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 5: EXPORT & DATABASE */}
          {activeTab === 'export' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ekspor Data Prospek &amp; Nomor WhatsApp</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Unduh basis data prospek yang telah disaring dan diverifikasi nomor ponselnya untuk CRM atau kampanye outreach.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Database Pipeline CRM</span>
                    <p className="text-xl font-mono font-bold text-slate-900 mt-0.5">{savedLeadsCrm.length}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hasil Pencarian Aktif</span>
                    <p className="text-xl font-mono font-bold text-slate-900 mt-0.5">{filteredLeads.length}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleDownloadCsv}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FontAwesomeIcon icon={faFileExcel} className="h-4 w-4 text-emerald-400" />
                    <span>Unduh File CSV Lengkap (11 Kolom)</span>
                  </button>

                  <button
                    onClick={handleDownloadWaList}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                    <span>Unduh Daftar Nomor WhatsApp Saja (.txt)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

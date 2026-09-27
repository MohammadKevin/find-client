'use client';

import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  Search,
  Phone,
  PhoneCall,
  Globe,
  Globe2,
  ExternalLink,
  Copy,
  Check,
  Send,
  Download,
  Filter,
  Sparkles,
  MapPin,
  Star,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  MessageSquare,
  ChevronDown,
  Zap,
  CheckCheck,
  Bot,
  Users,
  Settings,
  Menu,
  X,
  Smartphone,
  Target,
  ArrowRight,
  Lock,
  LogOut,
  MessageSquareQuote,
  Mail,
  Code2,
} from 'lucide-react';
import {
  generateOutreachMessage,
  detectCategory,
  OutreachCategory,
  OUTREACH_CATEGORIES,
} from '@/lib/template-generator';
import type { PlaceLead } from '@/app/api/places/route';
import {
  normalizeWhatsAppNumber,
  isPhoneContacted,
  getInitialContactedRegistry,
} from '@/lib/phone-utils';
import { GOOGLE_APPS_SCRIPT_SAMPLE_CODE } from '@/app/api/sheets/route';

type ActiveTab = 'search' | 'crm' | 'copilot' | 'templates' | 'export' | 'settings';
type OutreachStatus = 'new' | 'contacted' | 'followup' | 'closed' | 'rejected';

interface LeadWithMeta extends PlaceLead {
  status: OutreachStatus;
  selectedCategory: OutreachCategory;
  aiMessage?: string;
  customNotes?: string;
  addedAt?: string;
}

interface ContactedPhoneRecord {
  cleanPhone: string;
  contactedAt: string;
  businessName: string;
  status: OutreachStatus;
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

export const GLOBAL_REGIONS: RegionGroup[] = [
  {
    region: 'United Kingdom',
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow'],
  },
  {
    region: 'Europe (Germany, France, NL)',
    cities: ['Berlin', 'Munich', 'Paris', 'Amsterdam', 'Rotterdam', 'Dublin', 'Frankfurt', 'Vienna'],
  },
  {
    region: 'United States & Canada',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Toronto', 'Vancouver'],
  },
  {
    region: 'Australia & Asia-Pacific',
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

export const GLOBAL_PRESET_CATEGORIES = [
  { label: 'All Global Categories', query: '' },
  { label: 'Emergency Plumbers & Heating', query: 'Plumber Heating Emergency' },
  { label: 'Dental & Orthodontic Clinics', query: 'Dentist Dental Clinic' },
  { label: 'Roofing & Solar Contractors', query: 'Roofing Solar Contractor' },
  { label: 'Electricians & Smart Home', query: 'Electrician Contractor' },
  { label: 'Auto Detailing & Ceramic Coating', query: 'Auto Detailing Ceramic' },
  { label: 'Artisan Bakery & Specialty Cafe', query: 'Artisan Bakery Cafe' },
  { label: 'Law Firms & Notaries / Solicitors', query: 'Law Firm Solicitor' },
  { label: 'Landscaping & Tree Surgery', query: 'Landscaping Garden Tree' },
  { label: 'Veterinary Clinics & Animal Care', query: 'Veterinary Clinic Vet' },
];

export const GLOBAL_RECOMMENDATIONS: CuratedRecommendation[] = [
  {
    id: 'plumber-london',
    title: 'Emergency Plumbers & Heating',
    city: 'London',
    query: 'Emergency Plumber in London',
    category: 'jasa',
    categoryName: 'Home Services / Urgent',
    tag: 'UK Market',
    opportunityBadge: '£800 - £1,500 Ticket',
    description: 'Emergency trade services desperately need fast mobile-friendly landing pages with tap-to-call buttons.',
  },
  {
    id: 'dentist-manchester',
    title: 'Private Dental & Cosmetic Clinics',
    city: 'Manchester',
    query: 'Private Dental Clinic in Manchester',
    category: 'jasa',
    categoryName: 'Healthcare & Medical',
    tag: 'High Value',
    opportunityBadge: 'High ROI Booking',
    description: 'Cosmetic dentists require modern appointment booking engines and treatment showcase galleries.',
  },
  {
    id: 'roofing-sydney',
    title: 'Roofing & Solar Contractors',
    city: 'Sydney',
    query: 'Roofing Contractors in Sydney',
    category: 'properti',
    categoryName: 'Construction & Renovation',
    tag: 'Australia Market',
    opportunityBadge: '$2,000+ Deal Size',
    description: 'Contractors need professional portfolio showcases with instant free quote estimation forms.',
  },
  {
    id: 'detailing-la',
    title: 'Auto Detailing & Ceramic Coating',
    city: 'Los Angeles',
    query: 'Auto Detailing in Los Angeles',
    category: 'rental',
    categoryName: 'Automotive Services',
    tag: 'US Market',
    opportunityBadge: 'High Conversion',
    description: 'Auto detailers need visual Before/After galleries and package booking directly connected to inquiry forms.',
  },
  {
    id: 'bakery-amsterdam',
    title: 'Artisan Bakery & Coffee Shops',
    city: 'Amsterdam',
    query: 'Artisan Bakery in Amsterdam',
    category: 'umkm',
    categoryName: 'Hospitality & Food',
    tag: 'Europe Market',
    opportunityBadge: 'Menu & Pre-orders',
    description: 'Local cafes need clean visual menu displays and Google Maps search conversion websites.',
  },
  {
    id: 'electrician-berlin',
    title: 'Electricians & Smart Home Tech',
    city: 'Berlin',
    query: 'Electrician in Berlin',
    category: 'jasa',
    categoryName: 'Commercial Trade',
    tag: 'Germany Market',
    opportunityBadge: 'High Search Volume',
    description: 'Certified electricians benefit immensely from search-optimized profile pages with instant WhatsApp/call links.',
  },
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
    region: 'Sulawesi & Indonesia Timur',
    cities: ['Makassar', 'Manado', 'Palu', 'Kendari', 'Jayapura', 'Ambon'],
  },
];

export const BULK_CATEGORIES = [
  { id: 'kos', label: 'Kos-Kosan & Homestay', query: 'Kos Kosan Homestay' },
  { id: 'bimbel', label: 'Bimbel & Kursus', query: 'Bimbel Kursus' },
  { id: 'klinik', label: 'Klinik & Dokter Gigi', query: 'Klinik Dokter Gigi' },
  { id: 'konveksi', label: 'Konveksi & Sablon', query: 'Konveksi Sablon' },
  { id: 'wedding', label: 'Wedding & Fotografi', query: 'Wedding Organizer Fotografer' },
  { id: 'properti', label: 'Kontraktor & Interior', query: 'Kontraktor Desain Interior' },
  { id: 'rental', label: 'Rental Mobil & Sewa Alat', query: 'Rental Mobil' },
  { id: 'bengkel', label: 'Bengkel & Detailing Mobil', query: 'Bengkel Otomotif' },
  { id: 'katering', label: 'Katering & Bakery', query: 'Katering Bakery' },
  { id: 'florist', label: 'Florist & Toko Bunga', query: 'Florist Toko Bunga' },
  { id: 'percetakan', label: 'Percetakan & Digital Print', query: 'Percetakan Digital Printing' },
  { id: 'salon', label: 'Salon & Barbershop', query: 'Salon Barbershop' },
  { id: 'mebel', label: 'Toko Mebel & Furniture', query: 'Toko Mebel Furniture' },
  { id: 'laundry', label: 'Laundry & Cuci Sepatu', query: 'Laundry Cuci Sepatu' },
];

const PRESET_CATEGORIES = [
  { label: 'Semua Kategori', query: '' },
  { label: 'Kos-Kosan & Homestay', query: 'Kos Kosan Homestay' },
  { label: 'Bimbel & Kursus', query: 'Bimbel Kursus' },
  { label: 'Kesehatan & Klinik Gigi', query: 'Klinik Dokter Gigi' },
  { label: 'Konveksi & Sablon Kaos', query: 'Konveksi Sablon' },
  { label: 'Wedding & Fotografi', query: 'Wedding Organizer Fotografer' },
  { label: 'Kontraktor & Interior', query: 'Kontraktor Desain Interior' },
  { label: 'Rental Mobil & Sewa Alat', query: 'Rental Mobil' },
  { label: 'Bengkel & Salon Mobil', query: 'Bengkel Otomotif' },
  { label: 'Katering & Bakery', query: 'Katering Bakery' },
  { label: 'Florist & Toko Bunga', query: 'Florist Toko Bunga' },
  { label: 'Percetakan Digital', query: 'Percetakan Digital Printing' },
  { label: 'Salon & Barbershop', query: 'Salon Barbershop' },
  { label: 'Toko Mebel & Furniture', query: 'Toko Mebel Furniture' },
  { label: 'Laundry & Cuci Sepatu', query: 'Laundry Cuci Sepatu' },
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

const CURATED_RECOMMENDATIONS: CuratedRecommendation[] = [
  {
    id: 'kos-surabaya',
    title: 'Kos-Kosan & Homestay',
    city: 'Surabaya',
    query: 'Kos Kosan di Surabaya',
    category: 'kos',
    categoryName: 'Properti & Sewa Kamar',
    tag: 'Tinggi Peminat',
    opportunityBadge: 'Sistem Booking & KTP',
    description: 'Pemilik kos sangat butuh katalog kamar live, form booking online dengan upload KTP aman, dan auto-reminder sewa.',
  },
  {
    id: 'bimbel-malang',
    title: 'Bimbel & Kursus Bahasa',
    city: 'Malang',
    query: 'Bimbel Kursus di Malang',
    category: 'jasa',
    categoryName: 'Jasa Pendidikan',
    tag: 'Kota Pelajar',
    opportunityBadge: 'Potensi Deal 85%',
    description: 'Bimbel butuh landing page resmi untuk info jadwal program, paket les, dan pendaftaran siswa baru tanpa antre.',
  },
  {
    id: 'konveksi-bandung',
    title: 'Konveksi & Sablon Kaos',
    city: 'Bandung',
    query: 'Konveksi Sablon di Bandung',
    category: 'umkm',
    categoryName: 'UMKM Retail',
    tag: 'Pusat Fashion',
    opportunityBadge: 'Order Cepat',
    description: 'Konveksi butuh website katalog portofolio bahan, size chart, dan daftar harga tanpa repot balas chat berulang.',
  },
  {
    id: 'wedding-jogja',
    title: 'Wedding Organizer & MUA',
    city: 'Jogja',
    query: 'Wedding Organizer di Jogja',
    category: 'wedding',
    categoryName: 'Wedding & Event',
    tag: 'Event & Wedding',
    opportunityBadge: 'Showcase Portofolio',
    description: 'WO butuh galeri foto/video hasil karya berkualitas HD dan rincian paket pricelist untuk calon pengantin.',
  },
  {
    id: 'klinik-medan',
    title: 'Klinik Gigi & Dokter',
    city: 'Medan',
    query: 'Klinik Dokter Gigi di Medan',
    category: 'jasa',
    categoryName: 'Kesehatan Medis',
    tag: 'Kredibilitas',
    opportunityBadge: 'Nilai Proyek Tinggi',
    description: 'Klinik membutuhkan website profil kredibel di pencarian Google untuk jadwal dokter dan reservasi pasien.',
  },
  {
    id: 'rental-makassar',
    title: 'Rental Mobil & Sewa Armada',
    city: 'Makassar',
    query: 'Rental Mobil di Makassar',
    category: 'rental',
    categoryName: 'Transportasi & Rental',
    tag: 'Pariwisata',
    opportunityBadge: 'Katalog Armada',
    description: 'Rental butuh katalog unit mobil/motor dengan tarif harian dan syarat sewa agar pelanggan langsung order ke WA.',
  },
];

const STATUS_CONFIG: Record<
  OutreachStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  new: {
    label: 'Baru (New)',
    bg: 'bg-blue-50 text-blue-700',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Sparkles,
  },
  contacted: {
    label: 'Sudah Dikontak',
    bg: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: Send,
  },
  followup: {
    label: 'Perlu Follow-up',
    bg: 'bg-amber-50 text-amber-800',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
  },
  closed: {
    label: 'Deal / Selesai',
    bg: 'bg-indigo-50 text-indigo-700',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Tidak Tertarik',
    bg: 'bg-slate-100 text-slate-600',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: XCircle,
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [marketMode, setMarketMode] = useState<'indo' | 'global'>('indo');

  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Malang');
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(PRESET_CATEGORIES[1].query);
  const [filterNoWebsiteOnly, setFilterNoWebsiteOnly] = useState(true);
  const [filterValidWaOnly, setFilterValidWaOnly] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');

  const [phoneRegistry, setPhoneRegistry] = useState<Record<string, ContactedPhoneRecord>>(() =>
    getInitialContactedRegistry()
  );

  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_sheets_webapp_url') || process.env.NEXT_PUBLIC_LEADS_SHEET_API || '';
    }
    return '';
  });
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncInfo, setSheetsSyncInfo] = useState<{
    connected: boolean;
    count: number;
    lastSynced?: string;
    error?: string | null;
  } | null>(null);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);

  const [dispatchCooldown, setDispatchCooldown] = useState<number>(0);

  const [serpApiKey, setSerpApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [fonnteToken, setFonnteToken] = useState('');
  const [senderName, setSenderName] = useState('Mohammad Kevin');
  const [senderRole, setSenderRole] = useState('freelance web developer');
  const [senderEmail, setSenderEmail] = useState('mhmdkevin198@gmail.com');

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

  const [crmStatusFilter, setCrmStatusFilter] = useState<'all' | OutreachStatus>('all');

  const [copilotIncomingMessage, setCopilotIncomingMessage] = useState('');
  const [copilotClientName, setCopilotClientName] = useState('');
  const [copilotCategory, setCopilotCategory] = useState<OutreachCategory>('general');
  const [copilotGoal, setCopilotGoal] = useState('closing_offer');
  const [copilotPhone, setCopilotPhone] = useState('');
  const [copilotGeneratedReply, setCopilotGeneratedReply] = useState('');
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState(false);
  const [isSendingCopilot, setIsSendingCopilot] = useState(false);

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [quickPresetFilter, setQuickPresetFilter] = useState<
    'all' | 'uncontacted' | 'contacted' | 'hot' | 'wa_ready'
  >('all');

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCities, setBulkCities] = useState<string[]>([
    'Malang',
    'Surabaya',
    'Bandung',
    'Medan',
    'Makassar',
    'Semarang',
  ]);
  const [bulkCategories, setBulkCategories] = useState<string[]>([
    'Bimbel Kursus',
    'Konveksi Sablon',
    'Klinik Dokter',
  ]);
  const [isBulkScraping, setIsBulkScraping] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    currentQuery: string;
    foundCount: number;
  } | null>(null);
  const abortBulkRef = useRef(false);

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
        }, 500);
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

  const handleSyncWithGoogleSheets = async (targetUrl?: string) => {
    const urlToUse = targetUrl !== undefined ? targetUrl : googleSheetsUrl;
    setIsSyncingSheets(true);
    try {
      const res = await fetch(
        `/api/sheets${urlToUse ? `?sheetUrl=${encodeURIComponent(urlToUse)}` : ''}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.contactedNumbers)) {
          setPhoneRegistry((prev) => {
            const next = { ...prev };
            data.contactedNumbers.forEach((p: string) => {
              if (!next[p]) {
                next[p] = {
                  cleanPhone: p,
                  contactedAt: new Date().toISOString(),
                  businessName: 'Database Kontak Google Sheets',
                  status: 'contacted',
                };
              }
            });
            try {
              localStorage.setItem('lead_phone_registry', JSON.stringify(next));
            } catch {}
            return next;
          });

          setLeads((prevLeads) =>
            prevLeads.map((lead) => {
              const clean =
                lead.phoneAnalysis.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
              if (clean && data.contactedNumbers.includes(clean) && lead.status === 'new') {
                return { ...lead, status: 'contacted' };
              }
              return lead;
            })
          );
        }

        setSheetsSyncInfo({
          connected: Boolean(data.sheetsConnected),
          count: data.totalContacted || data.contactedNumbers?.length || 0,
          lastSynced: new Date().toLocaleTimeString('id-ID'),
          error: data.syncError,
        });

        if (data.sheetsConnected) {
          showToast(
            'success',
            `Berhasil tersambung ke Google Sheets (${data.totalContacted} nomor tersinkron).`
          );
        } else if (urlToUse) {
          showToast('error', data.syncError || 'Gagal tersambung ke Google Apps Script.');
        } else {
          showToast(
            'success',
            `Database lokal aktif (${data.totalContacted} riwayat nomor siap sinkron).`
          );
        }
      } else {
        showToast('error', data.error || 'Sinkronisasi gagal.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi endpoint sinkronisasi.';
      showToast('error', msg);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  useEffect(() => {
    try {
      const pin = sessionStorage.getItem('leadfinder_auth_pin');
      if (pin === '1992') {
        setIsAuthenticated(true); // eslint-disable-line react-hooks/set-state-in-effect
      }
      const storedRegistry = localStorage.getItem('lead_phone_registry');
      if (storedRegistry) {
        setPhoneRegistry((prev) => ({ ...prev, ...JSON.parse(storedRegistry) }));
      }
      const storedUrl = localStorage.getItem('google_sheets_webapp_url');
      if (storedUrl) setGoogleSheetsUrl(storedUrl);
      const storedSerp = localStorage.getItem('serpapi_api_key');
      if (storedSerp) setSerpApiKey(storedSerp);
      const storedGemini = localStorage.getItem('gemini_api_key');
      if (storedGemini) setGeminiApiKey(storedGemini);
      const storedFonnte = localStorage.getItem('fonnte_api_token');
      if (storedFonnte) setFonnteToken(storedFonnte);
      const storedSender = localStorage.getItem('lead_sender_name');
      if (storedSender) setSenderName(storedSender);
      const storedRole = localStorage.getItem('lead_sender_role');
      if (storedRole) setSenderRole(storedRole);
      const storedEmail = localStorage.getItem('lead_sender_email');
      if (storedEmail) setSenderEmail(storedEmail);
      const storedStatuses = localStorage.getItem('lead_outreach_statuses');
      if (storedStatuses) setSavedStatuses(JSON.parse(storedStatuses));
      const storedCrm = localStorage.getItem('lead_saved_crm_records');
      if (storedCrm) setSavedLeadsCrm(JSON.parse(storedCrm));
    } catch {}
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialSync = async () => {
      try {
        const res = await fetch(
          `/api/sheets${googleSheetsUrl ? `?sheetUrl=${encodeURIComponent(googleSheetsUrl)}` : ''}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.success && Array.isArray(data.contactedNumbers)) {
          setPhoneRegistry((prev) => {
            const next = { ...prev };
            data.contactedNumbers.forEach((p: string) => {
              if (!next[p]) {
                next[p] = {
                  cleanPhone: p,
                  contactedAt: new Date().toISOString(),
                  businessName: 'Database Kontak Google Sheets',
                  status: 'contacted',
                };
              }
            });
            try {
              localStorage.setItem('lead_phone_registry', JSON.stringify(next));
            } catch {}
            return next;
          });

          setSheetsSyncInfo({
            connected: Boolean(data.sheetsConnected),
            count: data.totalContacted || data.contactedNumbers.length || 0,
            lastSynced: new Date().toLocaleTimeString('id-ID'),
            error: data.syncError,
          });
        }
      } catch {}
    };

    initialSync();
    return () => {
      isMounted = false;
    };
  }, [googleSheetsUrl]);

  const handleSaveApiKeys = () => {
    try {
      localStorage.setItem('serpapi_api_key', serpApiKey);
      localStorage.setItem('gemini_api_key', geminiApiKey);
      localStorage.setItem('fonnte_api_token', fonnteToken);
      localStorage.setItem('google_sheets_webapp_url', googleSheetsUrl);
      localStorage.setItem('lead_sender_name', senderName);
      localStorage.setItem('lead_sender_role', senderRole);
      localStorage.setItem('lead_sender_email', senderEmail);
      showToast('success', 'Pengaturan API, Google Sheets & Profil berhasil disimpan.');
      if (googleSheetsUrl) {
        handleSyncWithGoogleSheets(googleSheetsUrl);
      }
    } catch {
      showToast('error', 'Gagal menyimpan konfigurasi ke browser storage.');
    }
  };

  const registerContactHistory = (lead: LeadWithMeta, status: OutreachStatus = 'contacted') => {
    const cleanPhone =
      lead.phoneAnalysis.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
    if (cleanPhone) {
      setPhoneRegistry((prev) => {
        const next = {
          ...prev,
          [cleanPhone]: {
            cleanPhone,
            contactedAt: new Date().toISOString(),
            businessName: lead.name,
            status,
          },
        };
        try {
          localStorage.setItem('lead_phone_registry', JSON.stringify(next));
        } catch {}
        return next;
      });

      fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: lead.nationalPhoneNumber || cleanPhone,
          normalizedPhone: cleanPhone,
          name: lead.name,
          address: lead.formattedAddress,
          category: lead.selectedCategory,
          status: status === 'contacted' ? 'Sudah Di-Chat' : status,
          contactedAt: new Date().toISOString(),
          sheetUrl: googleSheetsUrl || undefined,
        }),
      }).catch(() => {});
    }
    updateLeadStatus(lead.id, status);
  };

  const updateLeadStatus = (placeId: string, newStatus: OutreachStatus) => {
    const updatedStatuses = { ...savedStatuses, [placeId]: newStatus };
    setSavedStatuses(updatedStatuses);
    try {
      localStorage.setItem('lead_outreach_statuses', JSON.stringify(updatedStatuses));
    } catch {}

    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === placeId) {
          const updated = { ...lead, status: newStatus };
          saveLeadToCrm(updated);
          return updated;
        }
        return lead;
      })
    );

    setSavedLeadsCrm((prev) =>
      prev.map((l) => (l.id === placeId ? { ...l, status: newStatus } : l))
    );
  };

  const saveLeadToCrm = (lead: LeadWithMeta) => {
    setSavedLeadsCrm((prev) => {
      const exists = prev.some((item) => item.id === lead.id);
      let updated: LeadWithMeta[];
      if (exists) {
        updated = prev.map((item) => (item.id === lead.id ? { ...item, ...lead } : item));
      } else {
        updated = [{ ...lead, addedAt: new Date().toLocaleDateString('id-ID') }, ...prev];
      }
      try {
        localStorage.setItem('lead_saved_crm_records', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateLeadCategory = (placeId: string, category: OutreachCategory) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === placeId ? { ...lead, selectedCategory: category } : lead
      )
    );
  };

  const handleSwitchMarket = (mode: 'indo' | 'global') => {
    setMarketMode(mode);
    if (mode === 'global') {
      setSelectedCity('London');
      setSelectedCategoryPreset(GLOBAL_PRESET_CATEGORIES[1].query);
      const q = 'Emergency Plumber in London';
      setQuery(q);
      executeSearch(q, 'global');
    } else {
      setSelectedCity('Surabaya');
      setSelectedCategoryPreset(PRESET_CATEGORIES[1].query);
      const q = 'Kos Kosan di Surabaya';
      setQuery(q);
      executeSearch(q, 'indo');
    }
  };

  const executeSearch = async (targetQuery?: string, targetMode?: 'indo' | 'global') => {
    const activeQuery = (targetQuery !== undefined ? targetQuery : query).trim();
    const activeMode = targetMode || marketMode;
    if (!activeQuery) {
      setErrorMessage('Ketik kata kunci pencarian atau pilih preset.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          apiKey: serpApiKey || undefined,
          marketMode: activeMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari Google Maps.');
      }

      const formatted: LeadWithMeta[] = (data.places || []).map((p: PlaceLead) => {
        const detected = detectCategory(p.name, activeQuery);
        
        const cleanP =
          p.phoneAnalysis.cleaned || normalizeWhatsAppNumber(p.nationalPhoneNumber);
        const phoneMemory = cleanP ? phoneRegistry[cleanP] : null;
        let determinedStatus = savedStatuses[p.id] || 'new';

        if (cleanP && isPhoneContacted(cleanP, phoneRegistry) && determinedStatus === 'new') {
          determinedStatus = 'contacted';
        } else if (phoneMemory && determinedStatus === 'new') {
          determinedStatus = phoneMemory.status;
        }

        const leadObj: LeadWithMeta = {
          ...p,
          status: determinedStatus,
          selectedCategory: detected,
          addedAt: new Date().toLocaleDateString('id-ID'),
        };
        saveLeadToCrm(leadObj);
        return leadObj;
      });

      setLeads(formatted);
      if (formatted.length === 0) {
        setErrorMessage('Tidak ada data yang ditemukan untuk pencarian ini.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (catQuery: string, city: string) => {
    setSelectedCategoryPreset(catQuery);
    setSelectedCity(city);
    const combined = catQuery ? `${catQuery} di ${city}` : `Bisnis di ${city}`;
    setQuery(combined);
    executeSearch(combined);
  };

  const handleRunBulkScraper = async () => {
    if (bulkCities.length === 0 || bulkCategories.length === 0) {
      showToast('error', 'Pilih minimal 1 kota dan 1 kategori untuk bulk scraping.');
      return;
    }

    const combinations: { query: string; city: string; catQuery: string }[] = [];
    for (const city of bulkCities) {
      for (const cat of bulkCategories) {
        combinations.push({
          query: `${cat} di ${city}`,
          city,
          catQuery: cat,
        });
      }
    }

    setIsBulkScraping(true);
    abortBulkRef.current = false;
    let totalFound = 0;
    const aggregatedLeads: LeadWithMeta[] = [...leads];
    const existingIds = new Set(aggregatedLeads.map((l) => l.id));
    const existingPhones = new Set(
      aggregatedLeads.map((l) => l.phoneAnalysis.cleaned).filter(Boolean)
    );

    setBulkProgress({
      current: 0,
      total: combinations.length,
      currentQuery: combinations[0].query,
      foundCount: 0,
    });

    for (let i = 0; i < combinations.length; i++) {
      if (abortBulkRef.current) break;

      const item = combinations[i];
      setBulkProgress({
        current: i + 1,
        total: combinations.length,
        currentQuery: item.query,
        foundCount: totalFound,
      });

      try {
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: item.query,
            apiKey: serpApiKey || undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && Array.isArray(data.places)) {
          for (const p of data.places as PlaceLead[]) {
            const cleanP =
              p.phoneAnalysis.cleaned || normalizeWhatsAppNumber(p.nationalPhoneNumber);
            if (!existingIds.has(p.id) && (!cleanP || !existingPhones.has(cleanP))) {
              existingIds.add(p.id);
              if (cleanP) existingPhones.add(cleanP);

              const detected = detectCategory(p.name, item.query);
              const phoneMemory = cleanP ? phoneRegistry[cleanP] : null;
              let determinedStatus = savedStatuses[p.id] || 'new';
              if (cleanP && isPhoneContacted(cleanP, phoneRegistry) && determinedStatus === 'new') {
                determinedStatus = 'contacted';
              } else if (phoneMemory && determinedStatus === 'new') {
                determinedStatus = phoneMemory.status;
              }

              const leadObj: LeadWithMeta = {
                ...p,
                status: determinedStatus,
                selectedCategory: detected,
                addedAt: new Date().toLocaleDateString('id-ID'),
              };
              aggregatedLeads.unshift(leadObj);
              saveLeadToCrm(leadObj);
              totalFound++;
            }
          }
          setLeads([...aggregatedLeads]);
        }
      } catch {}

      if (i < combinations.length - 1 && !abortBulkRef.current) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setIsBulkScraping(false);
    setBulkProgress(null);
    setShowBulkModal(false);
    showToast(
      'success',
      `Bulk Scraper Selesai: Mengumpulkan ${totalFound} prospek baru dari ${bulkCities.length} kota!`
    );
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const cleanP =
        item.phoneAnalysis.cleaned || normalizeWhatsAppNumber(item.nationalPhoneNumber);
      const isContactedLead =
        (cleanP && isPhoneContacted(cleanP, phoneRegistry)) ||
        item.status === 'contacted' ||
        item.status === 'followup' ||
        item.status === 'closed';

      if (quickPresetFilter === 'uncontacted') {
        if (isContactedLead || item.status !== 'new') return false;
      } else if (quickPresetFilter === 'contacted') {
        if (!isContactedLead && item.status === 'new') return false;
      } else if (quickPresetFilter === 'hot') {
        if (item.hasWebsite || item.rating < 4.5) return false;
      } else if (quickPresetFilter === 'wa_ready') {
        if (!item.phoneAnalysis.isValid || !item.phoneAnalysis.isMobile) return false;
      }

      if (filterNoWebsiteOnly && item.hasWebsite) return false;
      if (filterValidWaOnly && (!item.phoneAnalysis.isValid || !item.phoneAnalysis.isMobile)) {
        return false;
      }
      if (minRatingFilter > 0 && item.rating < minRatingFilter) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [leads, quickPresetFilter, filterNoWebsiteOnly, filterValidWaOnly, minRatingFilter, statusFilter, phoneRegistry]);

  const toggleLeadSelect = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (items: LeadWithMeta[]) => {
    if (selectedLeadIds.length === items.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(items.map((i) => i.id));
    }
  };

  const handleBatchGenerateAi = async () => {
    const targetLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    if (targetLeads.length === 0) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: targetLeads.length });

    let count = 0;
    for (const lead of targetLeads) {
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
            senderEmail,
            marketMode,
            geminiKey: geminiApiKey || undefined,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setLeads((prev) =>
            prev.map((item) => (item.id === lead.id ? { ...item, aiMessage: data.message } : item))
          );
        }
      } catch {}
      count++;
      setBatchProgress({ current: count, total: targetLeads.length });
    }

    setIsBatchGenerating(false);
    setBatchProgress(null);
    showToast('success', `Draf AI selesai dibuat untuk ${targetLeads.length} prospek.`);
  };

  const handleBatchSendWhatsApp = async () => {
    const targetLeads = leads.filter(
      (l) => selectedLeadIds.includes(l.id) && l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile
    );
    if (targetLeads.length === 0) {
      showToast('error', 'Tidak ada nomor WhatsApp valid di antara prospek yang dipilih.');
      return;
    }

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: targetLeads.length });

    let count = 0;
    for (const lead of targetLeads) {
      const msg =
        lead.aiMessage ||
        generateOutreachMessage({
          businessName: lead.name,
          category: lead.selectedCategory,
          senderName,
          senderRole,
        });

      try {
        await fetch('/api/send-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: lead.phoneAnalysis.cleaned,
            message: msg,
            token: fonnteToken || undefined,
          }),
        });
        registerContactHistory(lead, 'contacted');
      } catch {}

      count++;
      setBatchProgress({ current: count, total: targetLeads.length });

      if (count < targetLeads.length) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    setIsBatchSending(false);
    setBatchProgress(null);
    showToast('success', `Selesai mengirim ${count} pesan WhatsApp otomatis.`);
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const noWebsite = leads.filter((l) => !l.hasWebsite).length;
    const validWa = leads.filter(
      (l) => l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile
    ).length;
    const contacted = leads.filter((l) => {
      const cleanP =
        l.phoneAnalysis.cleaned || normalizeWhatsAppNumber(l.nationalPhoneNumber);
      return (
        (cleanP && isPhoneContacted(cleanP, phoneRegistry)) ||
        l.status === 'contacted' ||
        l.status === 'followup' ||
        l.status === 'closed'
      );
    }).length;
    const uncontacted = Math.max(0, total - contacted);

    return { total, noWebsite, validWa, contacted, uncontacted };
  }, [leads, phoneRegistry]);

  const handleGenerateGeminiPitch = async (lead: LeadWithMeta) => {
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
          senderEmail,
          marketMode,
          geminiKey: geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal generate draf Gemini AI.');
      }

      const aiText = data.message;
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, aiMessage: aiText } : item))
      );

      setPreviewModalLead({ ...lead, aiMessage: aiText });
      setEditedMessage(aiText);
      showToast('success', `Draf pesan untuk ${lead.name} selesai dibuat.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi ke Gemini AI gagal.';
      showToast('error', msg);
    } finally {
      setGeneratingAiId(null);
    }
  };

  const handleCopyMessage = async (lead: LeadWithMeta) => {
    const message =
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        senderName,
        senderRole,
      });

    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(lead.id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast('success', `Pesan untuk ${lead.name} tersalin ke clipboard.`);
    } catch {
    }
  };

  const handleOpenWhatsAppManual = (lead: LeadWithMeta) => {
    if (!lead.phoneAnalysis.isValid || !lead.phoneAnalysis.isMobile) {
      showToast('error', 'Nomor bukan WhatsApp seluler yang valid.');
      return;
    }

    const message =
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        senderName,
        senderRole,
      });

    const cleanPhone =
      lead.phoneAnalysis.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    registerContactHistory(lead, 'contacted');
    showToast(
      'success',
      `Membuka WA & memperbarui status ${lead.name} menjadi "Sudah Di-Chat" (Disinkronkan ke Google Sheets).`
    );
  };

  const handleAutoSendWhatsApp = async (lead: LeadWithMeta, customText?: string) => {
    if (dispatchCooldown > 0) {
      showToast('error', `Anti-ban aktif. Tunggu ${dispatchCooldown} detik sebelum kirim berikutnya.`);
      return;
    }

    if (!lead.phoneAnalysis.isValid || !lead.phoneAnalysis.isMobile) {
      showToast('error', 'Nomor telepon bukan seluler WhatsApp yang valid.');
      return;
    }

    const messageToSend =
      customText ||
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        senderName,
        senderRole,
      });

    setSendingId(lead.id);

    try {
      const res = await fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: lead.phoneAnalysis.cleaned,
          message: messageToSend,
          token: fonnteToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pesan via WhatsApp Gateway.');
      }

      setDispatchCooldown(3);
      registerContactHistory(lead, 'contacted');
      showToast('success', `Pesan berhasil dikirim ke ${lead.name} (${lead.phoneAnalysis.cleaned}).`);
      
      if (previewModalLead?.id === lead.id) {
        setPreviewModalLead(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pengiriman WhatsApp gagal.';
      showToast('error', msg);
    } finally {
      setSendingId(null);
    }
  };


  const handleOpenPreview = (lead: LeadWithMeta) => {
    const initialText =
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        senderName,
        senderRole,
      });
    setPreviewModalLead(lead);
    setEditedMessage(initialText);
  };

  const openCopilotForLead = (lead: LeadWithMeta) => {
    setCopilotClientName(lead.name);
    setCopilotCategory(lead.selectedCategory);
    setCopilotPhone(lead.phoneAnalysis.cleaned || '');
    setActiveTab('copilot');
    setMobileSidebarOpen(false);
  };

  const handleGenerateCopilotReply = async (customIncoming?: string) => {
    const textToProcess = customIncoming !== undefined ? customIncoming : copilotIncomingMessage;
    if (!textToProcess.trim()) {
      showToast('error', 'Masukkan atau paste pesan dari klien terlebih dahulu.');
      return;
    }

    setIsGeneratingCopilot(true);
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomingMessage: textToProcess,
          businessName: copilotClientName || 'Klien',
          category: copilotCategory,
          replyGoal: copilotGoal,
          senderName,
          senderRole,
          geminiKey: geminiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat balasan AI.');
      }

      setCopilotGeneratedReply(data.reply);
      showToast('success', 'Balasan cerdas berhasil dibuat!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi AI gagal.';
      showToast('error', msg);
    } finally {
      setIsGeneratingCopilot(false);
    }
  };

  const handleSendCopilotDirect = async () => {
    if (!copilotPhone.trim()) {
      showToast('error', 'Masukkan nomor WhatsApp tujuan terlebih dahulu.');
      return;
    }

    if (!copilotGeneratedReply.trim()) {
      showToast('error', 'Buat atau tulis teks balasan terlebih dahulu.');
      return;
    }

    setIsSendingCopilot(true);
    try {
      const res = await fetch('/api/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: copilotPhone.trim(),
          message: copilotGeneratedReply.trim(),
          token: fonnteToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim balasan via WhatsApp Gateway.');
      }

      showToast('success', `Balasan berhasil dikirim ke ${copilotPhone}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pengiriman balasan gagal.';
      showToast('error', msg);
    } finally {
      setIsSendingCopilot(false);
    }
  };

  const handleDownloadWaList = () => {
    const listToExport = activeTab === 'crm' ? savedLeadsCrm : filteredLeads;
    const validNumbers = listToExport
      .filter((l) => l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile)
      .map((l) => l.phoneAnalysis.cleaned);

    const uniqueNumbers = Array.from(new Set(validNumbers));

    if (uniqueNumbers.length === 0) {
      alert('Tidak ada nomor WhatsApp valid yang siap diunduh.');
      return;
    }

    const content = uniqueNumbers.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-whatsapp-${selectedCity.toLowerCase() || 'export'}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const listToExport = activeTab === 'crm' ? savedLeadsCrm : filteredLeads;
    if (listToExport.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'Nama Bisnis',
      'Nomor WhatsApp',
      'Tipe Nomor',
      'Status Website',
      'Website URL',
      'Rating',
      'Jumlah Ulasan',
      'Status Outreach',
      'Alamat Lengkap',
    ];

    const rows = listToExport.map((l) => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.phoneAnalysis.cleaned || l.nationalPhoneNumber || ''}"`,
      `"${l.phoneAnalysis.type}"`,
      `"${l.hasWebsite ? 'Punya Website' : 'Tanpa Website'}"`,
      `"${l.websiteUri || ''}"`,
      `"${l.rating || 0}"`,
      `"${l.userRatingCount || 0}"`,
      `"${STATUS_CONFIG[l.status]?.label || l.status}"`,
      `"${(l.formattedAddress || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-data-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 0. Pre-Flight Authentication Wall (PIN 1992)
  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Target className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight text-slate-900">LeadFinder Pro</h1>
            <p className="text-xs text-slate-500">Memuat workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isAppLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 select-none animate-in fade-in zoom-in-95 duration-200">
        <div className="max-w-sm w-full bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-emerald-700" />
          </div>
          
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-1">Akses Terkunci</h1>
          <p className="text-xs text-slate-500 mb-8">
            Silakan masukkan kode PIN 4 angka untuk membuka workspace LeadFinder Pro.
          </p>

          <div className={`flex items-center gap-3 mb-6 transition-transform ${pinError ? 'animate-bounce' : ''}`}>
            {pinInputs.map((val, index) => (
              <input
                key={index}
                ref={pinInputRefs[index]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handlePinInput(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                className={`w-14 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 focus:outline-none transition ${
                  pinError 
                    ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                    : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50'
                }`}
                autoComplete="off"
              />
            ))}
          </div>

          {pinError ? (
            <p className="text-[11px] font-semibold text-red-600 animate-pulse">PIN salah. Silakan coba lagi.</p>
          ) : (
            <p className="text-[11px] font-medium text-slate-400">Restricted Enterprise Access</p>
          )}
        </div>
      </div>
    );
  }

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center fade-out zoom-out-95 duration-500">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Target className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight text-slate-900">LeadFinder Pro</h1>
            <p className="text-xs text-slate-500">Memuat workspace dan konfigurasi gateway...</p>
          </div>
          <div className="w-40 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-emerald-600 rounded-full animate-[progress_0.6s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col md:flex-row antialiased font-sans">
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-150">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm border text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-xs tracking-tight text-slate-900 flex items-center gap-1">
                  LeadFinder Pro
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    B2B
                  </span>
                </h2>
                <p className="text-[10px] text-slate-500">Outreach Workspace</p>
              </div>
            </div>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-4 space-y-1 flex-1">
            <button
              onClick={() => {
                setActiveTab('search');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-slate-500" />
                <span>Cari Prospek</span>
              </div>
              {leads.length > 0 && (
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
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
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Pipeline CRM</span>
              </div>
              {savedLeadsCrm.length > 0 && (
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  {savedLeadsCrm.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('copilot');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'copilot'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquareQuote className="h-4 w-4 text-purple-600" />
                <span>AI Balas Chat</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Copilot
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('templates');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="h-4 w-4 text-slate-500" />
                <span>AI Pitch Cold</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('export');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                <span>Ekspor Kontak</span>
              </div>
            </button>

            <div className="border-t border-slate-100 my-2 pt-2" />

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Pengaturan Gateway</span>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-slate-500 hover:bg-red-50 hover:text-red-700 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="h-4 w-4 opacity-70" />
                <span>Kunci Sesi App</span>
              </div>
            </button>
          </nav>

          <div className="pt-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                MK
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{senderName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    +62 895-6294-60144
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header & Telemetry Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">
                {activeTab === 'search' && (marketMode === 'global' ? 'Global Prospecting (UK, Europe, US, Aus)' : 'Cari Prospek Google Maps')}
                {activeTab === 'crm' && 'Pipeline CRM & Prospek Tersimpan'}
                {activeTab === 'copilot' && 'AI Response Copilot (Balas Chat Klien)'}
                {activeTab === 'templates' && 'AI Copywriting Studio'}
                {activeTab === 'export' && 'Ekspor Database Kontak'}
                {activeTab === 'settings' && 'Pengaturan Gateway & Profil'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Market Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => handleSwitchMarket('indo')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                  marketMode === 'indo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇩 Indonesia
              </button>
              <button
                onClick={() => handleSwitchMarket('global')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                  marketMode === 'global'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌍 Global & Europe
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>SerpApi Maps</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>Gemini AI</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>WA Gateway</span>
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: SEARCH & PROSPECTING */}
          {activeTab === 'search' && (
            <>
              {/* Curated Opportunities Hub (F-02) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-emerald-600" />
                    {marketMode === 'global' ? 'High-Ticket International Niches (UK, Europe, US, Aus)' : 'Rekomendasi Sektor Berpotensi Tinggi'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {marketMode === 'global' ? '1-Click Overseas Scrape' : '1-Klik Eksekusi'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(marketMode === 'global' ? GLOBAL_RECOMMENDATIONS.slice(0, 3) : CURATED_RECOMMENDATIONS.slice(0, 3)).map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">{rec.title}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                            {rec.opportunityBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {rec.city}
                          </span>
                          <span>•</span>
                          <span>{rec.categoryName}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                          {rec.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleApplyPreset(rec.query.replace(` in ${rec.city}`, '').replace(` di ${rec.city}`, ''), rec.city)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-200 hover:border-emerald-600 font-medium text-xs transition cursor-pointer"
                      >
                        <span>{marketMode === 'global' ? `Scrape ${rec.city} Leads` : `Eksekusi Prospek ${rec.city}`}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scraper & Control Bar (F-01) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                {/* Presets & Cities + Bulk Scraper Trigger */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">
                      {marketMode === 'global' ? 'Global City & High-Ticket Niche Presets:' : 'Preset Kategori & Kota Populer:'}
                    </span>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 shadow-xs transition cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                      <span>{marketMode === 'global' ? 'Global Bulk Scraper (UK, Europe, US)' : 'Bulk Scraper (Multi-Kota Indonesia)'}</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative inline-block">
                      <select
                        aria-label="Preset Kategori"
                        value={selectedCategoryPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCategoryPreset(val);
                          const connector = marketMode === 'global' ? ' in ' : ' di ';
                          const q = val ? `${val}${connector}${selectedCity}` : `Businesses in ${selectedCity}`;
                          setQuery(q);
                        }}
                        className="appearance-none bg-slate-50 text-slate-800 text-xs font-medium py-1.5 pl-3 pr-7 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {(marketMode === 'global' ? GLOBAL_PRESET_CATEGORIES : PRESET_CATEGORIES).map((cat, i) => (
                          <option key={i} value={cat.query}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {(marketMode === 'global' ? GLOBAL_POPULAR_CITIES : POPULAR_CITIES).map((city) => (
                        <button
                          key={city}
                          onClick={() => handleApplyPreset(selectedCategoryPreset, city)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                            selectedCity === city
                              ? 'bg-slate-900 text-white font-semibold shadow-xs'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Query Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeSearch();
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Contoh: Bimbel di Malang, Konveksi di Bandung, Klinik di Surabaya..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer shrink-0 shadow-xs"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Mencari...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>Cari Prospek</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Binary Switches & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterNoWebsiteOnly}
                        onChange={(e) => setFilterNoWebsiteOnly(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-slate-700">
                        Hanya yang <strong className="text-amber-800">belum punya website</strong>
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterValidWaOnly}
                        onChange={(e) => setFilterValidWaOnly(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-slate-700">
                        Hanya <strong className="text-emerald-700">WhatsApp valid</strong> (seluler)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Min Rating:</span>
                      <select
                        aria-label="Filter Rating Minimum"
                        value={minRatingFilter}
                        onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                        className="bg-slate-50 text-slate-800 text-xs font-medium py-1 px-2 rounded-md border border-slate-200 focus:outline-none"
                      >
                        <option value={0}>Semua</option>
                        <option value={4.0}>4.0+ Stars</option>
                        <option value={4.5}>4.5+ Stars</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Status:</span>
                      <select
                        aria-label="Filter status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | OutreachStatus)}
                        className="bg-slate-50 text-slate-800 text-xs font-medium py-1 px-2 rounded-md border border-slate-200 focus:outline-none"
                      >
                        <option value="all">Semua Status</option>
                        <option value="new">Baru</option>
                        <option value="contacted">Sudah Dikontak</option>
                        <option value="followup">Perlu Follow-up</option>
                        <option value="closed">Deal</option>
                        <option value="rejected">Ditolak</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Perhatian</p>
                    <p className="text-red-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Metric Aggregators */}
              {leads.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Total Ditemukan</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{stats.total}</p>
                    <span className="text-[11px] text-slate-400">Hasil Google Maps</span>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs bg-amber-50/20">
                    <span className="text-xs text-amber-800 font-medium">Tanpa Website Resmi</span>
                    <p className="text-2xl font-bold text-amber-900 mt-1 font-mono tabular-nums">{stats.noWebsite}</p>
                    <span className="text-[11px] text-amber-700 font-medium">Target Utama Outreach</span>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
                    <span className="text-xs text-emerald-800 font-medium">WhatsApp Seluler Valid</span>
                    <p className="text-2xl font-bold text-emerald-900 mt-1 font-mono tabular-nums">{stats.validWa}</p>
                    <span className="text-[11px] text-emerald-700 font-medium">Siap Direct Chat</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Sudah Dikontak</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{stats.contacted}</p>
                    <span className="text-[11px] text-slate-400">Tersimpan di Pipeline</span>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              {leads.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Daftar Prospek
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono tabular-nums bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {filteredLeads.length} tempat
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleDownloadWaList}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download List WA (.txt)</span>
                      </button>
                      <button
                        onClick={handleDownloadCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Super Quick Filter Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setQuickPresetFilter('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                          quickPresetFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Semua</span>
                        <span className="font-mono text-[11px] opacity-80">({leads.length})</span>
                      </button>

                      <button
                        onClick={() => setQuickPresetFilter('uncontacted')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                          quickPresetFilter === 'uncontacted'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>⏳ Belum Di-Chat</span>
                        <span className="font-mono text-[11px] opacity-90">({stats.uncontacted})</span>
                      </button>

                      <button
                        onClick={() => setQuickPresetFilter('contacted')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                          quickPresetFilter === 'contacted'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>✅ Sudah Di-Chat</span>
                        <span className="font-mono text-[11px] opacity-90">({stats.contacted})</span>
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                      <button
                        onClick={() => setQuickPresetFilter('wa_ready')}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-[11px] ${
                          quickPresetFilter === 'wa_ready'
                            ? 'bg-teal-600 text-white font-semibold'
                            : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                        }`}
                      >
                        Siap WA ({stats.validWa})
                      </button>

                      <button
                        onClick={() => setQuickPresetFilter('hot')}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-[11px] ${
                          quickPresetFilter === 'hot'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        Hot Leads (4.5★ No Web)
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                          onChange={() => toggleSelectAll(filteredLeads)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Pilih Semua ({filteredLeads.length})</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Dense Prospect Cards */}
              {filteredLeads.length > 0 ? (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => {
                    const phone = lead.phoneAnalysis;
                    const hasValidWa = phone.isValid && phone.isMobile;
                    const isSendingThis = sendingId === lead.id;
                    const isGeneratingAi = generatingAiId === lead.id;

                    // History check
                    const cleanP =
                      phone.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
                    const isContactedBefore =
                      (cleanP && isPhoneContacted(cleanP, phoneRegistry)) ||
                      lead.status === 'contacted' ||
                      lead.status === 'followup' ||
                      lead.status === 'closed';

                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <div
                        key={lead.id}
                        className={`bg-white rounded-xl border p-4 transition shadow-xs hover:border-slate-300 flex items-start gap-3 ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : !lead.hasWebsite ? 'border-amber-200/80' : 'border-slate-200'
                        }`}
                      >
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeadSelect(lead.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Info Column */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {lead.name}
                              </h4>

                              {/* Prominent Chat Status Badge */}
                              {isContactedBefore ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Sudah Di-Chat</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                                  <span>Belum Di-Chat</span>
                                </span>
                              )}

                              {!lead.hasWebsite ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  <Globe className="h-3 w-3" />
                                  Tanpa Website
                                </span>
                              ) : (
                                <a
                                  href={lead.websiteUri || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 hover:underline border border-emerald-200"
                                >
                                  <Globe2 className="h-3 w-3" />
                                  Punya Website
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}

                              {lead.rating > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 font-mono tabular-nums">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                                  {lead.rating} ({lead.userRatingCount})
                                </span>
                              )}

                              {lead.aiMessage && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Bot className="h-3 w-3" /> AI Customized
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 flex items-start gap-1 leading-relaxed">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>{lead.formattedAddress}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                                {phone.isMobile ? (
                                  <Phone className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <PhoneCall className="h-3 w-3 text-slate-400" />
                                )}
                                <span>{lead.nationalPhoneNumber || 'Tidak ada nomor'}</span>
                              </div>

                              {phone.isMobile ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                  WA Valid ({phone.cleaned})
                                </span>
                              ) : phone.type === 'landline' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Telepon Kantor (PSTN)
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Controls & Actions Column */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                aria-label="Kategori Template"
                                value={lead.selectedCategory}
                                onChange={(e) =>
                                  updateLeadCategory(lead.id, e.target.value as OutreachCategory)
                                }
                                className="bg-slate-50 text-slate-700 text-xs font-medium py-1 px-2 rounded-md border border-slate-200 focus:outline-none cursor-pointer"
                              >
                                <option value="umkm">UMKM (Katalog)</option>
                                <option value="jasa">Jasa/Instansi (Profil)</option>
                                <option value="general">Umum</option>
                              </select>

                              {/* Pipeline status */}
                              <select
                                aria-label="Status Pipeline"
                                value={lead.status}
                                onChange={(e) =>
                                  updateLeadStatus(lead.id, e.target.value as OutreachStatus)
                                }
                                className={`text-xs font-semibold py-1 px-2 rounded-md border focus:outline-none cursor-pointer ${
                                  STATUS_CONFIG[lead.status]?.bg || 'bg-slate-50'
                                } ${STATUS_CONFIG[lead.status]?.border || 'border-slate-200'}`}
                              >
                                <option value="new">Baru</option>
                                <option value="contacted">Sudah Dikontak</option>
                                <option value="followup">Follow-up</option>
                                <option value="closed">Deal</option>
                                <option value="rejected">Ditolak</option>
                              </select>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleGenerateGeminiPitch(lead)}
                                disabled={isGeneratingAi}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition cursor-pointer"
                                title="Generate pitch via Gemini AI"
                              >
                                {isGeneratingAi ? (
                                  <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                                ) : (
                                  <Bot className="h-3 w-3 text-purple-600" />
                                )}
                                <span>Gemini AI</span>
                              </button>

                              <button
                                onClick={() => openCopilotForLead(lead)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-medium transition cursor-pointer"
                                title="Buka Copilot untuk balas chat klien ini"
                              >
                                <MessageSquareQuote className="h-3.5 w-3.5" />
                                <span>Balas AI</span>
                              </button>

                              <button
                                onClick={() => handleOpenPreview(lead)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                                title="Preview Draf Pesan"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleCopyMessage(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                              >
                                {copiedId === lead.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-700 font-bold">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-slate-500" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenWhatsAppManual(lead)}
                                disabled={!hasValidWa}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-xs ${
                                  hasValidWa
                                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold'
                                    : 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                                }`}
                                title="Buka WhatsApp Web dan otomatis tandai Sudah Di-Chat & sinkron ke Google Sheets"
                              >
                                <Send className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Chat WA</span>
                              </button>

                              {/* Direct Email Link for Overseas / Global Leads */}
                              <a
                                href={`mailto:?subject=${encodeURIComponent(
                                  `Quick website proposal for ${lead.name}`
                                )}&body=${encodeURIComponent(
                                  lead.aiMessage ||
                                    generateOutreachMessage({
                                      businessName: lead.name,
                                      category: lead.selectedCategory,
                                      senderName,
                                      senderRole,
                                    })
                                )}`}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                                title="Kirim Cold Email ke prospek luar negeri"
                              >
                                <Mail className="h-3 w-3 text-slate-500" />
                                <span>Email</span>
                              </a>

                              {/* Fonnte WhatsApp Dispatch with anti-ban throttle */}
                              <button
                                onClick={() => handleAutoSendWhatsApp(lead)}
                                disabled={!hasValidWa || isSendingThis || dispatchCooldown > 0}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                                  hasValidWa && !isSendingThis && dispatchCooldown === 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {isSendingThis ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Mengirim...</span>
                                  </>
                                ) : dispatchCooldown > 0 ? (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span className="font-mono">{dispatchCooldown}s</span>
                                  </>
                                ) : lead.status === 'contacted' ? (
                                  <>
                                    <CheckCheck className="h-3 w-3" />
                                    <span>Kirim Lagi</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="h-3 w-3 fill-current" />
                                    <span>Kirim Otomatis</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : leads.length > 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
                  <Filter className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    Tidak ada prospek yang cocok dengan filter aktif.
                  </p>
                </div>
              ) : null}

              {/* Sticky Batch Action Bar */}
              {selectedLeadIds.length > 0 && (
                <div className="sticky bottom-4 z-30 bg-slate-900 text-white rounded-xl p-3.5 shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-150">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
                      {selectedLeadIds.length}
                    </span>
                    <span className="text-xs font-semibold">Prospek Terpilih</span>
                    {batchProgress && (
                      <span className="text-[11px] text-emerald-400 font-mono">
                        (Proses {batchProgress.current}/{batchProgress.total}...)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleBatchGenerateAi}
                      disabled={isBatchGenerating || isBatchSending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>{isBatchGenerating ? 'Membuat AI...' : `Draf AI Semua (${selectedLeadIds.length})`}</span>
                    </button>

                    <button
                      onClick={handleBatchSendWhatsApp}
                      disabled={isBatchGenerating || isBatchSending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>{isBatchSending ? 'Mengirim...' : `Kirim WA Semua (Delay 3s)`}</span>
                    </button>

                    <button
                      onClick={() => setSelectedLeadIds([])}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: PIPELINE CRM */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pipeline CRM Outreach</h3>
                  <p className="text-xs text-slate-500">
                    Kelola status kontak seluruh prospek bisnis yang telah ditemukan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadWaList}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download WA List</span>
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs in CRM */}
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
                  onClick={() => setCrmStatusFilter('new')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'new'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  Baru ({savedLeadsCrm.filter((l) => l.status === 'new').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('contacted')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'contacted'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Sudah Dikontak ({savedLeadsCrm.filter((l) => l.status === 'contacted').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('followup')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'followup'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Perlu Follow-up ({savedLeadsCrm.filter((l) => l.status === 'followup').length})
                </button>
                <button
                  onClick={() => setCrmStatusFilter('closed')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    crmStatusFilter === 'closed'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  Deal / Selesai ({savedLeadsCrm.filter((l) => l.status === 'closed').length})
                </button>
              </div>

              {savedLeadsCrm.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Belum ada data di Pipeline CRM</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Lakukan pencarian prospek untuk otomatis mencatat data ke CRM.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3">Nama Bisnis</th>
                          <th className="px-4 py-3">Nomor WhatsApp</th>
                          <th className="px-4 py-3">Website</th>
                          <th className="px-4 py-3">Rating</th>
                          <th className="px-4 py-3">Status Pipeline</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {savedLeadsCrm
                          .filter((l) => crmStatusFilter === 'all' || l.status === crmStatusFilter)
                          .map((lead) => {
                            const cleanP =
                              lead.phoneAnalysis.cleaned || normalizeWhatsAppNumber(lead.nationalPhoneNumber);
                            const isContactedBefore =
                              (cleanP && isPhoneContacted(cleanP, phoneRegistry)) ||
                              lead.status === 'contacted' ||
                              lead.status === 'followup' ||
                              lead.status === 'closed';

                            return (
                              <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-4 py-2.5 font-semibold text-slate-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>{lead.name}</span>
                                    {isContactedBefore ? (
                                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                                        Sudah Di-Chat
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-medium border border-amber-200">
                                        Belum Di-Chat
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                    {lead.formattedAddress}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px]">
                                  {lead.phoneAnalysis.cleaned ? (
                                    <span className="text-emerald-700 font-medium">
                                      {lead.phoneAnalysis.cleaned}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {lead.hasWebsite ? (
                                    <span className="text-emerald-700 font-medium text-[11px]">Punya</span>
                                  ) : (
                                    <span className="text-amber-800 font-medium text-[11px]">Tanpa Website</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 font-mono tabular-nums text-[11px]">
                                  {lead.rating > 0 ? `${lead.rating} ★` : '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <select
                                    aria-label="Status Pipeline Lead"
                                    value={lead.status}
                                    onChange={(e) =>
                                      updateLeadStatus(lead.id, e.target.value as OutreachStatus)
                                    }
                                    className={`text-[11px] font-semibold py-1 px-2 rounded border focus:outline-none cursor-pointer ${
                                      STATUS_CONFIG[lead.status]?.bg || 'bg-slate-50'
                                    } ${STATUS_CONFIG[lead.status]?.border || 'border-slate-200'}`}
                                  >
                                    <option value="new">Baru</option>
                                    <option value="contacted">Sudah Dikontak</option>
                                    <option value="followup">Follow-up</option>
                                    <option value="closed">Deal</option>
                                    <option value="rejected">Ditolak</option>
                                  </select>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <button
                                      onClick={() => handleOpenWhatsAppManual(lead)}
                                      disabled={!lead.phoneAnalysis.isMobile}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-300 cursor-pointer"
                                      title="Buka WhatsApp & sinkron status"
                                    >
                                      <Send className="h-3 w-3 text-emerald-600" />
                                      <span>Chat WA</span>
                                    </button>

                                    <button
                                      onClick={() => openCopilotForLead(lead)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[10px] border border-purple-200 cursor-pointer"
                                      title="Buat balasan otomatis cerdas untuk chat klien ini"
                                    >
                                      <MessageSquareQuote className="h-3 w-3" />
                                      <span>Balas AI</span>
                                    </button>

                                    <button
                                      onClick={() => handleAutoSendWhatsApp(lead)}
                                      disabled={!lead.phoneAnalysis.isMobile || dispatchCooldown > 0}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] cursor-pointer"
                                    >
                                      <Zap className="h-3 w-3 fill-current" />
                                      <span>{lead.status === 'contacted' ? 'Kirim Lagi' : 'Kirim Otomatis'}</span>
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

          {/* TAB: AI RESPONSE COPILOT */}
          {activeTab === 'copilot' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Client Message Input */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-purple-600" />
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Input Pesan dari Klien
                    </h3>
                  </div>
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-medium">
                    AI Response Copilot
                  </span>
                </div>

                {/* Scenario Quick Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-500">Preset Pertanyaan Klien Populer:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        const txt = 'Halo mas, harganya berapa ya untuk buat website? Ada paket apa saja?';
                        setCopilotIncomingMessage(txt);
                        handleGenerateCopilotReply(txt);
                      }}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      Tanya Harga / Paket
                    </button>
                    <button
                      onClick={() => {
                        const txt = 'Bisa ketemuan besok di kantor kami untuk presentasi dan diskusi langsung mas?';
                        setCopilotIncomingMessage(txt);
                        handleGenerateCopilotReply(txt);
                      }}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      Ajak Ketemu di Kantor
                    </button>
                    <button
                      onClick={() => {
                        const txt = 'Boleh minta contoh portofolio website yang sudah pernah dibuat mas?';
                        setCopilotIncomingMessage(txt);
                        handleGenerateCopilotReply(txt);
                      }}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      Minta Portofolio / Contoh
                    </button>
                    <button
                      onClick={() => {
                        const txt = 'Wah harganya agak kemahalan ya mas, bisa kurang gak ya budget saya terbatas';
                        setCopilotIncomingMessage(txt);
                        handleGenerateCopilotReply(txt);
                      }}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      Kemahalan / Nego
                    </button>
                  </div>
                </div>

                {/* Textarea for Client Message */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Paste / Ketik Balasan dari Klien:
                  </label>
                  <textarea
                    value={copilotIncomingMessage}
                    onChange={(e) => setCopilotIncomingMessage(e.target.value)}
                    placeholder="Contoh: 'Harganya berapa mas?', 'Bisa ketemuan besok di kantor?', 'Bisa minta portofolio?'"
                    rows={5}
                    className="w-full p-3 rounded-lg border border-slate-300 text-xs font-sans leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>

                {/* Context options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Nama Bisnis / Klien</label>
                    <input
                      type="text"
                      value={copilotClientName}
                      onChange={(e) => setCopilotClientName(e.target.value)}
                      placeholder="Bimbel Bintang"
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Kategori Bisnis</label>
                    <select
                      value={copilotCategory}
                      onChange={(e) => setCopilotCategory(e.target.value as OutreachCategory)}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 bg-white"
                    >
                      <option value="general">Umum</option>
                      <option value="umkm">UMKM (Katalog/Order)</option>
                      <option value="jasa">Jasa/Instansi (Profil/Meet)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700">Arah Balasan</label>
                    <select
                      value={copilotGoal}
                      onChange={(e) => setCopilotGoal(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 bg-white"
                    >
                      <option value="closing_offer">Penjelasan Harga & Closing</option>
                      <option value="google_meet">Tawaran Google Meet 10 Menit</option>
                      <option value="free_demo">Tawaran Preview / Demo Gratis</option>
                      <option value="friendly">Santai & Edukasi</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateCopilotReply()}
                  disabled={isGeneratingCopilot || !copilotIncomingMessage.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  {isGeneratingCopilot ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Membuat Balasan Cerdas...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-3.5 w-3.5" />
                      <span>Generate Balasan Cerdas (Gemini AI)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: AI Output & Direct Send */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-emerald-600" />
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                        Draf Balasan Siap Kirim
                      </h3>
                    </div>
                    {copilotGeneratedReply && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-mono font-medium">
                        Ready to Send
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex justify-between">
                      <span>Teks Balasan (Dapat Diedit Bebas):</span>
                      <span className="text-slate-400 font-mono text-[11px]">{copilotGeneratedReply.length} karakter</span>
                    </label>
                    <textarea
                      value={copilotGeneratedReply}
                      onChange={(e) => setCopilotGeneratedReply(e.target.value)}
                      placeholder="Hasil balasan cerdas dari AI akan muncul di sini..."
                      rows={8}
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs font-sans leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  {/* Target Phone input for direct sending */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-slate-700">
                      Nomor WhatsApp Klien (Opsional untuk Direct Send):
                    </label>
                    <input
                      type="text"
                      value={copilotPhone}
                      onChange={(e) => setCopilotPhone(e.target.value)}
                      placeholder="08123456789 atau 628..."
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      if (!copilotGeneratedReply) return;
                      await navigator.clipboard.writeText(copilotGeneratedReply);
                      showToast('success', 'Balasan berhasil disalin ke clipboard!');
                    }}
                    disabled={!copilotGeneratedReply}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Salin Teks</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!copilotGeneratedReply) return;
                        const cleanP = copilotPhone.replace(/\D/g, '');
                        const url = cleanP 
                          ? `https://wa.me/${cleanP}?text=${encodeURIComponent(copilotGeneratedReply)}`
                          : `https://wa.me/?text=${encodeURIComponent(copilotGeneratedReply)}`;
                        window.open(url, '_blank');
                      }}
                      disabled={!copilotGeneratedReply}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      Buka Web WA
                    </button>

                    <button
                      onClick={handleSendCopilotDirect}
                      disabled={!copilotGeneratedReply || !copilotPhone.trim() || isSendingCopilot}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      {isSendingCopilot ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 fill-current" />
                          <span>Kirim via Fonnte</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI STUDIO & TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Preset Template Outreach Otomatis
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Template berikut dibuat secara adaptif sesuai kategori target prospek untuk menghasilkan tingkat konversi chat tertinggi.
                  </p>

                  <div className="space-y-3 pt-2">
                    {OUTREACH_CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900">{cat.label}</span>
                          <span className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{cat.description}</p>
                        <div className="pt-1">
                          <pre className="bg-white p-3 rounded text-[11px] text-slate-800 font-sans whitespace-pre-wrap leading-relaxed border border-slate-200">
                            {generateOutreachMessage({
                              businessName: 'Contoh Bisnis',
                              category: cat.id,
                              senderName,
                              senderRole,
                            })}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone Mockup Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center shadow-xs">
                <div className="flex items-center gap-2 mb-4 self-start">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Live Mockup WhatsApp</span>
                </div>

                <div className="w-full max-w-[270px] bg-slate-900 rounded-3xl p-3 border-4 border-slate-800 shadow-xl">
                  <div className="h-3.5 w-20 bg-slate-800 rounded-full mx-auto mb-2.5" />
                  <div className="bg-emerald-700 text-white p-2 rounded-t-lg flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold font-mono">
                      MK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold leading-none">{senderName}</p>
                      <p className="text-[9px] text-emerald-200">Online</p>
                    </div>
                  </div>
                  <div className="bg-[#0b141a] p-2.5 rounded-b-lg min-h-[300px] text-[10px] text-slate-100 flex flex-col justify-end">
                    <div className="bg-[#005c4b] p-2 rounded-lg rounded-tr-none shadow-xs leading-relaxed space-y-1">
                      <p>Halo Kak/Admin Bisnis, salam kenal! Saya {senderName} ({senderRole}).</p>
                      <p>Saya ingin menawarkan pembuatan website katalog resmi modern untuk bisnis Anda...</p>
                      <span className="text-[8px] text-emerald-200/60 block text-right font-mono">09:42 ✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT DATA */}
          {activeTab === 'export' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Download & Ekspor Kontak</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unduh data nomor telepon WhatsApp untuk broadcast atau otomasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="h-8 w-8 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">Format TXT (WhatsApp Saja)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Satu baris satu nomor format 628... Cocok untuk WA broadcast tools.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadWaList}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    Unduh File TXT
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="h-8 w-8 rounded bg-blue-100 text-blue-800 flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">Format CSV Spreadsheet</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Berisi nama bisnis, nomor WA, alamat lengkap, rating, dan status website.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsv}
                    className="w-full py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs transition cursor-pointer"
                  >
                    Unduh File CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfigurasi API & Profil Pengirim</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola API Key SerpApi, Gemini AI, Fonnte Gateway, dan identitas pengirim outreach.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                {/* SerpApi Key */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-blue-600" />
                    <span>SerpApi (Google Maps Engine) API Key</span>
                  </label>
                  <input
                    type="password"
                    value={serpApiKey}
                    onChange={(e) => setSerpApiKey(e.target.value)}
                    placeholder="2df4f9a3c5545618d345c19f..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Kunci pencarian Google Maps dari serpapi.com (Free Tier tanpa kartu kredit).
                  </p>
                </div>

                {/* Gemini AI Key */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-purple-600" />
                    <span>Google Gemini AI API Key</span>
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AQ.Ab8RN6IZE9d2P..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Membuat draf pesan WhatsApp personalisasi unik secara otomatis.
                  </p>
                </div>

                {/* Fonnte Token */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Fonnte WhatsApp Token (Device: 0895629460144)</span>
                  </label>
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="hAEbTy6zmgvnsKrE..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Token perangkat Fonnte untuk mengirim pesan langsung dari nomor WhatsApp Anda.
                  </p>
                </div>

                {/* Google Sheets Backend Sync Card */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Integrasi Google Sheets Backend (Status_Chat)
                      </h4>
                    </div>
                    {sheetsSyncInfo && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          sheetsSyncInfo.connected
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {sheetsSyncInfo.connected ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Terhubung ({sheetsSyncInfo.count} Nomor Terdata)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Lokal Standalone ({sheetsSyncInfo.count} Nomor Riwayat)</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap kali Anda menekan tombol <strong className="text-slate-800">&quot;Chat WA&quot;</strong>, status lead otomatis dicatat ke Google Sheets pada kolom <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700 font-semibold">Status_Chat</code> agar riwayat kontak tersimpan permanen saat halaman direfresh.
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>Google Apps Script Web App URL</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAppsScriptModal(true)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 cursor-pointer"
                      >
                        <Code2 className="h-3 w-3" />
                        <span>Panduan & Kode Apps Script</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={googleSheetsUrl}
                        onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleSyncWithGoogleSheets(googleSheetsUrl)}
                        disabled={isSyncingSheets}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer shadow-xs shrink-0"
                      >
                        {isSyncingSheets ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Menyinkronkan...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Test & Sync Sekarang</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      *Telah mencakup 33 nomor riwayat awal bawaan sistem. Status tersimpan di memori browser dan akan disinkronkan dua arah dengan Google Sheets.
                    </p>
                  </div>
                </div>

                {/* Sender Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Nama Pengirim</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Mohammad Kevin"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Email Pengirim (Global)</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="mhmdkevin198@gmail.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">Profesi / Role</label>
                    <input
                      type="text"
                      value={senderRole}
                      onChange={(e) => setSenderRole(e.target.value)}
                      placeholder="freelance web developer"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveApiKeys}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Message Preview Modal */}
      {previewModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-5 space-y-3.5 animate-in fade-in duration-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  Draf Pesan WhatsApp
                  {previewModalLead.aiMessage && (
                    <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                      Gemini AI
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tujuan: <span className="font-semibold text-slate-800">{previewModalLead.name}</span> (
                  <span className="font-mono">
                    {previewModalLead.phoneAnalysis.isMobile
                      ? previewModalLead.phoneAnalysis.cleaned
                      : 'Bukan WA Seluler'}
                  </span>
                  )
                </p>
              </div>
              <button
                onClick={() => setPreviewModalLead(null)}
                className="text-slate-400 hover:text-slate-600 text-base leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Teks Pesan (Dapat diedit bebas):</span>
                <button
                  onClick={() => handleGenerateGeminiPitch(previewModalLead)}
                  disabled={generatingAiId === previewModalLead.id}
                  className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold cursor-pointer text-[11px]"
                >
                  <Bot className="h-3 w-3" />
                  <span>
                    {generatingAiId === previewModalLead.id ? 'Membuat...' : 'Regenerate via Gemini AI'}
                  </span>
                </button>
              </div>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={9}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-sans leading-relaxed text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(editedMessage);
                  showToast('success', 'Pesan berhasil disalin ke clipboard.');
                }}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Copy className="h-3 w-3 text-slate-500" />
                <span>Salin Teks</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    const url = `https://wa.me/${previewModalLead.phoneAnalysis.cleaned}?text=${encodeURIComponent(
                      editedMessage
                    )}`;
                    window.open(url, '_blank');
                    if (previewModalLead.status === 'new') {
                      registerContactHistory(previewModalLead, 'contacted');
                    }
                    setPreviewModalLead(null);
                  }}
                  disabled={!previewModalLead.phoneAnalysis.isMobile}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                >
                  Buka Web WA
                </button>

                <button
                  onClick={() => handleAutoSendWhatsApp(previewModalLead, editedMessage)}
                  disabled={
                    !previewModalLead.phoneAnalysis.isMobile ||
                    sendingId === previewModalLead.id ||
                    dispatchCooldown > 0
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {sendingId === previewModalLead.id ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : dispatchCooldown > 0 ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{dispatchCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 fill-current" />
                      <span>Kirim Otomatis (Fonnte)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Scraper Studio Modal (Seluruh Indonesia) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Zap className="h-5 w-5 fill-emerald-600 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Bulk Auto-Scraper (Seluruh Indonesia)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kombinasi multi-kota & multi-kategori untuk mengumpulkan ratusan prospek sekaligus.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isBulkScraping) abortBulkRef.current = true;
                  setShowBulkModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">
              {/* Active Progress during Run */}
              {isBulkScraping && bulkProgress && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between font-semibold text-emerald-900">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                      Sedang Scraping: {bulkProgress.currentQuery}
                    </span>
                    <span className="font-mono">
                      {bulkProgress.current}/{bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800">
                    <span>Total Prospek Baru Terkumpul: <strong className="font-mono">{bulkProgress.foundCount} tempat</strong></span>
                    <button
                      onClick={() => {
                        abortBulkRef.current = true;
                        showToast('error', 'Membatalkan bulk scraper...');
                      }}
                      className="text-red-700 hover:underline font-semibold cursor-pointer"
                    >
                      Hentikan Proses
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Pilih Kategori Target */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    1. Pilih Kategori Bisnis ({bulkCategories.length} Dipilih)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkCategories(BULK_CATEGORIES.map((c) => c.query))}
                      className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
                    >
                      Pilih Semua Kategori
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBulkCategories([])}
                      className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BULK_CATEGORIES.map((cat) => {
                    const isChecked = bulkCategories.includes(cat.query);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setBulkCategories((prev) =>
                              prev.includes(cat.query)
                                ? prev.filter((c) => c !== cat.query)
                                : [...prev, cat.query]
                            );
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pilih Kota Target */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    2. Pilih Kota Target ({bulkCities.length} Kota Dipilih) — {marketMode === 'global' ? 'Global & Europe' : 'Indonesia'}
                  </span>
                  {/* Quick City Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {marketMode === 'global' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setBulkCities(['London', 'Manchester', 'Berlin', 'Amsterdam', 'Paris', 'Sydney', 'New York', 'Los Angeles', 'Singapore', 'Dubai'])}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          Top 10 Global Hubs
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ukEu = GLOBAL_REGIONS.filter((r) => r.region.includes('Kingdom') || r.region.includes('Europe')).flatMap((r) => r.cities);
                            setBulkCities(Array.from(new Set(ukEu)));
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          UK & Europe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allG = GLOBAL_REGIONS.flatMap((r) => r.cities);
                            setBulkCities(Array.from(new Set(allG)));
                          }}
                          className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold cursor-pointer"
                        >
                          Pilih Semua Global ({GLOBAL_REGIONS.flatMap((r) => r.cities).length})
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setBulkCities([
                              'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang',
                              'Makassar', 'Palembang', 'Malang', 'Denpasar', 'Solo',
                            ])
                          }
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          10 Kota Terbesar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const jawaCities = INDONESIA_REGIONS.filter(
                              (r) => r.region.includes('Jawa') || r.region.includes('Jabodetabek')
                            ).flatMap((r) => r.cities);
                            setBulkCities(Array.from(new Set(jawaCities)));
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          Pulau Jawa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const luarJawa = INDONESIA_REGIONS.filter(
                              (r) => !r.region.includes('Jawa') && !r.region.includes('Jabodetabek')
                            ).flatMap((r) => r.cities);
                            setBulkCities(Array.from(new Set(luarJawa)));
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                        >
                          Luar Jawa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allC = INDONESIA_REGIONS.flatMap((r) => r.cities);
                            setBulkCities(Array.from(new Set(allC)));
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Region Groups */}
                <div className="space-y-3">
                  {(marketMode === 'global' ? GLOBAL_REGIONS : INDONESIA_REGIONS).map((group) => {
                    const allSelected = group.cities.every((c) => bulkCities.includes(c));
                    return (
                      <div
                        key={group.region}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                            {group.region}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setBulkCities((prev) => prev.filter((c) => !group.cities.includes(c)));
                              } else {
                                setBulkCities((prev) => Array.from(new Set([...prev, ...group.cities])));
                              }
                            }}
                            className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
                          >
                            {allSelected ? 'Batal Pilih Region' : 'Pilih Semua di Region'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {group.cities.map((city) => {
                            const isCityChecked = bulkCities.includes(city);
                            return (
                              <button
                                key={city}
                                type="button"
                                onClick={() => {
                                  setBulkCities((prev) =>
                                    prev.includes(city)
                                      ? prev.filter((c) => c !== city)
                                      : [...prev, city]
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                                  isCityChecked
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                {city}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-900">
                  Estimasi: {bulkCities.length} Kota &times; {bulkCategories.length} Kategori ={' '}
                  <strong className="text-emerald-700 font-mono">
                    {bulkCities.length * bulkCategories.length} Pencarian Otomatis
                  </strong>
                </span>
                <p className="text-[11px] text-slate-500">
                  Semua data otomatis dideduplikasi & tersimpan ke CRM.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  disabled={isBulkScraping}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleRunBulkScraper}
                  disabled={isBulkScraping || bulkCities.length === 0 || bulkCategories.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  {isBulkScraping ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sedang Bulk Scraping...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-current" />
                      <span>Mulai Bulk Auto-Scraper</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Apps Script Helper Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in duration-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Panduan & Kode Google Apps Script (Status_Chat)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sinkronisasi data prospek yang sudah dihubungi ke Google Sheets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Langkah Pemasangan Cepat (1 Menit):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-relaxed">
                  <li>
                    Buka Google Sheets baru di{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-semibold underline"
                    >
                      sheets.new
                    </a>
                  </li>
                  <li>
                    Buat Header di Baris 1: <strong className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border">Nomor_WA | Nomor_Standar | Nama_Bisnis | Status_Chat | Waktu_Kontak | Alamat | Kategori</strong>
                  </li>
                  <li>Buka menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Hapus kode bawaan di <code className="font-mono">Code.gs</code>, lalu tempel kode di bawah ini.</li>
                  <li>
                    Klik <strong>Deploy &gt; New deployment</strong> &gt; Pilih type <strong>Web app</strong>.
                    <br />
                    - <em>Execute as</em>: <strong>Me</strong>
                    <br />
                    - <em>Who has access</em>: <strong>Anyone</strong>
                  </li>
                  <li>Klik <strong>Deploy</strong>, izinkan akses akun (Authorize), dan salin URL Web App yang dihasilkan.</li>
                  <li>Tempel URL tersebut ke menu <strong>Pengaturan &gt; Google Apps Script Web App URL</strong> di web ini.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                    Kode Google Apps Script (Code.gs)
                  </span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE_CODE);
                      setCopiedAppsScript(true);
                      showToast('success', 'Kode Google Apps Script berhasil disalin!');
                      setTimeout(() => setCopiedAppsScript(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs cursor-pointer"
                  >
                    {copiedAppsScript ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Semua Kode</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                  {GOOGLE_APPS_SCRIPT_SAMPLE_CODE}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

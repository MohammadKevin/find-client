'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  History,
} from 'lucide-react';
import {
  generateOutreachMessage,
  detectCategory,
  OutreachCategory,
  OUTREACH_CATEGORIES,
} from '@/lib/template-generator';
import type { PlaceLead } from '@/app/api/places/route';

type ActiveTab = 'search' | 'crm' | 'templates' | 'export' | 'settings';
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

const PRESET_CATEGORIES = [
  { label: 'Semua Kategori', query: '' },
  { label: 'Bimbel & Kursus', query: 'Bimbel Kursus' },
  { label: 'Kesehatan & Klinik', query: 'Klinik Apotek' },
  { label: 'Bengkel & Otomotif', query: 'Bengkel Otomotif' },
  { label: 'Konveksi & Sablon', query: 'Konveksi Sablon' },
  { label: 'Katering & Bakery', query: 'Katering Bakery' },
  { label: 'Florist & Toko Bunga', query: 'Florist Toko Bunga' },
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
    id: 'bimbel-malang',
    title: 'Bimbel & Kursus Bahasa',
    city: 'Malang',
    query: 'Bimbel Kursus di Malang',
    category: 'jasa',
    categoryName: 'Jasa Pendidikan',
    tag: 'Tinggi Peminat',
    opportunityBadge: 'Potensi Deal 85%',
    description: 'Bimbel butuh landing page resmi untuk info jadwal program, paket les, dan pendaftaran siswa baru.',
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
    id: 'klinik-surabaya',
    title: 'Klinik Gigi & Dokter',
    city: 'Surabaya',
    query: 'Klinik Gigi Dokter di Surabaya',
    category: 'jasa',
    categoryName: 'Kesehatan Medis',
    tag: 'Metropolitan',
    opportunityBadge: 'Nilai Proyek Tinggi',
    description: 'Klinik membutuhkan website profil kredibel di pencarian Google untuk jadwal dokter dan reservasi pasien.',
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('leadfinder_auth_pin') === '1992';
    }
    return false;
  });
  const [pinInputs, setPinInputs] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const pinInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [isAppLoading, setIsAppLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search & Filters State
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Malang');
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(PRESET_CATEGORIES[1].query);
  const [filterNoWebsiteOnly, setFilterNoWebsiteOnly] = useState(true);
  const [filterValidWaOnly, setFilterValidWaOnly] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');

  // Multi-System Phone Registry (Anti-Duplicate Check)
  const [phoneRegistry, setPhoneRegistry] = useState<Record<string, ContactedPhoneRecord>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lead_phone_registry');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Anti-ban throttling cooldown (3.0s interval)
  const [dispatchCooldown, setDispatchCooldown] = useState<number>(0);

  // API Keys & Configuration
  const [serpApiKey, setSerpApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('serpapi_api_key') || '';
    }
    return '';
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });
  const [fonnteToken, setFonnteToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fonnte_api_token') || '';
    }
    return '';
  });
  const [senderName, setSenderName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lead_sender_name') || 'Mohammad Kevin';
    }
    return 'Mohammad Kevin';
  });
  const [senderRole, setSenderRole] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lead_sender_role') || 'freelance web developer';
    }
    return 'freelance web developer';
  });

  // Action states
  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Leads Data & Saved CRM state
  const [leads, setLeads] = useState<LeadWithMeta[]>([]);
  const [savedStatuses, setSavedStatuses] = useState<Record<string, OutreachStatus>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lead_outreach_statuses');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [savedLeadsCrm, setSavedLeadsCrm] = useState<LeadWithMeta[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lead_saved_crm_records');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Modals & previews
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewModalLead, setPreviewModalLead] = useState<LeadWithMeta | null>(null);
  const [editedMessage, setEditedMessage] = useState('');

  // PIN Authentication Logic
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

  // Cooldown timer effect
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

  const handleSaveApiKeys = () => {
    try {
      localStorage.setItem('serpapi_api_key', serpApiKey);
      localStorage.setItem('gemini_api_key', geminiApiKey);
      localStorage.setItem('fonnte_api_token', fonnteToken);
      localStorage.setItem('lead_sender_name', senderName);
      localStorage.setItem('lead_sender_role', senderRole);
      showToast('success', 'Pengaturan API & Profil berhasil disimpan.');
    } catch {
      showToast('error', 'Gagal menyimpan konfigurasi ke browser storage.');
    }
  };

  // Smart Contact Registration
  const registerContactHistory = (lead: LeadWithMeta, status: OutreachStatus = 'contacted') => {
    const cleanPhone = lead.phoneAnalysis.cleaned;
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

  const executeSearch = async (targetQuery?: string) => {
    const activeQuery = (targetQuery !== undefined ? targetQuery : query).trim();
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari Google Maps.');
      }

      const formatted: LeadWithMeta[] = (data.places || []).map((p: PlaceLead) => {
        const detected = detectCategory(p.name, activeQuery);
        
        // Smart Status Memory (Checks by Map ID or exact Phone Number)
        const cleanP = p.phoneAnalysis.cleaned;
        const phoneMemory = cleanP ? phoneRegistry[cleanP] : null;
        let determinedStatus = savedStatuses[p.id] || 'new';

        if (phoneMemory && determinedStatus === 'new') {
          determinedStatus = phoneMemory.status; // Auto-hydrate from robust phone history
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

  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
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
  }, [leads, filterNoWebsiteOnly, filterValidWaOnly, minRatingFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const noWebsite = leads.filter((l) => !l.hasWebsite).length;
    const validWa = leads.filter((l) => l.phoneAnalysis.isValid && l.phoneAnalysis.isMobile).length;
    const contacted = leads.filter(
      (l) => l.status === 'contacted' || l.status === 'followup' || l.status === 'closed'
    ).length;

    return { total, noWebsite, validWa, contacted };
  }, [leads]);

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
      // Fallback
    }
  };

  const handleOpenWhatsAppManual = (lead: LeadWithMeta) => {
    if (!lead.phoneAnalysis.isValid || !lead.phoneAnalysis.isMobile) return;

    const message =
      lead.aiMessage ||
      generateOutreachMessage({
        businessName: lead.name,
        category: lead.selectedCategory,
        senderName,
        senderRole,
      });

    const url = `https://wa.me/${lead.phoneAnalysis.cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    if (lead.status === 'new') {
      registerContactHistory(lead, 'contacted');
    }
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

      // Enforce 3-second anti-ban rate limiting
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

  // 1. Initial Workspace Loading Splash Screen
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
      {/* Toast Notification */}
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

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Brand Header */}
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

          {/* Navigation Links */}
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
                <span>AI Copywriter</span>
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

          {/* Active Profile Box */}
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
                {activeTab === 'search' && 'Cari Prospek Google Maps'}
                {activeTab === 'crm' && 'Pipeline CRM & Prospek Tersimpan'}
                {activeTab === 'templates' && 'AI Copywriting Studio'}
                {activeTab === 'export' && 'Ekspor Database Kontak'}
                {activeTab === 'settings' && 'Pengaturan Gateway & Profil'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="hidden sm:flex items-center gap-2">
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
                    Rekomendasi Sektor Berpotensi Tinggi
                  </span>
                  <span className="text-[11px] text-slate-500">1-Klik Eksekusi</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CURATED_RECOMMENDATIONS.map((rec) => (
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
                        onClick={() => handleApplyPreset(rec.query.replace(` di ${rec.city}`, ''), rec.city)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-200 hover:border-emerald-600 font-medium text-xs transition cursor-pointer"
                      >
                        <span>Eksekusi Prospek {rec.city}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scraper & Control Bar (F-01) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                {/* Presets & Cities */}
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-slate-500">Preset Kategori & Kota Populer:</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative inline-block">
                      <select
                        aria-label="Preset Kategori"
                        value={selectedCategoryPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCategoryPreset(val);
                          const q = val ? `${val} di ${selectedCity}` : `Bisnis di ${selectedCity}`;
                          setQuery(q);
                        }}
                        className="appearance-none bg-slate-50 text-slate-800 text-xs font-medium py-1.5 pl-3 pr-7 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {PRESET_CATEGORIES.map((cat, i) => (
                          <option key={i} value={cat.query}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {POPULAR_CITIES.map((city) => (
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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
                    const cleanP = phone.cleaned;
                    const pastRecord = cleanP ? phoneRegistry[cleanP] : null;

                    return (
                      <div
                        key={lead.id}
                        className={`bg-white rounded-xl border p-4 transition shadow-xs hover:border-slate-300 ${
                          !lead.hasWebsite ? 'border-amber-200/80' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Info Column */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {lead.name}
                              </h4>

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

                              {pastRecord && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <History className="h-3 w-3" /> Pernah Dihubungi
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
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                  hasValidWa
                                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    : 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                                }`}
                              >
                                <Send className="h-3 w-3 text-slate-500" />
                                <span>Web WA</span>
                              </button>

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
            </>
          )}

          {/* TAB 2: PIPELINE CRM */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pipeline CRM Outreach</h3>
                  <p className="text-xs text-slate-500">
                    Kelola status kontak seluruh prospek bisnis yang telah ditemukan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadWaList}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download WA List</span>
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
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
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                        {savedLeadsCrm.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-2.5 font-semibold text-slate-900">
                              <div>{lead.name}</div>
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
                              <button
                                onClick={() => handleAutoSendWhatsApp(lead)}
                                disabled={!lead.phoneAnalysis.isMobile || dispatchCooldown > 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                              >
                                <Zap className="h-3 w-3 fill-current" />
                                <span>Kirim WA</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

                {/* Sender Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
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
    </div>
  );
}

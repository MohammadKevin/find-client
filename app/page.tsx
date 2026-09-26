'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Building2,
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
  Layers,
  Zap,
  CheckCheck,
  Bot,
  Wand2,
  Users,
  Settings,
  Menu,
  X,
  Smartphone,
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
  { label: 'Semua Instansi / Bebas', query: '' },
  { label: 'Jasa & Bimbel (Les, Kursus, Daycare)', query: 'Bimbel Kursus' },
  { label: 'Kesehatan & Klinik (Dokter, Gigi, Apotek)', query: 'Klinik Apotek' },
  { label: 'Bengkel & Otomotif (Motor, Mobil, Salon)', query: 'Bengkel Otomotif' },
  { label: 'UMKM Produk (Konveksi, Sablon, Baju)', query: 'Konveksi Sablon' },
  { label: 'Kuliner & Katering (Catering, Bakery)', query: 'Katering Bakery' },
  { label: 'Florist & Bunga (Buket, Souvenir)', query: 'Florist Toko Bunga' },
];

const STATUS_CONFIG: Record<
  OutreachStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  new: {
    label: 'Baru (New)',
    bg: 'bg-sky-50 text-sky-700',
    text: 'text-sky-700',
    border: 'border-sky-200',
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
    bg: 'bg-amber-50 text-amber-700',
    text: 'text-amber-700',
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
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search & Filters State
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Malang');
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(PRESET_CATEGORIES[1].query);
  const [filterNoWebsiteOnly, setFilterNoWebsiteOnly] = useState(true);
  const [filterValidWaOnly, setFilterValidWaOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');

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

  // Initial load transition simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 650);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3800);
  };

  const handleSaveApiKeys = () => {
    try {
      localStorage.setItem('serpapi_api_key', serpApiKey);
      localStorage.setItem('gemini_api_key', geminiApiKey);
      localStorage.setItem('fonnte_api_token', fonnteToken);
      localStorage.setItem('lead_sender_name', senderName);
      localStorage.setItem('lead_sender_role', senderRole);
      showToast('success', 'Pengaturan API & Profil berhasil disimpan!');
    } catch {
      showToast('error', 'Gagal menyimpan ke penyimpanan lokal browser.');
    }
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
      setErrorMessage('Silakan ketik kata kunci pencarian atau pilih preset kota/kategori.');
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
        const currentStatus = savedStatuses[p.id] || 'new';
        const leadObj: LeadWithMeta = {
          ...p,
          status: currentStatus,
          selectedCategory: detected,
          addedAt: new Date().toLocaleDateString('id-ID'),
        };
        saveLeadToCrm(leadObj);
        return leadObj;
      });

      setLeads(formatted);
      if (formatted.length === 0) {
        setErrorMessage('Tidak ada tempat yang ditemukan untuk pencarian ini.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses data.';
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
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [leads, filterNoWebsiteOnly, filterValidWaOnly, statusFilter]);

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
        throw new Error(data.error || 'Gagal membuat pesan dengan Gemini AI.');
      }

      const aiText = data.message;
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, aiMessage: aiText } : item))
      );

      setPreviewModalLead({ ...lead, aiMessage: aiText });
      setEditedMessage(aiText);
      showToast('success', `Gemini AI selesai membuat draf untuk ${lead.name}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi Gemini AI.';
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
      showToast('success', `Pesan untuk ${lead.name} tersalin ke clipboard!`);
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
      updateLeadStatus(lead.id, 'contacted');
    }
  };

  const handleAutoSendWhatsApp = async (lead: LeadWithMeta, customText?: string) => {
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

      updateLeadStatus(lead.id, 'contacted');
      showToast('success', `Berhasil terkirim ke ${lead.name} (${lead.phoneAnalysis.cleaned})!`);
      if (previewModalLead?.id === lead.id) {
        setPreviewModalLead(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pesan WhatsApp.';
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

  // 1. Initial Page Loading Splash Screen (Corecraft/WorkNest style)
  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="relative flex flex-col items-center gap-6 max-w-sm w-full text-center">
          {/* Logo Animation */}
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-md -z-10 animate-ping" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-white">Lead Finder & Outreach</h1>
            <p className="text-xs text-slate-400">Memuat workspace dan konfigurasi gateway...</p>
          </div>

          {/* Progress Bar */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-[progress_0.6s_ease-in-out_infinite]" />
          </div>

          <span className="text-[11px] font-mono text-slate-500 tracking-wider">
            WORKNEST ENGINE v2.0
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700/80 backdrop-blur-md'
                : 'bg-red-900/90 text-red-100 border-red-700/80 backdrop-blur-md'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-72 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Lead Finder
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Pro
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Outreach & WhatsApp CRM</p>
              </div>
            </div>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 space-y-1.5 flex-1">
            <button
              onClick={() => {
                setActiveTab('search');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4" />
                <span>Cari Prospek</span>
              </div>
              {leads.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {leads.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('crm');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <span>Pipeline CRM</span>
              </div>
              {savedLeadsCrm.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                  {savedLeadsCrm.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('templates');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4" />
                <span>AI Studio & Template</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('export');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Ekspor Kontak</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span>Pengaturan Gateway</span>
              </div>
              {(!serpApiKey && !fonnteToken) && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </nav>

          {/* Active Profile Box */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                MK
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{senderName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400 truncate">
                    +62 895-6294-60144
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white capitalize">
                {activeTab === 'search' && 'Cari Prospek Google Maps'}
                {activeTab === 'crm' && 'Pipeline & Prospek Tersimpan'}
                {activeTab === 'templates' && 'AI Copywriting Studio'}
                {activeTab === 'export' && 'Ekspor Database Leads'}
                {activeTab === 'settings' && 'Pengaturan API Gateway & Profil'}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sistem otomatisasi penawaran website untuk UMKM & instansi lokal
              </p>
            </div>
          </div>

          {/* Gateway Status Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                <Search className="h-3 w-3 text-blue-400" />
                <span>SerpApi Maps</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                <Bot className="h-3 w-3 text-purple-400" />
                <span>Gemini AI</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                <Zap className="h-3 w-3 fill-emerald-400" />
                <span>Fonnte WA Ready</span>
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: SEARCH & PROSPECTING */}
          {activeTab === 'search' && (
            <>
              {/* Search Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                {/* Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-400" />
                      Preset Cepat (Kategori & Kota Populer Jawa)
                    </span>
                    <span className="text-xs text-slate-500">Klik untuk langsung mencari</span>
                  </div>

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
                        className="appearance-none bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium py-2 pl-3.5 pr-8 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {PRESET_CATEGORIES.map((cat, i) => (
                          <option key={i} value={cat.query}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {POPULAR_CITIES.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleApplyPreset(selectedCategoryPreset, city)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
                            selectedCity === city
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-750'
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
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Search className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Contoh: Bimbel di Malang, Konveksi di Bandung, Florist di Solo..."
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-750 bg-slate-950/70 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Mencari Prospek...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Cari Prospek</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Filter switches */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex flex-wrap items-center gap-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterNoWebsiteOnly}
                        onChange={(e) => setFilterNoWebsiteOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-slate-300">
                        Hanya yang <strong className="text-amber-400">belum punya website</strong>
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={filterValidWaOnly}
                        onChange={(e) => setFilterValidWaOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-slate-300">
                        Hanya <strong className="text-emerald-400">WhatsApp valid</strong> (seluler)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Status:</span>
                    <select
                      aria-label="Filter status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | OutreachStatus)}
                      className="bg-slate-800 text-slate-300 text-xs font-medium py-1 px-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">Semua Status</option>
                      <option value="new">Baru (Belum Dikontak)</option>
                      <option value="contacted">Sudah Dikontak</option>
                      <option value="followup">Perlu Follow-up</option>
                      <option value="closed">Deal / Selesai</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Perhatian</p>
                    <p className="text-xs text-red-300 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Stats Summary Bar */}
              {leads.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                    <span className="text-xs text-slate-400 font-medium">Total Ditemukan</span>
                    <p className="text-2xl font-extrabold text-white mt-1">{stats.total}</p>
                    <span className="text-[11px] text-slate-500">Dari Google Maps</span>
                  </div>

                  <div className="bg-slate-900 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent rounded-xl p-4 shadow-sm">
                    <span className="text-xs text-amber-400 font-medium">Tanpa Website Resmi</span>
                    <p className="text-2xl font-extrabold text-amber-300 mt-1">{stats.noWebsite}</p>
                    <span className="text-[11px] text-amber-400/80 font-medium">Target Utama Outreach</span>
                  </div>

                  <div className="bg-slate-900 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-xl p-4 shadow-sm">
                    <span className="text-xs text-emerald-400 font-medium">WhatsApp Seluler Valid</span>
                    <p className="text-2xl font-extrabold text-emerald-300 mt-1">{stats.validWa}</p>
                    <span className="text-[11px] text-emerald-400/80 font-medium">Siap Direct Send</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                    <span className="text-xs text-slate-400 font-medium">Sudah Dikontak</span>
                    <p className="text-2xl font-extrabold text-white mt-1">{stats.contacted}</p>
                    <span className="text-[11px] text-slate-500">Tersimpan di Pipeline</span>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              {leads.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Hasil Prospek Bisnis</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {filteredLeads.length} tempat
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadWaList}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download List WA (.txt)</span>
                    </button>
                    <button
                      onClick={handleDownloadCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lead Cards */}
              {filteredLeads.length > 0 ? (
                <div className="space-y-3.5">
                  {filteredLeads.map((lead) => {
                    const phone = lead.phoneAnalysis;
                    const hasValidWa = phone.isValid && phone.isMobile;
                    const isSendingThis = sendingId === lead.id;
                    const isGeneratingAi = generatingAiId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        className={`bg-slate-900 rounded-2xl border transition hover:border-slate-700 p-5 ${
                          !lead.hasWebsite
                            ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/[0.03] via-slate-900 to-slate-900'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                          {/* Info Column */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold text-white truncate">
                                {lead.name}
                              </h4>

                              {!lead.hasWebsite ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Globe className="h-3 w-3" />
                                  Tanpa Website
                                </span>
                              ) : (
                                <a
                                  href={lead.websiteUri || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:underline border border-emerald-500/30"
                                >
                                  <Globe2 className="h-3 w-3" />
                                  Punya Website
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}

                              {lead.rating > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {lead.rating} ({lead.userRatingCount})
                                </span>
                              )}

                              {lead.aiMessage && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  <Bot className="h-3 w-3" /> AI Customized
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 flex items-start gap-1.5 leading-relaxed">
                              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                              <span>{lead.formattedAddress}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-mono">
                                {phone.isMobile ? (
                                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
                                )}
                                <span>{lead.nationalPhoneNumber || 'Tidak ada nomor'}</span>
                              </div>

                              {phone.isMobile ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  WA Valid ({phone.cleaned})
                                </span>
                              ) : phone.type === 'landline' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  Telepon Kantor (PSTN)
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Controls & Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Outreach Category */}
                              <select
                                aria-label="Kategori Template"
                                value={lead.selectedCategory}
                                onChange={(e) =>
                                  updateLeadCategory(lead.id, e.target.value as OutreachCategory)
                                }
                                className="bg-slate-800 text-slate-300 text-xs font-medium py-1.5 px-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                                className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg border focus:outline-none cursor-pointer ${
                                  STATUS_CONFIG[lead.status]?.bg || 'bg-slate-800'
                                } ${STATUS_CONFIG[lead.status]?.border || 'border-slate-700'}`}
                              >
                                <option value="new">Baru (New)</option>
                                <option value="contacted">Sudah Dikontak</option>
                                <option value="followup">Perlu Follow-up</option>
                                <option value="closed">Deal / Selesai</option>
                                <option value="rejected">Tidak Tertarik</option>
                              </select>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleGenerateGeminiPitch(lead)}
                                disabled={isGeneratingAi}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition cursor-pointer"
                                title="Generate copywriting via Gemini AI"
                              >
                                {isGeneratingAi ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                ) : (
                                  <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                                )}
                                <span>Gemini AI</span>
                              </button>

                              <button
                                onClick={() => handleOpenPreview(lead)}
                                className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 transition cursor-pointer"
                                title="Preview Draf Pesan"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleCopyMessage(lead)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition cursor-pointer"
                              >
                                {copiedId === lead.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-bold">Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenWhatsAppManual(lead)}
                                disabled={!hasValidWa}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                  hasValidWa
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                    : 'border-slate-800 text-slate-600 bg-slate-950 cursor-not-allowed'
                                }`}
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Web WA</span>
                              </button>

                              <button
                                onClick={() => handleAutoSendWhatsApp(lead)}
                                disabled={!hasValidWa || isSendingThis}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  hasValidWa && !isSendingThis
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {isSendingThis ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Mengirim...</span>
                                  </>
                                ) : lead.status === 'contacted' ? (
                                  <>
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    <span>Kirim Lagi</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="h-3.5 w-3.5 fill-current" />
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
                <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 p-8">
                  <Filter className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">
                    Tidak ada prospek yang cocok dengan filter saat ini.
                  </p>
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800/80 p-8 space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Mulai Cari Prospek Bisnis</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Pilih preset kota atau ketik pencarian kustom untuk menemukan bisnis lokal tanpa website.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto pt-2">
                    <button
                      onClick={() => handleApplyPreset('Bimbel Kursus', 'Malang')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition"
                    >
                      Bimbel di Malang
                    </button>
                    <button
                      onClick={() => handleApplyPreset('Konveksi Sablon', 'Bandung')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition"
                    >
                      Konveksi di Bandung
                    </button>
                    <button
                      onClick={() => handleApplyPreset('Bengkel Otomotif', 'Surabaya')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition"
                    >
                      Bengkel di Surabaya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: PIPELINE CRM */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div>
                  <h3 className="text-base font-bold text-white">Pipeline CRM Outreach</h3>
                  <p className="text-xs text-slate-400">
                    Kelola status kontak seluruh prospek bisnis yang telah ditemukan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadWaList}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download WA List</span>
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {savedLeadsCrm.length === 0 ? (
                <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 p-8">
                  <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Belum ada prospek di Pipeline CRM</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cari prospek di tab &quot;Cari Prospek&quot; untuk otomatis menambahkan ke pipeline.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3.5">Nama Bisnis</th>
                          <th className="px-4 py-3.5">Nomor WhatsApp</th>
                          <th className="px-4 py-3.5">Website</th>
                          <th className="px-4 py-3.5">Rating</th>
                          <th className="px-4 py-3.5">Status Pipeline</th>
                          <th className="px-4 py-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {savedLeadsCrm.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-4 py-3 font-semibold text-white">
                              <div>{lead.name}</div>
                              <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                                {lead.formattedAddress}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {lead.phoneAnalysis.cleaned ? (
                                <span className="text-emerald-400 font-medium">
                                  {lead.phoneAnalysis.cleaned}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {lead.hasWebsite ? (
                                <span className="text-emerald-400 font-medium">Punya</span>
                              ) : (
                                <span className="text-amber-400 font-medium">Tanpa Website</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {lead.rating > 0 ? `⭐ ${lead.rating}` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                aria-label="Status Pipeline Lead"
                                value={lead.status}
                                onChange={(e) =>
                                  updateLeadStatus(lead.id, e.target.value as OutreachStatus)
                                }
                                className={`text-xs font-semibold py-1 px-2 rounded-md border focus:outline-none cursor-pointer ${
                                  STATUS_CONFIG[lead.status]?.bg || 'bg-slate-800'
                                } ${STATUS_CONFIG[lead.status]?.border || 'border-slate-700'}`}
                              >
                                <option value="new">Baru</option>
                                <option value="contacted">Sudah Dikontak</option>
                                <option value="followup">Follow-up</option>
                                <option value="closed">Deal</option>
                                <option value="rejected">Ditolak</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleAutoSendWhatsApp(lead)}
                                disabled={!lead.phoneAnalysis.isMobile}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px]"
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">Preset Template Outreach Otomatis</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Template berikut dibuat secara adaptif sesuai kategori target prospek untuk menghasilkan tingkat konversi chat tertinggi.
                  </p>

                  <div className="space-y-3 pt-2">
                    {OUTREACH_CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-400">{cat.label}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{cat.description}</p>
                        <div className="pt-2">
                          <pre className="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed border border-slate-800">
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4 self-start">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Live Mockup Chat WA</span>
                </div>

                {/* Smartphone frame */}
                <div className="w-full max-w-[280px] bg-slate-950 rounded-3xl p-3 border-4 border-slate-800 shadow-2xl">
                  {/* Notch */}
                  <div className="h-4 w-24 bg-slate-800 rounded-full mx-auto mb-3" />
                  {/* WhatsApp header */}
                  <div className="bg-emerald-800 text-white p-2 rounded-t-xl flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                      MK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold leading-none">{senderName}</p>
                      <p className="text-[9px] text-emerald-200">Online</p>
                    </div>
                  </div>
                  {/* Chat bubble */}
                  <div className="bg-[#0b141a] p-3 rounded-b-xl min-h-[320px] text-[10px] text-slate-100 flex flex-col justify-end">
                    <div className="bg-[#005c4b] p-2.5 rounded-lg rounded-tr-none shadow-xs leading-relaxed space-y-1">
                      <p>Halo Kak/Admin Bisnis, salam kenal! Saya {senderName} ({senderRole}).</p>
                      <p>Saya ingin menawarkan pembuatan website katalog/landing page resmi modern...</p>
                      <span className="text-[8px] text-emerald-200/60 block text-right">09:42 ✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT DATA */}
          {activeTab === 'export' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-white">Download & Ekspor Kontak</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Unduh data nomor telepon WhatsApp untuk diimpor ke aplikasi broadcast atau tools otomasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Format TXT (WhatsApp Saja)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Satu baris satu nomor format 628... Cocok untuk WA Blast tool.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadWaList}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    Unduh File TXT
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Format CSV Spreadsheet</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Berisi nama bisnis, alamat lengkap, rating, dan status website.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsv}
                    className="w-full py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition"
                  >
                    Unduh File CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Konfigurasi API & Profil Pengirim</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kelola API Key SerpApi, Gemini AI, Fonnte Gateway, serta nama identitas pengirim pesan.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* SerpApi Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-400" />
                    <span>SerpApi (Google Maps Engine) API Key</span>
                  </label>
                  <input
                    type="password"
                    value={serpApiKey}
                    onChange={(e) => setSerpApiKey(e.target.value)}
                    placeholder="2df4f9a3c5545618d345c19f..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-750 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Kunci pencarian Google Maps dari serpapi.com (Free Tier tanpa kartu kredit).
                  </p>
                </div>

                {/* Gemini AI Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-400" />
                    <span>Google Gemini AI API Key</span>
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AQ.Ab8RN6IZE9d2P..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-750 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Membuat draf pesan WhatsApp personalisasi unik secara instan.
                  </p>
                </div>

                {/* Fonnte Token */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span>Fonnte WhatsApp Token (Device: 0895629460144)</span>
                  </label>
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="hAEbTy6zmgvnsKrE..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-750 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Token perangkat Fonnte untuk mengirim pesan langsung dari nomor WhatsApp Anda.
                  </p>
                </div>

                {/* Sender Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nama Pengirim</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Mohammad Kevin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-750 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Profesi / Role</label>
                    <input
                      type="text"
                      value={senderRole}
                      onChange={(e) => setSenderRole(e.target.value)}
                      placeholder="freelance web developer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-750 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleSaveApiKeys}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Message Preview & Customizer Modal */}
      {previewModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  Draf Pesan WhatsApp
                  {previewModalLead.aiMessage && (
                    <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                      Gemini AI
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tujuan: <span className="font-semibold text-slate-200">{previewModalLead.name}</span> (
                  {previewModalLead.phoneAnalysis.isMobile
                    ? previewModalLead.phoneAnalysis.cleaned
                    : 'Bukan nomor WA'}
                  )
                </p>
              </div>
              <button
                onClick={() => setPreviewModalLead(null)}
                className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Teks Pesan (Dapat diedit):</span>
                <button
                  onClick={() => handleGenerateGeminiPitch(previewModalLead)}
                  disabled={generatingAiId === previewModalLead.id}
                  className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>
                    {generatingAiId === previewModalLead.id
                      ? 'Membuat...'
                      : 'Regenerate via Gemini AI'}
                  </span>
                </button>
              </div>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-xl border border-slate-750 text-xs font-sans leading-relaxed text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950/70"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(editedMessage);
                  showToast('success', 'Pesan berhasil disalin ke clipboard!');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-750 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                Salin Teks
              </button>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    const url = `https://wa.me/${previewModalLead.phoneAnalysis.cleaned}?text=${encodeURIComponent(
                      editedMessage
                    )}`;
                    window.open(url, '_blank');
                    if (previewModalLead.status === 'new') {
                      updateLeadStatus(previewModalLead.id, 'contacted');
                    }
                    setPreviewModalLead(null);
                  }}
                  disabled={!previewModalLead.phoneAnalysis.isMobile}
                  className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-medium text-emerald-300 transition cursor-pointer"
                >
                  Buka Web WA
                </button>

                <button
                  onClick={() => handleAutoSendWhatsApp(previewModalLead, editedMessage)}
                  disabled={
                    !previewModalLead.phoneAnalysis.isMobile || sendingId === previewModalLead.id
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {sendingId === previewModalLead.id ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-current" />
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

'use client';

import React, { useState, useMemo } from 'react';
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
  Key,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  Eye,
  MessageSquare,
  ChevronDown,
  Layers,
  Zap,
  CheckCheck,
} from 'lucide-react';
import {
  generateOutreachMessage,
  detectCategory,
  OutreachCategory,
} from '@/lib/template-generator';
import type { PlaceLead } from '@/app/api/places/route';

type OutreachStatus = 'new' | 'contacted' | 'followup' | 'closed' | 'rejected';

interface LeadWithMeta extends PlaceLead {
  status: OutreachStatus;
  selectedCategory: OutreachCategory;
  customNotes?: string;
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
    bg: 'bg-amber-50 text-amber-700',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
  closed: {
    label: 'Deal / Selesai',
    bg: 'bg-purple-50 text-purple-700',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Tidak Tertarik',
    bg: 'bg-zinc-100 text-zinc-600',
    text: 'text-zinc-600',
    border: 'border-zinc-200',
    icon: XCircle,
  },
};

export default function LeadFinderPage() {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Malang');
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(PRESET_CATEGORIES[1].query);

  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_places_api_key') || '';
    }
    return '';
  });

  const [fonnteToken, setFonnteToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fonnte_api_token') || '';
    }
    return '';
  });

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const [filterNoWebsiteOnly, setFilterNoWebsiteOnly] = useState(true);
  const [filterValidWaOnly, setFilterValidWaOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachStatus>('all');

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
  const [showSenderSettings, setShowSenderSettings] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewModalLead, setPreviewModalLead] = useState<LeadWithMeta | null>(null);
  const [editedMessage, setEditedMessage] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveApiKey = (value: string) => {
    setApiKey(value);
    try {
      localStorage.setItem('google_places_api_key', value);
    } catch {}
  };

  const handleSaveFonnteToken = (value: string) => {
    setFonnteToken(value);
    try {
      localStorage.setItem('fonnte_api_token', value);
    } catch {}
  };

  const handleSaveSenderInfo = (name: string, role: string) => {
    setSenderName(name);
    setSenderRole(role);
    try {
      localStorage.setItem('lead_sender_name', name);
      localStorage.setItem('lead_sender_role', role);
    } catch {}
  };

  const updateLeadStatus = (placeId: string, newStatus: OutreachStatus) => {
    const updated = { ...savedStatuses, [placeId]: newStatus };
    setSavedStatuses(updated);
    try {
      localStorage.setItem('lead_outreach_statuses', JSON.stringify(updated));
    } catch {}

    setLeads((prev) =>
      prev.map((lead) => (lead.id === placeId ? { ...lead, status: newStatus } : lead))
    );
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
      setErrorMessage('Silakan ketik kata kunci pencarian atau pilih preset.');
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
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari Google Places.');
      }

      const formatted: LeadWithMeta[] = (data.places || []).map((p: PlaceLead) => {
        const detected = detectCategory(p.name, activeQuery);
        const currentStatus = savedStatuses[p.id] || 'new';
        return {
          ...p,
          status: currentStatus,
          selectedCategory: detected,
        };
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

  const handleCopyMessage = async (lead: LeadWithMeta) => {
    const message = generateOutreachMessage({
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

    const message = generateOutreachMessage({
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
    const initialText = generateOutreachMessage({
      businessName: lead.name,
      category: lead.selectedCategory,
      senderName,
      senderRole,
    });
    setPreviewModalLead(lead);
    setEditedMessage(initialText);
  };

  const handleDownloadWaList = () => {
    const validNumbers = filteredLeads
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
    if (filteredLeads.length === 0) {
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

    const rows = filteredLeads.map((l) => [
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-red-900 text-red-100 border-red-700'
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

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-900 leading-none">
                  Lead Finder & Outreach
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                  WA Auto-Sender
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengirim Aktif: <strong className="text-emerald-700 font-medium">+62 895-6294-60144 ({senderName})</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSenderSettings(!showSenderSettings)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title="Atur Profil Pengirim Pesan"
            >
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Profil Pengirim</span>
            </button>

            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title="Konfigurasi API Key & Fonnte Gateway"
            >
              <Key className="h-3.5 w-3.5" />
              <span>API Gateway</span>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer / Setting panels */}
      {showApiKeyInput && (
        <div className="bg-emerald-50/70 border-b border-emerald-200/80 px-4 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-emerald-950">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                <Zap className="h-4 w-4 text-emerald-600" />
                Fonnte WhatsApp Token (Device: 0895629460144)
              </div>
              <p className="text-slate-500 mb-2">
                Sudah otomatis dikonfigurasi via server. Masukkan token baru jika Anda ingin mengganti device.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={fonnteToken}
                  onChange={(e) => handleSaveFonnteToken(e.target.value)}
                  placeholder="hAEbTy6zmgvns..."
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                <Key className="h-4 w-4 text-amber-600" />
                Google Places API Key
              </div>
              <p className="text-slate-500 mb-2">
                Digunakan untuk mencari bisnis di Google Maps yang belum punya website.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="AQ.Ab8RN6IZE..."
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition cursor-pointer shrink-0"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSenderSettings && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div>
              <p className="font-medium text-slate-900">Personal Data Pengirim Outreach</p>
              <p className="text-slate-500">
                Nama dan role ini akan otomatis disisipkan ke salam pembuka template pesan WhatsApp.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={senderName}
                onChange={(e) => handleSaveSenderInfo(e.target.value, senderRole)}
                placeholder="Nama Anda (e.g. Mohammad Kevin)"
                className="w-48 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={senderRole}
                onChange={(e) => handleSaveSenderInfo(senderName, e.target.value)}
                placeholder="Profesi (e.g. freelance web developer)"
                className="w-56 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={() => setShowSenderSettings(false)}
                className="px-3 py-1.5 rounded-md bg-slate-800 text-white font-medium hover:bg-slate-900 transition cursor-pointer"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Main Search Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-6 mb-8">
          <div className="flex flex-col gap-5">
            {/* Quick Presets Row */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  Preset Cepat (Kategori & Kota Populer Jawa)
                </span>
                <span className="text-xs text-slate-400">Klik untuk langsung mengisi & mencari</span>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {/* Category Preset Dropdown */}
                <div className="relative inline-block text-left">
                  <select
                    aria-label="Preset Kategori Bisnis"
                    value={selectedCategoryPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCategoryPreset(val);
                      const q = val ? `${val} di ${selectedCity}` : `Bisnis di ${selectedCity}`;
                      setQuery(q);
                    }}
                    className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-medium py-1.5 pl-3 pr-8 rounded-lg border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    {PRESET_CATEGORIES.map((cat, i) => (
                      <option key={i} value={cat.query}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 pointer-events-none text-slate-500" />
                </div>

                {/* City Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleApplyPreset(selectedCategoryPreset, city)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                        selectedCity === city
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Contoh: Bimbel di Malang, Konveksi di Bandung, Klinik di Surabaya..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer"
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

            {/* Filter Switches Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterNoWebsiteOnly}
                    onChange={(e) => setFilterNoWebsiteOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-medium text-slate-700">
                    Hanya yang <strong className="text-amber-700">belum punya website</strong>
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterValidWaOnly}
                    onChange={(e) => setFilterValidWaOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-medium text-slate-700">
                    Hanya <strong className="text-emerald-700">nomor WhatsApp valid</strong> (seluler)
                  </span>
                </label>
              </div>

              {/* Status Tab Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  aria-label="Filter status outreach"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | OutreachStatus)}
                  className="bg-slate-100 text-slate-700 text-xs font-medium py-1 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="new">Baru (Belum Dihubungi)</option>
                  <option value="contacted">Sudah Dikontak</option>
                  <option value="followup">Perlu Follow-up</option>
                  <option value="closed">Deal / Selesai</option>
                  <option value="rejected">Ditolak / Tidak Tertarik</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Perhatian</p>
              <p className="text-red-700 text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Metrics Summary Bar */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Ditemukan</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              <span className="text-[11px] text-slate-400">Dari Google Places</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-white shadow-xs">
              <span className="text-xs text-amber-700 font-medium">Tanpa Website Resmi</span>
              <p className="text-2xl font-bold text-amber-800 mt-1">{stats.noWebsite}</p>
              <span className="text-[11px] text-amber-600/80 font-medium">Target Utama Outreach</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-emerald-200/70 bg-gradient-to-b from-emerald-50/40 to-white shadow-xs">
              <span className="text-xs text-emerald-700 font-medium">Nomor WhatsApp Seluler</span>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{stats.validWa}</p>
              <span className="text-[11px] text-emerald-600/80 font-medium">Siap Direct Chat</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Sudah Diproses / Kontak</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.contacted}</p>
              <span className="text-[11px] text-slate-400">Tersimpan di local storage</span>
            </div>
          </div>
        )}

        {/* Action Header & Exports */}
        {leads.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Daftar Prospek Bisnis
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                {filteredLeads.length} Ditampilkan
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadWaList}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium shadow-xs transition cursor-pointer"
                title="Download daftar nomor WhatsApp valid saja untuk broadcast / otomasi"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download List WA (.txt)</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition cursor-pointer"
                title="Download seluruh data dalam format CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Results Cards List */}
        {filteredLeads.length > 0 ? (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const phone = lead.phoneAnalysis;
              const hasValidWa = phone.isValid && phone.isMobile;
              const isSendingThis = sendingId === lead.id;

              return (
                <div
                  key={lead.id}
                  className={`bg-white rounded-2xl border transition shadow-xs hover:shadow-md ${
                    !lead.hasWebsite
                      ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/20 via-white to-white'
                      : 'border-slate-200'
                  } p-5`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {lead.name}
                        </h3>

                        {/* Website Status Badge */}
                        {!lead.hasWebsite ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            <Globe className="h-3 w-3" />
                            Tanpa Website
                          </span>
                        ) : (
                          <a
                            href={lead.websiteUri || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 hover:underline"
                          >
                            <Globe2 className="h-3 w-3" />
                            Punya Website
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}

                        {/* Rating Badge */}
                        {lead.rating > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                            {lead.rating}
                            <span className="text-slate-400">
                              ({lead.userRatingCount})
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <p className="text-xs text-slate-600 flex items-start gap-1.5 mb-3 leading-relaxed">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{lead.formattedAddress}</span>
                      </p>

                      {/* Phone & Contact Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          {phone.isMobile ? (
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <PhoneCall className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="font-mono text-slate-800">
                            {lead.nationalPhoneNumber ||
                              lead.internationalPhoneNumber ||
                              'Tidak ada nomor'}
                          </span>
                        </div>

                        {phone.isMobile ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            WhatsApp ({phone.cleaned})
                          </span>
                        ) : phone.type === 'landline' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Telepon Kantor (PSTN)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Controls & Actions Column */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                      {/* Status & Category Selector */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Outreach Category selector */}
                        <select
                          aria-label="Kategori Template Pesan"
                          value={lead.selectedCategory}
                          onChange={(e) =>
                            updateLeadCategory(
                              lead.id,
                              e.target.value as OutreachCategory
                            )
                          }
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          title="Ubah fokus template pesan outreach"
                        >
                          <option value="umkm">UMKM (Katalog & Order)</option>
                          <option value="jasa">Instansi/Jasa (Profil Resmi)</option>
                          <option value="general">Umum / Standar</option>
                        </select>

                        {/* Pipeline Status */}
                        <select
                          aria-label="Status Pipeline Outreach"
                          value={lead.status}
                          onChange={(e) =>
                            updateLeadStatus(
                              lead.id,
                              e.target.value as OutreachStatus
                            )
                          }
                          className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg border focus:outline-none transition cursor-pointer ${
                            STATUS_CONFIG[lead.status]?.bg || 'bg-slate-100'
                          } ${STATUS_CONFIG[lead.status]?.border || 'border-slate-200'}`}
                        >
                          <option value="new">Baru (New)</option>
                          <option value="contacted">Sudah Dikontak</option>
                          <option value="followup">Perlu Follow-up</option>
                          <option value="closed">Deal / Selesai</option>
                          <option value="rejected">Tidak Tertarik</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Preview button */}
                        <button
                          onClick={() => handleOpenPreview(lead)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          title="Preview & Edit Draf Pesan"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Copy message button */}
                        <button
                          onClick={() => handleCopyMessage(lead)}
                          className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                            copiedId === lead.id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                          title="Salin Template Pesan ke Clipboard"
                        >
                          {copiedId === lead.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-semibold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        {/* Manual Web WA Button */}
                        <button
                          onClick={() => handleOpenWhatsAppManual(lead)}
                          disabled={!hasValidWa}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                            hasValidWa
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                          }`}
                          title="Buka WhatsApp Web Manual"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Web WA</span>
                        </button>

                        {/* 1-Click Auto Send via Fonnte */}
                        <button
                          onClick={() => handleAutoSendWhatsApp(lead)}
                          disabled={!hasValidWa || isSendingThis}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            hasValidWa && !isSendingThis
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title="Kirim pesan langsung via nomor WA terhubung (+62 895-6294-60144)"
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
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">
              Tidak ada prospek yang cocok dengan filter saat ini.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Coba nonaktifkan filter &quot;Hanya yang belum punya website&quot; atau ubah status filter.
            </p>
          </div>
        ) : (
          /* Empty Initial State */
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Mulai Cari Prospek Bisnis & Instansi
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Pilih salah satu preset kota atau ketikkan kata kunci pencarian di kolom atas untuk menemukan bisnis lokal yang belum memiliki website.
            </p>

            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              <button
                onClick={() => handleApplyPreset('Bimbel Kursus', 'Malang')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              >
                Bimbel di Malang
              </button>
              <button
                onClick={() => handleApplyPreset('Konveksi Sablon', 'Bandung')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              >
                Konveksi di Bandung
              </button>
              <button
                onClick={() => handleApplyPreset('Bengkel Otomotif', 'Surabaya')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              >
                Bengkel di Surabaya
              </button>
              <button
                onClick={() => handleApplyPreset('Katering Bakery', 'Solo')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              >
                Katering di Solo
              </button>
              <button
                onClick={() => handleApplyPreset('Florist Toko Bunga', 'Jogja')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              >
                Florist di Jogja
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Message Preview & Customizer Modal */}
      {previewModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  Draf Pesan WhatsApp
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tujuan: <span className="font-semibold text-slate-800">{previewModalLead.name}</span> (
                  {previewModalLead.phoneAnalysis.isMobile
                    ? previewModalLead.phoneAnalysis.cleaned
                    : 'Bukan nomor WA'}
                  )
                </p>
              </div>
              <button
                onClick={() => setPreviewModalLead(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Teks Pesan (Dapat diedit bebas):</span>
                <span className="text-slate-400">{editedMessage.length} karakter</span>
              </div>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-sans leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(editedMessage);
                  showToast('success', 'Pesan berhasil disalin ke clipboard!');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                  className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-800 transition cursor-pointer"
                >
                  Buka Web WA
                </button>

                <button
                  onClick={() => handleAutoSendWhatsApp(previewModalLead, editedMessage)}
                  disabled={!previewModalLead.phoneAnalysis.isMobile || sendingId === previewModalLead.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {sendingId === previewModalLead.id ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Kirim via Fonnte (+62 895-6294-60144)</span>
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

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Bed,
  Users,
  CreditCard,
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  LogOut,
  Search,
  Phone,
  Check,
  UserCheck,
} from 'lucide-react';
import {
  generateInitial35Rooms,
  RoomItem,
  RoomStatus,
  formatRupiah,
  calculateMonthlyReport,
  TenantData,
  MonthlyReportSummary,
} from '@/lib/kos-data';

type AdminTab = 'rooms' | 'tenants' | 'reports';

export default function AdminKosDashboard() {
  const router = useRouter();
  const [isAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('kos_admin_auth') === '1992';
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<AdminTab>('rooms');

  const [rooms, setRooms] = useState<RoomItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('kos_rooms_data_35');
        return stored ? JSON.parse(stored) : generateInitial35Rooms();
      } catch {
        return generateInitial35Rooms();
      }
    }
    return generateInitial35Rooms();
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all');

  // Inline price edit
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  // KTP / Document Preview Modal
  const [previewTenant, setPreviewTenant] = useState<{
    tenant: TenantData;
    roomNumber: string;
    roomType: string;
  } | null>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem('kos_admin_auth');
    if (auth !== '1992') {
      router.push('/admin/login');
    }
  }, [router]);

  const saveRooms = (updatedRooms: RoomItem[]) => {
    setRooms(updatedRooms);
    try {
      localStorage.setItem('kos_rooms_data_35', JSON.stringify(updatedRooms));
    } catch {}
  };

  const handleUpdateStatus = (roomId: string, newStatus: RoomStatus) => {
    const updated = rooms.map((r) => {
      if (r.id === roomId) {
        const updatedRoom = { ...r, status: newStatus };
        if (newStatus === 'available') {
          updatedRoom.tenant = null;
        }
        return updatedRoom;
      }
      return r;
    });
    saveRooms(updated);
  };

  const handleSavePrice = (roomId: string) => {
    if (editPriceValue <= 0) return;
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, priceMonthly: editPriceValue } : r
    );
    saveRooms(updated);
    setEditingRoomId(null);
  };

  const handleCheckoutTenant = (roomId: string) => {
    if (!confirm('Apakah Anda yakin ingin mengakhiri sewa dan mengosongkan kamar ini?')) return;
    handleUpdateStatus(roomId, 'available');
  };

  const reportData: MonthlyReportSummary = useMemo(() => {
    return calculateMonthlyReport(rooms);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (floorFilter !== 'all' && r.floor !== floorFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = r.roomNumber.toLowerCase().includes(q);
        const matchesTenant = r.tenant?.name.toLowerCase().includes(q);
        const matchesPhone = r.tenant?.whatsapp.includes(q);
        if (!matchesNum && !matchesTenant && !matchesPhone) return false;
      }
      return true;
    });
  }, [rooms, floorFilter, statusFilter, searchQuery]);

  const activeTenantsList = useMemo(() => {
    const list: { room: RoomItem; tenant: TenantData }[] = [];
    rooms.forEach((r) => {
      if (r.tenant) {
        list.push({ room: r, tenant: r.tenant });
      }
    });
    return list;
  }, [rooms]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCsvReport = () => {
    const headers = [
      'No Kamar',
      'Lantai',
      'Tipe Kamar',
      'Tarif / Bulan',
      'Status Kamar',
      'Nama Penyewa',
      'No WhatsApp',
      'Tanggal Masuk',
      'Durasi (Bulan)',
      'Total Biaya',
    ];

    const rows = rooms.map((r) => [
      `"${r.roomNumber}"`,
      `"Lantai ${r.floor}"`,
      `"${r.type}"`,
      `"${r.priceMonthly}"`,
      `"${r.status === 'occupied' ? 'Terisi' : r.status === 'available' ? 'Tersedia' : 'Pending'}"`,
      `"${r.tenant?.name || '-'}"`,
      `"${r.tenant?.whatsapp || '-'}"`,
      `"${r.tenant?.checkInDate || '-'}"`,
      `"${r.tenant?.durationMonths || '-'}"`,
      `"${r.tenant?.totalPaid || 0}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-kos-surabaya-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Admin Kos Graha Surabaya</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                  35 Kamar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Panel Monitoring Kamar, KTP & Keuangan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kos"
              target="_blank"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Buka Web Publik &rarr;
            </Link>

            <button
              onClick={() => {
                sessionStorage.removeItem('kos_admin_auth');
                router.push('/admin/login');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bed className="h-4 w-4" />
              <span>Monitoring 35 Kamar</span>
            </button>

            <button
              onClick={() => setActiveTab('tenants')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'tenants'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Data Penghuni & KTP ({activeTenantsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Laporan Pemasukan Bulanan</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Bulan: <strong className="text-slate-900">{reportData.monthYear}</strong>
          </div>
        </div>

        {/* TAB 1: MONITORING 35 KAMAR */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Kamar</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{reportData.totalRooms}</p>
                <span className="text-[11px] text-slate-400">Gedung 3 Lantai</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-emerald-800 font-medium">Kamar Kosong (Tersedia)</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1 font-mono">{reportData.availableRooms}</p>
                <span className="text-[11px] text-emerald-700 font-medium">Siap Disewakan</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Kamar Terisi</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{reportData.occupiedRooms}</p>
                <span className="text-[11px] text-slate-400">Okupansi {reportData.occupancyRate}%</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-amber-800 font-medium">Booking Diproses</span>
                <p className="text-2xl font-bold text-amber-900 mt-1 font-mono">{reportData.pendingRooms}</p>
                <span className="text-[11px] text-amber-700 font-medium">Perlu Verifikasi</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari no kamar / nama penghuni..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter Lantai"
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-slate-50 text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-200"
                >
                  <option value="all">Semua Lantai</option>
                  <option value={1}>Lantai 1</option>
                  <option value={2}>Lantai 2</option>
                  <option value={3}>Lantai 3</option>
                </select>

                <select
                  aria-label="Filter Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RoomStatus | 'all')}
                  className="bg-slate-50 text-xs font-medium py-1.5 px-2.5 rounded-lg border border-slate-200"
                >
                  <option value="all">Semua Status</option>
                  <option value="available">Tersedia</option>
                  <option value="occupied">Terisi</option>
                  <option value="pending">Diproses</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* 35 Rooms Visual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const isEditing = editingRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col justify-between space-y-3 shadow-xs ${
                      room.status === 'available'
                        ? 'border-emerald-200'
                        : room.status === 'occupied'
                        ? 'border-slate-300 bg-slate-50/40'
                        : room.status === 'pending'
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-200 bg-slate-100'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-slate-900 font-mono">
                              Kamar {room.roomNumber}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              Lt. {room.floor}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{room.type}</p>
                        </div>

                        {/* Status dropdown */}
                        <select
                          aria-label="Ubah Status Kamar"
                          value={room.status}
                          onChange={(e) => handleUpdateStatus(room.id, e.target.value as RoomStatus)}
                          className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:outline-none cursor-pointer ${
                            room.status === 'available'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : room.status === 'occupied'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : room.status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="available">Tersedia (Kosong)</option>
                          <option value="occupied">Terisi</option>
                          <option value="pending">Booking Diproses</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>

                      {/* Price Section */}
                      <div className="pt-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(Number(e.target.value))}
                              className="w-28 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                            />
                            <button
                              onClick={() => handleSavePrice(room.id)}
                              className="p-1 rounded bg-emerald-600 text-white"
                              title="Simpan Harga"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRoomId(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600"
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 font-mono">
                              {formatRupiah(room.priceMonthly)}
                              <span className="text-[10px] text-slate-400 font-normal"> / bln</span>
                            </span>
                            <button
                              onClick={() => {
                                setEditingRoomId(room.id);
                                setEditPriceValue(room.priceMonthly);
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                            >
                              Edit Tarif
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tenant Detail preview if occupied */}
                      {room.tenant && (
                        <div className="bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 text-[11px] space-y-1">
                          <p className="font-bold text-slate-900 truncate">
                            Penghuni: {room.tenant.name}
                          </p>
                          <p className="text-slate-500 font-mono">
                            WA: +{room.tenant.whatsapp}
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-slate-500">Masuk: {room.tenant.checkInDate}</span>
                            <button
                              onClick={() =>
                                setPreviewTenant({
                                  tenant: room.tenant!,
                                  roomNumber: room.roomNumber,
                                  roomType: room.type,
                                })
                              }
                              className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Lihat KTP</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">{room.dimensions}</span>
                      {room.tenant && (
                        <button
                          onClick={() => handleCheckoutTenant(room.id)}
                          className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                        >
                          Selesai Sewa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DATA PENGHUNI & DOKUMEN KTP */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Data Penghuni & Arsip Dokumen KTP ({activeTenantsList.length} Penyewa)
                </h3>
                <p className="text-xs text-slate-500">
                  Data identitas resmi (KTP & Foto Wajah) tersimpan aman untuk verifikasi admin.
                </p>
              </div>

              <button
                onClick={handleExportCsvReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Data Penghuni (.csv)</span>
              </button>
            </div>

            {activeTenantsList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">Belum ada penyewa aktif saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Kamar</th>
                      <th className="px-4 py-3">Nama Penyewa</th>
                      <th className="px-4 py-3">No. WhatsApp</th>
                      <th className="px-4 py-3">Tgl Masuk</th>
                      <th className="px-4 py-3">Durasi Sewa</th>
                      <th className="px-4 py-3">Total Biaya</th>
                      <th className="px-4 py-3 text-right">Dokumen KTP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTenantsList.map(({ room, tenant }) => (
                      <tr key={tenant.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold font-mono text-slate-900">
                          Kamar {room.roomNumber}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Lt. {room.floor} &bull; {room.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {tenant.name}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <a
                            href={`https://wa.me/${tenant.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                          >
                            <Phone className="h-3 w-3" />
                            <span>+{tenant.whatsapp}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono">{tenant.checkInDate}</td>
                        <td className="px-4 py-3 font-semibold">{tenant.durationMonths} Bulan</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {formatRupiah(tenant.totalPaid)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              setPreviewTenant({
                                tenant,
                                roomNumber: room.roomNumber,
                                roomType: room.type,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview KTP</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LAPORAN PEMASUKAN BULANAN */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Laporan Keuangan & Pemasukan Bulanan Kos
                </h3>
                <p className="text-xs text-slate-500">
                  Rekapitulasi otomatis keterisian kamar & estimasi pendapatan sewa kos per bulan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak / PDF Laporan</span>
                </button>

                <button
                  onClick={handleExportCsvReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            {/* Printable Report Layout */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
              {/* Report Header */}
              <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">KOS GRAHA NYAMAN SURABAYA</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jl. Raya Manyar Kertoarjo No. 45, Gubeng, Surabaya &bull; WhatsApp: +62 895-6294-60144
                  </p>
                  <p className="text-xs font-bold text-emerald-800 mt-2">
                    LAPORAN REKAPITULASI PEMASUKAN BULAN: {reportData.monthYear.toUpperCase()}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-right font-mono text-xs">
                  <p className="text-slate-500">Tanggal Cetak:</p>
                  <p className="font-bold text-slate-900">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Financial Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-xs text-emerald-800 font-semibold">Pemasukan Real Bulan Ini</span>
                  <p className="text-2xl font-extrabold text-emerald-950 mt-1 font-mono">
                    {formatRupiah(reportData.actualRevenue)}
                  </p>
                  <span className="text-[11px] text-emerald-700">Dari {reportData.occupiedRooms} kamar terisi</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-semibold">Potensi Pemasukan (100%)</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {formatRupiah(reportData.potentialRevenue)}
                  </p>
                  <span className="text-[11px] text-slate-400">Jika 35 kamar terisi penuh</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-semibold">Tingkat Okupansi (Keterisian)</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {reportData.occupancyRate}%
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {reportData.occupiedRooms} Terisi / {reportData.availableRooms} Kosong
                  </span>
                </div>
              </div>

              {/* Floor Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Rincian Pendapatan Per Lantai
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Lantai</th>
                        <th className="px-4 py-2.5">Kapasitas</th>
                        <th className="px-4 py-2.5">Kamar Terisi</th>
                        <th className="px-4 py-2.5">Okupansi</th>
                        <th className="px-4 py-2.5 text-right">Pemasukan Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.floorRevenues.map((f) => {
                        const totalFloorRooms = f.floor === 3 ? 5 : 15;
                        const occ = Math.round((f.occupied / totalFloorRooms) * 100);
                        return (
                          <tr key={f.floor}>
                            <td className="px-4 py-2.5 font-bold">Lantai {f.floor}</td>
                            <td className="px-4 py-2.5">{totalFloorRooms} Kamar</td>
                            <td className="px-4 py-2.5 font-semibold text-emerald-800">{f.occupied} Kamar</td>
                            <td className="px-4 py-2.5 font-mono">{occ}%</td>
                            <td className="px-4 py-2.5 text-right font-bold font-mono">
                              {formatRupiah(f.revenue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complete Rooms Status Table */}
              <div className="space-y-2 pt-4">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Daftar Keterisian 35 Kamar
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">No. Kamar</th>
                        <th className="px-3 py-2">Tipe</th>
                        <th className="px-3 py-2">Tarif/Bln</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Nama Penghuni</th>
                        <th className="px-3 py-2">Kontak WA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rooms.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-bold font-mono">Kamar {r.roomNumber}</td>
                          <td className="px-3 py-2">{r.type} (Lt.{r.floor})</td>
                          <td className="px-3 py-2 font-mono">{formatRupiah(r.priceMonthly)}</td>
                          <td className="px-3 py-2 font-semibold">
                            {r.status === 'occupied' ? (
                              <span className="text-emerald-700">Terisi</span>
                            ) : r.status === 'available' ? (
                              <span className="text-slate-400">Kosong</span>
                            ) : (
                              <span className="text-amber-700">Booking</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium">{r.tenant?.name || '-'}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {r.tenant?.whatsapp ? `+${r.tenant.whatsapp}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* KTP & Selfie Image Preview Modal */}
      {previewTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Dokumen Identitas: {previewTenant.tenant.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Penyewa Kamar {previewTenant.roomNumber} ({previewTenant.roomType}) &bull;{' '}
                  <span className="font-mono">+{previewTenant.tenant.whatsapp}</span>
                </p>
              </div>
              <button
                onClick={() => setPreviewTenant(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Images Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* KTP */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">Foto KTP Resmi:</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2 flex items-center justify-center min-h-[180px]">
                    {previewTenant.tenant.ktpImageUrl ? (
                      <img
                        src={previewTenant.tenant.ktpImageUrl}
                        alt="Foto KTP"
                        className="w-full h-auto max-h-[260px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <CreditCard className="h-8 w-8 mx-auto mb-1 text-slate-300" />
                        <span>KTP belum diunggah</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selfie */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">Pas Foto / Wajah Penyewa:</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2 flex items-center justify-center min-h-[180px]">
                    {previewTenant.tenant.selfieImageUrl ? (
                      <img
                        src={previewTenant.tenant.selfieImageUrl}
                        alt="Pas Foto Wajah"
                        className="w-full h-auto max-h-[260px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <UserCheck className="h-8 w-8 mx-auto mb-1 text-slate-300" />
                        <span>Pas foto belum diunggah</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {previewTenant.tenant.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Catatan Penyewa:</span>
                  <p className="text-slate-600 mt-0.5">{previewTenant.tenant.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <a
                href={`https://wa.me/${previewTenant.tenant.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Chat WhatsApp Penyewa</span>
              </a>

              <button
                onClick={() => setPreviewTenant(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

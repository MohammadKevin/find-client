'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Camera,
  Upload,
  Phone,
  Sparkles,
  ArrowRight,
  KeyRound,
  FileText,
  CreditCard,
  Bed,
  Bath,
  Car,
  Utensils,
  Check,
  Send,
} from 'lucide-react';
import {
  generateInitial35Rooms,
  RoomItem,
  RoomStatus,
  formatRupiah,
  TenantData,
} from '@/lib/kos-data';

const FACILITIES_LIST = [
  { icon: Wifi, title: 'WiFi 100 Mbps', desc: 'Internet serat optik cepat untuk WFH & kuliah online.' },
  { icon: Bed, title: 'Kasur Springbed & AC', desc: 'Kasur busa/springbed empuk & AC dingin di setiap kamar.' },
  { icon: Bath, title: 'Kamar Mandi Dalam', desc: 'Dilengkapi shower & water heater (tipe VIP/Deluxe).' },
  { icon: ShieldCheck, title: 'CCTV & Keamanan 24 Jam', desc: 'Akses gerbang kartu digital & pantauan kamera keamanan.' },
  { icon: Car, title: 'Parkir Mobil & Motor Luas', desc: 'Area parkir beratap aman di dalam area pagar kos.' },
  { icon: Utensils, title: 'Dapur & Kulkas Bersama', desc: 'Peralatan memasak lengkap, kompor gas, & dispenser air minum.' },
];

const RULES_LIST = [
  'Wajib menyerahkan identitas resmi (KTP / Paspor) saat registrasi booking.',
  'Jam kunjung tamu luar maksimal pukul 22.00 WIB demi kenyamanan bersama.',
  'Dilarang membawa hewan peliharaan, narkoba, miras, atau senjata tajam.',
  'Menjaga kebersihan fasilitas umum dapur, area parkir, dan lorong kos.',
  'Pembayaran sewa bulanan jatuh tempo maksimal tanggal 5 setiap bulannya.',
];

export default function KosPublicPage() {
  const [rooms, setRooms] = useState<RoomItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRooms = localStorage.getItem('kos_rooms_data_35');
        return storedRooms ? JSON.parse(storedRooms) : generateInitial35Rooms();
      } catch {
        return generateInitial35Rooms();
      }
    }
    return generateInitial35Rooms();
  });
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<RoomStatus | 'all'>('all');

  // Booking Modal State
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<RoomItem | null>(null);
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [checkInDate, setCheckInDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Image uploads
  const [ktpBase64, setKtpBase64] = useState<string>('');
  const [selfieBase64, setSelfieBase64] = useState<string>('');
  const [ktpFileName, setKtpFileName] = useState('');
  const [selfieFileName, setSelfieFileName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<TenantData | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const ktpInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (selectedFloor !== 'all' && room.floor !== selectedFloor) return false;
      if (selectedStatusFilter !== 'all' && room.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [rooms, selectedFloor, selectedStatusFilter]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'available').length;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const pending = rooms.filter((r) => r.status === 'pending').length;
    return { total, available, occupied, pending };
  }, [rooms]);

  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'ktp' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (JPG / PNG / WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'ktp') {
        setKtpBase64(base64);
        setKtpFileName(file.name);
      } else {
        setSelfieBase64(base64);
        setSelfieFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) return;

    if (!fullName.trim() || !whatsapp.trim() || !checkInDate) {
      setBookingError('Lengkapi semua data diri wajib.');
      return;
    }

    if (!ktpBase64 || !selfieBase64) {
      setBookingError('Foto KTP dan Foto Diri wajib diunggah untuk verifikasi identitas.');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const payload = {
        roomNumber: selectedRoomForBooking.roomNumber,
        fullName: fullName.trim(),
        whatsapp: whatsapp.trim(),
        checkInDate,
        durationMonths,
        ktpBase64,
        selfieBase64,
        notes: notes.trim(),
      };

      const res = await fetch('/api/kos/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses booking.');
      }

      // Update local storage state
      const updatedRooms = rooms.map((r) =>
        r.roomNumber === selectedRoomForBooking.roomNumber
          ? { ...r, status: 'pending' as RoomStatus, tenant: data.booking }
          : r
      );
      setRooms(updatedRooms);
      localStorage.setItem('kos_rooms_data_35', JSON.stringify(updatedRooms));

      setBookingSuccess(data.booking);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat booking.';
      setBookingError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetBookingModal = () => {
    setSelectedRoomForBooking(null);
    setFullName('');
    setWhatsapp('');
    setKtpBase64('');
    setSelfieBase64('');
    setKtpFileName('');
    setSelfieFileName('');
    setNotes('');
    setBookingSuccess(null);
    setBookingError(null);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  Kos Graha Nyaman
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Surabaya
                </span>
              </div>
              <p className="text-xs text-slate-500">Hunian Kost Eksklusif 35 Kamar Strategis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#katalog-kamar"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Katalog Kamar
            </a>
            <a
              href="#fasilitas"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Fasilitas
            </a>
            <a
              href="#lokasi"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Lokasi & Aturan
            </a>

            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Login Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-50 border-b border-slate-200 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                <span>35 Kamar Nyaman & Siap Huni di Pusat Kota Surabaya</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Kost Eksklusif, Aman, dan Bersih dengan Fasilitas Lengkap
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Tersedia 35 unit kamar di 3 lantai berfasilitas AC dingin, kamar mandi dalam, WiFi cepat 100 Mbps, dapur bersama, dan keamanan 24 jam. Lokasi sangat dekat dengan kampus utama UNAIR, ITS, UBAYA, serta pusat perbelanjaan Surabaya.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#katalog-kamar"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                >
                  <span>Cek Kamar Kosong ({stats.available} Tersedia)</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <a
                  href="https://wa.me/62895629460144?text=Halo%20Admin%20Kos%20Graha%20Surabaya,%20saya%20mau%20tanya%20ketersediaan%20kamar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition"
                >
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>Chat WhatsApp Pengelola</span>
                </a>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Kamar</span>
                <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">{stats.total}</p>
                <span className="text-[11px] text-slate-400">Gedung 3 Lantai</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-emerald-800 font-medium">Kamar Kosong (Siap)</span>
                <p className="text-3xl font-extrabold text-emerald-900 mt-1 font-mono">{stats.available}</p>
                <span className="text-[11px] text-emerald-700 font-medium">Bisa Booking Online</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Tarif Sewa Mulai</span>
                <p className="text-xl font-bold text-slate-900 mt-1 font-mono">Rp1.200.000</p>
                <span className="text-[11px] text-slate-400">per bulan (Termasuk WiFi & Air)</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Keamanan</span>
                <p className="text-lg font-bold text-slate-900 mt-1">CCTV 24 Jam</p>
                <span className="text-[11px] text-slate-400">Akses Kunci Mandiri</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 35 Rooms Catalog */}
      <section id="katalog-kamar" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Live Status Ketersediaan
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pilihan 35 Kamar Kos Graha Surabaya
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih kamar yang masih kosong (berwarna hijau) lalu isi form registrasi online & upload dokumen KTP.
            </p>
          </div>

          {/* Floor & Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
              <button
                onClick={() => setSelectedFloor('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedFloor === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Lantai ({rooms.length})
              </button>
              <button
                onClick={() => setSelectedFloor(1)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedFloor === 1
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lantai 1 (15 Kamar)
              </button>
              <button
                onClick={() => setSelectedFloor(2)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedFloor === 2
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lantai 2 (15 Kamar)
              </button>
              <button
                onClick={() => setSelectedFloor(3)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedFloor === 3
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lantai 3 (5 Kamar)
              </button>
            </div>

            <select
              aria-label="Filter Status Kamar"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as RoomStatus | 'all')}
              className="bg-slate-50 text-slate-800 text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="available">Hanya Kamar Kosong (Tersedia)</option>
              <option value="occupied">Sudah Terisi</option>
            </select>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const isAvailable = room.status === 'available';
            const isOccupied = room.status === 'occupied';
            const isPending = room.status === 'pending';

            return (
              <div
                key={room.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition shadow-xs hover:shadow-md ${
                  isAvailable
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : isOccupied
                    ? 'border-slate-200 bg-slate-50/50 opacity-90'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          Kamar {room.roomNumber}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Lt. {room.floor}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">{room.type}</p>
                    </div>

                    {/* Status Badge */}
                    {isAvailable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="h-3 w-3" />
                        Tersedia
                      </span>
                    )}
                    {isOccupied && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="h-3 w-3" />
                        Terisi
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="h-3 w-3" />
                        Diproses
                      </span>
                    )}
                  </div>

                  <div className="pt-1">
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      {formatRupiah(room.priceMonthly)}
                      <span className="text-xs font-normal text-slate-500 font-sans"> / bulan</span>
                    </p>
                    <p className="text-[11px] text-slate-400">Ukuran: {room.dimensions}</p>
                  </div>

                  {/* Facilities bullets */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 text-xs text-slate-600">
                    {room.facilities.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                    {room.facilities.length > 4 && (
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        +{room.facilities.length - 4} fasilitas lainnya
                      </span>
                    )}
                  </div>
                </div>

                {/* Booking Button */}
                <div className="pt-2">
                  {isAvailable ? (
                    <button
                      onClick={() => setSelectedRoomForBooking(room)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Pesan Kamar {room.roomNumber}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs cursor-not-allowed border border-slate-200"
                    >
                      {isOccupied ? 'Kamar Sudah Terisi' : 'Booking Sedang Diproses'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Facilities Section */}
      <section id="fasilitas" className="py-16 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Fasilitas Lengkap & Nyaman
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Semua fasilitas dirawat berkala untuk memastikan kenyamanan dan produktivitas penghuni kos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FACILITIES_LIST.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-start gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rules & Location Section */}
      <section id="lokasi" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Rules */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Tata Tertib & Aturan Kos</h3>
            </div>
            <p className="text-xs text-slate-500">
              Setiap penghuni wajib mematuhi ketentuan berikut demi kenyamanan dan keamanan bersama:
            </p>
            <div className="space-y-2.5 pt-2">
              {RULES_LIST.map((rule, index) => (
                <div key={index} className="flex items-start gap-3 text-xs text-slate-700">
                  <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-[11px] shrink-0 font-mono mt-0.5">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Location details */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Lokasi Kos Graha Surabaya</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Alamat: Jl. Raya Manyar Kertoarjo No. 45, Gubeng, Kota Surabaya, Jawa Timur 60116.
            </p>
            <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Jarak Akses Terdekat:</p>
              <p>• 5 Menit ke Kampus UNAIR Kampus B & RSUD Dr. Soetomo</p>
              <p>• 8 Menit ke Stasiun Gubeng Surabaya</p>
              <p>• 10 Menit ke Galaxy Mall & Grand City Mall</p>
              <p>• Dekat pusat kuliner Manyar, minimarket 24 jam, & ATM</p>
            </div>

            <div className="pt-2">
              <a
                href="https://maps.google.com/?q=Surabaya"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition"
              >
                <MapPin className="h-4 w-4" />
                <span>Buka di Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-sm">Kos Graha Nyaman Surabaya</p>
            <p className="text-slate-500 mt-0.5">35 Kamar Kost Eksklusif &bull; Sistem Booking Otomatis</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="hover:text-white transition">
              Portal Admin Kos
            </Link>
            <span>&bull;</span>
            <Link href="/" className="hover:text-white transition">
              Lead Finder Engine
            </Link>
          </div>
        </div>
      </footer>

      {/* Booking Form Modal with Mandatory KTP & Selfie Upload */}
      {selectedRoomForBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Bed className="h-5 w-5 text-emerald-600" />
                  Formulir Booking Kamar {selectedRoomForBooking.roomNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tipe {selectedRoomForBooking.type} &bull; Lantai {selectedRoomForBooking.floor} &bull;{' '}
                  <strong className="text-slate-900 font-mono">
                    {formatRupiah(selectedRoomForBooking.priceMonthly)}/bulan
                  </strong>
                </p>
              </div>
              <button
                onClick={handleResetBookingModal}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
              {bookingSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Booking Berhasil Disimpan!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Terima kasih <strong className="text-slate-800">{bookingSuccess.name}</strong>. Data diri serta dokumen KTP Anda sudah terverifikasi di sistem admin.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-1.5 max-w-md mx-auto font-mono text-[11px]">
                    <p>Kamar: {selectedRoomForBooking.roomNumber} ({selectedRoomForBooking.type})</p>
                    <p>Tanggal Masuk: {bookingSuccess.checkInDate}</p>
                    <p>Durasi Sewa: {bookingSuccess.durationMonths} Bulan</p>
                    <p className="font-bold text-emerald-800">
                      Estimasi Total: {formatRupiah(bookingSuccess.totalPaid)}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                    <a
                      href={`https://wa.me/62895629460144?text=${encodeURIComponent(
                        `Halo Admin Kos Graha Surabaya, saya sudah submit booking untuk Kamar ${selectedRoomForBooking.roomNumber} atas nama ${bookingSuccess.name}. Mohon konfirmasinya. Terima kasih!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                    >
                      <Send className="h-4 w-4" />
                      <span>Konfirmasi ke WhatsApp Admin</span>
                    </a>
                    <button
                      onClick={handleResetBookingModal}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  {bookingError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* Personal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Nama Lengkap Penyewa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sesuai KTP"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Tanggal Mulai Masuk (Check-in) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-800">Durasi Sewa</label>
                      <select
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value={1}>1 Bulan</option>
                        <option value={3}>3 Bulan (Diskon 5%)</option>
                        <option value={6}>6 Bulan (Diskon 10%)</option>
                        <option value={12}>1 Tahun (Diskon 15%)</option>
                      </select>
                    </div>
                  </div>

                  {/* MANDATORY DOCUMENT UPLOADS: KTP & SELFIE */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                        Upload Dokumen Wajib Penyewa
                      </span>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                        Data Privat Aman
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Foto KTP Upload */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                          <span>1. Foto KTP Asli</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={ktpInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileChange(e, 'ktp')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => ktpInputRef.current?.click()}
                          className={`w-full p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                            ktpBase64
                              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                              : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {ktpBase64 ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              <span className="font-semibold text-xs truncate max-w-[180px]">
                                {ktpFileName || 'Foto KTP Terpilih'}
                              </span>
                              <span className="text-[10px] text-emerald-700">Klik untuk ganti</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-slate-400" />
                              <span className="font-medium text-xs">Pilih Foto KTP</span>
                              <span className="text-[10px] text-slate-400">JPG, PNG maks 5MB</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Pas Foto / Selfie Upload */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-slate-500" />
                          <span>2. Foto Diri / Wajah</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={selfieInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileChange(e, 'selfie')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => selfieInputRef.current?.click()}
                          className={`w-full p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                            selfieBase64
                              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                              : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {selfieBase64 ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              <span className="font-semibold text-xs truncate max-w-[180px]">
                                {selfieFileName || 'Foto Wajah Terpilih'}
                              </span>
                              <span className="text-[10px] text-emerald-700">Klik untuk ganti</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-5 w-5 text-slate-400" />
                              <span className="font-medium text-xs">Pilih Pas Foto</span>
                              <span className="text-[10px] text-slate-400">Foto selfie / wajah jelas</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Bawa kendaraan mobil/motor, perkiraan jam kedatangan, dsb."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Cost Summary Box */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Estimasi Total ({durationMonths} Bulan):</span>
                      <p className="text-base font-bold text-slate-900 font-mono">
                        {formatRupiah(selectedRoomForBooking.priceMonthly * durationMonths)}
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      Pembayaran via Transfer / Cash ke Admin
                    </span>
                  </div>

                  {/* Submit buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleResetBookingModal}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !ktpBase64 || !selfieBase64}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Mengirim Booking...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Konfirmasi & Submit Booking</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

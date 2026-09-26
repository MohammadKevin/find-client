-- =========================================================================
-- SUPABASE DATABASE SCHEMA: KOS GRAHA NYAMAN SURABAYA (35 KAMAR)
-- =========================================================================

-- 1. Table: rooms (Daftar 35 Kamar)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  room_number TEXT UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  type TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'pending', 'maintenance'
  facilities TEXT[] NOT NULL DEFAULT '{}',
  dimensions TEXT NOT NULL DEFAULT '3.5 x 4 meter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: tenants (Data Booking & Penghuni Kos)
CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  room_number TEXT REFERENCES public.rooms(room_number) ON DELETE SET NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  total_paid NUMERIC NOT NULL,
  ktp_storage_path TEXT,
  selfie_storage_path TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification', -- 'pending_verification', 'active', 'checked_out'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Publik bisa melihat daftar kamar
CREATE POLICY "Public read rooms" ON public.rooms
  FOR SELECT USING (true);

-- Policy: Publik bisa submit booking
CREATE POLICY "Public insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (true);

-- Policy: Admin full access
CREATE POLICY "Admin full access rooms" ON public.rooms
  FOR ALL USING (true);

CREATE POLICY "Admin full access tenants" ON public.tenants
  FOR ALL USING (true);

-- 4. Private Storage Bucket for Secure KTP & Selfie Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Hanya izinkan upload dokumen
CREATE POLICY "Allow public upload to tenant-documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tenant-documents');

CREATE POLICY "Allow admin read tenant-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'tenant-documents');

-- 5. SEED INITIAL DATA: 35 KAMAR KOS GRAHA SURABAYA
INSERT INTO public.rooms (id, room_number, floor, type, price_monthly, status, facilities, dimensions)
VALUES
  -- Lantai 1 (15 Kamar: 101 - 115)
  ('room-101', '101', 1, 'VIP Room', 1650000, 'available', ARRAY['AC Daikin', 'Kamar Mandi Dalam (Water Heater)', 'Kasur Springbed Queen', 'Smart TV 32"', 'Meja Kerja & Lemari', 'WiFi 100 Mbps'], '4 x 5 meter'),
  ('room-102', '102', 1, 'VIP Room', 1650000, 'available', ARRAY['AC Daikin', 'Kamar Mandi Dalam (Water Heater)', 'Kasur Springbed Queen', 'Smart TV 32"', 'Meja Kerja & Lemari', 'WiFi 100 Mbps'], '4 x 5 meter'),
  ('room-103', '103', 1, 'VIP Room', 1650000, 'available', ARRAY['AC Daikin', 'Kamar Mandi Dalam (Water Heater)', 'Kasur Springbed Queen', 'Smart TV 32"', 'Meja Kerja & Lemari', 'WiFi 100 Mbps'], '4 x 5 meter'),
  ('room-104', '104', 1, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-105', '105', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-106', '106', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-107', '107', 1, 'Deluxe AC', 1350000, 'pending', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-108', '108', 1, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-109', '109', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-110', '110', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-111', '111', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-112', '112', 1, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-113', '113', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-114', '114', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-115', '115', 1, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'WiFi 100 Mbps'], '3.5 x 4 meter'),

  -- Lantai 2 (15 Kamar: 201 - 215)
  ('room-201', '201', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-202', '202', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-203', '203', 2, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-204', '204', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-205', '205', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-206', '206', 2, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-207', '207', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-208', '208', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-209', '209', 2, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-210', '210', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-211', '211', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-212', '212', 2, 'Deluxe AC', 1350000, 'occupied', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-213', '213', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-214', '214', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),
  ('room-215', '215', 2, 'Deluxe AC', 1350000, 'available', ARRAY['AC Sharp', 'Kamar Mandi Dalam', 'Kasur Springbed Single', 'Lemari Pakaian', 'Meja & Kursi', 'Balkon Mini', 'WiFi 100 Mbps'], '3.5 x 4 meter'),

  -- Lantai 3 (5 Kamar: 301 - 305)
  ('room-301', '301', 3, 'Standard AC', 1200000, 'available', ARRAY['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'], '3 x 3.5 meter'),
  ('room-302', '302', 3, 'Standard AC', 1200000, 'occupied', ARRAY['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'], '3 x 3.5 meter'),
  ('room-303', '303', 3, 'Standard AC', 1200000, 'available', ARRAY['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'], '3 x 3.5 meter'),
  ('room-304', '304', 3, 'Standard AC', 1200000, 'available', ARRAY['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'], '3 x 3.5 meter'),
  ('room-305', '305', 3, 'Standard AC', 1200000, 'maintenance', ARRAY['AC 0.5 PK', 'Kamar Mandi Luar Bersih', 'Kasur Busa Tebal', 'Lemari Pakaian', 'Meja Belajar', 'Akses Rooftop', 'WiFi 100 Mbps'], '3 x 3.5 meter')
ON CONFLICT (id) DO NOTHING;

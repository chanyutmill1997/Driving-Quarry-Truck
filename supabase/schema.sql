-- =========================================================================
-- ระบบบริหารจัดการโรงโม่หิน (Quarry Fleet Management System)
-- Supabase PostgreSQL Schema & Seed Data
-- =========================================================================

-- 1. ตารางข้อมูลรถบรรทุก (Trucks)
CREATE TABLE IF NOT EXISTS public.trucks (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    capacity_ton NUMERIC NOT NULL DEFAULT 30,
    nickname TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตารางข้อมูลรถขุด / แม็คโคร (Excavators)
CREATE TABLE IF NOT EXISTS public.excavators (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    driver_name TEXT,
    nickname TEXT,
    driver_phone TEXT,
    is_contractor BOOLEAN NOT NULL DEFAULT FALSE,
    rate_per_scoop NUMERIC NOT NULL DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตารางเรทราคาค่าเที่ยว (Job Rates)
CREATE TABLE IF NOT EXISTS public.job_rates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_location TEXT,
    rate_30_ton NUMERIC NOT NULL DEFAULT 20,
    rate_45_ton NUMERIC NOT NULL DEFAULT 30,
    rate_60_ton NUMERIC NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ตารางข้อมูลคนขับและผู้ใช้งานระบบ (Drivers & Users)
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL DEFAULT '123456',
    role TEXT NOT NULL DEFAULT 'truck_driver', -- 'truck_driver', 'excavator_operator', 'supervisor', 'admin'
    assigned_vehicle TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ตารางบันทึกรอบวิ่งรถบรรทุก (Truck Trips Transactions)
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timestamp_text TEXT,
    driver_id TEXT,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    truck_plate TEXT NOT NULL,
    capacity_ton NUMERIC NOT NULL DEFAULT 30,
    round_number INTEGER NOT NULL DEFAULT 1,
    job_type_id TEXT,
    job_type_name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    load_photo_url TEXT,
    load_lat NUMERIC,
    load_lng NUMERIC,
    dump_photo_url TEXT,
    dump_lat NUMERIC,
    dump_lng NUMERIC,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ตารางบันทึกการตักของแม็คโคร (Excavator Scoop Logs)
CREATE TABLE IF NOT EXISTS public.excavator_logs (
    id TEXT PRIMARY KEY,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timestamp_text TEXT,
    operator_name TEXT NOT NULL,
    operator_phone TEXT,
    excavator_code TEXT NOT NULL,
    target_truck_plate TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 5.0,
    photo_url TEXT,
    lat NUMERIC,
    lng NUMERIC,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- เปิดใช้งาน Realtime สำหรับ Dashboard สด
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.excavator_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trucks;

-- =========================================================================
-- Row Level Security (RLS) Policies
-- =========================================================================
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excavators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excavator_logs ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้เว็บแอปอ่านและเขียนข้อมูลได้
CREATE POLICY "Allow public read access trucks" ON public.trucks FOR SELECT USING (true);
CREATE POLICY "Allow public all trucks" ON public.trucks FOR ALL USING (true);

CREATE POLICY "Allow public read access excavators" ON public.excavators FOR SELECT USING (true);
CREATE POLICY "Allow public all excavators" ON public.excavators FOR ALL USING (true);

CREATE POLICY "Allow public read access job_rates" ON public.job_rates FOR SELECT USING (true);
CREATE POLICY "Allow public all job_rates" ON public.job_rates FOR ALL USING (true);

CREATE POLICY "Allow public read access drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Allow public all drivers" ON public.drivers FOR ALL USING (true);

CREATE POLICY "Allow public read access trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Allow public insert trips" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update trips" ON public.trips FOR UPDATE USING (true);

CREATE POLICY "Allow public read access excavator_logs" ON public.excavator_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert excavator_logs" ON public.excavator_logs FOR INSERT WITH CHECK (true);

-- =========================================================================
-- สร้าง Storage Bucket สำหรับเก็บรูปถ่ายรอบวิ่ง (quarry-photos)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quarry-photos', 'quarry-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public uploads to quarry-photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'quarry-photos');

CREATE POLICY "Allow public read from quarry-photos" ON storage.objects
FOR SELECT USING (bucket_id = 'quarry-photos');

-- =========================================================================
-- SEED DATA: ข้อมูลตั้งต้น 28 รถบรรทุก, 20 แม็คโคร, 11 เรทราคา, 38 คนขับ
-- =========================================================================

-- เรทราคา 11 รายการ
INSERT INTO public.job_rates (id, name, target_location, rate_30_ton, rate_45_ton, rate_60_ton) VALUES
('R1', 'วิ่งหินปากโม่', 'ภายในโรงโม่', 20, 30, 40),
('R2', 'วิ่งหินคลุก', 'บ่อหิน -> ลานสต็อก', 25, 35, 50),
('R3', 'วิ่งหิน 1-2', 'ปากโม่ -> ลานร่อน', 25, 35, 50),
('R4', 'วิ่งหินเกล็ด', 'ไซต์งาน A', 30, 45, 60),
('R5', 'วิ่งฝุ่นหิน', 'ไซต์งาน B', 30, 45, 60),
('R6', 'วิ่งดินเปิดหน้าลาย', 'บ่อดิน -> จุดทิ้งดิน', 20, 30, 40),
('R7', 'วิ่งหินไซส์ใหญ่ (Big Rock)', 'หน้าเหมือง -> ปากโม่', 35, 50, 70),
('R8', 'วิ่งหินรองพื้นทาง', 'โครงการทางหลวง', 40, 60, 80),
('R9', 'วิ่งงานเร่งด่วนพิเศษ', 'จุดหมายพิเศษ', 50, 75, 100),
('R10', 'วิ่งย้ายกองสต็อก', 'ภายในโรงโม่', 15, 25, 35),
('R11', 'วิ่งทดสอบเครื่อง / งานทั่วไป', 'งานช่าง', 15, 20, 30)
ON CONFLICT (id) DO NOTHING;

-- รถบรรทุก 28 คัน
INSERT INTO public.trucks (id, code, capacity_ton, nickname, driver_name, driver_phone, status) VALUES
('T1', 'C2-38', 30, 'หวัง', 'นาย ประเสริฐ แซ่ตั้ง', '081-111-0001', 'active'),
('T2', 'C2-39', 30, 'หมาย', 'นาย สมหมาย ชาญชัย', '081-111-0002', 'active'),
('T3', 'C2-40', 30, 'เดช', 'นาย สุรเดช บุญมา', '081-111-0003', 'active'),
('T4', 'C2-41', 30, 'ศักดิ์', 'นาย สมศักดิ์ มีสุข', '081-111-0004', 'active'),
('T5', 'C2-42', 30, 'เอก', 'นาย เอกชัย มั่งมี', '081-111-0005', 'active'),
('T6', 'C2-43', 30, 'นพ', 'นาย มานพ รุ่งเรือง', '081-111-0006', 'active'),
('T7', 'C2-44', 30, 'พร', 'นาย สมพร ยั่งยืน', '081-111-0007', 'active'),
('T8', 'C2-45', 30, 'วิทย์', 'นาย ประวิทย์ สุขสม', '081-111-0008', 'active'),
('T9', 'C2-46', 45, 'ชัย', 'นาย สมชัย ก้าวหน้า', '081-111-0009', 'active'),
('T10', 'C2-47', 45, 'ชาติ', 'นาย สุชาติ เจริญพร', '081-111-0010', 'active'),
('T11', 'C2-48', 45, 'ยศ', 'นาย สมยศ มีชัย', '081-111-0011', 'active'),
('T12', 'C2-49', 45, 'รัตน์', 'นาย สุรัตน์ อุดม', '081-111-0012', 'active'),
('T13', 'C2-50', 45, 'พงษ์', 'นาย สมพงษ์ เพิ่มพูน', '081-111-0013', 'active'),
('T14', 'C2-51', 45, 'พล', 'นาย ชัยพล บุญช่วย', '081-111-0014', 'active'),
('T15', 'C2-52', 45, 'พล2', 'นาย วรพล รุ่งอรุณ', '081-111-0015', 'active'),
('T16', 'C2-53', 45, 'นพ2', 'นาย อานพ ชัยมงคล', '081-111-0016', 'active'),
('T17', 'C2-54', 45, 'ศักดิ์2', 'นาย พิพัฒน์ สมบัติ', '081-111-0017', 'active'),
('T18', 'C2-55', 45, 'เอก2', 'นาย ธนาธิป พิทักษ์', '081-111-0018', 'active'),
('T19', 'C2-56', 60, 'วัฒน์', 'นาย วัฒนา เพียรดี', '081-111-0019', 'active'),
('T20', 'C2-57', 60, 'สิทธิ์', 'นาย ประสิทธิ์ สว่างวงศ์', '081-111-0020', 'active'),
('T21', 'C2-58', 60, 'ศักดิ์3', 'นาย ธนศักดิ์ เจริญดี', '081-111-0021', 'active'),
('T22', 'C2-59', 60, 'เทพ', 'นาย สุเทพ มั่นคง', '081-111-0022', 'active'),
('T23', 'C2-60', 60, 'ทิน', 'นาย ชวลิต นิยม', '081-111-0023', 'active'),
('T24', 'C2-61', 60, 'ชาญ', 'นาย ชาญยุทธ มั่นคง', '081-111-0024', 'active'),
('T25', 'C2-62', 60, 'กฤต', 'นาย กฤษฎา เพิ่มลาภ', '081-111-0025', 'active'),
('T26', 'C2-63', 60, 'วีระ', 'นาย วีระศักดิ์ ยิ่งใหญ่', '081-111-0026', 'active'),
('T27', 'C2-64', 60, 'นนท์', 'นาย ชานนท์ สิทธิผล', '081-111-0027', 'active'),
('T28', 'C2-65', 60, 'กรณ์', 'นาย ปกรณ์ รุ่งเจริญ', '081-111-0028', 'active')
ON CONFLICT (id) DO NOTHING;

-- รถขุด/แม็คโคร 20 คัน
INSERT INTO public.excavators (id, code, driver_name, nickname, driver_phone, is_contractor, rate_per_scoop, status) VALUES
('E1', 'CAT 320-01', 'นาย ชัยรัตน์ ช่างขุด', 'ชัย', '082-222-0001', false, 5.0, 'active'),
('E2', 'CAT 320-02', 'นาย วรพจน์ มั่นหมาย', 'พจน์', '082-222-0002', false, 5.0, 'active'),
('E3', 'PC200-01', 'นาย เกรียงไกร ชัยศรี', 'ไกร', '082-222-0003', false, 5.0, 'active'),
('E4', 'PC200-02', 'นาย บรรเจิด เลิศล้ำ', 'เจิด', '082-222-0004', false, 5.0, 'active'),
('E5', 'PC200-03', 'นาย ประจักษ์ มั่งคั่ง', 'จักษ์', '082-222-0005', false, 5.0, 'active'),
('E6', 'PC200-04', 'นาย ยงยุทธ สุขศรี', 'ยุทธ', '082-222-0006', false, 5.0, 'active'),
('E7', 'PC200-05', 'นาย อุดม ศรีทอง', 'ดม', '082-222-0007', false, 5.0, 'active'),
('E8', 'SK200-01', 'นาย ไพโรจน์ ช่างยนต์', 'โรจน์', '082-222-0008', false, 5.0, 'active'),
('E9', 'SK200-02', 'นาย อนุสรณ์ ผาสุข', 'นุ', '082-222-0009', false, 5.0, 'active'),
('E10', 'SK200-03', 'นาย สมาน เพชรดี', 'หมาน', '082-222-0010', false, 5.0, 'active'),
('E11', 'EX-ผรม-01', 'นาย สนิท กิจการ (ผรม.A)', 'นิด', '083-333-0001', true, 5.0, 'active'),
('E12', 'EX-ผรม-02', 'นาย ประมวล รวมทรัพย์ (ผรม.A)', 'มวล', '083-333-0002', true, 5.0, 'active'),
('E13', 'EX-ผรม-03', 'นาย ชัยยศ ยอดเยี่ยม (ผรม.B)', 'ยศ', '083-333-0003', true, 5.0, 'active'),
('E14', 'EX-ผรม-04', 'นาย สำราญ บานชื่น (ผรม.B)', 'ราญ', '083-333-0004', true, 5.0, 'active'),
('E15', 'EX-ผรม-05', 'นาย สุรพล ผลดี (ผรม.C)', 'พล', '083-333-0005', true, 5.0, 'active'),
('E16', 'EX-ผรม-06', 'นาย ประสพ โชคดี (ผรม.C)', 'สพ', '083-333-0006', true, 5.0, 'active'),
('E17', 'EX-ผรม-07', 'นาย สมเกียรติ ยิ่งเจริญ (ผรม.D)', 'เกียรติ', '083-333-0007', true, 5.0, 'active'),
('E18', 'EX-ผรม-08', 'นาย จำรูญ หนุนนำ (ผรม.D)', 'รูญ', '083-333-0008', true, 5.0, 'active'),
('E19', 'EX-ผรม-09', 'นาย บัญชา ก้าวหน้า (ผรม.E)', 'ชา', '083-333-0009', true, 5.0, 'active'),
('E20', 'EX-ผรม-10', 'นาย สาโรจน์ รุ่งเรือง (ผรม.E)', 'โรจน์2', '083-333-0010', true, 5.0, 'active')
ON CONFLICT (id) DO NOTHING;

-- ผู้ใช้งานระบบและคนขับ
INSERT INTO public.drivers (id, name, nickname, phone, pin, role, assigned_vehicle, status) VALUES
('D0', 'ผู้บริหารโรงโม่ (Admin)', 'บอส', 'admin', '999999', 'admin', NULL, 'active'),
('D_SUP', 'หัวหน้างานคุมลาน (Supervisor)', 'หัวหน้า', 'SUP', '888888', 'supervisor', NULL, 'active'),
('D1', 'นาย ประเสริฐ แซ่ตั้ง', 'หวัง', '081-111-0001', '123456', 'truck_driver', 'C2-38', 'active'),
('D2', 'นาย สมหมาย ชาญชัย', 'หมาย', '081-111-0002', '123456', 'truck_driver', 'C2-39', 'active'),
('D3', 'นาย สุรเดช บุญมา', 'เดช', '081-111-0003', '123456', 'truck_driver', 'C2-40', 'active'),
('D4', 'นาย สมศักดิ์ มีสุข', 'ศักดิ์', '081-111-0004', '123456', 'truck_driver', 'C2-41', 'active'),
('D5', 'นาย เอกชัย มั่งมี', 'เอก', '081-111-0005', '123456', 'truck_driver', 'C2-42', 'active'),
('D6', 'นาย มานพ รุ่งเรือง', 'นพ', '081-111-0006', '123456', 'truck_driver', 'C2-43', 'active'),
('D7', 'นาย สมพร ยั่งยืน', 'พร', '081-111-0007', '123456', 'truck_driver', 'C2-44', 'active'),
('D8', 'นาย ประวิทย์ สุขสม', 'วิทย์', '081-111-0008', '123456', 'truck_driver', 'C2-45', 'active'),
('D9', 'นาย สมชัย ก้าวหน้า', 'ชัย', '081-111-0009', '123456', 'truck_driver', 'C2-46', 'active'),
('D10', 'นาย สุชาติ เจริญพร', 'ชาติ', '081-111-0010', '123456', 'truck_driver', 'C2-47', 'active'),
('DE1', 'นาย ชัยรัตน์ ช่างขุด', 'ชัย', '082-222-0001', '123456', 'excavator_operator', 'CAT 320-01', 'active'),
('DE2', 'นาย วรพจน์ มั่นหมาย', 'พจน์', '082-222-0002', '123456', 'excavator_operator', 'CAT 320-02', 'active'),
('DE3', 'นาย เกรียงไกร ชัยศรี', 'ไกร', '082-222-0003', '123456', 'excavator_operator', 'PC200-01', 'active')
ON CONFLICT (id) DO NOTHING;

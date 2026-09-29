/**
 * ศูนย์กลางจัดการข้อมูลและฐานข้อมูล Supabase PostgreSQL + Local Storage + Supabase Storage
 * (Quarry Fleet Management Store with Supabase Client & Smart Image Upload)
 */
class QuarryStore {
  constructor() {
    this.masterData = null;
    this.trips = [];
    this.excavatorLogs = [];
    this.pendingSyncQueue = [];
    this.listeners = [];
    this.isSyncing = false;
    this.cloudStatus = 'unknown'; // 'online', 'offline', 'connecting', 'error'
    this.lastSyncAt = null;
    this.lastSyncError = null;
    this.supabase = null;
  }

  getSupabaseKey() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_CUSTOM_KEY) || CONFIG.SUPABASE_ANON_KEY;
  }

  setSupabaseKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SUPABASE_CUSTOM_KEY, key.trim());
      this.initSupabaseClient();
      this.refreshMasterDataFromCloud();
    }
  }

  initSupabaseClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        const key = this.getSupabaseKey();
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, key);
        console.log("Supabase Client initialized successfully:", CONFIG.SUPABASE_URL);
      } catch (err) {
        console.warn("Failed to create Supabase client:", err);
      }
    } else {
      console.warn("Supabase SDK not loaded on window.");
    }
  }

  async init() {
    // 0. เริ่มต้น Supabase Client
    this.initSupabaseClient();

    // 1. โหลด Master Data จาก LocalStorage หรือ seed_data.json
    const cachedMaster = localStorage.getItem(CONFIG.STORAGE_KEYS.MASTER_DATA);
    if (cachedMaster) {
      try {
        this.masterData = JSON.parse(cachedMaster);
      } catch (e) {
        console.error("Failed to parse cached master data", e);
      }
    }

    if (!this.masterData && window.EMBEDDED_SEED_DATA) {
      this.masterData = window.EMBEDDED_SEED_DATA;
      this.saveMasterData();
    }

    if (!this.masterData) {
      try {
        const resp = await fetch('data/seed_data.json');
        this.masterData = await resp.json();
        this.saveMasterData();
      } catch (err) {
        console.warn("Could not fetch seed_data.json, using fallback blank structure", err);
        this.masterData = { trucks: [], excavators: [], drivers: [], job_rates: [] };
      }
    }

    // 2. โหลดรายการ Trips และ Excavator Logs ในเครื่อง
    this.trips = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TRIPS) || '[]').map(trip => {
      const { loadPhotoBase64, dumpPhotoBase64, ...cleanTrip } = trip;
      return cleanTrip;
    });

    // ปรับยอดเดิมในเครื่องให้เป็นเรทต่อตัน × พิกัดรถ
    this.trips = this.trips.map(trip => ({
      ...trip,
      amount: trip.amount || this.calculateTruckRate(trip.jobTypeId, Number(trip.capacityTon) || 0)
    }));

    this.excavatorLogs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS) || '[]');
    this.pendingSyncQueue = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_SYNC) || '[]');

    // แสดงหน้าจอจาก cache ทันที แล้วค่อยดึงข้อมูลจาก Supabase Cloud เบื้องหลัง
    this.refreshMasterDataFromCloud().then(() => this.notify());
    this.fetchRecentCloudData().then(() => this.notify());

    // 3. เริ่มระบบ Auto Sync เบื้องหลัง
    setInterval(() => this.processSyncQueue(), CONFIG.AUTO_SYNC_INTERVAL_MS);
    window.addEventListener('online', () => {
      this.cloudStatus = 'connecting';
      this.processSyncQueue();
      this.refreshMasterDataFromCloud();
    });
    window.addEventListener('offline', () => {
      this.cloudStatus = 'offline';
      this.notify();
    });

    setTimeout(() => this.processSyncQueue(), 500);
    this.notify();
  }

  // -------------------------------------------------------------
  // Supabase Data Fetching & Sync
  // -------------------------------------------------------------
  async refreshMasterDataFromCloud() {
    if (!navigator.onLine) {
      this.cloudStatus = 'offline';
      return false;
    }

    if (!this.supabase) {
      this.initSupabaseClient();
      if (!this.supabase) {
        this.cloudStatus = 'offline';
        return false;
      }
    }

    try {
      this.cloudStatus = 'connecting';
      
      const [trucksRes, excavatorsRes, ratesRes, driversRes] = await Promise.all([
        this.supabase.from('trucks').select('*').order('code'),
        this.supabase.from('excavators').select('*').order('code'),
        this.supabase.from('job_rates').select('*').order('name'),
        this.supabase.from('drivers').select('*').order('name')
      ]);

      const cloudError = [trucksRes, excavatorsRes, ratesRes, driversRes]
        .map(result => result.error)
        .find(Boolean);
      if (cloudError) {
        throw cloudError;
      }

      let hasUpdated = false;
      const cached = this.masterData || {};

      if (trucksRes.data && trucksRes.data.length > 0) {
        cached.trucks = trucksRes.data.map(t => ({
          ...t,
          capacity_ton: Number(t.capacity_ton) || 30
        }));
        hasUpdated = true;
      }

      if (excavatorsRes.data && excavatorsRes.data.length > 0) {
        cached.excavators = excavatorsRes.data.map(e => ({
          ...e,
          rate_per_scoop: Number(e.rate_per_scoop) || 5.0
        }));
        hasUpdated = true;
      }

      if (ratesRes.data && ratesRes.data.length > 0) {
        cached.job_rates = ratesRes.data.map(r => ({
          ...r,
          rate_30_ton: Number(r.rate_30_ton) || 0,
          rate_45_ton: Number(r.rate_45_ton) || 0,
          rate_60_ton: Number(r.rate_60_ton) || 0
        }));
        hasUpdated = true;
      }

      if (driversRes.data && driversRes.data.length > 0) {
        cached.drivers = driversRes.data;
        hasUpdated = true;
      }

      if (hasUpdated) {
        this.masterData = cached;
        localStorage.setItem(CONFIG.STORAGE_KEYS.MASTER_DATA, JSON.stringify(this.masterData));
      }

      this.cloudStatus = 'online';
      this.lastSyncAt = new Date().toISOString();
      this.lastSyncError = null;
      return true;
    } catch (error) {
      this.cloudStatus = navigator.onLine ? 'error' : 'offline';
      this.lastSyncError = error.message || 'เชื่อมต่อ Supabase ล้มเหลว';
      console.warn('Using cached master data due to Supabase fetch error:', this.lastSyncError);
      return false;
    }
  }

  async fetchRecentCloudData() {
    if (!navigator.onLine || !this.supabase) return;
    try {
      // ดึง Trips ล่าสุดจาก Supabase
      const { data: cloudTrips, error: tripErr } = await this.supabase
        .from('trips')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (tripErr) throw tripErr;

      if (cloudTrips && cloudTrips.length > 0) {
        // ผสานเข้ากับ local trips โดยคงรายการที่ไม่ซ้ำ
        const localMap = new Map(this.trips.map(t => [t.id, t]));
        cloudTrips.forEach(ct => {
          localMap.set(ct.id, {
            id: ct.id,
            date: ct.trip_date,
            timestamp: ct.timestamp_text || new Date(ct.recorded_at).toLocaleTimeString('th-TH'),
            driverId: ct.driver_id,
            driverName: ct.driver_name,
            driverPhone: ct.driver_phone,
            truckPlate: ct.truck_plate,
            capacityTon: Number(ct.capacity_ton) || 30,
            roundNumber: Number(ct.round_number) || 1,
            jobTypeId: ct.job_type_id,
            jobTypeName: ct.job_type_name,
            amount: Number(ct.amount) || 0,
            loadPhotoUrl: ct.load_photo_url,
            dumpPhotoUrl: ct.dump_photo_url,
            loadLat: ct.load_lat,
            loadLng: ct.load_lng,
            dumpLat: ct.dump_lat,
            dumpLng: ct.dump_lng,
            status: ct.status || 'approved'
          });
        });

        this.trips = Array.from(localMap.values()).sort((a, b) => (b.date + ' ' + b.timestamp).localeCompare(a.date + ' ' + a.timestamp));
        try {
          localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips.slice(0, 200)));
        } catch (e) {
          console.warn("Storage quota:", e);
        }
      }

      // ดึง Excavator Logs ล่าสุดจาก Supabase
      const { data: cloudLogs, error: logErr } = await this.supabase
        .from('excavator_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (logErr) throw logErr;

      if (cloudLogs && cloudLogs.length > 0) {
        const logMap = new Map(this.excavatorLogs.map(l => [l.id, l]));
        cloudLogs.forEach(cl => {
          logMap.set(cl.id, {
            id: cl.id,
            date: cl.log_date,
            timestamp: cl.timestamp_text || new Date(cl.recorded_at).toLocaleTimeString('th-TH'),
            operatorName: cl.operator_name,
            operatorPhone: cl.operator_phone,
            excavatorCode: cl.excavator_code,
            targetTruckPlate: cl.target_truck_plate,
            amount: Number(cl.amount) || 5.0,
            photoUrl: cl.photo_url,
            lat: cl.lat,
            lng: cl.lng,
            status: cl.status || 'completed'
          });
        });
        this.excavatorLogs = Array.from(logMap.values()).sort((a, b) => (b.date + ' ' + b.timestamp).localeCompare(a.date + ' ' + a.timestamp));
        try {
          localStorage.setItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS, JSON.stringify(this.excavatorLogs.slice(0, 200)));
        } catch (e) {
          console.warn("Storage quota:", e);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch recent cloud data:", e);
    }
  }

  // Subscribe state changes
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // -------------------------------------------------------------
  // Master Data Getters
  // -------------------------------------------------------------
  saveMasterData() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MASTER_DATA, JSON.stringify(this.masterData));
    this.notify();
  }

  getTrucks() {
    return this.masterData ? this.masterData.trucks || [] : [];
  }

  getExcavators() {
    return this.masterData ? this.masterData.excavators || [] : [];
  }

  getDrivers() {
    return this.masterData ? this.masterData.drivers || [] : [];
  }

  getJobRates() {
    return this.masterData ? this.masterData.job_rates || [] : [];
  }

  // คำนวณราคาเที่ยวสำหรับรถบรรทุกตามขนาดพิกัดตัน
  calculateTruckRate(jobRateId, capacityTon) {
    const rates = this.getJobRates();
    const job = rates.find(r => r.id === jobRateId);
    if (!job) return 0;

    const ratePerTon = capacityTon >= 60
      ? (job.rate_60_ton || 0)
      : (capacityTon >= 45 ? (job.rate_45_ton || 0) : (job.rate_30_ton || 0));
    return ratePerTon * capacityTon;
  }

  // -------------------------------------------------------------
  // Truck Trips Methods
  // -------------------------------------------------------------
  saveTrip(tripData) {
    // บันทึกเฉพาะข้อมูลสะอาดลง LocalStorage (ไม่เก็บ base64 รูปเต็มใน local เพื่อประหยัดพื้นที่)
    const { loadPhotoBase64, dumpPhotoBase64, ...localTrip } = tripData;
    const existingIndex = this.trips.findIndex(t => t.id === localTrip.id);
    if (existingIndex >= 0) {
      this.trips[existingIndex] = { ...this.trips[existingIndex], ...localTrip };
    } else {
      this.trips.unshift(localTrip);
    }

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips.slice(0, 200)));
    } catch (err) {
      this.trips = this.trips.slice(0, 50);
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips)); } catch (e) {}
    }
    
    // เพิ่มเข้าคิวซิงค์ขึ้น Supabase
    this.queueSync('saveTrip', tripData);
    this.notify();
    return tripData;
  }

  getTrips(filter = {}) {
    let result = [...this.trips];
    if (filter.driverPhone) {
      result = result.filter(t => t.driverPhone === filter.driverPhone);
    }
    if (filter.truckPlate) {
      result = result.filter(t => t.truckPlate === filter.truckPlate);
    }
    if (filter.date) {
      result = result.filter(t => t.date === filter.date);
    }
    return result;
  }

  // -------------------------------------------------------------
  // Excavator Logs Methods
  // -------------------------------------------------------------
  saveExcavatorLog(logData) {
    const { photoBase64, ...localLog } = logData;
    const existingIndex = this.excavatorLogs.findIndex(l => l.id === localLog.id);
    if (existingIndex >= 0) {
      this.excavatorLogs[existingIndex] = { ...this.excavatorLogs[existingIndex], ...localLog };
    } else {
      this.excavatorLogs.unshift(localLog);
    }

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS, JSON.stringify(this.excavatorLogs.slice(0, 200)));
    } catch (e) {}
    
    // เพิ่มเข้าคิวซิงค์ขึ้น Supabase
    this.queueSync('saveExcavatorLog', logData);
    this.notify();
    return logData;
  }

  getExcavatorLogs(filter = {}) {
    let result = [...this.excavatorLogs];
    if (filter.operatorName) {
      result = result.filter(l => l.operatorName === filter.operatorName);
    }
    if (filter.excavatorCode) {
      result = result.filter(l => l.excavatorCode === filter.excavatorCode);
    }
    if (filter.date) {
      result = result.filter(l => l.date === filter.date);
    }
    return result;
  }

  // -------------------------------------------------------------
  // Cloud Sync Queue & Supabase Upload
  // -------------------------------------------------------------
  queueSync(action, payload) {
    this.pendingSyncQueue.push({
      id: 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      action: action,
      payload: payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null
    });

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
    } catch (err) {
      console.warn('Pending sync queue stored in memory:', err.message);
    }

    this.processSyncQueue();
  }

  async uploadPhotoToSupabaseStorage(base64Data, targetPath) {
    if (!this.supabase || !base64Data) return null;
    try {
      const blob = window.cameraEngine.dataURLToBlob(base64Data);
      const { data, error } = await this.supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .upload(targetPath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.warn("Supabase Storage upload warning:", error.message);
        return null;
      }

      const { data: publicData } = this.supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .getPublicUrl(targetPath);

      return publicData ? publicData.publicUrl : null;
    } catch (err) {
      console.warn("Storage upload failed:", err);
      return null;
    }
  }

  async processSyncQueue() {
    if (this.isSyncing || this.pendingSyncQueue.length === 0 || !navigator.onLine) return;
    if (!this.supabase) {
      this.initSupabaseClient();
      if (!this.supabase) return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      while (this.pendingSyncQueue.length > 0) {
        const item = this.pendingSyncQueue[0];
        item.attempts = (item.attempts || 0) + 1;

        if (item.action === 'saveTrip') {
          await this.syncTripToSupabase(item.payload);
        } else if (item.action === 'saveExcavatorLog') {
          await this.syncExcavatorLogToSupabase(item.payload);
        }

        // ลบออกจากคิวเมื่อสำเร็จ
        this.pendingSyncQueue.shift();
        this.lastSyncAt = new Date().toISOString();
        this.cloudStatus = 'online';
        this.lastSyncError = null;
        try {
          localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
        } catch (e) {}
      }
    } catch (e) {
      const item = this.pendingSyncQueue[0];
      if (item) {
        item.lastError = e.message || 'บันทึกข้อมูลขึ้น Supabase ไม่สำเร็จ';
        try { localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue)); } catch (err) {}
      }
      this.cloudStatus = navigator.onLine ? 'error' : 'offline';
      this.lastSyncError = item ? item.lastError : e.message;
      console.warn("Supabase Sync error:", this.lastSyncError);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  async syncTripToSupabase(trip) {
    const todayStr = trip.date || new Date().toISOString().split('T')[0];
    // ปรับชื่อโฟลเดอร์รถให้สะอาด (เช่น C2-38 หรือ C2-38_HINO)
    const cleanVehicle = (trip.truckPlate || 'TRUCK_UNKNOWN').replace(/[\/\s]+/g, '_');
    const roundNumber = trip.roundNumber || 1;
    const timeSafe = (trip.timestamp || '').replace(/[:\s\/\.]+/g, '-').slice(0, 8) || Date.now().toString().slice(-6);
    let loadUrl = trip.loadPhotoUrl || null;
    let dumpUrl = trip.dumpPhotoUrl || null;

    // 1. อัปโหลดรูปจุดรับหิน: เช่น trips/2026-09-28/C2-38/2026-09-28_C2-38_รอบที่1_จุดรับหิน_14-30-00.jpg
    if (trip.loadPhotoBase64 && !loadUrl) {
      const loadFileName = `${todayStr}_${cleanVehicle}_รอบที่${roundNumber}_จุดรับหิน_${timeSafe}.jpg`;
      const path = `trips/${todayStr}/${cleanVehicle}/${loadFileName}`;
      loadUrl = await this.uploadPhotoToSupabaseStorage(trip.loadPhotoBase64, path);
    }

    // 2. อัปโหลดรูปจุดเทหิน: เช่น trips/2026-09-28/C2-38/2026-09-28_C2-38_รอบที่1_จุดเทหิน_14-45-00.jpg
    if (trip.dumpPhotoBase64 && !dumpUrl) {
      const dumpFileName = `${todayStr}_${cleanVehicle}_รอบที่${roundNumber}_จุดเทหิน_${timeSafe}.jpg`;
      const path = `trips/${todayStr}/${cleanVehicle}/${dumpFileName}`;
      dumpUrl = await this.uploadPhotoToSupabaseStorage(trip.dumpPhotoBase64, path);
    }

    // 3. Upsert แถวข้อมูลในตาราง trips
    const tripRecord = {
      id: trip.id,
      trip_date: trip.date || todayStr,
      timestamp_text: trip.timestamp,
      driver_id: trip.driverId || null,
      driver_name: trip.driverName,
      driver_phone: trip.driverPhone || null,
      truck_plate: trip.truckPlate,
      capacity_ton: Number(trip.capacityTon) || 30,
      round_number: Number(trip.roundNumber) || 1,
      job_type_id: trip.jobTypeId || null,
      job_type_name: trip.jobTypeName || '',
      amount: Number(trip.amount) || this.calculateTruckRate(trip.jobTypeId, Number(trip.capacityTon) || 0),
      load_photo_url: loadUrl,
      load_lat: trip.loadGps && trip.loadGps.lat ? Number(trip.loadGps.lat) : null,
      load_lng: trip.loadGps && trip.loadGps.lng ? Number(trip.loadGps.lng) : null,
      dump_photo_url: dumpUrl,
      dump_lat: trip.dumpGps && trip.dumpGps.lat ? Number(trip.dumpGps.lat) : null,
      dump_lng: trip.dumpGps && trip.dumpGps.lng ? Number(trip.dumpGps.lng) : null,
      status: trip.status || 'approved'
    };

    const { error } = await this.supabase
      .from('trips')
      .upsert(tripRecord, { onConflict: 'id' });

    if (error) {
      throw new Error(`Supabase trips upsert failed: ${error.message}`);
    }

    // อัปเดต URL รูปใน Local Cache
    const localTrip = this.trips.find(t => t.id === trip.id);
    if (localTrip) {
      if (loadUrl) localTrip.loadPhotoUrl = loadUrl;
      if (dumpUrl) localTrip.dumpPhotoUrl = dumpUrl;
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips)); } catch (e) {}
    }
  }

  async syncExcavatorLogToSupabase(log) {
    const todayStr = log.date || new Date().toISOString().split('T')[0];
    const cleanExcCode = (log.excavatorCode || 'EXC_UNKNOWN').replace(/[\/\s]+/g, '_');
    const cleanTruckPlate = (log.targetTruckPlate || 'TRUCK').replace(/[\/\s]+/g, '_');
    const timeSafe = (log.timestamp || '').replace(/[:\s\/\.]+/g, '-').slice(0, 8) || Date.now().toString().slice(-6);
    let photoUrl = log.photoUrl || null;

    // เช่น: excavators/2026-09-28/CAT_320-01/2026-09-28_CAT_320-01_ตักให้_C2-38_14-30-00.jpg
    if (log.photoBase64 && !photoUrl) {
      const excFileName = `${todayStr}_${cleanExcCode}_ตักให้_${cleanTruckPlate}_${timeSafe}.jpg`;
      const path = `excavators/${todayStr}/${cleanExcCode}/${excFileName}`;
      photoUrl = await this.uploadPhotoToSupabaseStorage(log.photoBase64, path);
    }

    const logRecord = {
      id: log.id,
      log_date: log.date || todayStr,
      timestamp_text: log.timestamp,
      operator_name: log.operatorName,
      operator_phone: log.operatorPhone || null,
      excavator_code: log.excavatorCode,
      target_truck_plate: log.targetTruckPlate,
      amount: Number(log.amount) || 5.0,
      photo_url: photoUrl,
      lat: log.gps && log.gps.lat ? Number(log.gps.lat) : null,
      lng: log.gps && log.gps.lng ? Number(log.gps.lng) : null,
      status: log.status || 'completed'
    };

    const { error } = await this.supabase
      .from('excavator_logs')
      .upsert(logRecord, { onConflict: 'id' });

    if (error) {
      throw new Error(`Supabase excavator_logs upsert failed: ${error.message}`);
    }

    const localLog = this.excavatorLogs.find(l => l.id === log.id);
    if (localLog && photoUrl) {
      localLog.photoUrl = photoUrl;
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS, JSON.stringify(this.excavatorLogs)); } catch (e) {}
    }
  }

  getSyncStatus() {
    return {
      status: this.cloudStatus,
      pending: this.pendingSyncQueue.length,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastSyncError,
      needsAttention: this.pendingSyncQueue.some(x => (x.attempts || 0) >= CONFIG.MAX_SYNC_ATTEMPTS_BEFORE_WARNING)
    };
  }

  // -------------------------------------------------------------
  // Master Data CRUD Actions (Direct Supabase Sync)
  // -------------------------------------------------------------
  async addOrUpdateTruck(truck) {
    if (!this.masterData.trucks) this.masterData.trucks = [];
    const idx = this.masterData.trucks.findIndex(t => t.id === truck.id);
    if (idx >= 0) {
      this.masterData.trucks[idx] = { ...this.masterData.trucks[idx], ...truck };
    } else {
      this.masterData.trucks.push(truck);
    }
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('trucks').upsert(truck, { onConflict: 'id' });
      } catch (e) {
        console.warn("Supabase truck upsert error:", e);
      }
    }
  }

  async deleteTruck(truckId) {
    if (!this.masterData.trucks) return;
    this.masterData.trucks = this.masterData.trucks.filter(t => t.id !== truckId);
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('trucks').delete().eq('id', truckId);
      } catch (e) {
        console.warn("Supabase truck delete error:", e);
      }
    }
  }

  async addOrUpdateExcavator(exc) {
    if (!this.masterData.excavators) this.masterData.excavators = [];
    const idx = this.masterData.excavators.findIndex(e => e.id === exc.id);
    if (idx >= 0) {
      this.masterData.excavators[idx] = { ...this.masterData.excavators[idx], ...exc };
    } else {
      this.masterData.excavators.push(exc);
    }
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('excavators').upsert(exc, { onConflict: 'id' });
      } catch (e) {
        console.warn("Supabase excavator upsert error:", e);
      }
    }
  }

  async deleteExcavator(excId) {
    if (!this.masterData.excavators) return;
    this.masterData.excavators = this.masterData.excavators.filter(e => e.id !== excId);
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('excavators').delete().eq('id', excId);
      } catch (e) {
        console.warn("Supabase excavator delete error:", e);
      }
    }
  }

  async addOrUpdateJobRate(rate) {
    if (!this.masterData.job_rates) this.masterData.job_rates = [];
    const idx = this.masterData.job_rates.findIndex(r => r.id === rate.id);
    if (idx >= 0) {
      this.masterData.job_rates[idx] = { ...this.masterData.job_rates[idx], ...rate };
    } else {
      this.masterData.job_rates.push(rate);
    }
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('job_rates').upsert(rate, { onConflict: 'id' });
      } catch (e) {
        console.warn("Supabase job_rates upsert error:", e);
      }
    }
  }

  async deleteJobRate(rateId) {
    if (!this.masterData.job_rates) return;
    this.masterData.job_rates = this.masterData.job_rates.filter(r => r.id !== rateId);
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('job_rates').delete().eq('id', rateId);
      } catch (e) {
        console.warn("Supabase job_rates delete error:", e);
      }
    }
  }

  async addOrUpdateDriver(driver) {
    if (!this.masterData.drivers) this.masterData.drivers = [];
    const idx = this.masterData.drivers.findIndex(d => d.id === driver.id);
    if (idx >= 0) {
      this.masterData.drivers[idx] = { ...this.masterData.drivers[idx], ...driver };
    } else {
      this.masterData.drivers.push(driver);
    }
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('drivers').upsert(driver, { onConflict: 'id' });
      } catch (e) {
        console.warn("Supabase driver upsert error:", e);
      }
    }
  }

  async deleteDriver(driverId) {
    if (!this.masterData.drivers) return;
    this.masterData.drivers = this.masterData.drivers.filter(d => d.id !== driverId);
    this.saveMasterData();

    if (this.supabase && navigator.onLine) {
      try {
        await this.supabase.from('drivers').delete().eq('id', driverId);
      } catch (e) {
        console.warn("Supabase driver delete error:", e);
      }
    }
  }

  // ซิงค์ข้อมูลทั้งหมดจาก seed data ขึ้นสู่ Supabase
  async seedAllToSupabase() {
    if (!this.supabase || !this.masterData) return false;
    try {
      if (this.masterData.job_rates && this.masterData.job_rates.length) {
        await this.supabase.from('job_rates').upsert(this.masterData.job_rates, { onConflict: 'id' });
      }
      if (this.masterData.trucks && this.masterData.trucks.length) {
        await this.supabase.from('trucks').upsert(this.masterData.trucks, { onConflict: 'id' });
      }
      if (this.masterData.excavators && this.masterData.excavators.length) {
        await this.supabase.from('excavators').upsert(this.masterData.excavators, { onConflict: 'id' });
      }
      if (this.masterData.drivers && this.masterData.drivers.length) {
        await this.supabase.from('drivers').upsert(this.masterData.drivers, { onConflict: 'id' });
      }
      await this.refreshMasterDataFromCloud();
      return true;
    } catch (e) {
      console.error("Seed to Supabase failed:", e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // ระบบตรวจสอบสิทธิ์ เข้าสู่ระบบ และลงทะเบียนผู้ใช้
  // -------------------------------------------------------------
  async authenticateUser(identifier, pin) {
    if (!identifier || !pin) {
      return { success: false, message: 'กรุณาระบุเบอร์โทรหรือรหัสผู้ใช้ และ PIN' };
    }

    const cleanId = String(identifier).trim().replace(/[-\s]/g, '');
    const cleanPin = String(pin).trim();

    // ดึงข้อมูลผู้ใช้ทั้งหมด
    const drivers = this.getDrivers();

    // ค้นหาผู้ใช้ตาม เบอร์โทร, ID หรือ รหัสพนักงาน
    let user = drivers.find(d => {
      const userPhone = String(d.phone || '').replace(/[-\s]/g, '');
      const userId = String(d.id || '').toLowerCase();
      const userName = String(d.name || '').toLowerCase();
      
      // เทียบกับเบอร์โทร (รองรับทั้งแบบมี 0 และตัด 0)
      if (userPhone && (userPhone === cleanId || userPhone.endsWith(cleanId) || cleanId.endsWith(userPhone))) {
        return true;
      }
      // เทียบกับ ID
      if (userId === cleanId.toLowerCase()) return true;

      // เทียบกับ Admin / Supervisor alias
      if (cleanId.toUpperCase() === 'ADMIN_1' && (d.role === 'admin' || userId === 'admin_1')) return true;
      if (cleanId.toUpperCase() === 'SUP_1' && (d.role === 'supervisor' || userId === 'sup_1')) return true;

      return false;
    });

    // หากไม่พบใน Local และเชื่อมต่อ Supabase ให้ลองค้นจาก Cloud
    if (!user && this.supabase && navigator.onLine) {
      try {
        const { data, error } = await this.supabase
          .from('drivers')
          .select('*')
          .or(`phone.eq.${identifier},id.eq.${identifier}`);
        if (data && data.length > 0) {
          user = data[0];
          this.addOrUpdateDriver(user);
        }
      } catch (err) {
        console.warn("Supabase auth lookup error:", err);
      }
    }

    // กรณีทดสอบระบบบัญชี Admin / Supervisor ถ้าไม่มีในฐานข้อมูล ให้สร้างบัญชีเริ่มต้น
    if (!user && (cleanId.toUpperCase() === 'ADMIN_1' || cleanId.toLowerCase() === 'admin')) {
      user = { id: 'ADMIN_1', name: 'ผู้บริหารโรงโม่ (แอดมิน)', phone: '0888888888', role: 'admin', pin: '1234', status: 'active' };
      this.addOrUpdateDriver(user);
    } else if (!user && (cleanId.toUpperCase() === 'SUP_1' || cleanId.toLowerCase() === 'supervisor')) {
      user = { id: 'SUP_1', name: 'หัวหน้างานหน้างาน', phone: '0999999999', role: 'supervisor', pin: '1234', status: 'active' };
      this.addOrUpdateDriver(user);
    }

    if (!user) {
      return { success: false, message: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ หรือเบอร์โทรศัพท์ไม่ถูกต้อง' };
    }

    // ตรวจสอบสถานะบัญชี (Status)
    if (user.status === 'suspended') {
      return { success: false, message: 'บัญชีนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' };
    }
    if (user.status === 'pending') {
      return { success: false, message: 'บัญชีนี้อยู่ระหว่างรอผู้ดูแลระบบอนุมัติการใช้งาน' };
    }

    // ตรวจสอบรหัส PIN
    const expectedPin = String(user.pin || '1234').trim();
    if (cleanPin !== expectedPin) {
      return { success: false, message: 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
    }

    return { success: true, user };
  }

  // ลงทะเบียนคนขับรถใหม่ (New Driver Self-Registration)
  async registerDriver(driverData) {
    const { name, nickname, phone, role, assigned_vehicle, pin } = driverData;
    if (!name || !phone || !pin) {
      return { success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' };
    }

    const cleanPhone = String(phone).trim().replace(/[-\s]/g, '');
    const drivers = this.getDrivers();

    // เช็คเบอร์โทรซ้ำ
    const existing = drivers.find(d => {
      const p = String(d.phone || '').replace(/[-\s]/g, '');
      return p && p === cleanPhone;
    });

    if (existing) {
      return { success: false, message: `เบอร์โทรศัพท์นี้ลงทะเบียนไว้แล้วในชื่อ "${existing.name}"` };
    }

    const newDriver = {
      id: 'D_' + Date.now(),
      name: name.trim(),
      nickname: (nickname || '').trim(),
      phone: phone.trim(),
      role: role || 'truck_driver',
      assigned_vehicle: assigned_vehicle || '',
      pin: String(pin).trim(),
      status: 'active', // เปิดใช้งานทันที
      created_at: new Date().toISOString()
    };

    await this.addOrUpdateDriver(newDriver);
    return { success: true, user: newDriver };
  }

  // เปลี่ยนรหัส PIN
  async changeDriverPin(driverId, oldPin, newPin) {
    const drivers = this.getDrivers();
    const user = drivers.find(d => d.id === driverId);
    if (!user) return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' };

    const currentPin = String(user.pin || '1234').trim();
    if (String(oldPin).trim() !== currentPin) {
      return { success: false, message: 'รหัส PIN เดิมไม่ถูกต้อง' };
    }

    user.pin = String(newPin).trim();
    await this.addOrUpdateDriver(user);
    return { success: true, message: 'เปลี่ยนรหัส PIN เรียบร้อยแล้ว' };
  }

  // รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นจากไฟล์ Excel / Seed JSON
  async resetToSeedData() {
    try {
      const resp = await fetch('data/seed_data.json');
      this.masterData = await resp.json();
      this.saveMasterData();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

window.quarryStore = new QuarryStore();

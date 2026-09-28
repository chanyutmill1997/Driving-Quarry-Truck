/**
 * ศูนย์กลางจัดการข้อมูลและฐานข้อมูล Local + Cloud Sync (Store & State Management)
 */
class QuarryStore {
  constructor() {
    this.masterData = null;
    this.trips = [];
    this.excavatorLogs = [];
    this.pendingSyncQueue = [];
    this.listeners = [];
    this.isSyncing = false;
    this.cloudStatus = 'unknown';
    this.lastSyncAt = null;
    this.lastSyncError = null;
  }

  async init() {
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

    // 2. โหลดรายการ Trips และ Excavator Logs
    this.trips = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TRIPS) || '[]').map(trip => {
      const { loadPhotoBase64, dumpPhotoBase64, ...cleanTrip } = trip;
      return cleanTrip;
    });
    // ปรับยอดเดิมในเครื่องให้เป็นเรทต่อตัน × พิกัดรถ
    this.trips = this.trips.map(trip => ({
      ...trip,
      amount: this.calculateTruckRate(trip.jobTypeId, Number(trip.capacityTon) || 0)
    }));
    // ล้างเฉพาะรูปเต็มที่เวอร์ชันเก่าเคยเก็บซ้ำในประวัติ ไม่ลบข้อมูลเที่ยว
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips)); } catch (e) { console.warn('Trip history cleanup deferred:', e.message); }
    this.excavatorLogs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS) || '[]');
    this.pendingSyncQueue = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_SYNC) || '[]');

    // แสดงหน้าจอจาก cache ทันที แล้วค่อยอัปเดตข้อมูล Cloud เบื้องหลัง
    this.refreshMasterDataFromCloud().then(() => this.notify());

    // 3. เริ่มระบบ Auto Sync เบื้องหลัง
    setInterval(() => this.processSyncQueue(), CONFIG.AUTO_SYNC_INTERVAL_MS);
    window.addEventListener('online', () => {
      this.cloudStatus = 'connecting';
      this.processSyncQueue();
    });
    window.addEventListener('offline', () => {
      this.cloudStatus = 'offline';
      this.notify();
    });
    // เริ่มซิงก์ในรอบถัดไป เพื่อไม่ให้การแจ้งสถานะของ Cloud แทรกระหว่าง
    // การรีเซ็ตหน้าจอคนขับหลังปิดงานรอบหนึ่ง
    setTimeout(() => this.processSyncQueue(), 0);
    this.notify();
  }

  async apiRequest(payload, timeoutMs = CONFIG.API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, appVersion: CONFIG.VERSION }),
        signal: controller.signal,
        redirect: 'follow'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || result.status !== 'success') {
        throw new Error(result && result.message ? result.message : 'Cloud API error');
      }
      this.cloudStatus = 'online';
      this.lastSyncError = null;
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  async refreshMasterDataFromCloud() {
    if (!navigator.onLine || !CONFIG.API_URL) {
      this.cloudStatus = 'offline';
      return false;
    }
    try {
      this.cloudStatus = 'connecting';
      const result = await this.apiRequest({ action: 'getMasterData' });
      if (result.data && Array.isArray(result.data.trucks) && result.data.trucks.length) {
        const cached = this.masterData || {};
        const validTrucks = result.data.trucks.filter(x => x.id && x.code && Number(x.capacity_ton) > 0);
        const validExcavators = result.data.excavators.filter(x => x.id && x.code);
        const validDrivers = result.data.drivers.filter(x => x.id && x.name && x.role);
        const validRates = result.data.job_rates.filter(x => x.id && x.name);
        this.masterData = {
          trucks: validTrucks.length ? validTrucks : (cached.trucks || []),
          excavators: validExcavators.length ? validExcavators : (cached.excavators || []),
          drivers: validDrivers.length ? validDrivers : (cached.drivers || []),
          job_rates: validRates.length ? validRates : (cached.job_rates || [])
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.MASTER_DATA, JSON.stringify(this.masterData));
      }
      this.lastSyncAt = new Date().toISOString();
      return true;
    } catch (error) {
      this.cloudStatus = navigator.onLine ? 'error' : 'offline';
      this.lastSyncError = error.name === 'AbortError' ? 'หมดเวลารอระบบกลาง' : error.message;
      console.warn('Using cached master data:', this.lastSyncError);
      return false;
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
  // Master Data Methods
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

  // คำนวณราคาเที่ยวสำหรับรถบรรทุก
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
    // รูปเต็มเก็บเฉพาะในคิวส่ง Cloud ไม่เก็บซ้ำในประวัติ LocalStorage
    const { loadPhotoBase64, dumpPhotoBase64, ...localTrip } = tripData;
    const existingIndex = this.trips.findIndex(t => t.id === localTrip.id);
    if (existingIndex >= 0) {
      this.trips[existingIndex] = { ...this.trips[existingIndex], ...localTrip };
    } else {
      this.trips.unshift(localTrip);
    }

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips));
    } catch (err) {
      // เก็บประวัติล่าสุดก่อน หากเครื่องมีข้อมูลเก่าจนพื้นที่เต็ม
      this.trips = this.trips.slice(0, 200);
      localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips));
    }
    
    // เพิ่มเข้าคิวซิงค์ขึ้น Cloud
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
    const existingIndex = this.excavatorLogs.findIndex(l => l.id === logData.id);
    if (existingIndex >= 0) {
      this.excavatorLogs[existingIndex] = { ...this.excavatorLogs[existingIndex], ...logData };
    } else {
      this.excavatorLogs.unshift(logData);
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS, JSON.stringify(this.excavatorLogs));
    
    // เพิ่มเข้าคิวซิงค์ขึ้น Cloud
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
  // Cloud Sync Queue
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
      // รูปยังอยู่ในหน่วยความจำและจะส่งทันทีเมื่อออนไลน์ แม้พื้นที่ถาวรของเบราว์เซอร์เต็ม
      console.warn('Pending photo queue kept in memory:', err.message);
    }
    this.processSyncQueue();
  }

  async processSyncQueue() {
    if (this.isSyncing || this.pendingSyncQueue.length === 0 || !navigator.onLine) return;
    this.isSyncing = true;
    this.notify();

    try {
      while (this.pendingSyncQueue.length > 0) {
        const item = this.pendingSyncQueue[0];
        const bodyData = {
          action: item.action,
          ...item.payload
        };
        item.attempts = (item.attempts || 0) + 1;
        const resJson = await this.apiRequest(bodyData);
        // Backend คำนวณยอดใหม่เสมอ จึงอัปเดต local record ให้ตรงกับ Cloud
        if (item.action === 'saveTrip' && typeof resJson.amount === 'number') {
          const trip = this.trips.find(t => t.id === item.payload.id);
          if (trip) trip.amount = resJson.amount;
          localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips));
        }
        if (item.action === 'saveExcavatorLog' && typeof resJson.amount === 'number') {
          const log = this.excavatorLogs.find(l => l.id === item.payload.id);
          if (log) log.amount = resJson.amount;
          localStorage.setItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS, JSON.stringify(this.excavatorLogs));
        }
        this.pendingSyncQueue.shift();
        this.lastSyncAt = new Date().toISOString();
        localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
      }
    } catch (e) {
      const item = this.pendingSyncQueue[0];
      if (item) {
        item.lastError = e.name === 'AbortError' ? 'หมดเวลารอระบบกลาง' : e.message;
        localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
      }
      this.cloudStatus = navigator.onLine ? 'error' : 'offline';
      this.lastSyncError = item ? item.lastError : e.message;
      console.warn("Cloud sync error; queue retained:", this.lastSyncError);
    } finally {
      this.isSyncing = false;
      this.notify();
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
  // Master Data CRUD Actions
  // -------------------------------------------------------------
  addOrUpdateTruck(truck) {
    if (!this.masterData.trucks) this.masterData.trucks = [];
    const idx = this.masterData.trucks.findIndex(t => t.id === truck.id);
    if (idx >= 0) {
      this.masterData.trucks[idx] = { ...this.masterData.trucks[idx], ...truck };
    } else {
      this.masterData.trucks.push(truck);
    }
    this.saveMasterData();
  }

  deleteTruck(truckId) {
    if (!this.masterData.trucks) return;
    this.masterData.trucks = this.masterData.trucks.filter(t => t.id !== truckId);
    this.saveMasterData();
  }

  addOrUpdateExcavator(exc) {
    if (!this.masterData.excavators) this.masterData.excavators = [];
    const idx = this.masterData.excavators.findIndex(e => e.id === exc.id);
    if (idx >= 0) {
      this.masterData.excavators[idx] = { ...this.masterData.excavators[idx], ...exc };
    } else {
      this.masterData.excavators.push(exc);
    }
    this.saveMasterData();
  }

  deleteExcavator(excId) {
    if (!this.masterData.excavators) return;
    this.masterData.excavators = this.masterData.excavators.filter(e => e.id !== excId);
    this.saveMasterData();
  }

  addOrUpdateJobRate(rate) {
    if (!this.masterData.job_rates) this.masterData.job_rates = [];
    const idx = this.masterData.job_rates.findIndex(r => r.id === rate.id);
    if (idx >= 0) {
      this.masterData.job_rates[idx] = { ...this.masterData.job_rates[idx], ...rate };
    } else {
      this.masterData.job_rates.push(rate);
    }
    this.saveMasterData();
  }

  deleteJobRate(rateId) {
    if (!this.masterData.job_rates) return;
    this.masterData.job_rates = this.masterData.job_rates.filter(r => r.id !== rateId);
    this.saveMasterData();
  }

  addOrUpdateDriver(driver) {
    if (!this.masterData.drivers) this.masterData.drivers = [];
    const idx = this.masterData.drivers.findIndex(d => d.id === driver.id);
    if (idx >= 0) {
      this.masterData.drivers[idx] = { ...this.masterData.drivers[idx], ...driver };
    } else {
      this.masterData.drivers.push(driver);
    }
    this.saveMasterData();
  }

  deleteDriver(driverId) {
    if (!this.masterData.drivers) return;
    this.masterData.drivers = this.masterData.drivers.filter(d => d.id !== driverId);
    this.saveMasterData();
  }

  // รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นจากไฟล์ Excel
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

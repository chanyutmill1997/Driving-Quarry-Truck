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
    this.trips = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TRIPS) || '[]');
    this.excavatorLogs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EXCAVATOR_LOGS) || '[]');
    this.pendingSyncQueue = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_SYNC) || '[]');

    // 3. เริ่มระบบ Auto Sync เบื้องหลัง
    setInterval(() => this.processSyncQueue(), CONFIG.AUTO_SYNC_INTERVAL_MS);
    this.notify();
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

    if (capacityTon >= 60) return job.rate_60_ton || 0;
    if (capacityTon >= 45) return job.rate_45_ton || 0;
    return job.rate_30_ton || 0;
  }

  // -------------------------------------------------------------
  // Truck Trips Methods
  // -------------------------------------------------------------
  saveTrip(tripData) {
    const existingIndex = this.trips.findIndex(t => t.id === tripData.id);
    if (existingIndex >= 0) {
      this.trips[existingIndex] = { ...this.trips[existingIndex], ...tripData };
    } else {
      this.trips.unshift(tripData);
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.TRIPS, JSON.stringify(this.trips));
    
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
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
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

        const resp = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(bodyData)
        });

        const resJson = await resp.json();
        if (resJson && resJson.status === 'success') {
          // ซิงค์สำเร็จ นำออกจากคิว
          this.pendingSyncQueue.shift();
          localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(this.pendingSyncQueue));
        } else {
          console.warn("Sync failed for item, will retry later:", resJson);
          break;
        }
      }
    } catch (e) {
      console.warn("Cloud sync network error, queue kept for offline retry:", e);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
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

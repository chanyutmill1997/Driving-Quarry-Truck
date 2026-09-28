/**
 * โมดูลยืนยันตัวตนและการจัดการสิทธิ์ (Authentication & Role Management)
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentShift = null;
    this.workMode = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_WORK_MODE) || null;
    this.loadSession();
  }

  loadSession() {
    try {
      const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
      if (userJson) this.currentUser = JSON.parse(userJson);

      const shiftJson = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT);
      if (shiftJson) this.currentShift = JSON.parse(shiftJson);
    } catch (e) {
      console.error("Auth session load error", e);
    }
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  getRole() {
    return this.currentUser ? this.currentUser.role : null;
  }

  getShift() {
    return this.currentShift;
  }

  // เข้าสู่ระบบด้วย เบอร์โทร/ชื่อ และ PIN
  async login(identifier, pin, selectedRole = 'driver') {
    try {
      const result = await window.quarryStore.apiRequest({ action: 'login', identifier, pin }, 30000);
      this.currentUser = result.user;
      const actualRole = this.currentUser.role;
      const roleMatches = selectedRole === 'driver'
        ? ['truck_driver', 'excavator_operator'].includes(actualRole)
        : actualRole === selectedRole;
      if (!roleMatches) {
        this.currentUser = null;
        return { success: false, message: 'บัญชีนี้ไม่ตรงกับประเภทผู้ใช้งานที่เลือก' };
      }
      this.workMode = selectedRole === 'driver' ? null : actualRole;
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_WORK_MODE);
      localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    } catch (error) {
      return { success: false, message: error.message || 'เข้าสู่ระบบไม่สำเร็จ' };
    }
  }

  getWorkMode() { return this.workMode; }

  selectWorkMode(mode) {
    if (!['truck_driver', 'excavator_operator'].includes(mode)) return false;
    this.workMode = mode;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_WORK_MODE, mode);
    return true;
  }

  // Quick Login สำหรับทดสอบหน้างาน
  quickLoginAs(role) {
    const drivers = window.quarryStore.getDrivers();
    let target = null;
    if (role === 'admin') {
      target = drivers.find(d => d.role === 'admin') || { id: 'ADMIN_1', name: 'ผู้บริหารโรงโม่', role: 'admin' };
    } else if (role === 'supervisor') {
      target = drivers.find(d => d.role === 'supervisor') || { id: 'SUP_1', name: 'หัวหน้างานหน้างาน', role: 'supervisor' };
    } else if (role === 'excavator_operator') {
      target = drivers.find(d => d.role === 'excavator_operator') || drivers[drivers.length - 2];
    } else {
      // truck driver
      target = drivers.find(d => d.role === 'truck_driver') || drivers[0];
    }

    this.currentUser = target;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  // เปิดกะประจำวัน (เลือกรถที่ขับในวันนั้น)
  startShift(vehicleCode, capacityTon = 30) {
    this.currentShift = {
      shiftId: 'SHIFT_' + Date.now(),
      driverId: this.currentUser.id,
      driverName: this.currentUser.name,
      driverPhone: this.currentUser.phone,
      vehicleCode: vehicleCode,
      capacityTon: capacityTon,
      startedAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(this.currentShift));
    window.quarryStore.queueSync('startShift', {
      ...this.currentShift,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      role: this.currentUser.role,
      appVersion: CONFIG.VERSION
    });
    return this.currentShift;
  }

  // ปิดกะประจำวัน
  endShift() {
    if (this.currentShift) {
      window.quarryStore.queueSync('endShift', {
        shiftId: this.currentShift.shiftId,
        driverName: this.currentUser ? this.currentUser.name : this.currentShift.driverName,
        endedAt: new Date().toISOString(),
        appVersion: CONFIG.VERSION
      });
    }
    this.currentShift = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT);
  }

  logout() {
    this.currentUser = null;
    this.currentShift = null;
    this.workMode = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_WORK_MODE);
  }
}

window.authService = new AuthService();

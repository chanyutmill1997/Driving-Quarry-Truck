/**
 * โมดูลยืนยันตัวตนและการจัดการสิทธิ์ (Authentication & Role Management)
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentShift = null;
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
  login(identifier, pin) {
    const drivers = window.quarryStore.getDrivers();
    const cleanId = (identifier || '').trim().replace(/[-\s]/g, '');

    // ค้นหาผู้ใช้จากเบอร์โทร หรือ ID หรือชื่อ
    const user = drivers.find(d => {
      const p = (d.phone || '').replace(/[-\s]/g, '');
      return p === cleanId || d.id === identifier || d.name.includes(identifier) || d.nickname === identifier;
    });

    if (!user) {
      return { success: false, message: "ไม่พบข้อมูลพนักงานในระบบ (กรุณาตรวจสอบเบอร์โทรหรือชื่อ)" };
    }

    // ตรวจสอบ PIN (ถ้ามีกำหนดไว้)
    const expectedPin = user.pin || "1234";
    if (pin && pin !== expectedPin && pin !== "9999") {
      return { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
    }

    this.currentUser = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    return { success: true, user: this.currentUser };
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
    return this.currentShift;
  }

  // ปิดกะประจำวัน
  endShift() {
    this.currentShift = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT);
  }

  logout() {
    this.currentUser = null;
    this.currentShift = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT);
  }
}

window.authService = new AuthService();

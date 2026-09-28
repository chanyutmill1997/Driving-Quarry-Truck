/**
 * หน้าจอเข้าสู่ระบบและเลือกสิทธิ์ (Login & Role Selection Component)
 */
class LoginView {
  render() {
    const drivers = window.quarryStore.getDrivers();
    const truckDrivers = drivers.filter(d => d.role === 'truck_driver');
    const excOperators = drivers.filter(d => d.role === 'excavator_operator');

    return `
      <div class="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-slate-950 text-center relative">
            <div class="inline-flex p-3 bg-slate-950/10 rounded-2xl mb-2">
              <i data-lucide="truck" class="w-10 h-10 text-slate-950"></i>
            </div>
            <h1 class="text-2xl font-black tracking-tight">ระบบบริหารงานโรงโม่</h1>
            <p class="text-sm font-medium text-slate-900/80 mt-1">บันทึกรอบวิ่ง • พิกัด GPS • คำนวณเที่ยวสะสม</p>
          </div>

          <!-- Content Body -->
          <div class="p-6 space-y-6">
            
            <!-- Tab เลือกประเภทการล็อกอิน -->
            <div class="flex border-b border-slate-700 pb-2">
              <button onclick="loginView.setTab('quick')" id="tab-quick-btn" class="flex-1 py-2 text-center font-bold text-amber-400 border-b-2 border-amber-400">
                🚀 เข้าด่วน (เลือกชื่อ)
              </button>
              <button onclick="loginView.setTab('phone')" id="tab-phone-btn" class="flex-1 py-2 text-center font-bold text-slate-400 hover:text-slate-200">
                📱 เบอร์โทร / PIN
              </button>
            </div>

            <!-- Panel 1: Quick Select Login -->
            <div id="quick-login-panel" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. เลือกคนขับ / ผู้ใช้งาน
                </label>
                <select id="quick-driver-select" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  <optgroup label="🚚 คนขับรถบรรทุก (สิบล้อ)">
                    ${truckDrivers.map(d => `<option value="${d.id}">🚚 ${d.nickname ? '[' + d.nickname + '] ' : ''}${d.name} (${d.assigned_vehicle || 'รถสิบล้อ'})</option>`).join('')}
                  </optgroup>
                  <optgroup label="🚜 คนขับรถขุด / แม็คโคร">
                    ${excOperators.map(d => `<option value="${d.id}">🚜 ${d.nickname ? '[' + d.nickname + '] ' : ''}${d.name} (${d.assigned_vehicle || 'แม็คโคร'})</option>`).join('')}
                  </optgroup>
                  <optgroup label="💼 ผู้บริหาร / หัวหน้างาน">
                    <option value="SUP_1">📋 หัวหน้างานหน้างาน (Supervisor)</option>
                    <option value="ADMIN_1">💼 ผู้บริหารโรงโม่ (Admin/Owner)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  2. รหัส PIN (ค่าเริ่มต้น: 1234 หรือ 9999)
                </label>
                <input type="password" id="quick-pin-input" value="1234" maxlength="4" placeholder="1234" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>

              <button onclick="loginView.handleQuickLogin()" class="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 text-lg font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                <i data-lucide="log-in" class="w-5 h-5"></i>
                เข้าสู่ระบบทันที
              </button>
            </div>

            <!-- Panel 2: Phone Login -->
            <div id="phone-login-panel" class="space-y-4 hidden">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  เบอร์โทรศัพท์มือถือ
                </label>
                <input type="tel" id="phone-input" placeholder="เช่น 065-6348605" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  รหัส PIN 4 หลัก
                </label>
                <input type="password" id="phone-pin-input" maxlength="4" placeholder="1234" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>
              <button onclick="loginView.handlePhoneLogin()" class="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-lg font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                <i data-lucide="log-in" class="w-5 h-5"></i>
                เข้าสู่ระบบ
              </button>
            </div>

            <!-- Fast Role Switcher Buttons for Demo -->
            <div class="pt-4 border-t border-slate-700/80">
              <p class="text-xs text-slate-400 text-center mb-3 font-semibold">⚡ ปุ่มทดสอบสิทธิ์ด่วน (Fast Role Switch):</p>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="loginView.quickRole('truck_driver')" class="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition">
                  🚚 คนขับรถสิบล้อ
                </button>
                <button onclick="loginView.quickRole('excavator_operator')" class="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition">
                  🚜 คนขับแม็คโคร
                </button>
                <button onclick="loginView.quickRole('supervisor')" class="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition">
                  📋 หัวหน้างาน
                </button>
                <button onclick="loginView.quickRole('admin')" class="p-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 transition">
                  💼 ผู้บริหาร (Admin)
                </button>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="bg-slate-950 p-4 text-center border-t border-slate-800">
            <p class="text-xs text-slate-500">ข้อมูลเชื่อมต่อ Google Sheets & Google Drive อัตโนมัติ</p>
          </div>

        </div>
      </div>
    `;
  }

  setTab(tab) {
    const qPanel = document.getElementById('quick-login-panel');
    const pPanel = document.getElementById('phone-login-panel');
    const qBtn = document.getElementById('tab-quick-btn');
    const pBtn = document.getElementById('tab-phone-btn');

    if (tab === 'quick') {
      qPanel.classList.remove('hidden');
      pPanel.classList.add('hidden');
      qBtn.className = "flex-1 py-2 text-center font-bold text-amber-400 border-b-2 border-amber-400";
      pBtn.className = "flex-1 py-2 text-center font-bold text-slate-400 hover:text-slate-200";
    } else {
      qPanel.classList.add('hidden');
      pPanel.classList.remove('hidden');
      pBtn.className = "flex-1 py-2 text-center font-bold text-amber-400 border-b-2 border-amber-400";
      qBtn.className = "flex-1 py-2 text-center font-bold text-slate-400 hover:text-slate-200";
    }
  }

  handleQuickLogin() {
    const driverId = document.getElementById('quick-driver-select').value;
    const pin = document.getElementById('quick-pin-input').value;
    const res = window.authService.login(driverId, pin);
    if (res.success) {
      window.app.route();
    } else {
      alert(res.message);
    }
  }

  handlePhoneLogin() {
    const phone = document.getElementById('phone-input').value;
    const pin = document.getElementById('phone-pin-input').value;
    const res = window.authService.login(phone, pin);
    if (res.success) {
      window.app.route();
    } else {
      alert(res.message);
    }
  }

  quickRole(role) {
    window.authService.quickLoginAs(role);
    window.app.route();
  }
}

window.loginView = new LoginView();

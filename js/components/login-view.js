/**
 * หน้าเข้าสู่ระบบและลงทะเบียนพนักงานขับรถใหม่ (Login & Driver Self-Registration View)
 * - รองรับการเข้าสู่ระบบด้วย เบอร์โทรศัพท์ + รหัส PIN (กำหนดเองได้)
 * - รองรับระบบลงทะเบียนสำหรับพนักงานขับรถใหม่ (New Driver Registration)
 */
class LoginView {
  constructor() {
    this.selectedRole = 'driver';
    this.mode = 'login'; // 'login' or 'register'
    this.showPin = false;
  }

  render() {
    if (this.mode === 'register') {
      return this.renderRegisterForm();
    }
    return this.renderLoginForm();
  }

  renderLoginForm() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden glass-card">
          
          <!-- Hero Banner with Real Quarry Plant & Official Branding -->
          <div class="relative overflow-hidden border-b border-slate-800">
            <!-- Plant Image Backdrop -->
            <div class="h-44 w-full bg-slate-950 relative overflow-hidden">
              <img src="assets/quarry_plant.png" alt="โรงโม่หิน ป.ศรีวิไลลักษณ์" class="w-full h-full object-cover opacity-60">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"></div>
            </div>

            <!-- Floating Theme Switcher Button -->
            <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง/มืด" class="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md rounded-xl text-slate-200 font-bold text-xs border border-white/10 transition z-10">
              ${window.app && window.app.theme === 'dark' ? '☀️ สว่าง' : '🌙 มืด'}
            </button>

            <!-- Company Sign Badge (Like Signboard on Silo) -->
            <div class="absolute inset-x-4 bottom-3 text-center">
              <div class="inline-flex items-center gap-2.5 px-3 py-1 bg-emerald-900/90 border border-emerald-500/40 rounded-xl text-emerald-100 text-xs font-bold backdrop-blur-md shadow-lg mb-1.5">
                <span>🏔️</span>
                <span>โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)</span>
              </div>
              <h1 class="text-sm font-bold text-white tracking-wide drop-shadow-md">
                บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด
              </h1>
              <p class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                CHANYUTH MILL (1997) CO., LTD. • FLEET SYSTEM
              </p>
            </div>
          </div>

          <!-- Login Form Content -->
          <div class="p-6 space-y-5">
            
            <!-- 1. Role Selector -->
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">1. เลือกประเภทผู้ใช้งาน</p>
              <div class="grid grid-cols-3 gap-2" id="role-buttons">
                ${this.roleButton('driver', '🚚', 'พนักงานขับรถ')}
                ${this.roleButton('supervisor', '📋', 'หัวหน้างาน')}
                ${this.roleButton('admin', '💼', 'ผู้บริหาร')}
              </div>
            </div>

            <!-- 2. Identifier (Phone or ID) -->
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. เบอร์โทรศัพท์ หรือ รหัสผู้ใช้</label>
              <div class="relative">
                <input type="text" id="login-identifier" autocomplete="username" inputmode="tel" placeholder="เช่น 0656348605" class="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-white text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <div class="absolute right-3.5 top-3.5 text-slate-500">
                  <i data-lucide="phone" class="w-5 h-5"></i>
                </div>
              </div>
              <p id="login-account-hint" class="mt-2 text-xs text-blue-400 font-medium">ใช้เบอร์โทรศัพท์ 10 หลัก หรือรหัสพนักงานของตนเอง</p>
            </div>

            <!-- 3. PIN Code -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">3. รหัส PIN (4-6 หลัก)</label>
                <button type="button" onclick="loginView.togglePinVisibility()" class="text-xs text-blue-400 hover:text-blue-300 font-bold">
                  ${this.showPin ? 'ซ่อน PIN' : 'แสดง PIN'}
                </button>
              </div>
              <div class="relative">
                <input type="${this.showPin ? 'text' : 'password'}" id="login-pin" maxlength="6" inputmode="numeric" autocomplete="current-password" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-2xl font-black tracking-widest text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" onkeydown="if(event.key==='Enter') loginView.handleLogin()">
              </div>
              <p class="mt-1 text-[11px] text-slate-500 text-center">รหัสเริ่มต้นสำหรับคนขับเดิมคือ <span class="font-mono font-bold text-slate-300">1234</span></p>
            </div>

            <!-- Submit Button -->
            <button id="login-button" onclick="loginView.handleLogin()" class="w-full py-4 bg-blue-500 hover:bg-blue-400 text-slate-950 text-base font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
              <i data-lucide="log-in" class="w-5 h-5"></i> เข้าสู่ระบบ
            </button>
            
            <p id="login-error" class="hidden text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-2xl p-3"></p>

            <!-- Register New Driver Action Button -->
            <div class="pt-2 border-t border-slate-800 text-center">
              <p class="text-xs text-slate-400 mb-2.5">เป็นพนักงานขับรถใหม่ที่ยังไม่มีชื่อในระบบ?</p>
              <button onclick="loginView.showRegisterForm()" class="w-full py-3 bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-800/80 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                ลงทะเบียนพนักงานขับรถใหม่ (กดที่นี่)
              </button>
            </div>

          </div>

          <div class="bg-slate-950 p-3.5 text-center border-t border-slate-800">
            <p class="text-[11px] text-slate-500">เวอร์ชัน ${CONFIG.VERSION} | ระบบฐานข้อมูล Supabase PostgreSQL</p>
          </div>
        </div>
      </div>`;
  }

  // แบบฟอร์มลงทะเบียนพนักงานขับรถใหม่
  renderRegisterForm() {
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();

    return `
      <div class="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          
          <!-- Header Bar with Company Logo -->
          <div class="bg-gradient-to-r from-slate-900 to-slate-950 p-6 text-slate-100 text-center relative border-b border-slate-800">
            <button onclick="loginView.showLoginForm()" class="absolute top-4 left-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold text-xs transition flex items-center gap-1 border border-slate-700">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> กลับ
            </button>
            <div class="inline-flex p-2 bg-white rounded-2xl mb-2 shadow-lg border border-slate-700">
              <img src="assets/logo.png" alt="CHANYUTH MILL" class="w-12 h-12 object-contain rounded-xl">
            </div>
            <h1 class="text-lg font-black text-white">ลงทะเบียนพนักงานขับรถใหม่</h1>
            <p class="text-xs text-emerald-400 font-bold mt-0.5">โรงโม่หิน ป.ศรีวิไลลักษณ์ • บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด</p>
          </div>

          <!-- Registration Form -->
          <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">ชื่อ-นามสกุลจริง <span class="text-red-400">*</span></label>
              <input type="text" id="reg-name" placeholder="เช่น นาย สมศักดิ์ มีสุข" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">ชื่อเล่น</label>
                <input type="text" id="reg-nickname" placeholder="เช่น ศักดิ์" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">เบอร์โทรศัพท์ <span class="text-red-400">*</span></label>
                <input type="tel" id="reg-phone" maxlength="10" placeholder="08xxxxxxxx" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">ประเภทการปฏิบัติงาน <span class="text-red-400">*</span></label>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500">
                  <input type="radio" name="reg-role" value="truck_driver" checked class="accent-emerald-500" onchange="loginView.handleRoleChange('truck_driver')">
                  <span class="text-xs font-bold text-white">🚚 ขับรถสิบล้อ</span>
                </label>
                <label class="flex items-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500">
                  <input type="radio" name="reg-role" value="excavator_operator" class="accent-emerald-500" onchange="loginView.handleRoleChange('excavator_operator')">
                  <span class="text-xs font-bold text-white">🚜 ขับรถแม็คโคร</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">เบอร์รถประจำ (ถ้ามี)</label>
              <select id="reg-vehicle" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">-- ยังไม่มีรถประจำ (เลือกหน้างานทุกวัน) --</option>
                <optgroup label="รถบรรทุกสิบล้อ" id="reg-trucks-group">
                  ${trucks.map(t => `<option value="${t.code}">${t.code} (${t.capacity_ton} ตัน)</option>`).join('')}
                </optgroup>
                <optgroup label="รถขุด/แม็คโคร" id="reg-excs-group">
                  ${excavators.map(e => `<option value="${e.code}">${e.code}</option>`).join('')}
                </optgroup>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">ตั้งรหัส PIN (4 หลัก) <span class="text-red-400">*</span></label>
                <input type="password" id="reg-pin" maxlength="6" inputmode="numeric" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">ยืนยันรหัส PIN <span class="text-red-400">*</span></label>
                <input type="password" id="reg-pin-confirm" maxlength="6" inputmode="numeric" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
            </div>

            <p id="reg-error" class="hidden text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-xl p-3"></p>

            <button id="reg-button" onclick="loginView.handleRegister()" class="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-base font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
              <i data-lucide="check" class="w-5 h-5"></i> ยืนยันการลงทะเบียนและเริ่มงาน
            </button>

            <button onclick="loginView.showLoginForm()" class="w-full py-2.5 text-slate-400 hover:text-white text-xs font-bold">
              มีบัญชีอยู่แล้ว? กลับไปหน้าเข้าสู่ระบบ
            </button>

          </div>
        </div>
      </div>
    `;
  }

  roleButton(role, icon, label) {
    const active = this.selectedRole === role;
    return `<button data-role="${role}" onclick="loginView.selectRole('${role}')" class="role-button min-h-20 p-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center ${active ? 'bg-blue-500 border-blue-400 text-slate-950 shadow-md font-black' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}"><span class="block text-2xl mb-1">${icon}</span>${label}</button>`;
  }

  selectRole(role) {
    this.selectedRole = role;
    document.querySelectorAll('.role-button').forEach(button => {
      const active = button.dataset.role === role;
      button.className = `role-button min-h-20 p-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center ${active ? 'bg-blue-500 border-blue-400 text-slate-950 shadow-md font-black' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`;
    });
    document.getElementById('login-error')?.classList.add('hidden');
    const identifier = document.getElementById('login-identifier');
    const hint = document.getElementById('login-account-hint');
    if (role === 'supervisor') {
      if (!identifier.value || identifier.value === 'ADMIN_1') identifier.value = 'SUP_1';
      hint.textContent = 'บัญชีหัวหน้างาน: SUP_1 หรือเบอร์โทรหัวหน้างาน';
    } else if (role === 'admin') {
      if (!identifier.value || identifier.value === 'SUP_1') identifier.value = 'ADMIN_1';
      hint.textContent = 'บัญชีผู้บริหาร: ADMIN_1 หรือเบอร์โทรผู้ดูแลระบบ';
    } else {
      if (identifier.value === 'SUP_1' || identifier.value === 'ADMIN_1') identifier.value = '';
      hint.textContent = 'ใช้เบอร์โทรศัพท์ 10 หลักหรือรหัสพนักงานของตนเอง';
    }
  }

  togglePinVisibility() {
    this.showPin = !this.showPin;
    const pinInput = document.getElementById('login-pin');
    if (pinInput) {
      pinInput.type = this.showPin ? 'text' : 'password';
    }
  }

  showRegisterForm() {
    this.mode = 'register';
    window.app.render();
  }

  showLoginForm() {
    this.mode = 'login';
    window.app.render();
  }

  handleRoleChange(role) {
    const truckGroup = document.getElementById('reg-trucks-group');
    const excGroup = document.getElementById('reg-excs-group');
    if (truckGroup && excGroup) {
      if (role === 'truck_driver') {
        truckGroup.style.display = '';
        excGroup.style.display = 'none';
      } else {
        truckGroup.style.display = 'none';
        excGroup.style.display = '';
      }
    }
  }

  async handleLogin() {
    const typedIdentifier = document.getElementById('login-identifier')?.value.trim();
    const identifier = typedIdentifier || (this.selectedRole === 'supervisor' ? 'SUP_1' : (this.selectedRole === 'admin' ? 'ADMIN_1' : ''));
    const pin = document.getElementById('login-pin')?.value.trim();
    const errorBox = document.getElementById('login-error');

    if (!identifier || !pin) {
      return this.showError('กรุณากรอกเบอร์โทรศัพท์หรือรหัสพนักงาน และรหัส PIN');
    }

    this.setBusy(true);
    const result = await window.authService.login(identifier, pin, this.selectedRole);
    this.setBusy(false);

    if (!result.success) {
      return this.showError(result.message);
    }

    errorBox?.classList.add('hidden');
    window.app.route();
  }

  async handleRegister() {
    const name = document.getElementById('reg-name')?.value.trim();
    const nickname = document.getElementById('reg-nickname')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const roleEl = document.querySelector('input[name="reg-role"]:checked');
    const role = roleEl ? roleEl.value : 'truck_driver';
    const vehicle = document.getElementById('reg-vehicle')?.value;
    const pin = document.getElementById('reg-pin')?.value.trim();
    const pinConfirm = document.getElementById('reg-pin-confirm')?.value.trim();
    const errorBox = document.getElementById('reg-error');

    if (!name) return this.showRegError('กรุณาระบุชื่อ-นามสกุลจริง');
    if (!phone || phone.length < 9) return this.showRegError('กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (9-10 หลัก)');
    if (!pin || pin.length < 4) return this.showRegError('กรุณากำหนดรหัส PIN อย่างน้อย 4 หลัก');
    if (pin !== pinConfirm) return this.showRegError('รหัส PIN และการยืนยัน PIN ไม่ตรงกัน');

    const regBtn = document.getElementById('reg-button');
    if (regBtn) {
      regBtn.disabled = true;
      regBtn.innerHTML = '<span class="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span> กำลังบันทึกข้อมูล...';
    }

    const result = await window.authService.registerDriver({
      name,
      nickname,
      phone,
      role,
      assigned_vehicle: vehicle,
      pin
    });

    if (!result.success) {
      if (regBtn) {
        regBtn.disabled = false;
        regBtn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> ยืนยันการลงทะเบียนและเริ่มงาน';
        if (window.lucide) lucide.createIcons();
      }
      return this.showRegError(result.message);
    }

    alert(`🎉 ลงทะเบียนสำเร็จ! ยินดีต้อนรับ ${nickname || name} เข้าสู่ระบบโรงโม่`);
    this.mode = 'login';
    window.app.route();
  }

  showError(message) {
    const box = document.getElementById('login-error');
    if (box) {
      box.textContent = message;
      box.classList.remove('hidden');
    }
  }

  showRegError(message) {
    const box = document.getElementById('reg-error');
    if (box) {
      box.textContent = message;
      box.classList.remove('hidden');
    }
  }

  setBusy(busy) {
    const button = document.getElementById('login-button');
    if (button) {
      button.disabled = busy;
      button.classList.toggle('opacity-60', busy);
      button.innerHTML = busy 
        ? '<span class="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span> กำลังตรวจสอบ...' 
        : '<i data-lucide="log-in" class="w-5 h-5"></i> เข้าสู่ระบบ';
      if (window.lucide) lucide.createIcons();
    }
  }
}

window.loginView = new LoginView();

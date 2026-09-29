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
      <div class="login-page min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div class="login-shell max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden glass-card">
          
          <!-- Hero Banner with Real Quarry Plant & Official Branding -->
          <div class="login-hero relative overflow-hidden border-b border-slate-800">
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
            <div class="absolute inset-x-4 bottom-3 text-center hero-branding">
              <div class="inline-flex items-center gap-2.5 px-3 py-1 bg-emerald-900/90 border border-emerald-500/40 rounded-xl text-emerald-100 text-xs font-bold backdrop-blur-md shadow-lg mb-1.5">
                <span>🏔️</span>
                <span class="text-emerald-100">โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)</span>
              </div>
              <h1 class="text-sm font-bold text-white tracking-wide drop-shadow-md">
                บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด
              </h1>
              <p class="text-[10px] text-blue-300 font-bold uppercase tracking-wider mt-0.5">
                CHANYUTH MILL (1997) CO., LTD. • FLEET SYSTEM
              </p>
            </div>
          </div>

          <!-- Login Form Content -->
          <div class="login-panel p-6 space-y-5">
            <div class="login-welcome">
              <p class="text-[11px] font-black text-blue-400 tracking-[0.16em] uppercase">Secure Operations Portal</p>
              <h2 class="text-xl font-black text-white mt-1">เข้าสู่ระบบบริหารงานโรงโม่</h2>
              <p class="text-sm text-slate-400 mt-1">เลือกบทบาทและยืนยันตัวตนเพื่อเริ่มปฏิบัติงาน</p>
            </div>
            
            <!-- 1. Role Selector -->
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">1. เลือกประเภทผู้ใช้งาน</p>
              <div class="grid grid-cols-3 gap-2" id="role-buttons">
                ${this.roleButton('driver', 'truck', 'พนักงานขับรถ')}
                ${this.roleButton('supervisor', 'clipboard-list', 'หัวหน้างาน')}
                ${this.roleButton('admin', 'briefcase-business', 'ผู้บริหาร')}
              </div>
            </div>

            <!-- 2. Identifier (Phone or ID) -->
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. เบอร์โทรศัพท์ หรือ รหัสผู้ใช้</label>
              <div class="relative">
                <input type="text" id="login-identifier" autocomplete="username" inputmode="tel" placeholder="เช่น 0656348605" class="field-control w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-white text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
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
                <input type="${this.showPin ? 'text' : 'password'}" id="login-pin" maxlength="6" inputmode="numeric" autocomplete="current-password" placeholder="••••" class="field-control w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-2xl font-black tracking-widest text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" onkeydown="if(event.key==='Enter') loginView.handleLogin()">
              </div>
              <p class="mt-1 text-[11px] text-slate-500 text-center">รหัสเริ่มต้นสำหรับคนขับเดิมคือ <span class="font-mono font-bold text-slate-300">1234</span></p>
            </div>

            <!-- Submit Button -->
            <button id="login-button" onclick="loginView.handleLogin()" class="primary-action w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-base font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
              <i data-lucide="log-in" class="w-5 h-5 text-white"></i> เข้าสู่ระบบ
            </button>
            
            <p id="login-error" class="hidden text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-2xl p-3"></p>

            <!-- Notice for New Drivers -->
            <div class="pt-3 border-t border-slate-800 text-center">
              <div class="notice-card p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs space-y-1">
                <p class="text-slate-300 font-bold flex items-center justify-center gap-1.5">
                  <i data-lucide="shield-alert" class="w-4 h-4 text-blue-400"></i>
                  สำหรับพนักงานขับรถใหม่
                </p>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  กรุณาติดต่อ <strong class="text-blue-400">หัวหน้างาน</strong> หรือ <strong class="text-white">ผู้บริหาร</strong> เพื่อลงทะเบียนเปิดบัญชีและกำหนดรหัส PIN ในระบบ
                </p>
              </div>
            </div>

          </div>

          <div class="login-footer bg-slate-950 p-3.5 text-center border-t border-slate-800">
            <p class="text-[11px] text-slate-500">เวอร์ชัน ${CONFIG.VERSION} | ระบบฐานข้อมูล Supabase PostgreSQL</p>
          </div>
        </div>
      </div>`;
  }

  roleButton(role, icon, label) {
    const active = this.selectedRole === role;
    return `<button data-role="${role}" onclick="loginView.selectRole('${role}')" class="role-button role-card min-h-20 p-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center ${active ? 'bg-blue-500 border-blue-400 text-slate-950 shadow-md font-black' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}"><i data-lucide="${icon}" class="w-6 h-6 mb-1.5"></i>${label}</button>`;
  }

  selectRole(role) {
    this.selectedRole = role;
    document.querySelectorAll('.role-button').forEach(button => {
      const active = button.dataset.role === role;
      button.className = `role-button role-card min-h-20 p-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center ${active ? 'bg-blue-500 border-blue-400 text-slate-950 shadow-md font-black' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`;
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

  showError(message) {
    const box = document.getElementById('login-error');
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

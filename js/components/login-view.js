/** หน้าเข้าสู่ระบบ: เลือกบทบาท แล้วใช้บัญชีส่วนตัว */
class LoginView {
  constructor() {
    this.selectedRole = 'driver';
  }

  render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-slate-950 text-center relative">
            <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง/มืด" class="absolute top-3 right-3 p-2 bg-slate-950/20 hover:bg-slate-950/30 rounded-xl text-slate-950 font-bold text-xs">
              ${window.app && window.app.theme === 'dark' ? '☀️ สว่าง' : '🌙 มืด'}
            </button>
            <div class="inline-flex p-3 bg-slate-950/10 rounded-2xl mb-2"><i data-lucide="truck" class="w-10 h-10"></i></div>
            <h1 class="text-2xl font-black">ระบบบริหารงานโรงโม่</h1>
            <p class="text-sm font-medium text-slate-900/80 mt-1">เข้าสู่ระบบด้วยบัญชีของตนเอง</p>
          </div>

          <div class="p-6 space-y-5">
            <div>
              <p class="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">1. เลือกประเภทผู้ใช้งาน</p>
              <div class="grid grid-cols-3 gap-2" id="role-buttons">
                ${this.roleButton('driver', '🚚', 'พนักงานขับรถ')}
                ${this.roleButton('supervisor', '📋', 'หัวหน้างาน')}
                ${this.roleButton('admin', '💼', 'ผู้บริหาร')}
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">2. เบอร์โทรหรือรหัสพนักงาน</label>
              <input type="text" id="login-identifier" autocomplete="username" placeholder="เช่น 0656348605" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <p id="login-account-hint" class="mt-2 text-xs text-blue-300">ใช้เบอร์โทร 10 หลักหรือรหัสพนักงานของตนเอง</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">3. รหัส PIN</label>
              <input type="password" id="login-pin" maxlength="4" inputmode="numeric" autocomplete="current-password" placeholder="••••" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" onkeydown="if(event.key==='Enter') loginView.handleLogin()">
            </div>

            <button id="login-button" onclick="loginView.handleLogin()" class="w-full py-4 bg-blue-500 hover:bg-blue-400 text-slate-950 text-lg font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
              <i data-lucide="log-in" class="w-5 h-5"></i> เข้าสู่ระบบ
            </button>
            <p id="login-error" class="hidden text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-xl p-3"></p>
          </div>

          <div class="bg-slate-950 p-4 text-center border-t border-slate-800">
            <p class="text-xs text-slate-500">หลังเข้าสู่ระบบ พนักงานขับรถจึงเลือกประเภทรถและหมายเลขรถ</p>
          </div>
        </div>
      </div>`;
  }

  roleButton(role, icon, label) {
    const active = this.selectedRole === role;
    return `<button data-role="${role}" onclick="loginView.selectRole('${role}')" class="role-button min-h-20 p-2 rounded-xl border text-xs font-bold transition ${active ? 'bg-blue-500 border-blue-400 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-300'}"><span class="block text-2xl mb-1">${icon}</span>${label}</button>`;
  }

  selectRole(role) {
    this.selectedRole = role;
    document.querySelectorAll('.role-button').forEach(button => {
      const active = button.dataset.role === role;
      button.className = `role-button min-h-20 p-2 rounded-xl border text-xs font-bold transition ${active ? 'bg-blue-500 border-blue-400 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-300'}`;
    });
    document.getElementById('login-error')?.classList.add('hidden');
    const identifier = document.getElementById('login-identifier');
    const hint = document.getElementById('login-account-hint');
    if (role === 'supervisor') {
      identifier.value = 'SUP_1';
      hint.textContent = 'บัญชีหัวหน้างาน: SUP_1';
    } else if (role === 'admin') {
      identifier.value = 'ADMIN_1';
      hint.textContent = 'บัญชีผู้บริหาร: ADMIN_1';
    } else {
      if (identifier.value === 'SUP_1' || identifier.value === 'ADMIN_1') identifier.value = '';
      hint.textContent = 'ใช้เบอร์โทร 10 หลักหรือรหัสพนักงานของตนเอง';
    }
  }

  async handleLogin() {
    const typedIdentifier = document.getElementById('login-identifier').value.trim();
    // มือถือบางรุ่นไม่คงค่าที่เติมด้วยสคริปต์ จึงกำหนดบัญชีตามบทบาทซ้ำตอนกดเข้าสู่ระบบ
    const identifier = typedIdentifier || (this.selectedRole === 'supervisor' ? 'SUP_1' : (this.selectedRole === 'admin' ? 'ADMIN_1' : ''));
    const pin = document.getElementById('login-pin').value;
    const errorBox = document.getElementById('login-error');
    if (!identifier || !pin) return this.showError('กรุณากรอกเบอร์โทรหรือรหัสพนักงาน และ PIN');
    this.setBusy(true);
    const result = await window.authService.login(identifier, pin, this.selectedRole);
    this.setBusy(false);
    if (!result.success) return this.showError(result.message);
    errorBox.classList.add('hidden');
    window.app.route();
  }

  showError(message) {
    const box = document.getElementById('login-error');
    box.textContent = message;
    box.classList.remove('hidden');
  }

  setBusy(busy) {
    const button = document.getElementById('login-button');
    button.disabled = busy;
    button.classList.toggle('opacity-60', busy);
    button.innerHTML = busy ? '<span class="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span> กำลังตรวจสอบ...' : '<i data-lucide="log-in" class="w-5 h-5"></i> เข้าสู่ระบบ';
    if (window.lucide) lucide.createIcons();
  }
}

window.loginView = new LoginView();

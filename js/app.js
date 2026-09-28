/**
 * ควบคุมการนำทางและแสดงผลหลักของแอปพลิเคชัน (Main App Controller)
 * รองรับ: ระบบสลับโหมดสว่าง/มืด (Light/Dark Theme)
 */
class QuarryApp {
  constructor() {
    this.currentView = 'dashboard'; // dashboard, reports, settings, ai-copilot
    this.theme = localStorage.getItem('quarry_theme') || 'dark';
    this.applyTheme();
  }

  applyTheme() {
    if (this.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('quarry_theme', this.theme);
    this.applyTheme();
    this.render();
  }

  async init() {
    this.applyTheme();
    await window.quarryStore.init();
    window.quarryStore.subscribe(() => this.render());
    this.route();
  }

  route() {
    this.applyTheme();
    if (!window.authService.isLoggedIn()) {
      this.renderLogin();
      return;
    }

    const role = window.authService.getRole();
    if (['truck_driver', 'excavator_operator'].includes(role) && !window.authService.getWorkMode()) {
      this.renderWorkModeSelection();
    } else if (window.authService.getWorkMode() === 'truck_driver') {
      this.renderDriver();
    } else if (window.authService.getWorkMode() === 'excavator_operator') {
      this.renderExcavator();
    } else {
      // Supervisor or Admin
      this.renderAdmin();
    }
  }

  renderWorkModeSelection() {
    const user = window.authService.getUser();
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div class="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs text-blue-400 font-bold">เลือกลักษณะงาน</span>
            <button onclick="window.app.toggleTheme()" class="px-3 py-1.5 bg-slate-800 text-xs rounded-xl text-slate-300 font-bold">
              ${this.theme === 'dark' ? '☀️ สว่าง' : '🌙 มืด'}
            </button>
          </div>
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">👤</div>
            <h1 class="text-xl font-black">สวัสดี ${user.nickname || user.name}</h1>
            <p class="text-sm text-slate-400 mt-1">วันนี้ปฏิบัติงานกับรถประเภทใด</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onclick="app.chooseWorkMode('truck_driver')" class="p-6 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-2xl font-black text-lg"><span class="block text-5xl mb-3">🚚</span>รถบรรทุก</button>
            <button onclick="app.chooseWorkMode('excavator_operator')" class="p-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-lg"><span class="block text-5xl mb-3">🚜</span>รถขุด / แม็คโคร</button>
          </div>
          <button onclick="app.logout()" class="w-full mt-5 py-3 text-slate-400 hover:text-white text-sm font-bold">ออกจากระบบ</button>
        </div>
      </div>`;
  }

  chooseWorkMode(mode) {
    window.authService.selectWorkMode(mode);
    this.route();
  }

  navigate(viewName) {
    this.currentView = viewName;
    this.render();
  }

  render() {
    this.route();
  }

  renderLogin() {
    const root = document.getElementById('app-root');
    if (root) {
      root.innerHTML = window.loginView.render();
      if (window.lucide) lucide.createIcons();
    }
  }

  renderDriver() {
    const root = document.getElementById('app-root');
    if (root) {
      root.innerHTML = window.driverView.render();
      if (window.lucide) lucide.createIcons();
    }
  }

  renderExcavator() {
    const root = document.getElementById('app-root');
    if (root) {
      root.innerHTML = window.excavatorView.render();
      if (window.lucide) lucide.createIcons();
    }
  }

  renderAdmin() {
    const user = window.authService.getUser();
    const root = document.getElementById('app-root');
    if (!root) return;

    let mainContent = '';
    if (this.currentView === 'reports') {
      mainContent = window.reportsView.render();
    } else if (this.currentView === 'settings') {
      mainContent = window.settingsView.render();
    } else if (this.currentView === 'ai-copilot') {
      mainContent = window.aiCopilotView.render();
    } else {
      mainContent = window.adminDashboard.render();
    }

    root.innerHTML = `
      <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        
        <!-- Top Navbar -->
        <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            
            <!-- Brand with Logo -->
            <div class="flex items-center gap-3 cursor-pointer" onclick="window.app.navigate('dashboard')">
              <div class="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow border border-slate-700">
                <img src="assets/logo.png" alt="CHANYUTH MILL" class="w-full h-full object-contain rounded-xl">
              </div>
              <div>
                <h1 class="font-black text-base text-white tracking-tight">โรงโม่ชาญยุทธ</h1>
                <p class="text-[11px] text-blue-400 font-semibold">ศูนย์ควบคุมกลาง (Executive Control Panel)</p>
              </div>
            </div>

            <!-- Nav Links -->
            <nav class="hidden md:flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button onclick="window.app.navigate('dashboard')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.currentView === 'dashboard' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                📊 แดชบอร์ดสด
              </button>
              <button onclick="window.app.navigate('ai-copilot')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.currentView === 'ai-copilot' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                🤖 AI ผู้ช่วย
              </button>
              <button onclick="window.app.navigate('reports')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.currentView === 'reports' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                📑 รายงาน & Excel
              </button>
              <button onclick="window.app.navigate('settings')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.currentView === 'settings' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                ⚙️ ตั้งค่าข้อมูลหลัก
              </button>
            </nav>

            <!-- User Status, Theme Switcher & Logout -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Change PIN Button -->
              <button onclick="window.app.openChangePinModal()" title="เปลี่ยนรหัส PIN ของฉัน" class="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-blue-400 transition text-xs font-bold flex items-center gap-1 border border-slate-700">
                <i data-lucide="key" class="w-4 h-4"></i>
                <span class="hidden sm:inline">PIN</span>
              </button>

              <!-- Theme Toggle Button -->
              <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง / โหมดมืด" class="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-xs font-bold flex items-center gap-1">
                <span>${this.theme === 'dark' ? '☀️' : '🌙'}</span>
                <span class="hidden sm:inline">${this.theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
              </button>

              <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-white">${user.name}</p>
                <span class="text-[10px] text-blue-400 font-semibold">${user.role === 'admin' ? 'ผู้บริหารสูงสุด' : 'หัวหน้างาน'}</span>
              </div>
              <button onclick="window.app.logout()" class="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition text-xs font-bold flex items-center gap-1.5">
                <i data-lucide="log-out" class="w-4 h-4"></i>
                <span class="hidden sm:inline">ออก</span>
              </button>
            </div>

          </div>
        </header>

        <!-- Main Body Container -->
        <main class="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1">
          ${mainContent}
        </main>

        <!-- Footer -->
        <footer class="border-t border-slate-800/80 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
          ${CONFIG.APP_NAME} • AI Insights & Cloud Fleet Management Engine
        </footer>

        <!-- Global Modal Container -->
        <div id="global-modal-container"></div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // -------------------------------------------------------------
  // ระบบเปลี่ยนรหัส PIN ด้วยตนเอง (Self-Service PIN Change)
  // -------------------------------------------------------------
  openChangePinModal() {
    const user = window.authService.getUser();
    if (!user) return;

    let container = document.getElementById('global-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-100">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <span class="p-1.5 bg-blue-500/20 text-blue-400 rounded-xl">🔑</span>
              เปลี่ยนรหัส PIN ของฉัน
            </h3>
            <button onclick="window.app.closeChangePinModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          </div>

          <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-black">
              👤
            </div>
            <div>
              <p class="font-bold text-sm text-white">${user.name} ${user.nickname ? `(${user.nickname})` : ''}</p>
              <p class="text-xs text-slate-400 font-mono">เบอร์โทร: ${user.phone || '-'}</p>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-300 mb-1">รหัส PIN ปัจจุบัน</label>
              <input type="password" id="chg-old-pin" maxlength="6" inputmode="numeric" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">รหัส PIN ใหม่ (4-6 หลัก)</label>
              <input type="password" id="chg-new-pin" maxlength="6" inputmode="numeric" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">ยืนยันรหัส PIN ใหม่</label>
              <input type="password" id="chg-confirm-pin" maxlength="6" inputmode="numeric" placeholder="••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>
          </div>

          <p id="chg-pin-error" class="hidden text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-xl p-2.5"></p>

          <div class="flex gap-2 pt-2 border-t border-slate-800">
            <button onclick="window.app.closeChangePinModal()" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
              ยกเลิก
            </button>
            <button onclick="window.app.handleSaveNewPin()" class="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition">
              บันทึกรหัสใหม่
            </button>
          </div>

        </div>
      </div>
    `;
  }

  closeChangePinModal() {
    const container = document.getElementById('global-modal-container');
    if (container) container.innerHTML = '';
  }

  async handleSaveNewPin() {
    const user = window.authService.getUser();
    if (!user) return;

    const oldPin = document.getElementById('chg-old-pin')?.value.trim();
    const newPin = document.getElementById('chg-new-pin')?.value.trim();
    const confirmPin = document.getElementById('chg-confirm-pin')?.value.trim();
    const errorBox = document.getElementById('chg-pin-error');

    if (!oldPin) {
      if (errorBox) { errorBox.textContent = 'กรุณากรอกรหัส PIN ปัจจุบัน'; errorBox.classList.remove('hidden'); }
      return;
    }
    if (!newPin || newPin.length < 4) {
      if (errorBox) { errorBox.textContent = 'รหัส PIN ใหม่ต้องมีอย่างน้อย 4 หลัก'; errorBox.classList.remove('hidden'); }
      return;
    }
    if (newPin !== confirmPin) {
      if (errorBox) { errorBox.textContent = 'รหัส PIN ใหม่และการยืนยันไม่ตรงกัน'; errorBox.classList.remove('hidden'); }
      return;
    }

    const res = await window.quarryStore.changeDriverPin(user.id, oldPin, newPin);
    if (!res.success) {
      if (errorBox) { errorBox.textContent = res.message; errorBox.classList.remove('hidden'); }
      return;
    }

    user.pin = newPin;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.closeChangePinModal();
    alert('🎉 เปลี่ยนรหัส PIN สำเร็จเรียบร้อยแล้ว! สามารถใช้รหัสใหม่นี้เข้าสู่ระบบได้ทันที');
  }

  logout() {
    window.authService.logout();
    this.currentView = 'dashboard';
    this.render();
  }
}

window.app = new QuarryApp();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

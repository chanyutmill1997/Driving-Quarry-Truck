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
      <div class="work-mode-page min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div class="work-mode-card max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
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
    if (this.currentView === 'trips') {
      mainContent = window.reportsView.renderTripsView();
    } else if (this.currentView === 'reconciliation') {
      mainContent = window.reportsView.renderReconciliationView();
    } else if (this.currentView === 'anomalies') {
      mainContent = window.reportsView.renderAnomaliesView();
    } else if (this.currentView === 'reports') {
      mainContent = window.reportsView.render();
    } else if (this.currentView === 'settings') {
      mainContent = window.settingsView.render();
    } else if (this.currentView === 'ai-copilot') {
      mainContent = window.aiCopilotView.render();
    } else {
      mainContent = window.adminDashboard.render();
    }

    root.innerHTML = `
      <div class="app-shell min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        
        <!-- Top Navbar -->
        <header class="app-header bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-3 sm:px-6 py-2 shadow-md">
          <div class="max-w-[1440px] mx-auto flex items-center justify-between gap-2.5 xl:gap-4">
            
            <!-- Brand with Logo -->
            <div class="app-brand flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0 group" onclick="window.app.navigate('dashboard')">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-700/60 group-hover:scale-105 transition transform">
                <img src="assets/logo.png" alt="CHANYUTH MILL" class="w-full h-full object-contain rounded-xl">
              </div>
              <div class="hidden sm:block">
                <h1 class="font-black text-xs sm:text-sm lg:text-base text-white tracking-tight flex items-center gap-1.5">
                  <span>โรงโม่หิน ป.ศรีวิไลลักษณ์</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">ป.ศรีฯ</span>
                </h1>
                <p class="text-[9px] sm:text-[11px] text-blue-400 font-medium truncate">บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด</p>
              </div>
            </div>

            <!-- Nav Links (Desktop) - Sleek Horizontal Pills with Zero Text Wrapping -->
            <nav class="app-nav hidden lg:flex items-center gap-1 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner shrink-0">
              <button onclick="window.app.navigate('dashboard')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'dashboard' ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="layout-dashboard" class="w-3.5 h-3.5 shrink-0"></i>
                <span>แดชบอร์ดสด</span>
              </button>
              <button onclick="window.app.navigate('trips')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'trips' ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="truck" class="w-3.5 h-3.5 shrink-0"></i>
                <span>ประวัติการวิ่ง</span>
              </button>
              <button onclick="window.app.navigate('reconciliation')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'reconciliation' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="scale" class="w-3.5 h-3.5 shrink-0"></i>
                <span>กระทบยอด</span>
              </button>
              <button onclick="window.app.navigate('anomalies')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'anomalies' ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 shrink-0"></i>
                <span>ความผิดปกติ</span>
              </button>
              <button onclick="window.app.navigate('reports')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'reports' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="file-chart-column" class="w-3.5 h-3.5 shrink-0"></i>
                <span>รายงาน & เบิกจ่าย</span>
              </button>
              <button onclick="window.app.navigate('ai-copilot')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'ai-copilot' ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-300 shrink-0"></i>
                <span>AI ผู้ช่วย</span>
              </button>
              <button onclick="window.app.navigate('settings')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.currentView === 'settings' ? 'bg-slate-700 text-white font-black shadow-md shadow-slate-700/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'}">
                <i data-lucide="settings-2" class="w-3.5 h-3.5 shrink-0"></i>
                <span>ตั้งค่า</span>
              </button>
            </nav>

            <!-- User Status, Theme Switcher & Logout -->
            <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <!-- Change PIN Button -->
              <button onclick="window.app.openChangePinModal()" title="เปลี่ยนรหัส PIN ของฉัน" class="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 rounded-xl text-blue-400 transition text-xs font-bold flex items-center gap-1 border border-slate-700">
                <i data-lucide="key" class="w-3.5 h-3.5"></i>
                <span>PIN</span>
              </button>

              <!-- Theme Toggle Button -->
              <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง / โหมดมืด" class="p-1.5 bg-slate-800/90 hover:bg-slate-700 rounded-xl text-slate-300 transition text-xs font-bold flex items-center gap-1 border border-slate-700">
                <span>${this.theme === 'dark' ? '☀️' : '🌙'}</span>
              </button>

              <div class="text-right hidden xl:block">
                <p class="text-xs font-bold text-white leading-tight truncate max-w-[150px]">${user.name}</p>
                <span class="text-[10px] text-blue-400 font-semibold">${user.role === 'admin' ? 'ผู้บริหารสูงสุด' : 'หัวหน้างาน'}</span>
              </div>
              <button onclick="window.app.logout()" class="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-rose-400 transition text-xs font-bold flex items-center gap-1 border border-slate-700">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                <span class="hidden sm:inline">ออก</span>
              </button>
            </div>

          </div>
        </header>

        <!-- Main Body Container -->
        <main class="app-main max-w-7xl w-full mx-auto p-3 md:p-6 flex-1">
          ${mainContent}
        </main>

        <!-- Mobile Nav (Bottom Bar) -->
        <nav class="mobile-nav lg:hidden" aria-label="เมนูหลักบนโทรศัพท์">
          <button onclick="window.app.navigate('dashboard')" class="${this.currentView === 'dashboard' ? 'active' : ''}"><i data-lucide="layout-dashboard"></i><small>แดชบอร์ด</small></button>
          <button onclick="window.app.navigate('trips')" class="${this.currentView === 'trips' ? 'active' : ''}"><i data-lucide="truck"></i><small>ประวัติวิ่ง</small></button>
          <button onclick="window.app.navigate('reconciliation')" class="${this.currentView === 'reconciliation' ? 'active' : ''}"><i data-lucide="scale"></i><small>กระทบยอด</small></button>
          <button onclick="window.app.navigate('anomalies')" class="${this.currentView === 'anomalies' ? 'active' : ''}"><i data-lucide="alert-triangle"></i><small>ผิดปกติ</small></button>
          <button onclick="window.app.navigate('reports')" class="${this.currentView === 'reports' ? 'active' : ''}"><i data-lucide="file-chart-column"></i><small>รายงาน</small></button>
          <button onclick="window.app.navigate('ai-copilot')" class="${this.currentView === 'ai-copilot' ? 'active' : ''}"><i data-lucide="sparkles"></i><small>AI</small></button>
          <button onclick="window.app.navigate('settings')" class="${this.currentView === 'settings' ? 'active' : ''}"><i data-lucide="settings-2"></i><small>ตั้งค่า</small></button>
        </nav>

        <!-- Footer -->
        <footer class="app-footer border-t border-slate-800/80 bg-slate-900/50 py-3 text-center text-[11px] text-slate-500">
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
              <input type="password" id="chg-old-pin" maxlength="6" inputmode="numeric" placeholder="••••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">รหัส PIN ใหม่ (6 หลัก)</label>
              <input type="password" id="chg-new-pin" maxlength="6" inputmode="numeric" placeholder="••••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">ยืนยันรหัส PIN ใหม่ (6 หลัก)</label>
              <input type="password" id="chg-confirm-pin" maxlength="6" inputmode="numeric" placeholder="••••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
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
    if (!newPin || newPin.length !== 6) {
      if (errorBox) { errorBox.textContent = 'รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลัก'; errorBox.classList.remove('hidden'); }
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

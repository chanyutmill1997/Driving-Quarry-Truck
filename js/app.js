/**
 * ควบคุมการนำทางและแสดงผลหลักของแอปพลิเคชัน (Main App Controller)
 */
class QuarryApp {
  constructor() {
    this.currentView = 'dashboard'; // dashboard, reports, settings, ai-copilot
  }

  async init() {
    await window.quarryStore.init();
    window.quarryStore.subscribe(() => this.render());
    this.route();
  }

  route() {
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
            
            <!-- Brand -->
            <div class="flex items-center gap-3 cursor-pointer" onclick="window.app.navigate('dashboard')">
              <div class="w-10 h-10 rounded-2xl bg-blue-500 text-slate-950 flex items-center justify-center font-black text-xl shadow">
                🚚
              </div>
              <div>
                <h1 class="font-black text-base text-white tracking-tight">ระบบบริหารงานโรงโม่</h1>
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

            <!-- User Status & Logout -->
            <div class="flex items-center gap-3">
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
          ระบบบริหารงานโรงโม่ • AI Insights & Google Apps Script Cloud Engine
        </footer>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
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

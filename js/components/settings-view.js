/**
 * หน้าจอตั้งค่าและจัดการข้อมูลหลัก CRUD (Master Data Settings Component)
 */
class SettingsView {
  constructor() {
    this.activeTab = 'rates'; // rates, trucks, excavators, drivers, cloud
  }

  render() {
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();
    const rates = window.quarryStore.getJobRates();
    const drivers = window.quarryStore.getDrivers();

    return `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-blue-500 text-slate-950 rounded-xl">⚙️</span>
              จัดการข้อมูลหลักและอัตราค่าจ้าง (Master Data Management)
            </h1>
            <p class="text-sm text-slate-400 mt-1">เพิ่ม / ลด / แก้ไข ข้อมูลรถ, คนขับ, เรทราคาค่าวิ่ง และเรทค่าตักของแม็คโคร</p>
          </div>
          
          <button onclick="window.app.navigate('dashboard')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-2">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            กลับสู่แดชบอร์ด
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button onclick="settingsView.setTab('rates')" class="px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${this.activeTab === 'rates' ? 'bg-blue-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
            💰 เรทราคาค่าจ้าง (${rates.length})
          </button>
          <button onclick="settingsView.setTab('trucks')" class="px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${this.activeTab === 'trucks' ? 'bg-blue-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
            🚚 รถบรรทุกสิบล้อ (${trucks.length})
          </button>
          <button onclick="settingsView.setTab('excavators')" class="px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${this.activeTab === 'excavators' ? 'bg-blue-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
            🚜 รถขุด / แม็คโคร (${excavators.length})
          </button>
          <button onclick="settingsView.setTab('drivers')" class="px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${this.activeTab === 'drivers' ? 'bg-blue-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
            👥 พนักงานขับรถ (${drivers.length})
          </button>
          <button onclick="settingsView.setTab('cloud')" class="px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${this.activeTab === 'cloud' ? 'bg-blue-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
            ☁️ ซิงค์ Cloud & สำรองข้อมูล
          </button>
        </div>

        <!-- Tab Content Panes -->
        ${this.renderActiveTabContent()}

      </div>
    `;
  }

  setTab(tab) {
    this.activeTab = tab;
    window.app.render();
  }

  renderActiveTabContent() {
    if (this.activeTab === 'rates') return this.renderRatesTab();
    if (this.activeTab === 'trucks') return this.renderTrucksTab();
    if (this.activeTab === 'excavators') return this.renderExcavatorsTab();
    if (this.activeTab === 'drivers') return this.renderDriversTab();
    if (this.activeTab === 'cloud') return this.renderCloudTab();
    return '';
  }

  // 1. Tab เรทราคา
  renderRatesTab() {
    const rates = window.quarryStore.getJobRates();
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white">ตารางอัตราค่าจ้างต่อตัน (11 รายการ)</h2>
          <button onclick="settingsView.promptAddRate()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow">
            <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มประเภทงานใหม่
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">รายการประเภทงานวิ่ง</th>
                <th class="p-3 text-center">รถ 30 ตัน (บาท/ตัน)</th>
                <th class="p-3 text-center">รถ 45 ตัน (บาท/ตัน)</th>
                <th class="p-3 text-center">รถ 60 ตัน (บาท/ตัน)</th>
                <th class="p-3 text-center">เรทแม็คโคร (บาท)</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${rates.map(r => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-white">${r.name}</td>
                  <td class="p-3 text-center font-semibold text-blue-400">${r.rate_30_ton ? '฿' + r.rate_30_ton : '-'}</td>
                  <td class="p-3 text-center font-semibold text-blue-400">${r.rate_45_ton ? '฿' + r.rate_45_ton : '-'}</td>
                  <td class="p-3 text-center font-semibold text-blue-400">${r.rate_60_ton ? '฿' + r.rate_60_ton : '-'}</td>
                  <td class="p-3 text-center font-semibold text-purple-400">฿${r.excavator_rate || 5}</td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.promptEditRate('${r.id}')" class="btn-action-edit px-2.5 py-1 rounded-lg font-bold text-xs mr-1.5 transition">แก้ไข</button>
                    <button onclick="settingsView.deleteRate('${r.id}')" class="btn-action-delete px-2.5 py-1 rounded-lg font-bold text-xs transition">ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. Tab รถบรรทุก
  renderTrucksTab() {
    const trucks = window.quarryStore.getTrucks();
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white">รายการรถบรรทุกสิบล้อประจำโรงโม่ (28 คัน)</h2>
          <button onclick="settingsView.promptAddTruck()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow">
            <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มรถใหม่
          </button>
        </div>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th class="p-3">เบอร์รถ / ทะเบียน</th>
                <th class="p-3 text-center">พิกัดน้ำหนัก</th>
                <th class="p-3">คนขับประจำ</th>
                <th class="p-3">เบอร์โทร</th>
                <th class="p-3 text-center">สถานะ</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${trucks.map(t => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-white">${t.code}</td>
                  <td class="p-3 text-center font-bold text-blue-400">${t.capacity_ton} ตัน</td>
                  <td class="p-3 font-semibold text-slate-200">${t.nickname ? 'น้า' + t.nickname + ' ' : ''}${t.driver_name || '-'}</td>
                  <td class="p-3 font-mono font-semibold text-slate-300">${t.phone || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="status-badge px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}">
                      ${t.status === 'active' ? 'พร้อมใช้' : 'ว่าง'}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.deleteTruck('${t.id}')" class="btn-action-delete px-2.5 py-1 rounded-lg font-bold text-xs transition">ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. Tab แม็คโคร
  renderExcavatorsTab() {
    const excavators = window.quarryStore.getExcavators();
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white">รายการรถขุด / แม็คโคร (20 คัน)</h2>
          <button onclick="settingsView.promptAddExcavator()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow">
            <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มแม็คโครใหม่
          </button>
        </div>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th class="p-3">เบอร์รถ / รุ่นเครื่องจักร</th>
                <th class="p-3">ผู้ควบคุมประจำ</th>
                <th class="p-3 text-center">สังกัด</th>
                <th class="p-3 text-center text-blue-300">ตัก 30 ตัน (฿150)</th>
                <th class="p-3 text-center text-blue-300">ตัก 45 ตัน (฿225)</th>
                <th class="p-3 text-center text-blue-300">ตัก 60 ตัน (฿300)</th>
                <th class="p-3 text-center">สถานะ</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${excavators.map(e => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-white">${e.code}</td>
                  <td class="p-3 font-semibold text-slate-200">${e.nickname ? 'ช่าง' + e.nickname + ' ' : ''}${e.driver_name || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="role-badge px-2 py-0.5 rounded text-[10px] font-bold ${e.is_contractor ? 'bg-purple-900/60 text-purple-200 border border-purple-700' : 'bg-slate-800 text-slate-300'}">
                      ${e.is_contractor ? 'ทีม ผรม.' : 'ประจำโรงโม่'}
                    </span>
                  </td>
                  <td class="p-3 text-center font-bold text-emerald-400 font-mono">฿${e.rate_30_ton || 150}</td>
                  <td class="p-3 text-center font-bold text-emerald-400 font-mono">฿${e.rate_45_ton || 225}</td>
                  <td class="p-3 text-center font-bold text-emerald-400 font-mono">฿${e.rate_60_ton || 300}</td>
                  <td class="p-3 text-center">
                    <span class="status-badge px-2 py-0.5 rounded text-[10px] font-bold ${e.status === 'repair' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}">
                      ${e.status === 'repair' ? 'ซ่อม' : 'พร้อมใช้'}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.promptEditExcRate('${e.id}')" class="btn-action-edit px-2.5 py-1 rounded-lg font-bold text-xs mr-1.5 transition">ปรับเรท</button>
                    <button onclick="settingsView.deleteExcavator('${e.id}')" class="btn-action-delete px-2.5 py-1 rounded-lg font-bold text-xs transition">ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. Tab บัญชีผู้ใช้งานและสิทธิ์ (User Accounts & Role Permissions)
  renderDriversTab() {
    const drivers = window.quarryStore.getDrivers();
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();

    const roleFilter = this.userRoleFilter || 'all';
    const searchQuery = (this.userSearchQuery || '').toLowerCase().trim();

    let filteredDrivers = drivers.filter(d => {
      if (roleFilter !== 'all' && d.role !== roleFilter) return false;
      if (searchQuery) {
        const nameMatch = (d.name || '').toLowerCase().includes(searchQuery);
        const nickMatch = (d.nickname || '').toLowerCase().includes(searchQuery);
        const phoneMatch = (d.phone || '').includes(searchQuery);
        const codeMatch = (d.assigned_vehicle || '').toLowerCase().includes(searchQuery);
        if (!nameMatch && !nickMatch && !phoneMatch && !codeMatch) return false;
      }
      return true;
    });

    const activeCount = drivers.filter(d => d.status !== 'suspended').length;
    const suspendedCount = drivers.filter(d => d.status === 'suspended').length;

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-5">
        
        <!-- Top Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-black text-white flex items-center gap-2">
              <i data-lucide="users" class="w-5 h-5 text-blue-400"></i>
              จัดการบัญชีผู้ใช้งานและกำหนดสิทธิ์ (${drivers.length} บัญชี)
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              เปิดใช้งาน: <span class="text-emerald-400 font-bold">${activeCount}</span> บัญชี | 
              ระงับสิทธิ์: <span class="text-red-400 font-bold">${suspendedCount}</span> บัญชี
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button onclick="settingsView.exportCredentialsPDF()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition" title="พิมพ์หรือดาวน์โหลดเอกสาร PDF รายชื่อและรหัสผ่าน">
              <i data-lucide="file-text" class="w-4 h-4 text-emerald-400"></i>
              📄 พิมพ์/ส่งออก PDF
            </button>
            <button onclick="settingsView.openAddUserModal()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition">
              <i data-lucide="user-plus" class="w-4 h-4"></i> เพิ่มบัญชีผู้ใช้ใหม่
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
          
          <!-- Search input -->
          <div class="relative w-full md:w-80">
            <input type="text" id="user-search-input" value="${this.userSearchQuery || ''}" oninput="settingsView.handleUserSearch(this.value)" placeholder="ค้นหาชื่อ, ชื่อเล่น, เบอร์โทร..." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <div class="absolute left-3 top-2.5 text-slate-400">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
            </div>
          </div>

          <!-- Role Filter Chips -->
          <div class="flex flex-wrap gap-1.5 w-full md:w-auto">
            ${[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'truck_driver', label: '🚚 สิบล้อ' },
              { id: 'excavator_operator', label: '🚜 แม็คโคร' },
              { id: 'supervisor', label: '📋 หัวหน้างาน' },
              { id: 'admin', label: '💼 ผู้บริหาร' }
            ].map(r => `
              <button onclick="settingsView.setUserRoleFilter('${r.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${roleFilter === r.id ? 'bg-blue-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">
                ${r.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Users Table -->
        <div class="overflow-x-auto max-h-[550px] border border-slate-800 rounded-2xl">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th class="p-3">ชื่อ-นามสกุล / ชื่อเล่น</th>
                <th class="p-3">เบอร์โทรศัพท์ (Login ID)</th>
                <th class="p-3">เบอร์รถประจำ</th>
                <th class="p-3 text-center">บทบาทและสิทธิ์</th>
                <th class="p-3 text-center">รหัส PIN</th>
                <th class="p-3 text-center">สถานะ</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${filteredDrivers.length === 0 ? `
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-500 font-bold">ไม่พบข้อมูลบัญชีผู้ใช้ตามเงื่อนไขที่ค้นหา</td>
                </tr>
              ` : filteredDrivers.map(d => `
                <tr class="hover:bg-slate-800/50 transition">
                  <td class="p-3">
                    <span class="font-bold text-white text-sm">${d.name}</span>
                    ${d.nickname ? `<span class="nickname-badge ml-1.5 px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-950/80 text-blue-300 border border-blue-700">(${d.nickname})</span>` : ''}
                  </td>
                  <td class="p-3 font-mono font-bold text-slate-200">${d.phone || '-'}</td>
                  <td class="p-3 font-semibold text-slate-300">${d.assigned_vehicle || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="role-badge px-2.5 py-1 rounded-xl text-[11px] font-black ${
                      d.role === 'admin' ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400' :
                      d.role === 'supervisor' ? 'bg-blue-600 text-white shadow-sm border border-blue-500' :
                      d.role === 'excavator_operator' ? 'bg-cyan-900 text-cyan-200 border border-cyan-600' :
                      'bg-slate-800 text-slate-200 border border-slate-700'
                    }">
                      ${
                        d.role === 'admin' ? '👑 ผู้บริหาร' :
                        d.role === 'supervisor' ? '📋 หัวหน้างาน' :
                        d.role === 'excavator_operator' ? '🚜 แม็คโคร' :
                        '🚚 พนักงานขับสิบล้อ'
                      }
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="pin-badge inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs bg-blue-950 text-blue-300 border border-blue-800">
                      ${d.pin || '123456'}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="status-badge px-2.5 py-1 rounded-full text-[10px] font-black ${
                      d.status === 'suspended' ? 'bg-red-950 text-red-300 border border-red-800' :
                      d.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }">
                      ${
                        d.status === 'suspended' ? '⛔ ระงับสิทธิ์' :
                        d.status === 'pending' ? '⏳ รออนุมัติ' :
                        '🟢 พร้อมใช้งาน'
                      }
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="settingsView.openEditUserModal('${d.id}')" class="btn-action-edit px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 rounded-lg font-black border border-blue-800 text-[11px] transition shadow-sm" title="แก้ไขข้อมูล">
                        ✏️ แก้ไข
                      </button>
                      <button onclick="settingsView.toggleUserStatus('${d.id}')" class="btn-action-toggle px-2.5 py-1 ${d.status === 'suspended' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'} rounded-lg font-black border text-[11px] transition shadow-sm" title="${d.status === 'suspended' ? 'ปลดระงับสิทธิ์' : 'ระงับสิทธิ์ชั่วคราว'}">
                        ${d.status === 'suspended' ? '🔓 ปลดระงับ' : '🔒 ระงับ'}
                      </button>
                      <button onclick="settingsView.deleteDriver('${d.id}')" class="btn-action-delete px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded-lg font-black border border-red-800 text-[11px] transition shadow-sm" title="ลบบัญชี">
                        🗑️ ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- User Management Modals Container (Rendered dynamically) -->
        <div id="user-modal-container"></div>

      </div>
    `;
  }

  // 5. Tab Cloud Sync (Supabase PostgreSQL & Storage)
  renderCloudTab() {
    const syncStatus = window.quarryStore.getSyncStatus();
    const currentKey = window.quarryStore.getSupabaseKey();
    const isOnline = navigator.onLine;

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-6 max-w-2xl">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white flex items-center gap-2">
            <i data-lucide="database" class="w-5 h-5 text-blue-400"></i>
            การเชื่อมต่อฐานข้อมูล Supabase & Storage
          </h2>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}">
            ${isOnline ? '🟢 ออนไลน์พร้อมเชื่อมต่อ' : '🔴 ออฟไลน์ (ทำงานในเครื่อง)'}
          </span>
        </div>

        <!-- Connection Details Card -->
        <div class="space-y-3">
          <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-slate-400 uppercase">Supabase Project URL:</span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono">PostgreSQL</span>
            </div>
            <p class="text-xs text-blue-400 font-mono break-all">${CONFIG.SUPABASE_URL}</p>
          </div>

          <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-slate-400 uppercase">Storage Bucket (รูปถ่ายรอบวิ่ง):</span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">Auto Compress JPEG</span>
            </div>
            <p class="text-xs text-emerald-400 font-mono">${CONFIG.STORAGE_BUCKET}</p>
          </div>

          <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-slate-400 uppercase">สถานะการซิงค์:</span>
              <span class="text-xs font-bold ${syncStatus.status === 'online' ? 'text-emerald-400' : (syncStatus.status === 'connecting' ? 'text-amber-400' : 'text-slate-400')}">
                ${syncStatus.status === 'online' ? 'ซิงค์สำเร็จล่าสุด' : (syncStatus.status === 'connecting' ? 'กำลังเชื่อมต่อ...' : 'พร้อมทำงาน')}
              </span>
            </div>
            <p class="text-xs text-slate-400">
              คิวที่รอส่ง: <span class="font-bold text-white">${syncStatus.pending}</span> รายการ 
              ${syncStatus.lastSyncAt ? ` | อัปเดตล่าสุด: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString('th-TH')}` : ''}
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3 pt-2">
          <button onclick="settingsView.syncInitialDatabaseToCloud()" class="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 text-slate-950 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base transition">
            <i data-lucide="refresh-cw" class="w-5 h-5"></i>
            ดึงและซิงค์ข้อมูลล่าสุดกับ Supabase เดี๋ยวนี้
          </button>

          <button onclick="settingsView.promptConfigureSupabaseKey()" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm border border-slate-700 transition">
            <i data-lucide="key" class="w-4 h-4 text-amber-400"></i>
            ตั้งค่า Supabase Anon Key
          </button>
        </div>

        <!-- Data Management & Pre-Handover Testing Reset Section -->
        <div class="border-t border-slate-800 pt-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <span class="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl">🧹</span>
              การจัดการข้อมูลและเตรียมทดสอบระบบ (Pre-Handover Testing)
            </h3>
          </div>

          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400">สถานะข้อมูลหลัก (Master Data):</span>
              <span class="text-emerald-400 font-bold">🟢 สมบูรณ์ (รถ 28, แม็คโคร 20, ผู้ใช้ 38, เรท 11)</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center">
              <div class="p-2.5 bg-slate-900/80 rounded-xl">
                <span class="text-[10px] text-slate-400 block font-bold">รอบวิ่งสิบล้อ</span>
                <span class="text-lg font-black text-white font-mono">${window.quarryStore.getTrips().length}</span>
              </div>
              <div class="p-2.5 bg-slate-900/80 rounded-xl">
                <span class="text-[10px] text-slate-400 block font-bold">ตักหินแม็คโคร</span>
                <span class="text-lg font-black text-cyan-400 font-mono">${window.quarryStore.getExcavatorLogs().length}</span>
              </div>
              <div class="p-2.5 bg-slate-900/80 rounded-xl">
                <span class="text-[10px] text-slate-400 block font-bold">ความผิดปกติ</span>
                <span class="text-lg font-black text-amber-400 font-mono">${window.quarryStore.getIncidentAudits().length}</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onclick="settingsView.confirmClearTransactionalData()" class="py-3.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow">
              <i data-lucide="trash-2" class="w-4 h-4 text-rose-400"></i>
              ล้างข้อมูลธุรกรรมทั้งหมด (รีเซ็ตพร้อมทดสอบ)
            </button>
            <button onclick="settingsView.seedDemoDataAction()" class="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95">
              <i data-lucide="database-backup" class="w-4 h-4 text-blue-400"></i>
              สร้างข้อมูลจำลองทดสอบ (Seed Demo)
            </button>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            * การล้างข้อมูลธุรกรรมจะลบเฉพาะรอบวิ่ง บันทึกตัก และการตรวจจับความผิดปกติ เพื่อให้ท่านทดสอบบันทึกข้อมูลสดได้สะอาด 100% โดย <strong>ข้อมูลหลัก (รถ 28 คัน, แมคโคร 20 คัน, พนักงาน 38 คน, เรทราคา 11 รายการ) จะยังคงอยู่ครบถ้วน</strong>
          </p>
        </div>
      </div>
    `;
  }

  // Action Handlers
  promptAddRate() {
    const name = prompt("ระบุชื่อรายการประเภทงานวิ่งใหม่:");
    if (!name) return;
    const r30 = parseFloat(prompt("เรทราคาสำหรับรถ 30 ตัน (บาท):") || "0");
    const r45 = parseFloat(prompt("เรทราคาสำหรับรถ 45 ตัน (บาท):") || "0");
    const r60 = parseFloat(prompt("เรทราคาสำหรับรถ 60 ตัน (บาท):") || "0");
    const excRate = parseFloat(prompt("เรทค่าตักของแม็คโคร (บาท):") || "5");

    window.quarryStore.addOrUpdateJobRate({
      id: 'R_' + Date.now(),
      name: name,
      rate_30_ton: r30,
      rate_45_ton: r45,
      rate_60_ton: r60,
      excavator_rate: excRate
    });
    window.app.render();
  }

  promptEditRate(rateId) {
    const rates = window.quarryStore.getJobRates();
    const r = rates.find(x => x.id === rateId);
    if (!r) return;

    const r30 = parseFloat(prompt(`แก้ไขเรท 30 ตัน สำหรับ "${r.name}":`, r.rate_30_ton || '0'));
    const r45 = parseFloat(prompt(`แก้ไขเรท 45 ตัน สำหรับ "${r.name}":`, r.rate_45_ton || '0'));
    const r60 = parseFloat(prompt(`แก้ไขเรท 60 ตัน สำหรับ "${r.name}":`, r.rate_60_ton || '0'));
    const excRate = parseFloat(prompt(`แก้ไขเรทแม็คโคร สำหรับ "${r.name}":`, r.excavator_rate || '5'));

    window.quarryStore.addOrUpdateJobRate({
      ...r,
      rate_30_ton: isNaN(r30) ? r.rate_30_ton : r30,
      rate_45_ton: isNaN(r45) ? r.rate_45_ton : r45,
      rate_60_ton: isNaN(r60) ? r.rate_60_ton : r60,
      excavator_rate: isNaN(excRate) ? (r.excavator_rate || 5) : excRate
    });
    window.app.render();
  }

  deleteRate(rateId) {
    if (confirm("คุณแน่ใจว่าต้องการลบเรทราคานี้ใช่หรือไม่?")) {
      window.quarryStore.deleteJobRate(rateId);
      window.app.render();
    }
  }

  promptAddTruck() {
    const code = prompt("ระบุเบอร์รถ / ทะเบียนรถ:");
    if (!code) return;
    const capacity = parseInt(prompt("พิกัดน้ำหนัก (เช่น 30, 45, 60 ตัน):") || "30");
    const driver = prompt("ชื่อคนขับประจำ (ถ้ามี):") || "";
    const phone = prompt("เบอร์โทรคนขับ (ถ้ามี):") || "";

    window.quarryStore.addOrUpdateTruck({
      id: 'T_' + Date.now(),
      code: code,
      plate: code,
      capacity_ton: capacity,
      driver_name: driver,
      phone: phone,
      status: 'active'
    });
    window.app.render();
  }

  deleteTruck(truckId) {
    if (confirm("คุณแน่ใจว่าต้องการลบรถคันนี้ใช่หรือไม่?")) {
      window.quarryStore.deleteTruck(truckId);
      window.app.render();
    }
  }

  promptAddExcavator() {
    const code = prompt("ระบุเบอร์รถ / รุ่นเครื่องจักรแม็คโคร:");
    if (!code) return;
    const driver = prompt("ชื่อผู้ควบคุมประจำ:") || "";
    const rate = parseFloat(prompt("ค่าตักต่อคัน (บาท):") || "5");

    window.quarryStore.addOrUpdateExcavator({
      id: 'E_' + Date.now(),
      code: code,
      model: code,
      driver_name: driver,
      rate_per_scoop: rate,
      status: 'active'
    });
    window.app.render();
  }

  promptEditExcRate(excId) {
    const excs = window.quarryStore.getExcavators();
    const exc = excs.find(e => e.id === excId);
    if (!exc) return;

    const cur30 = exc.rate_30_ton || 150;
    const cur45 = exc.rate_45_ton || 225;
    const cur60 = exc.rate_60_ton || 300;

    const r30Str = prompt(`🚜 กำหนดค่าตักสำหรับเครื่องจักร: ${exc.code}\n\n1. ค่าตักรถบรรทุก 30 ตัน (บาท):`, cur30);
    if (r30Str === null) return;
    const r45Str = prompt(`2. ค่าตักรถบรรทุก 45 ตัน (บาท):`, cur45);
    if (r45Str === null) return;
    const r60Str = prompt(`3. ค่าตักรถบรรทุก 60 ตัน (บาท):`, cur60);
    if (r60Str === null) return;

    const r30 = parseFloat(r30Str) || 5;
    const r45 = parseFloat(r45Str) || 8;
    const r60 = parseFloat(r60Str) || 10;

    window.quarryStore.addOrUpdateExcavator({
      ...exc,
      rate_30_ton: r30,
      rate_45_ton: r45,
      rate_60_ton: r60,
      rate_per_scoop: r30
    });
    alert(`✅ อัปเดตเรทค่าตัก ${exc.code} สำเร็จ!\n• 30 ตัน = ฿${r30}\n• 45 ตัน = ฿${r45}\n• 60 ตัน = ฿${r60}`);
    window.app.render();
  }

  deleteExcavator(excId) {
    if (confirm("คุณแน่ใจว่าต้องการลบแม็คโครคันนี้ใช่หรือไม่?")) {
      window.quarryStore.deleteExcavator(excId);
      window.app.render();
    }
  }

  // -------------------------------------------------------------
  // USER ACCOUNTS & PERMISSION HANDLERS
  // -------------------------------------------------------------
  handleUserSearch(query) {
    this.userSearchQuery = query;
    window.app.render();
  }

  setUserRoleFilter(role) {
    this.userRoleFilter = role;
    window.app.render();
  }

  openAddUserModal() {
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();

    const container = document.getElementById('user-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <i data-lucide="user-plus" class="w-5 h-5 text-emerald-400"></i>
              เพิ่มบัญชีผู้ใช้งานและกำหนดสิทธิ์
            </h3>
            <button onclick="settingsView.closeUserModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          </div>

          <div class="space-y-3.5 text-xs">
            <div>
              <label class="block font-bold text-slate-300 mb-1">ชื่อ-นามสกุลจริง <span class="text-red-400">*</span></label>
              <input type="text" id="modal-user-name" placeholder="เช่น นาย สันติ ผ่องใส" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">ชื่อเล่น</label>
                <input type="text" id="modal-user-nickname" placeholder="เช่น ต้อย, แดง" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">เบอร์โทรศัพท์ (Login ID) <span class="text-red-400">*</span></label>
                <input type="tel" id="modal-user-phone" maxlength="10" placeholder="08xxxxxxxx" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">บทบาทและสิทธิ์การใช้งาน (Role) <span class="text-red-400">*</span></label>
              <select id="modal-user-role" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="truck_driver">🚚 พนักงานขับรถสิบล้อ (Truck Driver)</option>
                <option value="excavator_operator">🚜 พนักงานขับรถขุด / แม็คโคร (Excavator Operator)</option>
                <option value="supervisor">📋 หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)</option>
                <option value="admin">💼 ผู้บริหาร / เจ้าของกิจการ (Admin)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">เบอร์รถประจำ (ถ้ามี)</label>
              <select id="modal-user-vehicle" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">-- ไม่มีรถประจำ (เลือกหน้างาน) --</option>
                <optgroup label="รถบรรทุกสิบล้อ">
                  ${trucks.map(t => `<option value="${t.code}">${t.code}</option>`).join('')}
                </optgroup>
                <optgroup label="รถขุด/แม็คโคร">
                  ${excavators.map(e => `<option value="${e.code}">${e.code}</option>`).join('')}
                </optgroup>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">รหัส PIN เข้าสู่ระบบ (6 หลัก)</label>
                <input type="text" id="modal-user-pin" value="123456" maxlength="6" inputmode="numeric" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-blue-400 font-mono font-black focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">สถานะเริ่มต้น</label>
                <select id="modal-user-status" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="active">🟢 เปิดใช้งาน (Active)</option>
                  <option value="suspended">⛔ ระงับสิทธิ์ (Suspended)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-3 border-t border-slate-800">
            <button onclick="settingsView.closeUserModal()" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
              ยกเลิก
            </button>
            <button onclick="settingsView.saveNewUser()" class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition">
              บันทึกบัญชีผู้ใช้
            </button>
          </div>

        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  openEditUserModal(userId) {
    const drivers = window.quarryStore.getDrivers();
    const user = drivers.find(d => d.id === userId);
    if (!user) return;

    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();
    const container = document.getElementById('user-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <i data-lucide="edit-3" class="w-5 h-5 text-blue-400"></i>
              แก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน
            </h3>
            <button onclick="settingsView.closeUserModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          </div>

          <div class="space-y-3.5 text-xs">
            <div>
              <label class="block font-bold text-slate-300 mb-1">ชื่อ-นามสกุลจริง</label>
              <input type="text" id="edit-user-name" value="${user.name || ''}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">ชื่อเล่น</label>
                <input type="text" id="edit-user-nickname" value="${user.nickname || ''}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">เบอร์โทรศัพท์ (Login ID)</label>
                <input type="tel" id="edit-user-phone" value="${user.phone || ''}" maxlength="10" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">บทบาทและสิทธิ์การใช้งาน (Role)</label>
              <select id="edit-user-role" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="truck_driver" ${user.role === 'truck_driver' ? 'selected' : ''}>🚚 พนักงานขับรถสิบล้อ (Truck Driver)</option>
                <option value="excavator_operator" ${user.role === 'excavator_operator' ? 'selected' : ''}>🚜 พนักงานขับรถขุด / แม็คโคร (Excavator Operator)</option>
                <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>📋 หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>💼 ผู้บริหาร / เจ้าของกิจการ (Admin)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">เบอร์รถประจำ</label>
              <select id="edit-user-vehicle" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">-- ไม่มีรถประจำ (เลือกหน้างาน) --</option>
                <optgroup label="รถบรรทุกสิบล้อ">
                  ${trucks.map(t => `<option value="${t.code}" ${user.assigned_vehicle === t.code ? 'selected' : ''}>${t.code}</option>`).join('')}
                </optgroup>
                <optgroup label="รถขุด/แม็คโคร">
                  ${excavators.map(e => `<option value="${e.code}" ${user.assigned_vehicle === e.code ? 'selected' : ''}>${e.code}</option>`).join('')}
                </optgroup>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">กำหนดรหัส PIN ใหม่ (6 หลัก)</label>
                <input type="text" id="edit-user-pin" value="${user.pin || '123456'}" maxlength="6" inputmode="numeric" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-blue-400 font-mono font-black focus:ring-2 focus:ring-blue-500 focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">สถานะบัญชี</label>
                <select id="edit-user-status" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="active" ${user.status !== 'suspended' ? 'selected' : ''}>🟢 เปิดใช้งาน (Active)</option>
                  <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>⛔ ระงับสิทธิ์ (Suspended)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-3 border-t border-slate-800">
            <button onclick="settingsView.closeUserModal()" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
              ยกเลิก
            </button>
            <button onclick="settingsView.saveEditUser('${user.id}')" class="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition">
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>

        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  closeUserModal() {
    const container = document.getElementById('user-modal-container');
    if (container) container.innerHTML = '';
  }

  async saveNewUser() {
    const name = document.getElementById('modal-user-name')?.value.trim();
    const nickname = document.getElementById('modal-user-nickname')?.value.trim();
    const phone = document.getElementById('modal-user-phone')?.value.trim();
    const role = document.getElementById('modal-user-role')?.value || 'truck_driver';
    const vehicle = document.getElementById('modal-user-vehicle')?.value || '';
    const pin = document.getElementById('modal-user-pin')?.value.trim() || '123456';
    const status = document.getElementById('modal-user-status')?.value || 'active';

    if (!name) return alert('กรุณาระบุชื่อ-นามสกุล');
    if (!phone) return alert('กรุณาระบุเบอร์โทรศัพท์');

    await window.quarryStore.addOrUpdateDriver({
      id: 'D_' + Date.now(),
      name,
      nickname,
      phone,
      role,
      assigned_vehicle: vehicle,
      pin,
      status
    });

    this.closeUserModal();
    alert('✅ เพิ่มบัญชีผู้ใช้ใหม่เรียบร้อยแล้ว');
    window.app.render();
  }

  async saveEditUser(userId) {
    const drivers = window.quarryStore.getDrivers();
    const user = drivers.find(d => d.id === userId);
    if (!user) return;

    const name = document.getElementById('edit-user-name')?.value.trim();
    const nickname = document.getElementById('edit-user-nickname')?.value.trim();
    const phone = document.getElementById('edit-user-phone')?.value.trim();
    const role = document.getElementById('edit-user-role')?.value || user.role;
    const vehicle = document.getElementById('edit-user-vehicle')?.value;
    const pin = document.getElementById('edit-user-pin')?.value.trim() || user.pin || '123456';
    const status = document.getElementById('edit-user-status')?.value || 'active';

    if (!name) return alert('กรุณาระบุชื่อ-นามสกุล');

    await window.quarryStore.addOrUpdateDriver({
      ...user,
      name,
      nickname,
      phone,
      role,
      assigned_vehicle: vehicle,
      pin,
      status
    });

    this.closeUserModal();
    alert('✅ อัปเดตข้อมูลบัญชีเรียบร้อยแล้ว');
    window.app.render();
  }

  async toggleUserStatus(userId) {
    const drivers = window.quarryStore.getDrivers();
    const user = drivers.find(d => d.id === userId);
    if (!user) return;

    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = newStatus === 'suspended'
      ? `คุณต้องการระงับสิทธิ์การใช้งานของ "${user.name}" ชั่วคราวใช่หรือไม่?`
      : `คุณต้องการปลดการระงับสิทธิ์ของ "${user.name}" ใช่หรือไม่?`;

    if (confirm(confirmMsg)) {
      await window.quarryStore.addOrUpdateDriver({
        ...user,
        status: newStatus
      });
      window.app.render();
    }
  }

  deleteDriver(driverId) {
    const drivers = window.quarryStore.getDrivers();
    const user = drivers.find(d => d.id === driverId);
    if (confirm(`คุณแน่ใจว่าต้องการลบบัญชีของ "${user ? user.name : driverId}" ออกจากระบบใช่หรือไม่?`)) {
      window.quarryStore.deleteDriver(driverId);
      window.app.render();
    }
  }

  async syncInitialDatabaseToCloud() {
    try {
      alert("⏳ กำลังเชื่อมต่อและซิงค์ข้อมูลกับ Supabase...");
      const success = await window.quarryStore.seedAllToSupabase();
      if (success) {
        alert("🎉 ซิงค์ข้อมูล Master Data ขึ้นฐานข้อมูล Supabase สำเร็จเรียบร้อยแล้วครับ!");
      } else {
        await window.quarryStore.refreshMasterDataFromCloud();
        alert("🔄 อัปเดตข้อมูลล่าสุดจาก Supabase เรียบร้อยแล้วครับ!");
      }
      window.app.render();
    } catch (e) {
      alert("การเชื่อมต่อ Supabase ขัดข้อง: " + e.toString());
    }
  }

  promptConfigureSupabaseKey() {
    const currentKey = window.quarryStore.getSupabaseKey() || '';
    const newKey = prompt("ระบุ Supabase anon / public key:", currentKey);
    if (newKey !== null && newKey.trim() !== '') {
      window.quarryStore.setSupabaseKey(newKey.trim());
      alert("✅ บันทึก Supabase Key เรียบร้อยแล้ว ระบบจะเริ่มเชื่อมต่อใหม่อัตโนมัติ");
      window.app.render();
    }
  }

  confirmClearTransactionalData() {
    const tripCount = window.quarryStore.getTrips().length;
    const excCount = window.quarryStore.getExcavatorLogs().length;
    const auditCount = window.quarryStore.getIncidentAudits().length;

    const msg = `⚠️ ยืนยันการล้างข้อมูลธุรกรรมทั้งหมดเพื่อเตรียมทดสอบระบบ?\n\n` +
      `ระบบจะลบข้อมูลธุรกรรมดังนี้:\n` +
      `- รายการรอบวิ่งสิบล้อ: ${tripCount} รายการ\n` +
      `- รายการตักหินแม็คโคร: ${excCount} รายการ\n` +
      `- รายงานความผิดปกติ: ${auditCount} รายการ\n` +
      `- กะการทำงานที่เปิดค้างอยู่\n\n` +
      `✅ ข้อมูลหลัก (รถ 28 คัน, แม็คโคร 20 คัน, พนักงาน 38 คน, เรทราคา 11 รายการ) จะยังคงอยู่ครบถ้วน 100%`;

    if (confirm(msg)) {
      window.quarryStore.clearTransactionalData(false);
      alert("✅ ล้างข้อมูลธุรกรรมทั้งหมดเรียบร้อยแล้ว!\nระบบสะอาดพร้อมสำหรับการทดสอบบันทึกข้อมูลสดรอบใหม่");
      window.app.render();
    }
  }

  seedDemoDataAction() {
    if (confirm("ต้องการสร้างข้อมูลจำลองรอบวิ่งและบันทึกตักเพื่อการสาธิตระบบใช่หรือไม่?")) {
      window.quarryStore.seedDemoData();
      alert("✅ สร้างข้อมูลจำลองสำหรับการสาธิตเรียบร้อยแล้ว!");
      window.app.render();
    }
  }

  exportCredentialsPDF() {
    window.open('exports/user_credentials.html', '_blank');
  }
}

window.settingsView = new SettingsView();



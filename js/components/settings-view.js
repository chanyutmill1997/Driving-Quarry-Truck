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
                    <button onclick="settingsView.promptEditRate('${r.id}')" class="text-blue-400 hover:underline font-bold mr-2">แก้ไข</button>
                    <button onclick="settingsView.deleteRate('${r.id}')" class="text-red-400 hover:underline font-bold">ลบ</button>
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
                  <td class="p-3">${t.nickname ? 'น้า' + t.nickname + ' ' : ''}${t.driver_name || '-'}</td>
                  <td class="p-3 text-slate-400">${t.phone || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}">
                      ${t.status === 'active' ? 'พร้อมใช้' : 'ว่าง'}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.deleteTruck('${t.id}')" class="text-red-400 hover:underline font-bold">ลบ</button>
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
                <th class="p-3 text-center">ค่าตักต่อคัน (บาท)</th>
                <th class="p-3 text-center">สถานะ</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${excavators.map(e => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-white">${e.code}</td>
                  <td class="p-3">${e.nickname ? 'ช่าง' + e.nickname + ' ' : ''}${e.driver_name || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${e.is_contractor ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-800 text-slate-300'}">
                      ${e.is_contractor ? 'ทีม ผรม.' : 'ประจำโรงโม่'}
                    </span>
                  </td>
                  <td class="p-3 text-center font-bold text-emerald-400">฿${e.rate_per_scoop || 5}</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${e.status === 'repair' ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'}">
                      ${e.status === 'repair' ? 'ซ่อม' : 'พร้อมใช้'}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.promptEditExcRate('${e.id}')" class="text-blue-400 hover:underline font-bold mr-2">ปรับเรท</button>
                    <button onclick="settingsView.deleteExcavator('${e.id}')" class="text-red-400 hover:underline font-bold">ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. Tab พนักงาน
  renderDriversTab() {
    const drivers = window.quarryStore.getDrivers();
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white">รายชื่อพนักงานและสิทธิ์การใช้งาน (${drivers.length} คน)</h2>
          <button onclick="settingsView.promptAddDriver()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow">
            <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มพนักงานใหม่
          </button>
        </div>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th class="p-3">ชื่อ-สกุล</th>
                <th class="p-3">ชื่อเล่น</th>
                <th class="p-3">เบอร์โทรศัพท์ (ใช้ล็อกอิน)</th>
                <th class="p-3 text-center">บทบาท (Role)</th>
                <th class="p-3 text-center">รหัส PIN</th>
                <th class="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${drivers.map(d => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-white">${d.name}</td>
                  <td class="p-3 text-blue-400 font-semibold">${d.nickname || '-'}</td>
                  <td class="p-3 text-slate-300">${d.phone || '-'}</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.role === 'admin' ? 'bg-blue-500 text-slate-950' : (d.role === 'supervisor' ? 'bg-blue-900 text-blue-200' : 'bg-slate-800 text-slate-300')}">
                      ${d.role === 'admin' ? 'ผู้บริหาร' : (d.role === 'supervisor' ? 'หัวหน้างาน' : (d.role === 'excavator_operator' ? 'แม็คโคร' : 'คนขับสิบล้อ'))}
                    </span>
                  </td>
                  <td class="p-3 text-center font-mono font-bold text-slate-400">${d.pin || '1234'}</td>
                  <td class="p-3 text-right">
                    <button onclick="settingsView.deleteDriver('${d.id}')" class="text-red-400 hover:underline font-bold">ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 5. Tab Cloud Sync
  renderCloudTab() {
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-6 max-w-2xl">
        <h2 class="text-lg font-black text-white flex items-center gap-2">
          <i data-lucide="cloud" class="w-5 h-5 text-blue-400"></i>
          การเชื่อมต่อ Cloud และ Google Apps Script
        </h2>

        <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
          <p class="text-xs font-bold text-slate-400 uppercase">Web App URL ปัจจุบัน:</p>
          <p class="text-xs text-blue-400 font-mono break-all">${CONFIG.API_URL}</p>
        </div>

        <div class="space-y-3">
          <button onclick="settingsView.syncInitialDatabaseToCloud()" class="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 text-slate-950 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base">
            <i data-lucide="upload-cloud" class="w-5 h-5"></i>
            ส่งข้อมูล Master Data เริ่มต้นขึ้น Google Sheets อัตโนมัติ
          </button>

          <button onclick="settingsView.resetData()" class="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm border border-slate-700">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นจากไฟล์ Excel
          </button>
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
    const rate = parseFloat(prompt(`ระบุค่าตักต่อคันสำหรับ ${exc.code} (บาท):`, exc.rate_per_scoop || 5));
    if (!isNaN(rate)) {
      window.quarryStore.addOrUpdateExcavator({ ...exc, rate_per_scoop: rate });
      window.app.render();
    }
  }

  deleteExcavator(excId) {
    if (confirm("คุณแน่ใจว่าต้องการลบแม็คโครคันนี้ใช่หรือไม่?")) {
      window.quarryStore.deleteExcavator(excId);
      window.app.render();
    }
  }

  promptAddDriver() {
    const name = prompt("ชื่อ-สกุล พนักงานใหม่:");
    if (!name) return;
    const nickname = prompt("ชื่อเล่น:") || "";
    const phone = prompt("เบอร์โทรศัพท์ (ใช้ล็อกอิน):") || "";
    const roleChoice = prompt("ระบุบทบาท (1: คนขับสิบล้อ, 2: แม็คโคร, 3: หัวหน้างาน, 4: ผู้บริหาร):", "1");
    let role = "truck_driver";
    if (roleChoice === "2") role = "excavator_operator";
    if (roleChoice === "3") role = "supervisor";
    if (roleChoice === "4") role = "admin";

    window.quarryStore.addOrUpdateDriver({
      id: 'D_' + Date.now(),
      name: name,
      nickname: nickname,
      phone: phone,
      role: role,
      pin: "1234"
    });
    window.app.render();
  }

  deleteDriver(driverId) {
    if (confirm("คุณแน่ใจว่าต้องการลบพนักงานคนนี้ใช่หรือไม่?")) {
      window.quarryStore.deleteDriver(driverId);
      window.app.render();
    }
  }

  async syncInitialDatabaseToCloud() {
    const seed = window.quarryStore.masterData;
    try {
      alert("⏳ กำลังส่งข้อมูลเริ่มต้นขึ้น Google Sheets...");
      const resp = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'initDatabase', seedData: seed })
      });
      const resJson = await resp.json();
      if (resJson.status === 'success') {
        alert("🎉 สร้างชีทตารางใน Google Sheets เรียบร้อยแล้วครับ!");
      } else {
        alert("แจ้งเตือน: " + resJson.message);
      }
    } catch (e) {
      alert("การเชื่อมต่อขัดข้อง: " + e.toString());
    }
  }

  async resetData() {
    if (confirm("⚠️ คุณแน่ใจว่าต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นจากไฟล์ Excel หรือไม่?")) {
      await window.quarryStore.resetToSeedData();
      alert("รีเซ็ตข้อมูลสำเร็จ");
      window.app.render();
    }
  }
}

window.settingsView = new SettingsView();

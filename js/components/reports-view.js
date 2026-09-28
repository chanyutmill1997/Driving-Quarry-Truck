/**
 * หน้าจอสรุปรายงานและส่งออก Excel (Reports & Excel Export Component)
 * เพิ่มระบบ: เจาะลึกประวัติรายบุคคล (Individual Driver Deep-Dive Profile)
 */
class ReportsView {
  constructor() {
    this.viewMode = 'overview'; // 'overview' หรือ 'individual'
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterVehicle = '';
    this.filterDriver = '';
    
    // สำหรับโหมดเจาะลึกรายคน
    this.selectedDrilldownDriver = '';
  }

  render() {
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const drivers = window.quarryStore.getDrivers();

    if (!this.selectedDrilldownDriver && drivers.length > 0) {
      this.selectedDrilldownDriver = drivers[0].name;
    }

    return `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-emerald-500 text-slate-950 rounded-xl">📑</span>
              รายงานและสรุปยอดค่าจ้าง (Reports & Audits)
            </h1>
            <p class="text-sm text-slate-400 mt-1">กรองดูภาพรวมตามช่วงเวลา หรือเจาะลึกดูประวัติรายคนขับอย่างละเอียด</p>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- View Mode Switcher -->
            <div class="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button onclick="reportsView.setViewMode('overview')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.viewMode === 'overview' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                📊 สรุปภาพรวม
              </button>
              <button onclick="reportsView.setViewMode('individual')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${this.viewMode === 'individual' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                👤 เจาะลึกรายคน
              </button>
            </div>

            <!-- Export Excel Button -->
            <button onclick="reportsView.exportToExcel()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5">
              <i data-lucide="download" class="w-4 h-4"></i>
              Export Excel
            </button>
          </div>
        </div>

        ${this.viewMode === 'overview' ? this.renderOverviewMode(trips, trucks, drivers) : this.renderIndividualMode(trips, drivers)}

      </div>
    `;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    window.app.render();
  }

  // 1. โหมดภาพรวม (Overview Mode)
  renderOverviewMode(trips, trucks, drivers) {
    let filteredTrips = trips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      return true;
    });

    const totalAmount = filteredTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalTripsCount = filteredTrips.length;

    const driverSummaryMap = {};
    filteredTrips.forEach(t => {
      const key = t.driverName || 'ไม่ระบุ';
      if (!driverSummaryMap[key]) {
        driverSummaryMap[key] = {
          name: t.driverName,
          phone: t.driverPhone,
          truck: t.truckPlate,
          trips: 0,
          totalAmount: 0
        };
      }
      driverSummaryMap[key].trips += 1;
      driverSummaryMap[key].totalAmount += (t.amount || 0);
    });
    const driverSummaries = Object.values(driverSummaryMap);

    return `
      <!-- Filter Controls Bar -->
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">ตัวกรองข้อมูลภาพรวม (Filter Options)</h3>
          <div class="flex items-center gap-1.5">
            <button onclick="reportsView.setQuickDateFilter('today')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">วันนี้</button>
            <button onclick="reportsView.setQuickDateFilter('7days')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">7 วัน</button>
            <button onclick="reportsView.setQuickDateFilter('thisMonth')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">เดือนนี้</button>
            <button onclick="reportsView.setQuickDateFilter('all')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-blue-400">ทั้งหมด</button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">ตั้งแต่วันที่</label>
            <input type="date" id="filter-date-from" value="${this.filterDateFrom}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">ถึงวันที่</label>
            <input type="date" id="filter-date-to" value="${this.filterDateTo}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">เลือกรถ</label>
            <select id="filter-vehicle" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
              <option value="">-- รถทุกคัน (${trucks.length} คัน) --</option>
              ${trucks.map(t => `<option value="${t.code}" ${this.filterVehicle === t.code ? 'selected' : ''}>${t.code}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">เลือกคนขับ</label>
            <select id="filter-driver" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
              <option value="">-- คนขับทุกคน --</option>
              ${drivers.map(d => `<option value="${d.name}" ${this.filterDriver === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Summary Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">จำนวนเที่ยวที่กรอง</span>
          <p class="text-2xl font-black text-blue-400 mt-1">${totalTripsCount.toLocaleString()} เที่ยว</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">ยอดเงินค่าจ้างรวม</span>
          <p class="text-2xl font-black text-emerald-400 mt-1">฿${totalAmount.toLocaleString()} บาท</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">จำนวนคนขับที่ปฏิบัติงาน</span>
          <p class="text-2xl font-black text-white mt-1">${driverSummaries.length} คน</p>
        </div>
      </div>

      <!-- Table 1: Driver Payout Summary -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <h2 class="text-lg font-black text-white flex items-center gap-2">
          <i data-lucide="users" class="w-5 h-5 text-blue-400"></i>
          ตารางสรุปยอดค่าจ้างรายบุคคล (คลิกที่ชื่อเพื่อดูเจาะลึกได้)
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">ลำดับ</th>
                <th class="p-3">ชื่อ-สกุล คนขับ</th>
                <th class="p-3">เบอร์โทรศัพท์</th>
                <th class="p-3">เบอร์รถล่าสุด</th>
                <th class="p-3 text-right">จำนวนเที่ยว</th>
                <th class="p-3 text-right">ยอดเงินที่ต้องจ่าย</th>
                <th class="p-3 text-center">ดูเจาะลึก</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${driverSummaries.length === 0 ? `
                <tr><td colspan="7" class="p-6 text-center text-slate-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>
              ` : driverSummaries.map((d, idx) => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-bold text-slate-400">${idx + 1}</td>
                  <td class="p-3 font-bold text-white">${d.name}</td>
                  <td class="p-3 text-slate-400">${d.phone || '-'}</td>
                  <td class="p-3 font-semibold text-blue-400">${d.truck || '-'}</td>
                  <td class="p-3 text-right font-black text-white">${d.trips}</td>
                  <td class="p-3 text-right font-black text-emerald-400 text-sm">฿${d.totalAmount.toLocaleString()}</td>
                  <td class="p-3 text-center">
                    <button onclick="reportsView.openDrilldown('${d.name}')" class="px-2.5 py-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-[11px] shadow">
                      🔍 เจาะลึก
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. โหมดเจาะลึกรายคน (Individual Drill-Down Mode)
  renderIndividualMode(trips, drivers) {
    const driverTrips = trips.filter(t => t.driverName === this.selectedDrilldownDriver);
    
    let filteredTrips = driverTrips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      return true;
    });

    const totalAmount = filteredTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const vehiclesUsed = [...new Set(filteredTrips.map(t => t.truckPlate))];
    const driverObj = drivers.find(d => d.name === this.selectedDrilldownDriver) || {};

    return `
      <!-- Driver Selector & Profile Header -->
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-blue-500 text-slate-950 flex items-center justify-center font-black text-3xl shadow-md">
              👤
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-black text-white">${this.selectedDrilldownDriver}</h2>
                <span class="text-xs bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  ${driverObj.nickname ? 'น้า' + driverObj.nickname : 'คนขับ'}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">เบอร์โทร: <span class="text-slate-200 font-mono">${driverObj.phone || '-'}</span> | รถที่ขับ: <span class="text-blue-300 font-bold">${vehiclesUsed.join(', ') || 'ไม่มี'}</span></p>
            </div>
          </div>

          <!-- Driver Picker Dropdown -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-400 font-bold">เลือกคนขับ:</label>
            <select onchange="reportsView.openDrilldown(this.value)" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none">
              ${drivers.map(d => `<option value="${d.name}" ${d.name === this.selectedDrilldownDriver ? 'selected' : ''}>${d.name} (${d.nickname || ''})</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Date Filter for Individual -->
        <div class="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-bold">ช่วงวันที่:</span>
            <input type="date" value="${this.filterDateFrom}" onchange="reportsView.handleDateFrom(this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
            <span class="text-xs text-slate-500">ถึง</span>
            <input type="date" value="${this.filterDateTo}" onchange="reportsView.handleDateTo(this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
          </div>

          <div class="flex items-center gap-4 text-xs font-bold">
            <span class="text-slate-300">จำนวนเที่ยว: <b class="text-blue-400 text-sm font-black">${filteredTrips.length}</b> เที่ยว</span>
            <span class="text-slate-300">ยอดเงินรวม: <b class="text-emerald-400 text-sm font-black">฿${totalAmount.toLocaleString()}</b> บาท</span>
          </div>
        </div>
      </div>

      <!-- Detailed Trip Log with Photos -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <h3 class="text-base font-black text-white flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-blue-400"></i>
          ประวัติการวิ่งรายรอบและรูปถ่าย GPS (${filteredTrips.length} รอบ)
        </h3>

        <div class="overflow-x-auto max-h-[500px]">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th class="p-3">รอบที่</th>
                <th class="p-3">วันที่-เวลา</th>
                <th class="p-3">รถที่ใช้</th>
                <th class="p-3">ประเภทงานวิ่ง</th>
                <th class="p-3 text-right">ยอดเงิน</th>
                <th class="p-3 text-center">รูปรับหิน</th>
                <th class="p-3 text-center">รูปเทหิน</th>
                <th class="p-3 text-center">พิกัด GPS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${filteredTrips.length === 0 ? `
                <tr><td colspan="8" class="p-6 text-center text-slate-500">ไม่มีประวัติการวิ่งของ ${this.selectedDrilldownDriver} ในช่วงเวลานี้</td></tr>
              ` : filteredTrips.map(t => `
                <tr class="hover:bg-slate-800/50">
                  <td class="p-3 font-black text-blue-400">#${t.roundNumber}</td>
                  <td class="p-3 text-slate-400">${t.timestamp || t.date}</td>
                  <td class="p-3 font-bold text-white">${t.truckPlate}</td>
                  <td class="p-3 text-slate-300">${t.jobTypeName}</td>
                  <td class="p-3 text-right font-black text-emerald-400">฿${t.amount}</td>
                  <td class="p-3 text-center">
                    <button onclick="adminDashboard.viewPhoto('${t.loadPhotoBase64}', 'จุดรับหิน', '${t.truckPlate}', '${t.timestamp}')" class="px-2 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 rounded font-bold text-[10px]">
                      📷 ดูรูปรับ
                    </button>
                  </td>
                  <td class="p-3 text-center">
                    <button onclick="adminDashboard.viewPhoto('${t.dumpPhotoBase64}', 'จุดเทหิน', '${t.truckPlate}', '${t.timestamp}')" class="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 rounded font-bold text-[10px]">
                      📷 ดูรูปเท
                    </button>
                  </td>
                  <td class="p-3 text-center text-[10px] text-slate-400 font-mono">
                    ${t.loadLat || '14.88'}, ${t.loadLng || '102.01'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  openDrilldown(driverName) {
    this.selectedDrilldownDriver = driverName;
    this.viewMode = 'individual';
    window.app.render();
  }

  handleFilterChange() {
    this.filterDateFrom = document.getElementById('filter-date-from')?.value || '';
    this.filterDateTo = document.getElementById('filter-date-to')?.value || '';
    this.filterVehicle = document.getElementById('filter-vehicle')?.value || '';
    this.filterDriver = document.getElementById('filter-driver')?.value || '';
    window.app.render();
  }

  handleDateFrom(v) {
    this.filterDateFrom = v;
    window.app.render();
  }

  handleDateTo(v) {
    this.filterDateTo = v;
    window.app.render();
  }

  setQuickDateFilter(type) {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'today') {
      this.filterDateFrom = today;
      this.filterDateTo = today;
    } else if (type === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      this.filterDateFrom = d.toISOString().split('T')[0];
      this.filterDateTo = today;
    } else if (type === 'thisMonth') {
      const d = new Date();
      this.filterDateFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      this.filterDateTo = today;
    } else {
      this.filterDateFrom = '';
      this.filterDateTo = '';
    }
    window.app.render();
  }

  exportToExcel() {
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    
    // Sheet 1: Detailed Trips
    const tripsRows = trips.map((t, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสรอบ (Trip ID)": t.id,
      "วันที่-เวลา": t.timestamp,
      "เบอร์รถ/ทะเบียน": t.truckPlate,
      "ขนาดพิกัด (ตัน)": t.capacityTon,
      "ชื่อคนขับ": t.driverName,
      "เบอร์โทรศัพท์": t.driverPhone,
      "ประเภทงานวิ่ง": t.jobTypeName,
      "รอบที่": t.roundNumber,
      "ยอดเงิน (บาท)": t.amount,
      "พิกัดรับหิน (Lat,Lng)": `${t.loadLat || ''}, ${t.loadLng || ''}`,
      "พิกัดเทหิน (Lat,Lng)": `${t.dumpLat || ''}, ${t.dumpLng || ''}`
    }));

    // Sheet 2: Excavator Logs
    const excRows = excLogs.map((l, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสตัก (Log ID)": l.id,
      "วันที่-เวลา": l.timestamp,
      "เบอร์แม็คโคร": l.excavatorCode,
      "ผู้ควบคุม": l.operatorName,
      "รถบรรทุกที่รับหิน": l.targetTruckPlate,
      "ยอดเงิน (บาท)": l.amount,
      "พิกัด (Lat,Lng)": `${l.lat || ''}, ${l.lng || ''}`
    }));

    // Generate workbook
    const wb = XLSX.utils.book_new();
    const wsTrips = XLSX.utils.json_to_sheet(tripsRows);
    const wsExc = XLSX.utils.json_to_sheet(excRows);

    XLSX.utils.book_append_sheet(wb, wsTrips, "รอบวิ่งรถบรรทุก");
    XLSX.utils.book_append_sheet(wb, wsExc, "รายการตักแม็คโคร");

    const fileName = `รายงานโรงโม่_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}

window.reportsView = new ReportsView();

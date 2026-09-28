/**
 * หน้าจอสรุปรายงานและส่งออก Excel / PDF (Reports & Export Component)
 * รองรับการส่งออกทั้ง:
 * 1) Excel Spreadsheet (.xlsx) แยก 3 ชีท
 * 2) Official PDF Report (.pdf) และ Print Preview สำหรับพิมพ์ลงกระดาษ A4
 */
class ReportsView {
  constructor() {
    this.viewMode = 'overview'; // 'overview', 'individual', 'reconciliation'
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
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-emerald-500 text-slate-950 rounded-xl">📑</span>
              รายงานและสรุปยอดค่าจ้าง (Reports & Audits)
            </h1>
            <p class="text-sm text-slate-400 mt-1">กรองดูภาพรวม, กระทบยอดสิบล้อ vs แม็คโคร หรือส่งออกรายงานเป็น Excel และ PDF</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- View Mode Switcher -->
            <div class="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button onclick="reportsView.setViewMode('overview')" class="px-3 py-2 rounded-xl text-xs font-bold transition ${this.viewMode === 'overview' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                📊 สรุปภาพรวม
              </button>
              <button onclick="reportsView.setViewMode('reconciliation')" class="px-3 py-2 rounded-xl text-xs font-bold transition ${this.viewMode === 'reconciliation' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                ⚖️ กระทบยอดสิบล้อ/แม็คโคร
              </button>
              <button onclick="reportsView.setViewMode('individual')" class="px-3 py-2 rounded-xl text-xs font-bold transition ${this.viewMode === 'individual' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                👤 เจาะลึกรายคน
              </button>
            </div>

            <!-- Export Actions Group -->
            <button onclick="reportsView.openExportModal()" class="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition flex items-center gap-2" title="ส่งออกเอกสารรายงาน">
              <i data-lucide="download" class="w-4 h-4"></i>
              📤 ส่งออกเอกสาร (Export)
            </button>

            <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button onclick="reportsView.exportToExcel()" class="px-3 py-2 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5" title="ดาวน์โหลดไฟล์ Excel (.xlsx)">
                <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                Excel
              </button>

              <button onclick="reportsView.exportToPDF()" class="px-3 py-2 bg-red-700/60 hover:bg-red-600 text-red-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5" title="ดาวน์โหลดไฟล์ PDF (.pdf)">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Export Modal Container -->
        <div id="export-modal-container"></div>

        <div id="report-printable-area">
          ${this.renderActiveView(trips, excLogs, trucks, drivers)}
        </div>

      </div>
    `;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    window.app.render();
  }

  renderActiveView(trips, excLogs, trucks, drivers) {
    if (this.viewMode === 'overview') return this.renderOverviewMode(trips, trucks, drivers);
    if (this.viewMode === 'reconciliation') return this.renderReconciliationMode(trips, excLogs, trucks);
    if (this.viewMode === 'individual') return this.renderIndividualMode(trips, drivers);
    return '';
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
            <label class="block text-xs text-slate-400 font-bold mb-1">ตั้งแต่วันที่ (เลือกปฏิทินหรือพิมพ์)</label>
            <div class="relative flex items-center">
              <input type="date" id="filter-date-from" value="${this.filterDateFrom}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none cursor-pointer" title="คลิกเลือกจากปฏิทิน หรือพิมพ์วันที่ได้โดยตรง">
              <button onclick="document.getElementById('filter-date-from')?.showPicker ? document.getElementById('filter-date-from').showPicker() : document.getElementById('filter-date-from')?.focus()" class="absolute right-2.5 text-blue-400 hover:text-blue-300" title="คลิกเปิดปฏิทิน">
                <i data-lucide="calendar" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">ถึงวันที่ (เลือกปฏิทินหรือพิมพ์)</label>
            <div class="relative flex items-center">
              <input type="date" id="filter-date-to" value="${this.filterDateTo}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none cursor-pointer" title="คลิกเลือกจากปฏิทิน หรือพิมพ์วันที่ได้โดยตรง">
              <button onclick="document.getElementById('filter-date-to')?.showPicker ? document.getElementById('filter-date-to').showPicker() : document.getElementById('filter-date-to')?.focus()" class="absolute right-2.5 text-blue-400 hover:text-blue-300" title="คลิกเปิดปฏิทิน">
                <i data-lucide="calendar" class="w-4 h-4"></i>
              </button>
            </div>
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
                <th class="p-3">ชื่อคนขับ</th>
                <th class="p-3">เบอร์โทรศัพท์</th>
                <th class="p-3">รถประจำ</th>
                <th class="p-3 text-center">จำนวนเที่ยววิ่ง</th>
                <th class="p-3 text-right">ยอดรวมค่าจ้าง (บาท)</th>
                <th class="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${driverSummaries.map(d => `
                <tr class="hover:bg-slate-800/50 cursor-pointer" onclick="reportsView.openDrilldown('${d.name}')">
                  <td class="p-3 font-bold text-white flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[10px]">👤</span>
                    ${d.name}
                  </td>
                  <td class="p-3 text-slate-400">${d.phone || '-'}</td>
                  <td class="p-3 font-mono font-bold text-slate-300">${d.truck || '-'}</td>
                  <td class="p-3 text-center font-black text-blue-400">${d.trips} เที่ยว</td>
                  <td class="p-3 text-right font-black text-emerald-400">฿${d.totalAmount.toLocaleString()}</td>
                  <td class="p-3 text-right">
                    <button class="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-slate-950 font-black rounded-lg transition text-[11px]">
                      เจาะลึก ➔
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

  // 2. โหมดกระทบยอดสิบล้อ vs แม็คโคร (Reconciliation Mode)
  renderReconciliationMode(trips, excLogs, trucks) {
    let filteredTrips = trips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      return true;
    });

    let filteredExcLogs = excLogs.filter(l => {
      if (this.filterDateFrom && l.date < this.filterDateFrom) return false;
      if (this.filterDateTo && l.date > this.filterDateTo) return false;
      if (this.filterVehicle && l.targetTruckPlate !== this.filterVehicle) return false;
      return true;
    });

    const totalTruck = filteredTrips.length;
    const totalExc = filteredExcLogs.length;
    const netDiff = totalTruck - totalExc;

    // แยกรายเบอร์รถสิบล้อ
    const truckMap = {};
    trucks.forEach(t => {
      truckMap[t.code] = {
        code: t.code,
        capacityTon: t.capacity_ton || 30,
        driverName: t.driver_name || '-',
        truckReported: 0,
        excavatorRecorded: 0
      };
    });

    filteredTrips.forEach(t => {
      const c = t.truckPlate || 'UNKNOWN';
      if (!truckMap[c]) {
        truckMap[c] = { code: c, capacityTon: t.capacityTon || 30, driverName: t.driverName || '-', truckReported: 0, excavatorRecorded: 0 };
      }
      truckMap[c].truckReported += 1;
    });

    filteredExcLogs.forEach(l => {
      const c = l.targetTruckPlate || 'UNKNOWN';
      if (!truckMap[c]) {
        truckMap[c] = { code: c, capacityTon: 30, driverName: '-', truckReported: 0, excavatorRecorded: 0 };
      }
      truckMap[c].excavatorRecorded += 1;
    });

    const reconList = Object.values(truckMap)
      .filter(item => item.truckReported > 0 || item.excavatorRecorded > 0)
      .map(item => {
        const diff = item.truckReported - item.excavatorRecorded;
        return {
          ...item,
          diff,
          status: diff === 0 ? 'match' : (diff > 0 ? 'truck_over' : 'exc_over')
        };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const matchCount = reconList.filter(x => x.status === 'match').length;
    const matchRate = reconList.length > 0 ? Math.round((matchCount / reconList.length) * 100) : 100;

    return `
      <!-- Filter Controls Bar -->
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">ตัวกรองช่วงเวลากระทบยอด (Reconciliation Filter)</h3>
          <div class="flex items-center gap-1.5">
            <button onclick="reportsView.setQuickDateFilter('today')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">วันนี้</button>
            <button onclick="reportsView.setQuickDateFilter('7days')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">7 วัน</button>
            <button onclick="reportsView.setQuickDateFilter('thisMonth')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">เดือนนี้</button>
            <button onclick="reportsView.setQuickDateFilter('all')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-blue-400">ทั้งหมด</button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">ตั้งแต่วันที่</label>
            <div class="relative flex items-center">
              <input type="date" id="filter-date-from" value="${this.filterDateFrom}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none cursor-pointer">
              <button onclick="document.getElementById('filter-date-from')?.showPicker ? document.getElementById('filter-date-from').showPicker() : document.getElementById('filter-date-from')?.focus()" class="absolute right-2.5 text-blue-400"><i data-lucide="calendar" class="w-4 h-4"></i></button>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">ถึงวันที่</label>
            <div class="relative flex items-center">
              <input type="date" id="filter-date-to" value="${this.filterDateTo}" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-white text-xs focus:outline-none cursor-pointer">
              <button onclick="document.getElementById('filter-date-to')?.showPicker ? document.getElementById('filter-date-to').showPicker() : document.getElementById('filter-date-to')?.focus()" class="absolute right-2.5 text-blue-400"><i data-lucide="calendar" class="w-4 h-4"></i></button>
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-bold mb-1">กรองเบอร์รถ</label>
            <select id="filter-vehicle" onchange="reportsView.handleFilterChange()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
              <option value="">-- รถทุกคัน --</option>
              ${trucks.map(t => `<option value="${t.code}" ${this.filterVehicle === t.code ? 'selected' : ''}>${t.code}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Reconciliation KPI Cards Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-slate-900 border border-blue-500/40 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">🚚 สิบล้อรายงานรับหิน</span>
          <p class="text-2xl font-black text-blue-400 mt-1">${totalTruck.toLocaleString()} เที่ยว</p>
        </div>
        <div class="bg-slate-900 border border-purple-500/40 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">🚜 แม็คโครบันทึกตัก</span>
          <p class="text-2xl font-black text-purple-400 mt-1">${totalExc.toLocaleString()} คัน</p>
        </div>
        <div class="bg-slate-900 border ${netDiff !== 0 ? 'border-amber-500/50 bg-amber-950/20' : 'border-emerald-500/50'} p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">⚖️ ผลต่างสุทธิ</span>
          <p class="text-2xl font-black ${netDiff === 0 ? 'text-emerald-400' : (netDiff > 0 ? 'text-amber-400' : 'text-purple-400')} mt-1 font-mono">
            ${netDiff > 0 ? `+${netDiff} เที่ยว` : (netDiff < 0 ? `${netDiff} คัน` : '0 (ตรงกัน 100%)')}
          </p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-bold uppercase">🎯 อัตราความสอดคล้อง</span>
          <p class="text-2xl font-black ${matchRate >= 90 ? 'text-emerald-400' : 'text-amber-400'} mt-1">${matchRate}%</p>
        </div>
      </div>

      <!-- Reconciliation Full Table -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-white flex items-center gap-2">
            <i data-lucide="scale" class="w-5 h-5 text-amber-400"></i>
            ตารางกระทบยอดเปรียบเทียบสิบล้อ vs แม็คโครรายคัน (${reconList.length} คัน)
          </h2>
          <span class="text-xs text-slate-400">สรุปตามช่วงเวลาที่เลือก</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">เบอร์รถสิบล้อ</th>
                <th class="p-3">คนขับประจำ</th>
                <th class="p-3 text-center">พิกัดตัน</th>
                <th class="p-3 text-center">สิบล้อแจ้งวิ่ง</th>
                <th class="p-3 text-center">แม็คโครตักให้</th>
                <th class="p-3 text-center">ผลต่าง (Diff)</th>
                <th class="p-3 text-center">สถานะความถูกต้อง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${reconList.map(item => `
                <tr class="hover:bg-slate-800/50 ${item.diff !== 0 ? 'bg-amber-950/10' : ''}">
                  <td class="p-3 font-bold text-white">🚚 ${item.code}</td>
                  <td class="p-3 text-slate-400">${item.driverName || '-'}</td>
                  <td class="p-3 text-center font-bold text-slate-300">${item.capacityTon} ตัน</td>
                  <td class="p-3 text-center font-bold text-blue-400">${item.truckReported} เที่ยว</td>
                  <td class="p-3 text-center font-bold text-purple-400">${item.excavatorRecorded} คัน</td>
                  <td class="p-3 text-center font-mono font-black ${item.diff === 0 ? 'text-emerald-400' : (item.diff > 0 ? 'text-amber-400' : 'text-purple-400')}">
                    ${item.diff > 0 ? `+${item.diff}` : (item.diff < 0 ? `${item.diff}` : '0')}
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'match' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : (item.status === 'truck_over' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-purple-950 text-purple-300 border border-purple-800')}">
                      ${item.status === 'match' ? '✓ ตรงกัน 100%' : (item.status === 'truck_over' ? `⚠️ สิบล้อแจ้งเกิน ${item.diff}` : `แม็คโครตักเกิน ${Math.abs(item.diff)}`)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. โหมดเจาะลึกรายคน (Individual Mode)
  renderIndividualMode(trips, drivers) {
    const driverName = this.selectedDrilldownDriver;
    const driverTrips = trips.filter(t => t.driverName === driverName);
    const totalAmount = driverTrips.reduce((sum, t) => sum + (t.amount || 0), 0);

    return `
      <div class="space-y-6">
        
        <!-- Driver Selector Strip -->
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-slate-400 uppercase">เลือกคนขับ:</span>
            <select onchange="reportsView.openDrilldown(this.value)" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:outline-none">
              ${drivers.map(d => `<option value="${d.name}" ${d.name === driverName ? 'selected' : ''}>${d.name} (${d.nickname || ''})</option>`).join('')}
            </select>
          </div>
          <button onclick="reportsView.setViewMode('overview')" class="text-xs text-blue-400 hover:underline font-bold">
            ← กลับสู่สรุปภาพรวม
          </button>
        </div>

        <!-- Driver Profile & Stats Card -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs text-slate-400 font-bold uppercase">คนขับ</span>
            <p class="text-xl font-black text-white mt-1">👤 ${driverName}</p>
          </div>
          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs text-slate-400 font-bold uppercase">จำนวนเที่ยวสะสม</span>
            <p class="text-2xl font-black text-blue-400 mt-1">${driverTrips.length} เที่ยว</p>
          </div>
          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs text-slate-400 font-bold uppercase">ยอดรายได้สะสม</span>
            <p class="text-2xl font-black text-emerald-400 mt-1">฿${totalAmount.toLocaleString()} บาท</p>
          </div>
        </div>

        <!-- Detailed Trips Table -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <h2 class="text-lg font-black text-white">ประวัติเที่ยววิ่งทั้งหมดของ ${driverName}</h2>

          <div class="overflow-x-auto max-h-[500px]">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 sticky top-0">
                <tr>
                  <th class="p-3">วันที่</th>
                  <th class="p-3">เวลา</th>
                  <th class="p-3">รอบที่</th>
                  <th class="p-3">เบอร์รถ</th>
                  <th class="p-3">ประเภทงาน</th>
                  <th class="p-3 text-right">ค่าจ้าง</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${driverTrips.map(t => `
                  <tr class="hover:bg-slate-800/50">
                    <td class="p-3 text-white font-bold">${t.date}</td>
                    <td class="p-3 text-slate-400">${t.timestamp || '-'}</td>
                    <td class="p-3 font-black text-blue-400">#${t.roundNumber}</td>
                    <td class="p-3 font-mono">${t.truckPlate}</td>
                    <td class="p-3">${t.jobTypeName}</td>
                    <td class="p-3 text-right font-black text-emerald-400">฿${t.amount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
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

  // -------------------------------------------------------------
  // EXPORT 1: EXCEL (.xlsx)
  // -------------------------------------------------------------
  exportToExcel() {
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    
    // Sheet 1: Detailed Trips
    const tripsRows = trips.map((t, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสรอบ (Trip ID)": t.id,
      "วันที่": t.date,
      "เวลา": t.timestamp,
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
      "วันที่": l.date,
      "เวลา": l.timestamp,
      "เบอร์แม็คโคร": l.excavatorCode,
      "ผู้ควบคุม": l.operatorName,
      "รถบรรทุกที่รับหิน": l.targetTruckPlate,
      "ยอดเงิน (บาท)": l.amount,
      "พิกัด (Lat,Lng)": `${l.lat || ''}, ${l.lng || ''}`
    }));

    // Sheet 3: Reconciliation Summary
    const truckMap = {};
    trucks.forEach(t => {
      truckMap[t.code] = { code: t.code, capacity: t.capacity_ton, driver: t.driver_name, truck: 0, exc: 0 };
    });
    trips.forEach(t => {
      if (!truckMap[t.truckPlate]) truckMap[t.truckPlate] = { code: t.truckPlate, capacity: t.capacityTon, driver: t.driverName, truck: 0, exc: 0 };
      truckMap[t.truckPlate].truck += 1;
    });
    excLogs.forEach(l => {
      if (!truckMap[l.targetTruckPlate]) truckMap[l.targetTruckPlate] = { code: l.targetTruckPlate, capacity: 30, driver: '-', truck: 0, exc: 0 };
      truckMap[l.targetTruckPlate].exc += 1;
    });

    const reconRows = Object.values(truckMap).map((r, idx) => ({
      "ลำดับ": idx + 1,
      "เบอร์รถสิบล้อ": r.code,
      "พิกัดตัน": r.capacity,
      "คนขับ": r.driver,
      "สิบล้อรายงานรับหิน (เที่ยว)": r.truck,
      "แม็คโครบันทึกตัก (คัน)": r.exc,
      "ผลต่าง (Diff)": r.truck - r.exc,
      "สถานะ": r.truck === r.exc ? 'ตรงกัน 100%' : (r.truck > r.exc ? 'สิบล้อแจ้งเกิน' : 'แม็คโครตักเกิน')
    }));

    // Generate workbook with 3 sheets
    const wb = XLSX.utils.book_new();
    const wsTrips = XLSX.utils.json_to_sheet(tripsRows);
    const wsExc = XLSX.utils.json_to_sheet(excRows);
    const wsRecon = XLSX.utils.json_to_sheet(reconRows);

    XLSX.utils.book_append_sheet(wb, wsTrips, "รอบวิ่งสิบล้อ");
    XLSX.utils.book_append_sheet(wb, wsExc, "รายการตักแม็คโคร");
    XLSX.utils.book_append_sheet(wb, wsRecon, "กระทบยอดสิบล้อVSแม็คโคร");

    const fileName = `รายงานโรงโม่_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // -------------------------------------------------------------
  // EXPORT 2: PDF REPORT (.pdf)
  // -------------------------------------------------------------
  exportToPDF() {
    const reportHtml = this.generatePrintableHTML();
    
    // สร้าง Container เสมือนสำหรับเรนเดอร์ PDF
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `รายงานโรงโม่_${this.viewMode}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const element = document.createElement('div');
    element.innerHTML = reportHtml;
    element.style.fontFamily = "'Sarabun', -apple-system, sans-serif";
    element.style.color = '#111827';
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '20px';

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      this.printReport();
    }
  }

  // -------------------------------------------------------------
  // EXPORT 3: PRINT / PRINT PREVIEW
  // -------------------------------------------------------------
  printReport() {
    const reportContent = this.generatePrintableHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์รายงาน");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>พิมพ์รายงานโรงโม่</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: 'Sarabun', -apple-system, sans-serif; background: #fff; color: #0f172a; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px; }
          th { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body class="p-6">
        ${reportContent}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // สร้างเทมเพลต HTML รายงานทางการสำหรับ PDF / Print
  generatePrintableHTML() {
    const dateRangeStr = (this.filterDateFrom || this.filterDateTo)
      ? `ช่วงวันที่: ${this.filterDateFrom || 'เริ่มต้น'} ถึง ${this.filterDateTo || 'ปัจจุบัน'}`
      : `ข้อมูลประจำวันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}`;

    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();

    let title = "รายงานสรุปภาพรวมรอบวิ่งและยอดค่าจ้าง";
    if (this.viewMode === 'reconciliation') title = "รายงานการตรวจสอบกระทบยอด (สิบล้อรับหิน vs แม็คโครตักหิน)";
    if (this.viewMode === 'individual') title = `รายงานประวัติรอบวิ่งเจาะลึก: ${this.selectedDrilldownDriver}`;

    let tableHtml = '';

    if (this.viewMode === 'reconciliation') {
      const recon = window.quarryAI ? window.quarryAI.getReconciliationReport(new Date().toISOString().split('T')[0]) : { perTruckList: [] };
      tableHtml = `
        <table class="w-full text-left border border-slate-300">
          <thead>
            <tr class="bg-slate-100 text-slate-800 font-bold">
              <th class="p-2 border">ลำดับ</th>
              <th class="p-2 border">เบอร์รถสิบล้อ</th>
              <th class="p-2 border">คนขับประจำ</th>
              <th class="p-2 border text-center">พิกัดตัน</th>
              <th class="p-2 border text-center">สิบล้อแจ้งวิ่ง (เที่ยว)</th>
              <th class="p-2 border text-center">แม็คโครตักให้ (คัน)</th>
              <th class="p-2 border text-center">ผลต่าง (Diff)</th>
              <th class="p-2 border text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${recon.perTruckList.map((r, i) => `
              <tr>
                <td class="p-2 border text-center">${i + 1}</td>
                <td class="p-2 border font-bold">${r.code}</td>
                <td class="p-2 border">${r.driverName || '-'}</td>
                <td class="p-2 border text-center">${r.capacityTon}</td>
                <td class="p-2 border text-center font-bold text-blue-700">${r.truckReported}</td>
                <td class="p-2 border text-center font-bold text-purple-700">${r.excavatorRecorded}</td>
                <td class="p-2 border text-center font-bold ${r.variance === 0 ? 'text-emerald-700' : 'text-amber-700'}">${r.variance > 0 ? `+${r.variance}` : r.variance}</td>
                <td class="p-2 border text-center font-bold">${r.status === 'match' ? '✓ ตรงกัน' : (r.status === 'truck_over' ? 'สิบล้อเกิน' : 'แม็คโครเกิน')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      const driverMap = {};
      trips.forEach(t => {
        const k = t.driverName || 'ไม่ระบุ';
        if (!driverMap[k]) driverMap[k] = { name: k, phone: t.driverPhone, truck: t.truckPlate, trips: 0, amount: 0 };
        driverMap[k].trips += 1;
        driverMap[k].amount += (t.amount || 0);
      });
      const rows = Object.values(driverMap);

      tableHtml = `
        <table class="w-full text-left border border-slate-300">
          <thead>
            <tr class="bg-slate-100 text-slate-800 font-bold">
              <th class="p-2 border">ลำดับ</th>
              <th class="p-2 border">ชื่อคนขับ</th>
              <th class="p-2 border">เบอร์โทรศัพท์</th>
              <th class="p-2 border">เบอร์รถประจำ</th>
              <th class="p-2 border text-center">จำนวนเที่ยววิ่ง</th>
              <th class="p-2 border text-right">ยอดรวมค่าจ้าง (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td class="p-2 border text-center">${i + 1}</td>
                <td class="p-2 border font-bold">${r.name}</td>
                <td class="p-2 border">${r.phone || '-'}</td>
                <td class="p-2 border font-mono">${r.truck || '-'}</td>
                <td class="p-2 border text-center font-bold">${r.trips} เที่ยว</td>
                <td class="p-2 border text-right font-bold text-emerald-700">฿${r.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <div class="space-y-4 text-slate-900">
        <!-- Header -->
        <div class="border-b-2 border-slate-800 pb-3 flex justify-between items-end">
          <div>
            <h1 class="text-xl font-black text-slate-900">${CONFIG.PLANT_NAME}</h1>
            <p class="text-xs font-bold text-blue-900">${CONFIG.COMPANY_NAME}</p>
            <h2 class="text-base font-bold text-slate-700 mt-1">${title}</h2>
            <p class="text-xs text-slate-500 mt-0.5">${dateRangeStr}</p>
          </div>
          <div class="text-right text-xs text-slate-500">
            <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
            <p class="font-bold text-slate-800">เอกสารทางการโรงโม่</p>
          </div>
        </div>

        <!-- Table -->
        <div class="pt-2">
          ${tableHtml}
        </div>

        <!-- Signatures Block -->
        <div class="pt-12 grid grid-cols-3 gap-8 text-center text-xs text-slate-700">
          <div class="border-t border-slate-400 pt-2">
            <p>ผู้จัดทำรายงาน / เจ้าหน้าที่ลาน</p>
            <p class="text-[10px] text-slate-400 mt-1">(........................................................)</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p>ผู้ตรวจสอบ / หัวหน้างาน</p>
            <p class="text-[10px] text-slate-400 mt-1">(........................................................)</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p>ผู้อนุมัติ / ผู้บริหารโรงโม่</p>
            <p class="text-[10px] text-slate-400 mt-1">(........................................................)</p>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // EXPORT MODAL (2 วัตถุประสงค์: สรุปการเงินอนุมัติ VS หลักฐานรูปถ่ายรับ-เท)
  // -------------------------------------------------------------
  openExportModal() {
    const trucks = window.quarryStore.getTrucks();
    const drivers = window.quarryStore.getDrivers();
    const container = document.getElementById('export-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <i data-lucide="file-output" class="w-5 h-5 text-emerald-400"></i>
                ส่งออกเอกสารรายงาน (Export Reports)
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">เลือกวัตถุประสงค์และรูปแบบไฟล์ที่ต้องการ</p>
            </div>
            <button onclick="reportsView.closeExportModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          </div>

          <!-- Section 1: Choose Purpose -->
          <div class="space-y-2.5">
            <label class="block text-xs font-bold text-slate-300 uppercase">1. เลือกวัตถุประสงค์ของเอกสาร</label>
            
            <label class="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-2xl cursor-pointer transition">
              <input type="radio" name="export-purpose" value="financial_summary" checked class="accent-blue-500 mt-1">
              <div>
                <span class="block text-sm font-black text-white flex items-center gap-1.5">
                  💼 1) สรุปตัวเลขทางการเงินและเที่ยววิ่ง (เสนอผู้บริหารอนุมัติ)
                </span>
                <span class="block text-xs text-slate-400 mt-1">
                  สรุปยอดรวม KPI, ค่าจ้างรายบุคคล, ยอดกระทบยอดสิบล้อ-แม็คโคร และมีช่องลงนาม 3 ฝ่าย (1–2 หน้า)
                </span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-700 hover:border-emerald-500 rounded-2xl cursor-pointer transition">
              <input type="radio" name="export-purpose" value="photo_dossier" class="accent-emerald-500 mt-1">
              <div>
                <span class="block text-sm font-black text-white flex items-center gap-1.5">
                  📸 2) ชุดหลักฐานประกอบรอบวิ่ง (พร้อมรูปถ่ายจุดรับและจุดเท)
                </span>
                <span class="block text-xs text-slate-400 mt-1">
                  เจาะลึกทุกเที่ยววิ่ง แสดงรูปถ่ายจุดรับ-จุดเทคู่กัน พิกัด GPS สแตมป์เวลาจริง และข้อมูลแม็คโครที่ตัก
                </span>
              </div>
            </label>
          </div>

          <!-- Section 2: Choose File Format -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-300 uppercase">2. รูปแบบไฟล์ที่ต้องการ</label>
            <div class="grid grid-cols-3 gap-2">
              <label class="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 text-xs font-bold text-white">
                <input type="radio" name="export-format" value="pdf" checked class="accent-blue-500">
                <span>📄 PDF (.pdf)</span>
              </label>
              <label class="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500 text-xs font-bold text-white">
                <input type="radio" name="export-format" value="excel" class="accent-emerald-500">
                <span>📊 Excel (.xlsx)</span>
              </label>
              <label class="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-purple-500 text-xs font-bold text-white">
                <input type="radio" name="export-format" value="print" class="accent-purple-500">
                <span>🖨️ พิมพ์ออก A4</span>
              </label>
            </div>
          </div>

          <!-- Section 3: Filter Range -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-300 uppercase">3. ขอบเขตข้อมูล (ตัวกรอง)</label>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="block text-slate-400 mb-1">ตั้งแต่วันที่</label>
                <input type="date" id="export-date-from" value="${this.filterDateFrom}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">ถึงวันที่</label>
                <input type="date" id="export-date-to" value="${this.filterDateTo}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white">
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 pt-3 border-t border-slate-800">
            <button onclick="reportsView.closeExportModal()" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition">
              ยกเลิก
            </button>
            <button onclick="reportsView.executeExportModal()" class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-1.5">
              <i data-lucide="download" class="w-4 h-4"></i> เริ่มการส่งออกเอกสาร
            </button>
          </div>

        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  closeExportModal() {
    const container = document.getElementById('export-modal-container');
    if (container) container.innerHTML = '';
  }

  executeExportModal() {
    const purpose = document.querySelector('input[name="export-purpose"]:checked')?.value || 'financial_summary';
    const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
    const fromDate = document.getElementById('export-date-from')?.value;
    const toDate = document.getElementById('export-date-to')?.value;

    if (fromDate) this.filterDateFrom = fromDate;
    if (toDate) this.filterDateTo = toDate;

    this.closeExportModal();

    if (purpose === 'photo_dossier') {
      if (format === 'excel') {
        alert("ชุดหลักฐานภาพถ่ายจะถูกส่งออกในรูปแบบไฟล์ PDF หรือพิมพ์ออก A4 เพื่อรักษาความคมชัดของรูปภาพครับ");
        this.exportProofOfWorkPDF();
      } else if (format === 'print') {
        this.printProofOfWork();
      } else {
        this.exportProofOfWorkPDF();
      }
    } else {
      // financial summary
      if (format === 'excel') {
        this.exportToExcel();
      } else if (format === 'print') {
        this.printReport();
      } else {
        this.exportToPDF();
      }
    }
  }

  // ส่งออกชุดหลักฐานภาพถ่ายรอบวิ่งเป็น PDF
  exportProofOfWorkPDF() {
    const reportHtml = this.generateProofOfWorkHTML();
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `ชุดหลักฐานรอบวิ่งโรงโม่_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = reportHtml;
    element.style.fontFamily = "'Sarabun', -apple-system, sans-serif";
    element.style.color = '#111827';
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '20px';

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      this.printProofOfWork();
    }
  }

  printProofOfWork() {
    const reportContent = this.generateProofOfWorkHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์รายงาน");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>พิมพ์ชุดหลักฐานรอบวิ่งโรงโม่</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: portrait; margin: 10mm; }
          body { font-family: 'Sarabun', -apple-system, sans-serif; background: #fff; color: #0f172a; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body class="p-6">
        ${reportContent}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // สร้างเอกสารชุดหลักฐานภาพถ่ายประกอบรอบวิ่ง (Trip Photo Audit Dossier)
  generateProofOfWorkHTML() {
    const trips = window.quarryStore.getTrips().filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      return true;
    });

    const dateRangeStr = (this.filterDateFrom || this.filterDateTo)
      ? `ช่วงวันที่: ${this.filterDateFrom || 'เริ่มต้น'} ถึง ${this.filterDateTo || 'ปัจจุบัน'}`
      : `ข้อมูลประจำวันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}`;

    return `
      <div class="space-y-6 text-slate-900">
        <!-- Header -->
        <div class="border-b-2 border-slate-800 pb-3 flex justify-between items-end">
          <div>
            <h1 class="text-xl font-black text-slate-900">${CONFIG.PLANT_NAME}</h1>
            <p class="text-xs font-bold text-blue-900">${CONFIG.COMPANY_NAME}</p>
            <h2 class="text-base font-bold text-slate-700 mt-1">ชุดเอกสารหลักฐานประกอบรอบวิ่งและรูปถ่ายรับ-เท (Trip Evidence Dossier)</h2>
            <p class="text-xs text-slate-500 mt-0.5">${dateRangeStr} | ทั้งหมด ${trips.length} รอบวิ่ง</p>
          </div>
          <div class="text-right text-xs text-slate-500">
            <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
            <p class="font-bold text-emerald-800">เอกสารหลักฐานตรวจสอบความโปร่งใส</p>
          </div>
        </div>

        <!-- Trips Proof List -->
        <div class="space-y-5">
          ${trips.length === 0 ? `
            <div class="p-8 text-center text-slate-400 font-bold border border-slate-200 rounded-xl">ไม่พบรายการรอบวิ่งในช่วงเวลาที่เลือก</div>
          ` : trips.map((t, idx) => `
            <div class="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div class="flex justify-between items-center bg-slate-200/80 p-2.5 rounded-lg text-xs font-bold text-slate-800">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 bg-blue-600 text-white rounded">รอบที่ ${t.roundNumber || (idx + 1)}</span>
                  <span>เบอร์รถ: <strong class="text-blue-900">${t.truckPlate}</strong> (${t.capacityTon || 30} ตัน)</span>
                  <span>คนขับ: <strong>${t.driverName}</strong></span>
                </div>
                <div>
                  <span>งาน: ${t.jobTypeName} | ค่าจ้าง: <strong class="text-emerald-700">฿${(t.amount || 0).toLocaleString()}</strong></span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Load Photo Proof -->
                <div class="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
                  <div class="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <span>📸 จุดรับหิน (ต้นทาง)</span>
                    <span class="text-blue-700 font-mono">${t.loadTime ? new Date(t.loadTime).toLocaleTimeString('th-TH') : t.timestamp}</span>
                  </div>
                  <div class="h-44 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                    ${t.loadPhotoUrl ? `
                      <img src="${t.loadPhotoUrl}" class="w-full h-full object-cover" alt="จุดรับหิน">
                    ` : `
                      <span class="text-xs text-slate-400 font-semibold">ไม่มีรูปถ่าย หรือบันทึกออฟไลน์</span>
                    `}
                  </div>
                  <p class="text-[10px] text-slate-500 font-mono truncate">พิกัด: ${t.loadLat && t.loadLng ? `${Number(t.loadLat).toFixed(5)}, ${Number(t.loadLng).toFixed(5)}` : 'GPS สแตมป์ในภาพ'}</p>
                </div>

                <!-- Dump Photo Proof -->
                <div class="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
                  <div class="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <span>📸 จุดเทหิน (ปลายทาง)</span>
                    <span class="text-emerald-700 font-mono">${t.dumpTime ? new Date(t.dumpTime).toLocaleTimeString('th-TH') : t.timestamp}</span>
                  </div>
                  <div class="h-44 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                    ${t.dumpPhotoUrl ? `
                      <img src="${t.dumpPhotoUrl}" class="w-full h-full object-cover" alt="จุดเทหิน">
                    ` : `
                      <span class="text-xs text-slate-400 font-semibold">ไม่มีรูปถ่าย หรือบันทึกออฟไลน์</span>
                    `}
                  </div>
                  <p class="text-[10px] text-slate-500 font-mono truncate">พิกัด: ${t.dumpLat && t.dumpLng ? `${Number(t.dumpLat).toFixed(5)}, ${Number(t.dumpLng).toFixed(5)}` : 'GPS สแตมป์ในภาพ'}</p>
                </div>
              </div>

              <div class="flex justify-between items-center text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                <span>⏱️ ระยะเวลาที่ใช้จริง: <strong>${t.durationSeconds ? `${Math.floor(t.durationSeconds / 60)} นาที ${t.durationSeconds % 60} วินาที` : 'ปกติ'}</strong></span>
                <span class="font-bold ${t.durationSeconds && t.durationSeconds < 180 ? 'text-amber-700' : 'text-emerald-700'}">
                  ${t.durationSeconds && t.durationSeconds < 180 ? '⚠️ วิ่งเร็วผิดปกติ (< 3 นาที)' : '✓ เวลาวิ่งอยู่ในเกณฑ์มาตรฐาน'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Signatures Block -->
        <div class="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
          <div class="border-t border-slate-400 pt-2">
            <p>ผู้ตรวจสอบหลักฐานภาพถ่าย / หัวหน้างาน</p>
            <p class="text-[10px] text-slate-400 mt-1">(........................................................)</p>
          </div>
          <div class="border-t border-slate-400 pt-2">
            <p>ผู้อนุมัติเบิกจ่าย / ผู้บริหารโรงโม่</p>
            <p class="text-[10px] text-slate-400 mt-1">(........................................................)</p>
          </div>
        </div>
      </div>
    `;
  }
}

window.reportsView = new ReportsView();

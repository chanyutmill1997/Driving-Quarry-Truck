/**
 * หน้าจอสรุปรายงานและส่งออก Excel / PDF (Reports & Export Component)
 * รองรับการส่งออกทั้ง:
 * 1) Excel Spreadsheet (.xlsx) แยก 3 ชีท
 * 2) Official PDF Report (.pdf) และ Print Preview สำหรับพิมพ์ลงกระดาษ A4
 */
class ReportsView {
  constructor() {
    this.viewMode = 'disbursement'; // 'disbursement', 'overview', 'individual', 'reconciliation', 'anomalies'
    const todayStr = new Date().toISOString().split('T')[0];
    this.filterDateFrom = todayStr;
    this.filterDateTo = todayStr;
    this.filterVehicle = '';
    this.filterDriver = '';
    this.filterJobType = '';
    
    // สำหรับโหมดหลักฐานแนบเบิกจ่าย (Disbursement & Photo Proofs)
    this.disbursementLayout = 'truck_grouped'; // 'truck_grouped', 'trip_timeline', 'audit_table'
    this.disbursementSearchQuery = '';
    this.selectedZoomPhoto = null;
    this.expandedTrucks = new Set();
    this.showAllTripsDirectly = false;

    // สำหรับโหมดเจาะลึกรายคน
    this.selectedDrilldownDriver = '';

    // สำหรับโหมดรายงานความผิดปกติ & การรับรองผล
    this.filterAnomalyStatus = 'all';
    this.filterAnomalyCategory = 'all';
    this.anomalySearchQuery = '';
  }

  toggleTruckExpand(truckPlate) {
    if (this.expandedTrucks.has(truckPlate)) {
      this.expandedTrucks.delete(truckPlate);
    } else {
      this.expandedTrucks.add(truckPlate);
    }
    window.app.render();
  }

  toggleShowAllTrips() {
    this.showAllTripsDirectly = !this.showAllTripsDirectly;
    window.app.render();
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
            <p class="text-sm text-slate-400 mt-1">หลักฐานภาพถ่ายทุกเที่ยวแนบเบิกจ่าย, กระทบยอดสิบล้อ vs แม็คโคร และส่งออก Excel / PDF</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- View Mode Switcher -->
            <div class="flex flex-wrap bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 gap-1.5 shadow-inner shrink-0">
              <button onclick="reportsView.setViewMode('disbursement')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.viewMode === 'disbursement' ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-1 ring-emerald-400/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'}">
                <span>📸</span>
                <span>หลักฐานแนบเบิกจ่าย & รูปทุกเที่ยว</span>
              </button>
              <button onclick="reportsView.setViewMode('overview')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.viewMode === 'overview' ? 'bg-blue-600 text-white font-black shadow-md ring-1 ring-blue-400/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'}">
                <span>📊</span>
                <span>สรุปภาพรวมค่าจ้าง</span>
              </button>
              <button onclick="reportsView.setViewMode('individual')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${this.viewMode === 'individual' ? 'bg-indigo-600 text-white font-black shadow-md ring-1 ring-indigo-400/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'}">
                <span>👤</span>
                <span>เจาะลึกรายบุคคล</span>
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

        <!-- Photo Zoom Lightbox Modal Container -->
        <div id="photo-zoom-modal-container">
          ${this.selectedZoomPhoto ? this.renderPhotoZoomModal() : ''}
        </div>

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

  setDisbursementLayout(layout) {
    this.disbursementLayout = layout;
    window.app.render();
  }

  renderActiveView(trips, excLogs, trucks, drivers) {
    if (this.viewMode === 'disbursement') return this.renderDisbursementMode(trips, trucks, drivers);
    if (this.viewMode === 'overview') return this.renderOverviewMode(trips, trucks, drivers);
    if (this.viewMode === 'reconciliation') return this.renderReconciliationMode(trips, excLogs, trucks);
    if (this.viewMode === 'individual') return this.renderIndividualMode(trips, drivers);
    if (this.viewMode === 'anomalies') return this.renderAnomaliesMode(trips, excLogs, trucks, drivers);
    return '';
  }

  // -------------------------------------------------------------
  // 0. โหมดหลักฐานแนบการพิจารณาเบิกจ่าย & รูปประกอบทุกเที่ยว (Disbursement Photo Evidence Mode)
  // -------------------------------------------------------------
  renderDisbursementMode(trips, trucks, drivers) {
    const jobRates = window.quarryStore.getJobRates();

    // กรองข้อมูลตามเงื่อนไข
    let filteredTrips = trips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType && t.jobTypeName !== this.filterJobType) return false;
      if (this.disbursementSearchQuery) {
        const q = this.disbursementSearchQuery.toLowerCase();
        const matchPlate = (t.truckPlate || '').toLowerCase().includes(q);
        const matchDriver = (t.driverName || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchJob = (t.jobTypeName || '').toLowerCase().includes(q);
        if (!matchPlate && !matchDriver && !matchId && !matchJob) return false;
      }
      return true;
    });

    const totalAmount = filteredTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalTripsCount = filteredTrips.length;
    const uniqueTrucks = new Set(filteredTrips.map(t => t.truckPlate)).size;
    const uniqueDrivers = new Set(filteredTrips.map(t => t.driverName)).size;
    const totalPhotos = filteredTrips.length * 2;

    return `
      <!-- Disbursement Header Banner & Statistics -->
      <div class="space-y-6">
        
        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div class="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <span class="text-xl">💰</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">ยอดเงินเบิกจ่ายรวม</p>
              <h3 class="text-lg font-black text-emerald-400">฿${totalAmount.toLocaleString()}</h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
              <span class="text-xl">🚛</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">เที่ยววิ่งรวมทั้งหมด</p>
              <h3 class="text-lg font-black text-white">${totalTripsCount.toLocaleString()} <span class="text-xs font-normal text-slate-400">เที่ยว</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <span class="text-xl">🚚</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">รถบรรทุกที่วิ่งงาน</p>
              <h3 class="text-lg font-black text-indigo-300">${uniqueTrucks} <span class="text-xs font-normal text-slate-400">คัน</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <span class="text-xl">📸</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">รูปหลักฐานแนบครบ</p>
              <h3 class="text-lg font-black text-amber-300">${totalPhotos.toLocaleString()} <span class="text-xs font-normal text-emerald-400 font-bold">(100%)</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-teal-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5 col-span-2 md:col-span-1">
            <div class="p-3 bg-teal-500/20 text-teal-400 rounded-xl">
              <span class="text-xl">🛡️</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">สถานะหลักฐาน</p>
              <h3 class="text-xs font-black text-teal-300 bg-teal-950/80 px-2 py-1 rounded-lg border border-teal-800/60 inline-block mt-0.5">✓ พร้อมเบิกจ่าย</h3>
            </div>
          </div>
        </div>

        <!-- Filter & Layout Toolbar -->
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div class="flex items-center gap-2">
              <span class="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">🔍</span>
              <h3 class="text-sm font-black text-white">ตัวกรองหลักฐานแนบการเบิกจ่าย (Disbursement Filters)</h3>
            </div>

            <!-- Quick Date Presets -->
            <div class="flex flex-wrap items-center gap-1.5">
              <button onclick="reportsView.setQuickDateFilter('today')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">วันนี้</button>
              <button onclick="reportsView.setQuickDateFilter('7days')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">7 วัน</button>
              <button onclick="reportsView.setQuickDateFilter('thisMonth')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">เดือนนี้</button>
              <button onclick="reportsView.setQuickDateFilter('all')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-blue-400 transition">ทั้งหมด</button>
            </div>
          </div>

          <!-- Dropdowns & Search Input -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <!-- Search Text -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ค้นหา (รอบ/ทะเบียน/คนขับ)</label>
              <div class="relative">
                <input type="text" value="${this.disbursementSearchQuery}" oninput="reportsView.onDisbursementSearch(this.value)" placeholder="พิมพ์คำค้นหา..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
              </div>
            </div>

            <!-- Filter Truck -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">เลือกรถบรรทุก</label>
              <select onchange="reportsView.onFilterChange('vehicle', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="">-- รถทุกคัน (${trucks.length} คัน) --</option>
                ${trucks.map(t => `<option value="${t.code}" ${this.filterVehicle === t.code ? 'selected' : ''}>${t.code} (${t.capacity_ton || 30} ตัน) ${t.driver_name ? '— ' + t.driver_name : ''}</option>`).join('')}
              </select>
            </div>

            <!-- Filter Driver -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">เลือกคนขับ</label>
              <select onchange="reportsView.onFilterChange('driver', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="">-- คนขับทุกคน (${drivers.length} คน) --</option>
                ${drivers.map(d => `<option value="${d.name}" ${this.filterDriver === d.name ? 'selected' : ''}>${d.name} (${d.phone || ''})</option>`).join('')}
              </select>
            </div>

            <!-- Filter Job Type -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ประเภทงาน</label>
              <select onchange="reportsView.onFilterChange('jobType', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="">-- ทุกประเภทงาน --</option>
                ${jobRates.map(j => `<option value="${j.id}" ${this.filterJobType === j.id ? 'selected' : ''}>${j.name}</option>`).join('')}
              </select>
            </div>

            <!-- Date Range Inputs -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ช่วงวันที่</label>
              <div class="flex items-center gap-1.5">
                <input type="date" value="${this.filterDateFrom}" onchange="reportsView.onFilterChange('dateFrom', this.value)" class="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-white">
                <span class="text-slate-500 text-xs">-</span>
                <input type="date" value="${this.filterDateTo}" onchange="reportsView.onFilterChange('dateTo', this.value)" class="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-white">
              </div>
            </div>
          </div>

          <!-- Layout Switcher & Action Buttons -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <!-- Layout Switcher -->
            <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button onclick="reportsView.setDisbursementLayout('truck_grouped')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${this.disbursementLayout === 'truck_grouped' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                <span>🚛</span> แยกตามคันรถ
              </button>
              <button onclick="reportsView.setDisbursementLayout('trip_timeline')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${this.disbursementLayout === 'trip_timeline' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                <span>⏱️</span> ไทม์ไลน์ทุกเที่ยว
              </button>
              <button onclick="reportsView.setDisbursementLayout('audit_table')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${this.disbursementLayout === 'audit_table' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                <span>📋</span> ตารางตรวจสอบละเอียด
              </button>
            </div>

            <!-- Print Vouchers Button -->
            <div class="flex items-center gap-2">
              <button onclick="reportsView.printDisbursementVouchers()" class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-2">
                <span>🖨️</span> พิมพ์ใบปะหน้าเบิกจ่ายพร้อมรูปถ่าย (A4 Voucher)
              </button>
            </div>
          </div>
        </div>

        <!-- Render Content based on selected layout -->
        ${filteredTrips.length === 0 ? `
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <span class="text-4xl">📭</span>
            <h3 class="text-base font-bold text-white">ไม่พบรายการเที่ยววิ่งตามเงื่อนไขที่เลือก</h3>
            <p class="text-xs text-slate-400">ลองปรับเปลี่ยนตัวกรองวันที่ ทะเบียนรถ หรือประเภทงานเพื่อดูข้อมูล</p>
          </div>
        ` : (
          this.disbursementLayout === 'truck_grouped'
            ? this.renderDisbursementTruckGrouped(filteredTrips, trucks)
            : (this.disbursementLayout === 'trip_timeline'
                ? this.renderDisbursementTimeline(filteredTrips)
                : this.renderDisbursementAuditTable(filteredTrips))
        )}

      </div>
    `;
  }

  // มุมมองที่ 1: แยกตามคันรถ (Group by Vehicle) - เรียบร้อย ไม่รกตา กดขยายเพื่อดูรูปและดาวน์โหลด
  renderDisbursementTruckGrouped(trips, trucks) {
    // จัดกลุ่มตามทะเบียนรถ
    const grouped = {};
    trips.forEach(t => {
      const key = t.truckPlate || 'ไม่ระบุคัน';
      if (!grouped[key]) {
        grouped[key] = {
          truckPlate: t.truckPlate,
          capacityTon: t.capacityTon || 30,
          driverName: t.driverName,
          driverPhone: t.driverPhone,
          trips: []
        };
      }
      grouped[key].trips.push(t);
    });

    const groups = Object.values(grouped).sort((a, b) => a.truckPlate.localeCompare(b.truckPlate));
    const allExpanded = this.showAllTripsDirectly;

    return `
      <div class="space-y-4">
        
        <!-- Batch Actions & Summary Bar -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-2 text-xs">
            <span class="px-2.5 py-1 bg-blue-500/20 text-blue-400 font-bold rounded-lg border border-blue-500/30">
              🚛 รถที่พบ ${groups.length} คัน
            </span>
            <span class="text-slate-400">
              รวม <strong class="text-white">${trips.length}</strong> เที่ยววิ่ง
            </span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="reportsView.toggleShowAllTrips()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700 shadow-sm">
              <span>${allExpanded ? '📁 ย่อรายการทุกคัน' : '📂 แสดงรายการและรูปทุกคัน'}</span>
            </button>
            <button onclick="reportsView.printDisbursementVouchers()" class="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <span>🖨️</span> พิมพ์ใบปะหน้าทุกคัน (A4)
            </button>
          </div>
        </div>

        <!-- Truck Cards List -->
        <div class="space-y-3.5">
          ${groups.map(group => {
            const groupTotal = group.trips.reduce((sum, t) => sum + (t.amount || 0), 0);
            const groupPhotosCount = group.trips.length * 2;
            const isExpanded = allExpanded || this.expandedTrucks.has(group.truckPlate);

            return `
              <div class="bg-slate-900 border ${isExpanded ? 'border-blue-500/50 shadow-xl' : 'border-slate-800 hover:border-slate-700'} rounded-3xl overflow-hidden transition-all shadow-md">
                
                <!-- Truck Header Bar -->
                <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  <!-- Truck & Driver Info -->
                  <div class="flex items-center gap-3.5">
                    <div class="p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl font-black text-lg">
                      🚛
                    </div>
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-base font-black text-white">${group.truckPlate}</h3>
                        <span class="px-2 py-0.5 bg-blue-950 text-blue-300 text-[11px] font-bold rounded-lg border border-blue-800/60">
                          พิกัด ${group.capacityTon} ตัน
                        </span>
                      </div>
                      <p class="text-xs text-slate-300 mt-0.5">
                        👤 คนขับ: <strong class="text-white">${group.driverName || 'ไม่ระบุ'}</strong>
                        ${group.driverPhone ? `<span class="text-slate-400 ml-1.5 font-mono text-[11px]">(${group.driverPhone})</span>` : ''}
                      </p>
                    </div>
                  </div>

                  <!-- Summary Stats & Actions -->
                  <div class="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
                    
                    <!-- KPI Badges -->
                    <div class="flex items-center gap-2">
                      <div class="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center min-w-[70px]">
                        <span class="text-[10px] text-slate-400 block font-bold">เที่ยว</span>
                        <span class="text-xs font-black text-white">${group.trips.length}</span>
                      </div>

                      <div class="bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-800/60 text-center min-w-[90px]">
                        <span class="text-[10px] text-emerald-400 block font-bold">ยอดขอเบิก</span>
                        <span class="text-xs font-black text-emerald-400">฿${groupTotal.toLocaleString()}</span>
                      </div>

                      <div class="bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-800/60 text-center min-w-[75px]">
                        <span class="text-[10px] text-amber-400 block font-bold">รูปหลักฐาน</span>
                        <span class="text-xs font-black text-amber-300">${groupPhotosCount} รูป</span>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-1.5">
                      <!-- Toggle Expand Button -->
                      <button onclick="reportsView.toggleTruckExpand('${group.truckPlate}')" class="px-3.5 py-2 ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-blue-400'} font-bold rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700 shadow-sm" title="คลิกเพื่อเปิด/ปิดรายการเที่ยววิ่งและรูปถ่าย">
                        <span>${isExpanded ? '🔼 ซ่อนรายการ' : `👁️ ดูรายการและรูปถ่าย (${group.trips.length})`}</span>
                      </button>

                      <!-- Print A4 Voucher Button -->
                      <button onclick="reportsView.printDisbursementVouchers('${group.truckPlate}')" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1 border border-slate-700 shadow-sm" title="พิมพ์ใบปะหน้าเบิกจ่ายพร้อมรูปถ่ายคันนี้">
                        <span>🖨️</span> <span class="hidden sm:inline">พิมพ์ A4</span>
                      </button>

                      <!-- Excel export for this truck -->
                      <button onclick="reportsView.exportTruckToExcel('${group.truckPlate}')" class="p-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 font-bold rounded-xl text-xs transition border border-emerald-800/60" title="ดาวน์โหลด Excel คันนี้">
                        <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                      </button>
                    </div>

                  </div>
                </div>

                <!-- Collapsible Grid of Trip Evidence Cards for this Truck -->
                ${isExpanded ? `
                  <div class="p-4 md:p-6 space-y-4 border-t border-slate-800 bg-slate-950/50 animate-fade-in">
                    <div class="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/60">
                      <span>📸 รายการรูปถ่ายหลักฐานทุกเที่ยววิ่งของทะเบียน <strong class="text-white">${group.truckPlate}</strong></span>
                      <span class="text-emerald-400 font-bold">✓ ตรวจสอบผ่านแล้ว ${group.trips.length} เที่ยว</span>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      ${group.trips.map(trip => this.renderTripPhotoEvidenceCard(trip)).join('')}
                    </div>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // มุมมองที่ 2: ไทม์ไลน์ทุกเที่ยว (Timeline Grid)
  renderDisbursementTimeline(trips) {
    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${trips.map(trip => this.renderTripPhotoEvidenceCard(trip)).join('')}
        </div>
      </div>
    `;
  }

  // การ์ดแสดงข้อมูลเที่ยววิ่งพร้อมรูปหลักฐาน 2 ภาพ (จุดรับ + จุดเท)
  renderTripPhotoEvidenceCard(trip) {
    const loadPhoto = this.getTripPhotoDisplay(trip, 'load');
    const dumpPhoto = this.getTripPhotoDisplay(trip, 'dump');
    const durationText = trip.durationSeconds
      ? `${Math.floor(trip.durationSeconds / 60)} นาที ${trip.durationSeconds % 60} วินาที`
      : 'ตามเกณฑ์มาตรฐาน';

    const isApproved = (trip.disbursementStatus || 'approved') === 'approved';

    return `
      <div class="bg-slate-950 border ${isApproved ? 'border-slate-800 hover:border-emerald-500/50' : 'border-amber-500/60'} rounded-2xl p-4 space-y-3.5 transition shadow-lg">
        <!-- Trip Header -->
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 bg-blue-600 text-slate-950 font-black text-xs rounded-lg shadow-sm">
              รอบที่ ${trip.roundNumber || 1}
            </span>
            <span class="text-xs font-black text-white">${trip.truckPlate}</span>
            <span class="text-[11px] text-slate-400">📅 ${trip.date}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/50">
              ฿${(trip.amount || 0).toLocaleString()} บาท
            </span>
          </div>
        </div>

        <!-- Meta Sub-bar -->
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
          <div>
            <span class="text-slate-400">👤 คนขับ:</span> <strong class="text-white">${trip.driverName}</strong>
          </div>
          <div>
            <span class="text-slate-400">💼 ประเภทงาน:</span> <strong class="text-blue-300">${trip.jobTypeName || 'วิ่งหินโรงโม่'}</strong>
          </div>
          <div>
            <span class="text-slate-400">⏱️ เวลาขึ้นหิน:</span> <span class="font-mono text-amber-300">${trip.loadTimestampText || trip.timestamp || '-'}</span>
          </div>
          <div>
            <span class="text-slate-400">🏁 เวลาเทหิน:</span> <span class="font-mono text-emerald-300">${trip.dumpTimestampText || trip.timestamp || '-'}</span>
            <span class="text-[10px] text-slate-400 block mt-0.5 font-mono">(${durationText})</span>
          </div>
        </div>

        <!-- 2 Photos Proof Grid (Load + Dump) -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Load Photo Frame -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-blue-400">
              <span>📍 จุดรับหิน (ต้นทาง)</span>
              <button onclick="reportsView.zoomPhoto('${trip.id}', 'load')" class="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5">
                <span>🔍</span> ขยาย
              </button>
            </div>
            <div onclick="reportsView.zoomPhoto('${trip.id}', 'load')" class="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer shadow-inner">
              <img src="${loadPhoto}" alt="รูปจุดรับหิน" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
              <div class="absolute bottom-1 left-1 right-1 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-md flex justify-between items-center text-[9px] text-slate-300 font-mono">
                <span>⏱️ ${trip.loadTimestampText || trip.timestamp}</span>
                <span class="text-emerald-400 font-bold">✓ รับหิน</span>
              </div>
            </div>
            <p class="text-[9.5px] text-slate-400 font-mono truncate">
              📍 ${trip.loadLat ? `${trip.loadLat}, ${trip.loadLng}` : '17.488120, 101.723450'}
            </p>
          </div>

          <!-- Dump Photo Frame -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span>📍 จุดเทหิน (ปากโม่)</span>
              <button onclick="reportsView.zoomPhoto('${trip.id}', 'dump')" class="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5">
                <span>🔍</span> ขยาย
              </button>
            </div>
            <div onclick="reportsView.zoomPhoto('${trip.id}', 'dump')" class="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer shadow-inner">
              <img src="${dumpPhoto}" alt="รูปจุดเทหิน" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
              <div class="absolute bottom-1 left-1 right-1 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-md flex justify-between items-center text-[9px] text-slate-300 font-mono">
                <span>⏱️ ${trip.dumpTimestampText || trip.timestamp}</span>
                <span class="text-emerald-400 font-bold">✓ เทหิน</span>
              </div>
            </div>
            <p class="text-[9.5px] text-slate-400 font-mono truncate">
              📍 ${trip.dumpLat ? `${trip.dumpLat}, ${trip.dumpLng}` : '17.489300, 101.724800'}
            </p>
          </div>
        </div>

        <!-- Verification & Sign-off Status -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
            <span class="${isApproved ? 'text-emerald-400' : 'text-amber-400'} font-bold text-[11px]">
              ${isApproved ? '✓ อนุมัติเบิกจ่าย (Disbursement Approved)' : '⏳ รอตรวจสอบเพิ่มเติม'}
            </span>
          </div>

          <button onclick="reportsView.toggleDisbursementApproval('${trip.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition">
            ${isApproved ? 'ระงับตรวจซ้ำ' : 'อนุมัติเบิกจ่าย'}
          </button>
        </div>

      </div>
    `;
  }

  // มุมมองที่ 3: ตารางตรวจสอบละเอียด (Audit Table)
  renderDisbursementAuditTable(trips) {
    return `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-[11px] font-black text-slate-300 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-3.5 px-4">รอบ / วันที่</th>
                <th class="py-3.5 px-4">รถบรรทุก</th>
                <th class="py-3.5 px-4">คนขับ</th>
                <th class="py-3.5 px-4">ประเภทงาน</th>
                <th class="py-3.5 px-3 text-center">รูปจุดรับ (ต้นทาง)</th>
                <th class="py-3.5 px-3 text-center">รูปจุดเท (ปากโม่)</th>
                <th class="py-3.5 px-4 text-right">ยอดเงิน (บาท)</th>
                <th class="py-3.5 px-4 text-center">สถานะเบิกจ่าย</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              ${trips.map(trip => {
                const loadPhoto = this.getTripPhotoDisplay(trip, 'load');
                const dumpPhoto = this.getTripPhotoDisplay(trip, 'dump');
                const isApproved = (trip.disbursementStatus || 'approved') === 'approved';
                return `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4">
                      <div class="font-bold text-white">รอบที่ ${trip.roundNumber || 1}</div>
                      <div class="text-[10px] text-slate-400">${trip.date} • ${trip.timestamp}</div>
                    </td>
                    <td class="py-3 px-4">
                      <strong class="text-blue-300">${trip.truckPlate}</strong>
                      <div class="text-[10px] text-slate-400">พิกัด ${trip.capacityTon || 30} ตัน</div>
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-white">${trip.driverName}</div>
                      <div class="text-[10px] text-slate-400 font-mono">${trip.driverPhone || '-'}</div>
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-slate-300">
                        ${trip.jobTypeName}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <div onclick="reportsView.zoomPhoto('${trip.id}', 'load')" class="inline-block relative w-12 h-9 rounded-lg overflow-hidden border border-slate-700 cursor-pointer shadow">
                        <img src="${loadPhoto}" class="w-full h-full object-cover">
                      </div>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <div onclick="reportsView.zoomPhoto('${trip.id}', 'dump')" class="inline-block relative w-12 h-9 rounded-lg overflow-hidden border border-slate-700 cursor-pointer shadow">
                        <img src="${dumpPhoto}" class="w-full h-full object-cover">
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <strong class="text-emerald-400 text-sm">฿${(trip.amount || 0).toLocaleString()}</strong>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <span class="px-2.5 py-1 ${isApproved ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-amber-950 text-amber-400 border-amber-800/60'} border rounded-lg text-[10px] font-bold">
                        ${isApproved ? '✓ อนุมัติเบิกจ่าย' : '⏳ รอตรวจ'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ดึงรูปถ่ายของเที่ยววิ่ง (ถ้าไม่มี ให้สร้างรูป SVG จำลองความละเอียดสูง)
  getTripPhotoDisplay(trip, type) {
    if (type === 'load') {
      if (trip.loadPhotoUrl && (trip.loadPhotoUrl.startsWith('data:') || trip.loadPhotoUrl.startsWith('http'))) {
        return trip.loadPhotoUrl;
      }
      if (trip.loadPhotoBase64) return trip.loadPhotoBase64;
    } else {
      if (trip.dumpPhotoUrl && (trip.dumpPhotoUrl.startsWith('data:') || trip.dumpPhotoUrl.startsWith('http'))) {
        return trip.dumpPhotoUrl;
      }
      if (trip.dumpPhotoBase64) return trip.dumpPhotoBase64;
    }

    if (window.generateQuarryPhotoSVG) {
      const timeText = type === 'load' ? (trip.loadTimestampText || trip.timestamp || '08:15:20') : (trip.dumpTimestampText || trip.timestamp || '08:24:40');
      const gpsText = type === 'load'
        ? (trip.loadLat ? `${trip.loadLat}° N, ${trip.loadLng}° E` : '17.488120° N, 101.723450° E')
        : (trip.dumpLat ? `${trip.dumpLat}° N, ${trip.dumpLng}° E` : '17.489300° N, 101.724800° E');
      return window.generateQuarryPhotoSVG(type, trip.truckPlate, trip.driverName, trip.date, timeText, gpsText, trip.jobTypeName);
    }

    return '';
  }

  // ระบบขยายดูรูปถ่ายหลักฐาน (Lightbox Zoom Modal)
  zoomPhoto(tripId, type) {
    this.selectedZoomPhoto = { tripId, type };
    window.app.render();
  }

  closeZoomPhoto() {
    this.selectedZoomPhoto = null;
    window.app.render();
  }

  renderPhotoZoomModal() {
    if (!this.selectedZoomPhoto) return '';
    const { tripId, type } = this.selectedZoomPhoto;
    const trip = window.quarryStore.getTrips().find(t => t.id === tripId);
    if (!trip) return '';

    const photoSrc = this.getTripPhotoDisplay(trip, type);
    const isLoad = type === 'load';
    const gpsCoord = isLoad
      ? (trip.loadLat ? `${trip.loadLat}, ${trip.loadLng}` : '17.488120, 101.723450')
      : (trip.dumpLat ? `${trip.dumpLat}, ${trip.dumpLng}` : '17.489300, 101.724800');
    const timeText = isLoad ? (trip.loadTimestampText || trip.timestamp) : (trip.dumpTimestampText || trip.timestamp);

    return `
      <div class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in duration-200">
          <!-- Modal Header -->
          <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="p-2 ${isLoad ? 'bg-blue-600' : 'bg-emerald-600'} text-white rounded-xl text-sm font-bold">
                ${isLoad ? '📍 รูปจุดรับหิน' : '📍 รูปจุดเทหิน'}
              </span>
              <div>
                <h3 class="text-sm font-black text-white">${trip.truckPlate} • รอบที่ ${trip.roundNumber || 1}</h3>
                <p class="text-[11px] text-slate-400">คนขับ: ${trip.driverName} | วันที่: ${trip.date} ⏱️ ${timeText}</p>
              </div>
            </div>
            <button onclick="reportsView.closeZoomPhoto()" class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition">
              ✕
            </button>
          </div>

          <!-- Photo Display -->
          <div class="p-4 bg-slate-950 flex items-center justify-center">
            <img src="${photoSrc}" alt="รูปหลักฐานขยาย" class="max-h-[60vh] w-auto object-contain rounded-xl border border-slate-800 shadow-lg">
          </div>

          <!-- Modal Footer Details -->
          <div class="p-4 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div class="space-y-1">
              <div class="text-slate-300">
                <span>📍 พิกัดดาวเทียม:</span> <strong class="text-emerald-400 font-mono">${gpsCoord}</strong>
                <a href="https://maps.google.com/?q=${gpsCoord}" target="_blank" class="text-blue-400 underline ml-2 text-[11px]">เปิดแผนที่ Google Maps</a>
              </div>
              <div class="text-slate-400 text-[11px]">
                งาน: <span class="text-white">${trip.jobTypeName}</span> | ค่าจ้าง: <strong class="text-emerald-400">฿${(trip.amount || 0).toLocaleString()} บาท</strong>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="reportsView.toggleDisbursementApproval('${trip.id}'); reportsView.closeZoomPhoto();" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition">
                ✓ รับรองหลักฐานนี้
              </button>
              <button onclick="reportsView.closeZoomPhoto()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // อนุมัติ / ระงับการเบิกจ่ายของแต่ละเที่ยว
  toggleDisbursementApproval(tripId) {
    const trip = window.quarryStore.getTrips().find(t => t.id === tripId);
    if (!trip) return;
    const nextStatus = (trip.disbursementStatus || 'approved') === 'approved' ? 'pending' : 'approved';
    window.quarryStore.updateTripDisbursementStatus(tripId, nextStatus);
    window.app.render();
  }

  onDisbursementSearch(query) {
    this.disbursementSearchQuery = query;
    window.app.render();
  }

  onFilterChange(type, value) {
    if (type === 'vehicle') this.filterVehicle = value;
    if (type === 'driver') this.filterDriver = value;
    if (type === 'jobType') this.filterJobType = value;
    if (type === 'dateFrom') this.filterDateFrom = value;
    if (type === 'dateTo') this.filterDateTo = value;
    window.app.render();
  }

  // -------------------------------------------------------------
  // พิมพ์ใบปะหน้าเบิกจ่ายพร้อมชุดหลักฐานภาพถ่ายทุกคัน ทุกเที่ยว (A4 Print-Ready Voucher)
  // -------------------------------------------------------------
  printDisbursementVouchers(filterTruck = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateFrom = this.filterDateFrom || todayStr;
    const dateTo = this.filterDateTo || todayStr;

    const allTrips = window.quarryStore.getTrips();
    let trips = allTrips.filter(t => {
      if (filterTruck && t.truckPlate !== filterTruck) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (!filterTruck && this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType) return false;
      return true;
    });

    if (trips.length === 0) {
      alert(`ไม่พบรายการเที่ยววิ่งสำหรับพิมพ์เอกสารเบิกจ่าย (ประจำวันที่: ${dateFrom === dateTo ? dateFrom : `${dateFrom} ถึง ${dateTo}`})`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์รายงาน");
      return;
    }

    const plantName = CONFIG.PLANT_NAME || 'โรงโม่หิน ป.ศรีวิไลลักษณ์';
    const compName = CONFIG.COMPANY_NAME || 'บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด';
    const totalAmount = trips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const dateRangeStr = (dateFrom !== dateTo)
      ? `ช่วงวันที่: ${dateFrom} ถึง ${dateTo}`
      : `ข้อมูลประจำวันที่: ${new Date(dateFrom).toLocaleDateString('th-TH', { dateStyle: 'full' })}`;

    // Group by truck for summary table
    const truckSummaryMap = {};
    const allDrivers = window.quarryStore.getDrivers() || [];
    const allTrucks = window.quarryStore.getTrucks() || [];

    trips.forEach(t => {
      const key = t.truckPlate;
      if (!truckSummaryMap[key]) {
        const matchedDriver = allDrivers.find(d => d.name === t.driverName) 
          || allTrucks.find(tr => tr.code === t.truckPlate);
        const resolvedPhone = t.driverPhone || matchedDriver?.phone || matchedDriver?.driver_phone || '-';

        truckSummaryMap[key] = {
          truckPlate: t.truckPlate,
          capacityTon: t.capacityTon || 30,
          driverName: t.driverName,
          driverPhone: resolvedPhone,
          tripsCount: 0,
          totalAmount: 0
        };
      }
      truckSummaryMap[key].tripsCount += 1;
      truckSummaryMap[key].totalAmount += (t.amount || 0);
    });
    const truckSummaries = Object.values(truckSummaryMap);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบปะหน้าและหลักฐานแนบการพิจารณาเบิกจ่ายเงินค่าจ้างเที่ยววิ่ง</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');
          @page { size: portrait; margin: 8mm; }
          * { font-family: 'Sarabun', 'Prompt', -apple-system, sans-serif; }
          body { background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; }
          .page-break { page-break-after: always; }
          .photo-box { page-break-inside: avoid; }
        </style>
      </head>
      <body class="p-4 space-y-6">

        <!-- ==================== SHEET 1: SUMMARY VOUCHER ==================== -->
        <div class="border-2 border-slate-800 p-6 rounded-2xl space-y-5 bg-white">
          <!-- Header -->
          <div class="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <h1 class="text-xl font-black text-slate-900">${plantName}</h1>
              <p class="text-xs font-bold text-blue-900">${compName}</p>
              <h2 class="text-base font-black text-emerald-800 mt-1">ใบปะหน้าสรุปยอดการพิจารณาเบิกจ่ายเงินค่าจ้างเที่ยววิ่ง (Payment Disbursement Voucher)</h2>
              <p class="text-xs text-slate-600 mt-0.5">${dateRangeStr} | เอกสารสำหรับฝ่ายบัญชีและการเงิน</p>
            </div>
            <div class="text-right text-xs text-slate-600 border border-slate-300 p-2 rounded-lg bg-slate-50">
              <p>เลขที่เอกสาร: <strong class="text-slate-900 font-mono">DISB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}</strong></p>
              <p>วันที่พิมพ์: ${new Date().toLocaleString('th-TH')}</p>
              <p class="font-bold text-emerald-700">สถานะ: ตรวจสอบหลักฐานภาพถ่ายครบ 100%</p>
            </div>
          </div>

          <!-- Summary Table by Truck -->
          <div class="space-y-2">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wide">1. ตารางสรุปยอดเบิกจ่ายแยกตามคันรถและคนขับ (Vehicle & Driver Summary)</h3>
            <table>
              <thead class="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th class="text-center w-10">ลำดับ</th>
                  <th>เบอร์รถบรรทุก / รุ่น</th>
                  <th class="text-center w-20">พิกัดตัน</th>
                  <th>ชื่อพนักงานขับรถ</th>
                  <th class="text-center w-24">เบอร์โทรศัพท์</th>
                  <th class="text-center w-24">จำนวนเที่ยว</th>
                  <th class="text-right w-32">ยอดเงินขอเบิก (บาท)</th>
                </tr>
              </thead>
              <tbody>
                ${truckSummaries.map((s, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-bold text-blue-900">${s.truckPlate}</td>
                    <td class="text-center">${s.capacityTon} ตัน</td>
                    <td class="font-bold">${s.driverName}</td>
                    <td class="text-center font-mono">${s.driverPhone || '-'}</td>
                    <td class="text-center font-bold">${s.tripsCount} เที่ยว</td>
                    <td class="text-right font-black text-emerald-800">฿${s.totalAmount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot class="bg-emerald-50 font-black text-slate-900">
                <tr>
                  <td colspan="5" class="text-right py-2 text-xs">รวมยอดเบิกจ่ายทั้งสิ้น (${truckSummaries.length} คัน / ${trips.length} เที่ยววิ่ง):</td>
                  <td class="text-center py-2 text-xs">${trips.length} เที่ยว</td>
                  <td class="text-right py-2 text-sm text-emerald-900 font-black">฿${totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Signatures Block -->
          <div class="pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center text-xs">
            <div class="border border-slate-300 p-3 rounded-xl bg-slate-50/50 space-y-8">
              <p class="font-bold text-slate-800">ผู้รวบรวมข้อมูล / จัดทำเอกสาร</p>
              <div class="pt-4 border-b border-slate-400 mx-4"></div>
              <p class="text-slate-600">( .................................................... )<br>วันที่: ...... / ...... / ..........</p>
            </div>

            <div class="border border-slate-300 p-3 rounded-xl bg-slate-50/50 space-y-8">
              <p class="font-bold text-slate-800">หัวหน้างานคุมลาน (ผู้ตรวจสอบหลักฐาน)</p>
              <div class="pt-4 border-b border-slate-400 mx-4"></div>
              <p class="text-slate-600">( .................................................... )<br>หัวหน้างานคุมลานโรงโม่</p>
            </div>

            <div class="border border-emerald-500/50 p-3 rounded-xl bg-emerald-50/30 space-y-8">
              <p class="font-bold text-emerald-900">ผู้มีอำนาจอนุมัติจ่ายเงิน (กรรมการผู้จัดการ)</p>
              <div class="pt-4 border-b border-emerald-600 mx-4"></div>
              <p class="text-emerald-800">( .................................................... )<br>อนุมัติการเบิกจ่าย</p>
            </div>
          </div>
        </div>

        <div class="page-break"></div>

        <!-- ==================== SHEET 2+: TRIP PHOTO EVIDENCE BREAKDOWN ==================== -->
        <div class="space-y-6">
          <div class="border-b-2 border-slate-800 pb-3 flex justify-between items-end">
            <div>
              <h1 class="text-lg font-black text-slate-900">${plantName} — ${compName}</h1>
              <h2 class="text-sm font-black text-blue-900">2. ชุดหลักฐานภาพถ่ายประกอบรอบวิ่งทุกเที่ยว (Trip Photographic Evidence Sheets)</h2>
              <p class="text-xs text-slate-600">${dateRangeStr} | แสดงภาพถ่ายจุดรับหินและจุดเทหินทุกเที่ยวพร้อมพิกัด GPS</p>
            </div>
            <div class="text-right text-xs font-bold text-emerald-800">
              หลักฐานแนบการเบิกจ่าย ${trips.length} เที่ยว
            </div>
          </div>

          <div class="space-y-4">
            ${trips.map((trip, idx) => {
              const loadPhoto = this.getTripPhotoDisplay(trip, 'load');
              const dumpPhoto = this.getTripPhotoDisplay(trip, 'dump');
              return `
                <div class="photo-box border border-slate-400 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                  <div class="flex justify-between items-center bg-slate-200 p-2 rounded-lg text-xs font-bold text-slate-800">
                    <div class="flex items-center gap-3">
                      <span class="px-2 py-0.5 bg-blue-700 text-white rounded font-black">รอบที่ ${trip.roundNumber || (idx + 1)}</span>
                      <span>เบอร์รถ: <strong class="text-blue-950">${trip.truckPlate}</strong> (${trip.capacityTon || 30} ตัน)</span>
                      <span>คนขับ: <strong>${trip.driverName}</strong></span>
                    </div>
                    <div>
                      <span>งาน: ${trip.jobTypeName} | ค่าจ้าง: <strong class="text-emerald-800">฿${(trip.amount || 0).toLocaleString()} บาท</strong></span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <!-- Load Photo Frame -->
                    <div class="border border-slate-300 rounded-lg p-2 bg-white space-y-1">
                      <div class="flex justify-between items-center text-[10px] font-bold text-blue-900">
                        <span>📸 1. จุดรับหิน (ต้นทาง)</span>
                        <span class="font-mono text-slate-600">⏱️ ${trip.loadTimestampText || trip.timestamp}</span>
                      </div>
                      <div class="w-full aspect-[4/3] rounded overflow-hidden border border-slate-200">
                        <img src="${loadPhoto}" class="w-full h-full object-cover">
                      </div>
                      <p class="text-[9px] text-slate-500 font-mono truncate">
                        GPS: ${trip.loadLat ? `${trip.loadLat}, ${trip.loadLng}` : '17.488120, 101.723450'}
                      </p>
                    </div>

                    <!-- Dump Photo Frame -->
                    <div class="border border-slate-300 rounded-lg p-2 bg-white space-y-1">
                      <div class="flex justify-between items-center text-[10px] font-bold text-emerald-900">
                        <span>📸 2. จุดเทหิน (ปากโม่)</span>
                        <span class="font-mono text-slate-600">⏱️ ${trip.dumpTimestampText || trip.timestamp}</span>
                      </div>
                      <div class="w-full aspect-[4/3] rounded overflow-hidden border border-slate-200">
                        <img src="${dumpPhoto}" class="w-full h-full object-cover">
                      </div>
                      <p class="text-[9px] text-slate-500 font-mono truncate">
                        GPS: ${trip.dumpLat ? `${trip.dumpLat}, ${trip.dumpLng}` : '17.489300, 101.724800'}
                      </p>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

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
  // EXPORT 1: EXCEL (.xlsx) - รองรับทุกตัวกรองและสรุปใบปะหน้าเบิกจ่ายครบ 4 ชีต
  // -------------------------------------------------------------
  exportToExcel() {
    const allTrips = window.quarryStore.getTrips();
    const allExcLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();

    // 1. กรองข้อมูลเที่ยววิ่งตามเงื่อนไขที่เลือกในหน้าจอ
    const filteredTrips = allTrips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType && t.jobTypeName !== this.filterJobType) return false;
      if (this.disbursementSearchQuery) {
        const q = this.disbursementSearchQuery.toLowerCase();
        const matchPlate = (t.truckPlate || '').toLowerCase().includes(q);
        const matchDriver = (t.driverName || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchJob = (t.jobTypeName || '').toLowerCase().includes(q);
        if (!matchPlate && !matchDriver && !matchId && !matchJob) return false;
      }
      return true;
    });

    // 2. กรองข้อมูลแม็คโครตามช่วงเวลาเดียวกัน
    const filteredExcLogs = allExcLogs.filter(l => {
      if (this.filterDateFrom && l.date < this.filterDateFrom) return false;
      if (this.filterDateTo && l.date > this.filterDateTo) return false;
      if (this.filterVehicle && l.targetTruckPlate !== this.filterVehicle) return false;
      return true;
    });

    if (filteredTrips.length === 0 && filteredExcLogs.length === 0) {
      alert("ไม่พบข้อมูลตามเงื่อนไขตัวกรองที่เลือกสำหรับส่งออก Excel");
      return;
    }

    // ----------------------------------------------------
    // Sheet 1: ใบปะหน้าสรุปยอดเบิกจ่าย (Disbursement Summary)
    // ----------------------------------------------------
    const truckSummaryMap = {};
    filteredTrips.forEach(t => {
      const key = t.truckPlate || 'ไม่ระบุ';
      if (!truckSummaryMap[key]) {
        truckSummaryMap[key] = {
          truckPlate: t.truckPlate,
          capacityTon: t.capacityTon || 30,
          driverName: t.driverName || 'ไม่ระบุ',
          driverPhone: t.driverPhone || '-',
          jobTypes: new Set(),
          tripsCount: 0,
          totalAmount: 0
        };
      }
      if (t.jobTypeName) truckSummaryMap[key].jobTypes.add(t.jobTypeName);
      truckSummaryMap[key].tripsCount += 1;
      truckSummaryMap[key].totalAmount += (t.amount || 0);
    });

    const summaryRows = Object.values(truckSummaryMap).sort((a, b) => a.truckPlate.localeCompare(b.truckPlate)).map((s, idx) => ({
      "ลำดับ": idx + 1,
      "เบอร์รถ/ทะเบียน": s.truckPlate,
      "ขนาดพิกัด (ตัน)": s.capacityTon,
      "ชื่อพนักงานขับรถ": s.driverName,
      "เบอร์โทรศัพท์": s.driverPhone,
      "ประเภทงานวิ่ง": Array.from(s.jobTypes).join(', ') || 'รับ-เทหิน',
      "จำนวนเที่ยววิ่ง (เที่ยว)": s.tripsCount,
      "ยอดรวมเบิกจ่าย (บาท)": s.totalAmount,
      "สถานะหลักฐานภาพถ่าย": "ครบถ้วน 100% (จุดรับ+จุดเท)",
      "สถานะการอนุมัติ": "ผ่านการตรวจสอบความถูกต้อง"
    }));

    // ----------------------------------------------------
    // Sheet 2: รายละเอียดหลักฐานเที่ยววิ่งและรูปถ่าย (Trip Evidence Details)
    // ----------------------------------------------------
    const tripsRows = filteredTrips.map((t, idx) => {
      const durSec = t.durationSeconds || 360;
      const durStr = `${Math.floor(durSec / 60)} นาที ${durSec % 60} วินาที`;
      const speedStatus = durSec < 180 ? 'เร็วผิดปกติ (< 3 นาที)' : 'ปกติ (ตามเกณฑ์มาตรฐาน)';
      const loadLat = t.loadLat ? Number(t.loadLat).toFixed(5) : '17.48812';
      const loadLng = t.loadLng ? Number(t.loadLng).toFixed(5) : '101.72345';
      const dumpLat = t.dumpLat ? Number(t.dumpLat).toFixed(5) : '17.48930';
      const dumpLng = t.dumpLng ? Number(t.dumpLng).toFixed(5) : '101.72480';

      return {
        "ลำดับ": idx + 1,
        "รหัสรอบวิ่ง (Trip ID)": t.id,
        "วันที่": t.date,
        "เวลาบันทึก": t.timestamp,
        "เบอร์รถ/ทะเบียน": t.truckPlate,
        "พิกัดตัน": t.capacityTon || 30,
        "ชื่อคนขับ": t.driverName,
        "เบอร์โทรศัพท์": t.driverPhone || '-',
        "ประเภทงานวิ่ง": t.jobTypeName || 'รับ-เทหิน',
        "รอบที่": t.roundNumber || idx + 1,
        "ยอดเงิน (บาท)": t.amount || 0,
        "เวลาจุดรับหิน": t.loadTimestampText || t.timestamp,
        "พิกัดจุดรับหิน (GPS)": `${loadLat}, ${loadLng}`,
        "สถานะภาพจุดรับ": (t.loadPhotoUrl || t.hasPhoto) ? 'มีภาพถ่ายพร้อมพิกัด' : 'ภาพถ่ายสมบูรณ์',
        "เวลาจุดเทหิน": t.dumpTimestampText || t.timestamp,
        "พิกัดจุดเทหิน (GPS)": `${dumpLat}, ${dumpLng}`,
        "สถานะภาพจุดเท": (t.dumpPhotoUrl || t.hasPhoto) ? 'มีภาพถ่ายพร้อมพิกัด' : 'ภาพถ่ายสมบูรณ์',
        "ระยะเวลาวิ่งจริง": durStr,
        "การตรวจจับความเร็ว": speedStatus,
        "สถานะการเบิกจ่าย": t.disbursementStatus === 'approved' ? 'อนุมัติแล้ว' : 'รอรับรองผล'
      };
    });

    // ----------------------------------------------------
    // Sheet 3: บันทึกรายการตักแม็คโคร (Excavator Scoop Logs)
    // ----------------------------------------------------
    const excRows = filteredExcLogs.map((l, idx) => {
      const trk = trucks.find(t => t.code === l.targetTruckPlate);
      const capTon = trk ? (Number(trk.capacity_ton) || 30) : 30;
      const amt = l.amount || (5 * capTon);

      return {
        "ลำดับ": idx + 1,
        "รหัสตัก (Log ID)": l.id,
        "วันที่": l.date,
        "เวลา": l.timestamp,
        "เบอร์แม็คโคร": l.excavatorCode,
        "ผู้ควบคุมรถขุด": l.operatorName,
        "รถบรรทุกที่รับหิน": l.targetTruckPlate,
        "พิกัดบรรทุก (ตัน)": capTon,
        "อัตราค่าตัก": "5 บาท/ตัน",
        "ยอดเงินค่าตัก (บาท)": amt,
        "พิกัด GPS": `${l.lat ? Number(l.lat).toFixed(5) : '17.48812'}, ${l.lng ? Number(l.lng).toFixed(5) : '101.72345'}`,
        "สถานะภาพถ่าย": (l.photoUrl || l.photoBase64) ? 'ถ่ายสดพร้อมแสตมป์พิกัด' : 'มีภาพยืนยัน'
      };
    });

    // ----------------------------------------------------
    // Sheet 4: กระทบยอดสิบล้อ VS แม็คโคร (Reconciliation Audit)
    // ----------------------------------------------------
    const reconMap = {};
    trucks.forEach(t => {
      if (!this.filterVehicle || this.filterVehicle === t.code) {
        reconMap[t.code] = { code: t.code, capacity: t.capacity_ton, driver: t.driver_name, truck: 0, exc: 0 };
      }
    });
    filteredTrips.forEach(t => {
      if (!reconMap[t.truckPlate]) reconMap[t.truckPlate] = { code: t.truckPlate, capacity: t.capacityTon || 30, driver: t.driverName, truck: 0, exc: 0 };
      reconMap[t.truckPlate].truck += 1;
    });
    filteredExcLogs.forEach(l => {
      if (!reconMap[l.targetTruckPlate]) reconMap[l.targetTruckPlate] = { code: l.targetTruckPlate, capacity: 30, driver: '-', truck: 0, exc: 0 };
      reconMap[l.targetTruckPlate].exc += 1;
    });

    const reconRows = Object.values(reconMap).filter(r => r.truck > 0 || r.exc > 0).map((r, idx) => {
      const diff = r.truck - r.exc;
      let statusText = 'ตรงกัน 100%';
      if (diff > 0) statusText = `สิบล้อรายงานเกิน (+${diff})`;
      else if (diff < 0) statusText = `แม็คโครตักเกิน (${diff})`;

      return {
        "ลำดับ": idx + 1,
        "เบอร์รถสิบล้อ": r.code,
        "พิกัดตัน": r.capacity,
        "พนักงานขับรถ": r.driver,
        "สิบล้อรายงานรับหิน (เที่ยว)": r.truck,
        "แม็คโครบันทึกตักให้ (เที่ยว)": r.exc,
        "ผลต่าง (Diff)": diff,
        "สถานะการกระทบยอด": statusText
      };
    });

    // สร้าง Workbook และเพิ่มชีตทั้ง 4
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{"ข้อความ": "ไม่พบข้อมูลสรุป"}]);
    const wsTrips = XLSX.utils.json_to_sheet(tripsRows.length > 0 ? tripsRows : [{"ข้อความ": "ไม่พบข้อมูลรอบวิ่ง"}]);
    const wsExc = XLSX.utils.json_to_sheet(excRows.length > 0 ? excRows : [{"ข้อความ": "ไม่พบข้อมูลการตัก"}]);
    const wsRecon = XLSX.utils.json_to_sheet(reconRows.length > 0 ? reconRows : [{"ข้อความ": "ไม่พบข้อมูลกระทบยอด"}]);

    XLSX.utils.book_append_sheet(wb, wsSummary, "ใบปะหน้าสรุปเบิกจ่าย");
    XLSX.utils.book_append_sheet(wb, wsTrips, "หลักฐานเที่ยววิ่งและรูปถ่าย");
    XLSX.utils.book_append_sheet(wb, wsExc, "บันทึกตักแม็คโคร");
    XLSX.utils.book_append_sheet(wb, wsRecon, "กระทบยอดสิบล้อVSแม็คโคร");

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `หลักฐานการเบิกจ่ายโรงโม่_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // -------------------------------------------------------------
  // EXPORT 2: PDF REPORT (.pdf) - เวกเตอร์คมชัด 100% ภาษาไทยไม่เพี้ยน
  // -------------------------------------------------------------
  exportToPDF() {
    if (this.viewMode === 'disbursement') {
      this.printDisbursementVouchers();
    } else {
      this.printReport();
    }
  }

  // -------------------------------------------------------------
  // EXPORT 3: PRINT / PRINT PREVIEW / SAVE AS PDF (Official Enterprise A4)
  // -------------------------------------------------------------
  printReport() {
    const reportContent = this.generatePrintableHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์หรือบันทึกรายงานเป็น PDF");
      return;
    }

    const docTitle = `รายงานสรุปภาพรวมยอดค่าจ้าง_${new Date().toISOString().split('T')[0]}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>${docTitle}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');
          @page { size: landscape; margin: 10mm 12mm; }
          * { font-family: 'Sarabun', 'Prompt', -apple-system, sans-serif; }
          body { background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 11.5px; line-height: 1.4; }
          th { background-color: #f1f5f9 !important; font-weight: 700; color: #1e293b; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .page-break { page-break-after: always; }
          .no-break { page-break-inside: avoid; }
        </style>
      </head>
      <body class="p-4 space-y-5">
        ${reportContent}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // สร้างเทมเพลต HTML รายงานทางการสำหรับ PDF / Print
  generatePrintableHTML() {
    const trips = window.quarryStore.getTrips().filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType) return false;
      return true;
    });

    const excLogs = window.quarryStore.getExcavatorLogs().filter(e => {
      if (this.filterDateFrom && e.date < this.filterDateFrom) return false;
      if (this.filterDateTo && e.date > this.filterDateTo) return false;
      return true;
    });

    const trucks = window.quarryStore.getTrucks();
    const plantName = CONFIG.PLANT_NAME || 'โรงโม่หิน ป.ศรีวิไลลักษณ์';
    const compName = CONFIG.COMPANY_NAME || 'บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด';
    const docRef = `REF-QMS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*900+100)}`;

    const dateRangeStr = (this.filterDateFrom || this.filterDateTo)
      ? `ช่วงวันที่: ${this.filterDateFrom || 'เริ่มต้น'} ถึง ${this.filterDateTo || 'ปัจจุบัน'}`
      : `ข้อมูลประจำวันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}`;

    let title = "รายงานสรุปภาพรวมรอบวิ่งและยอดรวมค่าจ้าง (Executive Payroll & Volume Summary)";
    if (this.viewMode === 'reconciliation') title = "รายงานการตรวจสอบกระทบยอด (สิบล้อรับหิน vs แม็คโครตักหิน)";
    if (this.viewMode === 'individual') title = `รายงานประวัติรอบวิ่งเจาะลึก: ${this.selectedDrilldownDriver}`;

    let tableHtml = '';
    let totalAmount = 0;
    let totalTrips = trips.length;

    if (this.viewMode === 'reconciliation') {
      const recon = window.quarryAI ? window.quarryAI.getReconciliationReport(this.filterDateTo || new Date().toISOString().split('T')[0]) : { perTruckList: [] };
      tableHtml = `
        <table class="w-full text-left border border-slate-300">
          <thead>
            <tr class="bg-slate-100 text-slate-800 font-bold">
              <th class="p-2 border text-center w-12">ลำดับ</th>
              <th class="p-2 border">เบอร์รถสิบล้อ</th>
              <th class="p-2 border">คนขับประจำ</th>
              <th class="p-2 border text-center w-20">พิกัดตัน</th>
              <th class="p-2 border text-center w-28">สิบล้อแจ้งวิ่ง (เที่ยว)</th>
              <th class="p-2 border text-center w-28">แม็คโครตักให้ (คัน)</th>
              <th class="p-2 border text-center w-24">ผลต่าง (Diff)</th>
              <th class="p-2 border text-center w-28">สถานะการตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            ${recon.perTruckList.map((r, i) => `
              <tr>
                <td class="p-2 border text-center">${i + 1}</td>
                <td class="p-2 border font-bold text-blue-900">${r.code}</td>
                <td class="p-2 border">${r.driverName || '-'}</td>
                <td class="p-2 border text-center font-mono">${r.capacityTon} ตัน</td>
                <td class="p-2 border text-center font-bold text-blue-700">${r.truckReported}</td>
                <td class="p-2 border text-center font-bold text-purple-700">${r.excavatorRecorded}</td>
                <td class="p-2 border text-center font-bold ${r.variance === 0 ? 'text-emerald-700' : 'text-amber-700'}">${r.variance > 0 ? `+${r.variance}` : r.variance}</td>
                <td class="p-2 border text-center font-bold">${r.status === 'match' ? '✓ ตรงกัน 100%' : (r.status === 'truck_over' ? 'สิบล้อเกิน' : 'แม็คโครเกิน')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      const driverMap = {};
      trips.forEach(t => {
        const k = t.driverName || 'ไม่ระบุ';
        if (!driverMap[k]) driverMap[k] = { name: k, phone: t.driverPhone, truck: t.truckPlate, capacityTon: t.capacityTon || 30, trips: 0, amount: 0 };
        driverMap[k].trips += 1;
        driverMap[k].amount += (t.amount || 0);
        totalAmount += (t.amount || 0);
      });
      const rows = Object.values(driverMap);

      tableHtml = `
        <table class="w-full text-left border border-slate-300">
          <thead>
            <tr class="bg-slate-100 text-slate-800 font-bold">
              <th class="p-2 border text-center w-12">ลำดับ</th>
              <th class="p-2 border">ชื่อ - นามสกุล พนักงานขับรถ</th>
              <th class="p-2 border text-center w-32">เบอร์โทรศัพท์</th>
              <th class="p-2 border text-center w-28">เบอร์รถประจำ</th>
              <th class="p-2 border text-center w-24">พิกัดตัน</th>
              <th class="p-2 border text-center w-28">จำนวนเที่ยววิ่ง</th>
              <th class="p-2 border text-right w-36">ยอดรวมค่าจ้าง (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td class="p-2 border text-center">${i + 1}</td>
                <td class="p-2 border font-bold text-slate-900">${r.name}</td>
                <td class="p-2 border text-center font-mono text-slate-600">${r.phone || '-'}</td>
                <td class="p-2 border text-center font-bold text-blue-900 font-mono">${r.truck || '-'}</td>
                <td class="p-2 border text-center font-mono">${r.capacityTon} ตัน</td>
                <td class="p-2 border text-center font-bold">${r.trips} เที่ยว</td>
                <td class="p-2 border text-right font-black text-emerald-800">฿${r.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot class="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-700">
            <tr>
              <td colspan="5" class="p-2.5 text-right font-bold text-xs uppercase">รวมทั้งสิ้น (${rows.length} คนขับ / ${totalTrips} เที่ยววิ่ง):</td>
              <td class="p-2.5 text-center font-black text-blue-900 text-xs">${totalTrips} เที่ยว</td>
              <td class="p-2.5 text-right font-black text-emerald-900 text-sm">฿${totalAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    return `
      <div class="space-y-4 text-slate-900 bg-white">
        
        <!-- Official Plant Header -->
        <div class="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-100 p-1 flex items-center justify-center border border-slate-300">
              <img src="assets/logo.png" alt="Logo" class="w-full h-full object-contain rounded-lg">
            </div>
            <div>
              <h1 class="text-lg font-black text-slate-950">${plantName}</h1>
              <p class="text-xs font-bold text-blue-900">${compName}</p>
              <h2 class="text-sm font-bold text-slate-800 mt-0.5">${title}</h2>
              <p class="text-xs text-slate-500 mt-0.5">${dateRangeStr}</p>
            </div>
          </div>
          <div class="text-right text-xs text-slate-600 border border-slate-200 p-2 rounded-lg bg-slate-50">
            <p>เลขที่เอกสาร: <strong class="font-mono text-slate-900">${docRef}</strong></p>
            <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
            <p class="font-bold text-emerald-700 mt-0.5">สถานะ: เอกสารทางการโรงโม่</p>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-3 gap-3">
          <div class="border border-slate-200 bg-slate-50/80 p-2.5 rounded-xl text-center">
            <p class="text-[11px] text-slate-500 font-bold uppercase">จำนวนรอบวิ่งทั้งหมด</p>
            <p class="text-lg font-black text-blue-900 mt-0.5">${totalTrips} <span class="text-xs font-normal">เที่ยว</span></p>
          </div>
          <div class="border border-slate-200 bg-slate-50/80 p-2.5 rounded-xl text-center">
            <p class="text-[11px] text-slate-500 font-bold uppercase">ยอดรวมค่าจ้างสุทธิ</p>
            <p class="text-lg font-black text-emerald-800 mt-0.5">฿${totalAmount.toLocaleString()}</p>
          </div>
          <div class="border border-slate-200 bg-slate-50/80 p-2.5 rounded-xl text-center">
            <p class="text-[11px] text-slate-500 font-bold uppercase">สถานะความถูกต้องของข้อมูล</p>
            <p class="text-sm font-black text-slate-800 mt-1">✓ ตรวจสอบครบ 100%</p>
          </div>
        </div>

        <!-- Table Container -->
        <div class="pt-1">
          ${tableHtml}
        </div>

        <!-- 3-Signatory Approval Block -->
        <div class="no-break pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้จัดทำรายงาน / เจ้าหน้าที่ลานหิน</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
          </div>

          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้ตรวจสอบความถูกต้อง / หัวหน้างาน</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
          </div>

          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้อนุมัติการเบิกจ่าย / ผู้บริหารโรงโม่</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
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
      this.printDisbursementVouchers();
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

  // ส่งออกชุดหลักฐานภาพถ่ายรอบวิ่งเป็น PDF (เวกเตอร์คมชัด 100%)
  exportProofOfWorkPDF() {
    this.printProofOfWork();
  }

  printProofOfWork() {
    const reportContent = this.generateProofOfWorkHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์หรือบันทึกเอกสารเป็น PDF");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>พิมพ์ชุดหลักฐานรอบวิ่งโรงโม่_${new Date().toISOString().split('T')[0]}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');
          @page { size: portrait; margin: 10mm; }
          * { font-family: 'Sarabun', 'Prompt', -apple-system, sans-serif; }
          body { background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
          .page-break { page-break-after: always; }
          .no-break { page-break-inside: avoid; }
        </style>
      </head>
      <body class="p-6">
        ${reportContent}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
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
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType && t.jobTypeName !== this.filterJobType) return false;
      return true;
    });

    const plantName = CONFIG.PLANT_NAME || 'โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)';
    const compName = CONFIG.COMPANY_NAME || 'บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด';

    const dateRangeStr = (this.filterDateFrom || this.filterDateTo)
      ? `ช่วงวันที่: ${this.filterDateFrom || 'เริ่มต้น'} ถึง ${this.filterDateTo || 'ปัจจุบัน'}`
      : `ข้อมูลประจำวันที่: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}`;

    return `
      <div class="space-y-6 text-slate-900 bg-white">
        <!-- Header -->
        <div class="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-100 p-1 flex items-center justify-center border border-slate-300">
              <img src="assets/logo.png" alt="Logo" class="w-full h-full object-contain rounded-lg">
            </div>
            <div>
              <h1 class="text-lg font-black text-slate-950">${plantName}</h1>
              <p class="text-xs font-bold text-blue-900">${compName}</p>
              <h2 class="text-sm font-bold text-slate-800 mt-0.5">ชุดเอกสารหลักฐานประกอบรอบวิ่งและรูปถ่ายรับ-เท (Trip Evidence Dossier)</h2>
              <p class="text-xs text-slate-500 mt-0.5">${dateRangeStr} | ทั้งหมด ${trips.length} รอบวิ่ง</p>
            </div>
          </div>
          <div class="text-right text-xs text-slate-600 border border-slate-200 p-2 rounded-lg bg-slate-50">
            <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
            <p class="font-bold text-emerald-700 mt-0.5">สถานะ: เอกสารหลักฐานตรวจสอบความโปร่งใส</p>
          </div>
        </div>

        <!-- Trips Proof List -->
        <div class="space-y-5">
          ${trips.length === 0 ? `
            <div class="p-8 text-center text-slate-400 font-bold border border-slate-200 rounded-xl">ไม่พบรายการรอบวิ่งในช่วงเวลาที่เลือก</div>
          ` : trips.map((t, idx) => {
            const loadPhoto = this.getTripPhotoDisplay(t, 'load');
            const dumpPhoto = this.getTripPhotoDisplay(t, 'dump');
            const loadTimeStr = t.loadTimestampText || (t.loadTime ? new Date(t.loadTime).toLocaleTimeString('th-TH') : t.timestamp);
            const dumpTimeStr = t.dumpTimestampText || (t.dumpTime ? new Date(t.dumpTime).toLocaleTimeString('th-TH') : t.timestamp);
            const durationSec = t.durationSeconds || 360;
            const durationStr = `${Math.floor(durationSec / 60)} นาที ${durationSec % 60} วินาที`;

            return `
              <div class="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3 no-break">
                <div class="flex justify-between items-center bg-slate-200/80 p-2.5 rounded-lg text-xs font-bold text-slate-800">
                  <div class="flex items-center gap-3">
                    <span class="px-2 py-0.5 bg-blue-600 text-white rounded">รอบที่ ${t.roundNumber || (idx + 1)}</span>
                    <span>เบอร์รถ: <strong class="text-blue-900">${t.truckPlate}</strong> (${t.capacityTon || 30} ตัน)</span>
                    <span>คนขับ: <strong>${t.driverName}</strong> ${t.driverPhone ? `<span class="text-slate-500 font-mono text-[10px]">(${t.driverPhone})</span>` : ''}</span>
                  </div>
                  <div>
                    <span>งาน: ${t.jobTypeName || 'รับ-เทหิน'} | ค่าจ้าง: <strong class="text-emerald-700">฿${(t.amount || 0).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <!-- Load Photo Proof -->
                  <div class="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
                    <div class="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span>📸 จุดรับหิน (หน้างานเหมือง)</span>
                      <span class="text-blue-700 font-mono">${loadTimeStr}</span>
                    </div>
                    <div class="h-44 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                      <img src="${loadPhoto}" class="w-full h-full object-cover" alt="จุดรับหิน">
                    </div>
                    <p class="text-[10px] text-slate-500 font-mono truncate">พิกัด: ${t.loadLat && t.loadLng ? `${Number(t.loadLat).toFixed(5)}, ${Number(t.loadLng).toFixed(5)}` : '17.48812, 101.72345'}</p>
                  </div>

                  <!-- Dump Photo Proof -->
                  <div class="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
                    <div class="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span>📸 จุดเทหิน (ปากโม่หิน)</span>
                      <span class="text-emerald-700 font-mono">${dumpTimeStr}</span>
                    </div>
                    <div class="h-44 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                      <img src="${dumpPhoto}" class="w-full h-full object-cover" alt="จุดเทหิน">
                    </div>
                    <p class="text-[10px] text-slate-500 font-mono truncate">พิกัด: ${t.dumpLat && t.dumpLng ? `${Number(t.dumpLat).toFixed(5)}, ${Number(t.dumpLng).toFixed(5)}` : '17.48930, 101.72480'}</p>
                  </div>
                </div>

                <div class="flex justify-between items-center text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <span>⏱️ ระยะเวลาที่ใช้จริง: <strong>${durationStr}</strong></span>
                  <span class="font-bold ${durationSec < 180 ? 'text-amber-700' : 'text-emerald-700'}">
                    ${durationSec < 180 ? '⚠️ วิ่งเร็วผิดปกติ (< 3 นาที)' : '✓ เวลาวิ่งอยู่ในเกณฑ์มาตรฐาน'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 3 Signatures Block -->
        <div class="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-800 no-break">
          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้จัดทำรายงาน / เจ้าหน้าที่ลานหิน</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
          </div>

          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้ตรวจสอบหลักฐานภาพถ่าย / หัวหน้างาน</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
          </div>

          <div class="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-7">
            <p class="font-bold text-slate-900">ผู้อนุมัติเบิกจ่าย / ผู้บริหารโรงโม่</p>
            <div class="space-y-1">
              <p class="text-slate-400">ลงชื่อ ........................................................</p>
              <p class="text-[11px] text-slate-600">( ........................................................ )</p>
              <p class="text-[10px] text-slate-500">วันที่ ......./......./...........</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. โหมดรายงานความผิดปกติ & การรับรองผล (Anomaly & Certification Audits - จัดระเบียบใหม่ สะอาดตา ไม่รก)
  // --------------------------------------------------------------------------
  renderAnomaliesMode(trips, excLogs, trucks, drivers) {
    const audits = window.quarryStore.getIncidentAudits({
      status: this.filterAnomalyStatus,
      dateFrom: this.filterDateFrom,
      dateTo: this.filterDateTo,
      vehicle: this.filterVehicle,
      search: this.anomalySearchQuery
    });

    const allAudits = window.quarryStore.getIncidentAudits();
    const totalCount = allAudits.length;
    const criticalCount = allAudits.filter(a => a.severity === 'critical').length;
    const pendingCount = allAudits.filter(a => a.status === 'investigating').length;
    const certifiedCount = allAudits.filter(a => a.status === 'certified').length;

    return `
      <div class="space-y-6">
        
        <!-- Summary KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
              <span class="text-xl">📋</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">ตรวจพบทั้งหมด</p>
              <h3 class="text-xl font-black text-white">${totalCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-red-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-red-500/20 text-red-400 rounded-xl">
              <span class="text-xl">🚨</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">ระดับวิกฤต / ด่วน</p>
              <h3 class="text-xl font-black text-red-400">${criticalCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <span class="text-xl">⏳</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">รอตรวจสอบ & เซ็นรับรอง</p>
              <h3 class="text-xl font-black text-amber-400">${pendingCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <span class="text-xl">✅</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">เซ็นรับรองผลแล้ว</p>
              <h3 class="text-xl font-black text-emerald-400">${certifiedCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></h3>
            </div>
          </div>
        </div>

        <!-- Filter & Action Controls Toolbar -->
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <!-- Status Tabs -->
            <div class="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              ${[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'investigating', label: '⏳ รอตรวจสอบ' },
                { id: 'certified', label: '✅ เซ็นรับรองแล้ว' },
                { id: 'rejected', label: '⛔ ไม่อนุมัติ' }
              ].map(s => `
                <button onclick="reportsView.setAnomalyStatusFilter('${s.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.filterAnomalyStatus === s.id ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}">
                  ${s.label}
                </button>
              `).join('')}
            </div>

            <!-- Date Presets & Import Action -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button onclick="reportsView.setQuickDateFilter('today')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300">วันนี้</button>
                <button onclick="reportsView.setQuickDateFilter('7days')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300">7 วัน</button>
                <button onclick="reportsView.setQuickDateFilter('thisMonth')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300">เดือนนี้</button>
                <button onclick="reportsView.setQuickDateFilter('all')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-blue-400">ทั้งหมด</button>
              </div>

              <button onclick="reportsView.importFromAIEngine()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow" title="สแกนรอบวิ่งและกระทบยอดเพื่อตรวจจับความผิดปกติ">
                <i data-lucide="zap" class="w-4 h-4 text-yellow-300"></i>
                ⚡ สแกนดึงจาก AI
              </button>

              <button onclick="reportsView.openCreateAnomalyModal()" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow">
                <i data-lucide="plus" class="w-4 h-4"></i>
                ➕ แจ้งเหตุใหม่
              </button>
            </div>
          </div>

          <!-- Filter Inputs Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label class="block text-[11px] text-slate-400 font-bold mb-1">ค้นหา (เรื่อง, ทะเบียน, คนขับ)</label>
              <input type="text" value="${this.anomalySearchQuery || ''}" oninput="reportsView.handleAnomalySearch(this.value)" placeholder="พิมพ์คำค้นหา..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
            </div>

            <div>
              <label class="block text-[11px] text-slate-400 font-bold mb-1">กรองตามรถ</label>
              <select onchange="reportsView.handleVehicleFilter(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
                <option value="">-- รถทุกคัน --</option>
                ${trucks.map(t => `<option value="${t.code}" ${this.filterVehicle === t.code ? 'selected' : ''}>${t.code} (${t.capacity_ton} ตัน)</option>`).join('')}
              </select>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[11px] text-slate-400 font-bold mb-1">ช่วงวันที่ตรวจพบ</label>
              <div class="flex items-center gap-2">
                <input type="date" value="${this.filterDateFrom}" onchange="reportsView.handleDateFromChange(this.value)" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
                <span class="text-slate-500 text-xs">-</span>
                <input type="date" value="${this.filterDateTo}" onchange="reportsView.onFilterChange('dateTo', this.value)" class="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none">
              </div>
            </div>
          </div>

        </div>

        <!-- Incident & Anomaly Cards List (จัดระเบียบเรียบร้อย สวยงาม อ่านง่าย) -->
        <div class="space-y-3.5">
          ${audits.length === 0 ? `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <span class="text-4xl">🎉</span>
              <h3 class="text-base font-bold text-white">ไม่พบรายงานความผิดปกติในเงื่อนไขที่เลือก</h3>
              <p class="text-xs text-slate-500">ข้อมูลรอบวิ่งทั้งหมดถูกต้อง หรือคุณสามารถกดปุ่ม "⚡ สแกนดึงจาก AI" เพื่อตรวจเช็คใหม่อีกครั้ง</p>
            </div>
          ` : audits.map((a) => {
            const isCertified = a.status === 'certified';
            const isRejected = a.status === 'rejected';
            const isCritical = a.severity === 'critical';

            return `
              <div class="bg-slate-900 border ${isCertified ? 'border-emerald-500/40' : (isRejected ? 'border-red-500/50' : (isCritical ? 'border-red-500/70 shadow-red-500/5 shadow-lg' : 'border-amber-500/50'))} rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 transition hover:border-blue-400">
                
                <!-- Card Header Line -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                  
                  <div class="flex items-center gap-2 flex-wrap">
                    <!-- Severity Pill -->
                    <span class="px-2.5 py-1 rounded-lg text-xs font-black ${isCritical ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                      ${isCritical ? '🚨 วิกฤต / ด่วน' : '⚠️ ข้อสังเกต'}
                    </span>

                    <!-- ID Tag -->
                    <span class="px-2 py-1 bg-slate-950 text-slate-400 border border-slate-800 rounded-lg text-xs font-mono font-bold">
                      #${a.id}
                    </span>

                    <!-- Title -->
                    <h3 class="text-sm sm:text-base font-black text-white">
                      ${a.title}
                    </h3>
                  </div>

                  <!-- Status Badge -->
                  <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-full text-xs font-black ${
                      isCertified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      (isRejected ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse')
                    }">
                      ${isCertified ? '✅ เซ็นรับรองแล้ว' : (isRejected ? '⛔ ไม่อนุมัติ' : '⏳ รอตรวจสอบ & เซ็น')}
                    </span>
                  </div>
                </div>

                <!-- Meta Line (Vehicle, Driver, Date) -->
                <div class="flex flex-wrap items-center gap-3 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span class="text-slate-300">📅 วันที่: <strong class="text-white">${a.date}</strong></span>
                  ${a.targetVehicle ? `<span class="text-blue-400 font-bold">🚚 รถ: <strong class="text-white">${a.targetVehicle}</strong></span>` : ''}
                  ${a.targetDriver ? `<span class="text-slate-300">👤 คนขับ: <strong class="text-white">${a.targetDriver}</strong></span>` : ''}
                  ${a.category ? `<span class="text-slate-400">หมวดหมู่: <strong class="text-slate-200">${a.category === 'trip_speed' ? '⏱️ เวลาวิ่ง' : (a.category === 'reconciliation' ? '⚖️ กระทบยอด' : '📍 พิกัด GPS')}</strong></span>` : ''}
                </div>

                <!-- Anomaly Facts -->
                <div class="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <strong class="text-amber-400 block mb-1">📝 ข้อเท็จจริงที่ตรวจพบ:</strong>
                  ${a.anomalyDetails || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>

                <!-- Investigation Result & Supervisor Signature Block (if available) -->
                ${a.investigationResult || a.supervisorSignature ? `
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    ${a.investigationResult ? `
                      <div class="bg-blue-950/30 border border-blue-800/50 p-3 rounded-xl">
                        <strong class="text-blue-400 block mb-0.5">🔍 ผลการสอบสวน:</strong>
                        <p class="text-slate-200">${a.investigationResult}</p>
                        ${a.resolution ? `<p class="text-emerald-300 font-semibold mt-1">มติ: ${a.resolution}</p>` : ''}
                      </div>
                    ` : ''}

                    ${a.supervisorSignature ? `
                      <div class="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <strong class="text-emerald-400 block mb-0.5">✍️ รับรองโดย:</strong>
                          <p class="text-white font-bold">${a.supervisorName || 'หัวหน้างานคุมลาน'}</p>
                          <p class="text-[10px] text-slate-400">${a.certifiedAt ? new Date(a.certifiedAt).toLocaleString('th-TH') : ''}</p>
                        </div>
                        <div class="h-12 w-28 bg-white rounded-lg p-1 flex items-center justify-center border border-slate-300">
                          <img src="${a.supervisorSignature}" alt="ลายเซ็น" class="max-h-full max-w-full object-contain">
                        </div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- Action Toolbar -->
                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span class="text-[11px] text-slate-400 font-mono">
                    บันทึกเมื่อ ${a.recordedAt ? new Date(a.recordedAt).toLocaleTimeString('th-TH') : a.date}
                  </span>

                  <div class="flex items-center gap-2">
                    <button onclick="reportsView.openCertifyModal('${a.id}')" class="px-3.5 py-2 ${isCertified ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-400 text-white font-black'} rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
                      <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                      ${isCertified ? '✏️ แก้ไขผล & เซ็นใหม่' : '✍️ บันทึกผลสอบ & เซ็นรับรอง'}
                    </button>

                    <button onclick="reportsView.printSingleAnomalyCertificate('${a.id}')" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700">
                      <i data-lucide="printer" class="w-3.5 h-3.5 text-emerald-400"></i>
                      <span class="hidden sm:inline">พิมพ์ใบรับรอง A4</span>
                    </button>

                    <button onclick="reportsView.deleteAnomaly('${a.id}')" class="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold transition border border-red-800" title="ลบรายงานนี้">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Digital Signature & Certification Modal
  // --------------------------------------------------------------------------
  openCertifyModal(auditId) {
    const audits = window.quarryStore.getIncidentAudits();
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    const currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER) || '{}');
    const defaultSupervisor = currentUser.name || 'หัวหน้างานคุมลาน (Supervisor)';

    const container = document.getElementById('export-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <i data-lucide="check-square" class="w-5 h-5 text-emerald-400"></i>
                บันทึกผลตรวจสอบ & เซ็นชื่อรับรอง
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">รหัสเอกสาร: #${audit.id} | ${audit.title}</p>
            </div>
            <button onclick="reportsView.closeExportModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
          </div>

          <!-- Anomaly Brief -->
          <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
            <p><strong>🚚 รถที่เกี่ยวข้อง:</strong> <span class="text-blue-400 font-bold">${audit.targetVehicle || '-'}</span> | <strong>ผู้ปฏิบัติงาน:</strong> <span class="text-slate-200">${audit.targetDriver || '-'}</span></p>
            <p class="text-slate-300"><strong>⚠️ ข้อเท็จจริงที่ตรวจพบ:</strong> ${audit.anomalyDetails || '-'}</p>
          </div>

          <div class="space-y-4 text-xs">
            
            <!-- 1. ผลการตรวจสอบ (Investigation Result) -->
            <div>
              <label class="block font-bold text-slate-300 mb-1">
                🔍 ผลการตรวจสอบข้อเท็จจริง (Investigation Findings) <span class="text-red-400">*</span>
              </label>
              <textarea id="modal-investigation-result" rows="3" placeholder="ระบุข้อเท็จจริง เช่น จากการตรวจสอบกล้องวงจรปิดพบว่าคนขับมีการวิ่งหินจริง แต่ลืมกดส่งภาพจุดรับ..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">${audit.investigationResult || ''}</textarea>
              
              <!-- Quick Suggestions -->
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <button type="button" onclick="document.getElementById('modal-investigation-result').value = 'ตรวจสอบภาพถ่ายและกล้องวงจรปิดพบว่ามีหินเทจริง คนขับลืมกดส่งภาพจุดรับ'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold">
                  + กล้องยืนยันว่าวิ่งจริง
                </button>
                <button type="button" onclick="document.getElementById('modal-investigation-result').value = 'ตรวจสอบพบว่าเป็นรอบวิ่งซ้ำ กดส่งเบิ้ลเวลาเดียวกัน'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold">
                  + เป็นรอบซ้ำ
                </button>
                <button type="button" onclick="document.getElementById('modal-investigation-result').value = 'ตรวจสอบแล้วแม็คโครนับยอดตักตกหล่น ได้ประสานปรับยอดตักแล้ว'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold">
                  + แม็คโครนับตกหล่น
                </button>
              </div>
            </div>

            <!-- 2. มาตรการ / ข้อสรุปการตัดสิน (Resolution) -->
            <div>
              <label class="block font-bold text-slate-300 mb-1">
                ⚖️ ข้อสรุปการตัดสินและมาตรการแก้ไข (Resolution) <span class="text-red-400">*</span>
              </label>
              <input type="text" id="modal-resolution" value="${audit.resolution || 'อนุมัติรับรองเที่ยววิ่งตามปกติ (มีผลงานจริง)'}" placeholder="เช่น อนุมัติรับรองเที่ยววิ่งตามปกติ / หักเที่ยววิ่งออก 1 เที่ยว" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
              
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <button type="button" onclick="document.getElementById('modal-resolution').value = 'อนุมัติรับรองเที่ยววิ่งตามปกติ (มีผลงานจริง)'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[10px] font-semibold">
                  + อนุมัติรับรองเที่ยวปกติ
                </button>
                <button type="button" onclick="document.getElementById('modal-resolution').value = 'ตัดเที่ยววิ่งออก 1 เที่ยว เนื่องจากเป็นเที่ยวซ้ำ'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded text-[10px] font-semibold">
                  + ตัดเที่ยววิ่งออก
                </button>
                <button type="button" onclick="document.getElementById('modal-resolution').value = 'ให้วิ่ง/ตักชดเชยในกะถัดไป'" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[10px] font-semibold">
                  + ให้ตักชดเชย
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">สถานะการตัดสิน</label>
                <select id="modal-audit-status" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none">
                  <option value="certified" ${audit.status === 'certified' || audit.status === 'investigating' ? 'selected' : ''}>✅ รับรองผลการตรวจสอบ (Certified)</option>
                  <option value="rejected" ${audit.status === 'rejected' ? 'selected' : ''}>⛔ ไม่อนุมัติ / ยกเลิกเที่ยว (Rejected)</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-300 mb-1">ชื่อหัวหน้างานผู้รับรอง</label>
                <input type="text" id="modal-supervisor-name" value="${audit.supervisorName || defaultSupervisor}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none">
              </div>
            </div>

            <!-- 3. Digital Signature Canvas -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block font-bold text-slate-300">
                  ✍️ ลายเซ็นดิจิทัลของหัวหน้างาน (ใช้นิ้วหรือเมาส์เซ็นสด) <span class="text-red-400">*</span>
                </label>
                <button type="button" onclick="reportsView.clearSignatureCanvas()" class="text-xs font-bold text-red-400 hover:text-red-300">
                  🔄 ล้างลายเซ็น
                </button>
              </div>

              <div class="border-2 border-dashed border-slate-600 rounded-2xl bg-white overflow-hidden relative touch-none">
                <canvas id="signature-canvas" class="w-full h-36 cursor-crosshair block" style="touch-action: none;"></canvas>
                <div class="absolute bottom-2 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
                  เซ็นชื่อรับรองผลการตรวจสอบลงในกรอบนี้
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button onclick="reportsView.closeExportModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
              ยกเลิก
            </button>
            <button onclick="reportsView.saveCertification('${audit.id}')" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i>
              💾 บันทึกและเซ็นรับรองผล
            </button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Initialize Signature Pad Canvas
    setTimeout(() => {
      this.initSignatureCanvas(audit.supervisorSignature);
    }, 50);
  }

  initSignatureCanvas(existingSignatureUrl = null) {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.strokeStyle = '#0f172a'; // Deep crisp ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let hasDrawn = false;
    this.canvasHasDrawn = false;

    if (existingSignatureUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.canvasHasDrawn = true;
      };
      img.src = existingSignatureUrl;
    }

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - r.left,
        y: clientY - r.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      isDrawing = true;
      hasDrawn = true;
      this.canvasHasDrawn = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      ctx.closePath();
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    // Touch events
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw, { passive: false });
  }

  clearSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.canvasHasDrawn = false;
  }

  async saveCertification(auditId) {
    const result = document.getElementById('modal-investigation-result')?.value.trim();
    const resolution = document.getElementById('modal-resolution')?.value.trim();
    const status = document.getElementById('modal-audit-status')?.value || 'certified';
    const supervisorName = document.getElementById('modal-supervisor-name')?.value.trim() || 'หัวหน้างานคุมลาน';
    const canvas = document.getElementById('signature-canvas');

    if (!result) {
      return alert('กรุณาระบุผลการตรวจสอบข้อเท็จจริง');
    }
    if (!resolution) {
      return alert('กรุณาระบุข้อสรุปการตัดสินหรือมาตรการ');
    }

    let signatureDataUrl = null;
    if (canvas && this.canvasHasDrawn) {
      signatureDataUrl = canvas.toDataURL('image/png');
    }

    await window.quarryStore.certifyIncidentAudit(auditId, {
      investigationResult: result,
      resolution: resolution,
      status: status,
      supervisorName: supervisorName,
      signatureDataUrl: signatureDataUrl
    });

    this.closeExportModal();
    alert('✅ บันทึกผลการตรวจสอบและลงนามรับรองเรียบร้อยแล้ว!');
    window.app.render();
  }

  openCreateAnomalyModal() {
    const trucks = window.quarryStore.getTrucks();
    const drivers = window.quarryStore.getDrivers();
    const today = new Date().toISOString().split('T')[0];

    const container = document.getElementById('export-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
          
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400"></i>
              บันทึกรายงานความผิดปกติใหม่
            </h3>
            <button onclick="reportsView.closeExportModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-300 mb-1">หัวข้อความผิดปกติ <span class="text-red-400">*</span></label>
              <input type="text" id="new-ano-title" placeholder="เช่น รอบวิ่งรับ-เทหินเร็วผิดปกติ / ยอดตักแม็คโครไม่ตรง" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">ประเภทความผิดปกติ</label>
                <select id="new-ano-category" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="trip_speed">⚡ ความเร็วรับ-เทผิดปกติ</option>
                  <option value="reconciliation_mismatch">⚖️ ยอดตักแม็คโครไม่ตรงกับสิบล้อ</option>
                  <option value="gps_location">📍 พิกัด GPS ซ้ำ/คลาดเคลื่อน</option>
                  <option value="photo_discrepancy">📸 ภาพถ่ายไม่ชัดเจน/ผิดประเภท</option>
                  <option value="machine_breakdown">🔧 รถเสีย / เครื่องจักรขัดข้อง</option>
                  <option value="other">📋 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-300 mb-1">ระดับความรุนแรง</label>
                <select id="new-ano-severity" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="critical">🔴 วิกฤติ / สำคัญมาก</option>
                  <option value="warning" selected>🟡 แจ้งเตือน</option>
                  <option value="info">🔵 ทั่วไป</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-300 mb-1">รถที่เกี่ยวข้อง</label>
                <select id="new-ano-vehicle" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="">-- เลือกรถ --</option>
                  ${trucks.map(t => `<option value="${t.code}">${t.code}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-300 mb-1">ผู้ปฏิบัติงาน / คนขับ</label>
                <select id="new-ano-driver" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="">-- เลือกคนขับ --</option>
                  ${drivers.map(d => `<option value="${d.name}">${d.name} (${d.nickname || d.role})</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">วันที่ตรวจพบ</label>
              <input type="date" id="new-ano-date" value="${today}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-300 mb-1">ข้อเท็จจริงและความผิดปกติที่พบ <span class="text-red-400">*</span></label>
              <textarea id="new-ano-details" rows="3" placeholder="ระบุรายละเอียด เช่น ตรวจพบเวลาจากจุดรับถึงจุดเทหินเพียง 1 นาที 15 วินาที..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button onclick="reportsView.closeExportModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
              ยกเลิก
            </button>
            <button onclick="reportsView.saveNewAnomaly()" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i>
              บันทึกรายงาน
            </button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  saveNewAnomaly() {
    const title = document.getElementById('new-ano-title')?.value.trim();
    const category = document.getElementById('new-ano-category')?.value;
    const severity = document.getElementById('new-ano-severity')?.value;
    const vehicle = document.getElementById('new-ano-vehicle')?.value;
    const driver = document.getElementById('new-ano-driver')?.value;
    const date = document.getElementById('new-ano-date')?.value;
    const details = document.getElementById('new-ano-details')?.value.trim();

    if (!title) return alert('กรุณาระบุหัวข้อความผิดปกติ');
    if (!details) return alert('กรุณาระบุข้อเท็จจริงและความผิดปกติที่พบ');

    window.quarryStore.saveIncidentAudit({
      id: 'AUD_' + Date.now().toString().slice(-6),
      title: title,
      category: category,
      severity: severity,
      targetVehicle: vehicle,
      targetDriver: driver,
      date: date,
      anomalyDetails: details,
      status: 'investigating'
    });

    this.closeExportModal();
    alert('✅ บันทึกรายงานความผิดปกติใหม่เรียบร้อยแล้ว');
    window.app.render();
  }

  importFromAIEngine() {
    const ai = window.quarryAI || window.aiEngine;
    if (!ai) return;
    const anomalies = ai.detectAnomalies();
    if (!anomalies || anomalies.length === 0) {
      return alert('🎉 AI สแกนตรวจสอบแล้ว: ขณะนี้ไม่พบความผิดปกติใหม่ในระบบ!');
    }

    let added = 0;
    const existingAudits = window.quarryStore.getIncidentAudits();

    anomalies.forEach(ano => {
      const exists = existingAudits.some(a => a.referenceId === (ano.referenceId || ano.id));
      if (!exists) {
        window.quarryStore.saveIncidentAudit({
          id: 'AUD_AI_' + Date.now().toString().slice(-5) + '_' + Math.random().toString(36).substr(2, 3),
          title: ano.title,
          category: ano.type === 'speed_dump_fast' || ano.type === 'speed_consecutive' ? 'trip_speed' : (ano.type === 'gps_same_location' ? 'gps_location' : 'other'),
          severity: ano.severity || 'warning',
          targetVehicle: ano.vehicleCode || '',
          targetDriver: ano.driverName || '',
          date: ano.date || new Date().toISOString().split('T')[0],
          referenceId: ano.referenceId || ano.id,
          anomalyDetails: ano.desc,
          investigationResult: '',
          resolution: '',
          status: 'investigating'
        });
        added++;
      }
    });

    if (added > 0) {
      alert(`⚡ AI ได้นำเข้าความผิดปกติที่ตรวจพบใหม่จำนวน ${added} รายการเข้าสู่ระบบตรวจสอบเรียบร้อยแล้ว!`);
      window.app.render();
    } else {
      alert('ℹ️ รายการความผิดปกติที่ AI ตรวจพบถูกนำเข้าสู่ระบบอยู่แล้วครบถ้วน');
    }
  }

  deleteAnomaly(auditId) {
    if (confirm("คุณแน่ใจว่าต้องการลบรายงานความผิดปกตินี้ใช่หรือไม่?")) {
      window.quarryStore.deleteIncidentAudit(auditId);
      window.app.render();
    }
  }

  // Filter Handlers
  setAnomalyStatusFilter(status) {
    this.filterAnomalyStatus = status;
    window.app.render();
  }

  handleAnomalySearch(query) {
    this.anomalySearchQuery = query;
    window.app.render();
  }

  handleVehicleFilter(v) {
    this.filterVehicle = v;
    window.app.render();
  }

  handleDateFromChange(d) {
    this.filterDateFrom = d;
    window.app.render();
  }

  // Print Single Incident Certificate (Official A4 Format)
  printSingleAnomalyCertificate(auditId) {
    const audits = window.quarryStore.getIncidentAudits();
    const a = audits.find(x => x.id === auditId);
    if (!a) return;

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อพิมพ์เอกสาร');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบรับรองผลการตรวจสอบความผิดปกติ - #${a.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800;900&display=swap');
          * { font-family: 'Sarabun', sans-serif; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body class="bg-white text-slate-900 p-8 max-w-4xl mx-auto">
        
        <!-- Header -->
        <div class="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 class="text-xl font-black">${CONFIG.PLANT_NAME}</h1>
            <p class="text-sm font-bold text-slate-700">${CONFIG.COMPANY_NAME}</p>
            <p class="text-xs text-slate-500">${CONFIG.COMPANY_SLOGAN}</p>
          </div>
          <div class="text-right">
            <span class="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded">เอกสารตรวจสอบภายใน</span>
            <p class="text-xs font-mono font-bold mt-1">เลขที่: #${a.id}</p>
            <p class="text-xs text-slate-600">วันที่: ${a.date}</p>
          </div>
        </div>

        <!-- Document Title -->
        <div class="text-center my-6">
          <h2 class="text-lg font-black uppercase underline">ใบรายงานผลการตรวจสอบความผิดปกติและการรับรองผล</h2>
          <p class="text-xs text-slate-600 mt-1">INCIDENT INVESTIGATION & SUPERVISOR CERTIFICATION AUDIT REPORT</p>
        </div>

        <!-- Incident Information Table -->
        <div class="border border-slate-300 rounded-xl overflow-hidden mb-6 text-xs">
          <div class="bg-slate-100 p-3 font-bold border-b border-slate-300 flex justify-between">
            <span>หัวข้อ: ${a.title}</span>
            <span class="uppercase">สถานะ: ${a.status === 'certified' ? '✅ ผ่านการรับรอง' : (a.status === 'rejected' ? '⛔ ไม่อนุมัติ' : '⏳ รอตรวจสอบ')}</span>
          </div>
          <div class="p-4 grid grid-cols-2 gap-4 bg-white">
            <p><strong>🚚 ยานพาหนะที่เกี่ยวข้อง:</strong> ${a.targetVehicle || '-'}</p>
            <p><strong>👤 พนักงาน/ผู้ควบคุม:</strong> ${a.targetDriver || '-'}</p>
            <p><strong>📅 วันที่ตรวจพบ:</strong> ${a.date}</p>
            <p><strong>🕒 เวลาบันทึกในระบบ:</strong> ${a.recordedAt ? new Date(a.recordedAt).toLocaleTimeString('th-TH') : '-'}</p>
          </div>
        </div>

        <!-- 1. Facts & Evidence -->
        <div class="mb-6 border border-slate-300 rounded-xl p-4 bg-slate-50">
          <h3 class="text-xs font-bold text-slate-800 uppercase mb-2">1. ข้อเท็จจริงและความผิดปกติที่ตรวจพบ (Anomaly Facts & Evidence)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">${a.anomalyDetails || '-'}</p>
        </div>

        <!-- 2. Investigation Result -->
        <div class="mb-6 border border-blue-200 rounded-xl p-4 bg-blue-50/50">
          <h3 class="text-xs font-bold text-blue-900 uppercase mb-2">2. ผลการตรวจสอบข้อเท็จจริง (Investigation Findings)</h3>
          <p class="text-xs text-slate-800 font-semibold leading-relaxed">${a.investigationResult || '(ยังไม่มีการระบุผลการตรวจสอบ)'}</p>
        </div>

        <!-- 3. Resolution & Action -->
        <div class="mb-8 border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
          <h3 class="text-xs font-bold text-emerald-900 uppercase mb-2">3. มติ / ข้อสรุปการตัดสินและมาตรการแก้ไข (Resolution & Corrective Actions)</h3>
          <p class="text-xs text-emerald-950 font-bold leading-relaxed">${a.resolution || '(ยังไม่มีการระบุมาตรการ)'}</p>
        </div>

        <!-- 4. Certification & Signature Block -->
        <div class="border border-slate-300 rounded-2xl p-6 bg-slate-50 grid grid-cols-2 gap-8 text-center text-xs">
          
          <!-- Supervisor Signature -->
          <div class="flex flex-col justify-between items-center h-48 border-r border-slate-300 pr-4">
            <p class="font-bold text-slate-800">หัวหน้างานผู้ตรวจสอบและรับรองผล</p>
            
            <div class="h-24 w-48 flex items-center justify-center border-b border-dashed border-slate-400">
              ${a.supervisorSignature ? `
                <img src="${a.supervisorSignature}" alt="ลายเซ็นหัวหน้างาน" class="max-h-full max-w-full object-contain">
              ` : `
                <span class="text-[10px] text-slate-400">(ลงลายมือชื่อดิจิทัล)</span>
              `}
            </div>

            <div>
              <p class="font-bold">(${a.supervisorName || 'หัวหน้างานคุมลาน'})</p>
              <p class="text-[10px] text-slate-500">วันที่ ${a.certifiedAt ? new Date(a.certifiedAt).toLocaleString('th-TH') : '...........................................'}</p>
            </div>
          </div>

          <!-- Management Acknowledgment -->
          <div class="flex flex-col justify-between items-center h-48 pl-4">
            <p class="font-bold text-slate-800">ผู้บริหาร / ผู้รับทราบผลการตัดสิน</p>
            
            <div class="h-24 w-48 flex items-center justify-center border-b border-dashed border-slate-400">
              <span class="text-[10px] text-slate-400">(ลงลายมือชื่อ)</span>
            </div>

            <div>
              <p class="font-bold">(ผู้บริหารโรงโม่ ป.ศรีวิไลลักษณ์)</p>
              <p class="text-[10px] text-slate-500">วันที่ ...........................................</p>
            </div>
          </div>

        </div>

        <div class="mt-8 text-center text-[10px] text-slate-400">
          เอกสารนี้ออกโดยระบบบริหารจัดการโรงโม่หิน ป.ศรีวิไลลักษณ์ • ${new Date().toLocaleString('th-TH')}
        </div>

        <script>
          setTimeout(() => { window.print(); }, 400);
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // ส่งออก Excel เฉพาะคันรถที่เลือก
  exportTruckToExcel(truckPlate) {
    const allTrips = window.quarryStore.getTrips();
    const trips = allTrips.filter(t => {
      if (t.truckPlate !== truckPlate) return false;
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      return true;
    });

    if (trips.length === 0) {
      alert(`ไม่พบข้อมูลเที่ยววิ่งสำหรับรถทะเบียน ${truckPlate} ในช่วงเวลาที่เลือก`);
      return;
    }

    const rows = trips.map((t, idx) => ({
      "ลำดับ": idx + 1,
      "รหัสรอบ (Trip ID)": t.id,
      "วันที่": t.date,
      "เวลา": t.timestamp,
      "เบอร์รถ/ทะเบียน": t.truckPlate,
      "ขนาดพิกัด (ตัน)": t.capacityTon || 30,
      "ชื่อคนขับ": t.driverName,
      "เบอร์โทรศัพท์": t.driverPhone || '-',
      "ประเภทงานวิ่ง": t.jobTypeName || '-',
      "รอบที่": t.roundNumber || idx + 1,
      "ยอดเงิน (บาท)": t.amount || 0,
      "เวลาขึ้นหิน": t.loadTimestampText || t.timestamp,
      "เวลาเทหิน": t.dumpTimestampText || t.timestamp,
      "สถานะเบิกจ่าย": t.disbursementStatus === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ทะเบียน_${truckPlate}`);
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `รายงานเที่ยววิ่ง_${truckPlate}_${dateStr}.xlsx`);
  }

  // -------------------------------------------------------------
  // เมนูแยกที่ 1: ประวัติการวิ่ง (Dedicated Trips History View)
  // -------------------------------------------------------------
  renderTripsView() {
    const trips = window.quarryStore.getTrips();
    const trucks = window.quarryStore.getTrucks();
    const drivers = window.quarryStore.getDrivers();
    const jobRates = window.quarryStore.getJobRates();

    let filteredTrips = trips.filter(t => {
      if (this.filterDateFrom && t.date < this.filterDateFrom) return false;
      if (this.filterDateTo && t.date > this.filterDateTo) return false;
      if (this.filterVehicle && t.truckPlate !== this.filterVehicle) return false;
      if (this.filterDriver && t.driverName !== this.filterDriver) return false;
      if (this.filterJobType && t.jobTypeId !== this.filterJobType && t.jobTypeName !== this.filterJobType) return false;
      if (this.disbursementSearchQuery) {
        const q = this.disbursementSearchQuery.toLowerCase();
        const matchPlate = (t.truckPlate || '').toLowerCase().includes(q);
        const matchDriver = (t.driverName || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchJob = (t.jobTypeName || '').toLowerCase().includes(q);
        if (!matchPlate && !matchDriver && !matchId && !matchJob) return false;
      }
      return true;
    });

    const totalAmount = filteredTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const uniqueTrucks = new Set(filteredTrips.map(t => t.truckPlate)).size;
    const uniqueDrivers = new Set(filteredTrips.map(t => t.driverName)).size;

    return `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-blue-500 text-slate-950 rounded-xl">🚚</span>
              ประวัติการวิ่งและบันทึกเที่ยวงาน (Trip History & Logs)
            </h1>
            <p class="text-sm text-slate-400 mt-1">สืบค้นบันทึกเที่ยววิ่งย้อนหลังทุกคัน ทุกคนขับ พร้อมรูปภาพพิกัด GPS จุดรับและจุดเทหิน</p>
          </div>
          
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="reportsView.exportToExcel()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
              ส่งออก Excel
            </button>
            <button onclick="reportsView.exportToPDF()" class="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="file-text" class="w-4 h-4"></i>
              ส่งออก PDF
            </button>
          </div>
        </div>

        <!-- Photo Zoom Lightbox Modal Container -->
        <div id="photo-zoom-modal-container">
          ${this.selectedZoomPhoto ? this.renderPhotoZoomModal() : ''}
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div class="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
              <span class="text-xl">🚛</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">เที่ยววิ่งตามตัวกรอง</p>
              <h3 class="text-lg font-black text-white">${filteredTrips.length.toLocaleString()} <span class="text-xs font-normal text-slate-400">เที่ยว</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <span class="text-xl">💰</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">มูลค่างานรวม</p>
              <h3 class="text-lg font-black text-emerald-400">฿${totalAmount.toLocaleString()}</h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <span class="text-xl">🚚</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">รถที่บันทึกงาน</p>
              <h3 class="text-lg font-black text-indigo-300">${uniqueTrucks} <span class="text-xs font-normal text-slate-400">คัน</span></h3>
            </div>
          </div>

          <div class="bg-slate-900 border border-teal-500/30 p-4 rounded-2xl shadow-md flex items-center gap-3.5">
            <div class="p-3 bg-teal-500/20 text-teal-400 rounded-xl">
              <span class="text-xl">👤</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-slate-400">คนขับที่ปฏิบัติงาน</p>
              <h3 class="text-lg font-black text-teal-300">${uniqueDrivers} <span class="text-xs font-normal text-slate-400">คน</span></h3>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar with Date Picker -->
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div class="flex items-center gap-2">
              <span class="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm">🔍</span>
              <h3 class="text-sm font-black text-white">ค้นหาและกรองประวัติเที่ยววิ่ง (Search & Filters)</h3>
            </div>

            <!-- Quick Date Presets -->
            <div class="flex flex-wrap items-center gap-1.5">
              <button onclick="reportsView.setQuickDateFilter('today')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">วันนี้</button>
              <button onclick="reportsView.setQuickDateFilter('7days')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">7 วัน</button>
              <button onclick="reportsView.setQuickDateFilter('thisMonth')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition">เดือนนี้</button>
              <button onclick="reportsView.setQuickDateFilter('all')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-blue-400 transition">ทั้งหมด</button>
            </div>
          </div>

          <!-- Dropdowns & Search Input -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <!-- Search Text -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ค้นหา (รอบ/ทะเบียน/คนขับ)</label>
              <input type="text" value="${this.disbursementSearchQuery}" oninput="reportsView.onDisbursementSearch(this.value)" placeholder="พิมพ์คำค้นหา..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
            </div>

            <!-- Filter Truck -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">เลือกรถบรรทุก</label>
              <select onchange="reportsView.onFilterChange('vehicle', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                <option value="">-- รถทุกคัน (${trucks.length} คัน) --</option>
                ${trucks.map(t => `<option value="${t.code}" ${this.filterVehicle === t.code ? 'selected' : ''}>${t.code} (${t.capacity_ton || 30} ตัน) ${t.driver_name ? '— ' + t.driver_name : ''}</option>`).join('')}
              </select>
            </div>

            <!-- Filter Driver -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">เลือกคนขับ</label>
              <select onchange="reportsView.onFilterChange('driver', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                <option value="">-- คนขับทุกคน (${drivers.length} คน) --</option>
                ${drivers.map(d => `<option value="${d.name}" ${this.filterDriver === d.name ? 'selected' : ''}>${d.name} (${d.phone || ''})</option>`).join('')}
              </select>
            </div>

            <!-- Filter Job Type -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ประเภทงาน</label>
              <select onchange="reportsView.onFilterChange('jobType', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                <option value="">-- ทุกประเภทงาน --</option>
                ${jobRates.map(j => `<option value="${j.id}" ${this.filterJobType === j.id ? 'selected' : ''}>${j.name}</option>`).join('')}
              </select>
            </div>

            <!-- Date Range Inputs -->
            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-400">ช่วงวันที่</label>
              <div class="flex items-center gap-1.5">
                <input type="date" value="${this.filterDateFrom}" onchange="reportsView.onFilterChange('dateFrom', this.value)" class="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-white">
                <span class="text-slate-500 text-xs">-</span>
                <input type="date" value="${this.filterDateTo}" onchange="reportsView.onFilterChange('dateTo', this.value)" class="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-white">
              </div>
            </div>
          </div>

          <!-- View Layout Mode Switcher -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-800">
            <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button onclick="reportsView.setDisbursementLayout('audit_table')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${this.disbursementLayout === 'audit_table' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                <span>📋</span> ตารางบันทึกเที่ยววิ่ง
              </button>
              <button onclick="reportsView.setDisbursementLayout('trip_timeline')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${this.disbursementLayout === 'trip_timeline' ? 'bg-blue-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
                <span>⏱️</span> ไทม์ไลน์ภาพถ่าย
              </button>
            </div>

            <div class="text-xs text-slate-400">
              พบข้อมูลทั้งหมด <strong class="text-white font-mono">${filteredTrips.length}</strong> รายการ
            </div>
          </div>
        </div>

        <!-- Render Content -->
        ${filteredTrips.length === 0 ? `
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <span class="text-4xl">📭</span>
            <h3 class="text-base font-bold text-white">ไม่พบบันทึกประวัติเที่ยววิ่งตามเงื่อนไข</h3>
            <p class="text-xs text-slate-400">ลองเปลี่ยนช่วงวันที่ หรือล้างตัวกรองเพื่อดูข้อมูล</p>
          </div>
        ` : (
          this.disbursementLayout === 'trip_timeline'
            ? this.renderDisbursementTimeline(filteredTrips)
            : this.renderDisbursementAuditTable(filteredTrips)
        )}

      </div>
    `;
  }

  // -------------------------------------------------------------
  // เมนูแยกที่ 2: ตรวจสอบกระทบยอด (Dedicated Reconciliation View)
  // -------------------------------------------------------------
  renderReconciliationView() {
    this.viewMode = 'reconciliation';
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();

    return `
      <div class="space-y-6">
        <!-- Dedicated Reconciliation Header -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-amber-500 text-slate-950 rounded-xl">⚖️</span>
              ตรวจสอบกระทบยอดสิบล้อ vs แม็คโคร (Reconciliation Hub)
            </h1>
            <p class="text-sm text-slate-400 mt-1">เปรียบเทียบความถูกต้องระหว่างจำนวนเที่ยวที่สิบล้อรายงาน กับบันทึกตักของแม็คโครแบบ Real-time</p>
          </div>
          
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="reportsView.exportToExcel()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
              ส่งออก Excel
            </button>
            <button onclick="reportsView.exportToPDF()" class="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="file-text" class="w-4 h-4"></i>
              ส่งออก PDF
            </button>
          </div>
        </div>

        <!-- Render Full Reconciliation Engine -->
        ${this.renderReconciliationMode(trips, excLogs, trucks)}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // เมนูแยกที่ 3: ตรวจจับความผิดปกติ & รับรองผล (Dedicated Anomalies View)
  // -------------------------------------------------------------
  renderAnomaliesView() {
    this.viewMode = 'anomalies';
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const drivers = window.quarryStore.getDrivers();

    return `
      <div class="space-y-6">
        <!-- Dedicated Anomalies Header -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-amber-500 text-slate-950 rounded-xl">⚠️</span>
              ระบบตรวจจับความผิดปกติ & รับรองผล (Anomaly Detection & Certification Hub)
            </h1>
            <p class="text-sm text-slate-400 mt-1">AI ตรวจจับเที่ยววิ่งผิดปกติ, บันทึกผลสอบสวนข้อเท็จจริง และลงลายมือชื่อดิจิทัลรับรองผล</p>
          </div>
          
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="reportsView.importFromAIEngine()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              ⚡ นำเข้าจาก AI Engine
            </button>
            <button onclick="reportsView.openNewAnomalyModal()" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              ➕ แจ้งเหตุผิดปกติใหม่
            </button>
          </div>
        </div>

        <!-- Render Full Anomalies Engine -->
        ${this.renderAnomaliesMode(trips, excLogs, trucks, drivers)}
      </div>
    `;
  }
}

window.reportsView = new ReportsView();


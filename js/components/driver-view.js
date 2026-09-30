/**
 * หน้าจอสำหรับคนขับรถบรรทุก (Truck Driver PWA Flow)
 * รองรับ: ซ่อนราคา, เลือกรถอิสระ, เปลี่ยนรถระหว่างวัน, แยก Logout กับ ปิดกะ, กรองประวัติย้อนหลัง
 */
class DriverView {
  constructor() {
    this.currentRound = null;
    this.activeJobId = null;
    this.loadPhoto = null;
    this.loadGPS = null;
    this.dumpPhoto = null;
    this.dumpGPS = null;
    
    // Filter สำหรับดูประวัติย้อนหลัง
    this.historyFromDate = '';
    this.historyToDate = '';
    this.isCompletingRound = false;
  }

  render() {
    const user = window.authService.getUser();
    const shift = window.authService.getShift();

    if (!shift) {
      return this.renderShiftSelect(user);
    }

    return this.renderActiveCockpit(user, shift);
  }

  // 1. หน้าจอเปิดกะและเลือกรถ
  renderShiftSelect(user) {
    const trucks = window.quarryStore.getTrucks();
    const today = new Date().toISOString().split('T')[0];
    const todayTrips = window.quarryStore.getTrips({ date: today });
    const activePlates = new Set(todayTrips.map(t => t.truckPlate));

    return `
      <div class="min-h-screen bg-slate-950 text-white p-4 pb-20 max-w-lg mx-auto">
        
        <!-- Top Bar -->
        <div class="flex items-center justify-between py-3 border-b border-slate-800 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-500 text-slate-950 flex items-center justify-center font-black text-lg">
              🚚
            </div>
            <div>
              <h2 class="font-bold text-base text-white">${user.name}</h2>
              <p class="text-xs text-blue-400 font-medium">คนขับรถบรรทุกประจำโรงโม่</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="window.app.openChangePinModal()" title="เปลี่ยนรหัส PIN ของฉัน" class="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-blue-400 font-bold flex items-center gap-1 border border-slate-700">
              <i data-lucide="key" class="w-3.5 h-3.5"></i> เปลี่ยน PIN
            </button>
            <button onclick="window.app.toggleTheme()" class="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300 font-bold">
              ${window.app && window.app.theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onclick="window.app.logout()" class="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300 flex items-center gap-1">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i> ออก
            </button>
          </div>
        </div>

        <!-- Shift Start Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div class="text-center space-y-2">
            <span class="text-4xl">🔑</span>
            <h1 class="text-xl font-black text-white">เปิดกะการทำงานประจำวัน</h1>
            <p class="text-sm text-slate-400">เลือกรถบรรทุกคันที่ว่างเพื่อเริ่มปฏิบัติงาน (สลับคันได้ตลอดเวลา)</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              เลือกรถบรรทุก (ทั้งหมด 28 คัน)
            </label>
            <select id="shift-truck-select" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${trucks.map(t => {
                const isBusy = activePlates.has(t.code);
                return `<option value="${t.code}" data-capacity="${t.capacity_ton}">
                  ${isBusy ? '🔴 [มีคนขับอยู่] ' : '🟢 [ว่าง] '} ${t.code} (${t.capacity_ton} ตัน)
                </option>`;
              }).join('')}
            </select>
          </div>

          <button onclick="driverView.handleStartShift()" class="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-lg font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <i data-lucide="play" class="w-6 h-6 text-white"></i>
            เริ่มงานประจำวันทันที
          </button>
        </div>

      </div>
    `;
  }

  // 2. หน้าจอห้องควบคุมคนขับ (Cockpit)
  renderActiveCockpit(user, shift) {
    const today = new Date().toISOString().split('T')[0];
    const allMyTrips = window.quarryStore.getTrips({ driverPhone: user.phone });
    const todayTrips = allMyTrips.filter(t => t.date === today);
    const totalEarningsToday = todayTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const nextRoundNumber = todayTrips.length + 1;
    const rates = window.quarryStore.getJobRates();

    // กรองประวัติย้อนหลัง
    let filteredHistory = allMyTrips.filter(t => {
      if (this.historyFromDate && t.date < this.historyFromDate) return false;
      if (this.historyToDate && t.date > this.historyToDate) return false;
      return true;
    });

    const historyTotalTrips = filteredHistory.length;
    const historyTotalAmount = filteredHistory.reduce((sum, t) => sum + (t.amount || 0), 0);

    return `
      <div class="min-h-screen bg-slate-950 text-white p-3 pb-24 max-w-lg mx-auto space-y-4">
        
        <!-- Header: Vehicle + Driver + Actions -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-blue-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-inner">
                🚚
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-black text-base text-white">${shift.vehicleCode}</span>
                  <span class="text-xs bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                    ${shift.capacityTon} ตัน
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">คนขับ: <span class="text-slate-200 font-semibold">${user.name}</span></p>
              </div>
            </div>

            <!-- Action Buttons: Switch Truck, Temp Logout, End Shift -->
            <div class="flex flex-col gap-1.5 items-end">
              <div class="flex items-center gap-1.5">
                <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง/มืด" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-xl font-bold">
                  ${window.app && window.app.theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button onclick="window.app.openChangePinModal()" title="เปลี่ยนรหัส PIN" class="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1">
                  <i data-lucide="key" class="w-3 h-3"></i> PIN
                </button>
                <button onclick="driverView.promptSwitchTruck()" title="เปลี่ยนรถระหว่างวัน" class="text-xs bg-blue-900/60 hover:bg-blue-800 text-blue-300 px-2.5 py-1.5 rounded-xl font-bold border border-blue-700/50 flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> เปลี่ยนรถ
                </button>
                <button onclick="window.app.logout()" title="ออกจากระบบชั่วคราวโดยไม่ปิดกะ" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <i data-lucide="log-out" class="w-3 h-3"></i> พัก/ออก
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="driverView.confirmEndShift()" class="text-[11px] bg-red-950/60 border border-red-800/80 text-red-300 hover:bg-red-900 px-3 py-1 rounded-lg font-bold">
                  🏁 สิ้นสุดวัน (ปิดกะ)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Metrics Banner -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-4 text-center">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">จำนวนเที่ยววันนี้</p>
            <div class="flex items-baseline justify-center gap-1 mt-1">
              <span class="text-3xl font-black text-blue-400">${todayTrips.length}</span>
              <span class="text-xs text-slate-400">เที่ยว</span>
            </div>
          </div>
          <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-4 text-center">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">ประมาณการรายได้</p>
            <div class="flex items-baseline justify-center gap-1 mt-1">
              <span class="text-3xl font-black text-emerald-400">฿${totalEarningsToday.toLocaleString()}</span>
              <span class="text-xs text-slate-400">บาท</span>
            </div>
          </div>
        </div>

        <!-- Main Action Zone (Work Card) -->
        <div class="bg-slate-900 border-2 border-blue-500/40 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <h2 class="text-lg font-black text-white">บันทึกงาน: รอบที่ ${nextRoundNumber}</h2>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 bg-blue-500 text-slate-950 rounded-full">
              กำลังปฏิบัติงาน
            </span>
          </div>

          <!-- Select Job Type (NO PRICE VISIBLE FOR DRIVER) -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. เลือกประเภทงานวิ่ง
            </label>
            <select id="driver-job-select" onchange="driverView.handleJobChange(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${rates.map((r, idx) => {
                const isSelected = (!this.activeJobId && idx === 0) || this.activeJobId === r.id ? 'selected' : '';
                return `<option value="${r.id}" ${isSelected}>
                  ${r.name}
                </option>`;
              }).join('')}
            </select>
          </div>

          <!-- Camera Steps Container -->
          <div class="grid grid-cols-2 gap-3 pt-2">
            
            <!-- Step 1: Loading Point Photo -->
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center space-y-2">
              <p class="text-xs font-bold text-blue-400">1. จุดรับหิน (ขึ้นของ)</p>
              ${this.loadPhoto ? `
                <div class="relative rounded-xl overflow-hidden border border-blue-500/50 shadow-md">
                  <img src="${this.loadPhoto}" class="w-full h-28 object-cover">
                  <span class="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">✓ รับหินแล้ว</span>
                </div>
                <button onclick="driverView.captureLoadPhoto()" class="text-[11px] text-blue-400 underline font-bold">ถ่ายใหม่</button>
              ` : `
                <button onclick="driverView.captureLoadPhoto()" class="w-full h-28 bg-blue-950/40 hover:bg-blue-900/60 border-2 border-dashed border-blue-500/60 rounded-xl flex flex-col items-center justify-center gap-1 text-blue-400 active:scale-95 transition">
                  <i data-lucide="camera" class="w-8 h-8"></i>
                  <span class="text-xs font-black">📸 ถ่ายจุดรับหิน</span>
                  <span class="text-[10px] text-slate-400">กล้องสด + GPS</span>
                </button>
              `}
            </div>

            <!-- Step 2: Dumping Point Photo -->
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center space-y-2">
              <p class="text-xs font-bold text-emerald-400">2. จุดเทหิน (ส่งมอบ)</p>
              ${this.dumpPhoto ? `
                <div class="relative rounded-xl overflow-hidden border border-emerald-500/50 shadow-md">
                  <img src="${this.dumpPhoto}" class="w-full h-28 object-cover">
                  <span class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">✓ เทหินแล้ว</span>
                </div>
                <button onclick="driverView.captureDumpPhoto()" class="text-[11px] text-emerald-400 underline font-bold">ถ่ายใหม่</button>
              ` : `
                <button onclick="driverView.captureDumpPhoto()" class="w-full h-28 bg-emerald-950/40 hover:bg-emerald-900/60 border-2 border-dashed border-emerald-500/60 rounded-xl flex flex-col items-center justify-center gap-1 text-emerald-400 active:scale-95 transition">
                  <i data-lucide="camera" class="w-8 h-8"></i>
                  <span class="text-xs font-black">📸 ถ่ายจุดเทหิน</span>
                  <span class="text-[10px] text-slate-400">กล้องสด + GPS</span>
                </button>
              `}
            </div>

          </div>

          <!-- Speed Anomaly Warning Banner (Live Real-Time Detection) -->
          ${(() => {
            if (this.loadPhoto && this.dumpPhoto && this.loadTime && this.dumpTime) {
              const diffSec = Math.max(1, Math.round((this.dumpTime - this.loadTime) / 1000));
              if (diffSec < 180) {
                const mins = Math.floor(diffSec / 60);
                const secs = diffSec % 60;
                const timeText = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;
                return `
                  <div class="p-3.5 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-start gap-3 mt-3 text-left shadow-lg">
                    <span class="text-2xl animate-bounce">🚨</span>
                    <div>
                      <p class="font-black text-sm text-red-400">แจ้งเตือน: ถ่ายรูปจุดรับและจุดเทห่างกันเพียง ${timeText}</p>
                      <p class="text-xs text-red-200 mt-1 leading-relaxed">
                        เวลาเดินทางน้อยกว่าเกณฑ์ปกติของโรงโม่ (เกณฑ์มาตรฐานอย่างน้อย 3-5 นาที) เมื่อกดบันทึก ระบบจะส่งสัญญาณแจ้งเตือนไปยังหัวหน้างานเพื่อตรวจสอบหลักฐานภาพถ่าย
                      </p>
                    </div>
                  </div>
                `;
              }
            }
            return '';
          })()}

          <!-- Big Finish Round Button -->
          <button onclick="driverView.handleCompleteRound()" ${this.isCompletingRound ? 'disabled' : ''} class="w-full py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-98 disabled:opacity-60 text-white text-xl font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 mt-3">
            <i data-lucide="check-circle-2" class="w-7 h-7 text-white"></i>
            <span class="text-white">${this.isCompletingRound ? 'กำลังบันทึกงาน...' : `จบงานรอบที่ ${nextRoundNumber} (นับ 1 เที่ยว)`}</span>
          </button>

        </div>

        <!-- Collapsible Section: History & Date Range Filter -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-black text-sm text-white flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-4 h-4 text-blue-400"></i>
              ประวัติการวิ่งย้อนหลังของฉัน
            </h3>
            <span class="text-xs bg-slate-800 text-blue-400 font-bold px-2.5 py-1 rounded-lg">
              รวม ${historyTotalTrips} เที่ยว (฿${historyTotalAmount.toLocaleString()} บ.)
            </span>
          </div>

          <!-- Date Filter Controls -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ตั้งแต่วันที่</label>
                <div class="relative flex items-center">
                  <input type="date" id="driver-filter-from" value="${this.historyFromDate}" onchange="driverView.setHistoryDateFilter(this.value, null)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 pr-8 text-xs text-white cursor-pointer" title="คลิกเปิดปฏิทิน หรือพิมพ์วันที่">
                  <button onclick="document.getElementById('driver-filter-from')?.showPicker ? document.getElementById('driver-filter-from').showPicker() : document.getElementById('driver-filter-from')?.focus()" class="absolute right-2 text-blue-400" title="เปิดปฏิทิน">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ถึงวันที่</label>
                <div class="relative flex items-center">
                  <input type="date" id="driver-filter-to" value="${this.historyToDate}" onchange="driverView.setHistoryDateFilter(null, this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 pr-8 text-xs text-white cursor-pointer" title="คลิกเปิดปฏิทิน หรือพิมพ์วันที่">
                  <button onclick="document.getElementById('driver-filter-to')?.showPicker ? document.getElementById('driver-filter-to').showPicker() : document.getElementById('driver-filter-to')?.focus()" class="absolute right-2 text-blue-400" title="เปิดปฏิทิน">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Quick Filter Preset Buttons -->
            <div class="flex items-center gap-1.5 pt-1">
              <button onclick="driverView.setQuickDateFilter('today')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">วันนี้</button>
              <button onclick="driverView.setQuickDateFilter('7days')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">7 วันล่าสุด</button>
              <button onclick="driverView.setQuickDateFilter('thisMonth')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">เดือนนี้</button>
              <button onclick="driverView.setQuickDateFilter('all')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-blue-400">ทั้งหมด</button>
            </div>
          </div>

          <!-- Trip List -->
          <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
            ${filteredHistory.length === 0 ? `
              <div class="text-center py-6 text-slate-500 text-xs">
                ไม่พบประวัติการวิ่งในช่วงเวลาที่เลือก
              </div>
            ` : filteredHistory.map(t => `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">
                    #${t.roundNumber}
                  </span>
                  <div>
                    <p class="font-bold text-xs text-white">${t.jobTypeName} <span class="text-[10px] text-slate-400 font-normal">(${t.truckPlate})</span></p>
                    <p class="text-[10px] text-slate-400">${t.timestamp || t.date}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-black text-sm text-emerald-400">+฿${t.amount || 0}</p>
                  <span class="text-[10px] text-slate-400">สำเร็จ</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // ปรับเปลี่ยนรถระหว่างวัน
  promptSwitchTruck() {
    const trucks = window.quarryStore.getTrucks();
    const shift = window.authService.getShift();
    const truckListStr = trucks.map((t, idx) => `${idx + 1}. ${t.code} (${t.capacity_ton} ตัน)`).join('\n');
    
    const choice = prompt(`🚗 เปลี่ยนรถระหว่างวัน (ปัจจุบันขับ: ${shift.vehicleCode})\n\nระบุหมายเลขลำดับรถใหม่ที่ต้องการขับ:\n${truckListStr}`);
    if (!choice) return;

    const num = parseInt(choice);
    if (isNaN(num) || num < 1 || num > trucks.length) {
      alert("หมายเลขรถไม่ถูกต้อง");
      return;
    }

    const newTruck = trucks[num - 1];
    const reason = prompt("ระบุเหตุผลการเปลี่ยนรถสั้นๆ (เช่น รถเสีย / ยางแตก / ย้ายงาน):", "เปลี่ยนรถระหว่างวัน") || "เปลี่ยนรถ";
    
    // อัปเดต shift ปัจจุบัน
    shift.vehicleCode = newTruck.code;
    shift.capacityTon = newTruck.capacity_ton;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(shift));

    alert(`✅ เปลี่ยนเป็นรถ ${newTruck.code} (${newTruck.capacity_ton} ตัน) สำเร็จ!\nเหตุผล: ${reason}\nรอบวิ่งถัดไปจะบันทึกด้วยรถคันใหม่นี้`);
    window.app.render();
  }

  setHistoryDateFilter(from, to) {
    if (from !== null) this.historyFromDate = from;
    if (to !== null) this.historyToDate = to;
    window.app.render();
  }

  setQuickDateFilter(type) {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'today') {
      this.historyFromDate = today;
      this.historyToDate = today;
    } else if (type === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      this.historyFromDate = d.toISOString().split('T')[0];
      this.historyToDate = today;
    } else if (type === 'thisMonth') {
      const d = new Date();
      this.historyFromDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      this.historyToDate = today;
    } else {
      this.historyFromDate = '';
      this.historyToDate = '';
    }
    window.app.render();
  }

  handleStartShift() {
    const sel = document.getElementById('shift-truck-select');
    const vehicleCode = sel.value;
    const capacityTon = Number(sel.options[sel.selectedIndex].dataset.capacity || 30);
    window.authService.startShift(vehicleCode, capacityTon);
    window.app.render();
  }

  confirmEndShift() {
    if (confirm("⚠️ คุณต้องการ [ปิดกะประจำวัน] และสรุปยอดเที่ยวทั้งหมดของวันนี้ใช่หรือไม่?\n(หากแค่จะพักชั่วคราว ให้กดปุ่ม 'พัก/ออก' แทน)")) {
      window.authService.endShift();
      window.app.render();
    }
  }

  handleJobChange(jobId) {
    this.activeJobId = jobId;
  }

  async captureLoadPhoto() {
    const user = window.authService.getUser();
    const shift = window.authService.getShift();
    const todayTrips = window.quarryStore.getTrips({ driverPhone: user.phone, date: new Date().toISOString().split('T')[0] });
    const roundNumber = todayTrips.length + 1;

    try {
      const result = await window.cameraEngine.captureWithWatermark({
        stepType: 'load',
        vehicleCode: shift.vehicleCode,
        capacity: shift.capacityTon,
        driverName: user.name,
        roundNumber: roundNumber,
        jobName: document.getElementById('driver-job-select')?.selectedOptions[0]?.text.trim() || 'รับหิน'
      });

      this.loadPhoto = result.photoBase64;
      this.loadGPS = result.gps;
      this.loadTime = Date.now();
      this.loadTimestampText = new Date().toLocaleTimeString('th-TH');
      window.app.render();
    } catch (err) {
      if (err.message !== "ยกเลิกการถ่ายรูป") {
        alert("เกิดข้อผิดพลาดในการถ่ายภาพ: " + err.message);
      }
    }
  }

  async captureDumpPhoto() {
    const user = window.authService.getUser();
    const shift = window.authService.getShift();
    const todayTrips = window.quarryStore.getTrips({ driverPhone: user.phone, date: new Date().toISOString().split('T')[0] });
    const roundNumber = todayTrips.length + 1;

    try {
      const result = await window.cameraEngine.captureWithWatermark({
        stepType: 'dump',
        vehicleCode: shift.vehicleCode,
        capacity: shift.capacityTon,
        driverName: user.name,
        roundNumber: roundNumber,
        jobName: document.getElementById('driver-job-select')?.selectedOptions[0]?.text.trim() || 'เทหิน'
      });

      this.dumpPhoto = result.photoBase64;
      this.dumpGPS = result.gps;
      this.dumpTime = Date.now();
      this.dumpTimestampText = new Date().toLocaleTimeString('th-TH');
      window.app.render();
    } catch (err) {
      if (err.message !== "ยกเลิกการถ่ายรูป") {
        alert("เกิดข้อผิดพลาดในการถ่ายภาพ: " + err.message);
      }
    }
  }

  handleCompleteRound() {
    if (this.isCompletingRound) return;
    if (!this.loadPhoto) {
      alert("⚠️ กรุณากดถ่ายรูป [จุดรับหิน] ก่อนครับ");
      return;
    }
    if (!this.dumpPhoto) {
      alert("⚠️ กรุณากดถ่ายรูป [จุดเทหิน] ก่อนครับ");
      return;
    }

    const user = window.authService.getUser();
    const shift = window.authService.getShift();
    const today = new Date().toISOString().split('T')[0];
    const todayTrips = window.quarryStore.getTrips({ driverPhone: user.phone, date: today });
    const roundNumber = todayTrips.length + 1;

    const jobSelect = document.getElementById('driver-job-select');
    const jobId = jobSelect ? jobSelect.value : (this.activeJobId || 'R1');
    const jobRates = window.quarryStore.getJobRates();
    const jobObj = jobRates.find(r => r.id === jobId) || jobRates[0];
    if (!jobObj) {
      alert('ยังไม่พบประเภทงานวิ่ง กรุณารีเฟรชระบบแล้วลองใหม่');
      return;
    }
    this.isCompletingRound = true;
    const amount = window.quarryStore.calculateTruckRate(jobObj.id, shift.capacityTon);

    // คำนวณระยะเวลาจริงระหว่างจุดรับหิน และ จุดเทหิน (วินาที)
    const durationSec = (this.loadTime && this.dumpTime) 
      ? Math.max(1, Math.round((this.dumpTime - this.loadTime) / 1000))
      : null;

    const isFastAnomaly = durationSec !== null && durationSec < 180;
    const mins = Math.floor((durationSec || 0) / 60);
    const secs = (durationSec || 0) % 60;
    const timeText = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;

    // แจ้งเตือนคนขับทันทีก่อนบันทึก หากพบว่าเวลาถ่ายจุดรับ-เทเร็วผิดปกติ
    if (isFastAnomaly) {
      const confirmed = confirm(
        `🚨 แจ้งเตือนความผิดปกติ (ถ่ายรับ-เทเร็วเกินไป)\n\n` +
        `ระบบตรวจพบว่าคุณถ่ายรูปจุดรับและจุดเทห่างกันเพียง ${timeText}\n` +
        `(เกณฑ์มาตรฐานโรงโม่กำหนดอย่างน้อย 3-5 นาที)\n\n` +
        `• ระบบจะบันทึกเที่ยววิ่งนี้พร้อมติดแท็ก [⚠️ ส่งสัญญาณเตือนให้หัวหน้างานตรวจสอบภาพถ่าย]\n\n` +
        `ต้องการยืนยันบันทึกรอบนี้ใช่หรือไม่?`
      );
      if (!confirmed) {
        this.isCompletingRound = false;
        window.app.render();
        return;
      }
    }

    const tripRecord = {
      id: 'TRIP_' + Date.now(),
      date: today,
      timestamp: new Date().toLocaleString('th-TH'),
      driverId: user.id,
      driverName: user.name,
      driverPhone: user.phone,
      truckPlate: shift.vehicleCode,
      capacityTon: shift.capacityTon,
      roundNumber: roundNumber,
      jobTypeId: jobObj.id,
      jobTypeName: jobObj.name,
      amount: amount,
      loadTime: this.loadTime,
      loadTimestampText: this.loadTimestampText || new Date().toLocaleTimeString('th-TH'),
      dumpTime: this.dumpTime,
      dumpTimestampText: this.dumpTimestampText || new Date().toLocaleTimeString('th-TH'),
      durationSeconds: durationSec,
      isSpeedAnomaly: isFastAnomaly,
      status: isFastAnomaly ? 'flagged_speed' : 'approved',
      disbursementStatus: isFastAnomaly ? 'pending' : 'approved',
      disbursementNotes: isFastAnomaly ? `⚠️ ตรวจพบเวลาวิ่งเร็วผิดปกติ (${timeText}) รอหัวหน้างานตรวจสอบภาพถ่าย` : 'ตรวจสอบหลักฐานถูกต้อง',
      loadPhotoBase64: this.loadPhoto,
      loadLat: this.loadGPS && this.loadGPS.isAvailable ? this.loadGPS.lat : '',
      loadLng: this.loadGPS && this.loadGPS.isAvailable ? this.loadGPS.lng : '',
      dumpPhotoBase64: this.dumpPhoto,
      dumpLat: this.dumpGPS && this.dumpGPS.isAvailable ? this.dumpGPS.lat : '',
      dumpLng: this.dumpGPS && this.dumpGPS.isAvailable ? this.dumpGPS.lng : ''
    };

    // รีเซ็ตก่อนแจ้งซิงก์ เพื่อให้หน้าจอพร้อมสำหรับรอบถัดไปเสมอ
    this.loadPhoto = null;
    this.loadGPS = null;
    this.loadTime = null;
    this.loadTimestampText = null;
    this.dumpPhoto = null;
    this.dumpGPS = null;
    this.dumpTime = null;
    this.dumpTimestampText = null;
    this.activeJobId = null;

    try {
      window.quarryStore.saveTrip(tripRecord);
      this.isCompletingRound = false;
      window.app.render();
      if (isFastAnomaly) {
        alert(`⚠️ บันทึกรอบที่ ${roundNumber} เรียบร้อยแล้ว!\n\n(ระบบได้ติดแท็กแจ้งเตือนส่งให้หัวหน้างานตรวจสอบ เนื่องจากเวลาจุดรับ-จุดเทห่างกันเพียง ${timeText})\n\nพร้อมเริ่มรอบที่ ${roundNumber + 1} ได้ทันที`);
      } else {
        alert(`🎉 บันทึกรอบที่ ${roundNumber} สำเร็จ!\nพร้อมเริ่มรอบที่ ${roundNumber + 1} ได้ทันที`);
      }
    } catch (err) {
      this.isCompletingRound = false;
      window.app.render();
      alert('บันทึกรอบไม่สำเร็จ: ' + (err.message || err));
    }
  }
}

window.driverView = new DriverView();

/**
 * หน้าจอสำหรับคนขับรถขุด / แม็คโคร (Excavator Operator PWA Flow)
 * รองรับ: เปิดกะเลือกรถ, สลับแม็คโครระหว่างวัน, แยก Logout/ปิดกะ, กรองประวัติย้อนหลัง
 */
class ExcavatorView {
  constructor() {
    this.selectedShiftExcavator = localStorage.getItem('quarry_excavator_shift') || null;
    this.scoopPhoto = null;
    this.scoopGPS = null;

    // Filter สำหรับดูประวัติย้อนหลัง
    this.historyFromDate = '';
    this.historyToDate = '';
  }

  render() {
    const user = window.authService.getUser();
    if (!this.selectedShiftExcavator) {
      return this.renderShiftSelect(user);
    }
    return this.renderActiveCockpit(user);
  }

  // 1. หน้าจอเปิดกะและเลือกรถขุด
  renderShiftSelect(user) {
    const excavators = window.quarryStore.getExcavators();

    return `
      <div class="min-h-screen bg-slate-950 text-white p-4 pb-20 max-w-lg mx-auto">
        
        <!-- Top Bar -->
        <div class="flex items-center justify-between py-3 border-b border-slate-800 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-600 text-slate-950 flex items-center justify-center font-black text-lg">
              🚜
            </div>
            <div>
              <h2 class="font-bold text-base text-white">${user.name}</h2>
              <p class="text-xs text-blue-400 font-medium">คนขับรถขุด / แม็คโครประจำโรงโม่</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.app.toggleTheme()" class="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300 font-bold">
              ${window.app && window.app.theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onclick="window.app.logout()" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-1">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i> ออกจากระบบ
            </button>
          </div>
        </div>

        <!-- Shift Start Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div class="text-center space-y-2">
            <span class="text-4xl">🚜</span>
            <h1 class="text-xl font-black text-white">เปิดกะการทำงานประจำวัน</h1>
            <p class="text-sm text-slate-400">เลือกรถขุด/แม็คโครที่คุณจะประจำการในวันนี้</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              เลือกรถแม็คโคร (ทั้งหมด 20 คัน)
            </label>
            <select id="shift-excavator-select" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${excavators.map(e => `
                <option value="${e.code}">
                  ${e.code} ${e.is_contractor ? '[ทีม ผรม.]' : ''} ${e.status === 'repair' ? '⚠️ [ซ่อม]' : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <button onclick="excavatorView.handleStartShift()" class="w-full py-4 bg-blue-500 hover:bg-blue-400 active:scale-98 text-slate-950 text-lg font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <i data-lucide="play" class="w-6 h-6"></i>
            เปิดงานประจำวัน
          </button>
        </div>

      </div>
    `;
  }

  // 2. หน้าจอห้องควบคุมคนขับแม็คโคร
  renderActiveCockpit(user) {
    const excavators = window.quarryStore.getExcavators();
    const trucks = window.quarryStore.getTrucks();
    const currentExcObj = excavators.find(e => e.code === this.selectedShiftExcavator) || { code: this.selectedShiftExcavator, rate_per_scoop: 5.0 };
    
    const today = new Date().toISOString().split('T')[0];
    const allMyLogs = window.quarryStore.getExcavatorLogs({ operatorName: user.name });
    const todayLogs = allMyLogs.filter(l => l.date === today);
    const defaultRate = currentExcObj.rate_per_scoop || 5.0;
    const totalEarningsToday = todayLogs.reduce((sum, l) => sum + (l.amount || defaultRate), 0);

    // กรองประวัติย้อนหลัง
    let filteredHistory = allMyLogs.filter(l => {
      if (this.historyFromDate && l.date < this.historyFromDate) return false;
      if (this.historyToDate && l.date > this.historyToDate) return false;
      return true;
    });

    const historyTotalScoops = filteredHistory.length;
    const historyTotalAmount = filteredHistory.reduce((sum, l) => sum + (l.amount || defaultRate), 0);

    return `
      <div class="min-h-screen bg-slate-950 text-white p-3 pb-24 max-w-lg mx-auto space-y-4">
        
        <!-- Header -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-blue-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-inner">
                🚜
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-black text-sm text-white">${currentExcObj.code || 'รถแม็คโคร'}</span>
                  ${currentExcObj.is_contractor ? '<span class="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full font-bold">ทีม ผรม.</span>' : ''}
                </div>
                <p class="text-xs text-slate-400 mt-0.5">ผู้ควบคุม: <span class="text-slate-200 font-semibold">${user.name}</span></p>
              </div>
            </div>

            <!-- Action Buttons: Switch Machine, Temp Logout, End Shift -->
            <div class="flex flex-col gap-1.5 items-end">
              <div class="flex items-center gap-1.5">
                <button onclick="window.app.toggleTheme()" title="สลับโหมดสว่าง/มืด" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-xl font-bold">
                  ${window.app && window.app.theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button onclick="excavatorView.promptSwitchExcavator()" title="เปลี่ยนเครื่องจักรระหว่างวัน" class="text-xs bg-blue-900/60 hover:bg-blue-800 text-blue-300 px-2.5 py-1.5 rounded-xl font-bold border border-blue-700/50 flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> เปลี่ยนรถ
                </button>
                <button onclick="window.app.logout()" title="ออกจากระบบชั่วคราวโดยไม่ปิดกะ" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <i data-lucide="log-out" class="w-3 h-3"></i> พัก/ออก
                </button>
              </div>
              <button onclick="excavatorView.confirmEndShift()" class="text-[11px] bg-red-950/60 border border-red-800/80 text-red-300 hover:bg-red-900 px-3 py-1 rounded-lg font-bold">
                🏁 สิ้นสุดวัน (ปิดกะ)
              </button>
            </div>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-4 text-center">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">จำนวนคันที่ตักวันนี้</p>
            <div class="flex items-baseline justify-center gap-1 mt-1">
              <span class="text-3xl font-black text-blue-400">${todayLogs.length}</span>
              <span class="text-xs text-slate-400">คัน</span>
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

        <!-- Main Scoop Action Box -->
        <div class="bg-slate-900 border-2 border-blue-600/40 rounded-3xl p-5 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 class="text-lg font-black text-white flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-5 h-5 text-blue-500"></i>
              บันทึกการตักให้รถบรรทุก
            </h2>
            <span class="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              ค่าตัก: ฿${defaultRate} / คัน
            </span>
          </div>

          <!-- Select Target Truck -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. เลือกรถบรรทุกที่เข้ามาตักหิน (28 คัน)
            </label>
            <select id="target-truck-select" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${trucks.map(t => `
                <option value="${t.code}">
                  🚚 ${t.code} (${t.capacity_ton} ตัน) ${t.nickname ? '• น้า' + t.nickname : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Camera Box -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              2. ถ่ายรูปยืนยันขณะตักหิน (กล้องสด + พิกัด GPS)
            </label>
            
            ${this.scoopPhoto ? `
              <div class="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                <img src="${this.scoopPhoto}" class="w-full h-40 object-cover">
                <span class="absolute bottom-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-lg">✓ ถ่ายรูปแล้ว</span>
              </div>
              <div class="text-center mt-2">
                <button onclick="excavatorView.captureScoopPhoto()" class="text-xs text-blue-400 underline font-bold">กดถ่ายภาพใหม่</button>
              </div>
            ` : `
              <button onclick="excavatorView.captureScoopPhoto()" class="w-full h-32 bg-blue-950/30 hover:bg-blue-900/50 border-2 border-dashed border-blue-500/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-blue-400 active:scale-95 transition">
                <i data-lucide="camera" class="w-10 h-10"></i>
                <span class="text-sm font-black">📸 กดเปิดกล้องถ่ายสด</span>
                <span class="text-xs text-slate-400">ปั๊มพิกัด GPS และทะเบียนรถลงบนรูป</span>
              </button>
            `}
          </div>

          <!-- Submit Button -->
          <button onclick="excavatorView.handleSaveScoopLog()" class="w-full py-4.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 active:scale-98 text-slate-950 text-xl font-black rounded-2xl shadow-xl transition flex items-center justify-center gap-2 mt-2">
            <i data-lucide="check" class="w-7 h-7"></i>
            <span>บันทึกการตักสำเร็จ (+฿${defaultRate})</span>
          </button>
        </div>

        <!-- History & Date Range Filter Section -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-black text-sm text-white flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-4 h-4 text-blue-400"></i>
              ประวัติการตักย้อนหลังของฉัน
            </h3>
            <span class="text-xs bg-slate-800 text-blue-400 font-bold px-2.5 py-1 rounded-lg">
              รวม ${historyTotalScoops} คัน (฿${historyTotalAmount.toLocaleString()} บ.)
            </span>
          </div>

          <!-- Date Filter Controls -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ตั้งแต่วันที่</label>
                <input type="date" id="exc-filter-from" value="${this.historyFromDate}" onchange="excavatorView.setHistoryDateFilter(this.value, null)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ถึงวันที่</label>
                <input type="date" id="exc-filter-to" value="${this.historyToDate}" onchange="excavatorView.setHistoryDateFilter(null, this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white">
              </div>
            </div>

            <!-- Quick Filter Preset Buttons -->
            <div class="flex items-center gap-1.5 pt-1">
              <button onclick="excavatorView.setQuickDateFilter('today')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">วันนี้</button>
              <button onclick="excavatorView.setQuickDateFilter('7days')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">7 วันล่าสุด</button>
              <button onclick="excavatorView.setQuickDateFilter('thisMonth')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">เดือนนี้</button>
              <button onclick="excavatorView.setQuickDateFilter('all')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-blue-400">ทั้งหมด</button>
            </div>
          </div>

          <!-- Scoop Log List -->
          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
            ${filteredHistory.length === 0 ? `
              <div class="text-center py-6 text-slate-500 text-xs">
                ไม่พบประวัติการตักในช่วงเวลาที่เลือก
              </div>
            ` : filteredHistory.map(l => `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs">
                    🚜
                  </span>
                  <div>
                    <p class="font-bold text-xs text-white">ตักให้: ${l.targetTruckPlate}</p>
                    <p class="text-[10px] text-slate-400">${l.timestamp || l.date}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-black text-sm text-emerald-400">+฿${l.amount || defaultRate}</p>
                  <span class="text-[10px] text-slate-400">ตักเสร็จ</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  handleStartShift() {
    const sel = document.getElementById('shift-excavator-select');
    const excCode = sel.value;
    this.selectedShiftExcavator = excCode;
    localStorage.setItem('quarry_excavator_shift', this.selectedShiftExcavator);
    window.app.render();
  }

  promptSwitchExcavator() {
    const excavators = window.quarryStore.getExcavators();
    const excListStr = excavators.map((e, idx) => `${idx + 1}. ${e.code} ${e.is_contractor ? '(ผรม.)' : ''}`).join('\n');
    
    const choice = prompt(`🚜 เปลี่ยนรถขุด/แม็คโครระหว่างวัน (ปัจจุบัน: ${this.selectedShiftExcavator})\n\nระบุหมายเลขลำดับรถแม็คโครใหม่ที่ต้องการประจำการ:\n${excListStr}`);
    if (!choice) return;

    const num = parseInt(choice);
    if (isNaN(num) || num < 1 || num > excavators.length) {
      alert("หมายเลขรถไม่ถูกต้อง");
      return;
    }

    const newExc = excavators[num - 1];
    this.selectedShiftExcavator = newExc.code;
    localStorage.setItem('quarry_excavator_shift', this.selectedShiftExcavator);

    alert(`✅ เปลี่ยนเป็นแม็คโคร ${newExc.code} สำเร็จ!\nรายการตักถัดไปจะบันทึกด้วยเครื่องจักรนี้`);
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

  confirmEndShift() {
    if (confirm("⚠️ คุณต้องการ [ปิดกะประจำวัน] และสรุปยอดการตักทั้งหมดของวันนี้ใช่หรือไม่?\n(หากแค่จะพักชั่วคราว ให้กดปุ่ม 'พัก/ออก' แทน)")) {
      this.selectedShiftExcavator = null;
      localStorage.removeItem('quarry_excavator_shift');
      window.app.render();
    }
  }

  async captureScoopPhoto() {
    const user = window.authService.getUser();
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruck = truckSelect ? truckSelect.value : 'TRUCK';

    try {
      const result = await window.cameraEngine.captureWithWatermark({
        stepType: 'excavator',
        vehicleCode: this.selectedShiftExcavator,
        driverName: user.name,
        jobName: `ตักให้ ${targetTruck}`
      });

      this.scoopPhoto = result.photoBase64;
      this.scoopGPS = result.gps;
      window.app.render();
    } catch (err) {
      if (err.message !== "ยกเลิกการถ่ายรูป") {
        alert("เกิดข้อผิดพลาด: " + err.message);
      }
    }
  }

  handleSaveScoopLog() {
    if (!this.scoopPhoto) {
      alert("⚠️ กรุณากดถ่ายรูปยืนยันขณะตักหินก่อนครับ");
      return;
    }

    const user = window.authService.getUser();
    const excavators = window.quarryStore.getExcavators();
    const currentExc = excavators.find(e => e.code === this.selectedShiftExcavator) || {};
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruck = truckSelect ? truckSelect.value : 'TRUCK';
    const rate = currentExc.rate_per_scoop || 5.0;

    const logRecord = {
      id: 'EXC_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString('th-TH'),
      operatorName: user.name,
      operatorPhone: user.phone,
      excavatorCode: this.selectedShiftExcavator,
      targetTruckPlate: targetTruck,
      amount: rate,
      photoBase64: this.scoopPhoto,
      lat: this.scoopGPS ? this.scoopGPS.lat : 14.8824,
      lng: this.scoopGPS ? this.scoopGPS.lng : 102.0135
    };

    window.quarryStore.saveExcavatorLog(logRecord);

    this.scoopPhoto = null;
    this.scoopGPS = null;

    alert(`🎉 บันทึกการตักให้รถ ${targetTruck} สำเร็จ!\nได้เงินเพิ่ม: +${rate} บาท`);
    window.app.render();
  }
}

window.excavatorView = new ExcavatorView();

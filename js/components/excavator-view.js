/**
 * หน้าจอสำหรับคนขับรถขุด / แม็คโคร (Excavator Operator PWA Flow)
 * กฎระเบียบโรงโม่:
 * 1. ไม่อนุญาตให้อัปรูป ต้องถ่ายสดจากกล้องตอนนั้นเท่านั้น พร้อมแสตมป์ข้อมูลและพิกัด GPS ลงในรูป
 * 2. ค่าตักคิดตามสูตร: 5 บาทต่อตัน คูณตามพิกัดน้ำหนักบรรทุกของรถคันนั้น (30T = ฿150, 45T = ฿225, 60T = ฿300)
 */
class ExcavatorView {
  constructor() {
    this.selectedShiftExcavator = localStorage.getItem('quarry_excavator_shift') || null;
    this.selectedTargetTruck = null;
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

          <button onclick="excavatorView.handleStartShift()" class="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-lg font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <i data-lucide="play" class="w-6 h-6 text-white"></i>
            เปิดงานประจำวัน
          </button>
        </div>

      </div>
    `;
  }

  // คำนวณราคาค่าตัก: 5 บาทต่อตัน คูณตามพิกัดน้ำหนักบรรทุกของรถคันนั้น
  getEffectiveScoopRate(targetTruckCode) {
    return window.quarryStore.calculateExcavatorRate(this.selectedShiftExcavator, targetTruckCode);
  }

  // 2. หน้าจอห้องควบคุมคนขับแม็คโคร
  renderActiveCockpit(user) {
    const excavators = window.quarryStore.getExcavators();
    const trucks = window.quarryStore.getTrucks();
    const currentExcObj = excavators.find(e => e.code === this.selectedShiftExcavator) || { code: this.selectedShiftExcavator };
    
    // รถบรรทุกเป้าหมายที่เลือกอยู่
    if (!this.selectedTargetTruck && trucks.length > 0) {
      this.selectedTargetTruck = trucks[0].code;
    }
    const currentTruck = trucks.find(t => t.code === this.selectedTargetTruck) || trucks[0] || { code: 'TRUCK', capacity_ton: 30 };
    const truckCapacity = Number(currentTruck.capacity_ton) || 30;
    const activeRate = this.getEffectiveScoopRate(this.selectedTargetTruck);

    const today = new Date().toISOString().split('T')[0];
    const allMyLogs = window.quarryStore.getExcavatorLogs({ operatorName: user.name });
    const todayLogs = allMyLogs.filter(l => l.date === today);
    const totalEarningsToday = todayLogs.reduce((sum, l) => sum + (Number(l.amount) || activeRate), 0);

    // กรองประวัติย้อนหลัง
    let filteredHistory = allMyLogs.filter(l => {
      if (this.historyFromDate && l.date < this.historyFromDate) return false;
      if (this.historyToDate && l.date > this.historyToDate) return false;
      return true;
    });

    const historyTotalScoops = filteredHistory.length;
    const historyTotalAmount = filteredHistory.reduce((sum, l) => sum + (Number(l.amount) || activeRate), 0);

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
                <button onclick="window.app.openChangePinModal()" title="เปลี่ยนรหัส PIN" class="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1">
                  <i data-lucide="key" class="w-3 h-3"></i> PIN
                </button>
                <button onclick="excavatorView.promptSwitchExcavator()" title="เปลี่ยนเครื่องจักรระหว่างวัน" class="text-xs bg-blue-900/60 hover:bg-blue-800 text-blue-300 px-2.5 py-1.5 rounded-xl font-bold border border-blue-700/50 flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> เปลี่ยนรถ
                </button>
                <button onclick="window.app.logout()" title="ออกจากระบบชั่วคราวโดยไม่ปิดกะ" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <i data-lucide="log-out" class="w-3 h-3"></i> พัก/ออก
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="excavatorView.confirmEndShift()" class="text-[11px] bg-red-950/60 border border-red-800/80 text-red-300 hover:bg-red-900 px-3 py-1 rounded-lg font-bold">
                  🏁 สิ้นสุดวัน (ปิดกะ)
                </button>
              </div>
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
            <h2 class="text-base font-black text-white flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-5 h-5 text-blue-500"></i>
              บันทึกการตักให้รถบรรทุก
            </h2>
            <div class="text-right">
              <span class="block text-[10px] text-slate-400 font-bold">เรท: 5 บาท / ตัน</span>
              <span class="text-xs font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-700/60 font-mono">
                ฿${activeRate} / คัน
              </span>
            </div>
          </div>

          <!-- 1. Select Target Truck -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. เลือกรถบรรทุกที่เข้ามาตักหิน (28 คัน)
            </label>
            <select id="target-truck-select" onchange="excavatorView.handleTargetTruckChange(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${trucks.map(t => `
                <option value="${t.code}" ${this.selectedTargetTruck === t.code ? 'selected' : ''}>
                  🚚 ${t.code} (พิกัด ${t.capacity_ton} ตัน) ${t.nickname ? '• น้า' + t.nickname : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- 2. Rate Formula Banner (5 บาท/ตัน × พิกัดตันรถ) -->
          <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                💰
              </div>
              <div>
                <p class="text-xs font-bold text-white">สูตรคำนวณค่าตักโรงโม่</p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  5 บ./ตัน × <strong class="text-blue-400 font-mono">${truckCapacity} ตัน</strong> = <strong class="text-emerald-400 font-mono text-sm">฿${activeRate} บาท</strong>
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                ${truckCapacity === 60 ? 'รถดั้มใหญ่ 60T' : (truckCapacity === 45 ? 'รถดั้มเล็ก 45T' : 'รถสิบล้อ 30T')}
              </span>
            </div>
          </div>

          <!-- 3. Camera Live Capture Only (ไม่อนุญาตให้อัปรูป ต้องถ่ายสดตอนนั้นเท่านั้น พร้อมแสตมป์ในรูป) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. ถ่ายรูปสดขณะตักหิน</span>
                <span class="text-red-400 font-black text-[11px]">*ต้องถ่ายสดตอนนั้น</span>
              </label>
              ${this.scoopPhoto ? `
                <button onclick="excavatorView.clearScoopPhoto()" class="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5">
                  ✕ ถ่ายใหม่
                </button>
              ` : ''}
            </div>

            ${this.scoopPhoto ? `
              <div class="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg">
                <img src="${this.scoopPhoto}" class="w-full h-44 object-cover">
                <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-950/85 backdrop-blur-sm p-2 rounded-xl border border-slate-700/60 text-xs">
                  <span class="text-emerald-400 font-bold flex items-center gap-1.5">
                    ✓ ถ่ายรูปและแสตมป์พิกัดแล้ว
                  </span>
                  <button onclick="excavatorView.captureScoopPhoto()" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition">
                    📸 ถ่ายใหม่
                  </button>
                </div>
              </div>
            ` : `
              <button type="button" onclick="excavatorView.captureScoopPhoto()" class="w-full py-6 bg-gradient-to-br from-blue-950/60 to-slate-900 hover:from-blue-900/60 hover:to-slate-800 border-2 border-dashed border-blue-500/70 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-blue-300 active:scale-98 transition shadow-inner">
                <div class="w-12 h-12 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 mb-1">
                  <i data-lucide="camera" class="w-6 h-6"></i>
                </div>
                <span class="text-sm font-black text-white">📸 กดเปิดกล้องถ่ายสดขณะตัก</span>
                <span class="text-[11px] text-blue-300">ปั๊มชื่อผู้ควบคุม, เบอร์รถ, พิกัดตัน, ค่าตัก ฿${activeRate} และ GPS บนรูป</span>
                <span class="text-[10px] text-amber-400/90 font-medium">(ระบบไม่อนุญาตให้อัปโหลดรูปภาพจากเครื่อง)</span>
              </button>
            `}
          </div>

          <!-- Submit Button -->
          <button onclick="excavatorView.handleSaveScoopLog()" class="w-full py-4.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-98 text-white text-xl font-black rounded-2xl shadow-xl transition flex items-center justify-center gap-2 mt-2">
            <i data-lucide="check" class="w-7 h-7 text-white"></i>
            <span class="text-white">บันทึกการตักสำเร็จ (+฿${activeRate})</span>
          </button>
        </div>

        <!-- History & Date Range Filter Section -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-black text-sm text-white flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-4 h-4 text-blue-400"></i>
              ประวัติการตักย้อนหลังของฉัน
            </h3>
            <span class="text-xs bg-slate-800 text-blue-400 font-bold px-2.5 py-1 rounded-lg font-mono">
              รวม ${historyTotalScoops} คัน (฿${historyTotalAmount.toLocaleString()} บ.)
            </span>
          </div>

          <!-- Date Filter Controls -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ตั้งแต่วันที่</label>
                <div class="relative flex items-center">
                  <input type="date" id="exc-filter-from" value="${this.historyFromDate}" onchange="excavatorView.setHistoryDateFilter(this.value, null)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 pr-8 text-xs text-white cursor-pointer" title="คลิกเปิดปฏิทิน หรือพิมพ์วันที่">
                  <button onclick="document.getElementById('exc-filter-from')?.showPicker ? document.getElementById('exc-filter-from').showPicker() : document.getElementById('exc-filter-from')?.focus()" class="absolute right-2 text-blue-400" title="เปิดปฏิทิน">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 font-bold mb-1">ถึงวันที่</label>
                <div class="relative flex items-center">
                  <input type="date" id="exc-filter-to" value="${this.historyToDate}" onchange="excavatorView.setHistoryDateFilter(null, this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 pr-8 text-xs text-white cursor-pointer" title="คลิกเปิดปฏิทิน หรือพิมพ์วันที่">
                  <button onclick="document.getElementById('exc-filter-to')?.showPicker ? document.getElementById('exc-filter-to').showPicker() : document.getElementById('exc-filter-to')?.focus()" class="absolute right-2 text-blue-400" title="เปิดปฏิทิน">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
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
                    <p class="text-[10px] text-slate-400">${l.timestamp || l.date} ${l.photoBase64 ? '• 📸 แสตมป์สด' : ''}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-black text-sm text-emerald-400">+฿${l.amount || activeRate}</p>
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
    const excCode = sel ? sel.value : null;
    if (excCode) {
      this.selectedShiftExcavator = excCode;
      localStorage.setItem('quarry_excavator_shift', this.selectedShiftExcavator);
      window.app.render();
    }
  }

  handleTargetTruckChange(truckCode) {
    this.selectedTargetTruck = truckCode;
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
      this.scoopPhoto = null;
      this.scoopGPS = null;
      localStorage.removeItem('quarry_excavator_shift');
      window.app.render();
    }
  }

  // ถ่ายภาพสดจากกล้องตอนนั้นเท่านั้น พร้อมปั๊มลายน้ำและพิกัด GPS (ไม่อนุญาตให้อัปรูป)
  async captureScoopPhoto() {
    const user = window.authService.getUser();
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruckCode = truckSelect ? truckSelect.value : (this.selectedTargetTruck || 'TRUCK');
    const trucks = window.quarryStore.getTrucks();
    const targetTruckObj = trucks.find(t => t.code === targetTruckCode);
    const capacityTon = targetTruckObj ? Number(targetTruckObj.capacity_ton) || 30 : 30;
    const rate = this.getEffectiveScoopRate(targetTruckCode);

    try {
      const result = await window.cameraEngine.captureWithWatermark({
        stepType: 'excavator',
        vehicleCode: this.selectedShiftExcavator,
        driverName: user.name,
        capacity: capacityTon,
        targetTruck: targetTruckCode,
        amount: rate,
        jobName: `ตักให้ ${targetTruckCode} (${capacityTon} ตัน) | ค่าตัก ฿${rate} (5บ./ตัน)`
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

  clearScoopPhoto() {
    this.scoopPhoto = null;
    this.scoopGPS = null;
    window.app.render();
  }

  // บันทึกรายการตักหิน (บังคับถ่ายรูปสดและแสตมป์ข้อมูลเท่านั้น)
  handleSaveScoopLog() {
    if (!this.scoopPhoto) {
      alert("⚠️ ตามระเบียบโรงโม่ ต้องถ่ายรูปสดขณะตักหินตอนนั้นเท่านั้น และมีรายละเอียดแสตมป์ในรูปยืนยันก่อนกดบันทึกครับ");
      return;
    }

    const user = window.authService.getUser();
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruck = truckSelect ? truckSelect.value : (this.selectedTargetTruck || 'TRUCK');
    const rate = this.getEffectiveScoopRate(targetTruck);

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
      photoUrl: this.scoopPhoto,
      lat: this.scoopGPS && this.scoopGPS.lat ? this.scoopGPS.lat : 17.48812,
      lng: this.scoopGPS && this.scoopGPS.lng ? this.scoopGPS.lng : 101.72345
    };

    window.quarryStore.saveExcavatorLog(logRecord);

    this.scoopPhoto = null;
    this.scoopGPS = null;

    alert(`🎉 บันทึกการตักให้รถ ${targetTruck} สำเร็จ!\n💰 ค่าตักที่ได้รับ: +${rate} บาท (5 บ./ตัน)`);
    window.app.render();
  }
}

window.excavatorView = new ExcavatorView();

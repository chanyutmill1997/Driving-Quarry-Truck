/**
 * หน้าจอสำหรับคนขับรถขุด / แม็คโคร (Excavator Operator PWA Flow)
 * รองรับ: เปิดกะเลือกรถ, สลับแม็คโครระหว่างวัน, อัปโหลดรูปจากโทรศัพท์/ถ่ายสด (ไม่บังคับถ่าย), ปรับเรทค่าตักตามขนาดรถ/กำหนดเอง
 */
class ExcavatorView {
  constructor() {
    this.selectedShiftExcavator = localStorage.getItem('quarry_excavator_shift') || null;
    this.selectedTargetTruck = null;
    this.customScoopRate = null;
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

  // คำนวณเรทค่าตักตามรถบรรทุกที่เลือก และเครื่องจักร
  getEffectiveScoopRate(targetTruckCode) {
    if (this.customScoopRate !== null && !isNaN(this.customScoopRate)) {
      return Number(this.customScoopRate);
    }
    return window.quarryStore.calculateExcavatorRate(this.selectedShiftExcavator, targetTruckCode);
  }

    return 5.0;
  }

  // 2. หน้าจอห้องควบคุมคนขับแม็คโคร
  renderActiveCockpit(user) {
    const excavators = window.quarryStore.getExcavators();
    const trucks = window.quarryStore.getTrucks();
    const currentExcObj = excavators.find(e => e.code === this.selectedShiftExcavator) || { code: this.selectedShiftExcavator, rate_per_scoop: 5.0 };
    
    // รถบรรทุกเป้าหมายที่เลือกอยู่
    if (!this.selectedTargetTruck && trucks.length > 0) {
      this.selectedTargetTruck = trucks[0].code;
    }
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
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-slate-400 font-bold">เรทค่าตัก:</span>
              <span class="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/60 font-mono">
                ฿${activeRate} / คัน
              </span>
            </div>
          </div>

          <!-- 1. Select Target Truck -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              1. เลือกรถบรรทุกที่เข้ามาตักหิน (28 คัน)
            </label>
            <select id="target-truck-select" onchange="excavatorView.handleTargetTruckChange(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${trucks.map(t => `
                <option value="${t.code}" ${this.selectedTargetTruck === t.code ? 'selected' : ''}>
                  🚚 ${t.code} (${t.capacity_ton} ตัน) ${t.nickname ? '• น้า' + t.nickname : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- 2. Rate Adjustment Toolbar (แก้ไขราคาค่าตักได้ทันที) -->
          <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>💰 ค่าตักต่อคันสำหรับเที่ยวนี้:</span>
              </label>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-slate-400">฿</span>
                <input type="number" id="scoop-rate-input" value="${activeRate}" onchange="excavatorView.handleCustomRateChange(this.value)" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-emerald-400 font-black text-sm text-right focus:outline-none focus:border-emerald-500 font-mono">
                <span class="text-xs text-slate-400">บาท</span>
              </div>
            </div>
            <!-- Quick Rate Presets -->
            <div class="flex items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-400 font-bold">ปรับด่วน:</span>
              `[5, 8, 10, 15, 20].map(r => `
                <button type="button" onclick="excavatorView.setCustomRate(${r})" class="px-2 py-0.5 rounded text-[11px] font-bold transition ${activeRate === r ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
                  ${r} บ.
                </button>
              `).join('')`
              ${this.customScoopRate !== null ? `
                <button type="button" onclick="excavatorView.resetCustomRate()" class="text-[10px] text-blue-400 underline ml-auto">รีเซ็ตตามระบบ</button>
              ` : ''}
            </div>
          </div>

          <!-- 3. Photo Box (ไม่บังคับถ่ายรูป: ถ่ายสด หรือ อัปโหลดจากโทรศัพท์ได้) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. แนบรูปถ่ายขณะตักหิน <span class="text-slate-400 font-normal">(ไม่บังคับถ่าย)</span>
              </label>
              ${this.scoopPhoto ? `
                <button onclick="excavatorView.clearScoopPhoto()" class="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5">
                  ✕ ลบรูป
                </button>
              ` : ''}
            </div>

            <!-- Hidden File Input for Phone Gallery Upload -->
            <input type="file" id="excavator-photo-file-input" accept="image/*" class="hidden" onchange="excavatorView.handlePhotoFileUpload(event)">

            ${this.scoopPhoto ? `
              <div class="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                <img src="${this.scoopPhoto}" class="w-full h-44 object-cover">
                <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700/60 text-xs">
                  <span class="text-emerald-400 font-bold flex items-center gap-1">
                    ✓ แนบรูปภาพแล้ว
                  </span>
                  <div class="flex items-center gap-2">
                    <button onclick="excavatorView.captureScoopPhoto()" class="text-blue-400 underline font-bold text-[11px]">ถ่ายสดใหม่</button>
                    <button onclick="document.getElementById('excavator-photo-file-input').click()" class="text-purple-400 underline font-bold text-[11px]">เลือกรูปอื่น</button>
                  </div>
                </div>
              </div>
            ` : `
              <div class="grid grid-cols-2 gap-2.5">
                <!-- Option 1: Live Camera -->
                <button type="button" onclick="excavatorView.captureScoopPhoto()" class="p-4 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/50 rounded-2xl flex flex-col items-center justify-center gap-1 text-blue-300 active:scale-95 transition">
                  <i data-lucide="camera" class="w-7 h-7 text-blue-400"></i>
                  <span class="text-xs font-black">📸 เปิดกล้องถ่ายสด</span>
                  <span class="text-[10px] text-slate-400">ปั๊มพิกัด GPS บนรูป</span>
                </button>

                <!-- Option 2: Upload from Phone Storage / Gallery -->
                <button type="button" onclick="document.getElementById('excavator-photo-file-input').click()" class="p-4 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/50 rounded-2xl flex flex-col items-center justify-center gap-1 text-purple-300 active:scale-95 transition">
                  <i data-lucide="image-plus" class="w-7 h-7 text-purple-400"></i>
                  <span class="text-xs font-black">📁 อัปโหลดจากมือถือ</span>
                  <span class="text-[10px] text-slate-400">เลือกรูปจากคลังภาพ</span>
                </button>
              </div>
              <p class="text-[11px] text-slate-400 text-center pt-0.5">
                💡 หากไม่สะดวกถ่ายรูป สามารถกดปุ่มบันทึกด้านล่างได้ทันที
              </p>
            `}
          </div>

          <!-- Submit Button (ไม่บังคับรูป กดบันทึกได้เสมอ) -->
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
                    <p class="text-[10px] text-slate-400">${l.timestamp || l.date} ${l.photoBase64 ? '• 📸 มีรูป' : '• 📄 ไม่แนบรูป'}</p>
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
    this.customScoopRate = null;
    window.app.render();
  }

  handleCustomRateChange(val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      this.customScoopRate = num;
    }
    window.app.render();
  }

  setCustomRate(rate) {
    this.customScoopRate = rate;
    window.app.render();
  }

  resetCustomRate() {
    this.customScoopRate = null;
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
    this.customScoopRate = null;
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
      this.customScoopRate = null;
      this.scoopPhoto = null;
      this.scoopGPS = null;
      localStorage.removeItem('quarry_excavator_shift');
      window.app.render();
    }
  }

  // ถ่ายภาพสดจากกล้องพร้อมปั๊มลายน้ำ
  async captureScoopPhoto() {
    const user = window.authService.getUser();
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruck = truckSelect ? truckSelect.value : (this.selectedTargetTruck || 'TRUCK');

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

  // อัปโหลดรูปภาพจากโทรศัพท์ / คลังภาพ (Mobile File Picker)
  handlePhotoFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const user = window.authService.getUser();
    const truckSelect = document.getElementById('target-truck-select');
    const targetTruck = truckSelect ? truckSelect.value : (this.selectedTargetTruck || 'TRUCK');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        // ย่อขนาดให้เหมาะสมกับการบันทึกและการพิมพ์ (สูงสุด 1280px)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // ปั๊มข้อความแสดงการอัปโหลด ทะเบียนรถ และเวลา
        const timestamp = new Date().toLocaleString('th-TH');
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(10, height - 52, width - 20, 42);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`🚜 ${this.selectedShiftExcavator} → 🚚 ${targetTruck}`, 22, height - 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${timestamp} | อัปโหลดจากโทรศัพท์ (${user.name})`, 22, height - 14);

        this.scoopPhoto = canvas.toDataURL('image/jpeg', 0.82);
        this.scoopGPS = { lat: 17.48812, lng: 101.72345 };
        window.app.render();
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearScoopPhoto() {
    this.scoopPhoto = null;
    this.scoopGPS = null;
    window.app.render();
  }

  // บันทึกรายการตักหิน (ไม่บังคับรูปถ่าย)
  handleSaveScoopLog() {
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
      photoBase64: this.scoopPhoto || null,
      photoUrl: this.scoopPhoto || null,
      lat: this.scoopGPS ? this.scoopGPS.lat : 17.48812,
      lng: this.scoopGPS ? this.scoopGPS.lng : 101.72345
    };

    window.quarryStore.saveExcavatorLog(logRecord);

    const hadPhoto = !!this.scoopPhoto;
    this.scoopPhoto = null;
    this.scoopGPS = null;

    alert(`🎉 บันทึกการตักให้รถ ${targetTruck} สำเร็จ!\n💰 ค่าตักที่ได้รับ: +${rate} บาท${hadPhoto ? ' (แนบรูปเรียบร้อย)' : ' (บันทึกแบบไม่แนบรูป)'}`);
    window.app.render();
  }
}

window.excavatorView = new ExcavatorView();

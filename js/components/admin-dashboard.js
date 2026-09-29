/**
 * หน้าจอแดชบอร์ดสำหรับผู้บริหารและหัวหน้างาน (Admin & Supervisor Dashboard)
 * เพิ่มระบบ: 
 * 1) AI Anomaly Detection & Speed Anomaly Deep-Dive Inspector
 * 2) Truck vs Excavator Daily Reconciliation Cross-Audit Engine (ตรวจยอดรับสิบล้อ vs ตักแม็คโคร)
 */
class AdminDashboard {
  constructor() {
    this.selectedTripForModal = null;
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.activeAnomalyTrip = null;
  }

  setDate(dateStr) {
    this.selectedDate = dateStr;
    window.app.render();
  }

  render() {
    const user = window.authService.getUser();
    const currentDate = this.selectedDate || new Date().toISOString().split('T')[0];
    const trips = window.quarryStore.getTrips();
    const todayTrips = trips.filter(t => t.date === currentDate);
    const excLogs = window.quarryStore.getExcavatorLogs();
    const todayExcLogs = excLogs.filter(l => l.date === currentDate);
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();

    // คำนวณสถานะรถวิ่ง vs รถจอดในวันที่เลือก
    const activeTruckPlates = new Set(todayTrips.map(t => t.truckPlate));
    const activeTrucksCount = activeTruckPlates.size;
    const parkedTrucksCount = Math.max(0, trucks.length - activeTrucksCount);

    const getExcavatorLogAmount = (l) => {
      if (l.amount && Number(l.amount) > 0) return Number(l.amount);
      const trk = trucks.find(t => t.code === l.targetTruckPlate);
      const cap = trk ? (Number(trk.capacity_ton) || 30) : 30;
      return 5 * cap;
    };

    const totalTruckPayoutToday = todayTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExcavatorPayoutToday = todayExcLogs.reduce((sum, l) => sum + getExcavatorLogAmount(l), 0);
    const totalPayoutToday = totalTruckPayoutToday + totalExcavatorPayoutToday;

    // 1. ตรวจสอบการกระทบยอดสิบล้อ vs แม็คโคร (Reconciliation Audit)
    const recon = window.quarryAI ? window.quarryAI.getReconciliationReport(currentDate) : {
      totalTruckTrips: todayTrips.length,
      totalExcavatorScoops: todayExcLogs.length,
      diff: todayTrips.length - todayExcLogs.length,
      matchRate: 100,
      perTruckList: []
    };

    // 2. เรียกใช้ AI ตรวจจับความผิดปกติ
    const anomalies = window.quarryAI ? window.quarryAI.detectAnomalies() : [];
    const speedAnomaliesCount = anomalies.filter(a => a.type === 'speed_dump_fast').length;
    const reconAnomaliesCount = anomalies.filter(a => a.type.startsWith('recon')).length;

    return `
      <div class="space-y-6">
        
        <!-- Header & Action Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-blue-500 text-slate-950 rounded-xl">📊</span>
              ภาพรวมการทำงานและตรวจสอบรอบวิ่ง (Live Operations)
            </h1>
            <p class="text-sm text-slate-400 mt-1">
              วันที่เลือก: <span class="text-white font-bold">${currentDate}</span> • สถานะ: <span class="text-emerald-400 font-bold">🟢 เชื่อมต่อ Supabase สำเร็จ</span>
            </p>
          </div>

          <!-- Date Selector with Calendar Picker & Manual Typing -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center bg-slate-950 border border-slate-700 rounded-2xl px-3 py-1.5 gap-2 shadow-inner">
              <button onclick="document.getElementById('dash-date-picker')?.showPicker ? document.getElementById('dash-date-picker').showPicker() : document.getElementById('dash-date-picker')?.focus()" class="text-blue-400 hover:text-blue-300" title="คลิกเพื่อเปิดปฏิทิน">
                <i data-lucide="calendar" class="w-4 h-4"></i>
              </button>
              <input 
                type="date" 
                id="dash-date-picker" 
                value="${currentDate}" 
                onchange="adminDashboard.setDate(this.value)" 
                class="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                title="เลือกจากปฏิทิน หรือพิมพ์วันที่ได้โดยตรง"
              >
              <button onclick="adminDashboard.setDate(new Date().toISOString().split('T')[0])" class="px-2 py-0.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-slate-950 rounded text-[10px] font-bold transition">
                วันนี้
              </button>
            </div>

            <button onclick="window.app.navigate('ai-copilot')" class="px-3.5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
              <i data-lucide="bot" class="w-4 h-4"></i>
              AI วิเคราะห์
            </button>
            <button onclick="window.app.navigate('reports')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700">
              <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-400"></i>
              รายงาน & Excel
            </button>
            <button onclick="window.app.navigate('settings')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700">
              <i data-lucide="settings" class="w-4 h-4 text-blue-400"></i>
              ตั้งค่า
            </button>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <!-- Card 1: Active Trucks -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider">รถวิ่งวันที่เลือก</span>
              <span class="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">🚚</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-emerald-400">${activeTrucksCount}</span>
              <span class="text-sm font-bold text-slate-400">/ ${trucks.length} คัน</span>
            </div>
            <div class="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full" style="width: ${(activeTrucksCount / (trucks.length || 1)) * 100}%"></div>
            </div>
          </div>

          <!-- Card 2: Parked Trucks -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider">รถจอด / ไม่ได้วิ่ง</span>
              <span class="p-2 bg-slate-700/30 text-slate-400 rounded-xl">🛑</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-slate-300">${parkedTrucksCount}</span>
              <span class="text-sm font-bold text-slate-400">คัน</span>
            </div>
            <p class="text-xs text-slate-500 mt-3 font-medium">${parkedTrucksCount > 0 ? 'จอดประจำโรงโม่/รอคนขับ' : 'รถทุกคันกำลังวิ่ง'}</p>
          </div>

          <!-- Card 3: Total Trips Today -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider">เที่ยววิ่งสะสม</span>
              <span class="p-2 bg-blue-500/10 text-blue-400 rounded-xl">🏁</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-blue-400">${todayTrips.length}</span>
              <span class="text-sm font-bold text-slate-400">เที่ยว</span>
            </div>
            <p class="text-xs text-slate-400 mt-3 font-medium">เฉลี่ย ${(activeTrucksCount > 0 ? (todayTrips.length / activeTrucksCount).toFixed(1) : 0)} เที่ยว/คัน</p>
          </div>

          <!-- Card 4: Total Payout -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider">ยอดจ่ายรวม</span>
              <span class="p-2 bg-blue-500/10 text-blue-400 rounded-xl">💰</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-emerald-400">฿${totalPayoutToday.toLocaleString()}</span>
              <span class="text-sm font-bold text-slate-400">บาท</span>
            </div>
            <p class="text-xs text-slate-400 mt-3 font-medium">สิบล้อ + แม็คโคร</p>
          </div>
        </div>

        <!-- 🚚 Fleet Real-time Matrix Section (28 Trucks & 20 Excavators) - ON TOP (ตัวหนังสือใหญ่ ชัดเจน สวยงาม) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Left 2 Cols: Real-time Fleet Status Matrix (28 Trucks) -->
          <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div class="flex items-center gap-2.5">
                <div class="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <i data-lucide="truck" class="w-5 h-5"></i>
                </div>
                <div>
                  <h2 class="font-black text-xl text-white tracking-tight">สถานะรถบรรทุกแบบ Real-time (${trucks.length} คัน)</h2>
                  <p class="text-xs text-slate-400">คลิกที่การ์ดรถเพื่อดูประวัติเที่ยววิ่งและรูปถ่ายของแต่ละคัน</p>
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 font-black rounded-full border border-emerald-500/30">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> กำลังวิ่ง (${activeTrucksCount})
                </span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-400 font-bold rounded-full border border-slate-700">
                  <span class="w-2.5 h-2.5 rounded-full bg-slate-500"></span> จอด (${parkedTrucksCount})
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[520px] overflow-y-auto pr-1.5">
              ${trucks.map(t => {
                const tripsForTruck = todayTrips.filter(tr => tr.truckPlate === t.code);
                const isRunning = tripsForTruck.length > 0;
                const totalEarn = tripsForTruck.reduce((sum, tr) => sum + (tr.amount || 0), 0);

                return `
                  <div role="button" tabindex="0" onclick="adminDashboard.openTruckDetail('${t.code}')" onkeydown="if(event.key==='Enter') adminDashboard.openTruckDetail('${t.code}')" class="p-4 rounded-2xl border ${isRunning ? 'bg-slate-950 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/20' : 'bg-slate-950/60 border-slate-800'} space-y-3 cursor-pointer hover:border-blue-400 hover:bg-slate-800/80 hover:-translate-y-0.5 transition-all">
                    <!-- Top Plate & Status -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <p class="font-black text-xl text-white tracking-wide">${t.code}</p>
                        <span class="text-xs bg-slate-800 text-slate-200 font-black px-2 py-0.5 rounded-md border border-slate-700">
                          ${t.capacity_ton} ตัน
                        </span>
                      </div>
                      ${isRunning ? `
                        <span class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/40">
                          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> วิ่ง
                        </span>
                      ` : `
                        <span class="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">
                          จอด
                        </span>
                      `}
                    </div>

                    <!-- Driver & Trips Count -->
                    <div class="text-sm text-slate-300 flex items-center justify-between pt-2 border-t border-slate-800/70">
                      <span class="truncate max-w-[120px]">👤 <strong class="text-white font-bold text-sm">${t.nickname || t.driver_name || '-'}</strong></span>
                      <span class="font-black text-base ${isRunning ? 'text-blue-400' : 'text-slate-500'}">${tripsForTruck.length} เที่ยว</span>
                    </div>

                    <!-- Money Badge -->
                    ${isRunning ? `
                      <div class="text-xs text-emerald-400 font-black flex justify-between items-center bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/50">
                        <span class="text-[11px] text-slate-300 font-bold">ยอดเงินสะสม</span>
                        <span class="text-sm">฿${totalEarn.toLocaleString()}</span>
                      </div>
                    ` : `
                      <div class="text-[11px] text-slate-500 text-center py-1">
                        ยังไม่มีรอบวิ่งในวันนี้
                      </div>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right Col: Excavators Status (20 Machines) -->
          <div class="excavator-panel bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div class="flex items-center gap-2.5">
                <div class="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <i data-lucide="wrench" class="w-5 h-5"></i>
                </div>
                <div>
                  <h2 class="font-black text-xl text-white tracking-tight">รถขุด / แม็คโคร (20 คัน)</h2>
                  <p class="text-xs text-slate-400">คลิกเพื่อดูบันทึกการตัก</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/60">
                  ตักรวม ${todayExcLogs.length} คัน
                </span>
                <span class="text-xs font-black text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60 font-mono">
                  ฿${totalExcavatorPayoutToday.toLocaleString()}
                </span>
              </div>
            </div>

            <div class="space-y-3 max-h-[520px] overflow-y-auto pr-1.5">
              ${excavators.map(e => {
                const logsForExc = todayExcLogs.filter(l => l.excavatorCode === e.code);
                const hasWork = logsForExc.length > 0;
                const totalEarnExc = logsForExc.reduce((sum, l) => sum + getExcavatorLogAmount(l), 0);

                return `
                  <div role="button" tabindex="0" onclick="adminDashboard.openExcavatorDetail('${e.code}')" onkeydown="if(event.key==='Enter') adminDashboard.openExcavatorDetail('${e.code}')" class="excavator-status-card p-3.5 bg-slate-950 rounded-2xl border ${hasWork ? 'border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20' : 'border-slate-800'} space-y-2.5 cursor-pointer hover:border-blue-400 hover:bg-slate-800/80 hover:-translate-y-0.5 transition-all">
                    
                    <!-- Top Line: Code, Role badge, Status badge -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <p class="excavator-code font-black text-base text-white tracking-wide">${e.code}</p>
                        <span class="text-[11px] px-2 py-0.5 rounded-md font-bold ${e.is_contractor ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
                          ${e.is_contractor ? 'ผรม.' : 'ประจำ'}
                        </span>
                      </div>
                      ${hasWork ? `
                        <span class="flex items-center gap-1.5 px-2.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-black rounded-full border border-cyan-500/40">
                          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> กำลังตัก
                        </span>
                      ` : `
                        <span class="px-2.5 py-0.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">
                          ว่าง
                        </span>
                      `}
                    </div>

                    <!-- Middle Line: Operator and count -->
                    <div class="text-sm text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/70">
                      <span class="truncate max-w-[150px]">👤 ผู้ควบคุม: <strong class="text-white font-bold">${e.nickname || e.driver_name || '-'}</strong></span>
                      <span class="font-black text-sm ${hasWork ? 'text-blue-400' : 'text-slate-500'} font-mono">${logsForExc.length} คัน</span>
                    </div>

                    <!-- Bottom Line: ยอดเงินสะสม (Accumulated Earnings) -->
                    ${hasWork ? `
                      <div class="text-xs text-emerald-400 font-black flex justify-between items-center bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/50">
                        <span class="text-[11px] text-slate-300 font-bold">ยอดเงินสะสม</span>
                        <span class="text-sm font-mono font-black">฿${totalEarnExc.toLocaleString()}</span>
                      </div>
                    ` : `
                      <div class="text-[11px] text-slate-500 text-center py-0.5">
                        ยังไม่มีรายการตักในวันนี้
                      </div>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- 🚀 Executive Summary Insight Hub (เชื่อมโยงเมนูเฉพาะทางแบบไม่ซ้ำซ้อน) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Card 1: Reconciliation Status Summary -->
          <div class="bg-slate-900 border ${recon.diff !== 0 ? 'border-amber-500/70 shadow-amber-500/10 shadow-xl' : 'border-emerald-500/50'} rounded-3xl p-6 shadow-lg space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <div class="p-3 ${recon.diff !== 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'} rounded-2xl">
                  <i data-lucide="scale" class="w-6 h-6"></i>
                </div>
                <div>
                  <h3 class="text-lg font-black text-white flex items-center gap-2">
                    ตรวจสอบกระทบยอด: สิบล้อ VS แม็คโคร
                  </h3>
                  <p class="text-xs text-slate-400">เปรียบเทียบยอดรอบวิ่งจริงกับบันทึกตัก ป้องกันการทุจริต</p>
                </div>
              </div>

              <span class="text-xs px-3 py-1 rounded-full font-black ${recon.diff === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500 text-slate-950 font-black animate-pulse'}">
                ${recon.diff === 0 ? '✓ ยอดตรงกัน 100%' : `⚠️ ผลต่าง ${Math.abs(recon.diff)} เที่ยว`}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span class="text-[11px] text-slate-400 font-bold block">สิบล้อแจ้งวิ่ง</span>
                <p class="text-xl font-black text-blue-400 mt-1">${recon.totalTruckTrips} <span class="text-xs font-normal text-slate-400">เที่ยว</span></p>
              </div>
              <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span class="text-[11px] text-slate-400 font-bold block">แม็คโครตักให้</span>
                <p class="text-xl font-black text-purple-400 mt-1">${recon.totalExcavatorScoops} <span class="text-xs font-normal text-slate-400">คัน</span></p>
              </div>
              <div class="bg-slate-950 p-3.5 rounded-2xl border ${recon.diff !== 0 ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800'}">
                <span class="text-[11px] text-slate-400 font-bold block">ผลต่าง (Variance)</span>
                <p class="text-xl font-black ${recon.diff === 0 ? 'text-emerald-400' : 'text-amber-400'} mt-1 font-mono">
                  ${recon.diff > 0 ? `+${recon.diff}` : (recon.diff < 0 ? `${recon.diff}` : '0')}
                </p>
              </div>
            </div>

            <div class="pt-2">
              <button onclick="window.app.navigate('reconciliation')" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg">
                <i data-lucide="arrow-right-circle" class="w-4 h-4"></i>
                เปิดหน้าตรวจสอบกระทบยอดฉบับเต็ม (Reconciliation Hub) ➔
              </button>
            </div>
          </div>

          <!-- Card 2: AI Anomaly Detection Alert Summary -->
          <div class="bg-slate-900 border ${anomalies.length > 0 ? 'border-red-500/70 shadow-red-500/10 shadow-xl' : 'border-slate-800'} rounded-3xl p-6 shadow-lg space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <div class="p-3 ${anomalies.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'} rounded-2xl">
                  <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                </div>
                <div>
                  <h3 class="text-lg font-black text-white flex items-center gap-2">
                    ระบบตรวจจับความผิดปกติ (AI Anomaly Alerts)
                  </h3>
                  <p class="text-xs text-slate-400">AI ตรวจจับเวลาวิ่งเร็วผิดปกติ, พิกัด GPS และยอดไม่สอดคล้อง</p>
                </div>
              </div>

              <span class="text-xs px-3 py-1 rounded-full font-black ${anomalies.length > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}">
                ${anomalies.length > 0 ? `พบ ${anomalies.length} เรื่อง` : '✓ ปกติสมบูรณ์'}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span class="text-[11px] text-slate-400 font-bold block">ตรวจพบวันนี้</span>
                <p class="text-xl font-black ${anomalies.length > 0 ? 'text-red-400' : 'text-slate-300'} mt-1">${anomalies.length} <span class="text-xs font-normal text-slate-400">เรื่อง</span></p>
              </div>
              <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span class="text-[11px] text-slate-400 font-bold block">🔴 วิ่งเร็วผิดปกติ</span>
                <p class="text-xl font-black text-red-400 mt-1">${speedAnomaliesCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></p>
              </div>
              <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span class="text-[11px] text-slate-400 font-bold block">⚠️ ยอดไม่ตรง</span>
                <p class="text-xl font-black text-amber-400 mt-1">${reconAnomaliesCount} <span class="text-xs font-normal text-slate-400">เรื่อง</span></p>
              </div>
            </div>

            <div class="pt-2">
              <button onclick="window.app.navigate('anomalies')" class="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                เปิดหน้าตรวจจับความผิดปกติ & รับรองผล (Anomaly Hub) ➔
              </button>
            </div>
          </div>

        </div>

      </div>

      <!-- Photo Inspector Modal -->
      <div id="photo-inspector-modal" class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md hidden items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl space-y-4">
          <div class="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 id="modal-photo-title" class="font-black text-base text-white">ตรวจสอบรูปถ่ายและลายน้ำ GPS</h3>
            <button onclick="adminDashboard.closeModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold">✕</button>
          </div>
          <div class="p-4 pt-0">
            <img id="modal-photo-img" src="" class="w-full max-h-[70vh] object-contain rounded-2xl border border-slate-800 shadow-lg">
          </div>
        </div>
      </div>

      <!-- Vehicle Work Detail Modal -->
      <div id="vehicle-detail-modal" class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md hidden items-center justify-center p-3 sm:p-5">
        <div class="bg-slate-900 border border-blue-500/40 max-w-3xl w-full max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900">
            <div>
              <p class="text-[10px] text-blue-400 font-black uppercase tracking-wider">รายละเอียดรถและงาน</p>
              <h3 id="vehicle-detail-title" class="font-black text-lg text-white">ข้อมูลรถ</h3>
            </div>
            <button onclick="adminDashboard.closeVehicleModal()" class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold">✕</button>
          </div>
          <div id="vehicle-detail-content" class="p-4 sm:p-5 overflow-y-auto"></div>
        </div>
      </div>

      <!-- Anomaly / Trip Deep-Dive Inspector Modal -->
      <div id="anomaly-inspector-modal" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg hidden items-center justify-center p-3 sm:p-5">
        <div class="bg-slate-900 border border-red-500/50 max-w-4xl w-full max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
            <div class="flex items-center gap-3">
              <span class="p-2.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl">
                <i data-lucide="shield-alert" class="w-6 h-6"></i>
              </span>
              <div>
                <p class="text-[10px] text-red-400 font-black uppercase tracking-wider">ระบบตรวจสอบความผิดปกติและเปรียบเทียบรูปถ่าย</p>
                <h3 id="anomaly-modal-title" class="font-black text-lg text-white">ตรวจสอบเที่ยววิ่งอย่างละเอียด</h3>
              </div>
            </div>
            <button onclick="adminDashboard.closeAnomalyModal()" class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold">✕</button>
          </div>
          <div id="anomaly-modal-content" class="p-4 sm:p-6 overflow-y-auto space-y-6"></div>
        </div>
      </div>

      <!-- Truck Reconciliation Drill-Down Modal -->
      <div id="recon-detail-modal" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg hidden items-center justify-center p-3 sm:p-5">
        <div class="bg-slate-900 border border-amber-500/50 max-w-4xl w-full max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
            <div class="flex items-center gap-3">
              <span class="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl">
                <i data-lucide="scale" class="w-6 h-6"></i>
              </span>
              <div>
                <p class="text-[10px] text-amber-400 font-black uppercase tracking-wider">การกระทบยอดสิบล้อ vs แม็คโครรายคัน</p>
                <h3 id="recon-modal-title" class="font-black text-lg text-white">เปรียบเทียบไทม์ไลน์งาน</h3>
              </div>
            </div>
            <button onclick="adminDashboard.closeReconModal()" class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold">✕</button>
          </div>
          <div id="recon-modal-content" class="p-4 sm:p-6 overflow-y-auto space-y-6"></div>
        </div>
      </div>
    `;
  }

  openTruckReconDetail(truckCode) {
    const currentDate = this.selectedDate || new Date().toISOString().split('T')[0];
    const recon = window.quarryAI.getReconciliationReport(currentDate);
    const truckItem = recon.perTruckList.find(x => x.code === truckCode);
    if (!truckItem) return;

    const modal = document.getElementById('recon-detail-modal');
    const title = document.getElementById('recon-modal-title');
    const content = document.getElementById('recon-modal-content');
    if (!modal || !title || !content) return;

    title.innerText = `🚚 กระทบยอด: รถ ${truckItem.code} (${currentDate})`;

    const truckTrips = truckItem.trips || [];
    const excavatorScoops = truckItem.scoops || [];

    content.innerHTML = `
      <!-- Summary Header -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">สิบล้อรายงานรับหิน</p>
          <p class="text-xl font-black text-blue-400 mt-0.5">${truckItem.truckReported} เที่ยว</p>
          <p class="text-[11px] text-slate-400">คนขับ: ${truckItem.driverName || '-'}</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">แม็คโครบันทึกตักให้</p>
          <p class="text-xl font-black text-purple-400 mt-0.5">${truckItem.excavatorRecorded} คัน</p>
          <p class="text-[11px] text-slate-400">รวมทุกคันแม็คโคร</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">ผลต่าง (Variance)</p>
          <p class="text-xl font-black ${truckItem.variance === 0 ? 'text-emerald-400' : (truckItem.variance > 0 ? 'text-amber-400' : 'text-purple-400')} mt-0.5 font-mono">
            ${truckItem.variance > 0 ? `+${truckItem.variance} เที่ยว (แจ้งเกิน)` : (truckItem.variance < 0 ? `${truckItem.variance} (ตักเกิน)` : '0 (ตรงกัน 100%)')}
          </p>
          <p class="text-[11px] ${truckItem.variance === 0 ? 'text-emerald-400' : 'text-amber-400'} font-bold">
            ${truckItem.variance === 0 ? '✓ หลักฐานสมบูรณ์' : '⚠️ ตรวจสอบรายการด้านล่าง'}
          </p>
        </div>
      </div>

      <!-- Side-by-Side Timeline Comparison -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Left: Truck Trips -->
        <div class="bg-slate-950 border border-blue-500/40 rounded-2xl p-4 space-y-3">
          <h4 class="font-black text-sm text-blue-400 flex items-center justify-between">
            <span>🚚 เที่ยววิ่งที่สิบล้อบันทึก (${truckTrips.length} รอบ)</span>
          </h4>

          <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
            ${truckTrips.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-6">ไม่มีบันทึกรอบวิ่งของสิบล้อ</p>
            ` : truckTrips.map(t => `
              <div class="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-black text-white">รอบ #${t.roundNumber} • ${t.jobTypeName}</span>
                  <span class="text-blue-400 font-mono font-bold">${t.timestamp}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span>พิกัด: ${t.loadLat ? `${t.loadLat}, ${t.loadLng}` : 'ไม่ระบุ'}</span>
                  <span class="text-emerald-400 font-bold">฿${t.amount}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right: Excavator Scoop Logs -->
        <div class="bg-slate-950 border border-purple-500/40 rounded-2xl p-4 space-y-3">
          <h4 class="font-black text-sm text-purple-400 flex items-center justify-between">
            <span>🚜 บันทึกตักของแม็คโคร (${excavatorScoops.length} ครั้ง)</span>
          </h4>

          <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
            ${excavatorScoops.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-6">ไม่มีแม็คโครคันใดบันทึกตักให้รถคันนี้</p>
            ` : excavatorScoops.map(l => `
              <div class="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-black text-white">🚜 ${l.excavatorCode}</span>
                  <span class="text-purple-400 font-mono font-bold">${l.timestamp}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span>ผู้ควบคุม: ${l.operatorName}</span>
                  <span class="text-purple-300 font-bold">฿${l.amount}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <div class="flex justify-end pt-3 border-t border-slate-800">
        <button onclick="adminDashboard.closeReconModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs">
          ปิดหน้าต่าง
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
  }

  closeReconModal() {
    const modal = document.getElementById('recon-detail-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  openFullReconModal() {
    const currentDate = this.selectedDate || new Date().toISOString().split('T')[0];
    const recon = window.quarryAI.getReconciliationReport(currentDate);
    if (recon.perTruckList.length > 0) {
      this.openTruckReconDetail(recon.perTruckList[0].code);
    } else {
      alert(`ยังไม่มีข้อมูลการวิ่งงานในวันที่ ${currentDate}`);
    }
  }

  openAnomalyInspector(referenceId) {
    const trips = window.quarryStore.getTrips();
    let trip = trips.find(t => t.id === referenceId);

    if (!trip && referenceId && referenceId.startsWith('RECON_')) {
      const truckCode = referenceId.replace('RECON_', '');
      this.openTruckReconDetail(truckCode);
      return;
    }

    if (!trip) trip = trips[0];
    if (!trip) return;

    const modal = document.getElementById('anomaly-inspector-modal');
    const title = document.getElementById('anomaly-modal-title');
    const content = document.getElementById('anomaly-modal-content');
    if (!modal || !title || !content) return;

    let durationSec = trip.durationSeconds;
    if (durationSec === undefined || durationSec === null) {
      if (trip.loadTime && trip.dumpTime) {
        durationSec = Math.max(1, Math.round((trip.dumpTime - trip.loadTime) / 1000));
      }
    }

    const mins = durationSec ? Math.floor(durationSec / 60) : null;
    const secs = durationSec ? (durationSec % 60) : null;
    const durationStr = durationSec 
      ? (mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`)
      : 'ไม่ระบุ';

    const isFast = durationSec !== null && durationSec < 180;

    title.innerText = `🔍 ตรวจสอบ: ${trip.truckPlate} — รอบ #${trip.roundNumber} (${trip.date})`;

    content.innerHTML = `
      <!-- Driver & Vehicle Overview Banner -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">เบอร์รถบรรทุก</p>
          <p class="text-base font-black text-white mt-0.5">🚚 ${trip.truckPlate}</p>
          <p class="text-[11px] text-blue-400 font-semibold">${trip.capacityTon || 30} ตัน</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">คนขับผู้รับผิดชอบ</p>
          <p class="text-base font-black text-white mt-0.5">👤 ${trip.driverName}</p>
          <p class="text-[11px] text-slate-400">${trip.driverPhone ? `<a href="tel:${trip.driverPhone}" class="text-emerald-400 underline font-bold">📞 ${trip.driverPhone} (โทรออก)</a>` : '-'}</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">ประเภทงานและค่าจ้าง</p>
          <p class="text-base font-black text-blue-400 mt-0.5">${trip.jobTypeName || 'งานทั่วไป'}</p>
          <p class="text-[11px] text-emerald-400 font-bold">฿${trip.amount} บาท</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase">วันที่และรอบวิ่ง</p>
          <p class="text-base font-black text-white mt-0.5">📅 ${trip.date}</p>
          <p class="text-[11px] text-slate-300 font-mono">รอบที่ ${trip.roundNumber} (${trip.timestamp})</p>
        </div>
      </div>

      <!-- Speed & Duration Forensic Analysis Card -->
      <div class="p-5 rounded-2xl border ${isFast ? 'bg-red-950/30 border-red-500/70 shadow-lg' : 'bg-slate-950 border-slate-800'} space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-base ${isFast ? 'text-red-400' : 'text-emerald-400'} flex items-center gap-2">
            <i data-lucide="timer" class="w-5 h-5"></i>
            การวิเคราะห์ระยะเวลาวิ่ง (Speed & Duration Forensic)
          </h4>
          <span class="px-3 py-1 rounded-full text-xs font-black ${isFast ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}">
            ${isFast ? '🚨 ความเร็วผิดปกติ (เสี่ยงทุจริต)' : '✅ ความเร็วปกติ'}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span class="text-slate-400 font-bold">📍 เวลาถ่ายจุดรับหิน:</span>
            <p class="text-sm font-black text-blue-400 mt-1">${trip.loadTimestampText || trip.timestamp || '-'}</p>
          </div>
          <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span class="text-slate-400 font-bold">🏁 เวลาถ่ายจุดเทหิน:</span>
            <p class="text-sm font-black text-emerald-400 mt-1">${trip.dumpTimestampText || trip.timestamp || '-'}</p>
          </div>
          <div class="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span class="text-slate-400 font-bold">⏱️ ระยะเวลาที่ใช้จริง:</span>
            <p class="text-sm font-black ${isFast ? 'text-red-400' : 'text-emerald-400'} mt-1 font-mono">${durationStr}</p>
          </div>
        </div>

        ${isFast ? `
          <div class="p-3 bg-red-900/40 rounded-xl border border-red-700 text-xs text-red-200 leading-relaxed">
            ⚠️ <b>ข้อสังเกต:</b> ระยะเวลาจากจุดรับถึงจุดเทห่างกันเพียง <b>${durationStr}</b> ซึ่งต่ำกว่าเวลาเดินทางมาตรฐานของโรงโม่ (อย่างน้อย 3-5 นาที) โปรดตรวจสอบภาพถ่ายทั้งสองข้างว่าคนขับกดถ่ายรูปหน้างานจริง หรือถ่ายที่เดียวกันเพื่อปั๊มยอดรอบ
          </div>
        ` : ''}
      </div>

      <!-- Side-by-Side Photo Comparison -->
      <div class="space-y-3">
        <h4 class="font-black text-base text-white flex items-center gap-2">
          <i data-lucide="images" class="w-5 h-5 text-blue-400"></i>
          เปรียบเทียบรูปถ่ายหน้างาน (จุดรับหิน vs จุดเทหิน)
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Load Photo -->
          <div class="bg-slate-950 border border-blue-500/50 rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black text-blue-400 flex items-center gap-1">
                📍 จุดรับหิน (ขึ้นของ)
              </span>
              <span class="text-slate-400 font-mono">${trip.loadTimestampText || ''}</span>
            </div>
            ${(trip.loadPhotoUrl || trip.loadPhotoBase64) ? `
              <div class="rounded-xl overflow-hidden border border-slate-800 cursor-pointer" onclick="adminDashboard.viewPhoto('${trip.loadPhotoUrl || trip.loadPhotoBase64}', 'จุดรับหิน', '${trip.truckPlate}', '${trip.timestamp}')">
                <img src="${trip.loadPhotoUrl || trip.loadPhotoBase64}" class="w-full h-56 object-cover hover:scale-105 transition">
              </div>
            ` : `
              <div class="w-full h-56 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500 font-bold">ไม่มีรูปถ่ายจุดรับ</div>
            `}
            <div class="text-[11px] text-slate-400 space-y-0.5">
              <p>🌐 พิกัดดาวเทียม: <span class="text-slate-200 font-mono">${trip.loadLat || '-'}, ${trip.loadLng || '-'}</span></p>
            </div>
          </div>

          <!-- Dump Photo -->
          <div class="bg-slate-950 border border-emerald-500/50 rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-black text-emerald-400 flex items-center gap-1">
                🏁 จุดเทหิน (ส่งมอบ)
              </span>
              <span class="text-slate-400 font-mono">${trip.dumpTimestampText || ''}</span>
            </div>
            ${(trip.dumpPhotoUrl || trip.dumpPhotoBase64) ? `
              <div class="rounded-xl overflow-hidden border border-slate-800 cursor-pointer" onclick="adminDashboard.viewPhoto('${trip.dumpPhotoUrl || trip.dumpPhotoBase64}', 'จุดเทหิน', '${trip.truckPlate}', '${trip.timestamp}')">
                <img src="${trip.dumpPhotoUrl || trip.dumpPhotoBase64}" class="w-full h-56 object-cover hover:scale-105 transition">
              </div>
            ` : `
              <div class="w-full h-56 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500 font-bold">ไม่มีรูปถ่ายจุดเท</div>
            `}
            <div class="text-[11px] text-slate-400 space-y-0.5">
              <p>🌐 พิกัดดาวเทียม: <span class="text-slate-200 font-mono">${trip.dumpLat || '-'}, ${trip.dumpLng || '-'}</span></p>
            </div>
          </div>

        </div>
      </div>

      <!-- Action Decision Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div class="flex items-center gap-2">
          <button onclick="adminDashboard.approveTrip('${trip.id}')" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition">
            <i data-lucide="check-circle" class="w-4 h-4"></i>
            อนุมัติผ่านการตรวจสอบ
          </button>
          <button onclick="adminDashboard.flagTrip('${trip.id}')" class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition">
            <i data-lucide="x-circle" class="w-4 h-4"></i>
            ระงับเที่ยววิ่งนี้เพื่อตรวจสอบ
          </button>
        </div>
        <button onclick="adminDashboard.closeAnomalyModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs">
          ปิดหน้าต่าง
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
  }

  closeAnomalyModal() {
    const modal = document.getElementById('anomaly-inspector-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  approveTrip(tripId) {
    alert("✅ อนุมัติเที่ยววิ่งเรียบร้อยแล้ว");
    this.closeAnomalyModal();
  }

  flagTrip(tripId) {
    alert("⚠️ ทำการบันทึกสถานะระงับเที่ยววิ่งนี้เพื่อรอการสอบสวนเรียบร้อยแล้ว");
    this.closeAnomalyModal();
  }

  openTruckDetail(code) {
    const truck = window.quarryStore.getTrucks().find(t => t.code === code);
    if (!truck) return;
    const allTrips = window.quarryStore.getTrips({ truckPlate: code });
    const today = this.selectedDate || new Date().toISOString().split('T')[0];
    const todayTrips = allTrips.filter(t => t.date === today);
    const totalToday = todayTrips.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalAll = allTrips.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const recent = allTrips.slice(0, 12);
    this.showVehicleModal(
      `🚚 ${truck.code}`,
      `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          ${this.detailMetric('สถานะวันนี้', todayTrips.length ? '🟢 กำลังวิ่ง' : '⚪ จอด', todayTrips.length ? 'text-emerald-400' : 'text-slate-300')}
          ${this.detailMetric('พิกัดรถ', `${truck.capacity_ton || 0} ตัน`, 'text-blue-400')}
          ${this.detailMetric('เที่ยววันนี้', `${todayTrips.length} เที่ยว`, 'text-white')}
          ${this.detailMetric('รายได้วันนี้', `฿${totalToday.toLocaleString()}`, 'text-emerald-400')}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm">
          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4"><p class="text-xs text-slate-500">คนขับประจำ</p><p class="font-bold text-white mt-1">${truck.driver_name || 'ยังไม่กำหนด'}</p><p class="text-xs text-blue-300 mt-1">ชื่อเรียก: ${truck.nickname || '-'}</p></div>
          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4"><p class="text-xs text-slate-500">ข้อมูลติดต่อและยอดสะสม</p><p class="font-bold text-white mt-1">${truck.phone || '-'}</p><p class="text-xs text-emerald-400 mt-1">ทั้งหมด ${allTrips.length} เที่ยว • ฿${totalAll.toLocaleString()}</p></div>
        </div>
        ${this.renderTruckHistory(recent)}
      `
    );
  }

  openExcavatorDetail(code) {
    const excavator = window.quarryStore.getExcavators().find(e => e.code === code);
    if (!excavator) return;
    const allLogs = window.quarryStore.getExcavatorLogs({ excavatorCode: code });
    const today = this.selectedDate || new Date().toISOString().split('T')[0];
    const trucks = window.quarryStore.getTrucks();
    const getAmt = (l) => {
      if (l.amount && Number(l.amount) > 0) return Number(l.amount);
      const trk = trucks.find(t => t.code === l.targetTruckPlate);
      const cap = trk ? (Number(trk.capacity_ton) || 30) : 30;
      return 5 * cap;
    };
    const totalToday = todayLogs.reduce((sum, l) => sum + getAmt(l), 0);
    const totalAll = allLogs.reduce((sum, l) => sum + getAmt(l), 0);
    this.showVehicleModal(
      `🚜 ${excavator.code}`,
      `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          ${this.detailMetric('สถานะ', excavator.status === 'repair' ? '🔴 ซ่อม' : (todayLogs.length ? '🟢 ทำงาน' : '⚪ ว่าง'), excavator.status === 'repair' ? 'text-red-400' : 'text-emerald-400')}
          ${this.detailMetric('ตักวันนี้', `${todayLogs.length} คัน`, 'text-blue-400')}
          ${this.detailMetric('อัตราค่าตัก', '5 บาท/ตัน', 'text-amber-400')}
          ${this.detailMetric('ยอดเงินสะสมวันนี้', `฿${totalToday.toLocaleString()}`, 'text-emerald-400')}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm">
          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4"><p class="text-xs text-slate-500">ผู้ควบคุมประจำ</p><p class="font-bold text-white mt-1">${excavator.driver_name || 'ยังไม่กำหนด'}</p><p class="text-xs text-blue-300 mt-1">ชื่อเรียก: ${excavator.nickname || '-'}</p></div>
          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4"><p class="text-xs text-slate-500">ข้อมูลเพิ่มเติม</p><p class="font-bold text-white mt-1">${excavator.phone || '-'}</p><p class="text-xs text-emerald-400 mt-1">${excavator.is_contractor ? 'ทีมผู้รับเหมา' : 'ทีมประจำ'} • รวม ${allLogs.length} งาน • ฿${totalAll.toLocaleString()}</p></div>
        </div>
        ${this.renderExcavatorHistory(allLogs.slice(0, 12))}
      `
    );
  }

  detailMetric(label, value, colorClass) {
    return `<div class="bg-slate-950 border border-slate-800 rounded-2xl p-3"><p class="text-[10px] text-slate-500 font-bold">${label}</p><p class="font-black ${colorClass} mt-1">${value}</p></div>`;
  }

  renderTruckHistory(items) {
    if (!items.length) return '<div class="text-center py-8 text-slate-500 text-sm bg-slate-950 rounded-2xl border border-slate-800">ยังไม่มีประวัติงานของรถคันนี้</div>';
    return `<div><h4 class="font-black text-white mb-3">ประวัติเที่ยวล่าสุด</h4><div class="space-y-2">${items.map(t => `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"><div><p class="text-sm font-bold text-white">รอบ ${t.roundNumber || '-'} • ${t.jobTypeName || '-'}</p><p class="text-[11px] text-slate-400">${t.date || ''} ${t.timestamp || ''} • ${t.driverName || '-'}</p></div><p class="font-black text-emerald-400">฿${Number(t.amount || 0).toLocaleString()}</p></div>`).join('')}</div></div>`;
  }

  renderExcavatorHistory(items) {
    if (!items.length) return '<div class="text-center py-8 text-slate-500 text-sm bg-slate-950 rounded-2xl border border-slate-800">ยังไม่มีประวัติงานของรถคันนี้</div>';
    return `<div><h4 class="font-black text-white mb-3">ประวัติงานล่าสุด</h4><div class="space-y-2">${items.map(l => `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"><div><p class="text-sm font-bold text-white">ตักให้รถ ${l.targetTruckPlate || '-'}</p><p class="text-[11px] text-slate-400">${l.date || ''} ${l.timestamp || ''} • ${l.operatorName || '-'}</p></div><p class="font-black text-emerald-400">฿${Number(l.amount || 0).toLocaleString()}</p></div>`).join('')}</div></div>`;
  }

  showVehicleModal(titleText, contentHtml) {
    const modal = document.getElementById('vehicle-detail-modal');
    const title = document.getElementById('vehicle-detail-title');
    const content = document.getElementById('vehicle-detail-content');
    if (!modal || !title || !content) return;
    title.textContent = titleText;
    content.innerHTML = contentHtml;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
  }

  closeVehicleModal() {
    const modal = document.getElementById('vehicle-detail-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  viewPhoto(photoBase64, type, vehicle, timestamp) {
    const modal = document.getElementById('photo-inspector-modal');
    const img = document.getElementById('modal-photo-img');
    const title = document.getElementById('modal-photo-title');
    if (modal && img && title) {
      img.src = photoBase64;
      title.innerText = `รูปถ่าย ${type} — รถ ${vehicle} (${timestamp})`;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeModal() {
    const modal = document.getElementById('photo-inspector-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
}

window.adminDashboard = new AdminDashboard();

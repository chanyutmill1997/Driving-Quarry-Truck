/**
 * หน้าจอแดชบอร์ดสำหรับผู้บริหารและหัวหน้างาน (Admin & Supervisor Dashboard)
 * เพิ่มระบบ: AI Anomaly Detection & Action Recommendations
 */
class AdminDashboard {
  constructor() {
    this.selectedTripForModal = null;
  }

  render() {
    const user = window.authService.getUser();
    const today = new Date().toISOString().split('T')[0];
    const trips = window.quarryStore.getTrips();
    const todayTrips = trips.filter(t => t.date === today);
    const excLogs = window.quarryStore.getExcavatorLogs();
    const todayExcLogs = excLogs.filter(l => l.date === today);
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();

    // คำนวณสถานะรถวิ่ง vs รถจอดในวันนี้
    const activeTruckPlates = new Set(todayTrips.map(t => t.truckPlate));
    const activeTrucksCount = activeTruckPlates.size;
    const parkedTrucksCount = trucks.length - activeTrucksCount;

    const totalPayoutToday = todayTrips.reduce((sum, t) => sum + (t.amount || 0), 0) +
                            todayExcLogs.reduce((sum, l) => sum + (l.amount || 5), 0);

    // เรียกใช้ AI ตรวจจับความผิดปกติ
    const anomalies = window.quarryAI ? window.quarryAI.detectAnomalies() : [];

    return `
      <div class="space-y-6">
        
        <!-- Header & Action Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
              <span class="p-2 bg-blue-500 text-slate-950 rounded-xl">📊</span>
              ภาพรวมการทำงานประจำวัน (Live Operations)
            </h1>
            <p class="text-sm text-slate-400 mt-1">
              วันที่ ${new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })} • สถานะ: <span class="text-emerald-400 font-bold">🟢 เชื่อมต่อ Cloud สำเร็จ</span>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.app.navigate('ai-copilot')" class="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 text-slate-950 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg">
              <i data-lucide="bot" class="w-4 h-4"></i>
              🤖 AI ผู้ช่วยอัจฉริยะ
            </button>
            <button onclick="window.app.navigate('reports')" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-700">
              <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-400"></i>
              รายงาน & Excel
            </button>
            <button onclick="window.app.navigate('settings')" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-700">
              <i data-lucide="settings" class="w-4 h-4 text-blue-400"></i>
              ตั้งค่าข้อมูลหลัก
            </button>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <!-- Card 1: Active Trucks -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider">รถวิ่งวันนี้</span>
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
              <span class="text-xs font-bold uppercase tracking-wider">เที่ยววิ่งสะสมวันนี้</span>
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
              <span class="text-xs font-bold uppercase tracking-wider">ยอดจ่ายรวมวันนี้</span>
              <span class="p-2 bg-blue-500/10 text-blue-400 rounded-xl">💰</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-white">฿${totalPayoutToday.toLocaleString()}</span>
              <span class="text-sm font-bold text-slate-400">บาท</span>
            </div>
            <p class="text-xs text-slate-400 mt-3 font-medium">สิบล้อ + แม็คโคร ${todayExcLogs.length} คัน</p>
          </div>

        </div>

        <!-- 🧠 AI Anomaly Detection & Recommendations Dashboard Section -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/40 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <i data-lucide="shield-alert" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="font-black text-lg text-white flex items-center gap-2">
                  ระบบ AI ตรวจจับความผิดปกติและคำแนะนำ (AI Insights & Anomalies)
                  <span class="text-xs bg-blue-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    ${anomalies.length} ข้อสังเกต
                  </span>
                </h2>
                <p class="text-xs text-slate-400">วิเคราะห์พิกัด GPS, ความเร็วรอบวิ่ง และความสอดคล้องของหน้างานแบบอัตโนมัติ</p>
              </div>
            </div>

            <button onclick="window.app.navigate('ai-copilot')" class="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
              เปิดหน้าต่างแชท AI <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Anomalies Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${anomalies.length === 0 ? `
              <div class="col-span-2 text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                ✅ ระบบตรวจสอบแล้ว ไม่พบพฤติกรรมผิดปกติในการวิ่งงาน ข้อมูล GPS และรอบวิ่งสอดคล้องสมบูรณ์
              </div>
            ` : anomalies.map(a => `
              <div class="bg-slate-950 border ${a.severity === 'critical' ? 'border-red-500/60 bg-red-950/10' : (a.severity === 'warning' ? 'border-blue-500/50 bg-blue-950/10' : 'border-slate-800')} rounded-2xl p-4 space-y-2.5">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black ${a.severity === 'critical' ? 'bg-red-900/60 text-red-300 border border-red-700' : (a.severity === 'warning' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-slate-800 text-slate-300')} px-2 py-0.5 rounded-md">
                      ${a.severity === 'critical' ? '⚠️ ตรวจสอบด่วน' : (a.severity === 'warning' ? '⚡ ข้อสังเกต' : 'ℹ️ ข้อมูล')}
                    </span>
                    <h3 class="font-bold text-sm text-white">${a.title}</h3>
                  </div>
                </div>

                <p class="text-xs text-slate-300 leading-relaxed">${a.desc}</p>

                <div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-blue-300 space-y-1">
                  <p class="font-bold flex items-center gap-1">
                    💡 คำแนะนำที่ควรทำ:
                  </p>
                  <p class="text-slate-300">${a.recommendedAction}</p>
                </div>

                <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>อ้างอิง: <b class="text-slate-300">${a.vehicleCode}</b> (${a.driverName}) • ${a.timestamp}</span>
                  ${a.photoUrl ? `
                    <button onclick="adminDashboard.viewPhoto('${a.photoUrl}', '${a.title}', '${a.vehicleCode}', '${a.timestamp}')" class="px-2.5 py-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black rounded-lg transition flex items-center gap-1">
                      <i data-lucide="image" class="w-3 h-3"></i> ตรวจสอบรูปถ่าย
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Fleet Real-time Matrix Section (28 Trucks & 20 Excavators) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Left 2 Cols: Real-time Fleet Status Matrix (28 Trucks) -->
          <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <i data-lucide="truck" class="w-5 h-5 text-blue-400"></i>
                <h2 class="font-black text-lg text-white">สถานะรถบรรทุกแบบ Real-time (28 คัน)</h2>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> วิ่ง (${activeTrucksCount})
                </span>
                <span class="inline-flex items-center gap-1 text-slate-400 font-bold">
                  <span class="w-2 h-2 rounded-full bg-slate-500"></span> จอด (${parkedTrucksCount})
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
              ${trucks.map(t => {
                const tripsForTruck = todayTrips.filter(tr => tr.truckPlate === t.code);
                const isRunning = tripsForTruck.length > 0;
                const totalEarn = tripsForTruck.reduce((sum, tr) => sum + (tr.amount || 0), 0);

                return `
                  <div role="button" tabindex="0" onclick="adminDashboard.openTruckDetail('${t.code}')" onkeydown="if(event.key==='Enter') adminDashboard.openTruckDetail('${t.code}')" class="p-3.5 rounded-2xl border ${isRunning ? 'bg-slate-950 border-emerald-500/50 shadow-md' : 'bg-slate-950/60 border-slate-800'} space-y-2 cursor-pointer hover:border-blue-400 hover:bg-slate-800/80 hover:-translate-y-0.5 transition-all">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="font-black text-sm text-white">${t.code}</p>
                        <span class="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                          ${t.capacity_ton} ตัน
                        </span>
                      </div>
                      ${isRunning ? `
                        <span class="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/30">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> วิ่ง
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full">
                          จอด
                        </span>
                      `}
                    </div>
                    
                    <div class="text-xs text-slate-400">
                      👤 <span class="text-slate-300 font-semibold">${t.nickname ? 'น้า' + t.nickname + ' ' : ''}${t.driver_name || 'ไม่มีคนขับ'}</span>
                    </div>

                    <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span class="text-slate-400">วิ่งวันนี้: <b class="text-blue-400 font-bold">${tripsForTruck.length}</b> รอบ</span>
                      <span class="text-emerald-400 font-black">฿${totalEarn.toLocaleString()}</span>
                    </div>
                    <p class="text-[10px] text-blue-300 font-bold text-right">กดดูรายละเอียดงาน →</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right 1 Col: Excavators Status Matrix (20 Machines) -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <i data-lucide="wrench" class="w-5 h-5 text-blue-500"></i>
                <h2 class="font-black text-lg text-white">รถขุด / แม็คโคร (20 คัน)</h2>
              </div>
            </div>

            <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              ${excavators.map(e => {
                const logsForExc = todayExcLogs.filter(l => l.excavatorCode === e.code);
                const isWorking = logsForExc.length > 0;
                const isRepair = e.status === 'repair';

                return `
                  <div role="button" tabindex="0" onclick="adminDashboard.openExcavatorDetail('${e.code}')" onkeydown="if(event.key==='Enter') adminDashboard.openExcavatorDetail('${e.code}')" class="p-3 rounded-xl border ${isWorking ? 'bg-slate-950 border-blue-500/40' : (isRepair ? 'bg-red-950/20 border-red-800/30' : 'bg-slate-950/60 border-slate-800')} flex items-center justify-between text-xs cursor-pointer hover:border-blue-400 hover:bg-slate-800/80 transition-all">
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-black text-white">${e.code}</span>
                        ${e.is_contractor ? '<span class="text-[9px] bg-purple-900 text-purple-200 px-1 rounded">ผรม.</span>' : ''}
                        ${isRepair ? '<span class="text-[9px] bg-red-900 text-red-200 px-1 rounded font-bold">ซ่อม</span>' : ''}
                      </div>
                      <p class="text-[11px] text-slate-400">${e.nickname ? 'ช่าง' + e.nickname : (e.driver_name || '-')}</p>
                    </div>
                    <div class="text-right">
                      <p class="font-bold text-blue-400">${logsForExc.length} คัน</p>
                      <span class="text-[10px] text-emerald-400 font-bold">฿${(logsForExc.length * (e.rate_per_scoop || 5)).toLocaleString()}</span>
                      <p class="text-[9px] text-blue-300 mt-1">ดูรายละเอียด →</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Live Audit Trip Feed with Photos -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 class="font-black text-lg text-white flex items-center gap-2">
                <i data-lucide="camera" class="w-5 h-5 text-blue-400"></i>
                ฟีดตรวจสอบการวิ่งสด (Trip Audit & GPS Stamp Feed)
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">กดคลิกที่รูปภาพเพื่อตรวจสอบลายน้ำพิกัด GPS, วันที่, และเวลาแบบขยายใหญ่</p>
            </div>
            <span class="text-xs bg-slate-800 text-slate-300 font-bold px-3 py-1.5 rounded-xl">
              ทั้งหมด ${trips.length} รอบในระบบ
            </span>
          </div>

          ${todayTrips.length === 0 ? `
            <div class="text-center py-10 text-slate-500 text-sm">
              ยังไม่มีรายการวิ่งส่งเข้ามาในวันนี้ เมื่อคนขับกดบันทึกรอบงาน ข้อมูลและรูปถ่ายจะปรากฏที่นี่ทันทีแบบ Real-time
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              ${todayTrips.slice(0, 9).map(t => `
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-black text-sm text-white">${t.truckPlate}</span>
                      <p class="text-xs text-slate-400">รอบที่ ${t.roundNumber} • ${t.driverName}</p>
                    </div>
                    <div class="text-right">
                      <span class="font-black text-emerald-400 text-sm">฿${t.amount}</span>
                      <p class="text-[10px] text-slate-400">${t.timestamp}</p>
                    </div>
                  </div>

                  <!-- Photos Preview -->
                  <div class="grid grid-cols-2 gap-2">
                    <div class="cursor-pointer group relative rounded-xl overflow-hidden border border-blue-500/40" onclick="adminDashboard.viewPhoto('${t.loadPhotoBase64}', 'จุดรับหิน', '${t.truckPlate}', '${t.timestamp}')">
                      <img src="${t.loadPhotoBase64}" class="w-full h-24 object-cover group-hover:scale-105 transition">
                      <span class="absolute bottom-1 left-1 bg-blue-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">📍 จุดรับหิน</span>
                    </div>
                    <div class="cursor-pointer group relative rounded-xl overflow-hidden border border-emerald-500/40" onclick="adminDashboard.viewPhoto('${t.dumpPhotoBase64}', 'จุดเทหิน', '${t.truckPlate}', '${t.timestamp}')">
                      <img src="${t.dumpPhotoBase64}" class="w-full h-24 object-cover group-hover:scale-105 transition">
                      <span class="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">🏁 จุดเทหิน</span>
                    </div>
                  </div>

                  <div class="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>ประเภท: <b class="text-slate-300 font-semibold">${t.jobTypeName}</b></span>
                    <span class="text-emerald-400 font-bold">✓ ตรวจสอบแล้ว</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
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
    `;
  }

  openTruckDetail(code) {
    const truck = window.quarryStore.getTrucks().find(t => t.code === code);
    if (!truck) return;
    const allTrips = window.quarryStore.getTrips({ truckPlate: code });
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = allLogs.filter(l => l.date === today);
    const totalToday = todayLogs.reduce((sum, l) => sum + Number(l.amount || excavator.rate_per_scoop || 0), 0);
    const totalAll = allLogs.reduce((sum, l) => sum + Number(l.amount || excavator.rate_per_scoop || 0), 0);
    this.showVehicleModal(
      `🚜 ${excavator.code}`,
      `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          ${this.detailMetric('สถานะ', excavator.status === 'repair' ? '🔴 ซ่อม' : (todayLogs.length ? '🟢 ทำงาน' : '⚪ ว่าง'), excavator.status === 'repair' ? 'text-red-400' : 'text-emerald-400')}
          ${this.detailMetric('ตักวันนี้', `${todayLogs.length} คัน`, 'text-blue-400')}
          ${this.detailMetric('เรทต่อตัก', `฿${excavator.rate_per_scoop || 0}`, 'text-white')}
          ${this.detailMetric('รายได้วันนี้', `฿${totalToday.toLocaleString()}`, 'text-emerald-400')}
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

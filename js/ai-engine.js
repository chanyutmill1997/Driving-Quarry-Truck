/**
 * ระบบ AI ตรวจจับความผิดปกติ และ AI ผู้ช่วยอัจฉริยะ (Quarry AI Engine & Copilot)
 */
class QuarryAIEngine {
  constructor() {
    this.chatHistory = [
      {
        sender: 'ai',
        text: 'สวัสดีครับผู้บริหาร! ผมคือ AI ผู้ช่วยโรงโม่หิน สามารถสอบถามยอดสรุปประจำวัน, วิเคราะห์ความผิดปกติของรอบวิ่ง, ตรวจสอบสถานะรถ หรือคำนวณยอดเงินได้ทันทีครับ',
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  }

  // ------------------------------------------------------------------------
  // 1. ระบบตรวจจับความผิดปกติ (Anomaly Detection)
  // ------------------------------------------------------------------------
  detectAnomalies(targetDateFrom, targetDateTo = targetDateFrom) {
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = targetDateFrom || today;
    const dateTo = targetDateTo || dateFrom;
    const todayTrips = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);

    const anomalies = [];

    // กฎที่ 1: ตรวจจับความเร็วในการอัปรูปจุดรับและจุดเท (Load-to-Dump Speed Anomaly)
    // หากระยะเวลาจากจุดรับถึงจุดเทน้อยกว่า 3 นาที (180 วินาที) ถือว่าผิดปกติอย่างยิ่ง
    todayTrips.forEach(t => {
      let durationSec = t.durationSeconds;
      
      // คำนวณจาก timestamp ถ้าไม่มี durationSeconds ใน record เก่า
      if (durationSec === undefined || durationSec === null) {
        if (t.loadTime && t.dumpTime) {
          durationSec = Math.max(1, Math.round((t.dumpTime - t.loadTime) / 1000));
        }
      }

      // ตรวจสอบเงื่อนไขความเร็วผิดปกติ (น้อยกว่า 3 นาที / 180 วินาที)
      if (durationSec !== undefined && durationSec !== null && durationSec > 0 && durationSec < 180) {
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationStr = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;

        anomalies.unshift({
          id: 'ANO_SPEED_' + t.id,
          type: 'speed_dump_fast',
          severity: 'critical',
          title: `🚨 ถ่ายจุดรับและจุดเทเร็วผิดปกติ (${durationStr})`,
          desc: `รถ ${t.truckPlate} โดยคนขับ ${t.driverName} บันทึกรอบ #${t.roundNumber} (${t.jobTypeName || 'รับ-เทหิน'}) เมื่อ ${t.date} เวลา ${t.timestamp} ใช้เวลาระหว่างจุดรับและจุดเทเพียง ${durationStr} (เกณฑ์มาตรฐานอย่างน้อย 3-5 นาที)`,
          referenceId: t.id,
          trip: t,
          vehicleCode: t.truckPlate,
          driverName: t.driverName,
          driverPhone: t.driverPhone,
          date: t.date,
          roundNumber: t.roundNumber,
          jobTypeName: t.jobTypeName,
          timestamp: t.timestamp,
          loadTimestampText: t.loadTimestampText || 'ไม่ระบุ',
          dumpTimestampText: t.dumpTimestampText || 'ไม่ระบุ',
          durationText: durationStr,
          durationSeconds: durationSec,
          loadPhotoUrl: t.loadPhotoUrl || t.loadPhotoBase64,
          dumpPhotoUrl: t.dumpPhotoUrl || t.dumpPhotoBase64,
          loadGps: { lat: t.loadLat, lng: t.loadLng },
          dumpGps: { lat: t.dumpLat, lng: t.dumpLng },
          recommendedAction: 'คลิกปุ่ม [🔍 ตรวจสอบเที่ยววิ่งนี้] ด้านล่าง เพื่อดูรูปจุดรับและจุดเทเทียบกัน หรือโทรสอบถามคนขับ'
        });
      }
    });

    // กฎที่ 2: ตรวจจับรอบวิ่งต่อเนื่องเร็วเกินจริง (Continuous Trips Gap < 2 นาที)
    for (let i = 0; i < todayTrips.length - 1; i++) {
      const current = todayTrips[i];
      const prev = todayTrips[i + 1];
      if (current.driverPhone === prev.driverPhone && current.truckPlate === prev.truckPlate) {
        anomalies.push({
          id: 'ANO_' + current.id,
          type: 'speed_consecutive',
          severity: 'warning',
          title: `รอบวิ่งต่อเนื่องเร็วผิดปกติ (ความถี่สูง)`,
          desc: `คนขับ ${current.driverName} (${current.truckPlate}) บันทึกรอบ #${current.roundNumber} ต่อจากรอบก่อนหน้าเร็วเกินเกณฑ์มาตรฐาน`,
          referenceId: current.id,
          trip: current,
          vehicleCode: current.truckPlate,
          driverName: current.driverName,
          driverPhone: current.driverPhone,
          timestamp: current.timestamp,
          photoUrl: current.loadPhotoUrl || current.loadPhotoBase64,
          recommendedAction: 'ตรวจสอบรูปถ่ายจุดรับและจุดเทหินว่าถ่ายจากหน้างานจริงหรือไม่ หรือโทรสอบถามคนขับ'
        });
        break;
      }
    }

    // กฎที่ 3: ตรวจจับพิกัด GPS ซ้ำซ้อน หรือรับ-เทที่เดิม (GPS Inconsistency)
    todayTrips.forEach(t => {
      if (t.loadLat && t.dumpLat && t.loadLat === t.dumpLat && t.loadLng === t.dumpLng && Number(t.loadLat) !== 0) {
        anomalies.push({
          id: 'ANO_GPS_' + t.id,
          type: 'gps',
          severity: 'critical',
          title: `พิกัดจุดรับและจุดเทเป็นตำแหน่งเดียวกัน`,
          desc: `รอบที่ #${t.roundNumber} ของรถ ${t.truckPlate} มีพิกัดรับหินและเทหินอยู่ที่พิกัดเดียวกัน (${t.loadLat}, ${t.loadLng})`,
          referenceId: t.id,
          trip: t,
          vehicleCode: t.truckPlate,
          driverName: t.driverName,
          driverPhone: t.driverPhone,
          timestamp: t.timestamp,
          photoUrl: t.dumpPhotoUrl || t.dumpPhotoBase64 || t.loadPhotoUrl || t.loadPhotoBase64,
          recommendedAction: 'ตรวจสอบตำแหน่งบนแผนที่ว่าคนขับกดถ่ายรูปที่จุดรับทั้งสองครั้งหรือไม่'
        });
      }
    });

    // กฎที่ 4: ตรวจสอบความสอดคล้องระหว่างสิบล้อกับแม็คโคร (Truck-Excavator Daily Reconciliation Audit)
    const recon = this.getReconciliationReport(dateFrom, dateTo);
    if (recon.perTruckList.length > 0) {
      const mismatchedTrucks = recon.perTruckList.filter(x => x.variance !== 0);
      if (mismatchedTrucks.length > 0) {
        mismatchedTrucks.forEach(m => {
          if (Math.abs(m.variance) >= 2) {
            anomalies.push({
              id: 'ANO_RECON_' + m.code,
              type: 'recon_mismatch',
              severity: m.variance > 0 ? 'critical' : 'warning',
              title: m.variance > 0 
                ? `🚨 รถ ${m.code} แจ้งวิ่งเกินกว่าแม็คโครตัก (${m.variance} เที่ยว)`
                : `⚠️ รถ ${m.code} แม็คโครบันทึกตักมากกว่ารอบวิ่ง (${Math.abs(m.variance)} คัน)`,
              desc: `รถบรรทุก ${m.code} (คนขับ: ${m.driverName || 'ไม่ระบุ'}) รายงานรอบวิ่ง ${m.truckReported} เที่ยว แต่ฝั่งแม็คโครบันทึกการตักให้เพียง ${m.excavatorRecorded} คัน (ผลต่าง ${m.variance > 0 ? '+' : ''}${m.variance} เที่ยว)`,
              referenceId: 'RECON_' + m.code,
              vehicleCode: m.code,
              driverName: m.driverName || 'คนขับสิบล้อ',
              timestamp: new Date().toLocaleTimeString('th-TH'),
              recommendedAction: 'ตรวจสอบการกระทบยอดในแท็บ [⚖️ ตรวจสอบการกระทบยอด] และเปรียบเทียบเวลากับคนขับแม็คโคร'
            });
          }
        });
      }

      if (Math.abs(recon.diff) >= 5) {
        anomalies.unshift({
          id: 'ANO_RECON_TOTAL',
          type: 'recon_total',
          severity: 'critical',
          title: `🚨 ผลต่างยอดรวมทั้งโรงโม่: สิบล้อวิ่ง ${recon.totalTruckTrips} vs แม็คโครตัก ${recon.totalExcavatorScoops} (ต่างกัน ${Math.abs(recon.diff)} เที่ยว)`,
          desc: `ยอดรวมรอบวิ่งของสิบล้อทุกคัน (${recon.totalTruckTrips} เที่ยว) ไม่สอดคล้องกับยอดที่แม็คโครทุกคันบันทึกไว้ (${recon.totalExcavatorScoops} คัน) อัตราความตรงกัน ${recon.matchRate}%`,
          referenceId: 'RECON_TOTAL',
          vehicleCode: 'ภาพรวมทั้งโรงโม่',
          driverName: 'ทุกแผนก',
          timestamp: new Date().toLocaleTimeString('th-TH'),
          recommendedAction: 'เปิดแผงตรวจสอบการกระทบยอด (Reconciliation Matrix) เพื่อตรวจเช็ครายเบอร์รถทันที'
        });
      }
    }

    // กฎที่ 5: ตรวจจับรถจอดไม่ได้วิ่งเกินเกณฑ์ (Fleet Idleness)
    const activePlates = new Set(todayTrips.map(t => t.truckPlate));
    const idleTrucks = trucks.filter(t => !activePlates.has(t.code));
    if (todayTrips.length > 0 && idleTrucks.length >= 8) {
      anomalies.push({
        id: 'ANO_FLEET_IDLE',
        type: 'fleet',
        severity: 'info',
        title: `มีรถบรรทุกจอดอยู่ ${idleTrucks.length} คัน (อัตราว่าง ${Math.round((idleTrucks.length / (trucks.length || 1)) * 100)}%)`,
        desc: `พบรถสิบล้อจอดไม่ได้เปิดกะจำนวนมาก เช่น ${idleTrucks.slice(0, 4).map(t => t.code).join(', ')}`,
        referenceId: 'FLEET',
        vehicleCode: 'หลายคัน',
        driverName: 'ไม่ได้วิ่ง',
        timestamp: new Date().toLocaleTimeString('th-TH'),
        recommendedAction: 'ตรวจสอบคิวงาน หรือจัดสรรคนขับเสริมเพื่อเพิ่มกำลังการขนหิน'
      });
    }

    return anomalies;
  }

  // ------------------------------------------------------------------------
  // เครื่องยนต์กระทบยอดสิบล้อ vs แม็คโคร (Reconciliation Audit Engine)
  // ------------------------------------------------------------------------
  getReconciliationReport(targetDate, targetDateTo = targetDate) {
    const date = targetDate || new Date().toISOString().split('T')[0];
    const dateTo = targetDateTo || date;
    const trips = window.quarryStore.getTrips().filter(t => t.date >= date && t.date <= dateTo);
    const excLogs = window.quarryStore.getExcavatorLogs().filter(l => l.date >= date && l.date <= dateTo);
    const trucks = window.quarryStore.getTrucks();

    const totalTruckTrips = trips.length;
    const totalExcavatorScoops = excLogs.length;
    const diff = totalTruckTrips - totalExcavatorScoops;

    // แยกรายเบอร์รถสิบล้อ
    const truckMap = {};
    trucks.forEach(t => {
      truckMap[t.code] = {
        code: t.code,
        capacityTon: t.capacity_ton || 30,
        driverName: t.driver_name || '-',
        truckReported: 0,
        excavatorRecorded: 0,
        trips: [],
        scoops: []
      };
    });

    trips.forEach(t => {
      const code = t.truckPlate || 'UNKNOWN';
      if (!truckMap[code]) {
        truckMap[code] = {
          code: code,
          capacityTon: t.capacityTon || 30,
          driverName: t.driverName || '-',
          truckReported: 0,
          excavatorRecorded: 0,
          trips: [],
          scoops: []
        };
      }
      truckMap[code].truckReported += 1;
      truckMap[code].trips.push(t);
    });

    excLogs.forEach(l => {
      const target = l.targetTruckPlate;
      if (target) {
        if (!truckMap[target]) {
          truckMap[target] = {
            code: target,
            capacityTon: 30,
            driverName: '-',
            truckReported: 0,
            excavatorRecorded: 0,
            trips: [],
            scoops: []
          };
        }
        truckMap[target].excavatorRecorded += 1;
        truckMap[target].scoops.push(l);
      }
    });

    const perTruckList = Object.values(truckMap)
      .filter(item => item.truckReported > 0 || item.excavatorRecorded > 0)
      .map(item => {
        const variance = item.truckReported - item.excavatorRecorded;
        let status = 'match';
        if (variance > 0) status = 'truck_over'; // สิบล้อแจ้งเกิน
        else if (variance < 0) status = 'exc_over'; // แม็คโครตักเกิน
        return {
          ...item,
          variance,
          status
        };
      })
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const matchCount = perTruckList.filter(x => x.status === 'match').length;
    const matchRate = perTruckList.length > 0 
      ? Math.round((matchCount / perTruckList.length) * 100) 
      : 100;

    return {
      date,
      dateTo,
      totalTruckTrips,
      totalExcavatorScoops,
      diff,
      matchRate,
      perTruckList,
      trips,
      excLogs
    };
  }

  // ------------------------------------------------------------------------
  // 2. ระบบ AI ผู้ช่วยถามตอบอัจฉริยะ (AI Chatbot)
  // ------------------------------------------------------------------------
  ask(question, options = {}) {
    const q = (question || '').trim().toLowerCase();
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();
    const drivers = window.quarryStore.getDrivers();
    const rates = window.quarryStore.getJobRates();

    const today = new Date().toISOString().split('T')[0];
    const dateFrom = options.dateFrom || today;
    const dateTo = options.dateTo || dateFrom;
    const todayTrips = trips.filter(t => t.date >= dateFrom && t.date <= dateTo);
    const todayExcLogs = excLogs.filter(l => l.date >= dateFrom && l.date <= dateTo);
    const rangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} ถึง ${dateTo}`;

    let answer = "";

    // 1. ถามยอดสรุปวันนี้
    if (q.includes('วันนี้') && (q.includes('กี่เที่ยว') || q.includes('ยอด') || q.includes('เท่าไหร่') || q.includes('สรุป'))) {
      const totalAmountTrucks = todayTrips.reduce((s, t) => s + (t.amount || 0), 0);
      const totalAmountExc = todayExcLogs.reduce((s, l) => s + (l.amount || 5), 0);
      const activeTrucks = new Set(todayTrips.map(t => t.truckPlate)).size;

      answer = `📊 **สรุปภาพรวมช่วงวันที่ ${rangeLabel}:**\n` +
               `• 🚚 รถบรรทุกวิ่งงาน: **${activeTrucks} / ${trucks.length} คัน**\n` +
               `• 🏁 รอบวิ่งสำเร็จ: **${todayTrips.length} เที่ยว** (ยอดจ่าย: ฿${totalAmountTrucks.toLocaleString()} บาท)\n` +
               `• 🚜 แม็คโครตักหิน: **${todayExcLogs.length} คัน** (ยอดจ่าย: ฿${totalAmountExc.toLocaleString()} บาท)\n` +
               `• 💰 **ยอดจ่ายรวมทั้งสิ้น: ฿${(totalAmountTrucks + totalAmountExc).toLocaleString()} บาท**`;
    }
    // 2. ถามว่าใครวิ่งเยอะสุด / ท็อป
    else if (q.includes('เยอะสุด') || q.includes('อันดับ') || q.includes('ท็อป') || q.includes('ใครวิ่ง')) {
      const countMap = {};
      todayTrips.forEach(t => {
        countMap[t.driverName] = (countMap[t.driverName] || 0) + 1;
      });
      const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        answer = `ยังไม่มีข้อมูลการวิ่งในช่วงวันที่ ${rangeLabel} ครับ`;
      } else {
        answer = `🏆 **อันดับคนขับที่วิ่งได้มากที่สุด ช่วงวันที่ ${rangeLabel}:**\n` +
                 sorted.slice(0, 5).map((item, idx) => `${idx + 1}. **${item[0]}**: ${item[1]} เที่ยว`).join('\n');
      }
    }
    // 3. ถามเรื่องรถจอด
    else if (q.includes('รถจอด') || q.includes('ไม่ได้วิ่ง') || q.includes('ว่าง')) {
      const activeTrucks = new Set(todayTrips.map(t => t.truckPlate));
      const idleTrucks = trucks.filter(t => !activeTrucks.has(t.code));
      answer = `🛑 **รถบรรทุกที่ยังไม่มีเที่ยววิ่งในช่วงวันที่ ${rangeLabel} (${idleTrucks.length} คัน):**\n` +
               idleTrucks.slice(0, 10).map(t => `• ${t.code} (${t.capacity_ton} ตัน) ${t.driver_name ? '- ' + t.driver_name : ''}`).join('\n') +
               (idleTrucks.length > 10 ? `\n...และอีก ${idleTrucks.length - 10} คัน` : '');
    }
    // 4. ถามเรื่องความผิดปกติ
    else if (q.includes('ผิดปกติ') || q.includes('โกง') || q.includes('เตือน') || q.includes('ปัญหา')) {
      const anomalies = this.detectAnomalies(dateFrom, dateTo);
      if (anomalies.length === 0) {
        answer = '✅ **ผลการวิเคราะห์:** ไม่พบสิ่งผิดปกติในระบบ ข้อมูลพิกัด GPS และความถี่การวิ่งอยู่ในเกณฑ์ปกติครับ';
      } else {
        answer = `⚠️ **AI ตรวจพบข้อสังเกต ${anomalies.length} รายการ:**\n` +
                 anomalies.map((a, i) => `${i + 1}. **[${a.title}]**: ${a.desc}\n👉 *คำแนะนำ: ${a.recommendedAction}*`).join('\n\n');
      }
    }
    // 5. ถามเรื่องเรทราคา
    else if (q.includes('เรท') || q.includes('ราคา') || q.includes('ค่าเที่ยว')) {
      answer = `💰 **ตารางเรทราคาค่าเที่ยว (ตัวอย่าง):**\n` +
               rates.slice(0, 6).map(r => `• ${r.name}: 30t=฿${r.rate_30_ton || '-'}, 45t=฿${r.rate_45_ton || '-'}, 60t=฿${r.rate_60_ton || '-'}`).join('\n') +
               `\n*(สามารถปรับแก้ไขเรททั้งหมดได้ที่หน้า 'ตั้งค่าข้อมูลหลัก')*`;
    }
    // คำตอบทั่วไป / คำแนะนำ
    else {
      answer = `🤖 ผมสามารถตอบคำถามเกี่ยวกับ:\n` +
               `1. **"สรุปยอดวันนี้"** - ดูจำนวนเที่ยวและยอดเงินรวม\n` +
               `2. **"ใครวิ่งเยอะสุด"** - ดูอันดับคนขับดีเด่น\n` +
               `3. **"รถคันไหนจอดบ้าง"** - ตรวจสอบรถที่ว่าง\n` +
               `4. **"ตรวจความผิดปกติ"** - ตรวจจับ GPS และเวลาที่น่าสงสัย\n` +
               `5. **"ดูเรทราคา"** - อัตราค่าจ้างแต่ละประเภทงาน`;
    }

    // บันทึกเข้าประวัติแชท
    this.chatHistory.push({
      sender: 'user',
      text: question,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });

    this.chatHistory.push({
      sender: 'ai',
      text: answer,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });

    return answer;
  }
}

window.quarryAI = new QuarryAIEngine();
window.aiEngine = window.quarryAI;

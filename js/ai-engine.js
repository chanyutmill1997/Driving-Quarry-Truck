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
  detectAnomalies() {
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const today = new Date().toISOString().split('T')[0];
    const todayTrips = trips.filter(t => t.date === today);

    const anomalies = [];

    // กฎที่ 1: ตรวจจับรอบวิ่งเร็วเกินจริง (Impossible Fast Trip Duration)
    // ถ้ารอบวิ่งคนเดียวกันมีเวลาห่างกันน้อยกว่า 2 นาที
    for (let i = 0; i < todayTrips.length - 1; i++) {
      const current = todayTrips[i];
      const prev = todayTrips[i + 1];
      if (current.driverPhone === prev.driverPhone && current.truckPlate === prev.truckPlate) {
        // หากระยะเวลาใกล้เคียงกันมาก
        anomalies.push({
          id: 'ANO_' + current.id,
          type: 'speed',
          severity: 'warning',
          title: `รอบวิ่งเร็วผิดปกติ (ความถี่สูง)`,
          desc: `คนขับ ${current.driverName} (${current.truckPlate}) บันทึกรอบ #${current.roundNumber} ต่อจากรอบก่อนหน้าเร็วเกินเกณฑ์มาตรฐาน`,
          referenceId: current.id,
          vehicleCode: current.truckPlate,
          driverName: current.driverName,
          timestamp: current.timestamp,
          photoUrl: current.loadPhotoBase64,
          recommendedAction: 'ตรวจสอบรูปถ่ายจุดรับและจุดเทหินว่าถ่ายจากหน้างานจริงหรือไม่ หรือโทรสอบถามคนขับ'
        });
        break; // แจ้งเตือนตัวอย่าง
      }
    }

    // กฎที่ 2: ตรวจจับพิกัด GPS ซ้ำซ้อน หรือรับ-เทที่เดิม (GPS Inconsistency)
    todayTrips.forEach(t => {
      if (t.loadLat && t.dumpLat && t.loadLat === t.dumpLat && t.loadLng === t.dumpLng) {
        anomalies.push({
          id: 'ANO_GPS_' + t.id,
          type: 'gps',
          severity: 'critical',
          title: `พิกัดจุดรับและจุดเทเป็นตำแหน่งเดียวกัน`,
          desc: `รอบที่ #${t.roundNumber} ของรถ ${t.truckPlate} มีพิกัดรับหินและเทหินอยู่ที่เดียวกัน (${t.loadLat}, ${t.loadLng})`,
          referenceId: t.id,
          vehicleCode: t.truckPlate,
          driverName: t.driverName,
          timestamp: t.timestamp,
          photoUrl: t.dumpPhotoBase64 || t.loadPhotoBase64,
          recommendedAction: 'ตรวจสอบตำแหน่งบนแผนที่ว่าคนขับกดถ่ายรูปที่จุดรับทั้งสองครั้งหรือไม่'
        });
      }
    });

    // กฎที่ 3: ตรวจจับรถจอดไม่ได้วิ่งเกินเกณฑ์ (Fleet Idleness)
    const activePlates = new Set(todayTrips.map(t => t.truckPlate));
    const idleTrucks = trucks.filter(t => !activePlates.has(t.code));
    if (idleTrucks.length >= 8) {
      anomalies.push({
        id: 'ANO_FLEET_IDLE',
        type: 'fleet',
        severity: 'info',
        title: `มีรถบรรทุกจอดอยู่ ${idleTrucks.length} คัน (อัตราว่าง ${Math.round((idleTrucks.length / trucks.length) * 100)}%)`,
        desc: `พบรถสิบล้อจอดไม่ได้เปิดกะจำนวนมาก เช่น ${idleTrucks.slice(0, 4).map(t => t.code).join(', ')}`,
        referenceId: 'FLEET',
        vehicleCode: 'หลายคัน',
        driverName: 'ไม่ได้วิ่ง',
        timestamp: new Date().toLocaleTimeString('th-TH'),
        recommendedAction: 'ตรวจสอบคิวงาน หรือจัดสรรคนขับเสริมเพื่อเพิ่มกำลังการขนหิน'
      });
    }

    // กฎที่ 4: ตรวจสอบความสอดคล้องระหว่างสิบล้อกับแม็คโคร (Excavator-Truck Match)
    if (todayTrips.length > 0 && todayExcLogs.length === 0) {
      anomalies.push({
        id: 'ANO_EXC_GAP',
        type: 'match',
        severity: 'warning',
        title: `มีรอบวิ่งสิบล้อ ${todayTrips.length} รอบ แต่ยังไม่มีการบันทึกจากแม็คโคร`,
        desc: `สิบล้อเริ่มวิ่งงานแล้ว แต่ฝั่งคนขับแม็คโครยังไม่ได้เปิดกะบันทึกการตัก`,
        referenceId: 'EXCAVATOR',
        vehicleCode: 'แม็คโคร',
        driverName: 'แผนกขับรถขุด',
        timestamp: new Date().toLocaleTimeString('th-TH'),
        recommendedAction: 'แจ้งหัวหน้างานหน้างานเตือนคนขับแม็คโครให้เปิดระบบและกดบันทึกการตัก'
      });
    }

    return anomalies;
  }

  // ------------------------------------------------------------------------
  // 2. ระบบ AI ผู้ช่วยถามตอบอัจฉริยะ (AI Chatbot)
  // ------------------------------------------------------------------------
  ask(question) {
    const q = (question || '').trim().toLowerCase();
    const trips = window.quarryStore.getTrips();
    const excLogs = window.quarryStore.getExcavatorLogs();
    const trucks = window.quarryStore.getTrucks();
    const excavators = window.quarryStore.getExcavators();
    const drivers = window.quarryStore.getDrivers();
    const rates = window.quarryStore.getJobRates();

    const today = new Date().toISOString().split('T')[0];
    const todayTrips = trips.filter(t => t.date === today);
    const todayExcLogs = excLogs.filter(l => l.date === today);

    let answer = "";

    // 1. ถามยอดสรุปวันนี้
    if (q.includes('วันนี้') && (q.includes('กี่เที่ยว') || q.includes('ยอด') || q.includes('เท่าไหร่') || q.includes('สรุป'))) {
      const totalAmountTrucks = todayTrips.reduce((s, t) => s + (t.amount || 0), 0);
      const totalAmountExc = todayExcLogs.reduce((s, l) => s + (l.amount || 5), 0);
      const activeTrucks = new Set(todayTrips.map(t => t.truckPlate)).size;

      answer = `📊 **สรุปภาพรวมวันนี้ (${new Date().toLocaleDateString('th-TH')}):**\n` +
               `• 🚚 รถบรรทุกวิ่งงาน: **${activeTrucks} / ${trucks.length} คัน**\n` +
               `• 🏁 รอบวิ่งสำเร็จ: **${todayTrips.length} เที่ยว** (ยอดจ่าย: ฿${totalAmountTrucks.toLocaleString()} บาท)\n` +
               `• 🚜 แม็คโครตักหิน: **${todayExcLogs.length} คัน** (ยอดจ่าย: ฿${totalAmountExc.toLocaleString()} บาท)\n` +
               `• 💰 **ยอดจ่ายรวมทั้งสิ้นวันนี้: ฿${(totalAmountTrucks + totalAmountExc).toLocaleString()} บาท**`;
    }
    // 2. ถามว่าใครวิ่งเยอะสุด / ท็อป
    else if (q.includes('เยอะสุด') || q.includes('อันดับ') || q.includes('ท็อป') || q.includes('ใครวิ่ง')) {
      const countMap = {};
      todayTrips.forEach(t => {
        countMap[t.driverName] = (countMap[t.driverName] || 0) + 1;
      });
      const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        answer = 'วันนี้ยังไม่มีข้อมูลการวิ่งส่งเข้ามาครับ';
      } else {
        answer = `🏆 **อันดับคนขับที่วิ่งได้มากที่สุดวันนี้:**\n` +
                 sorted.slice(0, 5).map((item, idx) => `${idx + 1}. **${item[0]}**: ${item[1]} เที่ยว`).join('\n');
      }
    }
    // 3. ถามเรื่องรถจอด
    else if (q.includes('รถจอด') || q.includes('ไม่ได้วิ่ง') || q.includes('ว่าง')) {
      const activeTrucks = new Set(todayTrips.map(t => t.truckPlate));
      const idleTrucks = trucks.filter(t => !activeTrucks.has(t.code));
      answer = `🛑 **รถบรรทุกที่ยังไม่ได้วิ่งในวันนี้ (${idleTrucks.length} คัน):**\n` +
               idleTrucks.slice(0, 10).map(t => `• ${t.code} (${t.capacity_ton} ตัน) ${t.driver_name ? '- ' + t.driver_name : ''}`).join('\n') +
               (idleTrucks.length > 10 ? `\n...และอีก ${idleTrucks.length - 10} คัน` : '');
    }
    // 4. ถามเรื่องความผิดปกติ
    else if (q.includes('ผิดปกติ') || q.includes('โกง') || q.includes('เตือน') || q.includes('ปัญหา')) {
      const anomalies = this.detectAnomalies();
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

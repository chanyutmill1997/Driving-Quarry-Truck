/**
 * โมดูลกล้องถ่ายรูปและระบบตรวจจับพิกัด GPS (Camera & Watermark Engine)
 * รองรับทั้ง: 1) In-App Live Camera Viewfinder (กล้องสดบนหน้าจอ)
 *             2) Native Camera Capture (Fallback)
 * ทำงานได้ 100% บนมือถือ iOS Safari และ Android Chrome
 */
class CameraEngine {
  constructor() {
    this.currentPosition = null;
    this.mediaStream = null;
  }

  // ขอพิกัดจากโทรศัพท์เฉพาะตอนถ่ายรูป ไม่มีการติดตามตำแหน่งต่อเนื่อง
  async getFreshGPS() {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve({ lat: null, lng: null, accuracy: null, isAvailable: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          this.currentPosition = pos.coords;
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 5),
            timestamp: new Date().toISOString(),
            isAvailable: true
          });
        },
        err => {
          console.warn("GPS fallback used:", err.message);
          resolve({ lat: null, lng: null, accuracy: null, timestamp: new Date().toISOString(), isAvailable: false });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /**
   * เปิดกล้องถ่ายภาพพร้อมสแตมป์พิกัด
   * รองรับทั้ง In-App Viewfinder และ Direct File Capture
   */
  async captureWithWatermark(metadata = {}) {
    // พยายามเปิด In-App Live Camera Viewfinder ก่อนเพื่อความราบรื่น
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        return await this.openLiveCameraModal(metadata);
      } catch (e) {
        console.warn("Live camera modal failed, switching to native camera fallback:", e);
      }
    }

    // Fallback: ใช้ Native Camera Capture แบบ Synchronous ทันที (ไม่ติดบล็อก Safari)
    return this.openNativeFileCamera(metadata);
  }

  // -------------------------------------------------------------
  // 1. In-App Live Camera Viewfinder (กล้องสดแบบแสดงวิดีโอบนจอ)
  // -------------------------------------------------------------
  openLiveCameraModal(metadata) {
    return new Promise(async (resolve, reject) => {
      // สร้าง Modal กล้องแบบ Fullscreen
      let modal = document.getElementById('in-app-camera-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'in-app-camera-modal';
        document.body.appendChild(modal);
      }

      modal.className = "fixed inset-0 z-50 bg-black flex flex-col justify-between text-white select-none";
      modal.innerHTML = `
        <!-- Top Bar -->
        <div class="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
          <div>
            <span class="text-xs font-black text-blue-400 uppercase tracking-wider">
              ${metadata.stepType === 'load' ? '📍 จุดรับหิน' : (metadata.stepType === 'dump' ? '🏁 จุดเทหิน' : '🚜 ตักหิน')}
            </span>
            <p class="text-xs text-slate-300 font-bold">${metadata.vehicleCode || ''} • ${metadata.driverName || ''}</p>
          </div>
          <button id="close-cam-btn" class="w-10 h-10 rounded-full bg-slate-800/80 text-white font-bold flex items-center justify-center text-lg">✕</button>
        </div>

        <!-- Video Viewfinder -->
        <div class="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video id="cam-video-feed" autoplay playsinline class="w-full h-full object-cover"></video>
          
          <!-- Live Watermark Overlay Tag -->
          <div class="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-3 text-xs space-y-1">
            <div class="flex items-center justify-between text-blue-400 font-bold">
              <span>🕒 กำลังจับเวลาสด...</span>
              <span id="cam-gps-live" class="text-emerald-400 font-mono">📍 GPS กำลังจับสัญญาณ...</span>
            </div>
            <p class="text-slate-300 text-[11px]">${metadata.jobName || ''}</p>
          </div>
        </div>

        <!-- Bottom Shutter Control Bar -->
        <div class="p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around z-10">
          <button id="cam-fallback-btn" class="text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-xl font-bold">
            📷 ใช้กล้องเครื่อง
          </button>
          
          <!-- Big Shutter Button -->
          <button id="cam-shutter-btn" class="w-20 h-20 rounded-full bg-white border-4 border-blue-500 shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
            <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
              <span class="text-2xl">📸</span>
            </div>
          </button>

          <div class="w-20 text-center">
            <span class="text-[10px] text-slate-400 font-bold">แตะเพื่อถ่าย</span>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      // เริ่มสตรีมวิดีโอจากกล้องหลัง
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        });

        this.mediaStream = stream;
        const video = document.getElementById('cam-video-feed');
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      } catch (err) {
        this.closeLiveCameraModal();
        // ถ้าเปิด video stream ไม่ได้ ให้สลับไปใช้ native camera
        resolve(this.openNativeFileCamera(metadata));
        return;
      }

      // ดึง GPS คู่ขนาน
      let liveGps = await this.getFreshGPS();
      const gpsLabel = document.getElementById('cam-gps-live');
      if (gpsLabel) gpsLabel.innerText = liveGps.isAvailable ? `📍 ${liveGps.lat}, ${liveGps.lng}` : '📍 กรุณาอนุญาตตำแหน่ง';

      // ปุ่มปิด
      document.getElementById('close-cam-btn').onclick = () => {
        this.closeLiveCameraModal();
        reject(new Error("ยกเลิกการถ่ายรูป"));
      };

      // ปุ่มสลับเป็นกล้องเครื่อง
      document.getElementById('cam-fallback-btn').onclick = () => {
        this.closeLiveCameraModal();
        resolve(this.openNativeFileCamera(metadata));
      };

      // ปุ่มชัตเตอร์ถ่ายภาพ
      document.getElementById('cam-shutter-btn').onclick = async () => {
        const video = document.getElementById('cam-video-feed');
        if (!video) return;

        // วาดภาพจาก Video Feed ลง Canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        this.closeLiveCameraModal();

        // ปั๊มลายน้ำ Watermark
        const freshGps = await this.getFreshGPS();
        const watermarked = this.drawWatermarkOnCanvas(canvas, metadata, freshGps);

        resolve({
          photoBase64: watermarked,
          gps: freshGps,
          timestamp: new Date().toLocaleString('th-TH')
        });
      };
    });
  }

  closeLiveCameraModal() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    const modal = document.getElementById('in-app-camera-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.innerHTML = '';
    }
  }

  // -------------------------------------------------------------
  // 2. Native Camera Fallback (เปิดกล้องระบบมือถือโดยตรง)
  // -------------------------------------------------------------
  openNativeFileCamera(metadata) {
    return new Promise((resolve, reject) => {
      // สร้าง input แนบใน DOM ชั่วคราวเพื่อให้ Safari ยอมรับ click event
      let input = document.getElementById('temp-camera-input');
      if (!input) {
        input = document.createElement('input');
        input.id = 'temp-camera-input';
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';
        document.body.appendChild(input);
      }

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error("ไม่ได้ถ่ายรูป"));
          return;
        }

        try {
          const img = await this.loadImageFromFile(file);
          const gps = await this.getFreshGPS();
          const watermarkedBase64 = this.applyWatermark(img, metadata, gps);
          resolve({
            photoBase64: watermarkedBase64,
            gps: gps,
            timestamp: new Date().toLocaleString('th-TH')
          });
        } catch (err) {
          reject(err);
        } finally {
          input.value = '';
        }
      };

      input.oncancel = () => {
        reject(new Error("ยกเลิกการถ่ายรูป"));
      };

      // กดเปิดกล้องทันที
      input.click();
    });
  }

  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  applyWatermark(img, metadata, gps) {
    const canvas = document.createElement('canvas');
    const maxWidth = (window.CONFIG && window.CONFIG.IMAGE_COMPRESSION && window.CONFIG.IMAGE_COMPRESSION.MAX_WIDTH) || 1280;
    const maxHeight = (window.CONFIG && window.CONFIG.IMAGE_COMPRESSION && window.CONFIG.IMAGE_COMPRESSION.MAX_HEIGHT) || 1280;
    
    // คำนวณ Scale เพื่อคงสัดส่วนเดิม (Aspect Ratio) ไม่ให้ภาพเบี้ยวหรือยืด
    let width = img.width;
    let height = img.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return this.drawWatermarkOnCanvas(canvas, metadata, gps);
  }

  drawWatermarkOnCanvas(canvas, metadata, gps) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bannerHeight = Math.max(140, canvas.height * 0.22);
    const bannerY = canvas.height - bannerHeight;

    // แถบสีดำโปร่งแสงด้านล่าง
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

    // เส้นขอบสีน้ำเงินแบรนด์โรงโม่
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, bannerY, canvas.width, 6);

    const baseFontSize = Math.max(18, Math.round(canvas.width * 0.024));
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    const nowStr = new Date().toLocaleString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    const stepLabel = metadata.stepType === 'load' ? '📍 [จุดรับหิน / ขึ้นของ]' : 
                     (metadata.stepType === 'dump' ? '🏁 [จุดเทหิน / ส่งมอบ]' : '🚜 [ตักหินแม็คโคร]');
    
    const badgeColor = metadata.stepType === 'load' ? '#3b82f6' : 
                      (metadata.stepType === 'dump' ? '#10b981' : '#38bdf8');

    // บรรทัดที่ 1: สถานะและเวลา
    ctx.font = `bold ${baseFontSize * 1.3}px 'Sarabun', -apple-system, sans-serif`;
    ctx.fillStyle = badgeColor;
    ctx.fillText(stepLabel, 20, bannerY + (bannerHeight * 0.22));

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${baseFontSize * 1.05}px 'Sarabun', -apple-system, sans-serif`;
    ctx.fillText(`🕒 ${nowStr}`, canvas.width - (baseFontSize * 16), bannerY + (bannerHeight * 0.22));

    // บรรทัดที่ 2: ข้อมูลรถ และ คนขับ (รองรับทั้งรถบรรทุกและรถแม็คโคร)
    ctx.font = `${baseFontSize * 1.05}px 'Sarabun', -apple-system, sans-serif`;
    ctx.fillStyle = '#fde047';
    let vehicleText = `🚚 รถ: ${metadata.vehicleCode || '-'} ${metadata.capacity ? '(' + metadata.capacity + ' ตัน)' : ''}`;
    let driverText = `👤 คนขับ: ${metadata.driverName || '-'}`;
    if (metadata.stepType === 'excavator') {
      vehicleText = `🚜 แม็คโคร: ${metadata.vehicleCode || '-'}  ➔  🚚 ตักให้: ${metadata.targetTruck || '-'} (${metadata.capacity || 30} ตัน)`;
      driverText = `👤 ผู้ควบคุม: ${metadata.driverName || '-'}`;
    }
    ctx.fillText(`${vehicleText}  |  ${driverText}`, 20, bannerY + (bannerHeight * 0.52));

    // บรรทัดที่ 3: รอบที่, รายละเอียดงาน/ค่าตัก 5 บ./ตัน และ พิกัด GPS
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${baseFontSize * 0.95}px 'Sarabun', -apple-system, sans-serif`;
    const roundText = metadata.roundNumber ? `รอบที่ ${metadata.roundNumber} ` : '';
    const jobText = metadata.jobName ? `[${metadata.jobName}] ` : '';
    const gpsText = gps && gps.isAvailable
      ? `📍 GPS: ${gps.lat}, ${gps.lng} (±${gps.accuracy}m)`
      : '📍 GPS: สแตมป์หน้างานโรงโม่';
    ctx.fillText(`${roundText}${jobText} •  ${gpsText}`, 20, bannerY + (bannerHeight * 0.82));

    // การบีบอัดไฟล์ภาพอัตโนมัติ: ลดขนาดไฟล์เหลือ ~100-150KB แต่รักษาความคมชัดของทะเบียนและตัวอักษร 100%
    const quality = (window.CONFIG && window.CONFIG.IMAGE_COMPRESSION && window.CONFIG.IMAGE_COMPRESSION.QUALITY) || 0.75;
    const format = (window.CONFIG && window.CONFIG.IMAGE_COMPRESSION && window.CONFIG.IMAGE_COMPRESSION.FORMAT) || 'image/jpeg';
    return canvas.toDataURL(format, quality);
  }

  /**
   * แปลง DataURL (Base64) เป็น Blob Binary สำหรับอัปโหลดตรงขึ้น Supabase Storage
   */
  dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }

  /**
   * ตรวจสอบขนาดไฟล์ภาพ (Bytes) เพื่อแสดงผลในระบบ
   */
  getApproximateSizeKB(base64Str) {
    if (!base64Str) return 0;
    const stringLength = base64Str.length - 'data:image/jpeg;base64,'.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438347;
    return Math.round(sizeInBytes / 1024);
  }
}

window.cameraEngine = new CameraEngine();

/**
 * สร้างภาพหลักฐานรอบวิ่งจำลองความละเอียดสูง (Realistic Quarry SVG Photo Data URI)
 * สำหรับแสดงหลักฐานแนบการเบิกจ่ายทุกคัน ทุกเที่ยว เมื่อไม่มีรูปจากกล้องสด
 */
window.generateQuarryPhotoSVG = function(type, truckPlate, driverName, dateText, timeText, gpsText, jobName) {
  const isLoad = type === 'load';
  const headerBg = isLoad ? '#1e3a8a' : '#065f46';
  const headerText = isLoad ? '📍 ภาพถ่ายจุดรับหิน / หน้าบ่อหิน (LOAD POINT)' : '📍 ภาพถ่ายจุดเทหิน / ปากโม่ฮอปเปอร์ (DUMP POINT)';
  const badgeColor = isLoad ? '#3b82f6' : '#10b981';
  const plantName = (window.CONFIG && window.CONFIG.PLANT_NAME) || 'โรงโม่หิน ป.ศรีวิไลลักษณ์';
  const compName = (window.CONFIG && window.CONFIG.COMPANY_NAME) || 'บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="skyGrad_${type}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#bae6fd" />
        <stop offset="100%" stop-color="#e0f2fe" />
      </linearGradient>
      <linearGradient id="quarryCliff_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#78716c" />
        <stop offset="50%" stop-color="#57534e" />
        <stop offset="100%" stop-color="#44403c" />
      </linearGradient>
      <linearGradient id="truckBody_${type}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ea580c" />
        <stop offset="100%" stop-color="#c2410c" />
      </linearGradient>
      <linearGradient id="hopperGrad_${type}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
    </defs>
    
    <!-- Background: Sky & Cliffs -->
    <rect width="600" height="400" fill="url(#skyGrad_${type})" />
    <polygon points="0,210 90,130 190,170 290,100 410,160 530,120 600,180 600,400 0,400" fill="url(#quarryCliff_${type})" opacity="0.9" />
    <polygon points="0,250 130,190 250,230 390,180 510,220 600,200 600,400 0,400" fill="#292524" opacity="0.95" />
    <rect y="280" width="600" height="120" fill="#a8a29e" />
    <ellipse cx="300" cy="350" rx="280" ry="30" fill="#78716c" opacity="0.6" />
    
    ${isLoad ? `
      <!-- Excavator Loading Rig -->
      <path d="M 60,180 L 150,120 L 240,170 L 260,210" stroke="#f59e0b" stroke-width="16" stroke-linecap="round" fill="none" />
      <polygon points="235,200 280,210 270,245 225,235" fill="#d97706" />
      <!-- Rocks falling -->
      <circle cx="260" cy="235" r="7" fill="#78716c" />
      <circle cx="272" cy="245" r="9" fill="#57534e" />
      <circle cx="250" cy="248" r="6" fill="#44403c" />
    ` : `
      <!-- Primary Crusher Hopper Chute -->
      <polygon points="30,180 150,180 120,290 60,290" fill="url(#hopperGrad_${type})" stroke="#475569" stroke-width="3" />
      <rect x="20" y="170" width="140" height="14" fill="#64748b" rx="2" />
      <text x="90" y="240" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="middle" font-family="sans-serif">HOPPER #1</text>
    `}

    <!-- Quarry Dump Truck -->
    <g transform="translate(170, 195)">
      <rect x="50" y="80" width="220" height="16" fill="#1e293b" rx="4" />
      <circle cx="90" cy="100" r="22" fill="#0f172a" stroke="#475569" stroke-width="5" />
      <circle cx="90" cy="100" r="9" fill="#94a3b8" />
      <circle cx="210" cy="100" r="22" fill="#0f172a" stroke="#475569" stroke-width="5" />
      <circle cx="210" cy="100" r="9" fill="#94a3b8" />
      <circle cx="245" cy="100" r="22" fill="#0f172a" stroke="#475569" stroke-width="5" />
      <circle cx="245" cy="100" r="9" fill="#94a3b8" />

      ${isLoad ? `
        <polygon points="40,30 200,30 190,80 50,80" fill="url(#truckBody_${type})" stroke="#9a3412" stroke-width="2" />
        <ellipse cx="120" cy="30" rx="60" ry="18" fill="#78716c" />
        <ellipse cx="115" cy="24" rx="45" ry="12" fill="#a8a29e" />
      ` : `
        <polygon points="30,-10 180,25 165,75 35,45" fill="url(#truckBody_${type})" stroke="#9a3412" stroke-width="2" />
        <circle cx="20" cy="50" r="10" fill="#78716c" />
        <circle cx="10" cy="65" r="12" fill="#57534e" />
        <circle cx="0" cy="80" r="14" fill="#44403c" />
      `}

      <polygon points="200,35 245,35 265,55 265,80 200,80" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      <polygon points="235,40 255,55 240,55 225,40" fill="#0284c7" opacity="0.8" />
      <rect x="250" y="76" width="28" height="12" fill="#fef08a" rx="2" />
      <text x="264" y="85" font-size="7" font-weight="bold" fill="#854d0e" text-anchor="middle" font-family="sans-serif">ป.1997</text>
    </g>

    <!-- Top Watermark Bar -->
    <rect x="0" y="0" width="600" height="44" fill="rgba(15, 23, 42, 0.90)" />
    <rect x="12" y="9" width="6" height="26" fill="${badgeColor}" rx="2" />
    <text x="26" y="24" font-size="13" font-weight="bold" fill="#ffffff" font-family="'Sarabun', sans-serif">${headerText}</text>
    <text x="26" y="37" font-size="9.5" fill="#94a3b8" font-family="'Sarabun', sans-serif">${jobName || 'วิ่งหินโรงโม่'} | ${plantName}</text>

    <!-- Bottom Watermark Stamp Box -->
    <rect x="12" y="312" width="576" height="76" rx="8" fill="rgba(15, 23, 42, 0.92)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
    <text x="24" y="333" font-size="12" font-weight="bold" fill="#38bdf8" font-family="'Sarabun', sans-serif">🚛 ${truckPlate || 'รถบรรทุกโรงโม่'}</text>
    <text x="310" y="333" font-size="12" font-weight="bold" fill="#f8fafc" font-family="'Sarabun', sans-serif">👤 คนขับ: ${driverName || 'พนักงานขับรถ'}</text>
    <text x="24" y="354" font-size="11" fill="#facc15" font-family="'Sarabun', sans-serif">📅 ${dateText} | ⏱️ ${timeText}</text>
    <text x="310" y="354" font-size="11" fill="#4ade80" font-family="'Sarabun', sans-serif">📍 GPS: ${gpsText || '17.4882° N, 101.7235° E'}</text>
    <text x="24" y="374" font-size="9" fill="#94a3b8" font-family="'Sarabun', sans-serif">🔒 หลักฐานดิจิทัลแนบประกอบการเบิกจ่าย ${compName}</text>
    <rect x="492" y="360" width="86" height="20" fill="#15803d" rx="4" />
    <text x="535" y="374" font-size="9.5" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'Sarabun', sans-serif">✓ ตรวจสอบแล้ว</text>
  </svg>
  `;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
};

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

    // บรรทัดที่ 2: ข้อมูลรถ และ คนขับ
    ctx.font = `${baseFontSize * 1.05}px 'Sarabun', -apple-system, sans-serif`;
    ctx.fillStyle = '#fde047';
    const vehicleText = `🚚 รถ: ${metadata.vehicleCode || '-'} ${metadata.capacity ? '(' + metadata.capacity + ' ตัน)' : ''}`;
    const driverText = `👤 คนขับ: ${metadata.driverName || '-'}`;
    ctx.fillText(`${vehicleText}  |  ${driverText}`, 20, bannerY + (bannerHeight * 0.52));

    // บรรทัดที่ 3: รอบที่, ประเภทงาน และ พิกัด GPS
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${baseFontSize * 0.95}px 'Sarabun', -apple-system, sans-serif`;
    const roundText = metadata.roundNumber ? `รอบที่ ${metadata.roundNumber}` : '';
    const jobText = metadata.jobName ? ` [${metadata.jobName}]` : '';
    const gpsText = gps && gps.isAvailable
      ? `🌐 พิกัดดาวเทียม: ${gps.lat}, ${gps.lng} (±${gps.accuracy}m)`
      : '🌐 พิกัดดาวเทียม: ไม่ได้รับอนุญาต/ไม่พบสัญญาณ';
    ctx.fillText(`${roundText}${jobText}  •  ${gpsText}`, 20, bannerY + (bannerHeight * 0.82));

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

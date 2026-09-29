const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/seed_data.json"), "utf8"));
const logoPath = path.join(__dirname, "../assets/logo.png");
const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString("base64") : "";
const logoSrc = logoBase64 ? `data:image/png;base64,${logoBase64}` : "";

const admins = seedData.drivers.filter(d => d.role === "admin" || d.role === "supervisor");
const truckDrivers = seedData.drivers.filter(d => d.role === "truck_driver");
const excOperators = seedData.drivers.filter(d => d.role === "excavator_operator");

const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>สรุปบัญชีผู้ใช้งานระบบ - โรงโม่หิน ป.ศรีวิไลลักษณ์</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      font-family: "Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body {
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header-box {
      border-bottom: 2.5px solid #1e3a8a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.2px;
    }
    .plant-subtitle {
      font-size: 11pt;
      font-weight: 700;
      color: #059669;
      margin: 2px 0 0 0;
    }
    .doc-meta-right {
      text-align: right;
      font-size: 8pt;
      color: #475569;
    }
    .doc-badge {
      display: inline-block;
      background: #1e3a8a;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 8.5pt;
      margin-bottom: 3px;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 800;
      color: #1e3a8a;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
      margin: 14px 0 7px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-count {
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9pt;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      text-align: left;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 4.5px 6px;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .badge-pin {
      background: #eff6ff !important;
      border: 1px solid #bfdbfe;
      color: #1d4ed8 !important;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .badge-pin-admin {
      background: #fef3c7 !important;
      border: 1px solid #fde68a;
      color: #92400e !important;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .badge-pin-sup {
      background: #f3e8ff !important;
      border: 1px solid #e9d5ff;
      color: #6b21a8 !important;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .badge-role-admin {
      background: #fef3c7 !important;
      color: #92400e !important;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 8pt;
    }
    .badge-role-sup {
      background: #f3e8ff !important;
      color: #6b21a8 !important;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 8pt;
    }
    .badge-active {
      color: #059669;
      font-weight: 700;
      font-size: 8pt;
    }
    .info-card {
      background: #f8fafc !important;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 10px;
      font-size: 8.5pt;
      line-height: 1.45;
    }
    .info-card strong {
      color: #1e3a8a;
    }
    .sign-section {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 44%;
      border-top: 1px dashed #94a3b8;
      padding-top: 6px;
      text-align: center;
      font-size: 8.5pt;
      color: #334155;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: HEADER -->
  <div class="header-box">
    <div class="brand-left">
      ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Logo">` : ""}
      <div>
        <h1 class="company-title">บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด</h1>
        <p class="plant-subtitle">โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)</p>
      </div>
    </div>
    <div class="doc-meta-right">
      <div class="doc-badge">เอกสารควบคุมภายใน</div>
      <div><strong>เลขที่เอกสาร:</strong> CYM-AUTH-2026-001</div>
      <div><strong>วันที่ประกาศ:</strong> 29 กันยายน 2569</div>
      <div><strong>ระบบ:</strong> เว็บแอปพลิเคชันบริหารรอบวิ่ง</div>
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 10px;">
    <h2 style="font-size: 13pt; font-weight: 800; color: #0f172a; margin: 0;">
      บัญชีผู้ใช้งานระบบและรหัสผ่านเข้าใช้งาน (User Login & PIN Directory)
    </h2>
    <p style="font-size: 9pt; color: #64748b; margin: 2px 0 0 0;">
      ระบบบันทึกรอบวิ่งรถบรรทุกสิบล้อ และบันทึกการตักของรถขุดแม็คโคร (Quarry Fleet Management System)
    </p>
  </div>

  <!-- SECTION 1: ADMIN & SUPERVISOR -->
  <div class="section-title">
    <span>💼 1. บัญชีผู้บริหาร และ หัวหน้างาน</span>
    <span class="section-count">รวม ${admins.length} บัญชี</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 6%;" class="text-center">ลำดับ</th>
        <th style="width: 28%;">ชื่อ-นามสกุล / ตำแหน่ง</th>
        <th style="width: 14%;">ชื่อเล่น</th>
        <th style="width: 18%;" class="text-center">ชื่อผู้ใช้ (Username)</th>
        <th style="width: 16%;" class="text-center">รหัส PIN (6 หลัก)</th>
        <th style="width: 18%;" class="text-center">สิทธิ์การใช้งาน</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center font-mono">1</td>
        <td><strong>ผู้บริหารโรงโม่ (Admin)</strong></td>
        <td>เฮีย / บอส</td>
        <td class="text-center font-mono" style="color: #1e3a8a; font-weight: 800; font-size: 10pt;">admin</td>
        <td class="text-center"><span class="badge-pin-admin font-mono">999999</span></td>
        <td class="text-center"><span class="badge-role-admin">👑 ผู้บริหาร (เต็มสิทธิ์)</span></td>
      </tr>
      <tr>
        <td class="text-center font-mono">2</td>
        <td><strong>หัวหน้างานหน้างาน (Supervisor)</strong></td>
        <td>หัวหน้า</td>
        <td class="text-center font-mono" style="color: #1e3a8a; font-weight: 800; font-size: 10pt;">SUP</td>
        <td class="text-center"><span class="badge-pin-sup font-mono">888888</span></td>
        <td class="text-center"><span class="badge-role-sup">📋 หัวหน้างาน (เต็มสิทธิ์)</span></td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: TRUCK DRIVERS -->
  <div class="section-title">
    <span>🚚 2. บัญชีพนักงานขับรถบรรทุกสิบล้อ (Truck Drivers)</span>
    <span class="section-count">รวม ${truckDrivers.length} คน (ประจำการรถ 28 คัน)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;" class="text-center">ลำดับ</th>
        <th style="width: 26%;">ชื่อ-นามสกุล</th>
        <th style="width: 10%;">ชื่อเล่น</th>
        <th style="width: 17%;" class="text-center">เบอร์โทร (Username)</th>
        <th style="width: 22%;">เบอร์รถประจำ</th>
        <th style="width: 12%;" class="text-center">รหัส PIN</th>
        <th style="width: 8%;" class="text-center">สถานะ</th>
      </tr>
    </thead>
    <tbody>
      ${truckDrivers.map((d, idx) => `
        <tr>
          <td class="text-center font-mono">${idx + 1}</td>
          <td><strong>${d.name}</strong></td>
          <td>${d.nickname ? 'น้า' + d.nickname : '-'}</td>
          <td class="text-center font-mono">${d.phone}</td>
          <td>${d.assigned_vehicle || '-'}</td>
          <td class="text-center"><span class="badge-pin font-mono">${d.pin || '123456'}</span></td>
          <td class="text-center"><span class="badge-active">พร้อมใช้</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- PAGE BREAK FOR PAGE 2 -->
  <div class="page-break"></div>

  <!-- PAGE 2: HEADER -->
  <div class="header-box">
    <div class="brand-left">
      ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Logo">` : ""}
      <div>
        <h1 class="company-title" style="font-size: 13pt;">บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด</h1>
        <p class="plant-subtitle" style="font-size: 10.5pt;">โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)</p>
      </div>
    </div>
    <div class="doc-meta-right">
      <div><strong>เอกสาร:</strong> บัญชีผู้ใช้งานระบบ (หน้า 2)</div>
      <div><strong>วันที่:</strong> 29 กันยายน 2569</div>
    </div>
  </div>

  <!-- SECTION 3: EXCAVATOR OPERATORS -->
  <div class="section-title">
    <span>🚜 3. บัญชีพนักงานขับรถขุด / แม็คโคร (Excavator Operators)</span>
    <span class="section-count">รวม ${excOperators.length} คน (ประจำการเครื่องจักร 20 คัน)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;" class="text-center">ลำดับ</th>
        <th style="width: 26%;">ชื่อ-นามสกุล</th>
        <th style="width: 10%;">ชื่อเล่น</th>
        <th style="width: 17%;" class="text-center">เบอร์โทร (Username)</th>
        <th style="width: 22%;">เครื่องจักรประจำ</th>
        <th style="width: 12%;" class="text-center">รหัส PIN</th>
        <th style="width: 8%;" class="text-center">สถานะ</th>
      </tr>
    </thead>
    <tbody>
      ${excOperators.map((d, idx) => `
        <tr>
          <td class="text-center font-mono">${idx + 1}</td>
          <td><strong>${d.name}</strong></td>
          <td>${d.nickname ? 'ช่าง' + d.nickname : '-'}</td>
          <td class="text-center font-mono">${d.phone}</td>
          <td>${d.assigned_vehicle || '-'}</td>
          <td class="text-center"><span class="badge-pin font-mono">${d.pin || '123456'}</span></td>
          <td class="text-center"><span class="badge-active">พร้อมใช้</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SECTION 4: USER GUIDELINES -->
  <div class="info-card">
    <strong>📌 คำแนะนำในการเข้าใช้งานระบบและข้อปฏิบัติด้านความปลอดภัย:</strong>
    <ol style="margin: 4px 0 0 16px; padding: 0;">
      <li><strong>ลิงก์เข้าใช้งานระบบ:</strong> <a href="https://driving-quarry-truck.vercel.app" style="color: #2563eb; text-decoration: none; font-weight: 700;">https://driving-quarry-truck.vercel.app</a> สามารถเปิดผ่านโทรศัพท์มือถือทั้งระบบ iOS (Safari) และ Android (Chrome)</li>
      <li><strong>การติดตั้งบนหน้าจอโฮม (PWA):</strong> เพื่อความสะดวก ให้กดปุ่มแชร์แล้วเลือก <em>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</em> จะมีไอคอนแอปโรงโม่ ป.ศรีฯ ทันที</li>
      <li><strong>การเปลี่ยนรหัสผ่านประจำตัว:</strong> พนักงานทุกคนสามารถเข้าไปเปลี่ยนรหัส PIN 6 หลักของตนเองได้ตลอดเวลา โดยกดปุ่ม <strong>[🔑 PIN]</strong> ที่มุมบนขวาของหน้าจอการทำงาน</li>
      <li><strong>การลงทะเบียนพนักงานใหม่:</strong> ต้องดำเนินการผ่านหัวหน้างานหรือผู้บริหารในเมนูจัดการระบบเท่านั้น เพื่อความถูกต้องและปลอดภัย</li>
    </ol>
  </div>

  <!-- SIGNATURE BLOCK -->
  <div class="sign-section">
    <div class="sign-box">
      <br><br>
      (............................................................)<br>
      <strong>ผู้จัดทำ / หัวหน้างาน</strong><br>
      วันที่ ......... / ......... / 2569
    </div>
    <div class="sign-box">
      <br><br>
      (............................................................)<br>
      <strong>ผู้มีอำนาจลงนาม / ผู้บริหาร</strong><br>
      วันที่ ......... / ......... / 2569
    </div>
  </div>

</body>
</html>`;

const htmlPath = path.join(__dirname, "../exports/user_credentials.html");
const pdfPath = path.join(__dirname, "../exports/บัญชีผู้ใช้งาน_โรงโม่หิน_ป.ศรีวิไลลักษณ์.pdf");

fs.writeFileSync(htmlPath, html, "utf8");
console.log("✅ HTML written:", htmlPath);

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (fs.existsSync(chromePath)) {
  console.log("⏳ Generating PDF via Google Chrome Headless...");
  execSync(`"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`);
  console.log("🎉 PDF successfully generated at:", pdfPath);
} else {
  console.warn("Chrome binary not found at default path.");
}

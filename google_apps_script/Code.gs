/**
 * =========================================================================
 * ระบบบริหารจัดการโรงโม่ (Quarry Management System Backend & Web App)
 * รองรับ: 1) ให้บริการ Web App PWA 24/7 ถาวร
 *        2) Google Sheets ฐานข้อมูล + Google Drive คลังจัดเก็บรูปถ่าย
 * =========================================================================
 */

const FOLDER_NAME = "โรงโม่_คลังรูปถ่ายรอบวิ่ง";

function doGet(e) {
  // หากมีการเรียก parameter API (เช่น ping หรือ getMasterData)
  if (e && e.parameter && e.parameter.action) {
    return handleRequest(e);
  }
  
  // ให้บริการหน้าเว็บแอป PWA ตลอด 24 ชม. ถาวรบน Google Cloud
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบบริหารงานโรงโม่ (Quarry Management System)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    let params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e.parameter) {
      params = e.parameter;
    }
    
    const action = params.action || 'ping';
    let result = {};
    
    if (action === 'ping') {
      result = { status: 'success', message: 'API โรงโม่เชื่อมต่อสำเร็จ (Connected)', timestamp: new Date().toISOString() };
    } else if (action === 'initDatabase') {
      result = initDatabase(params.seedData);
    } else if (action === 'saveTrip') {
      result = saveTruckTrip(params);
    } else if (action === 'saveExcavatorLog') {
      result = saveExcavatorLog(params);
    } else if (action === 'getMasterData') {
      result = getMasterData();
    } else if (action === 'syncAllData') {
      result = syncAllData(params);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------------------
// ฟังก์ชันสร้างฐานข้อมูลใน Google Sheets อัตโนมัติ
// -------------------------------------------------------------------------
function initDatabase(seedData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. แผ่นงานรถบรรทุก
  let truckSheet = ss.getSheetByName("ข้อมูลรถบรรทุก");
  if (!truckSheet) {
    truckSheet = ss.insertSheet("ข้อมูลรถบรรทุก");
    truckSheet.appendRow(["รหัสรถ", "ทะเบียนรถ", "ขนาดพิกัด (ตัน)", "ชื่อเล่น/ชื่อเรียก", "คนขับประจำ", "เบอร์โทรศัพท์", "สถานะ"]);
    truckSheet.getRange(1, 1, 1, 7).setBackground("#f59e0b").setFontWeight("bold").setFontColor("#000000");
    
    if (seedData && seedData.trucks) {
      seedData.trucks.forEach(t => {
        truckSheet.appendRow([t.id, t.code, t.capacity_ton, t.nickname, t.driver_name, t.driver_phone, t.status]);
      });
    }
  }

  // 2. แผ่นงานแม็คโคร
  let excSheet = ss.getSheetByName("ข้อมูลแม็คโคร");
  if (!excSheet) {
    excSheet = ss.insertSheet("ข้อมูลแม็คโคร");
    excSheet.appendRow(["รหัสเครื่องจักร", "เบอร์เรียก", "ผู้ควบคุมประจำ", "ชื่อเล่น", "เบอร์โทร", "ทีม ผรม.", "เรทค่าตัก (บาท)", "สถานะ"]);
    excSheet.getRange(1, 1, 1, 8).setBackground("#ea580c").setFontWeight("bold").setFontColor("#ffffff");
    
    if (seedData && seedData.excavators) {
      seedData.excavators.forEach(e => {
        excSheet.appendRow([e.id, e.code, e.driver_name, e.nickname, e.driver_phone, e.is_contractor ? "ใช่" : "ไม่ใช่", e.rate_per_scoop, e.status]);
      });
    }
  }

  // 3. แผ่นงานเรทราคาค่าเที่ยว
  let rateSheet = ss.getSheetByName("เรทราคาค่าเที่ยว");
  if (!rateSheet) {
    rateSheet = ss.insertSheet("เรทราคาค่าเที่ยว");
    rateSheet.appendRow(["รหัสเรท", "ชื่อประเภทงานวิ่ง", "ระยะทาง/จุดหมาย", "เรท 30 ตัน", "เรท 45 ตัน", "เรท 60 ตัน"]);
    rateSheet.getRange(1, 1, 1, 6).setBackground("#d97706").setFontWeight("bold").setFontColor("#ffffff");
    
    if (seedData && seedData.job_rates) {
      seedData.job_rates.forEach(r => {
        rateSheet.appendRow([r.id, r.name, r.target_location, r.rate_30_ton, r.rate_45_ton, r.rate_60_ton]);
      });
    }
  }

  // 4. แผ่นงานบันทึกรอบวิ่งรถบรรทุก
  let tripSheet = ss.getSheetByName("บันทึกรอบวิ่งรถบรรทุก");
  if (!tripSheet) {
    tripSheet = ss.insertSheet("บันทึกรอบวิ่งรถบรรทุก");
    tripSheet.appendRow([
      "รหัสรอบวิ่ง", "วันที่", "เวลาบันทึก", "เบอร์รถ/ทะเบียน", "ขนาดพิกัด (ตัน)",
      "ชื่อคนขับ", "เบอร์โทร", "รอบที่", "ประเภทงานวิ่ง", "ยอดเงิน (บาท)",
      "ลิงก์รูปจุดรับหิน", "พิกัดรับ (Lat,Lng)", "ลิงก์รูปจุดเทหิน", "พิกัดเท (Lat,Lng)", "สถานะตรวจสอบ"
    ]);
    tripSheet.getRange(1, 1, 1, 15).setBackground("#0f172a").setFontWeight("bold").setFontColor("#f59e0b");
  }

  // 5. แผ่นงานบันทึกการตักแม็คโคร
  let scoopSheet = ss.getSheetByName("บันทึกการตักแม็คโคร");
  if (!scoopSheet) {
    scoopSheet = ss.insertSheet("บันทึกการตักแม็คโคร");
    scoopSheet.appendRow([
      "รหัสรายการ", "วันที่", "เวลาบันทึก", "เบอร์แม็คโคร", "ผู้ควบคุม",
      "รถบรรทุกที่รับหิน", "ยอดเงิน (บาท)", "ลิงก์รูปถ่าย", "พิกัด GPS (Lat,Lng)", "สถานะ"
    ]);
    scoopSheet.getRange(1, 1, 1, 10).setBackground("#0f172a").setFontWeight("bold").setFontColor("#f59e0b");
  }

  return { status: 'success', message: 'สร้างชีตฐานข้อมูลครบทั้ง 5 แผ่นงานเรียบร้อยแล้ว' };
}

// -------------------------------------------------------------------------
// ฟังก์ชันบันทึกรอบวิ่งรถบรรทุก + บันทึกรูปเข้า Google Drive
// -------------------------------------------------------------------------
function saveTruckTrip(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tripSheet = ss.getSheetByName("บันทึกรอบวิ่งรถบรรทุก") || ss.insertSheet("บันทึกรอบวิ่งรถบรรทุก");
  
  let loadPhotoUrl = "";
  let dumpPhotoUrl = "";
  
  // บันทึกรูปลง Drive Folder
  if (data.loadPhotoBase64) {
    loadPhotoUrl = uploadBase64ToDrive(data.loadPhotoBase64, `LOAD_${data.truckPlate}_R${data.roundNumber}_${Date.now()}.jpg`);
  }
  if (data.dumpPhotoBase64) {
    dumpPhotoUrl = uploadBase64ToDrive(data.dumpPhotoBase64, `DUMP_${data.truckPlate}_R${data.roundNumber}_${Date.now()}.jpg`);
  }

  const row = [
    data.id || ("TRIP_" + Date.now()),
    data.date || new Date().toISOString().split('T')[0],
    data.timestamp || new Date().toLocaleString('th-TH'),
    data.truckPlate || "",
    data.capacityTon || 30,
    data.driverName || "",
    data.driverPhone || "",
    data.roundNumber || 1,
    data.jobTypeName || "",
    data.amount || 0,
    loadPhotoUrl,
    `${data.loadLat || ""}, ${data.loadLng || ""}`,
    dumpPhotoUrl,
    `${data.dumpLat || ""}, ${data.dumpLng || ""}`,
    "อนุมัติแล้ว"
  ];

  tripSheet.appendRow(row);
  return { status: 'success', tripId: data.id, loadPhotoUrl: loadPhotoUrl, dumpPhotoUrl: dumpPhotoUrl };
}

// -------------------------------------------------------------------------
// ฟังก์ชันบันทึกการตักแม็คโคร + บันทึกรูปเข้า Drive
// -------------------------------------------------------------------------
function saveExcavatorLog(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scoopSheet = ss.getSheetByName("บันทึกการตักแม็คโคร") || ss.insertSheet("บันทึกการตักแม็คโคร");
  
  let photoUrl = "";
  if (data.photoBase64) {
    photoUrl = uploadBase64ToDrive(data.photoBase64, `EXC_${data.excavatorCode}_${Date.now()}.jpg`);
  }

  const row = [
    data.id || ("EXC_" + Date.now()),
    data.date || new Date().toISOString().split('T')[0],
    data.timestamp || new Date().toLocaleString('th-TH'),
    data.excavatorCode || "",
    data.operatorName || "",
    data.targetTruckPlate || "",
    data.amount || 5.0,
    photoUrl,
    `${data.lat || ""}, ${data.lng || ""}`,
    "สำเร็จ"
  ];

  scoopSheet.appendRow(row);
  return { status: 'success', logId: data.id, photoUrl: photoUrl };
}

// -------------------------------------------------------------------------
// Helper: อัปโหลดรูปภาพ Base64 เข้า Google Drive
// -------------------------------------------------------------------------
function uploadBase64ToDrive(base64Data, filename) {
  try {
    let cleanBase64 = base64Data;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, 'image/jpeg', filename);
    
    let folder;
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(FOLDER_NAME);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    console.error("Upload error:", err);
    return "";
  }
}

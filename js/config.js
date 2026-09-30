/**
 * การตั้งค่าระบบโรงโม่ (System Configuration)
 */
const CONFIG = {
  APP_NAME: "โรงโม่หิน ป.ศรีวิไลลักษณ์",
  PLANT_NAME: "โรงโม่หิน ป.ศรีวิไลลักษณ์ (ป.ศรีฯ)",
  COMPANY_NAME: "บริษัท ชาญยุทธการศิลาเลย (1997) จำกัด",
  COMPANY_ENG_NAME: "CHANYUTH MILL (1997) CO., LTD.",
  COMPANY_SLOGAN: "ให้บริการโม่หินผสมคลุก ยางแอสฟัลท์ติกคอนกรีต หินคลุก หินเกล็ด และวัสดุก่อสร้างครบวงจร",
  VERSION: "2.9.3",
  // Supabase PostgreSQL & Storage Settings
  SUPABASE_URL: "https://gkkndbjgkzninlddfxyj.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_WTSz40n7tX2IzaJxZAN4TQ_IozqzRT0",
  STORAGE_BUCKET: "quarry-photos",
  IMAGE_COMPRESSION: {
    MAX_WIDTH: 1280,
    MAX_HEIGHT: 1280,
    QUALITY: 0.75, // คมชัดสูง บันทึกทะเบียน/ลายน้ำชัดเจน แต่ขนาดไฟล์เพียง ~100-150KB
    FORMAT: "image/jpeg"
  },
  STORAGE_KEYS: {
    MASTER_DATA: "quarry_master_data_v1",
    CURRENT_USER: "quarry_current_user",
    CURRENT_SHIFT: "quarry_current_shift",
    CURRENT_WORK_MODE: "quarry_current_work_mode",
    TRIPS: "quarry_trips_data",
    EXCAVATOR_LOGS: "quarry_excavator_logs",
    INCIDENT_AUDITS: "quarry_incident_audits",
    PENDING_SYNC: "quarry_pending_sync_queue",
    SETTINGS: "quarry_system_settings",
    SUPABASE_CUSTOM_KEY: "quarry_supabase_anon_key"
  },
  DEFAULT_MAP_CENTER: [14.8824, 102.0135],
  AUTO_SYNC_INTERVAL_MS: 20000,
  API_TIMEOUT_MS: 12000,
  MAX_SYNC_ATTEMPTS_BEFORE_WARNING: 5
};

window.CONFIG = CONFIG;

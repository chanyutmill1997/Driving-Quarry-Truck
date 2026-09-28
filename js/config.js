/**
 * การตั้งค่าระบบโรงโม่ (System Configuration)
 */
const CONFIG = {
  APP_NAME: "ระบบบริหารงานโรงโม่",
  VERSION: "2.0.0",
  // Google Apps Script Web App Deployment URL (Updated)
  API_URL: "https://script.google.com/macros/s/AKfycby_mPElgoCrroadGQyzwzWXABnjGtaOFrWhI2Jemujwiz6uyasIgEO71sbZLO5H9g64IA/exec",
  STORAGE_KEYS: {
    MASTER_DATA: "quarry_master_data_v1",
    CURRENT_USER: "quarry_current_user",
    CURRENT_SHIFT: "quarry_current_shift",
    CURRENT_WORK_MODE: "quarry_current_work_mode",
    TRIPS: "quarry_trips_data",
    EXCAVATOR_LOGS: "quarry_excavator_logs",
    PENDING_SYNC: "quarry_pending_sync_queue",
    SETTINGS: "quarry_system_settings"
  },
  DEFAULT_MAP_CENTER: [14.8824, 102.0135],
  AUTO_SYNC_INTERVAL_MS: 30000,
  API_TIMEOUT_MS: 12000,
  MAX_SYNC_ATTEMPTS_BEFORE_WARNING: 5
};

window.CONFIG = CONFIG;

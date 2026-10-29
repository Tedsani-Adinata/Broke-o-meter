/**
 * backup.js - Modul Cadangan & Pemulihan (Ekspor/Impor JSON) Broke-o-meter
 * Menyediakan ekspor data terstruktur, validasi format berkas impor,
 * pemilihan mode pemulihan (Ganti Semua / Gabungkan), serta logika pengingat cadangan 7 hari.
 * Fungsi penyimpanan dan pemilihan file diisolasi agar dapat digantikan oleh plugin Capacitor di Tahap 4.
 */

import { getTodayString, formatIndonesianDate } from './dateUtils.js';
import { isNativePlatform, saveAndShareNativeFile } from './capacitorApp.js';

export const LAST_EXPORT_KEY = 'broke_o_meter_last_export';
export const REMINDER_DISMISSED_SESSION_KEY = 'broke_o_meter_reminder_dismissed_session';

/**
 * Menyimpan file cadangan JSON ke perangkat lokal.
 * Menggunakan Capacitor Filesystem & Share di Android native, dengan fallback browser download.
 * @param {string} jsonString - Konten JSON yang siap diunduh
 * @param {string} filename - Nama file (misal: "broke-o-meter-cadangan-2026-10-13.json")
 */
export async function saveBackupFile(jsonString, filename) {
  // Jika berjalan di platform native Capacitor (Android), gunakan Filesystem & Share
  if (isNativePlatform()) {
    try {
      await saveAndShareNativeFile({
        filename,
        data: jsonString,
        isBase64: false,
        title: 'Cadangan Data Broke-o-meter',
        text: `File cadangan data pengeluaran: ${filename}`,
        dialogTitle: 'Simpan atau Bagikan File Cadangan JSON'
      });
      return;
    } catch (nativeErr) {
      console.warn('Gagal menyimpan cadangan via native Capacitor, fallback ke browser download:', nativeErr);
    }
  }

  // Fallback lingkungan web browser biasa
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Membuka pemilih file untuk membaca file JSON dari perangkat.
 * Diisolasi dalam fungsi terpisah untuk kebutuhan Capacitor File Picker di Tahap 4.
 * @returns {Promise<{ content: string, filename: string } | null>}
 */
export async function pickBackupFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve({
          content: event.target.result,
          filename: file.name
        });
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Menghasilkan file JSON cadangan dari seluruh entri.
 * @param {Array} entries - Daftar transaksi dari storage
 * @returns {Promise<{ success: boolean, filename: string, count: number }>}
 */
export async function exportDataToJson(entries = []) {
  const todayStr = getTodayString();
  const exportPayload = {
    appName: 'Broke-o-meter',
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportDateFormatted: formatIndonesianDate(todayStr, true),
    totalEntries: entries.length,
    entries: entries
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const filename = `broke-o-meter-cadangan-${todayStr}.json`;

  await saveBackupFile(jsonString, filename);

  // Catat tanggal ekspor terakhir
  recordLastExport();

  return {
    success: true,
    filename,
    count: entries.length
  };
}

/**
 * Memvalidasi struktur file cadangan JSON yang diimpor.
 * Menerima format wrapper { appName, version, entries: [...] } atau array langsung [...].
 * @param {string} rawJson - String JSON yang dibaca dari file
 * @returns {{ isValid: boolean, entries: Array, error?: string }}
 */
export function validateBackupJson(rawJson) {
  if (!rawJson || typeof rawJson !== 'string') {
    return { isValid: false, entries: [], error: 'Berkas kosong atau tidak dapat dibaca.' };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return { isValid: false, entries: [], error: 'Berkas bukan format JSON yang valid.' };
  }

  // Ambil daftar entri
  let rawEntries = [];
  if (Array.isArray(parsed)) {
    rawEntries = parsed;
  } else if (parsed && Array.isArray(parsed.entries)) {
    rawEntries = parsed.entries;
  } else {
    return { isValid: false, entries: [], error: 'Format struktur data tidak dikenali.' };
  }

  // Validasi setiap entri transaksi
  const validEntries = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const item = rawEntries[i];
    if (
      item &&
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      item.name.trim() !== '' &&
      !isNaN(Number(item.price)) &&
      Number(item.price) >= 0
    ) {
      validEntries.push({
        id: String(item.id || ('imported_' + Date.now() + '_' + i)),
        name: String(item.name).trim(),
        price: Number(item.price),
        category: String(item.category || 'lainnya'),
        date: String(item.date || getTodayString()),
        createdAt: Number(item.createdAt || (Date.now() + i))
      });
    }
  }

  if (validEntries.length === 0 && rawEntries.length > 0) {
    return { isValid: false, entries: [], error: 'Tidak ada data transaksi yang valid dalam file.' };
  }

  return {
    isValid: true,
    entries: validEntries,
    originalCount: rawEntries.length
  };
}

/**
 * Mencatat waktu ekspor terakhir ke localStorage.
 */
export function recordLastExport() {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
    // Hapus flag dismiss sesi agar reminder direset
    sessionStorage.removeItem(REMINDER_DISMISSED_SESSION_KEY);
  } catch (e) {
    console.warn('Gagal menyimpan waktu ekspor terakhir:', e);
  }
}

/**
 * Mendapatkan string tanggal ekspor terakhir (atau null jika belum pernah).
 * @returns {string|null}
 */
export function getLastExportTime() {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Mengecek apakah pengingat cadangan perlu ditampilkan.
 * Kriteria aturan #8:
 * - Jika ada data (> 0 entri)
 * - DAN (belum pernah ekspor ATAU sudah > 7 hari sejak ekspor terakhir)
 * @param {number} entriesCount - Jumlah data yang tersimpan
 * @returns {boolean}
 */
export function shouldShowBackupReminder(entriesCount = 0) {
  if (entriesCount <= 0) return false;

  const lastExport = getLastExportTime();
  if (!lastExport) return true; // Belum pernah ekspor dan ada data

  const lastDate = new Date(lastExport);
  const now = new Date();
  const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

  return diffDays >= 7;
}

/**
 * Mengecek apakah pengingat toast saat buka aplikasi sudah ditutup pada sesi saat ini.
 * @returns {boolean}
 */
export function isReminderDismissedThisSession() {
  try {
    return sessionStorage.getItem(REMINDER_DISMISSED_SESSION_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Menandai pengingat toast sudah ditutup untuk sesi browser/aplikasi saat ini.
 */
export function dismissReminderForSession() {
  try {
    sessionStorage.setItem(REMINDER_DISMISSED_SESSION_KEY, 'true');
  } catch (e) {
    // Abaikan jika storage dinonaktifkan
  }
}

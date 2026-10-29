/**
 * dateUtils.js - Utilitas manipulasi dan pemformatan tanggal dalam Bahasa Indonesia.
 * Berjalan offline menggunakan jam lokal perangkat.
 */

import { DAY_NAMES, MONTH_NAMES } from './constants.js';

/**
 * Mendapatkan string tanggal hari ini dalam format YYYY-MM-DD (waktu lokal perangkat).
 * @returns {string} Contoh: "2026-10-13"
 */
export function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format string YYYY-MM-DD menjadi format tanggal Indonesia lengkap.
 * @param {string} dateStr - Tanggal format "YYYY-MM-DD"
 * @param {boolean} [withWeekday=true] - Sertakan nama hari
 * @returns {string} Contoh: "Selasa, 13 Oktober 2026"
 */
export function formatIndonesianDate(dateStr, withWeekday = true) {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-based
  const day = parseInt(dayStr, 10);

  // Buat date object lokal
  const d = new Date(year, month, day);
  const weekday = DAY_NAMES[d.getDay()] || '';
  const monthName = MONTH_NAMES[month] || '';

  if (withWeekday) {
    return `${weekday}, ${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName} ${year}`;
}

/**
 * Format bulan dan tahun menjadi string Indonesia.
 * @param {number} year - Tahun (misal: 2026)
 * @param {number} monthIndex - Index bulan 0-11 (0 = Januari, 9 = Oktober)
 * @returns {string} Contoh: "Oktober 2026"
 */
export function formatMonthYear(year, monthIndex) {
  const monthName = MONTH_NAMES[monthIndex] || '';
  return `${monthName} ${year}`;
}

/**
 * Mendapatkan rentang minggu ini (Senin sampai Minggu) dari tanggal acuan.
 * Standar Indonesia: Pekan dimulai hari Senin dan berakhir hari Minggu.
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ start: string, end: string, startDay: number, endDay: number }}
 */
export function getCurrentWeekRange(referenceDate = new Date()) {
  const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dayOfWeek = d.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
  
  // Hitung selisih hari ke hari Senin
  // Jika hari Minggu (0), mundur 6 hari ke Senin lalu.
  // Jika hari Senin (1), selisih 0.
  // Jika hari Selasa (2), mundur 1 hari.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    start: toYmd(monday),
    end: toYmd(sunday)
  };
}

/**
 * Mengecek apakah suatu tanggal (YYYY-MM-DD) berada di dalam minggu tertentu.
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {{ start: string, end: string }} weekRange
 * @returns {boolean}
 */
export function isDateInWeek(dateStr, weekRange) {
  if (!dateStr || !weekRange) return false;
  return dateStr >= weekRange.start && dateStr <= weekRange.end;
}

/**
 * Mengecek apakah suatu tanggal (YYYY-MM-DD) berada di dalam tahun dan bulan tertentu.
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number} year - Contoh: 2026
 * @param {number} monthIndex - 0-11
 * @returns {boolean}
 */
export function isDateInMonth(dateStr, year, monthIndex) {
  if (!dateStr) return false;
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return dateStr.startsWith(prefix);
}

/**
 * Mendapatkan ucapan salam berdasarkan jam lokal perangkat dalam Bahasa Indonesia.
 * Rentang waktu standar:
 * - 04:00 - 10:59: Pagi
 * - 11:00 - 14:59: Siang
 * - 15:00 - 17:59: Sore
 * - 18:00 - 03:59: Malam
 * @param {string} [name='Aishia'] - Nama pengguna
 * @param {Date} [referenceDate=new Date()] - Waktu acuan
 * @returns {string} Contoh: "Selamat siang, Aishia! ☀️"
 */
export function getTimeGreeting(name = 'Aishia', referenceDate = new Date()) {
  const hour = referenceDate.getHours();
  let salam = 'Selamat pagi';
  let emoji = '☀️';

  if (hour >= 4 && hour < 11) {
    salam = 'Selamat pagi';
    emoji = '☀️';
  } else if (hour >= 11 && hour < 15) {
    salam = 'Selamat siang';
    emoji = '☀️';
  } else if (hour >= 15 && hour < 18) {
    salam = 'Selamat sore';
    emoji = '🌇';
  } else {
    // 18:00 - 03:59
    salam = 'Selamat malam';
    emoji = '🌙';
  }

  return name ? `${salam}, ${name}! ${emoji}` : `${salam}! ${emoji}`;
}


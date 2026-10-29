/**
 * pdfExport.js - Generator Laporan Pengeluaran PDF untuk Broke-o-meter
 * Berjalan sepenuhnya offline menggunakan jsPDF yang dibundel secara lokal.
 * Mendukung filter periode: Minggu Ini, Bulan Ini, dan Rentang Tanggal Kustom.
 * Hanya memuat hari-hari yang memiliki transaksi.
 */

import { formatCurrency, CATEGORIES } from './constants.js';
import { formatIndonesianDate, getCurrentWeekRange, getTodayString } from './dateUtils.js';
import { isNativePlatform, saveAndShareNativeFile } from './capacitorApp.js';

/**
 * Menyimpan file PDF ke perangkat.
 * Menggunakan Capacitor Filesystem & Share di Android native, dengan fallback jsPDF.save() di browser.
 * @param {object} pdfDoc - Objek dokumen jsPDF
 * @param {string} filename - Nama file output
 */
export async function savePdfFile(pdfDoc, filename) {
  if (!pdfDoc) {
    throw new Error('Dokumen PDF tidak ditemukan.');
  }

  // Jika berjalan di platform native Capacitor (Android), gunakan Filesystem & Share
  if (isNativePlatform()) {
    try {
      const dataUri = pdfDoc.output('datauristring');
      const base64Data = dataUri.split(',')[1];
      await saveAndShareNativeFile({
        filename,
        data: base64Data,
        isBase64: true,
        title: 'Laporan Pengeluaran Broke-o-meter',
        text: `Laporan pengeluaran: ${filename}`,
        dialogTitle: 'Buka atau Bagikan Laporan PDF'
      });
      return;
    } catch (nativeErr) {
      console.warn('Gagal menyimpan PDF via native Capacitor, fallback ke browser save:', nativeErr);
    }
  }

  // Fallback lingkungan web browser biasa
  pdfDoc.save(filename);
}

/**
 * Filter data pengeluaran berdasarkan opsi periode yang dipilih.
 * @param {Array} allEntries - Seluruh transaksi dari storage
 * @param {object} options - { periodType: 'week'|'month'|'custom', startDate?: string, endDate?: string }
 * @returns {{ filteredEntries: Array, periodLabel: string, filenameSuffix: string }}
 */
export function filterEntriesByPeriod(allEntries = [], options = {}) {
  const { periodType = 'week', startDate, endDate } = options;
  const todayStr = getTodayString();
  let start = '';
  let end = '';
  let periodLabel = '';
  let filenameSuffix = '';

  if (periodType === 'week') {
    const weekRange = getCurrentWeekRange(new Date());
    start = weekRange.start;
    end = weekRange.end;
    periodLabel = `Minggu Ini (${formatIndonesianDate(start, false)} - ${formatIndonesianDate(end, false)})`;
    filenameSuffix = `minggu-ini-${start}`;
  } else if (periodType === 'month') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Hari terakhir dalam bulan ini
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    start = `${year}-${month}-01`;
    end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    periodLabel = `Bulan Ini (${monthNames[now.getMonth()]} ${year})`;
    filenameSuffix = `bulan-${year}-${month}`;
  } else if (periodType === 'custom') {
    start = startDate || todayStr;
    end = endDate || todayStr;
    if (start > end) {
      // Tukar jika tanggal mulai lebih besar dari tanggal akhir
      const temp = start;
      start = end;
      end = temp;
    }
    periodLabel = `Rentang Tanggal (${formatIndonesianDate(start, false)} - ${formatIndonesianDate(end, false)})`;
    filenameSuffix = `rentang-${start}-sd-${end}`;
  }

  // Filter transaksi yang masuk dalam rentang tanggal [start, end]
  const filtered = allEntries.filter(item => {
    return item.date && item.date >= start && item.date <= end;
  });

  return {
    filteredEntries: filtered,
    periodLabel,
    filenameSuffix,
    startDate: start,
    endDate: end
  };
}

/**
 * Membuat dokumen PDF laporan pengeluaran.
 * @param {Array} allEntries - Seluruh transaksi
 * @param {object} options - { periodType, startDate, endDate }
 * @returns {Promise<{ doc: object, filename: string, count: number, grandTotal: number }>}
 */
export async function generateExpensePdf(allEntries, options = {}) {
  // Pastikan jsPDF tersedia secara global (dimuat dari lib/jspdf.umd.min.js)
  const jsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPdfConstructor) {
    throw new Error('Pustaka jsPDF belum dimuat. Periksa lib/jspdf.umd.min.js.');
  }

  const { filteredEntries, periodLabel, filenameSuffix } = filterEntriesByPeriod(allEntries, options);

  if (filteredEntries.length === 0) {
    throw new Error('Tidak ada catatan transaksi pada periode yang dipilih.');
  }

  // Kelompokkan per tanggal
  const groupedByDate = {};
  filteredEntries.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  // Urutkan tanggal secara kronologis (dari tanggal terlama ke terbaru agar enak dibaca sebagai laporan)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b));

  const doc = new jsPdfConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;

  // Helper untuk menambah halaman baru jika ruang tidak cukup
  const checkPageBreak = (neededHeight = 20) => {
    if (currentY + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      currentY = margin + 8;
      return true;
    }
    return false;
  };

  // --- 1. HEADER DOKUMEN ---
  // Background header banner
  doc.setFillColor(181, 38, 3); // primary #b52603
  doc.roundedRect(margin, currentY, contentWidth, 26, 3, 3, 'F');

  // Judul Aplikasi
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Broke-o-meter', margin + 8, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Laporan Pengeluaran Keuangan Harian', margin + 8, currentY + 18);

  // Info Cetak di kanan header
  doc.setFontSize(8);
  const now = new Date();
  const printDateStr = `${formatIndonesianDate(getTodayString(), true)}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  doc.text(`Dicetak: ${printDateStr}`, pageWidth - margin - 8, currentY + 11, { align: 'right' });
  doc.text('Status: Rekap Offline', pageWidth - margin - 8, currentY + 18, { align: 'right' });

  currentY += 32;

  // Subheader: Periode
  doc.setTextColor(30, 27, 24); // on-surface
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Periode Laporan: ${periodLabel}`, margin, currentY);

  currentY += 6;
  doc.setDrawColor(227, 190, 182); // outline-variant
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // --- 2. ISI LAPORAN (HANYA HARI YANG ADA TRANSAKSI) ---
  let grandTotal = 0;
  let totalItemsCount = 0;

  sortedDates.forEach((dateStr) => {
    const dayItems = groupedByDate[dateStr];
    // Urutkan transaksi dalam hari berdasarkan createdAt
    dayItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const dayTotal = dayItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    grandTotal += dayTotal;
    totalItemsCount += dayItems.length;

    // Cek ruang untuk header hari + minimal 1 baris
    checkPageBreak(24);

    // Header Hari Card
    doc.setFillColor(244, 236, 231); // surface-container #f4ece7
    doc.roundedRect(margin, currentY, contentWidth, 9, 1.5, 1.5, 'F');

    doc.setTextColor(30, 27, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const dayLabel = formatIndonesianDate(dateStr, true);
    doc.text(dayLabel, margin + 4, currentY + 6.2);

    doc.setTextColor(181, 38, 3); // primary
    doc.text(`Total: ${formatCurrency(dayTotal)}`, pageWidth - margin - 4, currentY + 6.2, { align: 'right' });

    currentY += 12;

    // Daftar Item pada hari tersebut
    dayItems.forEach((item, idx) => {
      checkPageBreak(8);

      const cat = CATEGORIES[item.category] || CATEGORIES.lainnya;
      const catName = cat.name || item.category;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 27, 24);

      // Kolom nama item + kategori
      const itemTitle = `${idx + 1}. ${item.name}  [${catName}]`;
      doc.text(itemTitle, margin + 6, currentY);

      // Kolom harga di kanan
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 60, 55);
      doc.text(formatCurrency(item.price), pageWidth - margin - 6, currentY, { align: 'right' });

      // Garis putus-putus halus antar item
      doc.setDrawColor(235, 225, 220);
      doc.setLineWidth(0.2);
      doc.line(margin + 6, currentY + 2, pageWidth - margin - 6, currentY + 2);

      currentY += 7;
    });

    currentY += 3; // Jarak antar hari
  });

  // --- 3. KOTAK REKAPITULASI AKHIR (GRAND TOTAL) ---
  checkPageBreak(28);
  currentY += 4;

  doc.setFillColor(255, 218, 210); // primary-fixed #ffdad2
  doc.setDrawColor(181, 38, 3);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(140, 25, 0);
  doc.text(`TOTAL KESELURUHAN (${totalItemsCount} Pengeluaran):`, margin + 6, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(181, 38, 3);
  doc.text(formatCurrency(grandTotal), pageWidth - margin - 6, currentY + 14, { align: 'right' });

  // --- 4. NOMOR HALAMAN & FOOTER PADA SETIAP HALAMAN ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(143, 112, 105); // outline #8f7069
    doc.text(
      'Broke-o-meter • Aplikasi Pencatat Boncos Pribadi Offline',
      margin,
      pageHeight - margin / 2
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - margin,
      pageHeight - margin / 2,
      { align: 'right' }
    );
  }

  const filename = `broke-o-meter-laporan-${filenameSuffix}.pdf`;

  return {
    doc,
    filename,
    count: totalItemsCount,
    grandTotal
  };
}

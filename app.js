/**
 * app.js - Controller Utama Aplikasi Broke-o-meter
 * Menghubungkan state, UI rendering, event listener, dan storage module.
 */

import * as storage from './storage.js';
import { 
  CATEGORIES, 
  DEFAULT_SUGGESTIONS, 
  formatCurrency, 
  getDailyStatus, 
  getMonthlyStatus 
} from './constants.js';
import { 
  getTodayString, 
  formatIndonesianDate, 
  formatMonthYear, 
  getCurrentWeekRange, 
  isDateInWeek, 
  isDateInMonth,
  getTimeGreeting
} from './dateUtils.js';
import { generateExpensePdf, savePdfFile } from './pdfExport.js';
import { 
  exportDataToJson, 
  pickBackupFile, 
  validateBackupJson, 
  shouldShowBackupReminder, 
  dismissReminderForSession, 
  isReminderDismissedThisSession,
  getLastExportTime 
} from './backup.js';
import { initTheme, applyTheme, toggleQuickTheme, getStoredTheme } from './theme.js';
import { 
  getProfileName, 
  setProfileName, 
  getProfileAvatar, 
  setProfileAvatar, 
  removeProfileAvatar, 
  compressAndCropImage, 
  updateProfileUI 
} from './profile.js';
import { initCapacitorApp } from './capacitorApp.js';
import { 
  animateTabEnter, 
  animateBottomSheetOpen, 
  animateBottomSheetClose, 
  animateToastShow, 
  animateToastHide, 
  animateCountUp, 
  animateModalOpen, 
  animateModalClose 
} from './motionHelper.js';

// ==================== STATE APLIKASI ====================
const state = {
  activeTab: 'hari-ini',
  lastActiveTab: 'hari-ini',
  selectedQuickCategory: 'makan',
  selectedEditCategory: 'makan',
  editingItemId: null,
  lastDeletedItem: null,
  undoTimer: null,
  // Bulan & Tahun aktif untuk tab Ringkasan
  ringkasanYear: new Date().getFullYear(),
  ringkasanMonth: new Date().getMonth(), // 0-11
  // Filter Riwayat
  historyCategoryFilter: 'all',
  historySearchQuery: '',
  // Stage 2: PDF & Impor state
  selectedPdfPeriod: 'week',
  pendingImportEntries: []
};

// Expose state dan navigasi lebih awal untuk inline handlers
window.appState = state;
window.navigateToTab = navigateToTab;

// ==================== NOTIFIKASI TOAST & URUNGKAN ====================
let toastTimeout = null;

/**
 * Menampilkan pesan toast / snackbar melayang
 * @param {string} message - Pesan notifikasi
 * @param {string} [icon='check_circle'] - Nama icon Material Symbols
 * @param {boolean} [canUndo=false] - Tampilkan tombol Urungkan
 * @param {number} [duration=4500] - Durasi tampil dalam milidetik
 */
export function showToast(message, icon = 'check_circle', canUndo = false, duration = 4500) {
  const toast = document.getElementById('app-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  const undoBtn = document.getElementById('toast-undo-btn');

  if (!toast || !toastMsg) return;
  if (toastTimeout) clearTimeout(toastTimeout);

  toastMsg.textContent = message;
  if (toastIcon) toastIcon.textContent = icon;

  if (undoBtn) {
    if (canUndo) {
      undoBtn.classList.remove('hidden');
    } else {
      undoBtn.classList.add('hidden');
    }
  }

  animateToastShow(toast);

  toastTimeout = setTimeout(() => {
    hideToast();
  }, duration);
}

export function hideToast() {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  animateToastHide(toast);
}

/**
 * Urungkan aksi hapus terakhir
 */
export async function undoLastAction() {
  if (!state.lastDeletedItem) return;
  
  const itemToRestore = { ...state.lastDeletedItem };
  state.lastDeletedItem = null;

  try {
    await storage.add(itemToRestore);
    await refreshAllViews();
    hideToast();
    showToast(`"${itemToRestore.name}" berhasil dikembalikan!`, 'restore');
  } catch (err) {
    console.error('Gagal mengembalikan catatan:', err);
    showToast('Gagal mengembalikan catatan', 'error');
  }
}

// ==================== NAVIGASI TAB ====================
export function navigateToTab(tabId) {
  if (tabId !== 'pengaturan') {
    state.lastActiveTab = tabId;
  }
  state.activeTab = tabId;

  // Toggle tampilan layar
  const views = document.querySelectorAll('.tab-view');
  views.forEach(v => v.classList.add('hidden'));

  const targetView = document.getElementById('view-' + tabId);
  if (targetView) {
    targetView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    animateTabEnter(targetView);
  }

  // Header adjustments
  const logoImg = document.getElementById('header-logo-img');
  const appTitle = document.getElementById('header-app-title');
  const headerSubtitle = document.getElementById('header-tab-subtitle');
  const backBtn = document.getElementById('btn-back-settings');
  const settingsBtn = document.getElementById('header-btn-settings');

  if (tabId === 'pengaturan') {
    if (logoImg) logoImg.classList.add('hidden');
    if (appTitle) appTitle.textContent = 'Pengaturan';
    if (headerSubtitle) {
      headerSubtitle.textContent = '';
      headerSubtitle.classList.add('hidden');
    }
    if (backBtn) {
      backBtn.classList.remove('hidden');
      backBtn.classList.add('flex');
    }
    if (settingsBtn) {
      settingsBtn.classList.add('hidden');
    }
  } else {
    if (logoImg) logoImg.classList.remove('hidden');
    if (appTitle) appTitle.textContent = 'Broke-o-meter';
    if (backBtn) {
      backBtn.classList.add('hidden');
      backBtn.classList.remove('flex');
    }
    if (settingsBtn) {
      settingsBtn.classList.remove('hidden');
    }

    const titles = {
      'hari-ini': '',
      'riwayat': 'Riwayat',
      'ringkasan': 'Ringkasan'
    };
    if (headerSubtitle) {
      if (titles[tabId]) {
        headerSubtitle.textContent = titles[tabId];
        headerSubtitle.classList.remove('hidden');
      } else {
        headerSubtitle.textContent = '';
        headerSubtitle.classList.add('hidden');
      }
    }
  }

  // Update styling tombol navigasi bawah
  const navButtons = document.querySelectorAll('.nav-tab-btn');
  navButtons.forEach(btn => {
    btn.classList.remove('text-primary', 'font-bold');
    btn.classList.add('text-on-surface-variant');
    btn.removeAttribute('aria-current');
  });

  const activeNavBtn = document.getElementById('nav-btn-' + (tabId === 'pengaturan' ? state.lastActiveTab : tabId));
  if (activeNavBtn) {
    activeNavBtn.classList.add('text-primary', 'font-bold');
    activeNavBtn.classList.remove('text-on-surface-variant');
    activeNavBtn.setAttribute('aria-current', 'page');
  }

  // Refresh data view yang baru dibuka
  if (tabId === 'riwayat') renderRiwayatView();
  if (tabId === 'ringkasan') renderRingkasanView();
  if (tabId === 'pengaturan' && typeof window.checkAndRenderBackupReminder === 'function') {
    window.checkAndRenderBackupReminder();
  }
}

// ==================== RENDERING: HARI INI ====================
export async function renderHariIniView(isInitial = false) {
  const todayStr = getTodayString();
  
  // Update teks tanggal real-time dari jam perangkat
  const todayDateStrEl = document.getElementById('today-date-str');
  if (todayDateStrEl) {
    todayDateStrEl.textContent = formatIndonesianDate(todayStr, true);
  }

  // Update ucapan salam dinamis sesuai jam lokal perangkat dan nama sapaan profil
  const greetingTitleEl = document.getElementById('greeting-title');
  if (greetingTitleEl) {
    greetingTitleEl.textContent = getTimeGreeting(getProfileName());
  }

  const allEntries = await storage.getAll();
  // Filter transaksi hari ini
  const todayEntries = allEntries.filter(item => item.date === todayStr);

  // Aturan STAGE 1: "ordered by createdAt (oldest on top)"
  todayEntries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  // Hitung total pengeluaran hari ini
  const todayTotal = todayEntries.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const status = getDailyStatus(todayTotal);

  // Update Hero Card: Total Hari Ini
  const displayTotalEl = document.getElementById('display-total');
  if (displayTotalEl) {
    if (isInitial) {
      // Saat cold launch, render langsung nilai sebenarnya tanpa race animasi count-up
      displayTotalEl.textContent = formatCurrency(todayTotal);
      displayTotalEl.dataset.currentNum = String(todayTotal);
    } else {
      animateCountUp(displayTotalEl, todayTotal, formatCurrency);
    }
  }

  // Progress Bar
  const progressBarEl = document.getElementById('today-progress-bar');
  if (progressBarEl) {
    if (isInitial) {
      progressBarEl.style.transition = 'none';
      progressBarEl.style.width = `${status.meterPercent}%`;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (progressBarEl) progressBarEl.style.transition = '';
        }, 50);
      });
    } else {
      progressBarEl.style.width = `${status.meterPercent}%`;
    }
  }

  // Quote ledekan / humor
  const todayQuoteEl = document.getElementById('today-quote');
  if (todayQuoteEl) {
    todayQuoteEl.textContent = status.quote;
  }

  // Badge jumlah pengeluaran
  const entryCountBadgeEl = document.getElementById('entry-count-badge');
  if (entryCountBadgeEl) {
    entryCountBadgeEl.textContent = `(${todayEntries.length} pengeluaran)`;
  }

  // Render Daftar Transaksi Hari Ini
  const listEl = document.getElementById('transaction-list');
  if (listEl) {
    listEl.innerHTML = '';

    if (todayEntries.length === 0) {
      // Empty State yang ramah
      listEl.innerHTML = `
        <div id="today-empty-state" class="flex flex-col items-center justify-center p-6 text-center rounded-lg bg-surface-container-lowest shadow-sm gap-2 transition-all">
          <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-1">
            <span class="material-symbols-outlined text-[24px]">savings</span>
          </div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface">Belum ada pengeluaran hari ini</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[260px]">
            Dompetmu masih full senyum! Tambahkan catatan di atas jika kamu jajan ya.
          </p>
        </div>
      `;
    } else {
      todayEntries.forEach(item => {
        const cat = CATEGORIES[item.category] || CATEGORIES.lainnya;
        const itemEl = document.createElement('div');
        itemEl.className = 'transaction-item flex items-center justify-between p-3.5 rounded bg-surface-container-lowest shadow-sm transition-all duration-300';
        itemEl.setAttribute('data-id', item.id);
        itemEl.setAttribute('data-name', item.name);
        itemEl.setAttribute('data-price', item.price);
        itemEl.setAttribute('data-cat', item.category);

        itemEl.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-full ${cat.bgLightClass} flex items-center justify-center ${cat.textLightClass} flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">${cat.materialIcon}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-body-lg text-body-lg text-on-surface font-bold truncate">${escapeHtml(item.name)}</span>
              <div class="flex items-center gap-1.5">
                <span class="font-label-sm text-label-sm text-on-surface-variant">${cat.name}</span>
                ${cat.defaultTag ? `<span class="w-1 h-1 rounded-full bg-outline-variant"></span><span class="font-label-sm text-label-sm text-primary font-medium">${cat.defaultTag}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-headline-sm text-headline-sm text-on-surface mr-1">-${formatCurrency(item.price)}</span>
            <button 
              type="button" 
              data-edit-id="${item.id}"
              class="btn-edit-item w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
              aria-label="Edit ${escapeHtml(item.name)}"
            >
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button 
              type="button" 
              data-delete-id="${item.id}"
              class="btn-delete-item w-11 h-11 flex items-center justify-center rounded-full text-error hover:bg-error-container active:scale-95 transition-all"
              aria-label="Hapus ${escapeHtml(item.name)}"
            >
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        `;
        listEl.appendChild(itemEl);
      });
    }
  }

  // Update Saran Pembelian (Suggestions) dari riwayat transaksi
  renderSuggestions(allEntries);
}

/**
 * Render Saran Nama Barang yang sering dibeli dari data transaksi
 */
function renderSuggestions(allEntries) {
  const container = document.getElementById('suggestions-container');
  if (!container) return;

  container.innerHTML = '';

  // Kumpulkan item unik dari riwayat (paling baru disimpan lebih dulu)
  const sortedDesc = [...allEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const uniqueSuggestions = [];
  const seenNames = new Set();

  for (const entry of sortedDesc) {
    const normalizedName = entry.name.toLowerCase().trim();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueSuggestions.push({
        name: entry.name,
        price: entry.price,
        category: entry.category
      });
    }
    if (uniqueSuggestions.length >= 6) break;
  }

  // Jika belum ada riwayat, gunakan default suggestions
  const suggestionsToDisplay = uniqueSuggestions.length > 0 ? uniqueSuggestions : DEFAULT_SUGGESTIONS;

  suggestionsToDisplay.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex-shrink-0 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-all';
    btn.textContent = s.name;
    btn.onclick = () => fillSuggestion(s.name, s.price, s.category);
    container.appendChild(btn);
  });
}

// ==================== RENDERING: RIWAYAT ====================
export async function renderRiwayatView() {
  const ledgerContainer = document.getElementById('history-ledger-container');
  if (!ledgerContainer) return;

  const allEntries = await storage.getAll();
  const query = (state.historySearchQuery || '').toLowerCase().trim();
  const selectedCat = state.historyCategoryFilter || 'all';

  // Filter berdasarkan search query dan kategori
  const filteredEntries = allEntries.filter(item => {
    const matchesSearch = !query || item.name.toLowerCase().includes(query);
    const matchesCategory = selectedCat === 'all' || item.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  ledgerContainer.innerHTML = '';

  if (allEntries.length === 0) {
    // Belum pernah ada transaksi sama sekali
    ledgerContainer.innerHTML = `
      <div id="history-empty-state" class="flex flex-col items-center justify-center p-8 text-center rounded-lg bg-surface-container-lowest shadow-sm gap-3 my-4">
        <div class="w-14 h-14 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-1">
          <span class="material-symbols-outlined text-[28px]">receipt_long</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface">Riwayat Masih Kosong</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[270px]">
          Belum ada transaksi yang tercatat. Catatan pengeluaran harianmu akan dirangkum rapi di sini!
        </p>
      </div>
    `;
    return;
  }

  if (filteredEntries.length === 0) {
    // Ada transaksi, tapi hasil pencarian / filter kosong
    ledgerContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center rounded-lg bg-surface-container-lowest shadow-sm gap-2 my-4">
        <div class="w-12 h-12 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mb-1">
          <span class="material-symbols-outlined text-[24px]">search_off</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface">Tidak Ditemukan</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[260px]">
          Tidak ada catatan yang cocok dengan pencarian atau filter yang dipilih.
        </p>
      </div>
    `;
    return;
  }

  // Kelompokkan berdasarkan tanggal (grouped by date, newest date first)
  const groupedByDate = {};
  filteredEntries.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  // Urutkan tanggal dari yang terbaru (newest first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(dateStr => {
    const dayItems = groupedByDate[dateStr];
    // Urutkan item dalam satu hari berdasarkan waktu pembuatan
    dayItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const dayTotal = dayItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const dayStatus = getDailyStatus(dayTotal);

    const card = document.createElement('div');
    card.className = 'history-day-card bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_20px_-2px_rgba(43,40,37,0.05)] flex flex-col gap-space-sm';
    card.setAttribute('data-date', dateStr);

    let itemsHtml = '';
    dayItems.forEach(item => {
      const cat = CATEGORIES[item.category] || CATEGORIES.lainnya;
      itemsHtml += `
        <div class="history-item flex items-center justify-between p-2 rounded-DEFAULT bg-surface hover:bg-surface-container-low transition-colors" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-cat="${item.category}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full ${cat.bgLightClass} flex items-center justify-center flex-shrink-0 ${cat.textLightClass} shadow-xs">
              <span class="material-symbols-outlined text-[18px]">${cat.materialIcon}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-body-md text-body-md text-on-surface font-semibold truncate">${escapeHtml(item.name)}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">${cat.fullName}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-headline-sm text-headline-sm text-on-surface text-right font-bold whitespace-nowrap mr-1">-${formatCurrency(item.price)}</span>
            <button 
              type="button" 
              data-edit-id="${item.id}"
              class="btn-edit-item w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
              aria-label="Edit ${escapeHtml(item.name)}"
            >
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button 
              type="button" 
              data-delete-id="${item.id}"
              class="btn-delete-item w-9 h-9 flex items-center justify-center rounded-full text-error hover:bg-error-container active:scale-95 transition-all"
              aria-label="Hapus ${escapeHtml(item.name)}"
            >
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between pb-1">
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full ${dayStatus.dotClass}"></div>
          <span class="font-label-lg text-label-lg text-on-surface font-semibold">${formatIndonesianDate(dateStr, true)}</span>
        </div>
        <span class="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full ${dayStatus.badgeClass}">${dayStatus.status}</span>
      </div>
      <div class="flex flex-col gap-2 pt-1">
        ${itemsHtml}
      </div>
      <div class="flex justify-end items-baseline gap-1.5 pt-2 border-t border-surface-container/60">
        <span class="font-label-md text-label-md text-on-surface-variant">Total:</span>
        <span class="font-headline-sm text-headline-sm text-primary font-bold tracking-tight">${formatCurrency(dayTotal)}</span>
      </div>
    `;

    ledgerContainer.appendChild(card);
  });

  // Footer whimsical note
  const footerNote = document.createElement('div');
  footerNote.className = 'py-space-md flex flex-col items-center justify-center text-center gap-1 opacity-70';
  footerNote.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
      <span class="material-symbols-outlined text-[18px]">verified</span>
    </div>
    <p class="font-label-sm text-label-sm text-on-surface-variant">Semua bon tersimpan aman &amp; jujur!</p>
  `;
  ledgerContainer.appendChild(footerNote);
}

// ==================== RENDERING: RINGKASAN ====================
export async function renderRingkasanView() {
  const allEntries = await storage.getAll();

  // 1. Update Month Selector Label
  const monthLabelEl = document.getElementById('current-month-label');
  if (monthLabelEl) {
    monthLabelEl.textContent = formatMonthYear(state.ringkasanYear, state.ringkasanMonth);
  }

  // 2. Hitung Total Minggu Ini (Senin s/d Minggu sesuai kalender perangkat hari ini)
  const currentWeek = getCurrentWeekRange(new Date());
  const thisWeekEntries = allEntries.filter(item => isDateInWeek(item.date, currentWeek));
  const weekTotal = thisWeekEntries.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const weekTotalEl = document.getElementById('summary-week-total');
  if (weekTotalEl) {
    animateCountUp(weekTotalEl, weekTotal, formatCurrency);
  }

  // 3. Hitung Total Bulan Terpilih (selectedMonth & selectedYear)
  const monthEntries = allEntries.filter(item => isDateInMonth(item.date, state.ringkasanYear, state.ringkasanMonth));
  const monthTotal = monthEntries.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const monthTotalEl = document.getElementById('summary-month-total');
  if (monthTotalEl) {
    animateCountUp(monthTotalEl, monthTotal, formatCurrency);
  }

  // 4. Update Hero Gauge & Advice
  const gaugeStatus = getMonthlyStatus(monthTotal);

  const gaugeBadgeEl = document.getElementById('summary-gauge-badge');
  if (gaugeBadgeEl) {
    gaugeBadgeEl.textContent = gaugeStatus.status;
  }

  const gaugeNeedleEl = document.getElementById('summary-gauge-needle');
  if (gaugeNeedleEl) {
    gaugeNeedleEl.style.left = `${gaugeStatus.needleLeft}%`;
  }

  const adviceEl = document.getElementById('summary-advice-text');
  if (adviceEl) {
    adviceEl.textContent = gaugeStatus.advice;
  }

  const monthLevelBadgeEl = document.getElementById('summary-month-level-badge');
  if (monthLevelBadgeEl) {
    monthLevelBadgeEl.innerHTML = `
      <span class="material-symbols-outlined text-[14px]">local_fire_department</span>
      <span class="font-label-sm text-label-sm font-bold">Level boncos: ${gaugeStatus.status}</span>
    `;
  }

  // 5. Hitung Rincian Per Kategori Bulan Terpilih
  const categoryTotals = {
    makan: 0,
    minum: 0,
    transport: 0,
    lainnya: 0
  };

  monthEntries.forEach(item => {
    const cat = item.category || 'lainnya';
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += Number(item.price) || 0;
    } else {
      categoryTotals.lainnya += Number(item.price) || 0;
    }
  });

  // Update Tampilan Masing-Masing Kategori
  ['makan', 'minum', 'transport', 'lainnya'].forEach(catKey => {
    const total = categoryTotals[catKey];
    const percentage = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;

    const amountEl = document.getElementById(`cat-total-${catKey}`);
    const pctEl = document.getElementById(`cat-pct-${catKey}`);
    const barEl = document.getElementById(`cat-bar-${catKey}`);

    if (amountEl) amountEl.textContent = formatCurrency(total);
    if (pctEl) pctEl.textContent = `${percentage}% dari total`;
    if (barEl) barEl.style.width = `${percentage}%`;
  });
}

/**
 * Refresh seluruh tampilan layar yang relevan
 * @param {boolean} [isInitial=false] - Apakah pemanggilan saat cold startup aplikasi
 */
export async function refreshAllViews(isInitial = false) {
  await renderHariIniView(isInitial);
  if (state.activeTab === 'riwayat') await renderRiwayatView();
  if (state.activeTab === 'ringkasan') await renderRingkasanView();
  if (typeof window.checkAndRenderBackupReminder === 'function') {
    await window.checkAndRenderBackupReminder();
  }
}

// ==================== AKSI: TAMBAH CATATAN ====================
export async function handleSave() {
  const nameInput = document.getElementById('item-name');
  const priceInput = document.getElementById('item-price');

  if (!nameInput || !priceInput) return;

  const name = nameInput.value.trim();
  const priceVal = parseInt(priceInput.value, 10);

  // Validasi: nama tidak kosong, harga lebih besar dari 0
  if (!name) {
    showToast('Nama barang tidak boleh kosong!', 'error');
    nameInput.focus();
    return;
  }

  if (isNaN(priceVal) || priceVal <= 0) {
    showToast('Nominal harga harus lebih dari Rp 0!', 'error');
    priceInput.focus();
    return;
  }

  try {
    const newEntry = await storage.add({
      name,
      price: priceVal,
      category: state.selectedQuickCategory,
      date: getTodayString(),
      createdAt: Date.now()
    });

    // Reset input
    nameInput.value = '';
    priceInput.value = '';

    await refreshAllViews();
    showToast(`"${newEntry.name}" berhasil dicatat!`, 'check_circle');
  } catch (error) {
    console.error('Gagal menyimpan pengeluaran:', error);
    showToast(error.message || 'Gagal menyimpan', 'error');
  }
}

/**
 * Isi form Tambah Cepat dari saran
 */
export function fillSuggestion(name, price, cat) {
  const nameInput = document.getElementById('item-name');
  const priceInput = document.getElementById('item-price');

  if (nameInput) nameInput.value = name;
  if (priceInput && price !== undefined) priceInput.value = price;

  if (cat) {
    selectQuickCategory(cat);
  }

  if (nameInput) nameInput.focus();
}

/**
 * Pilih kategori di bagian Tambah Cepat
 */
export function selectQuickCategory(catKey) {
  state.selectedQuickCategory = catKey;
  const chips = document.querySelectorAll('.cat-chip');
  chips.forEach(chip => {
    const c = chip.getAttribute('data-cat');
    if (c === catKey) {
      chip.className = 'cat-chip flex items-center justify-center gap-1.5 h-11 px-3 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm active:scale-95 transition-all';
    } else {
      chip.className = 'cat-chip flex items-center justify-center gap-1.5 h-11 px-3 rounded-full bg-surface-container text-on-surface font-label-md text-label-md active:scale-95 transition-all';
    }
  });
}

// ==================== AKSI: EDIT BOTTOM SHEET ====================
export async function openEditModal(itemId) {
  const entry = await storage.getById(itemId);
  if (!entry) {
    showToast('Catatan tidak ditemukan', 'error');
    return;
  }

  state.editingItemId = entry.id;
  state.selectedEditCategory = entry.category || 'makan';

  const bottomSheet = document.getElementById('bottomSheet');
  const backdrop = document.getElementById('modalBackdrop');
  const itemNameInput = document.getElementById('itemName');
  const itemAmountInput = document.getElementById('itemAmount');
  const editItemIdInput = document.getElementById('editItemId');

  if (itemNameInput) itemNameInput.value = entry.name;
  if (itemAmountInput) itemAmountInput.value = entry.price;
  if (editItemIdInput) editItemIdInput.value = entry.id;

  // Set category chip aktif di modal edit
  updateEditCategoryChips(state.selectedEditCategory);

  if (backdrop && bottomSheet) {
    animateBottomSheetOpen(backdrop, bottomSheet);
  }
}

export function hideEditModal() {
  const bottomSheet = document.getElementById('bottomSheet');
  const backdrop = document.getElementById('modalBackdrop');

  if (backdrop && bottomSheet) {
    animateBottomSheetClose(backdrop, bottomSheet, () => {
      state.editingItemId = null;
    });
  } else {
    state.editingItemId = null;
  }
}

export function selectEditCategory(catKey) {
  state.selectedEditCategory = catKey;
  updateEditCategoryChips(catKey);
}

function updateEditCategoryChips(selectedCat) {
  const chips = document.querySelectorAll('.edit-category-chip');
  chips.forEach(chip => {
    if (chip.getAttribute('data-cat') === selectedCat) {
      chip.className = 'edit-category-chip h-10 px-space-md rounded-full font-label-lg text-label-lg flex items-center gap-1.5 transition-all bg-primary-container text-on-primary shadow-sm active:scale-95 flex-shrink-0';
    } else {
      chip.className = 'edit-category-chip h-10 px-space-md rounded-full font-label-lg text-label-lg flex items-center gap-1.5 transition-all bg-surface-container text-on-surface-variant hover:bg-surface-container-high active:scale-95 flex-shrink-0';
    }
  });
}

export async function saveEditedItem() {
  if (!state.editingItemId) return;

  const itemNameInput = document.getElementById('itemName');
  const itemAmountInput = document.getElementById('itemAmount');

  const newName = itemNameInput.value.trim();
  const newPrice = parseInt(itemAmountInput.value, 10);

  // Validasi
  if (!newName) {
    showToast('Nama barang tidak boleh kosong!', 'error');
    itemNameInput.focus();
    return;
  }

  if (isNaN(newPrice) || newPrice <= 0) {
    showToast('Nominal harga harus lebih dari Rp 0!', 'error');
    itemAmountInput.focus();
    return;
  }

  try {
    await storage.update(state.editingItemId, {
      name: newName,
      price: newPrice,
      category: state.selectedEditCategory
    });

    hideEditModal();
    await refreshAllViews();
    showToast('Perubahan berhasil disimpan!', 'check_circle');
  } catch (err) {
    console.error('Gagal memperbarui catatan:', err);
    showToast(err.message || 'Gagal menyimpan perubahan', 'error');
  }
}

export async function deleteFromEditModal() {
  if (!state.editingItemId) return;
  const idToDelete = state.editingItemId;
  hideEditModal();
  await handleDeleteItem(idToDelete);
}

// ==================== AKSI: HAPUS DENGAN UNDO ====================
export async function handleDeleteItem(itemId) {
  const entry = await storage.getById(itemId);
  if (!entry) return;

  // Simpan data untuk kemampuan Urungkan (Undo)
  state.lastDeletedItem = { ...entry };

  try {
    await storage.delete(itemId);
    await refreshAllViews();
    // Tampilkan notifikasi dengan tombol Urungkan aktif selama 4.5 detik
    showToast(`Catatan "${entry.name}" dihapus`, 'delete', true, 4500);
  } catch (err) {
    console.error('Gagal menghapus item:', err);
    showToast('Gagal menghapus catatan', 'error');
  }
}

// ==================== AKSI: HAPUS SEMUA DATA ====================
export function openDeleteConfirmModal() {
  const modal = document.getElementById('modal-delete');
  if (modal) animateModalOpen(modal, modal.children[0]);
}

export function closeDeleteConfirmModal() {
  const modal = document.getElementById('modal-delete');
  if (modal) animateModalClose(modal, modal.children[0]);
}

export async function confirmResetAll() {
  closeDeleteConfirmModal();
  try {
    await storage.clear();
    state.lastDeletedItem = null;
    await refreshAllViews();
    showToast('🧹 Semua data berhasil dihapus bersih!', 'delete_sweep');
  } catch (err) {
    console.error('Gagal menghapus semua data:', err);
    showToast('Gagal mengosongkan data', 'error');
  }
}

// ==================== AKSI: PENCARIAN & FILTER RIWAYAT ====================
export function handleHistorySearch(query) {
  state.historySearchQuery = query;
  renderRiwayatView();
}

export function handleHistoryCategoryFilter(catKey, clickedBtn) {
  state.historyCategoryFilter = catKey;
  
  const chips = document.querySelectorAll('.history-chip');
  chips.forEach(c => {
    c.className = 'history-chip px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-on-surface text-label-sm font-label-sm shadow-[0_2px_6px_rgba(0,0,0,0.02)] active:scale-95 transition-all';
  });

  if (clickedBtn) {
    clickedBtn.className = 'history-chip px-3.5 py-1.5 rounded-full bg-on-surface text-surface text-label-sm font-label-sm shadow-sm flex items-center gap-1 active:scale-95 transition-all';
  }

  renderRiwayatView();
}

// ==================== AKSI: NAVIGASI BULAN RINGKASAN ====================
export function changeSummaryMonth(delta) {
  let newMonth = state.ringkasanMonth + delta;
  let newYear = state.ringkasanYear;

  if (newMonth < 0) {
    newMonth = 11;
    newYear -= 1;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear += 1;
  }

  state.ringkasanMonth = newMonth;
  state.ringkasanYear = newYear;

  renderRingkasanView();
  showToast(`Bulan ${formatMonthYear(newYear, newMonth)}`, 'calendar_month', false, 1500);
}

// ==================== HELPER: ESCAPE HTML ====================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================== INISIALISASI EVENT LISTENERS ====================
function initEventListeners() {
  // Navigasi Tab Bawah & Header
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.id.replace('nav-btn-', '');
      navigateToTab(tabId);
    });
  });

  const btnSettings = document.getElementById('header-btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => navigateToTab('pengaturan'));
  }

  const btnBackSettings = document.getElementById('btn-back-settings');
  if (btnBackSettings) {
    btnBackSettings.addEventListener('click', () => navigateToTab(state.lastActiveTab));
  }

  // Quick Add: Tombol Simpan
  const btnSimpan = document.getElementById('btn-simpan');
  if (btnSimpan) {
    btnSimpan.addEventListener('click', handleSave);
  }

  // Quick Add: Keyboard Enter pada input
  const itemNameInput = document.getElementById('item-name');
  const itemPriceInput = document.getElementById('item-price');
  if (itemNameInput && itemPriceInput) {
    itemNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') itemPriceInput.focus();
    });
    itemPriceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSave();
    });
  }

  // Quick Add: Kategori Chips
  const catChips = document.querySelectorAll('.cat-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-cat') || 'makan';
      selectQuickCategory(cat);
    });
  });

  // Delegasi Event Klik untuk Edit & Hapus Item (Hari Ini & Riwayat)
  document.addEventListener('click', (e) => {
    // Tombol Edit
    const editBtn = e.target.closest('.btn-edit-item');
    if (editBtn) {
      const id = editBtn.getAttribute('data-edit-id');
      if (id) openEditModal(id);
      return;
    }

    // Tombol Hapus
    const deleteBtn = e.target.closest('.btn-delete-item');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete-id');
      if (id) handleDeleteItem(id);
      return;
    }
  });

  // Modal Edit Catatan
  const saveEditedBtn = document.getElementById('saveBtn');
  if (saveEditedBtn) {
    saveEditedBtn.addEventListener('click', saveEditedItem);
  }

  const deleteEditedBtn = document.getElementById('deleteBtn');
  if (deleteEditedBtn) {
    deleteEditedBtn.addEventListener('click', deleteFromEditModal);
  }

  const editCatChips = document.querySelectorAll('.edit-category-chip');
  editCatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-cat') || 'makan';
      selectEditCategory(cat);
    });
  });

  // Riwayat: Search Input
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleHistorySearch(e.target.value);
    });
  }

  const clearSearchBtn = document.getElementById('clear-search-btn');
  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      handleHistorySearch('');
      searchInput.focus();
    });
  }

  // Riwayat: Filter Category Chips
  const historyChips = document.querySelectorAll('.history-chip');
  historyChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-cat') || 'all';
      handleHistoryCategoryFilter(cat, chip);
    });
  });

  // Ringkasan: Month Selector Prev & Next
  const prevMonthBtn = document.getElementById('prev-month-btn');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => changeSummaryMonth(-1));
  }

  const nextMonthBtn = document.getElementById('next-month-btn');
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => changeSummaryMonth(1));
  }

  // Toast Urungkan button
  const toastUndoBtn = document.getElementById('toast-undo-btn');
  if (toastUndoBtn) {
    toastUndoBtn.addEventListener('click', undoLastAction);
  }

  // Modal Reset Semua Data
  const btnDeleteAll = document.getElementById('btn-delete-all');
  if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', openDeleteConfirmModal);
  }

  const btnConfirmReset = document.getElementById('btn-confirm-reset');
  if (btnConfirmReset) {
    btnConfirmReset.addEventListener('click', confirmResetAll);
  }

  const btnCancelReset = document.getElementById('btn-cancel-reset');
  if (btnCancelReset) {
    btnCancelReset.addEventListener('click', closeDeleteConfirmModal);
  }

  // Preferences: Roast Toggle
  const toggleRoast = document.getElementById('toggle-roast');
  const togglePin = document.getElementById('toggle-pin');
  let roastActive = true;

  if (toggleRoast && togglePin) {
    toggleRoast.addEventListener('click', () => {
      roastActive = !roastActive;
      if (roastActive) {
        toggleRoast.classList.remove('bg-surface-variant');
        toggleRoast.classList.add('bg-primary');
        togglePin.classList.remove('translate-x-0.5');
        togglePin.classList.add('translate-x-5');
        showToast('Mode roasting aktif! Siap-siap kena mental.', 'sentiment_very_satisfied');
      } else {
        toggleRoast.classList.remove('bg-primary');
        toggleRoast.classList.add('bg-surface-variant');
        togglePin.classList.remove('translate-x-5');
        togglePin.classList.add('translate-x-0.5');
        showToast('Mode santai aktif. Dompetmu terselamatkan dari ledekan.', 'sentiment_satisfied');
      }
    });
  }

  // Expose global methods for any inline onclick handlers in HTML
  window.navigateToTab = navigateToTab;
  window.openEditModal = openEditModal;
  window.hideEditModal = hideEditModal;
  window.selectEditCategory = selectEditCategory;
  window.saveEditedItem = saveEditedItem;
  window.deleteFromEditModal = deleteFromEditModal;
  window.openDeleteConfirmModal = openDeleteConfirmModal;
  window.closeDeleteConfirmModal = closeDeleteConfirmModal;
  window.confirmResetAll = confirmResetAll;
  window.hideToast = hideToast;
  window.undoLastAction = undoLastAction;
  window.fillSuggestion = fillSuggestion;

  // ==================== STAGE 2: PDF EXPORT HANDLERS ====================
  window.openPdfModal = function() {
    const backdrop = document.getElementById('pdf-bottom-sheet-backdrop');
    const card = document.getElementById('pdf-bottom-sheet-card');
    if (!backdrop || !card) return;

    // Hitung tanggal dinamis untuk label deskripsi
    const weekRange = getCurrentWeekRange(new Date());
    const weekDescEl = document.getElementById('pdf-week-desc');
    if (weekDescEl) {
      weekDescEl.textContent = `${formatIndonesianDate(weekRange.start, false)} - ${formatIndonesianDate(weekRange.end, false)}`;
    }
    const monthDescEl = document.getElementById('pdf-month-desc');
    if (monthDescEl) {
      monthDescEl.textContent = `${formatMonthYear(new Date().getFullYear(), new Date().getMonth())} (Lengkap)`;
    }

    // Default input tanggal kustom
    const startDateInput = document.getElementById('pdf-start-date');
    const endDateInput = document.getElementById('pdf-end-date');
    if (startDateInput && !startDateInput.value) startDateInput.value = weekRange.start;
    if (endDateInput && !endDateInput.value) endDateInput.value = getTodayString();

    animateBottomSheetOpen(backdrop, card);
  };

  window.closePdfModal = function() {
    const backdrop = document.getElementById('pdf-bottom-sheet-backdrop');
    const card = document.getElementById('pdf-bottom-sheet-card');
    if (!backdrop || !card) return;
    animateBottomSheetClose(backdrop, card);
  };

  window.selectPdfPeriod = function(labelElement, periodType = 'week') {
    state.selectedPdfPeriod = periodType;
    const labels = document.querySelectorAll('.pdf-radio-label');
    labels.forEach(l => {
      l.classList.remove('bg-primary-fixed/30');
      l.classList.add('bg-surface-container-low');
      const circle = l.querySelector('.w-5.h-5');
      if (circle) {
        circle.classList.remove('bg-primary', 'text-on-primary');
        circle.classList.add('bg-surface-container-highest', 'text-transparent');
      }
      const icon = l.querySelector('.material-symbols-outlined:last-child');
      if (icon) {
        icon.classList.remove('text-primary');
        icon.classList.add('text-on-surface-variant');
      }
    });

    if (labelElement) {
      labelElement.classList.remove('bg-surface-container-low');
      labelElement.classList.add('bg-primary-fixed/30');
      const circle = labelElement.querySelector('.w-5.h-5');
      if (circle) {
        circle.classList.remove('bg-surface-container-highest', 'text-transparent');
        circle.classList.add('bg-primary', 'text-on-primary');
      }
      const icon = labelElement.querySelector('.material-symbols-outlined:last-child');
      if (icon) {
        icon.classList.remove('text-on-surface-variant');
        icon.classList.add('text-primary');
      }
    }

    const customContainer = document.getElementById('pdf-custom-date-container');
    if (customContainer) {
      if (periodType === 'custom') {
        customContainer.classList.remove('hidden');
        customContainer.classList.add('flex');
      } else {
        customContainer.classList.remove('flex');
        customContainer.classList.add('hidden');
      }
    }
  };

  window.handlePdfDownload = async function() {
    const allEntries = await storage.getAll();
    const startDate = document.getElementById('pdf-start-date')?.value;
    const endDate = document.getElementById('pdf-end-date')?.value;

    try {
      const { doc, filename, count } = await generateExpensePdf(allEntries, {
        periodType: state.selectedPdfPeriod,
        startDate,
        endDate
      });

      await savePdfFile(doc, filename);
      window.closePdfModal();
      showToast(`Laporan PDF berhasil diunduh (${count} transaksi)!`, 'picture_as_pdf');
    } catch (error) {
      console.warn('Gagal menghasilkan PDF:', error);
      showToast(error.message || 'Gagal membuat file PDF', 'error');
    }
  };

  // ==================== STAGE 2: BACKUP & RESTORE JSON ====================
  window.exportDataJson = async function() {
    const allEntries = await storage.getAll();
    try {
      const result = await exportDataToJson(allEntries);
      showToast(`Cadangan tersimpan (${result.count} data)!`, 'download');
      if (typeof window.checkAndRenderBackupReminder === 'function') {
        await window.checkAndRenderBackupReminder();
      }
    } catch (error) {
      console.error('Gagal ekspor cadangan:', error);
      showToast('Gagal mengekspor data!', 'error');
    }
  };

  window.triggerImportJson = async function() {
    try {
      const picked = await pickBackupFile();
      if (!picked) return; // Pengguna membatalkan pemilihan berkas

      const validated = validateBackupJson(picked.content);
      if (!validated.isValid) {
        showToast(validated.error || 'Format berkas cadangan tidak valid!', 'error');
        return;
      }

      state.pendingImportEntries = validated.entries;
      const countEl = document.getElementById('import-entry-count');
      if (countEl) countEl.textContent = String(validated.entries.length);

      const modal = document.getElementById('modal-import-confirm');
      if (modal) animateModalOpen(modal, modal.children[0]);
    } catch (error) {
      console.error('Gagal membaca berkas impor:', error);
      showToast('Gagal memproses file cadangan!', 'error');
    }
  };

  window.closeImportConfirmModal = function() {
    const modal = document.getElementById('modal-import-confirm');
    if (modal) animateModalClose(modal, modal.children[0]);
    state.pendingImportEntries = [];
  };

  window.executeImport = async function(mode = 'merge') {
    if (!state.pendingImportEntries || state.pendingImportEntries.length === 0) {
      window.closeImportConfirmModal();
      return;
    }

    const newEntries = state.pendingImportEntries;
    window.closeImportConfirmModal();

    try {
      if (mode === 'replace') {
        await storage.replaceAll(newEntries);
        showToast(`Seluruh data diganti (${newEntries.length} catatan)!`, 'sync');
      } else {
        // Mode merge: gabungkan dan hindari duplikasi ID
        const existing = await storage.getAll();
        const existingIds = new Set(existing.map(e => e.id));
        const toAdd = [];
        newEntries.forEach(item => {
          let entryId = item.id;
          if (existingIds.has(entryId)) {
            entryId = 'merged_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          }
          toAdd.push({
            ...item,
            id: entryId
          });
        });
        const merged = [...existing, ...toAdd];
        await storage.replaceAll(merged);
        showToast(`Berhasil menggabungkan ${toAdd.length} catatan baru!`, 'merge');
      }

      await refreshAllViews();
      if (typeof window.checkAndRenderBackupReminder === 'function') {
        await window.checkAndRenderBackupReminder();
      }
    } catch (error) {
      console.error('Gagal memulihkan cadangan:', error);
      showToast('Gagal memulihkan data cadangan!', 'error');
    }
  };

  // ==================== STAGE 2: BACKUP REMINDER ====================
  window.checkAndRenderBackupReminder = async function() {
    const allEntries = await storage.getAll();
    const reminderCard = document.getElementById('backup-reminder-card');
    const reminderDesc = document.getElementById('backup-reminder-desc');
    const shouldShow = shouldShowBackupReminder(allEntries.length);

    if (reminderCard) {
      if (shouldShow) {
        reminderCard.classList.remove('hidden');
        const lastExportTime = getLastExportTime();
        if (lastExportTime && reminderDesc) {
          const lastDate = new Date(lastExportTime);
          reminderDesc.textContent = `Ekspor terakhir: ${lastDate.toLocaleDateString('id-ID')}. Sudah lebih dari 7 hari, amankan catatanmu!`;
        } else if (reminderDesc) {
          reminderDesc.textContent = 'Belum pernah mencadangkan data. Amankan catatanmu ke file JSON sekarang!';
        }
      } else {
        reminderCard.classList.add('hidden');
      }
    }
  };

  window.dismissBackupReminderCard = function() {
    const reminderCard = document.getElementById('backup-reminder-card');
    if (reminderCard) reminderCard.classList.add('hidden');
    dismissReminderForSession();
  };

  // ==================== STAGE 2: THEME HANDLERS ====================
  window.selectTheme = function(choice, event = null) {
    applyTheme(choice, true, event);
    showToast(`Tema diubah: ${choice === 'dark' ? 'Gelap' : choice === 'light' ? 'Terang' : 'Ikuti Sistem'}`, 'palette');
  };

  window.toggleQuickTheme = function(event = null) {
    toggleQuickTheme(event);
  };

  // ==================== PROFILE HANDLERS ====================
  window.saveProfileName = function() {
    const inputEl = document.getElementById('input-profile-name');
    if (inputEl) {
      const newName = setProfileName(inputEl.value);
      showToast(`Nama sapaan disimpan: ${newName}`, 'badge');
    }
  };

  window.handleProfilePhotoUpload = async function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const base64 = await compressAndCropImage(file, 256);
      setProfileAvatar(base64);
      showToast('Foto profil berhasil diperbarui!', 'check_circle');
    } catch (err) {
      console.error('Gagal memproses foto profil:', err);
      showToast('Gagal memproses foto profil.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  window.removeProfilePhoto = function() {
    removeProfileAvatar();
    showToast('Foto profil dihapus, kembali ke avatar bawaan.', 'delete');
  };
}

// Inisialisasi Aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
  // Pastikan bottom sheet edit dan modal tertutup rapat di awal load/refresh
  const bottomSheet = document.getElementById('bottomSheet');
  if (bottomSheet) {
    bottomSheet.classList.add('pointer-events-none');
    bottomSheet.style.transform = 'translate(-50%, 100%)';
  }
  const pdfCard = document.getElementById('pdf-bottom-sheet-card');
  if (pdfCard) {
    pdfCard.classList.add('pointer-events-none');
    pdfCard.style.transform = 'translate(-50%, 100%)';
  }

  // Inisialisasi profil pengguna (nama sapaan dan avatar)
  updateProfileUI();

  // Inisialisasi tema segera (mencegah flash)
  initTheme();
  initEventListeners();
  initCapacitorApp();
  await refreshAllViews(true);

  // Fade-in lembut layar utama setelah data ter-render sempurna
  requestAnimationFrame(() => {
    const viewport = document.getElementById('mobile-viewport');
    if (viewport) {
      viewport.classList.remove('opacity-0');
      viewport.classList.add('opacity-100');
    }
  });

  // Pengingat cadangan toast saat buka aplikasi (Rule #8: > 7 hari dan ada data)
  const allEntries = await storage.getAll();
  if (shouldShowBackupReminder(allEntries.length) && !isReminderDismissedThisSession()) {
    showToast('Waktunya cadangkan data! Ekspor JSON sekarang di Pengaturan.', 'notifications_active', false, 5500);
    dismissReminderForSession();
  }
});

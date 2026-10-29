/**
 * theme.js - Pengelola Tema (Terang, Gelap, Ikuti Sistem) Broke-o-meter
 * Menangani peralihan tema dengan GPU-accelerated Crossfade View Transitions yang mulus (280ms) tanpa frame drop,
 * sinkronisasi status bar native Android, dan penyimpanan preferensi di localStorage.
 */

import { syncStatusBarTheme } from './capacitorApp.js';

export const THEME_STORAGE_KEY = 'broke_o_meter_theme';

let currentThemeChoice = 'system'; // 'light' | 'dark' | 'system'
let mediaQueryList = null;
let isThemeTransitionInProgress = false;

/**
 * Mendapatkan preferensi tema tersimpan atau fallback ke 'system'.
 * @returns {'light'|'dark'|'system'}
 */
export function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    // Abaikan error storage
  }
  return 'system';
}

/**
 * Menentukan apakah tema efektif saat ini adalah gelap (dark).
 * @param {'light'|'dark'|'system'} choice
 * @returns {boolean}
 */
export function isDarkEffective(choice = currentThemeChoice) {
  if (choice === 'dark') return true;
  if (choice === 'light') return false;
  // 'system'
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/**
 * Menerapkan tema ke elemen <html> dengan transisi GPU Crossfade yang ringan & mulus (280ms).
 * Menghindari bottleneck GPU/CPU dari clip-path berat di perangkat mobile.
 * @param {'light'|'dark'|'system'} choice
 * @param {boolean} animate - Apakah menerapkan animasi transisi (false saat startup/refresh)
 * @param {Event|MouseEvent|null} event - Event klik pengguna
 */
export async function applyTheme(choice, animate = false, event = null) {
  currentThemeChoice = choice;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch (e) {
    console.warn('Gagal menyimpan preferensi tema:', e);
  }

  const isDark = isDarkEffective(choice);
  const root = document.documentElement;
  const isAlreadyCurrentMode = root.classList.contains('dark') === isDark;

  const updateDOM = () => {
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update ikon quick toggle di header Hari Ini
    const quickToggleIcon = document.getElementById('theme-toggle-icon');
    const quickToggleBtn = document.getElementById('header-btn-theme-toggle');
    if (quickToggleIcon) {
      quickToggleIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
    if (quickToggleBtn) {
      quickToggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'
      );
    }

    // Update pilihan radio / indikator di menu Pengaturan
    updateThemeOptionsUI(choice);

    // Sinkronkan status bar native Android
    syncStatusBarTheme(isDark);
  };

  // Jika tema efektif sama persis, perbarui tombol pengaturan dan keluar
  if (isAlreadyCurrentMode) {
    updateDOM();
    return;
  }

  // Jika reduced motion aktif, atau tidak meminta animasi (startup/refresh)
  const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || isReducedMotion) {
    updateDOM();
    return;
  }

  // Cegah transisi ganda tumpang tindih
  if (isThemeTransitionInProgress) {
    updateDOM();
    return;
  }
  isThemeTransitionInProgress = true;

  // 1. Prioritas Utama: View Transition API (Chrome, Edge, Android WebView) dengan GPU Compositor Fade
  if (document.startViewTransition) {
    try {
      // Nonaktifkan transisi elemen anak agar rendering 60/120fps terkunci mulus
      root.classList.add('theme-transitioning');

      const transition = document.startViewTransition(() => {
        updateDOM();
      });

      // Animasikan putaran ikon toggle cepat (280ms)
      const quickToggleIcon = document.getElementById('theme-toggle-icon');
      if (quickToggleIcon && window.Motion && typeof window.Motion.animate === 'function') {
        window.Motion.animate(
          quickToggleIcon,
          { transform: ['rotate(-90deg)', 'rotate(0deg)'], opacity: [0.6, 1] },
          { duration: 0.28, easing: [0.2, 0, 0, 1] }
        );
      }

      await transition.finished;
    } catch (err) {
      console.warn('View Transition error, eksekusi langsung:', err);
      updateDOM();
    } finally {
      root.classList.remove('theme-transitioning');
      isThemeTransitionInProgress = false;
    }
    return;
  }

  // 2. Fallback untuk browser tanpa View Transition: perubahan langsung tanpa lag
  try {
    root.classList.add('theme-transitioning');
    updateDOM();
  } finally {
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
      isThemeTransitionInProgress = false;
    }, 280);
  }
}

/**
 * Memperbarui tampilan tombol pilihan tema pada halaman Pengaturan.
 * @param {'light'|'dark'|'system'} choice
 */
export function updateThemeOptionsUI(choice) {
  const options = ['light', 'dark', 'system'];
  options.forEach((opt) => {
    const btn = document.getElementById(`theme-opt-${opt}`);
    const checkIcon = document.getElementById(`theme-check-${opt}`);
    if (btn) {
      if (opt === choice) {
        btn.classList.add('border-primary', 'bg-primary/5', 'text-primary');
        btn.classList.remove('border-outline-variant/40', 'bg-surface-container-lowest', 'text-on-surface');
      } else {
        btn.classList.remove('border-primary', 'bg-primary/5', 'text-primary');
        btn.classList.add('border-outline-variant/40', 'bg-surface-container-lowest', 'text-on-surface');
      }
    }
    if (checkIcon) {
      if (opt === choice) {
        checkIcon.classList.remove('hidden');
      } else {
        checkIcon.classList.add('hidden');
      }
    }
  });
}

/**
 * Toggle cepat mode gelap/terang dari tombol header.
 * @param {Event|MouseEvent|null} event
 */
export function toggleQuickTheme(event = null) {
  const isCurrentlyDark = isDarkEffective(currentThemeChoice);
  const newTheme = isCurrentlyDark ? 'light' : 'dark';
  applyTheme(newTheme, true, event);
}

/**
 * Inisialisasi tema saat aplikasi pertama kali dimuat.
 */
export function initTheme() {
  const saved = getStoredTheme();
  currentThemeChoice = saved;

  // Dengarkan perubahan prefers-color-scheme jika pengguna memilih 'system'
  if (window.matchMedia) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryList.addEventListener('change', () => {
      if (currentThemeChoice === 'system') {
        applyTheme('system', true);
      }
    });
  }

  // Muat tema awal tanpa animasi (mencegah flash saat buka aplikasi / refresh)
  applyTheme(saved, false);
}

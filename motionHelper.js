/**
 * motionHelper.js - Modul Animasi & Transisi Menggunakan Vanilla Motion (motion.dev)
 * Dibundel secara lokal tanpa ketergantungan CDN.
 * Mengelola transisi tab, spring slide up/down pada bottom sheet, snackbar/toast, dan animasi count-up angka.
 * Mendukung prefers-reduced-motion untuk mematikan animasi bagi pengguna yang sensitif gerak.
 */

/**
 * Mengecek apakah pengguna mengaktifkan preferensi reduced motion pada perangkat.
 * @returns {boolean}
 */
export function isReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Helper untuk mengambil instance Motion dari global window.Motion
 * @returns {object|null}
 */
function getMotion() {
  return (typeof window !== 'undefined' && window.Motion) ? window.Motion : null;
}

/**
 * Transisi saat tab baru ditampilkan (Tab Enter Transition).
 * Menggunakan animasi transform dan opacity halus.
 * @param {HTMLElement} tabElement - Kontainer tab yang baru aktif
 */
export function animateTabEnter(tabElement) {
  if (!tabElement) return;

  if (isReducedMotion()) {
    tabElement.style.opacity = '1';
    tabElement.style.transform = 'none';
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    Motion.animate(
      tabElement,
      {
        opacity: [0, 1],
        transform: ['translateY(10px)', 'translateY(0px)']
      },
      {
        duration: 0.22,
        easing: [0.22, 1, 0.36, 1]
      }
    );
  } else {
    // Fallback jika library belum siap
    tabElement.style.opacity = '1';
    tabElement.style.transform = 'none';
  }
}

/**
 * Animasi membuka bottom sheet (spring slide up + fade in backdrop).
 * @param {HTMLElement} backdropEl - Elemen backdrop semi-transparan
 * @param {HTMLElement} sheetCardEl - Elemen kartu sheet yang bergeser ke atas
 */
export function animateBottomSheetOpen(backdropEl, sheetCardEl) {
  if (!backdropEl || !sheetCardEl) return;

  backdropEl.classList.remove('pointer-events-none');
  sheetCardEl.classList.remove('pointer-events-none');

  if (isReducedMotion()) {
    backdropEl.style.opacity = '1';
    sheetCardEl.style.transform = 'translate(-50%, 0%)';
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    // Animasi backdrop
    Motion.animate(
      backdropEl,
      { opacity: [0, 1] },
      { duration: 0.2, easing: 'ease-out' }
    );

    // Animasi sheet dengan efek spring halus (tetap mempertahankan centering horisontal -50%)
    Motion.animate(
      sheetCardEl,
      { transform: ['translate(-50%, 100%)', 'translate(-50%, 0%)'] },
      {
        type: 'spring',
        bounce: 0.12,
        duration: 0.35
      }
    );
  } else {
    backdropEl.style.opacity = '1';
    sheetCardEl.style.transform = 'translate(-50%, 0%)';
  }
}

/**
 * Animasi menutup bottom sheet (slide down + fade out backdrop).
 * @param {HTMLElement} backdropEl - Elemen backdrop
 * @param {HTMLElement} sheetCardEl - Elemen kartu sheet
 * @param {Function} onComplete - Callback setelah animasi selesai
 */
export function animateBottomSheetClose(backdropEl, sheetCardEl, onComplete) {
  if (!backdropEl || !sheetCardEl) {
    if (onComplete) onComplete();
    return;
  }

  backdropEl.classList.add('pointer-events-none');

  if (isReducedMotion()) {
    backdropEl.style.opacity = '0';
    sheetCardEl.style.transform = 'translate(-50%, 100%)';
    sheetCardEl.classList.add('pointer-events-none');
    if (onComplete) onComplete();
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    const animBackdrop = Motion.animate(
      backdropEl,
      { opacity: [1, 0] },
      { duration: 0.2, easing: 'ease-in' }
    );

    const animSheet = Motion.animate(
      sheetCardEl,
      { transform: ['translate(-50%, 0%)', 'translate(-50%, 100%)'] },
      { duration: 0.24, easing: [0.32, 0, 0.67, 0] }
    );

    Promise.all([animBackdrop.finished, animSheet.finished])
      .then(() => {
        sheetCardEl.style.transform = 'translate(-50%, 100%)';
        sheetCardEl.classList.add('pointer-events-none');
        if (onComplete) onComplete();
      })
      .catch(() => {
        sheetCardEl.style.transform = 'translate(-50%, 100%)';
        sheetCardEl.classList.add('pointer-events-none');
        if (onComplete) onComplete();
      });
  } else {
    backdropEl.style.opacity = '0';
    sheetCardEl.style.transform = 'translate(-50%, 100%)';
    sheetCardEl.classList.add('pointer-events-none');
    if (onComplete) onComplete();
  }
}

/**
 * Animasi menampilkan toast / floating snackbar.
 * @param {HTMLElement} toastEl - Elemen snackbar
 */
export function animateToastShow(toastEl) {
  if (!toastEl) return;

  toastEl.classList.remove('pointer-events-none');

  if (isReducedMotion()) {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateX(-50%) translateY(0)';
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    Motion.animate(
      toastEl,
      {
        opacity: [0, 1],
        transform: ['translateX(-50%) translateY(24px)', 'translateX(-50%) translateY(0px)']
      },
      {
        type: 'spring',
        bounce: 0.15,
        duration: 0.32
      }
    );
  } else {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateX(-50%) translateY(0)';
  }
}

/**
 * Animasi menyembunyikan toast / floating snackbar.
 * @param {HTMLElement} toastEl - Elemen snackbar
 * @param {Function} onComplete - Callback setelah selesai
 */
export function animateToastHide(toastEl, onComplete) {
  if (!toastEl) {
    if (onComplete) onComplete();
    return;
  }

  toastEl.classList.add('pointer-events-none');

  if (isReducedMotion()) {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(24px)';
    if (onComplete) onComplete();
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    const anim = Motion.animate(
      toastEl,
      {
        opacity: [1, 0],
        transform: ['translateX(-50%) translateY(0px)', 'translateX(-50%) translateY(20px)']
      },
      {
        duration: 0.22,
        easing: 'ease-in'
      }
    );

    anim.finished
      .then(() => {
        if (onComplete) onComplete();
      })
      .catch(() => {
        if (onComplete) onComplete();
      });
  } else {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(24px)';
    if (onComplete) onComplete();
  }
}

/**
 * Animasi count-up angka total (misal: hero amount, budget counter).
 * Berjalan cepat dan mulus (~0.45s) tanpa menghambat interaksi pengguna.
 * @param {HTMLElement} targetEl - Elemen teks tempat angka ditampilkan
 * @param {number} targetValue - Nilai angka akhir
 * @param {Function} formatFn - Fungsi pemformat mata uang / angka (misal: formatCurrency)
 * @param {number} [duration=0.45] - Durasi animasi dalam detik
 */
export function animateCountUp(targetEl, targetValue, formatFn, duration = 0.45) {
  if (!targetEl) return;

  const endNum = Math.max(0, Number(targetValue) || 0);

  // Ambil nilai awal dari dataset atau 0
  const startNum = Number(targetEl.dataset.currentNum || 0);
  targetEl.dataset.currentNum = String(endNum);

  if (isReducedMotion() || startNum === endNum) {
    targetEl.textContent = formatFn ? formatFn(endNum) : String(endNum);
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    // Animasi transisi angka halus
    Motion.animate(startNum, endNum, {
      duration: duration,
      easing: [0.16, 1, 0.3, 1], // easeOutExpo
      onUpdate: (latest) => {
        const val = Math.round(latest);
        targetEl.textContent = formatFn ? formatFn(val) : String(val);
      }
    });
  } else {
    // Fallback standard animation frame
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const step = (now) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      // Easing easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startNum + (endNum - startNum) * ease);
      targetEl.textContent = formatFn ? formatFn(current) : String(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
}

/**
 * Animasi membuka modal dialog (dialog fade + scale in).
 * @param {HTMLElement} modalEl - Elemen wrapper modal
 * @param {HTMLElement} dialogCardEl - Elemen kartu kotak dialog di dalam modal
 */
export function animateModalOpen(modalEl, dialogCardEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');

  if (isReducedMotion() || !dialogCardEl) {
    modalEl.style.opacity = '1';
    if (dialogCardEl) dialogCardEl.style.transform = 'scale(1)';
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    Motion.animate(modalEl, { opacity: [0, 1] }, { duration: 0.18 });
    Motion.animate(
      dialogCardEl,
      {
        opacity: [0, 1],
        transform: ['scale(0.92)', 'scale(1)']
      },
      {
        type: 'spring',
        bounce: 0.18,
        duration: 0.3
      }
    );
  } else {
    modalEl.style.opacity = '1';
    dialogCardEl.style.transform = 'scale(1)';
  }
}

/**
 * Animasi menutup modal dialog (dialog scale out + fade out).
 * @param {HTMLElement} modalEl - Elemen wrapper modal
 * @param {HTMLElement} dialogCardEl - Elemen kartu kotak dialog
 * @param {Function} onComplete - Callback setelah animasi selesai
 */
export function animateModalClose(modalEl, dialogCardEl, onComplete) {
  if (!modalEl) {
    if (onComplete) onComplete();
    return;
  }

  if (isReducedMotion() || !dialogCardEl) {
    modalEl.classList.add('hidden');
    if (onComplete) onComplete();
    return;
  }

  const Motion = getMotion();
  if (Motion && typeof Motion.animate === 'function') {
    const animModal = Motion.animate(modalEl, { opacity: [1, 0] }, { duration: 0.16 });
    const animCard = Motion.animate(
      dialogCardEl,
      {
        opacity: [1, 0],
        transform: ['scale(1)', 'scale(0.94)']
      },
      { duration: 0.16, easing: 'ease-in' }
    );

    Promise.all([animModal.finished, animCard.finished])
      .then(() => {
        modalEl.classList.add('hidden');
        if (onComplete) onComplete();
      })
      .catch(() => {
        modalEl.classList.add('hidden');
        if (onComplete) onComplete();
      });
  } else {
    modalEl.classList.add('hidden');
    if (onComplete) onComplete();
  }
}

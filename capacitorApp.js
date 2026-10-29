/**
 * capacitorApp.js - Integrasi Native Android via Capacitor
 * Broke-o-meter: Fully Offline Personal Expense Tracker
 *
 * Mengelola:
 * 1. Deteksi platform native Android
 * 2. Hardware Back Button Android (tutup sheet/modal -> kembali ke tab -> keluar aplikasi)
 * 3. Kunci orientasi layar potret (Portrait lock)
 * 4. Safe area & status bar
 * 5. Penyimpanan & pembagian file native (Filesystem & Share plugins) untuk PDF dan Cadangan JSON
 */

/**
 * Memeriksa apakah aplikasi berjalan di dalam runtime native Capacitor (Android)
 * @returns {boolean}
 */
export function isNativePlatform() {
  return (
    typeof window !== 'undefined' &&
    typeof window.Capacitor !== 'undefined' &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

/**
 * Mengambil referensi plugin Capacitor yang terdaftar
 * @param {string} pluginName - Nama plugin (Filesystem, Share, App, ScreenOrientation, StatusBar)
 * @returns {object|null}
 */
export function getCapacitorPlugin(pluginName) {
  if (
    typeof window !== 'undefined' &&
    typeof window.Capacitor !== 'undefined' &&
    window.Capacitor.Plugins
  ) {
    return window.Capacitor.Plugins[pluginName] || null;
  }
  return null;
}

/**
 * Menyimpan file ke filesystem lokal Android lalu memicu dialog berbagi (Share) native
 * @param {object} options
 * @param {string} options.filename - Nama file
 * @param {string} options.data - Konten data (string teks atau base64)
 * @param {boolean} [options.isBase64=false] - Apakah data berformat base64
 * @param {string} [options.title='File Broke-o-meter'] - Judul share
 * @param {string} [options.text=''] - Pesan teks share
 * @param {string} [options.dialogTitle='Simpan atau Bagikan File'] - Judul dialog Android
 * @returns {Promise<{ success: boolean, uri?: string }>}
 */
export async function saveAndShareNativeFile({
  filename,
  data,
  isBase64 = false,
  title = 'File Broke-o-meter',
  text = '',
  dialogTitle = 'Simpan atau Bagikan File'
}) {
  const Filesystem = getCapacitorPlugin('Filesystem');
  const Share = getCapacitorPlugin('Share');

  if (!Filesystem) {
    throw new Error('Plugin Capacitor Filesystem tidak tersedia.');
  }

  // Tulis file ke direktori CACHE agar aman dan kompatibel dengan Android FileProvider
  const writeOptions = {
    path: filename,
    data: data,
    directory: 'CACHE'
  };

  if (!isBase64) {
    writeOptions.encoding = 'utf8';
  }

  const writeResult = await Filesystem.writeFile(writeOptions);
  const fileUri = writeResult.uri;

  // Jika plugin Share tersedia, buka dialog native share agar pengguna bisa langsung membuka atau menyimpan file
  if (Share) {
    try {
      await Share.share({
        title,
        text,
        url: fileUri,
        dialogTitle
      });
    } catch (shareErr) {
      // Jika pengguna membatalkan dialog share (dismiss), jangan anggap error fatal
      console.info('Share dialog ditutup atau dibatalkan:', shareErr);
    }
  }

  return {
    success: true,
    uri: fileUri
  };
}

/**
 * Inisialisasi perilaku native Capacitor:
 * - Kunci orientasi potret (Portrait lock)
 * - Hardware back button Android
 * - Penyesuaian tema status bar
 */
export function initCapacitorApp() {
  if (!isNativePlatform()) {
    return;
  }

  // 1. KUNCI ORIENTASI POTRET (PORTRAIT LOCK)
  const ScreenOrientation = getCapacitorPlugin('ScreenOrientation');
  if (ScreenOrientation && typeof ScreenOrientation.lock === 'function') {
    ScreenOrientation.lock({ orientation: 'portrait' }).catch(err => {
      console.warn('Gagal mengunci orientasi potret via ScreenOrientation plugin:', err);
    });
  }

  // 2. HARDWARE BACK BUTTON ANDROID
  // Aturan:
  // - Jika ada modal / sheet terbuka: tutup sheet/modal terlebih dahulu
  // - Jika berada di tab lain selain 'hari-ini': kembali ke tab sebelumnya / 'hari-ini'
  // - Jika berada di 'hari-ini' dan tidak ada sheet: keluar dari aplikasi (App.exitApp)
  const App = getCapacitorPlugin('App');
  if (App && typeof App.addListener === 'function') {
    App.addListener('backButton', () => {
      // 1. Cek sheet Edit Catatan
      const editSheet = document.getElementById('bottomSheet');
      if (editSheet && !editSheet.classList.contains('pointer-events-none')) {
        if (typeof window.hideEditModal === 'function') {
          window.hideEditModal();
          return;
        }
      }

      // 2. Cek sheet Ekspor PDF
      const pdfSheet = document.getElementById('pdf-bottom-sheet-card');
      if (pdfSheet && !pdfSheet.classList.contains('pointer-events-none')) {
        if (typeof window.closePdfModal === 'function') {
          window.closePdfModal();
          return;
        }
      }

      // 3. Cek modal konfirmasi Hapus Semua Data
      const deleteModal = document.getElementById('modal-delete-confirm');
      if (deleteModal && !deleteModal.classList.contains('pointer-events-none') && !deleteModal.classList.contains('hidden')) {
        if (typeof window.closeDeleteConfirmModal === 'function') {
          window.closeDeleteConfirmModal();
          return;
        }
      }

      // 4. Cek modal konfirmasi Impor Data
      const importModal = document.getElementById('modal-import-confirm');
      if (importModal && !importModal.classList.contains('pointer-events-none') && !importModal.classList.contains('hidden')) {
        if (typeof window.closeImportConfirmModal === 'function') {
          window.closeImportConfirmModal();
          return;
        }
      }

      // 5. Cek tab aktif: jika bukan 'hari-ini', kembali ke tab sebelumnya atau 'hari-ini'
      if (window.appState && window.appState.activeTab !== 'hari-ini') {
        const prevTab = (window.appState.lastActiveTab && window.appState.lastActiveTab !== window.appState.activeTab)
          ? window.appState.lastActiveTab
          : 'hari-ini';

        if (typeof window.navigateToTab === 'function') {
          window.navigateToTab(prevTab);
          return;
        }
      }

      // 6. Jika sudah di 'hari-ini' dan bersih dari sheet/modal, keluar aplikasi
      App.exitApp();
    });
  }

  // 3. STATUS BAR & THEME SYNC
  const isDark = document.documentElement.classList.contains('dark');
  syncStatusBarTheme(isDark);
}

/**
 * Sinkronisasi gaya Status Bar native Android dengan tema aktif
 * @param {boolean} isDark
 */
export function syncStatusBarTheme(isDark) {
  if (!isNativePlatform()) return;
  const StatusBar = getCapacitorPlugin('StatusBar');
  if (StatusBar && typeof StatusBar.setStyle === 'function') {
    try {
      StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(() => {});
    } catch (e) {
      // Abaikan jika tidak didukung
    }
  }
}

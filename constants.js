/**
 * constants.js - Konfigurasi dan konstanta Broke-o-meter
 * Berisi threshold status boncos harian, pemetaan kategori, dan nama hari/bulan bahasa Indonesia.
 */

export const STORAGE_KEY = 'broke_o_meter_entries';

export const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Thresholds untuk evaluasi pengeluaran HARI INI.
 * Digunakan untuk status badge, persentase progress bar, dan quote ledekan/humor.
 */
export const DAILY_STATUS_THRESHOLDS = [
  {
    max: 0,
    status: 'Sangat Hemat 🌿',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
    dotClass: 'bg-secondary',
    quote: 'Dompetmu masih full senyum, belum ada rupiah yang terbuang hari ini!',
    meterPercent: 0
  },
  {
    max: 30000,
    status: 'Aman Jaya',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
    dotClass: 'bg-secondary',
    quote: 'Aman, dompetmu belum menangis keras hari ini... tapi tetap waspada!',
    meterPercent: 25
  },
  {
    max: 75000,
    status: 'Mulai Goyah ⚡',
    badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dotClass: 'bg-tertiary',
    quote: 'Dompet mulai bersedih tipis-tipis, awas jangan sampai khilaf jajan lagi!',
    meterPercent: 55
  },
  {
    max: 150000,
    status: 'Lumayan Boncos 📉',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed',
    dotClass: 'bg-primary',
    quote: 'Hati-hati! Level boncos terdeteksi, kurangi checkout yang gak perlu.',
    meterPercent: 80
  },
  {
    max: Infinity,
    status: 'Bokek Kronis 🚨',
    badgeClass: 'bg-error-container text-on-error-container',
    dotClass: 'bg-error',
    quote: 'Gawat! Dompet menjerit histeris. Saatnya puasa jajan dan masak mie instan!',
    meterPercent: 100
  }
];

/**
 * Thresholds untuk Ringkasan BULANAN (Hero gauge & petuah dompet)
 */
export const MONTHLY_GAUGE_THRESHOLDS = [
  {
    max: 0,
    status: 'Sangat Aman 🌿',
    needleLeft: 10,
    advice: '"Pertahankan saldo ini, masa depan cerah menantimu!"'
  },
  {
    max: 500000,
    status: 'Aman Terkendali 🌿',
    needleLeft: 22,
    advice: '"Masih dalam batas wajar, tapi jangan kebablasan checkout keranjang kuning ya!"'
  },
  {
    max: 1500000,
    status: 'Boncos Tipis ⚖️',
    needleLeft: 48,
    advice: '"Kurangi jajan boba demi masa depan tabunganmu! Dompetmu butuh napas, Bestie."'
  },
  {
    max: 3000000,
    status: 'Lumayan Boncos 📉',
    needleLeft: 72,
    advice: '"Pengeluaran mulai ugal-ugalan! Yuk rem dulu kopi kekinian dan makan mewah."'
  },
  {
    max: Infinity,
    status: 'Makan Promag Saja 🚨',
    needleLeft: 92,
    advice: '"Kondisi dompet stadium 4! Masak mie instan pakai telur adalah solusi bertahan hidup."'
  }
];

/**
 * Metadata Kategori Pengeluaran
 */
export const CATEGORIES = {
  makan: {
    id: 'makan',
    name: 'Makan',
    fullName: 'Makan & Kuliner',
    icon: '🍜',
    materialIcon: 'restaurant',
    colorClass: 'bg-primary-container',
    bgLightClass: 'bg-primary-fixed',
    textLightClass: 'text-on-primary-fixed',
    defaultTag: 'Makan Kenyang'
  },
  minum: {
    id: 'minum',
    name: 'Minum',
    fullName: 'Minum & Kopi Santai',
    icon: '🧋',
    materialIcon: 'local_cafe',
    colorClass: 'bg-tertiary-fixed-dim',
    bgLightClass: 'bg-tertiary-fixed',
    textLightClass: 'text-on-tertiary-container',
    defaultTag: ''
  },
  transport: {
    id: 'transport',
    name: 'Transport',
    fullName: 'Transportasi Harian',
    icon: '🛵',
    materialIcon: 'local_gas_station',
    colorClass: 'bg-secondary',
    bgLightClass: 'bg-secondary-fixed',
    textLightClass: 'text-on-secondary-fixed',
    defaultTag: 'Operasional'
  },
  lainnya: {
    id: 'lainnya',
    name: 'Lainnya',
    fullName: 'Khilaf Lain-lain',
    icon: '✨',
    materialIcon: 'shopping_bag',
    colorClass: 'bg-outline',
    bgLightClass: 'bg-surface-container-high',
    textLightClass: 'text-on-surface',
    defaultTag: 'Khilaf Santai'
  }
};

/**
 * Saran nama barang awal (default fallback jika belum pernah ada transaksi)
 */
export const DEFAULT_SUGGESTIONS = [
  { name: 'Es teh', price: 3000, category: 'minum' },
  { name: 'Kopi tubruk', price: 5000, category: 'minum' },
  { name: 'Nasi padang', price: 15000, category: 'makan' },
  { name: 'Bensin', price: 10000, category: 'transport' }
];

/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp X.XXX)
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Mendapatkan data status boncos harian berdasarkan total pengeluaran hari ini
 */
export function getDailyStatus(total) {
  const amount = Number(total) || 0;
  for (const item of DAILY_STATUS_THRESHOLDS) {
    if (amount <= item.max) {
      return item;
    }
  }
  return DAILY_STATUS_THRESHOLDS[DAILY_STATUS_THRESHOLDS.length - 1];
}

/**
 * Mendapatkan data status gauge bulanan berdasarkan total pengeluaran bulan ini
 */
export function getMonthlyStatus(total) {
  const amount = Number(total) || 0;
  for (const item of MONTHLY_GAUGE_THRESHOLDS) {
    if (amount <= item.max) {
      return item;
    }
  }
  return MONTHLY_GAUGE_THRESHOLDS[MONTHLY_GAUGE_THRESHOLDS.length - 1];
}

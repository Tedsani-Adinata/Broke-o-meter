/**
 * storage.js - Abstraksi Lapisan Penyimpanan Data (Storage Layer)
 * 
 * Modul ini mengekspos API asinkron (Promise-based) untuk seluruh operasi CRUD catatan pengeluaran.
 * Saat ini penyimpanan didukung oleh browser localStorage.
 * 
 * [CATATAN ARSITEKTUR UNTUK CAPACITOR / SQLITE]:
 * Pada Stage 4, implementasi internal fungsi di modul ini dapat ditukar dengan
 * plugin SQLite Capacitor (@capacitor-community/sqlite) TANPA PERLU mengubah kode UI di app.js,
 * karena semua method (getAll, getById, add, update, delete, clear, replaceAll)
 * sudah menggunakan pola Promise asinkron.
 * 
 * Bentuk Data (Entry Shape):
 * {
 *   id: string,          // ID unik (misal: "entry_1728800000000_abc")
 *   name: string,        // Nama pengeluaran (misal: "Es teh")
 *   price: number,       // Nominal angka dalam Rupiah (misal: 3000)
 *   category: string,    // Kategori: 'makan' | 'minum' | 'transport' | 'lainnya'
 *   date: string,        // Tanggal transaksi format "YYYY-MM-DD"
 *   createdAt: number    // Timestamp milidetik pembuatan untuk sorting stabil
 * }
 */

import { STORAGE_KEY } from './constants.js';

/**
 * Generate ID unik berbasis timestamp dan karakter acak
 * @returns {string}
 */
function generateId() {
  return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Helper internal untuk membaca seluruh array dari localStorage secara aman
 * @returns {Array<Object>}
 */
function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] Gagal membaca data dari localStorage:', error);
    return [];
  }
}

/**
 * Helper internal untuk menyimpan array ke localStorage
 * @param {Array<Object>} entries
 */
function writeStorage(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[Storage] Gagal menulis data ke localStorage:', error);
    throw error;
  }
}

/**
 * Mengambil semua catatan transaksi.
 * @returns {Promise<Array<Object>>}
 */
export async function getAll() {
  const entries = readStorage();
  return entries;
}

/**
 * Mengambil satu catatan berdasarkan ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getById(id) {
  const entries = readStorage();
  const found = entries.find(item => String(item.id) === String(id));
  return found || null;
}

/**
 * Menambahkan transaksi baru.
 * @param {Object} entryData
 * @param {string} entryData.name
 * @param {number} entryData.price
 * @param {string} entryData.category
 * @param {string} [entryData.date] - Format "YYYY-MM-DD", jika kosong diisi hari ini
 * @param {number} [entryData.createdAt] - Timestamp milidetik
 * @returns {Promise<Object>} Catatan yang berhasil disimpan
 */
export async function add(entryData) {
  if (!entryData.name || typeof entryData.name !== 'string' || !entryData.name.trim()) {
    throw new Error('Nama pengeluaran tidak boleh kosong');
  }
  const price = Number(entryData.price);
  if (isNaN(price) || price <= 0) {
    throw new Error('Harga harus berupa angka lebih dari 0');
  }

  const entries = readStorage();

  const newEntry = {
    id: entryData.id ? String(entryData.id) : generateId(),
    name: entryData.name.trim(),
    price: Math.round(price),
    category: entryData.category || 'lainnya',
    date: entryData.date || new Date().toISOString().slice(0, 10),
    createdAt: entryData.createdAt || Date.now()
  };

  entries.push(newEntry);
  writeStorage(entries);

  return newEntry;
}

/**
 * Memperbarui catatan yang sudah ada.
 * @param {string} id
 * @param {Object} updatedFields
 * @returns {Promise<Object>} Catatan yang diperbarui
 */
export async function update(id, updatedFields) {
  const entries = readStorage();
  const index = entries.findIndex(item => String(item.id) === String(id));

  if (index === -1) {
    throw new Error(`Catatan dengan ID ${id} tidak ditemukan`);
  }

  const existing = entries[index];
  const updatedEntry = {
    ...existing,
    ...updatedFields,
    id: existing.id, // Pertahankan ID asli
    createdAt: existing.createdAt // Pertahankan waktu pembuatan asli
  };

  if (updatedFields.price !== undefined) {
    const price = Number(updatedFields.price);
    if (isNaN(price) || price <= 0) {
      throw new Error('Harga harus berupa angka lebih dari 0');
    }
    updatedEntry.price = Math.round(price);
  }

  if (updatedFields.name !== undefined) {
    if (!updatedFields.name || !updatedFields.name.trim()) {
      throw new Error('Nama pengeluaran tidak boleh kosong');
    }
    updatedEntry.name = updatedFields.name.trim();
  }

  entries[index] = updatedEntry;
  writeStorage(entries);

  return updatedEntry;
}

/**
 * Menghapus satu catatan berdasarkan ID.
 * @param {string} id
 * @returns {Promise<boolean>} True jika berhasil dihapus
 */
export async function deleteEntry(id) {
  const entries = readStorage();
  const filtered = entries.filter(item => String(item.id) !== String(id));
  const changed = filtered.length !== entries.length;

  if (changed) {
    writeStorage(filtered);
  }

  return changed;
}

// Alias delete agar sesuai spesifikasi (delete, clear, replaceAll)
export { deleteEntry as delete };

/**
 * Menghapus seluruh data catatan (Hapus Semua Data).
 * @returns {Promise<boolean>}
 */
export async function clear() {
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

/**
 * Menggantikan seluruh isi data catatan (digunakan untuk Impor / Pemulihan Cadangan).
 * @param {Array<Object>} newEntries
 * @returns {Promise<Array<Object>>}
 */
export async function replaceAll(newEntries) {
  if (!Array.isArray(newEntries)) {
    throw new Error('Data pengganti harus berupa array');
  }

  // Validasi dan normalisasi setiap item
  const validated = newEntries.map(item => ({
    id: item.id ? String(item.id) : generateId(),
    name: String(item.name || '').trim(),
    price: Math.round(Number(item.price) || 0),
    category: item.category || 'lainnya',
    date: item.date || new Date().toISOString().slice(0, 10),
    createdAt: item.createdAt || Date.now()
  })).filter(item => item.name && item.price > 0);

  writeStorage(validated);
  return validated;
}

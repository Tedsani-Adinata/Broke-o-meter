/**
 * profile.js - Pengelola Profil Pengguna (Foto & Nama Sapaan) Broke-o-meter
 * Mengatur nama sapaan kustom dan foto profil offline lokal (localStorage).
 * Menggunakan HTML5 Canvas untuk kompresi & crop foto (256x256 px) agar hemat memori dan kilat dimuat.
 */

import { getTimeGreeting } from './dateUtils.js';

export const PROFILE_NAME_STORAGE_KEY = 'broke_o_meter_user_name';
export const PROFILE_AVATAR_STORAGE_KEY = 'broke_o_meter_user_avatar';
export const DEFAULT_USER_NAME = 'Aishia';

/**
 * Mendapatkan nama sapaan tersimpan atau fallback ke 'Aishia'.
 * @returns {string}
 */
export function getProfileName() {
  try {
    const saved = localStorage.getItem(PROFILE_NAME_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Gagal membaca nama profil:', e);
  }
  return DEFAULT_USER_NAME;
}

/**
 * Menyimpan nama sapaan baru ke localStorage.
 * @param {string} name
 * @returns {string} Nama yang tersimpan
 */
export function setProfileName(name) {
  const cleanName = (name && name.trim().length > 0) ? name.trim().slice(0, 20) : DEFAULT_USER_NAME;
  try {
    localStorage.setItem(PROFILE_NAME_STORAGE_KEY, cleanName);
  } catch (e) {
    console.warn('Gagal menyimpan nama profil:', e);
  }
  updateProfileUI();
  return cleanName;
}

/**
 * Mendapatkan data URL foto profil (base64) tersimpan.
 * @returns {string|null}
 */
export function getProfileAvatar() {
  try {
    return localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY);
  } catch (e) {
    console.warn('Gagal membaca foto profil:', e);
  }
  return null;
}

/**
 * Menyimpan data URL foto profil baru ke localStorage.
 * @param {string} base64DataUrl
 */
export function setProfileAvatar(base64DataUrl) {
  try {
    localStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, base64DataUrl);
  } catch (e) {
    console.warn('Gagal menyimpan foto profil:', e);
  }
  updateProfileUI();
}

/**
 * Menghapus foto profil kustom dan kembali ke avatar bawaan.
 */
export function removeProfileAvatar() {
  try {
    localStorage.removeItem(PROFILE_AVATAR_STORAGE_KEY);
  } catch (e) {
    console.warn('Gagal menghapus foto profil:', e);
  }
  updateProfileUI();
}

/**
 * Mengompresi dan memotong foto yang diunggah menjadi rasio 1:1 persegi (256x256 px).
 * Menghindari konsumsi kuota localStorage berlebih pada perangkat seluler.
 * @param {File} file
 * @param {number} size
 * @returns {Promise<string>} Data URL base64 JPEG
 */
export function compressAndCropImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // Hitung crop 1:1 di tengah (center crop)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

/**
 * Memperbarui semua elemen visual profil di seluruh layar (Header, Hari Ini, dan Pengaturan).
 */
export function updateProfileUI() {
  const name = getProfileName();
  const avatar = getProfileAvatar();
  const initial = name.charAt(0).toUpperCase() || 'A';

  // 1. Perbarui teks sapaan di layar Hari Ini
  const greetingTitleEl = document.getElementById('greeting-title');
  if (greetingTitleEl) {
    greetingTitleEl.textContent = getTimeGreeting(name);
  }

  // 2. Perbarui input dan preview di Pengaturan
  const inputNameEl = document.getElementById('input-profile-name');
  if (inputNameEl && document.activeElement !== inputNameEl) {
    inputNameEl.value = name;
  }
  const previewNameEl = document.getElementById('preview-profile-name');
  if (previewNameEl) {
    previewNameEl.textContent = name;
  }

  // 3. Perbarui avatar di Header (kanan atas)
  const headerAvatarImg = document.getElementById('header-avatar-img');
  const headerAvatarInitial = document.getElementById('header-avatar-initial');
  if (headerAvatarImg && headerAvatarInitial) {
    if (avatar) {
      headerAvatarImg.src = avatar;
      headerAvatarImg.classList.remove('hidden');
      headerAvatarInitial.classList.add('hidden');
    } else {
      headerAvatarImg.classList.add('hidden');
      headerAvatarInitial.textContent = initial;
      headerAvatarInitial.classList.remove('hidden');
    }
  }

  // 4. Perbarui avatar di kartu Pengaturan
  const settingsAvatarImg = document.getElementById('settings-avatar-img');
  const settingsAvatarInitial = document.getElementById('settings-avatar-initial');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');
  const photoSeparator = document.getElementById('profile-photo-separator');

  if (settingsAvatarImg && settingsAvatarInitial) {
    if (avatar) {
      settingsAvatarImg.src = avatar;
      settingsAvatarImg.classList.remove('hidden');
      settingsAvatarInitial.classList.add('hidden');
      if (btnRemovePhoto) btnRemovePhoto.style.display = 'inline-flex';
      if (photoSeparator) photoSeparator.style.display = 'inline';
    } else {
      settingsAvatarImg.classList.add('hidden');
      settingsAvatarInitial.textContent = initial;
      settingsAvatarInitial.classList.remove('hidden');
      if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';
      if (photoSeparator) photoSeparator.style.display = 'none';
    }
  }
}

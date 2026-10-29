/**
 * sync-www.js - Script sinkronisasi aset web ke folder www/ dan Capacitor Android
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const WWW_DIR = path.join(ROOT_DIR, 'www');

// Berkas tunggal yang perlu disalin
const FILES_TO_COPY = [
  'index.html',
  'app.js',
  'capacitorApp.js',
  'constants.js',
  'dateUtils.js',
  'storage.js',
  'profile.js',
  'theme.js',
  'motionHelper.js',
  'pdfExport.js',
  'backup.js',
  'logo.png',
  'tabungan.png'
];

// Direktori yang perlu disalin secara rekursif
const DIRS_TO_COPY = [
  'css',
  'fonts',
  'lib'
];

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

if (!fs.existsSync(WWW_DIR)) {
  fs.mkdirSync(WWW_DIR, { recursive: true });
}

// Salin berkas tunggal
for (const file of FILES_TO_COPY) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(WWW_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Salin direktori
for (const dir of DIRS_TO_COPY) {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(WWW_DIR, dir);
  if (fs.existsSync(src)) {
    copyFolderRecursiveSync(src, dest);
  }
}

console.log('✓ Seluruh aset web berhasil disinkronkan ke folder www/');

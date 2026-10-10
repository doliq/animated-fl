# For Dira 🌹 — a little place

Situs hadiah digital: 8 scene berurutan, teks seminimal mungkin, bahasa Inggris.

**Alur:** surat digital → **photobooth** (3 foto jadi photo strip) → ruangan kecil yang bisa ditap →
bunga interaktif (tap 3× sampai mekar) → our timeline → mini game → catatan kecil → pesan penutup.
Ada dua pesan rahasia yang bisa ditemukan.

HTML + CSS + JS vanilla, tanpa backend, siap ditaruh di GitHub Pages.

## Menjalankan di komputer

```powershell
python _dev/serve.py
# lalu buka http://127.0.0.1:8765/
```

`_dev/serve.py` adalah server pratinjau kecil yang mengirim **Cache-Control: no-store**, jadi setiap
kamu mengedit HTML/CSS/JS, perubahan langsung terlihat hanya dengan refresh biasa (tidak perlu
Ctrl+Shift+R). Server ini juga mendukung rentang byte sehingga video di `assets/video/` bisa
diputar dan digeser.

Kalau tetap memakai `python -m http.server 8765`, lakukan **hard refresh (Ctrl + Shift + R)** setiap
kali habis mengedit file — server bawaan Python tidak mengirim header cache, jadi browser sering
memakai salinan lama.

Photobooth memakai kamera; browser hanya mengizinkan kamera di `https://` atau `http://localhost`.
Kalau halaman dibuka dengan klik dua kali (`file://`), kamera tidak bisa dan otomatis muncul opsi
**Or pick from gallery** — semua fitur lain tetap jalan.

## Yang perlu kamu isi (semua di `js/content.js`)

1. **Foto kenangan** → `assets/photos/01.jpg` … `05.jpg` (atau ubah nama di `timeline.nodes`).
   Belum ada pun aman: panel memunculkan ceritanya saja, tanpa gambar rusak.
2. **Catatan kecil** (scene 07) → daftar kalimat di `js/content.js` → `voice.lines`. Tanpa rekaman.
3. **Lagu** → `assets/music/lagu.mp3` (sudah terisi).
4. Nama panggilan, tiga kalimat pembuka, pesan 6 objek ruangan, dua baris setelah bunga mekar,
   lima kenangan, pertanyaan mini game, dan empat baris penutup — semuanya di `js/content.js`.
5. **Video pendek** → `assets/video/` sudah berisi `edenberq.mp4`, `oc.mp4`, `swisy.mp4`
   (total ±43 MB). Ganti dengan versi yang lebih kecil kalau mau situsnya lebih ringan;
   daftar videonya ada di `js/content.js` → `world.objects` (objek `photo`).
6. **Poster film** → `assets/film/` sudah berisi `exhuma.jpg`, `crazy-rich-asians.jpg`,
   `shutter-island.jpg`. Tambah film lain dengan menaruh posternya di folder itu lalu
   menambah satu baris di `js/content.js` → `world.objects` (objek `film`) → `posters`.

Aturan saat mengedit: **satu pikiran = satu baris pendek**. Bagian ini yang bikin situsnya terasa
personal, bukan seperti template.

## Struktur

| Folder | Isi |
| --- | --- |
| `css/` | `global`, `opening`, `photobooth`, `world`, `flower`, `story` |
| `js/` | `content` (isi), `state` (router + progress), `audio`, `dust`, `photobooth`, `world`, `flower`, `timeline`, `games`, `voice`, `app` |
| `assets/` | `img/`, `music/`, `photos/`, `audio/` |
| `RANCANGAN_IMPLEMENTASI.md` | rancangan & alur fitur sesuai implementasi aktual |

## Nilai plus

- **Progress tersimpan** (`localStorage`): kalau halaman ditutup, saat dibuka lagi lanjut dari scene
  terakhir. Tombol `⟲` di kanan atas untuk mengulang dari awal.
  Bisa juga lompat langsung: `index.html#flower`, `index.html#photobooth`, dst.
- **Privasi**: photo strip dibuat di perangkat, tidak ada foto yang diunggah.
- **Pesan rahasia**: coba tap bintang kecil di dinding ruangan, dan coba ketik `dira` di mana saja.
- **Aksesibilitas**: tombol besar (≥46 px), mendukung `prefers-reduced-motion`, ada `<noscript>`.

## Deploy ke GitHub Pages

> ⚠️ Kalau repositorinya **publik**, semua isi `assets/` ikut publik — termasuk lagu, foto,
> dan tiga video di `assets/video/`. Kalau tidak mau, pakai repositori privat
> dengan GitHub Pages privat, atau hosting sendiri.

1. Buat repositori baru, misal `untuk-dira`.
2. Unggah seluruh isi folder ini ke root repositori (pastikan `index.html` ada di root).
3. Repositori → **Settings → Pages** → Source: `Deploy from a branch` →
   Branch `main`, folder `/ (root)` → **Save**.
4. Tunggu ±1 menit, buka `https://<username>.github.io/untuk-dira/`, lalu kirim tautannya. ✅

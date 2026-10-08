# Rancangan & Alur Fitur — Love Interactive Website
**Status: implementasi aktual, mengikuti konsep 8 poin (versi ringkas, teks seminimal mungkin)**

Dokumen ini melengkapi `Rancangan_Website_Love_Interactive_Gabung_Web_Bunga.docx` dan menggantikan
versi rancangan sebelumnya. Isinya adalah apa yang **benar-benar terpasang di folder ini**.

---

## 1. Aturan dasar (yang dijaga di semua scene)

| Aturan | Cara diwujudkan |
| --- | --- |
| **Kurangi kalimat** | Satu pikiran = satu baris pendek. Instruksi maksimum satu kalimat kecil (`Tap things.`, `One by one.`). Tidak ada paragraf panjang. |
| Bahasa Inggris semua | Seluruh teks ada di `js/content.js`, tanpa campuran bahasa. |
| Personal, bukan template | Semua isi (nama, cerita, pertanyaan, pesan) di satu berkas: `js/content.js`. |
| Cinematic tapi hangat | Latar gelap + glow keemasan, partikel debu, tirai transisi, grain halus. |
| Photobooth lebih dulu | Urutan: surat → **photo strip** → ruangan → bunga → timeline → mini game → voice → penutup. |
| Foto ikut dipajang | Strip hasil photobooth muncul di objek "photo" pada ruangan (tanpa server, memakai blob lokal). |
| Mobile-first | Diuji pada 360 / 390 / 414 px, area tap ≥ 46 px, tanpa scroll horizontal. |
| Statis & aman | Semua path relatif, tanpa backend, tanpa permintaan ke layanan luar. |

---

## 2. Struktur folder

```
photobooth/
├── index.html                 # kerangka 8 scene (10 KB; tanpa audio/CSS/JS inline)
├── css/
│   ├── global.css             # token, kerangka scene, latar per-scene (#bgFx), debu/bunga, tombol, easter egg
│   ├── opening.css            # 01 surat digital (segel + tiga kalimat)
│   ├── photobooth.css         # 02 photobooth (kamera, filter, bingkai, strip)
│   ├── world.css              # 03 ruangan + panel pesan + potongan chat
│   ├── flower.css             # 04 bunga interaktif + 08 penutup
│   └── story.css              # 05 timeline, 06 mini game, 07 voice
├── js/
│   ├── content.js             # ★ SEMUA ISI (satu-satunya berkas yang perlu kamu ubah)
│   ├── state.js               # router scene, transisi, progress, helper UI + easter egg
│   ├── audio.js               # lagu latar + efek suara (Web Audio) + ducking suara
│   ├── gallery.js             # penyimpanan photo strip (IndexedDB) + hapus
│   ├── dust.js                # partikel debu/cahaya
│   ├── photobooth.js          # kamera → 3 foto → photo strip → simpan/bagikan
│   ├── world.js               # ruangan + 6 objek + bintang tersembunyi
│   ├── flower.js              # kuncup → daun → batang → mekar → kelopak jadi partikel
│   ├── timeline.js            # memory map 5 titik
│   ├── games.js               # Find the heart + How well do you know us
│   ├── voice.js               # pemutar voice message
│   └── app.js                 # scene 01 & 08, ketik nama panggilan, bar tahapan, boot
└── assets/
    ├── img/paper.jpg          # tekstur kertas (dipakai tipis di dinding ruangan + bingkai "Garden")
    ├── music/lagu.mp3         # lagu latar
    ├── video/                 # edenberq.mp4, oc.mp4, swisy.mp4 (diputar di objek "photo & video")
    ├── film/                  # poster film yang sudah ditonton: exhuma, crazy-rich-asians, shutter-island
    ├── photos/                # ← foto kenangan (01.jpg … 05.jpg)
    └── audio/                 # ← voice message (voice.mp3)
```

---

## 3. Alur scene (aktual)

Urutan pasti: `opening → photobooth → world → flower → timeline → games → voice → final`

### 01 — Opening / Digital Letter
Segel lilin pink dengan hati, tulisan *For Dira*, dan `tap to open`.
Setelah diketuk, segel memudar dan tiga kalimat muncul satu per satu:
> Hi, Dira.
> I don't really know how to put everything I feel into words…
> so I made you a little place instead.

Lalu tombol **Come with me**. Latar dihiasi partikel debu/cahaya yang mengapung (`js/dust.js`).

### 02 — Photobooth
> A photo first. · "3 shots. Pick a filter if you feel like it."

Kamera depan (pratinjau bercermin) → hitungan 3-2-1 + kilat + suara shutter ×3 →
photo strip (lebar 900 px, tinggi mengikuti bingkai yang dipilih).
Tersedia **6 filter** (Original, Warm, Soft, Mono, Dusk, Film) dan **7 bingkai**:

| Bingkai | Gaya |
| --- | --- |
| **Cinema** | Tiket bioskop: latar merah marun, panel kertas krem, lubang tiket di sisi, judul script, tabel Shot/Date/Time, pita "Save The Best Moment", logo di bawah. *(dari referensi "Theather Show")* |
| **Polaroid** | Latar krem, judul script, tiap foto jadi cetakan putih yang sedikit miring dengan tulisan tangan di bawahnya, plus tiket "Photo Ticket · Day Pass". *(dari "Catch Yours")* |
| **Noir** | Strip hitam, foto otomatis hitam-putih, nama besar di bawah yang sengaja terpotong. *(dari "Moo")* |
| **Paper** | Kertas krem hangat, sudut membulat, garis putus-putus di tepi, caption script. |
| **Plain** | Putih bersih, sudut tajam, garis hitam tipis di tiap foto, caption huruf kapital tanpa hiasan (gaya cetakan foto minimalis). |
| **Hearts** | Latar gelap rose, hati di empat sudut, caption warna krem. |
| **Garden** | Tekstur kertas pink, bunga kecil, caption script. |

Filter **dan** bingkai langsung terlihat di pratinjau kamera (bukan cuma di hasil).
Strip bisa **Save** (unduh JPEG) atau **Share** (Web Share API). Tombol **Go inside** lanjut ke ruangan.
Tanpa kamera / dibuka dari `file://` → otomatis muncul **Or pick from gallery** (input foto), tetap jalan.

### 03 — Little World
> Tap things.

Ruangan 2D: lampu gantung, lampu tumblr yang berkelip, jendela + tirai, lantai kayu, karpet, dan
karakter **Dira** (gambar SVG: rambut bob, kulit putih, sweter pink) sebagai dekorasi.
Hanya **tiga benda** yang punya isi dan bisa ditap — supaya terasa seperti kamar, bukan menu:

| Benda | Isi |
| --- | --- |
| 🖼️ **Media** (bingkai di dinding) | **Dua langkah**: panel pertama hanya menampilkan dua pilihan **Photo** dan **Video** (dengan jumlahnya). Pilih **Photo** → galeri semua strip dari sesi photobooth sebelumnya, tiap strip bisa **dihapus** (✕). Pilih **Video** → tiga klip (edenberq, oc, swisy) + "Remember those videos I edited a while ago?" / "Haha, the edits were so unserious." Tombol **Back** untuk kembali ke dua pilihan. Bingkai di dinding otomatis menampilkan strip terbaru. |
| 🎬 **Movies** (rak di dinding) | Tiga **kartu poster** film yang sudah ditonton (Exhuma, Crazy Rich Asians, Shutter Island) + "What we've watched so far." / "And still counting" |
| 🌷 **Flower** (pot di lantai) | "Not yet." / "Tap it." → membuka scene bunga |

Strip photobooth disimpan sebagai blob di **IndexedDB** (`dira-album`), jadi koleksinya tetap ada
setelah halaman di-refresh. Kalau browser menolak IndexedDB (mis. mode privat), otomatis jatuh ke
penyimpanan sementara di memori supaya panel tetap jalan (ada pengaman waktu 4 detik).

Setelah ketiganya dibuka, tombol **Keep going** muncul.
Ada satu **bintang tersembunyi** (✦) di dinding: *"You weren't supposed to find this."*

### 04 — Interactive Flower
Satu kuncup mawar di atas batang, dengan ajakan `Tap the flower.`

1. Tap 1 → **daun muncul** (dua daun di batang), ajakan berubah jadi `Again.`
2. Tap 2 → **batang tumbuh lebih tinggi**, ajakan `One more.`
3. Tap 3 → **kelopak terbuka** (mekar), lalu muncul:> I don't need a perfect flower.
> I just wanted to give you one that stays.

Setelah itu kelopaknya **berubah menjadi partikel** yang memenuhi layar (ledakan + kelopak jatuh terus),
lalu tombol **Keep going**.

**Menanam bunga di sekeliling:** tap di area lain (bukan bunganya) menumbuhkan bunga kecil baru di
titik itu — tinggi batangnya dibatasi supaya tampak seperti taman. Setelah mekar muncul petunjuk tipis
*"Tap anywhere else to plant more."* Maksimum ±26 bunga, dan semuanya direset saat **⟲**.

### 05 — Our Timeline (memory map)
> One by one.

Lima titik tersambung garis, bukan tanggal kaku. Tiap titik membuka panel berisi **media** + cerita
pendek. Jenis media yang didukung (diatur di `js/content.js` → `timeline.nodes[].media.type`):

| `type` | Isi |
| --- | --- |
| `photo` | gambar, mis. screenshot chat (ditampilkan utuh, tidak dipotong) |
| `video` | klip pendek dengan kontrol pemutar |
| `audio` | voice note |
| `chat` | potongan percakapan yang digambar sebagai gelembung chat |
| `text` | **kartu isian** — penerima bisa menulis sendiri (mis. titik "Today") |

**Kartu isian (`type: 'text'`)** menampilkan label `Your turn.`, satu kotak tulis, tombol **Save**, dan
catatan kecil *"It stays on this phone."* Tulisannya **tersimpan otomatis saat diketik** ke
`localStorage` (`love.notes.v1`) di perangkat penerima, jadi tetap ada walau panel ditutup atau
halaman di-refresh, dan **tidak ikut terhapus** oleh tombol ulangi (⟲).

Titik yang sudah dibuka ditandai emas; tombol **Keep going** muncul setelah kelimanya dibuka.

### 06 — Mini games
**Find the heart.** — enam objek bergerak di dalam kotak; satu menyembunyikan hati (♥).
Salah pilih: `Nope.` Dua babak.

**How well do you know us?** — empat pertanyaan absurd
(*Who said "I love you" first? · Who takes longer to reply? · Who falls asleep on call first? ·
Who is more annoying?*). Jawaban benar: 💗 +1. Jawaban salah:
> Wrong. You owe me one hug.

Penghitung di bawah menampilkan `💗 2/4 · 2 hugs owed`. Tombol **One more thing** setelah selesai.

### 07 — Voice message
> Listen to this. · "Put your headphones on."

Bola pemutar besar dengan gelombang cincin, progress bar yang bisa diklik, penghitung waktu,
tombol kecil **words** untuk membuka transkrip. Lagu latar otomatis dikecilkan saat suara diputar.
Selama `assets/audio/voice.mp3` belum ada, muncul catatan ramah (bukan error).

### 08 — Final
Semua elemen menghilang; hanya satu bunga yang tersisa di tengah. Kalimat muncul dengan jeda:
> And that's it.
> *(jeda)* No big reason.
> *(jeda)* I just wanted to make something that reminds you…
> *(jeda)* …that somewhere in this world, there's someone who chose to spend his time making this for you.

Lalu **I love you.**, `— Oliq`, dan tombol **Start Again ♡** yang mengembalikan semuanya ke awal.

### Easter egg kedua
Ketik/ngetik nama panggilan (**dira**) di mana saja → layar **ACCESS GRANTED** dengan pesan rahasia.
Teks judul, isi pesan, dan label tombol penutupnya diatur di `js/content.js` bagian `easter`
(termasuk `easter.next`).

---

## 4. Progress & perilaku refresh

- Disimpan di `localStorage` (`love.progress.v1` → `{ flags, scene }`).
- Flag: `letterOpened`, `photoTaken`, `worldExplored`, `flowerBloomed`, `timelineSeen`,
  `gamesDone`, `voiceUnlocked`, `eggStar`, `eggTyped`.
- **Refresh** membuka kembali scene terakhir (progress tidak hilang). Hash URL diprioritaskan bila ada,
  mis. `index.html#flower` untuk melompat langsung ke scene tertentu.
- **Mulai ulang**: tombol `⟲` kanan atas atau **Start Again ♡** di scene penutup.
- Transisi antar scene memakai tirai gelap ±1,3 detik; otomatis dipersingkat bila perangkat meminta
  `prefers-reduced-motion`.

---

## 5. Audio

| Suara | Sumber | Kapan |
| --- | --- | --- |
| Lagu latar | `assets/music/lagu.mp3` | Setelah tap pertama (segel), loop, fade-in |
| Tap / pop / benar / salah / chime | Web Audio (osilator) | Interaksi & jawaban |
| Shutter | Web Audio (noise) | Tiap jepretan |
| Mekar | Web Audio (3 nada) | Saat kelopak terbuka |
| Voice message | `assets/audio/voice.mp3` | Scene 07, lagu latar dikecilkan otomatis |

Pil **♫ on / ♫ off** selalu tersedia di kanan bawah (disembunyikan otomatis bila lagu gagal dimuat).

---

## 6. Verifikasi yang sudah dijalankan

Diuji otomatis dengan Chrome headless (DevTools Protocol), emulasi 360 / 390 / 414 px:

| Yang diperiksa | Hasil |
| --- | --- |
| Semua berkas & aset (HTML, 6 CSS, 11 JS, lagu) | `200`, tanpa error JavaScript |
| Scroll horizontal / elemen keluar layar di 8 scene | tidak ada, di ketiga lebar |
| Segel → tiga kalimat → CTA | berurutan sesuai rancangan |
| Photobooth lewat galeri | strip **900×2148**, tautan unduh siap, strip tersimpan untuk ruangan |
| Photobooth selesai → tombol **Go inside** | terlihat tanpa perlu digeser (diuji 390×844 dan 360×640), lanjut ke ruangan |
| Filter & bingkai di pratinjau kamera | filter langsung terlihat di video (mis. Mono jadi hitam-putih) dan bingkai mengubah bingkai + warna caption |
| Ruangan: 6 objek + bingkai memakai strip + bintang rahasia | semua berfungsi |
| Objek photo & video: strip + 3 video | video termuat (metadata 11 detik, 1080×1920), dibuka hanya saat diputar |
| Ruangan: 3 benda + karakter Dira + bintang rahasia | semua berfungsi, tidak ada elemen yang bertumpuk |
| Media dua langkah: pilihan Photo/Video → isinya | pilihan menampilkan jumlah ("2 strips", "3"); isi baru muncul setelah dipilih |
| Galeri strip: simpan, tampil, hapus | 2 sesi photobooth tersimpan di IndexedDB; hapus satu menyisakan satu; hapus semua memunculkan catatan kosong dan bingkai di dinding ikut kosong |
| Objek movies: 3 kartu poster | ketiganya termuat (600×900, ±79–125 KB) dengan judul di bawahnya |
| Karakter Dira (SVG) di ruangan | tampil dan bisa ditap |
| Bunga: 3 tap (daun → batang → mekar) | urutan benar, teks & tombol muncul, partikel kelopak jalan |
| Bunga: tanam di sekeliling | 6–7 bunga kecil tertanam; tap tepat di bunga setelah mekar tidak menambah taman |
| Timeline: 5 titik dibuka semua | tombol lanjut aktif, media & cerita tampil |
| Timeline: kartu isian (`type: 'text'`) | tersimpan otomatis saat diketik, tetap ada setelah panel ditutup dan halaman di-refresh |
| Mini game: 2 babak find-the-heart + 4 pertanyaan | penghitung hati & "You owe me one hug." benar |
| Voice | catatan muncul saat berkas belum ada; pemutar siap |
| Final + Start Again | kalimat berjeda tampil berurutan, reset kembali ke awal |
| Easter egg (bintang & ketik "dira") | keduanya membuka pesan rahasia |

Catatan: uji kamera sungguhan perlu dilakukan di HP melalui `https` (GitHub Pages) atau `http://localhost`,
karena browser hanya mengizinkan kamera di konteks aman.

---

## 7. Yang perlu kamu isi

| Bagian | Tempat |
| --- | --- |
| Nama panggilan & pengirim | `js/content.js` → `name`, `sender` |
| Tiga kalimat pembuka | `js/content.js` → `opening.lines` |
| Pesan 6 objek ruangan | `js/content.js` → `world.objects[].lines` |
| Video pendek di objek photo & video | `assets/video/` (sudah terisi: edenberq.mp4, oc.mp4, swisy.mp4) + daftarnya di `world.objects[photo].videos` |
| Poster film yang sudah ditonton | `assets/film/` (sudah terisi) + daftarnya di `world.objects` (objek `film`) → `posters` |
| Karakter Dira (rambut bob, kulit putih) | `js/world.js` → `DIRA_SVG` |
| Dua baris setelah bunga mekar | `js/content.js` → `flower.afterBloom` |
| Lima kenangan (judul + media + cerita) | `js/content.js` → `timeline.nodes` + `assets/photos/01…05.jpeg` |
| Kartu isian untuk penerima | `js/content.js` → `timeline.nodes[].media = { type: 'text' }` dan teksnya di `timeline.text` |
| Pertanyaan mini game | `js/content.js` → `games.questions` (`answer` = indeks jawaban benar) |
| Voice message | `assets/audio/voice.mp3` + `js/content.js` → `voice.transcript` |
| Pesan rahasia | `js/content.js` → `world.star.lines` dan `easter.lines` |
| Empat baris penutup | `js/content.js` → `final.lines` |

---

## 8. Rencana lanjutan (opsional, belum dikerjakan)

1. **Stiker photobooth** (mahkota/kumis) yang bisa digeser sebelum jepret.
2. **Video pendek** di salah satu titik timeline (dukungan `<video>` sudah siap di `media.type`).
3. **Preload aset** dengan indikator kecil di scene 01 untuk koneksi seluler lambat.
4. **Musik per-scene** (volume berbeda di scene gelap vs scene bunga).
5. **Mode "kirim ke WhatsApp"** setelah strip jadi (Web Share sudah ada, tinggal teks ajakan).

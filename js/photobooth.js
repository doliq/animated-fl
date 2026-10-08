/* ============================================================================
   photobooth.js — Scene 07 (Photobooth).
   Ambil 3 foto dari kamera (atau pilih dari galeri), beri filter + bingkai,
   lalu susun jadi photo strip yang bisa disimpan/dibagikan.
   Semua proses terjadi di perangkat: tidak ada foto yang dikirim ke mana pun.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;

  /* dipakai scene ruangan untuk memajang strip yang baru dibuat */
  LOVE.photobooth = LOVE.photobooth || { lastStrip: null };

  var SHOT_W = 900, SHOT_H = 675;      // 4:3
  var STRIP_MARGIN = 38, STRIP_GAP = 18;
  var CAPTION_H = 156;

  var root, video, still, count, flash, poseEl, dotsEl, statusEl;
  var startBtn, pickBtn, fileInput, retakeBtn, dlLink, shareBtn, resultBox, stripImg;
  var frameEl, tintEl, captionEl;

  var stream = null;
  var filterIdx = 0, frameIdx = 0;
  var shots = [];               // canvas per foto
  var capturing = false;
  var timers = [];
  var stripCanvas = null, stripBlob = null, stripUrl = null;
  var mirror = true;
  var built = false;
  var bound = false;
  var paperImg = null, paperTried = false;

  function scene() { return document.querySelector('.scene[data-scene="photobooth"]'); }
  function F() { return C.photobooth.filters[filterIdx]; }
  function FR() { return C.photobooth.frames[frameIdx]; }

  function clearTimers() {
    for (var i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
    timers = [];
  }
  function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }

  /* ---------------- bangun UI ---------------- */
  function build() {
    if (built) return;
    root = scene();
    if (!root) return;
    var P = C.photobooth;

    var titleEl = root.querySelector('[data-pb-title]');
    if (titleEl) titleEl.textContent = P.title;
    var kicker = root.querySelector('.kicker');
    if (kicker) kicker.textContent = P.kicker;
    var lede = root.querySelector('[data-pb-hint]');
    if (lede) lede.textContent = P.hint;
    var fl = root.querySelector('[data-pb-filter-label]');
    if (fl) fl.textContent = P.filterLabel;
    var rl = root.querySelector('[data-pb-frame-label]');
    if (rl) rl.textContent = P.frameLabel;

    video = root.querySelector('.pb-video');
    still = root.querySelector('.pb-still');
    count = root.querySelector('.pb-count');
    flash = root.querySelector('.pb-flash');
    poseEl = root.querySelector('.pb-pose');
    dotsEl = root.querySelector('.pb-shotdots');
    statusEl = root.querySelector('.pb-status');
    startBtn = root.querySelector('[data-pb-start]');
    pickBtn = root.querySelector('[data-pb-pick]');
    fileInput = root.querySelector('.pb-file');
    retakeBtn = root.querySelector('[data-pb-retake]');
    dlLink = root.querySelector('[data-pb-download]');
    shareBtn = root.querySelector('[data-pb-share]');
    resultBox = root.querySelector('.pb-result');
    stripImg = root.querySelector('.pb-strip');
    frameEl = root.querySelector('.pb-frame');
    tintEl = root.querySelector('.pb-tint');
    captionEl = root.querySelector('.pb-frame-caption');
    if (captionEl) captionEl.textContent = P.stripCaption;

    /* chip filter & bingkai — dibersihkan dulu supaya tidak menumpuk
       kalau scene ini dibangun ulang (mis. setelah tombol ulangi) */
    var fbox = root.querySelector('[data-pb-filters]');
    var bbox = root.querySelector('[data-pb-frames]');
    var i;
    fbox.innerHTML = '';
    bbox.innerHTML = '';
    for (i = 0; i < P.filters.length; i++) fbox.appendChild(chip(P.filters[i].name, i, 'filter'));
    for (i = 0; i < P.frames.length; i++) bbox.appendChild(chip(P.frames[i].name, i, 'frame'));
    markChips('filter', filterIdx);
    markChips('frame', frameIdx);

    /* titik jumlah foto */
    var d = '';
    for (i = 0; i < P.shots; i++) d += '<i></i>';
    dotsEl.innerHTML = d;

    if (startBtn) startBtn.textContent = P.start;
    if (pickBtn) pickBtn.textContent = P.useFile;
    if (retakeBtn) retakeBtn.textContent = P.retake;
    if (dlLink) dlLink.textContent = P.download;
    if (shareBtn) shareBtn.textContent = P.share;
    var nextBtn = root.querySelector('[data-pb-next]');
    if (nextBtn) nextBtn.textContent = P.next;

    if (!bound) { bindEvents(); bound = true; }
    applyFilterPreview();
    applyFramePreview();
    built = true;
  }

  function chip(name, idx, kind) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (idx === 0 ? ' is-on' : '');
    b.textContent = name;
    b.setAttribute('data-kind', kind);
    b.setAttribute('data-idx', idx);
    return b;
  }

  function bindEvents() {
    root.querySelector('[data-pb-filters]').addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.chip') : null;
      if (!c) return;
      filterIdx = parseInt(c.getAttribute('data-idx'), 10);
      markChips('filter', filterIdx);
      applyFilterPreview();
      if (shots.length) { if (stripImg) stripImg.classList.add('is-stale'); }
    });

    root.querySelector('[data-pb-frames]').addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.chip') : null;
      if (!c) return;
      frameIdx = parseInt(c.getAttribute('data-idx'), 10);
      markChips('frame', frameIdx);
      applyFramePreview();
      if (shots.length) compose();
    });

    if (startBtn) startBtn.addEventListener('click', startSession);
    if (pickBtn) pickBtn.addEventListener('click', function () { fileInput.click(); });
    if (fileInput) fileInput.addEventListener('change', onFiles);
    if (retakeBtn) retakeBtn.addEventListener('click', resetSession);
    if (dlLink) dlLink.addEventListener('click', function (e) {
      if (!stripBlob) { e.preventDefault(); return; }
      A.sfx.tap();
    });
    if (shareBtn) shareBtn.addEventListener('click', shareStrip);

    var nextBtn = root.querySelector('[data-pb-next]');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      A.sfx.tap();
      S.complete('photoTaken', 'world');
    });
  }

  function markChips(kind, idx) {
    var chips = root.querySelectorAll('.chip[data-kind="' + kind + '"]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-on', parseInt(chips[i].getAttribute('data-idx'), 10) === idx);
    }
  }

  /* pratinjau langsung: filter & bingkai ikut terlihat sebelum difoto */
  function applyFilterPreview() {
    var f = F();
    if (video) video.style.filter = (!f.css || f.css === 'none') ? 'none' : f.css;
    if (tintEl) tintEl.style.background = f.tint || 'transparent';
  }

  function applyFramePreview() {
    if (frameEl) frameEl.setAttribute('data-frame', FR().id);
  }

  function setStatus(msg, warn) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('is-warn', !!warn);
  }

  /* ---------------- kamera ---------------- */
  function cameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function openCamera() {
    if (!cameraSupported()) {
      setStatus(C.photobooth.cameraDenied, true);
      return Promise.resolve(false);
    }
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    }).then(function (s) {
      stream = s;
      if (video) {
        video.srcObject = s;
        video.classList.toggle('is-nomirror', !mirror);
        applyFilterPreview();
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
      return true;
    }).catch(function () {
      setStatus(C.photobooth.cameraDenied, true);
      if (pickBtn) pickBtn.classList.add('is-highlight');
      return false;
    });
  }

  function closeCamera() {
    if (stream) {
      var tracks = stream.getTracks ? stream.getTracks() : [];
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  /* ---------------- ambil foto ---------------- */
  function startSession() {
    if (capturing) return;
    A.unlock();
    setStatus('');
    resultBox.hidden = true;
    if (stripImg) stripImg.hidden = false;
    shots = [];
    updateDots();

    openCamera().then(function (ok) {
      if (!ok) return;
      capturing = true;
      if (startBtn) startBtn.disabled = true;
      shootSequence(0);
    });
  }

  function shootSequence(n) {
    var P = C.photobooth;
    if (n >= P.shots) {
      capturing = false;
      if (startBtn) startBtn.disabled = false;
      if (poseEl) poseEl.textContent = '';
      compose();
      return;
    }
    if (poseEl) poseEl.textContent = P.pose[n] || '';

    var left = P.countdown;
    (function tick() {
      if (left > 0) {
        if (count) {
          count.textContent = left;
          count.classList.remove('is-on');
          void count.offsetWidth;
          count.classList.add('is-on');
        }
        A.sfx.tap();
        left--;
        later(tick, 900);
      } else {
        grab(n);
        later(function () { shootSequence(n + 1); }, 1150);
      }
    })();
  }

  function grab(n) {
    if (!video) return;
    A.sfx.shutter();
    if (flash) { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); }

    var c = document.createElement('canvas');
    c.width = SHOT_W; c.height = SHOT_H;
    drawSource(c, video, mirror);

    shots.push(c);
    updateDots();

    if (still) {
      still.src = c.toDataURL('image/jpeg', 0.86);
      still.classList.add('is-shown');
      still.classList.toggle('is-nomirror', !mirror);
      later(function () { still.classList.remove('is-shown'); }, 780);
    }
  }

  function drawSource(canvas, source, doMirror) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var sw = source.videoWidth || source.naturalWidth || source.width;
    var sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) { sw = W; sh = H; }

    ctx.save();
    var f = F();
    if (f.css && f.css !== 'none' && 'filter' in ctx) ctx.filter = f.css;
    if (doMirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    var scale = Math.max(W / sw, H / sh);
    var dw = sw * scale, dh = sh * scale;
    try {
      ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch (e) { /* sumber belum siap */ }
    ctx.restore();

    if (f.tint) { ctx.fillStyle = f.tint; ctx.fillRect(0, 0, W, H); }
    if (FR().id === 'hearts' || FR().id === 'garden') {
      /* sedikit vignette supaya terasa seperti foto cetak */
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(60,20,40,0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function updateDots() {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('i');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-on', i < shots.length);
  }

  /* ---------------- pilih foto dari galeri ---------------- */
  function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) return;
    A.unlock();
    setStatus('Preparing photos…');
    var pending = files.length;
    var max = C.photobooth.shots;
    shots = [];
    updateDots();

    files.slice(0, max).forEach(function (file) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = SHOT_W; c.height = SHOT_H;
        drawSource(c, img, false);
        shots.push(c);
        updateDots();
        URL.revokeObjectURL(url);
        if (--pending <= 0) finishFiles();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        if (--pending <= 0) finishFiles();
      };
      img.src = url;
    });

    fileInput.value = '';
  }

  function finishFiles() {
    if (!shots.length) { setStatus('Those photos could not be read. Pick them again.', true); return; }
    setStatus('');
    compose();
  }

  /* ---------------- susun photo strip ---------------- */
  function loadPaper(cb) {
    if (paperImg || paperTried) { cb(paperImg); return; }
    paperTried = true;
    var img = new Image();
    img.onload = function () { paperImg = img; cb(img); };
    img.onerror = function () { paperImg = null; cb(null); };
    img.src = 'assets/img/paper.jpg';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------- gaya bingkai strip ----------------
     cinema  : tiket bioskop (dari referensi "Theather Show")
     polaroid: foto kutub putih miring + tiket day pass (dari "Catch Yours")
     noir    : strip hitam, foto hitam-putih, wordmark besar (dari "Moo")
     sisanya : gaya lama (paper, plain, hearts, garden)                    */
  var BASE_W = 900;                             /* lebar acuan desain strip */
  var THEMES = {
    cinema:   { pad: 82, gap: 20, radius: 3, head: 218, tail: 208, matte: 0, tilt: 0, bg: 'cinema', cap: 'none' },
    polaroid: { pad: 58, gap: 46, radius: 2, head: 150, tail: 216, matte: 36, tilt: 0.02, bg: 'cream', cap: 'none' },
    noir:     { pad: 30, gap: 22, radius: 2, head: 44, tail: 260, matte: 0, tilt: 0, gray: true, bg: 'black', cap: 'none' },
    paper:    { pad: 38, gap: 18, radius: 10, head: 26, tail: 156, matte: 0, tilt: 0, bg: 'paper', cap: 'script',
                capColor: '#b3285a', subColor: 'rgba(150,95,120,.85)', edge: 'rgba(120,80,100,.28)' },
    plain:    { pad: 46, gap: 24, radius: 2, head: 24, tail: 150, matte: 0, tilt: 0, bg: 'white', cap: 'sans',
                keyline: '#141414' },
    hearts:   { pad: 34, gap: 18, radius: 10, head: 24, tail: 156, matte: 0, tilt: 0, bg: 'dark', cap: 'script',
                capColor: '#ffe6c8', subColor: 'rgba(255,230,200,.7)', edge: 'rgba(255,226,184,.5)' },
    garden:   { pad: 34, gap: 18, radius: 10, head: 24, tail: 156, matte: 0, tilt: 0, bg: 'paperImg', cap: 'script',
                capColor: '#b3285a', subColor: 'rgba(150,95,120,.85)', edge: 'rgba(120,80,100,.28)' }
  };
  var BG_COLOR = {
    cinema: '#7d1a1a', cream: '#f4ede3', black: '#0b0b0b',
    dark: '#2a1420', white: '#ffffff', paperImg: '#ffe9f1', paper: '#fffaf2'
  };

  function scalePx(v, W) { return Math.round(v * W / BASE_W); }

  function drawStripBg(ctx, T, W, H, paper) {
    if (T.bg === 'paperImg' && paper) {
      var sc = Math.max(W / paper.width, H / paper.height);
      ctx.drawImage(paper, (W - paper.width * sc) / 2, (H - paper.height * sc) / 2,
                    paper.width * sc, paper.height * sc);
      return;
    }
    if (T.bg === 'cinema') { drawCinemaBase(ctx, W, H); return; }
    ctx.fillStyle = BG_COLOR[T.bg] || '#fffaf2';
    ctx.fillRect(0, 0, W, H);
  }

  /* kerangka tiket digambar SEBELUM foto, supaya tidak menutupinya */
  function drawCinemaBase(ctx, W, H) {
    var inset = scalePx(16, W);
    ctx.fillStyle = '#7d1a1a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fdf4e3';
    roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, scalePx(12, W));
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = '#7d1a1a';
    ctx.lineWidth = 2;
    var inn = inset + scalePx(10, W);
    roundRect(ctx, inn, inn, W - inn * 2, H - inn * 2, scalePx(8, W));
    ctx.stroke();
    ctx.restore();

    /* lubang tiket di sisi kiri & kanan */
    ctx.fillStyle = '#7d1a1a';
    for (var yy = inset + scalePx(60, W); yy < H - inset - scalePx(30, W); yy += scalePx(74, W)) {
      ctx.beginPath(); ctx.arc(inset, yy, scalePx(7, W), 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(W - inset, yy, scalePx(7, W), 0, 6.283); ctx.fill();
    }
  }

  function drawStripShot(ctx, T, shot, x, y, w, h, i, P) {
    /* polaroid: foto di atas kertas putih, sedikit miring, ada tulisan tangan */
    if (T.matte) {
      var m = 14;
      var pw = w + m * 2, ph = h + T.matte + m * 2;
      ctx.save();
      ctx.translate(x + w / 2, y + ph / 2);
      ctx.rotate((i % 2 === 0 ? -1 : 1) * T.tilt);
      ctx.shadowColor = 'rgba(90,60,50,.22)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#fffdfa';
      roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 3);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.save();
      roundRect(ctx, -w / 2, -ph / 2 + m, w, h, 2);
      ctx.clip();
      ctx.drawImage(shot, -w / 2, -ph / 2 + m, w, h);
      ctx.restore();

      var label = (P.pose && P.pose[i]) ? P.pose[i] : '';
      if (label) {
        ctx.fillStyle = 'rgba(96,72,80,.8)';
        ctx.font = 'italic 28px "Segoe Script", "Brush Script MT", cursive, serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, ph / 2 - T.matte * 0.4);
      }
      ctx.restore();
      return;
    }

    ctx.save();
    if (T.gray && 'filter' in ctx) ctx.filter = 'grayscale(1) contrast(1.05)';
    roundRect(ctx, x, y, w, h, T.radius);
    ctx.clip();
    ctx.drawImage(shot, x, y, w, h);
    ctx.restore();

    ctx.save();
    roundRect(ctx, x, y, w, h, T.radius);
    ctx.strokeStyle = T.keyline || T.edge || 'rgba(120,80,100,.28)';
    ctx.lineWidth = T.keyline ? 2 : (T.bg === 'cinema' ? 4 : 2);
    ctx.stroke();
    ctx.restore();

    /* nomor foto kecil hanya di gaya lama */
    if (T.bg === 'paper' || T.bg === 'white' || T.bg === 'paperImg') {
      ctx.save();
      ctx.font = '600 20px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(120,80,100,.6)';
      ctx.textAlign = 'right';
      ctx.fillText(('0' + (i + 1)).slice(-2), x + w - 14, y + 30);
      ctx.restore();
    }
  }

  function drawStripDeco(ctx, T, W, H, o) {
    var P = o.P;
    if (T.bg === 'cinema') return decoCinema(ctx, T, W, H, o);
    if (T.bg === 'cream') return decoPolaroid(ctx, T, W, H, o);
    if (T.bg === 'black') return decoNoir(ctx, T, W, H, o);

    /* --- caption --- */
    var capY = o.photosBottom + scalePx(62, W);
    ctx.textAlign = 'center';

    if (T.cap === 'sans') {
      /* gaya minimalis: huruf kapital tanpa hiasan */
      ctx.fillStyle = '#141414';
      ctx.font = '700 ' + scalePx(32, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(String(P.stripCaption).toUpperCase(), W / 2, capY);
      ctx.fillStyle = '#6b6b6b';
      ctx.font = '500 ' + scalePx(20, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(P.stripSub, W / 2, capY + scalePx(40, W));
      ctx.fillText(o.stamp, W / 2, capY + scalePx(70, W));
    } else {
      ctx.fillStyle = T.capColor;
      ctx.font = 'italic 700 ' + scalePx(56, W) + 'px "Segoe Script", "Brush Script MT", cursive, serif';
      ctx.fillText(P.stripCaption, W / 2, capY);
      ctx.fillStyle = T.subColor;
      ctx.font = '500 ' + scalePx(24, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(P.stripSub, W / 2, capY + scalePx(46, W));
      ctx.font = '500 ' + scalePx(20, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(o.stamp, W / 2, capY + scalePx(82, W));
    }

    if (T.bg === 'dark') {
      var hc = 'rgba(255,158,196,.85)';
      drawHeart(ctx, scalePx(54, W), scalePx(46, W), scalePx(13, W), hc);
      drawHeart(ctx, W - scalePx(54, W), scalePx(46, W), scalePx(13, W), hc);
      drawHeart(ctx, scalePx(54, W), H - scalePx(54, W), scalePx(11, W), hc);
      drawHeart(ctx, W - scalePx(54, W), H - scalePx(54, W), scalePx(11, W), hc);
    } else if (T.bg === 'paperImg') {
      drawFlower(ctx, scalePx(56, W), H - scalePx(96, W), scalePx(16, W), '#e2719c');
      drawFlower(ctx, W - scalePx(58, W), H - scalePx(104, W), scalePx(13, W), '#d98bb2');
    } else if (T.bg === 'paper') {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,150,170,.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(scalePx(14, W), scalePx(14, W), W - scalePx(28, W), H - scalePx(28, W));
      ctx.restore();
    }
  }

  /* --- tiket bioskop: hanya isi kepala & kaki (kerangkanya sudah digambar lebih dulu) --- */
  function decoCinema(ctx, T, W, H, o) {
    var P = o.P, pad = o.pad;
    var inset = scalePx(16, W);

    ctx.textAlign = 'center';
    /* bintang kecil */
    ctx.fillStyle = '#7d1a1a';
    ctx.font = scalePx(26, W) + 'px Georgia, serif';
    ctx.fillText('\u2605  \u2605', W / 2, inset + scalePx(58, W));

    /* judul */
    ctx.font = 'italic 700 ' + scalePx(62, W) + 'px "Segoe Script", "Brush Script MT", cursive, serif';
    ctx.fillText(P.stripCaption, W / 2, inset + scalePx(124, W));

    /* tabel kecil: Shot / Date / Time */
    var tx = pad + scalePx(6, W);
    var tw = W - tx * 2;
    var ty = inset + scalePx(146, W);
    var th = scalePx(64, W);
    var cells = [
      ['Shot', ('0' + o.n).slice(-2)],
      ['Date', o.stamp],
      ['Time', o.clock]
    ];
    var cw = tw / cells.length;
    ctx.save();
    ctx.strokeStyle = '#7d1a1a';
    ctx.lineWidth = 2;
    roundRect(ctx, tx, ty, tw, th, scalePx(4, W));
    ctx.stroke();
    for (var c = 1; c < cells.length; c++) {
      ctx.beginPath();
      ctx.moveTo(tx + cw * c, ty);
      ctx.lineTo(tx + cw * c, ty + th);
      ctx.stroke();
    }
    ctx.restore();
    for (var k = 0; k < cells.length; k++) {
      var cx = tx + cw * k + cw / 2;
      ctx.fillStyle = '#7d1a1a';
      ctx.font = '600 ' + scalePx(18, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cells[k][0], cx, ty + scalePx(24, W));
      ctx.font = '700 ' + scalePx(30, W) + 'px Georgia, serif';
      ctx.fillText(cells[k][1], cx, ty + scalePx(53, W));
    }

    /* pita bawah + logo */
    var bandY = o.photosBottom + scalePx(50, W);
    ctx.save();
    ctx.strokeStyle = '#7d1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, bandY - scalePx(26, W));
    ctx.lineTo(W - pad, bandY - scalePx(26, W));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, bandY + scalePx(14, W));
    ctx.lineTo(W - pad, bandY + scalePx(14, W));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#7d1a1a';
    ctx.font = '600 ' + scalePx(20, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SAVE THE BEST MOMENT  \u2605  SAVE THE BEST MOMENT', W / 2, bandY + scalePx(4, W));

    ctx.font = 'italic 700 ' + scalePx(74, W) + 'px "Segoe Script", "Brush Script MT", cursive, serif';
    ctx.fillText((C.sender || 'Oliq') + '.', W / 2, H - inset - scalePx(46, W));
  }

  /* --- polaroid + tiket day pass --- */
  function decoPolaroid(ctx, T, W, H, o) {
    var P = o.P, pad = o.pad;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a5303f';
    ctx.font = 'italic 700 ' + scalePx(78, W) + 'px "Segoe Script", "Brush Script MT", cursive, serif';
    ctx.fillText(P.stripCaption, W / 2, o.pad + scalePx(84, W));

    drawHeart(ctx, pad + scalePx(6, W), pad + scalePx(18, W), scalePx(15, W), 'rgba(165,48,63,.55)');
    drawHeart(ctx, W - pad - scalePx(6, W), pad + scalePx(96, W), scalePx(12, W), 'rgba(165,48,63,.45)');

    /* label PHOTO PLACE */
    ctx.fillStyle = '#a5303f';
    ctx.font = '700 ' + scalePx(26, W) + 'px Georgia, serif';
    ctx.fillText('PHOTO PLACE', W / 2, o.photosBottom + scalePx(48, W));

    /* tiket day pass */
    var tw = W - pad * 2 - scalePx(20, W);
    var th = scalePx(112, W);
    var tx = (W - tw) / 2;
    var ty = o.photosBottom + scalePx(74, W);
    ctx.save();
    ctx.fillStyle = '#f7d6dc';
    roundRect(ctx, tx, ty, tw, th, scalePx(6, W));
    ctx.fill();
    ctx.strokeStyle = 'rgba(165,48,63,.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, tx + scalePx(5, W), ty + scalePx(5, W), tw - scalePx(10, W), th - scalePx(10, W), scalePx(4, W));
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#7d1f2c';
    ctx.font = '700 ' + scalePx(34, W) + 'px Georgia, serif';
    ctx.fillText('PHOTO TICKET', tx + scalePx(20, W), ty + scalePx(48, W));
    ctx.font = '500 ' + scalePx(17, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Day / Month / Year', tx + scalePx(20, W), ty + scalePx(80, W));

    ctx.save();
    ctx.strokeStyle = 'rgba(165,48,63,.5)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.56, ty + scalePx(12, W));
    ctx.lineTo(tx + tw * 0.56, ty + th - scalePx(12, W));
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'right';
    ctx.font = '700 ' + scalePx(30, W) + 'px Georgia, serif';
    ctx.fillText('DAY PASS', tx + tw - scalePx(20, W), ty + scalePx(46, W));
    ctx.font = '500 ' + scalePx(19, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(o.stamp, tx + tw - scalePx(20, W), ty + scalePx(78, W));
  }

  /* --- noir: hitam, wordmark besar terpotong --- */
  function decoNoir(ctx, T, W, H, o) {
    var P = o.P, pad = o.pad;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.font = '500 ' + scalePx(20, W) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(o.stamp, pad, o.photosBottom + scalePx(46, W));

    /* wordmark besar, bagian bawahnya sengaja terpotong seperti referensi */
    ctx.fillStyle = '#f2f2f2';
    ctx.font = '700 ' + scalePx(210, W) + 'px Georgia, "Times New Roman", serif';
    ctx.fillText(P.stripCaption, pad - scalePx(8, W), H + scalePx(30, W));
  }

  function compose() {
    if (!shots.length) return;
    var P = C.photobooth;
    var id = FR().id;
    var T = THEMES[id] || THEMES.paper;

    loadPaper(function (paper) {
      var n = shots.length;
      var W = SHOT_W;
      var pad = scalePx(T.pad, W);
      var photoW = W - pad * 2;
      var photoH = Math.round(photoW * 0.75);
      var slotH = photoH + T.matte;
      var head = scalePx(T.head, W);
      var tail = scalePx(T.tail, W);
      var H = pad + head + n * slotH + (n - 1) * T.gap + tail + pad;

      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      var ctx = cv.getContext('2d');

      var d = new Date();
      var stamp = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
      var clock = ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);

      drawStripBg(ctx, T, W, H, paper);

      var y = pad + head;
      var photoTop = y;
      for (var i = 0; i < n; i++) {
        drawStripShot(ctx, T, shots[i], pad, y, photoW, photoH, i, P);
        y += slotH + T.gap;
      }
      var photosBottom = y - T.gap;

      drawStripDeco(ctx, T, W, H, {
        pad: pad, photoW: photoW, photoH: photoH, n: n, P: P,
        photoTop: photoTop, photosBottom: photosBottom,
        stamp: stamp, clock: clock
      });

      /* --- tampilkan hasil --- */
      stripCanvas = cv;
      stripImg.src = cv.toDataURL('image/jpeg', 0.92);
      stripImg.classList.remove('is-stale');
      resultBox.hidden = false;
      var wrap = root.querySelector('.pb-wrap');
      if (wrap) wrap.classList.add('is-result');
      if (root) root.classList.add('is-result');
      setStatus('');
      S.mark('photoTaken');
      A.sfx.chime();

      cv.toBlob(function (blob) {
        if (stripUrl) URL.revokeObjectURL(stripUrl);
        stripBlob = blob;
        stripUrl = URL.createObjectURL(blob);
        if (LOVE.photobooth) LOVE.photobooth.lastStrip = stripUrl;
        if (LOVE.gallery) LOVE.gallery.add(blob);
        if (dlLink) {
          dlLink.href = stripUrl;
          dlLink.setAttribute('download', 'photobooth-dira-oliq-' + Date.now() + '.jpg');
          dlLink.hidden = false;
        }
        if (shareBtn && stripBlobFile(blob)) shareBtn.hidden = false;
      }, 'image/jpeg', 0.92);

      var inner = root.querySelector('.scene-inner');
      if (inner) inner.scrollTop = 0;
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function drawHeart(ctx, x, y, s, col) {
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.25, x - s * 0.5, y - s * 0.95, x, y - s * 0.25);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 0.95, x + s, y - s * 0.25, x, y + s * 0.35);
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col;
    for (var i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.7, s * 0.42, s * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd764';
    ctx.fill();
    ctx.restore();
  }

  function stripBlobFile(blob) {
    try {
      if (!window.File || !navigator.canShare) return null;
      return new File([blob], 'photobooth.jpg', { type: 'image/jpeg' });
    } catch (e) { return null; }
  }

  function shareStrip() {
    var file = stripBlob ? stripBlobFile(stripBlob) : null;
    if (!file) return;
    if (!navigator.canShare({ files: [file] })) return;
    A.sfx.tap();
    navigator.share({
      files: [file],
      title: 'Photobooth',
      text: C.photobooth.stripSub
    }).catch(function () {});
  }

  function resetSession() {
    clearTimers();
    capturing = false;
    shots = [];
    stripCanvas = null; stripBlob = null;
    var wrap = root ? root.querySelector('.pb-wrap') : null;
    if (wrap) wrap.classList.remove('is-result');
    if (root) root.classList.remove('is-result');
    if (stripImg) stripImg.classList.remove('is-stale');
    if (resultBox) resultBox.hidden = true;
    if (startBtn) startBtn.disabled = false;
    if (count) count.classList.remove('is-on');
    if (poseEl) poseEl.textContent = '';
    updateDots();
    setStatus('');
    openCamera();
  }

  /* ---------------- daftar scene ---------------- */
  LOVE.state.register('photobooth', {
    onEnter: function () {
      build();
      resetSession();
    },
    onLeave: function () {
      clearTimers();
      capturing = false;
      closeCamera();
    },
    onReplay: function () {
      clearTimers();
      capturing = false;
      closeCamera();
      shots = [];
      stripBlob = null;
      if (stripUrl) { URL.revokeObjectURL(stripUrl); stripUrl = null; }
      if (LOVE.photobooth) LOVE.photobooth.lastStrip = null;
      if (resultBox) resultBox.hidden = true;
      if (stripImg) stripImg.removeAttribute('src');
      if (dlLink) { dlLink.removeAttribute('href'); dlLink.hidden = false; }
      if (shareBtn) shareBtn.hidden = true;
      var wrap = root ? root.querySelector('.pb-wrap') : null;
      if (wrap) wrap.classList.remove('is-result');
      if (statusEl) statusEl.textContent = '';
      if (count) count.classList.remove('is-on');
      if (poseEl) poseEl.textContent = '';
      if (startBtn) startBtn.disabled = false;
      updateDots();
    }
  });
})();

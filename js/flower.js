/* ============================================================================
   flower.js — Scene 04: SATU bunga.
   Kuncup → tap 1 daun muncul → tap 2 batang tumbuh → tap 3 kelopak mekar,
   lalu kelopaknya menjadi partikel yang memenuhi layar.
   Juga dipakai Scene 08 (final): hanya bunganya yang tersisa di tengah.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio;

  var canvas = document.getElementById('flowerCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  var taps = 0;                                  // 0..3
  var p = { stem: 0, leaf: 0, bloom: 0 };         // nilai animasi (0..1)
  var t = { stem: 0, leaf: 0, bloom: 0 };         // target
  var parts = [];
  var garden = [];                                // bunga kecil yang ditanam di sekeliling
  var headPos = { x: 0, y: 0, r: 0 };             // posisi kepala bunga (untuk hit-test tap)
  var blown = false;
  var mode = 'flower';                            // 'flower' | 'final'
  var glow = 0;

  var PETAL = ['#e2566f', '#f0617a', '#d8455f', '#ff8296'];
  var LEAF = '#4c9445';
  var STEM = '#3f7d3a';

  function el(id) { return document.getElementById(id); }

  /* ---------------- util gambar ---------------- */
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * f);
    var g = Math.round(((n >> 8) & 255) * f);
    var b = Math.round((n & 255) * f);
    return 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')';
  }

  function layoutNow() {
    if (mode === 'final') {
      /* lebih kecil dan lebih ke atas supaya kalimat penutup tidak menutupinya */
      return { bx: W / 2, by: H * 0.40, stemH: H * 0.20, scale: 0.66 };
    }
    return { bx: W / 2, by: H * 0.80, stemH: H * 0.12 + p.stem * H * 0.30, scale: 1 };
  }

  /* ---------------- bunga kecil di sekeliling ---------------- */
  function plant(x, y) {
    if (garden.length > 26) garden.shift();
    var baseY = H * 0.90;
    /* tinggi batang dibatasi supaya tampak seperti taman, bukan stalk tinggi */
    var h = Math.max(H * 0.12, Math.min(H * 0.40, baseY - y));
    garden.push({
      x: Math.max(14, Math.min(W - 14, x)),
      y: baseY - h,
      start: performance.now(),
      dur: 1000 + Math.random() * 500,
      size: Math.min(W, H) * (0.05 + Math.random() * 0.028),
      col: PETAL[(Math.random() * PETAL.length) | 0],
      lean: -10 + Math.random() * 20,
      sway: Math.random() * 6.283
    });
    if (A && A.sfx) A.sfx.pop();
  }

  function drawGarden() {
    if (!garden.length) return;
    var now = performance.now();
    var baseY = H * 0.90;
    for (var i = 0; i < garden.length; i++) {
      var q = garden[i];
      var t = clamp((now - q.start) / q.dur);
      var e = easeOutCubic(t);
      var headY = baseY - (baseY - q.y) * e;
      var sway = Math.sin(now / 1200 + q.sway) * 2.5;
      var headX = q.x + sway * 0.5 + q.lean * 0.4;

      ctx.save();
      ctx.strokeStyle = STEM;
      ctx.lineWidth = Math.max(1.6, q.size * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(q.x, baseY);
      ctx.quadraticCurveTo(q.x + q.lean * 0.5, baseY - (baseY - headY) * 0.55, headX, headY);
      ctx.stroke();
      ctx.restore();

      if (t > 0.4) {
        var lp = easeOutCubic(clamp((t - 0.4) / 0.4));
        drawLeaf(q.x + (headX - q.x) * 0.55, baseY - (baseY - headY) * 0.55,
                 -2.2, q.size * 1.3, q.size * 0.42, lp);
        drawLeaf(q.x + (headX - q.x) * 0.78, baseY - (baseY - headY) * 0.78,
                 -0.9, q.size * 1.15, q.size * 0.38, lp);
      }

      drawBloom(headX, headY, q.size * e, q.sway, q.col);
    }
  }

  /* ---------------- bagian bunga ---------------- */
  function drawSoil(bx, by, s) {
    var w = Math.min(W * 0.34, 190) * s;
    ctx.save();
    var g = ctx.createLinearGradient(bx, by - 14, bx, by + 26);
    g.addColorStop(0, '#4a3128');
    g.addColorStop(1, '#261813');
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, w * 0.5, w * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawStem(x, y, bx, by, prog) {
    if (prog <= 0.01) return;
    var h = by - y;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = STEM;
    ctx.lineWidth = Math.max(3, Math.min(W * 0.012, 7));
    ctx.beginPath();
    ctx.moveTo(bx, by);
    var steps = 18;
    for (var i = 1; i <= steps; i++) {
      var f = (i / steps) * prog;
      var px = bx + Math.sin(f * 2.1) * (bx - x) * 0.35;
      var py = by - h * f;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawLeaf(x, y, ang, len, wid, prog) {
    if (prog <= 0.02) return;
    var L = len * easeOutCubic(prog), Wd = wid * easeOutCubic(prog);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.45, -Wd, L, 0);
    ctx.quadraticCurveTo(L * 0.45, Wd, 0, 0);
    ctx.closePath();
    ctx.fillStyle = LEAF;
    ctx.fill();
    ctx.strokeStyle = shade(LEAF, 0.72);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L * 0.08, 0);
    ctx.lineTo(L * 0.88, 0);
    ctx.strokeStyle = shade(LEAF, 0.78);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  function drawBud(x, y, s, open) {
    var w = s * (0.30 + open * 0.16);
    var h = s * 0.60;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.bezierCurveTo(x + w, y - h * 0.62, x + w * 0.86, y + h * 0.02, x, y + h * 0.16);
    ctx.bezierCurveTo(x - w * 0.86, y + h * 0.02, x - w, y - h * 0.62, x, y - h);
    ctx.closePath();
    var g = ctx.createLinearGradient(x - w, y - h, x + w, y + h * 0.2);
    g.addColorStop(0, '#f2798c');
    g.addColorStop(0.55, '#d8455f');
    g.addColorStop(1, '#a72a45');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 30, 55, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    /* garis kelopak yang masih tertutup */
    ctx.strokeStyle = 'rgba(255, 220, 230, 0.35)';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.92);
    ctx.lineTo(x, y + h * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.82);
    ctx.quadraticCurveTo(x + w * 0.55, y - h * 0.4, x + w * 0.62, y + h * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.82);
    ctx.quadraticCurveTo(x - w * 0.55, y - h * 0.4, x - w * 0.62, y + h * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  function drawBloom(x, y, R, rot, col) {
    if (R <= 1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    var rings = [
      { n: 8, dist: 0.62, pr: 0.42, sh: 1.10, r0: 0.00 },
      { n: 7, dist: 0.47, pr: 0.36, sh: 0.96, r0: 0.42 },
      { n: 6, dist: 0.32, pr: 0.31, sh: 0.82, r0: 0.86 },
      { n: 5, dist: 0.17, pr: 0.26, sh: 0.68, r0: 1.24 }
    ];
    for (var i = 0; i < rings.length; i++) {
      var rg = rings[i];
      ctx.fillStyle = shade(col, rg.sh);
      ctx.strokeStyle = shade(col, rg.sh * 0.66);
      ctx.lineWidth = Math.max(0.7, R * 0.045);
      for (var k = 0; k < rg.n; k++) {
        ctx.save();
        ctx.rotate((k / rg.n) * Math.PI * 2 + rg.r0);
        ctx.beginPath();
        ctx.ellipse(0, -rg.dist * R, rg.pr * R, rg.pr * R * 1.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = shade(col, 0.5);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- partikel kelopak ---------------- */
  function spawnBurst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1.6 + Math.random() * 4.4;
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.8,
        r: 3 + Math.random() * 6,
        rot: Math.random() * 6.283,
        vr: -0.06 + Math.random() * 0.12,
        col: PETAL[(Math.random() * PETAL.length) | 0],
        a: 0.55 + Math.random() * 0.45,
        fall: 0.03 + Math.random() * 0.05
      });
    }
  }

  function spawnAmbient() {
    if (parts.length > 160) return;
    parts.push({
      x: Math.random() * W,
      y: -14,
      vx: -0.35 + Math.random() * 0.7,
      vy: 0.5 + Math.random() * 0.9,
      r: 3 + Math.random() * 5,
      rot: Math.random() * 6.283,
      vr: -0.03 + Math.random() * 0.06,
      col: PETAL[(Math.random() * PETAL.length) | 0],
      a: 0.4 + Math.random() * 0.45,
      fall: 0
    });
  }

  function updateParts() {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.vy += q.fall || 0;
      if (q.vy > 1.6) q.vy = 1.6;
      q.x += q.vx + Math.sin((q.rot + i) * 0.7) * 0.5;
      q.y += q.vy;
      q.rot += q.vr;
      if (q.y > H + 30) { parts.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = q.a;
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.col;
      ctx.beginPath();
      ctx.ellipse(0, 0, q.r, q.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------- loop ---------------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame() {
    window.requestAnimationFrame(frame);
    if (!W) return;

    var scene = document.body.getAttribute('data-scene');
    if (scene !== 'flower' && scene !== 'final') return;

    var speed = reduce ? 1 : 0.06;
    p.stem += (t.stem - p.stem) * speed;
    p.leaf += (t.leaf - p.leaf) * speed;
    p.bloom += (t.bloom - p.bloom) * speed;

    var L = layoutNow();
    var bx = L.bx, by = L.by;
    var stemH = mode === 'final'
      ? L.stemH
      : (H * 0.12 + p.stem * H * 0.30);
    var headX = bx + (mode === 'final' ? 0 : Math.sin(performance.now() / 1600) * 3);
    var headY = by - stemH;
    var s = Math.min(W, H) * 0.185 * L.scale;
    headPos.x = headX;
    headPos.y = headY;
    headPos.r = s * 1.15;

    ctx.clearRect(0, 0, W, H);

    drawSoil(bx, by, L.scale);
    drawGarden();
    /* batang selalu tersambung dari tanah ke kuncup; yang bertambah adalah tingginya */
    drawStem(headX, headY, bx, by, 1);

    if (p.leaf > 0.02) {
      var l1f = 0.42, l2f = 0.66;
      drawLeaf(bx + (headX - bx) * l1f, by - stemH * l1f,
               -2.25, s * 1.5, s * 0.46, p.leaf);
      drawLeaf(bx + (headX - bx) * l2f, by - stemH * l2f,
               -0.86, s * 1.35, s * 0.42, p.leaf);
    }

    /* kuncup → mekar */
    var open = clamp(p.bloom);
    if (open < 0.98) {
      ctx.save();
      ctx.globalAlpha = 1 - easeOutCubic(open);
      drawBud(headX, headY, s * (1 + t.stem * 0.18), open);
      ctx.restore();
    }
    if (open > 0.02) {
      ctx.save();
      ctx.globalAlpha = easeOutCubic(open);
      drawBloom(headX, headY, s * (0.9 + 0.1 * open), 0.35, PETAL[0]);
      ctx.restore();
    }

    /* cahaya lembut mengajak ditap (sebelum mekar) */
    if (mode === 'flower' && taps < 3) {
      glow = 0.5 + 0.5 * Math.sin(performance.now() / 620);
      var r2 = s * (1.35 + 0.12 * glow);
      var g2 = ctx.createRadialGradient(headX, headY, s * 0.2, headX, headY, r2);
      g2.addColorStop(0, 'rgba(255, 190, 210, ' + (0.16 * glow).toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(255, 190, 210, 0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(headX, headY, r2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (blown && parts.length < 90 && Math.random() < 0.06) spawnAmbient();
    updateParts();
  }

  /* ---------------- kelopak menjadi partikel ---------------- */
  function burst() {
    if (blown) return;
    blown = true;
    var L = layoutNowFor();
    if (mode === 'flower') {
      spawnBurst(L.x, L.y, reduce ? 40 : 120);
    }
  }

  function layoutNowFor() {
    var stemH = H * 0.12 + p.stem * H * 0.30;
    return { x: W / 2, y: H * 0.80 - stemH };
  }

  /* ---------------- alur tap ---------------- */
  function setHint(txt, off, soft) {
    var hint = el('flowerHint');
    if (!hint) return;
    hint.textContent = txt || '';
    hint.classList.toggle('is-off', !!off);
    hint.classList.toggle('is-soft', !!soft);
  }

  function linesIn(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      (function (n, k) {
        window.setTimeout(function () { n.classList.add('is-in'); }, reduce ? 60 * k : 620 + 700 * k);
      })(nodes[i], i);
    }
  }

  function tap() {
    if (taps >= 3) return;
    taps++;
    A.sfx.pop();

    if (taps === 1) { t.leaf = 1; setHint(C.flower.steps[1]); return; }
    if (taps === 2) { t.stem = 1; t.leaf = 1; setHint(C.flower.steps[2]); return; }

    t.stem = 1; t.leaf = 1; t.bloom = 1;
    setHint('', true);
    onBloomed();
  }

  function onBloomed() {
    if (S) S.mark('flowerBloomed');
    if (A && A.sfx) A.sfx.bloom();

    var wrap = el('flowerLines');
    if (wrap) {
      wrap.innerHTML = '';
      for (var i = 0; i < C.flower.afterBloom.length; i++) {
        var pEl = document.createElement('p');
        pEl.textContent = C.flower.afterBloom[i];
        wrap.appendChild(pEl);
      }
      linesIn(wrap.querySelectorAll('p'));
    }

    window.setTimeout(function () {
      burst();
      setHint(C.flower.gardenHint || '', false, true);
      var next = el('flowerNext');
      if (next) {
        next.hidden = false;
        next.textContent = C.flower.next;
        window.setTimeout(function () { next.classList.add('is-in'); }, 80);
      }
    }, reduce ? 300 : 2200);
  }

  /* ---------------- masuk / reset ---------------- */
  function enter() {
    mode = 'flower';
    resize();
    if (taps < 3) { blown = false; parts = []; }
    if (taps >= 3) {
      /* sudah pernah mekar: tampilkan hasilnya langsung */
      p.stem = 1; p.leaf = 1; p.bloom = 1;
      var wrap = el('flowerLines');
      if (wrap && !wrap.innerHTML) {
        for (var i = 0; i < C.flower.afterBloom.length; i++) {
          var pe = document.createElement('p');
          pe.textContent = C.flower.afterBloom[i];
          wrap.appendChild(pe);
        }
        linesIn(wrap.querySelectorAll('p'));
      }
      var next = el('flowerNext');
      if (next) { next.hidden = false; next.textContent = C.flower.next; next.classList.add('is-in'); }
      setHint(C.flower.gardenHint || '', false, true);
      return;
    }
    setHint(C.flower.steps[0]);
  }

  function reset() {
    taps = 0;
    p = { stem: 0, leaf: 0, bloom: 0 };
    t = { stem: 0, leaf: 0, bloom: 0 };
    parts = [];
    garden = [];
    blown = false;
    var wrap = el('flowerLines');
    if (wrap) wrap.innerHTML = '';
    var next = el('flowerNext');
    if (next) { next.hidden = true; next.classList.remove('is-in'); }
    setHint(C.flower.steps[0]);
  }

  /* final: hanya bunga yang tersisa di tengah — bunga kecil di sekeliling dibersihkan */
  function showFinal() {
    mode = 'final';
    blown = false;
    parts = [];
    garden = [];
    /* kalau scene bunga sempat dilewati, tampilkan bunganya dalam keadaan mekar */
    if (taps < 3) {
      taps = 3;
      t.stem = 1; t.leaf = 1; t.bloom = 1;
    }
    p.stem = 1; p.leaf = 1; p.bloom = 1;
    resize();
  }

  /* ---------------- pasang ---------------- */
  function nearFlower(x, y) {
    var dx = x - headPos.x, dy = y - headPos.y;
    var r = Math.max(64, headPos.r * 1.3);
    return (dx * dx + dy * dy) < r * r;
  }

  function onTapPoint(e) {
    var x = e.clientX, y = e.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    var t2 = e.target;
    if (t2 && t2.closest && t2.closest('.btn, .flower-ui button')) return;
    if (nearFlower(x, y)) { tap(); return; }   /* tap di bunganya: tumbuhkan */
    plant(x, y);                               /* tap di sekeliling: tanam bunga baru */
  }

  var scene = document.querySelector('.scene[data-scene="flower"]');
  if (scene) scene.addEventListener('click', onTapPoint);

  var nextBtn = el('flowerNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      A.sfx.tap();
      S.complete('flowerBloomed', 'timeline');
    });
  }

  window.addEventListener('resize', resize);
  resize();
  frame();

  LOVE.flower = {
    enter: enter,
    reset: reset,
    showFinal: showFinal,
    taps: function () { return taps; },
    gardenCount: function () { return garden.length; },
    head: function () { return { x: headPos.x, y: headPos.y, r: headPos.r }; },
    bloomed: function () { return taps >= 3; }
  };

  if (S) S.register('flower', { onEnter: enter, onReplay: reset });
})();

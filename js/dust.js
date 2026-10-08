/* ============================================================================
   dust.js — partikel kecil seperti debu / cahaya yang mengapung.
   Hanya digambar di scene gelap supaya hemat baterai.
   ========================================================================== */
(function () {
  var canvas = document.getElementById('dust');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DARK = ['opening', 'photobooth', 'world', 'timeline', 'games', 'voice'];

  var W = 0, H = 0, parts = [];

  function visible() {
    var s = document.body.getAttribute('data-scene');
    return DARK.indexOf(s) >= 0 && !document.hidden;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    var n = reduce ? 22 : Math.round(Math.min(90, (W * H) / 9000));
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.9 + Math.random() * 2.4,
        vx: -0.14 + Math.random() * 0.28,
        vy: -0.05 - Math.random() * 0.22,
        a: 0.22 + Math.random() * 0.55,
        tw: Math.random() * 6.283,
        ts: 0.006 + Math.random() * 0.014,
        warm: Math.random() < 0.72
      });
    }
  }

  function frame() {
    window.requestAnimationFrame(frame);
    if (!visible() || !W) return;

    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.tw += p.ts;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      if (p.x < -12) p.x = W + 12;
      if (p.x > W + 12) p.x = -12;

      var a = p.a * (0.55 + 0.45 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = p.warm
        ? 'rgba(255, 232, 194, ' + a.toFixed(3) + ')'
        : 'rgba(255, 190, 216, ' + a.toFixed(3) + ')';
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    }
  }

  resize();
  seed();
  window.addEventListener('resize', function () { resize(); seed(); });
  frame();
})();

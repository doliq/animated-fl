/* ============================================================================
   app.js — perekat: Scene 01 (surat digital), Scene 08 (final),
   easter egg "ketik nama panggilan", bar tahapan, dan boot.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;
  var reduce = S.reduceMotion;

  function el(id) { return document.getElementById(id); }
  function scene(id) { return document.querySelector('.scene[data-scene="' + id + '"]'); }

  /* ---------------- bar tahapan ---------------- */
  function buildBar() {
    var bar = el('sceneDots');
    if (!bar) return;
    var html = '';
    for (var i = 0; i < S.ORDER.length; i++) html += '<span class="dot" data-for="' + S.ORDER[i] + '"></span>';
    bar.innerHTML = html;
  }

  /* ---------------- Scene 01 — surat ---------------- */
  var openTimers = [];

  function fillOpening() {
    var O = C.opening;
    var s = scene('opening');
    if (!s) return;
    s.querySelector('.seal-name').textContent = 'For ' + C.name;
    s.querySelector('.seal-hint').textContent = O.sealHint;
    var box = s.querySelector('.letter-lines');
    var html = '';
    for (var i = 0; i < O.lines.length; i++) html += '<p>' + esc(O.lines[i]) + '</p>';
    box.innerHTML = html;
    el('letterNext').textContent = O.cta;
  }

  function clearTimers() {
    for (var i = 0; i < openTimers.length; i++) window.clearTimeout(openTimers[i]);
    openTimers = [];
  }
  function later(fn, ms) { openTimers.push(window.setTimeout(fn, ms)); }

  function openLetter(skipAnim) {
    var s = scene('opening');
    if (!s || s.classList.contains('is-open')) return;
    A.unlock();
    A.playMusic();
    A.sfx.pop();
    s.classList.add('is-open');
    S.mark('letterOpened');

    var lines = s.querySelectorAll('.letter-lines p');
    var cta = el('letterNext');
    if (skipAnim || reduce) {
      for (var i = 0; i < lines.length; i++) lines[i].classList.add('is-in');
      if (cta) cta.classList.add('is-in');
      return;
    }
    for (var k = 0; k < lines.length; k++) {
      (function (node, idx) {
        later(function () { node.classList.add('is-in'); }, 420 + idx * 950);
      })(lines[k], k);
    }
    later(function () { if (cta) cta.classList.add('is-in'); }, 420 + lines.length * 950 + 450);
  }

  /* ---------------- Scene 08 — final ---------------- */
  var finalTimers = [];

  function clearFinal() {
    for (var i = 0; i < finalTimers.length; i++) window.clearTimeout(finalTimers[i]);
    finalTimers = [];
  }
  function laterFinal(fn, ms) { finalTimers.push(window.setTimeout(fn, ms)); }

  function playFinal() {
    clearFinal();
    var box = el('finalLines');
    var love = el('finalLove');
    var sign = el('finalSign');
    var replay = el('replayFinal');

    box.innerHTML = '';
    love.classList.remove('is-in');
    sign.classList.remove('is-in');
    replay.classList.remove('is-in');
    love.textContent = C.final.love;
    sign.textContent = C.final.sign;
    replay.textContent = C.final.replay;

    if (LOVE.flower && LOVE.flower.showFinal) LOVE.flower.showFinal();

    var at = 500;
    var pauses = C.final.pause || [];
    for (var i = 0; i < C.final.lines.length; i++) {
      var p = document.createElement('p');
      p.textContent = C.final.lines[i];
      box.appendChild(p);
      (function (node, delay) {
        laterFinal(function () { node.classList.add('is-in'); }, delay);
      })(p, at);
      at += (reduce ? 120 : (pauses[i] || 1000)) + 600;
    }
    laterFinal(function () { love.classList.add('is-in'); }, at + 300);
    laterFinal(function () { sign.classList.add('is-in'); }, at + 1300);
    laterFinal(function () { replay.classList.add('is-in'); }, at + 2100);
    if (A.sfx) laterFinal(function () { A.sfx.chime(); }, at + 300);
  }

  /* ---------------- easter egg: ketik nama panggilan ---------------- */
  function bindTypingEgg() {
    var buf = '';
    var word = (C.easter.word || '').toLowerCase();
    if (!word) return;
    document.addEventListener('keydown', function (e) {
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-24);
        if (buf.indexOf(word) >= 0) {
          buf = '';
          S.mark('eggTyped');
          A.sfx.chime();
          ui.showEgg(C.easter.lines);
        }
      }
    });
  }

  /* ---------------- tombol global ---------------- */
  function bind() {
    var seal = el('openLetter');
    if (seal) seal.addEventListener('click', function () { openLetter(false); });

    var next = el('letterNext');
    if (next) next.addEventListener('click', function () {
      A.sfx.tap();
      S.complete('letterOpened', 'photobooth');
    });

    var rep = el('replayBtn');
    if (rep) rep.addEventListener('click', function () { clearTimers(); clearFinal(); S.reset(); });

    var repF = el('replayFinal');
    if (repF) repF.addEventListener('click', function () { clearTimers(); clearFinal(); S.reset(); });

    var eggClose = el('eggClose');
    if (eggClose) eggClose.addEventListener('click', function () { ui.hideEgg(); });
  }

  /* ---------------- audio: buka di gestur pertama ---------------- */
  function bindUnlock() {
    var done = false;
    function once() {
      if (done) return;
      done = true;
      A.unlock();
      document.removeEventListener('pointerdown', once);
      document.removeEventListener('touchstart', once);
      document.removeEventListener('keydown', once);
    }
    document.addEventListener('pointerdown', once);
    document.addEventListener('touchstart', once);
    document.addEventListener('keydown', once);
  }

  /* ---------------- daftar scene ---------------- */
  function register() {
    S.register('opening', {
      onEnter: function () {
        if (S.isDone('letterOpened')) openLetter(true);
      },
      onReplay: function () {
        clearTimers();
        var s = scene('opening');
        if (!s) return;
        s.classList.remove('is-open');
        var lines = s.querySelectorAll('.letter-lines p');
        for (var i = 0; i < lines.length; i++) lines[i].classList.remove('is-in');
        var cta = el('letterNext');
        if (cta) cta.classList.remove('is-in');
      }
    });

    S.register('final', { onEnter: playFinal, onReplay: clearFinal });
  }

  function boot() {
    buildBar();
    fillOpening();
    bind();
    bindTypingEgg();
    register();
    bindUnlock();
    A.init();
    S.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

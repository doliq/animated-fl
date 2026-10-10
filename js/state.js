/* ============================================================================
   state.js — mesin cerita: urutan scene, transisi, dan progress.
   Scene lain cukup memanggil LOVE.state.register('world', { onEnter: ... })
   lalu LOVE.state.go('world').
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};

  var ORDER = ['opening', 'photobooth', 'world', 'flower', 'timeline', 'games', 'voice', 'final'];
  var STORAGE_KEY = 'love.progress.v1';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var handlers = {};          // id -> { onEnter, onLeave, onReplay }
  var listeners = [];         // fn(evt)
  var current = null;
  var busy = false;
  var curtain = null;

  /* ---------------- progress ---------------- */
  var flags = {};
  var lastScene = 'opening';

  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      flags = data.flags || {};
      lastScene = data.scene || 'opening';
    } catch (e) { flags = {}; }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ flags: flags, scene: current || lastScene }));
    } catch (e) { /* mode private: progress cukup jalan di memori */ }
  }

  /* ---------------- event kecil ---------------- */
  function emit(name, payload) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](name, payload); } catch (e) { /* jangan sampai mematikan alur */ }
    }
  }

  /* ---------------- util ---------------- */
  function sceneEl(id) { return document.querySelector('.scene[data-scene="' + id + '"]'); }

  function withCurtain(mid, done) {
    if (!curtain) { mid(); if (done) done(); return; }
    var tIn = reduceMotion ? 90 : 420;
    var tHold = reduceMotion ? 60 : 220;
    var tOut = reduceMotion ? 120 : 620;

    curtain.classList.add('is-on');
    window.setTimeout(function () {
      mid();
      window.setTimeout(function () {
        curtain.classList.remove('is-on');
        if (done) window.setTimeout(done, tOut);
      }, tHold);
    }, tIn);
  }

  /* ---------------- API ---------------- */
  var State = {
    ORDER: ORDER,
    reduceMotion: reduceMotion,

    init: function () {
      curtain = document.getElementById('transition');
      loadProgress();
      var hash = (window.location.hash || '').replace('#', '');
      var start = ORDER.indexOf(hash) >= 0 ? hash : (ORDER.indexOf(lastScene) >= 0 ? lastScene : 'opening');
      current = null;
      show(start);
      saveProgress();
      window.addEventListener('hashchange', function () {
        var h = (window.location.hash || '').replace('#', '');
        if (ORDER.indexOf(h) >= 0 && h !== current) State.go(h);
      });
    },

    register: function (id, obj) { handlers[id] = obj || {}; },

    on: function (fn) { listeners.push(fn); },

    current: function () { return current; },

    go: function (id, opts) {
      if (busy || ORDER.indexOf(id) < 0) return;
      opts = opts || {};
      if (id === current && !opts.force) return;
      busy = true;
      var from = current;
      withCurtain(function () {
        show(id);
      }, function () {
        busy = false;
        emit('scene:entered', id);
      });
    },

    /* tandai satu tahap selesai, lalu lanjut ke scene berikutnya */
    complete: function (flag, nextId) {
      if (flag) { flags[flag] = true; saveProgress(); }
      var id = nextId || ORDER[ORDER.indexOf(current) + 1];
      if (id) State.go(id);
    },

    isDone: function (flag) { return !!flags[flag]; },

    flags: function () { return flags; },

    /* dipakai tombol "putar lagi dari awal" */
    reset: function () {
      flags = {};
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      if (window.location.hash) {
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
      }
      var map = document.querySelectorAll('.scene');
      for (var i = 0; i < map.length; i++) {
        var h = handlers[map[i].getAttribute('data-scene')];
        if (h && typeof h.onReplay === 'function') { try { h.onReplay(); } catch (e) {} }
      }
      current = null;
      show('opening');
      saveProgress();
      emit('scene:entered', 'opening');
    },

    /* dipakai scene bunga supaya progress ikut tersimpan */
    mark: function (flag) { flags[flag] = true; saveProgress(); }
  };

  /* ---------------- helper UI bersama ---------------- */
  /* Video/audio di dalam panel harus dihentikan saat panel ditutup atau isinya
     diganti. Kalau tidak, suaranya jalan terus padahal panelnya sudah hilang
     (tidak ada kontrol yang bisa dijangkau) dan bisa bocor ke scene lain. */
  function stopSheetMedia(sheet) {
    if (!sheet) return;
    var media = sheet.querySelectorAll('video, audio');
    for (var i = 0; i < media.length; i++) {
      try { media[i].pause(); } catch (e) {}
    }
  }

  var ui = {
    el: function (id) { return document.getElementById(id); },
    /* munculkan elemen .reveal satu per satu */
    reveal: function (root) {
      if (!root) return;
      var items = root.querySelectorAll('.reveal');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('is-in');
      window.requestAnimationFrame(function () {
        for (var j = 0; j < items.length; j++) {
          (function (node, k) {
            window.setTimeout(function () { node.classList.add('is-in'); }, reduceMotion ? 40 * k : 180 + 150 * k);
          })(items[j], j);
        }
      });
    },
    /* panel pesan dari bawah (dipakai Little World & Memories) */
    showSheet: function (title, bodyHtml, footHtml) {
      var sheet = document.getElementById('sheet');
      var scrim = document.getElementById('sheetScrim');
      if (!sheet) return;
      stopSheetMedia(sheet);
      var t = sheet.querySelector('.sheet-title');
      var b = sheet.querySelector('.sheet-body');
      var f = sheet.querySelector('.sheet-foot');
      if (t) t.innerHTML = title || '';
      if (b) b.innerHTML = bodyHtml || '';
      if (f) f.innerHTML = footHtml || '';
      sheet.classList.add('is-open');
      if (scrim) scrim.classList.add('is-open');
      var card = sheet.querySelector('.sheet-card');
      if (card) card.scrollTop = 0;
    },
    hideSheet: function () {
      var sheet = document.getElementById('sheet');
      var scrim = document.getElementById('sheetScrim');
      stopSheetMedia(sheet);
      if (sheet) sheet.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-open');
    },
    /* pesan rahasia (easter egg) */
    showEgg: function (lines) {
      var egg = document.getElementById('egg');
      if (!egg) return;
      var E = window.LOVE_CONTENT.easter || {};
      var title = egg.querySelector('.egg-title');
      var body = egg.querySelector('.egg-lines');
      var close = document.getElementById('eggClose');
      if (title) title.textContent = E.title || 'ACCESS GRANTED';
      if (close && E.next) close.textContent = E.next;
      if (body) {
        var html = '';
        for (var i = 0; i < lines.length; i++) html += '<p>' + ui.esc(lines[i]) + '</p>';
        body.innerHTML = html;
      }
      egg.classList.add('is-on');
      egg.setAttribute('aria-hidden', 'false');
    },
    hideEgg: function () {
      var egg = document.getElementById('egg');
      if (!egg) return;
      egg.classList.remove('is-on');
      egg.setAttribute('aria-hidden', 'true');
    },
    /* aman untuk teks yang berasal dari config */
    esc: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  function show(id) {
    var from = current;
    if (from && handlers[from] && typeof handlers[from].onLeave === 'function') {
      try { handlers[from].onLeave(); } catch (e) {}
    }

    var list = document.querySelectorAll('.scene');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var on = el.getAttribute('data-scene') === id;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    current = id;
    lastScene = id;
    document.body.setAttribute('data-scene', id);
    document.documentElement.setAttribute('data-scene', id);
    saveProgress();

    var bar = document.getElementById('sceneDots');
    if (bar) {
      var dots = bar.querySelectorAll('.dot');
      for (var d = 0; d < dots.length; d++) {
        var dotId = dots[d].getAttribute('data-for');
        var idx = ORDER.indexOf(id), didx = ORDER.indexOf(dotId);
        dots[d].classList.toggle('is-current', dotId === id);
        dots[d].classList.toggle('is-past', didx < idx);
      }
    }

    if (handlers[id] && typeof handlers[id].onEnter === 'function') {
      window.setTimeout(function () { try { handlers[id].onEnter(); } catch (e) { if (window.console) console.error(e); } }, 60);
    }
    ui.reveal(sceneEl(id));
  }

  LOVE.state = State;
  LOVE.ui = ui;

  /* penutup panel & pesan rahasia (satu listener untuk semua scene) */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-close-sheet]')) ui.hideSheet();
    if (t.closest('#eggClose')) ui.hideEgg();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { ui.hideSheet(); ui.hideEgg(); }
  });
})();

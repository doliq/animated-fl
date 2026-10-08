/* ============================================================================
   audio.js — satu pusat suara: lagu latar (assets/music/lagu.mp3),
   efek suara (Web Audio, tanpa file tambahan), dan pemutar voice message.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};

  var song = null;
  var musicBtn = null;
  var actx = null;
  var unlocked = false;
  var musicWanted = false;

  function el(id) { return document.getElementById(id); }

  function audioCtx() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended' && actx.resume) actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }

  /* ---------------- lagu latar ---------------- */
  function updateBtn() {
    if (!musicBtn) return;
    var on = song && !song.paused;
    musicBtn.textContent = on ? '♫ On' : '♫ Off';
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.classList.toggle('is-on', !!on);
  }

  var Audio = {
    init: function () {
      song = el('song');
      musicBtn = el('musicToggle');
      if (song) {
        song.volume = 0.0001;
        song.addEventListener('play', updateBtn);
        song.addEventListener('pause', updateBtn);
        song.addEventListener('error', function () {
          if (musicBtn) musicBtn.classList.add('is-missing');
        });
      }
      if (musicBtn) {
        musicBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          Audio.toggleMusic();
        });
      }
      updateBtn();
    },

    /* dipanggil di gestur pertama pengguna (aturan autoplay browser) */
    unlock: function () {
      unlocked = true;
      audioCtx();
      if (musicWanted) Audio.playMusic();
    },

    isUnlocked: function () { return unlocked; },

    playMusic: function () {
      musicWanted = true;
      if (!song) return;
      var p = song.play();
      if (p && p.then) {
        p.then(function () { Audio.fadeTo(0.8, 1800); updateBtn(); })
         .catch(function () { updateBtn(); });
      } else {
        Audio.fadeTo(0.8, 1800);
        updateBtn();
      }
    },

    pauseMusic: function () {
      musicWanted = false;
      if (!song) return;
      Audio.fadeTo(0, 500, function () { song.pause(); updateBtn(); });
    },

    toggleMusic: function () {
      if (!song) return;
      if (song.paused) Audio.playMusic(); else Audio.pauseMusic();
    },

    /* kecilkan lagu sebentar (mis. saat voice message diputar) */
    duck: function (on) {
      if (!song || song.paused) return;
      Audio.fadeTo(on ? 0.22 : 0.8, 600);
    },

    fadeTo: function (target, ms, done) {
      if (!song) { if (done) done(); return; }
      var start = song.volume;
      var t0 = performance.now();
      ms = ms || 800;
      (function step() {
        var t = Math.min(1, (performance.now() - t0) / ms);
        song.volume = Math.max(0.0001, Math.min(1, start + (target - start) * t));
        if (t < 1) window.requestAnimationFrame(step);
        else if (done) done();
      })();
    }
  };

  /* ---------------- efek suara ---------------- */
  function tone(freq, dur, type, gain, at) {
    var ac = audioCtx();
    if (!ac) return;
    var t = ac.currentTime + (at || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  Audio.sfx = {
    tap: function () { tone(660, 0.10, 'triangle', 0.035); },
    pop: function () { tone(880, 0.14, 'sine', 0.05); tone(1320, 0.10, 'sine', 0.03, 0.05); },
    correct: function () { tone(784, 0.16, 'sine', 0.05); tone(1046, 0.22, 'sine', 0.045, 0.10); },
    wrong: function () { tone(320, 0.18, 'triangle', 0.05); tone(240, 0.22, 'triangle', 0.04, 0.10); },
    chime: function () { tone(1046, 0.35, 'sine', 0.05); tone(1318, 0.40, 'sine', 0.04, 0.09); tone(1568, 0.5, 'sine', 0.03, 0.18); },
    shutter: function () {
      var ac = audioCtx();
      if (!ac) return;
      var t = ac.currentTime;
      var len = Math.floor(ac.sampleRate * 0.09);
      var buf = ac.createBuffer(1, len, ac.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var src = ac.createBufferSource(); src.buffer = buf;
      var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      var g = ac.createGain(); g.gain.value = 0.16;
      src.connect(hp); hp.connect(g); g.connect(ac.destination);
      src.start(t); src.stop(t + 0.1);
    },
    splash: function () {
      var ac = audioCtx();
      if (!ac) return;
      var t0 = ac.currentTime;
      try {
        var len = Math.floor(ac.sampleRate * 1.0);
        var buf = ac.createBuffer(1, len, ac.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = ac.createBufferSource(); src.buffer = buf;
        var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.7;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.085, t0 + 0.10);
        g.gain.setValueAtTime(0.085, t0 + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
        src.connect(bp); bp.connect(g); g.connect(ac.destination);
        src.start(t0); src.stop(t0 + 1.02);
      } catch (e) {}
      for (var k = 0; k < 6; k++) {
        var t = t0 + 0.12 + k * 0.13;
        var o = ac.createOscillator(), gg = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(820 + Math.random() * 520, t);
        o.frequency.exponentialRampToValueAtTime(300, t + 0.13);
        gg.gain.setValueAtTime(0.0001, t);
        gg.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
        o.connect(gg); gg.connect(ac.destination);
        o.start(t); o.stop(t + 0.19);
      }
    },
    bloom: function () { tone(523, 0.5, 'sine', 0.045); tone(659, 0.6, 'sine', 0.04, 0.14); tone(784, 0.7, 'sine', 0.035, 0.3); }
  };

  LOVE.audio = Audio;
})();

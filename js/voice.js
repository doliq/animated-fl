/* ============================================================================
   voice.js — Scene 07: "Listen to this." → "Put your headphones on." → suara.
   Transkrip disembunyikan di balik tombol kecil "words".
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;

  var V = C.voice;
  var audio = null;
  var ready = false;
  var built = false;

  function root() { return document.querySelector('.scene[data-scene="voice"]'); }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function build() {
    var el = root();
    if (!el || built) return;

    el.querySelector('[data-voice-title]').textContent = V.title;
    el.querySelector('[data-voice-hint]').textContent = V.hint;

    var orb = el.querySelector('[data-voice-play]');
    var track = el.querySelector('.voice-track');
    var now = el.querySelector('.voice-now');
    var dur = el.querySelector('.voice-dur');
    var note = el.querySelector('.voice-note');
    var words = el.querySelector('[data-voice-words]');
    var transcript = el.querySelector('.voice-transcript');
    var next = el.querySelector('[data-voice-next]');

    words.textContent = V.transcriptToggle;
    next.textContent = V.next;
    var html = '';
    for (var i = 0; i < V.transcript.length; i++) html += '<p>' + esc(V.transcript[i]) + '</p>';
    transcript.innerHTML = html;

    audio = new Audio();
    audio.preload = 'metadata';
    audio.src = V.file;

    function missing() {
      ready = false;
      note.hidden = false;
      note.textContent = V.missing;
      orb.textContent = '🎧';
      dur.textContent = '--:--';
    }

    audio.addEventListener('loadedmetadata', function () {
      ready = true;
      note.hidden = true;
      dur.textContent = fmt(audio.duration);
    });
    audio.addEventListener('error', missing);
    audio.addEventListener('timeupdate', function () {
      var d = audio.duration || 0;
      track.querySelector('i').style.width = (d ? (audio.currentTime / d * 100) : 0) + '%';
      now.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener('play', function () {
      el.classList.add('is-playing');
      orb.textContent = '❚❚';
      A.duck(true);
    });
    audio.addEventListener('pause', function () {
      el.classList.remove('is-playing');
      orb.textContent = '🎧';
      A.duck(false);
    });
    audio.addEventListener('ended', function () {
      el.classList.remove('is-playing');
      orb.textContent = '🎧';
      A.duck(false);
      S.mark('voiceUnlocked');
    });

    orb.addEventListener('click', function () {
      A.unlock();
      if (audio.error) { missing(); return; }
      if (audio.paused) {
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(missing);
      } else {
        audio.pause();
      }
    });

    track.addEventListener('click', function (ev) {
      if (!ready) return;
      var r = track.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      audio.currentTime = ratio * (audio.duration || 0);
    });

    words.addEventListener('click', function () {
      transcript.hidden = !transcript.hidden;
    });

    next.addEventListener('click', function () {
      A.unlock();
      S.complete('voiceUnlocked', 'final');
    });

    window.setTimeout(function () { if (!ready) missing(); }, 2600);
    built = true;
  }

  LOVE.state.register('voice', {
    onEnter: build,
    onLeave: function () { if (audio && !audio.paused) audio.pause(); },
    onReplay: function () {
      if (audio) { try { audio.pause(); audio.currentTime = 0; } catch (e) {} }
    }
  });
})();

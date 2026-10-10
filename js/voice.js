/* ============================================================================
   voice.js — Scene 07: kalimat pendek yang muncul satu per satu setiap
   tombol ♡ diketuk. (Menggantikan voice message; tanpa file audio.)
   Teks ada di js/content.js → voice.lines.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio;

  var V = C.voice;
  var built = false;
  var shown = 0;

  function root() { return document.querySelector('.scene[data-scene="voice"]'); }

  function addLine(text) {
    var list = root().querySelector('.note-list');
    var p = document.createElement('p');
    p.className = 'note-line';
    p.textContent = text;
    list.appendChild(p);
  }

  function setState() {
    var el = root();
    var tap = el.querySelector('[data-note-tap]');
    var next = el.querySelector('[data-voice-next]');
    var done = shown >= V.lines.length;
    tap.hidden = done;
    next.hidden = !done;
  }

  function build() {
    var el = root();
    if (!el || built) return;

    el.querySelector('[data-voice-title]').textContent = V.title;
    el.querySelector('[data-voice-hint]').textContent = V.hint;

    var tap = el.querySelector('[data-note-tap]');
    var next = el.querySelector('[data-voice-next]');
    tap.textContent = V.tap;
    next.textContent = V.next;

    /* sudah pernah selesai: tampilkan semua kalimat langsung */
    if (S.isDone('voiceUnlocked')) shown = V.lines.length;
    for (var i = 0; i < shown; i++) addLine(V.lines[i]);

    tap.addEventListener('click', function () {
      if (shown >= V.lines.length) return;
      A.unlock();
      A.sfx.tap();
      addLine(V.lines[shown]);
      shown++;
      if (shown >= V.lines.length) S.mark('voiceUnlocked');
      setState();
    });

    next.addEventListener('click', function () {
      A.unlock();
      S.complete('voiceUnlocked', 'final');
    });

    built = true;
    setState();
  }

  LOVE.state.register('voice', {
    onEnter: build,
    onLeave: function () {},
    onReplay: function () {
      shown = 0;
      var el = root();
      if (el) el.querySelector('.note-list').innerHTML = '';
      if (built) setState();
    }
  });
})();

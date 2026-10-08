/* ============================================================================
   timeline.js — Scene 05: "Our Timeline" sebagai memory map.
   Tiap titik bisa dibuka: foto / video / voice / potongan chat + cerita pendek.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;

  var seen = {};
  var built = false;

  /* catatan yang ditulis penerima disimpan di perangkatnya sendiri */
  var NOTES_KEY = 'love.notes.v1';

  function notes() {
    try { return JSON.parse(window.localStorage.getItem(NOTES_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function getNote(i) { return notes()['n' + i] || ''; }
  function setNote(i, text) {
    var all = notes();
    all['n' + i] = text;
    try { window.localStorage.setItem(NOTES_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function root() { return document.querySelector('.scene[data-scene="timeline"]'); }
  function nodes() { return C.timeline.nodes || []; }
  function T() { return C.timeline.text || {}; }

  function build() {
    var el = root();
    if (!el || built) return;

    var hint = el.querySelector('[data-timeline-hint]');
    if (hint) hint.textContent = C.timeline.hint;

    var map = el.querySelector('.map');
    var html = '';
    for (var i = 0; i < nodes().length; i++) {
      html += '<button class="map-node" type="button" data-i="' + i + '">' +
                esc(nodes()[i].when) +
              '</button>';
    }
    map.innerHTML = html;
    map.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.map-node') : null;
      if (!b) return;
      open(parseInt(b.getAttribute('data-i'), 10));
    });

    var next = el.querySelector('[data-timeline-next]');
    if (next) {
      next.textContent = C.timeline.next;
      next.addEventListener('click', function () {
        A.sfx.tap();
        S.complete('timelineSeen', 'games');
      });
    }
    built = true;
    update();
  }

  function mediaHtml(m, index) {
    if (!m) return '';
    if (m.type === 'photo') {
      /* src boleh satu nama berkas atau daftar beberapa gambar */
      if (Object.prototype.toString.call(m.src) === '[object Array]') {
        var box = '<div class="sheet-photos">';
        for (var k = 0; k < m.src.length; k++) {
          box += '<img class="sheet-media" src="' + esc(m.src[k]) + '" alt="">';
        }
        return box + '</div>';
      }
      return '<img class="sheet-media" src="' + esc(m.src) + '" alt="">';
    }
    if (m.type === 'video') return '<video class="sheet-media" controls playsinline preload="metadata" src="' + esc(m.src) + '"></video>';
    if (m.type === 'audio') return '<audio class="sheet-media" controls preload="metadata" src="' + esc(m.src) + '" style="height:44px;object-fit:contain;background:none"></audio>';
    if (m.type === 'chat') {
      var html = '<div class="sheet-chat">';
      for (var i = 0; i < (m.lines || []).length; i++) {
        html += '<p class="' + (m.lines[i].from === 'me' ? 'is-me' : 'is-you') + '">' + esc(m.lines[i].text) + '</p>';
      }
      return html + '</div>';
    }
    /* kartu yang diisi sendiri oleh penerima */
    if (m.type === 'text') {
      var saved = getNote(index);
      return '<div class="sheet-input">' +
               '<label class="input-label" for="noteField">' + esc(m.prompt || T().prompt || 'Your turn.') + '</label>' +
               '<textarea class="input-field" id="noteField" data-note="' + index + '" rows="4" ' +
                         'placeholder="' + esc(m.placeholder || T().placeholder || '') + '">' + esc(saved) + '</textarea>' +
               '<div class="input-row">' +
                 '<button class="btn btn--rose" type="button" data-save-note="' + index + '">' +
                   esc(m.save || T().save || 'Save') + '</button>' +
                 '<span class="input-note">' + esc(saved ? (T().saved || 'Saved.') : (m.note || T().note || '')) + '</span>' +
               '</div>' +
             '</div>';
    }
    return '';
  }

  function open(i) {
    var n = nodes()[i];
    if (!n) return;
    A.sfx.pop();
    var node = root().querySelector('.map-node[data-i="' + i + '"]');
    if (node) node.classList.add('is-seen');
    if (!seen[i]) { seen[i] = true; update(); }

    var body = mediaHtml(n.media, i);
    for (var k = 0; k < n.story.length; k++) body += '<p>' + esc(n.story[k]) + '</p>';

    ui.showSheet(esc(n.when), body,
      '<button class="btn btn--ghost" type="button" data-close-sheet>' + esc((C.ui && C.ui.ok) || 'Okeyy') + '</button>');
  }

  function seenCount() {
    var c = 0;
    for (var k in seen) if (seen[k]) c++;
    return c;
  }

  function update() {
    var el = root();
    if (!el) return;
    var next = el.querySelector('[data-timeline-next]');
    if (next) next.hidden = seenCount() < nodes().length;
    if (seenCount() >= nodes().length) S.mark('timelineSeen');
  }

  /* foto yang gagal dimuat: sembunyikan, jangan tampilkan ikon rusak */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && img.classList.contains('sheet-media')) {
      img.classList.add('is-missing');
    }
  }, true);

  /* tulisannya disimpan sambil diketik, jadi tidak hilang kalau panel ditutup */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('input-field')) return;
    setNote(t.getAttribute('data-note'), t.value);
    var note = document.querySelector('.input-note');
    if (note) note.textContent = T().saved || 'Saved.';
  });

  /* tombol simpan memberi tanda tegas */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-save-note]') : null;
    if (!b) return;
    var i = b.getAttribute('data-save-note');
    var field = document.querySelector('.input-field[data-note="' + i + '"]');
    setNote(i, field ? field.value : '');
    var note = document.querySelector('.input-note');
    if (note) note.textContent = T().saved || 'Saved.';
    if (A.sfx) A.sfx.correct();
  });

  LOVE.state.register('timeline', {
    onEnter: build,
    onLeave: function () { ui.hideSheet(); },
    onReplay: function () {
      seen = {};
      var el = root();
      if (el) {
        var n2 = el.querySelectorAll('.map-node');
        for (var i = 0; i < n2.length; i++) n2[i].classList.remove('is-seen');
      }
      update();
    }
  });
})();

/* ============================================================================
   world.js — Scene 03: kamar kecil.
   Tiga benda bisa ditap: Media (dua pilihan: Photo & Video), rak film, pot bunga.
   Bagian Photo menampung semua strip dari sesi photobooth sebelumnya dan bisa
   dihapus satu-satu.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;

  var seen = {};
  var built = false;
  var mediaObj = null;          /* objek Media yang sedang dibuka */

  function root() { return document.querySelector('.scene[data-scene="world"]'); }
  function total() { return (C.world.objects || []).length; }
  function M() { return C.world.media || {}; }
  function okLabel() { return esc((C.ui && C.ui.ok) || 'Okeyy'); }

  /* karakter Dira: rambut bob, kulit putih (SVG supaya tetap tajam) */
  var DIRA_SVG = '' +
    '<svg viewBox="0 0 80 136" class="dira-svg" aria-hidden="true">' +
      '<ellipse cx="40" cy="132" rx="19" ry="4" fill="rgba(0,0,0,.35)"/>' +
      '<path d="M20 136 v-20 q0-18 20-18 t20 18 v20 z" fill="#e7b3c6"/>' +
      '<rect x="35" y="72" width="10" height="34" rx="5" fill="#f6dccb"/>' +
      '<path d="M12 52 q0-36 28-36 t28 36 v24 q0 9-9 9 h-38 q-9 0-9-9 z" fill="#382730"/>' +
      '<ellipse cx="40" cy="54" rx="19" ry="21" fill="#fbe4d6"/>' +
      '<path d="M20 50 q0-26 20-26 t20 26 q-7-12-20-12 t-20 12 z" fill="#3f2c35"/>' +
      '<ellipse cx="32" cy="56" rx="2.5" ry="3.3" fill="#2c1f24"/>' +
      '<ellipse cx="48" cy="56" rx="2.5" ry="3.3" fill="#2c1f24"/>' +
      '<ellipse cx="26" cy="62" rx="4.2" ry="2.4" fill="#f5a3bb" opacity=".6"/>' +
      '<ellipse cx="54" cy="62" rx="4.2" ry="2.4" fill="#f5a3bb" opacity=".6"/>' +
      '<path d="M36 64 q4 4 8 0" stroke="#bd6a78" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 30 q6-6 14-6" stroke="rgba(255,255,255,.22)" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  function stripSrc() {
    return (LOVE.photobooth && LOVE.photobooth.lastStrip) || '';
  }

  function fmtDate(ts) {
    var d = new Date(ts || Date.now());
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' · ' + two(d.getHours()) + '.' + two(d.getMinutes());
  }

  /* ---------------- isi tiap benda ---------------- */
  function inner(o) {
    if (o.id === 'photo') {
      var src = stripSrc();
      return '<span class="prop-frame">' +
               '<span class="prop-mat">' +
                 (src
                   ? '<img class="prop-shot" src="' + src + '" alt="photo strip">'
                   : '<span class="prop-empty">🖼️</span>') +
               '</span>' +
             '</span>';
    }
    if (o.id === 'film') {
      var html = '<span class="prop-shelf"><span class="prop-posters">';
      for (var i = 0; i < o.posters.length; i++) {
        html += '<img src="' + esc(o.posters[i].src) + '" alt="' + esc(o.posters[i].title) + '" loading="lazy">';
      }
      return html + '</span><span class="prop-board"></span></span>';
    }
    if (o.id === 'flower') {
      return '<span class="prop-pot">' +
               '<span class="prop-bloom">🌷</span>' +
               '<span class="prop-clay"></span>' +
             '</span>';
    }
    return '<span class="prop-icon">' + esc(o.icon || '') + '</span>';
  }

  function buildProp(o) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'prop prop--' + o.id;
    b.setAttribute('data-id', o.id);
    b.setAttribute('aria-label', o.label);
    b.innerHTML = inner(o) + '<span class="prop-label">' + esc(o.label) + '</span>';
    b.addEventListener('click', function () { open(o, b); });
    return b;
  }

  /* ---------------- pasang ruangan ---------------- */
  function build() {
    var el = root();
    if (!el || built) return;

    var hint = el.querySelector('[data-world-hint]');
    if (hint) hint.textContent = C.world.hint;

    var stage = el.querySelector('.room');
    var next = el.querySelector('[data-world-next]');
    if (next) {
      next.textContent = C.world.next;
      next.addEventListener('click', function () {
        A.sfx.tap();
        S.complete('worldExplored', 'flower');
      });
    }

    var star = el.querySelector('#roomStar');
    if (star) {
      star.addEventListener('click', function () {
        A.sfx.pop();
        star.classList.add('is-found');
        S.mark('eggStar');
        ui.showEgg(C.world.star.lines);
      });
    }

    var objects = C.world.objects || [];
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].media) mediaObj = objects[i];
      stage.appendChild(buildProp(objects[i]));
    }

    var dira = document.createElement('span');
    dira.className = 'room-dira';
    dira.setAttribute('aria-hidden', 'true');
    dira.innerHTML = DIRA_SVG;
    stage.appendChild(dira);

    built = true;
    update();
  }

  /* bingkai foto memakai strip terbaru (dari memori atau dari galeri) */
  function refreshStrip() {
    var el = root();
    if (!el) return;
    var mat = el.querySelector('.prop--photo .prop-mat');
    if (!mat) return;

    function apply(url) {
      var img = mat.querySelector('.prop-shot');
      if (url) {
        if (!img) mat.innerHTML = '<img class="prop-shot" src="' + url + '" alt="photo strip">';
        else if (img.getAttribute('src') !== url) img.setAttribute('src', url);
      } else if (img) {
        mat.innerHTML = '<span class="prop-empty">🖼️</span>';
      }
    }

    if (LOVE.gallery) {
      LOVE.gallery.latest().then(function (rec) {
        /* database dulu; kalau kosong pakai strip sesi ini yang belum tertulis */
        var url = rec ? rec.url : (LOVE.gallery.peek() ? LOVE.gallery.peek().url : '');
        apply(url);
      });
    } else {
      apply(stripSrc());
    }
  }

  /* ---------------- panel pesan ---------------- */
  function closeFoot() {
    return '<button class="btn btn--ghost" type="button" data-close-sheet>' + okLabel() + '</button>';
  }

  function backFoot() {
    return '<button class="btn btn--ghost" type="button" data-media-view="back">' + esc(M().back || 'Back') + '</button>' +
           '<button class="btn btn--ghost" type="button" data-close-sheet>' + okLabel() + '</button>';
  }

  /* langkah 1: dua pilihan */
  function openMedia() {
    var vids = (mediaObj && mediaObj.videos) || [];
    var body = '<div class="sheet-choices">' +
      '<button class="choice" type="button" data-media-view="photo">' +
        '<span class="choice-icon">🖼️</span>' +
        '<span class="choice-label">' + esc(M().photo || 'Photo') + '</span>' +
        '<span class="choice-sub" data-photo-count>…</span>' +
      '</button>' +
      '<button class="choice" type="button" data-media-view="video">' +
        '<span class="choice-icon">🎬</span>' +
        '<span class="choice-label">' + esc(M().video || 'Video') + '</span>' +
        '<span class="choice-sub">' + vids.length + '</span>' +
      '</button>' +
    '</div>';
    ui.showSheet('', body, closeFoot());

    if (LOVE.gallery) {
      LOVE.gallery.count().then(function (n) {
        var c = document.querySelector('[data-photo-count]');
        if (c) c.textContent = n + ' ' + (n === 1 ? (M().countOne || 'strip') : (M().countMany || 'strips'));
      });
    } else {
      var c2 = document.querySelector('[data-photo-count]');
      if (c2) c2.textContent = '0';
    }
  }

  /* langkah 2a: galeri strip photobooth */
  function showPhotos() {
    ui.showSheet('', '<p class="sheet-loading">…</p>', backFoot());
    if (!LOVE.gallery) {
      ui.showSheet('', '<p class="sheet-empty">' + esc(M().empty || '') + '</p>', backFoot());
      return;
    }
    LOVE.gallery.list().then(function (rows) {
      if (!rows.length) {
        ui.showSheet('', '<p class="sheet-empty">' + esc(M().empty || '') + '</p>', backFoot());
        return;
      }
      var html = '<div class="sheet-gallery">';
      for (var i = 0; i < rows.length; i++) {
        html += '<figure class="gallery-item">' +
                  '<img src="' + rows[i].url + '" alt="photo strip">' +
                  '<button class="gallery-del" type="button" data-del-strip="' + rows[i].id + '" ' +
                          'aria-label="' + esc(M().deleteOne || 'Delete') + '">✕</button>' +
                  '<figcaption>' + fmtDate(rows[i].date) + '</figcaption>' +
                '</figure>';
      }
      html += '</div>';
      ui.showSheet('', html, backFoot());
    });
  }

  /* langkah 2b: daftar video */
  function showVideos() {
    var o = mediaObj;
    var vids = (o && o.videos) || [];
    if (!vids.length) {
      ui.showSheet('', '<p class="sheet-empty">' + esc(M().videoEmpty || '') + '</p>', backFoot());
      return;
    }
    var body = '<div class="sheet-videos">';
    for (var v = 0; v < vids.length; v++) {
      body += '<figure class="sheet-video">' +
                '<video controls playsinline preload="metadata" src="' + esc(vids[v].src) + '#t=0.1"></video>' +
                '<figcaption>' + esc(vids[v].label) + '</figcaption>' +
              '</figure>';
    }
    body += '</div>';
    if (o.lines) {
      for (var i = 0; i < o.lines.length; i++) body += '<p>' + esc(o.lines[i]) + '</p>';
    }
    ui.showSheet('', body, backFoot());
  }

  /* panel untuk benda non-media (rak film & pot bunga) */
  function open(o, node) {
    A.sfx.pop();
    node.classList.add('is-seen');
    if (!seen[o.id]) { seen[o.id] = true; update(); }

    if (o.media) { openMedia(); return; }

    var body = '';
    if (o.posters && o.posters.length) {
      body += '<div class="sheet-films">';
      for (var f = 0; f < o.posters.length; f++) {
        body += '<figure class="sheet-film">' +
                  '<img src="' + esc(o.posters[f].src) + '" alt="' + esc(o.posters[f].title) + '" loading="lazy">' +
                  '<figcaption>' + esc(o.posters[f].title) + '</figcaption>' +
                '</figure>';
      }
      body += '</div>';
    }
    for (var i = 0; i < o.lines.length; i++) body += '<p>' + esc(o.lines[i]) + '</p>';

    var foot = o.goScene
      ? '<button class="btn btn--rose" type="button" data-go-scene="' + o.goScene + '">' + esc((C.ui && C.ui.go) || 'Letsgowww') + '</button>'
      : closeFoot();

    ui.showSheet('', body, foot);
  }

  function seenCount() {
    var n = 0;
    for (var k in seen) if (seen[k]) n++;
    return n;
  }

  function update() {
    var el = root();
    if (!el) return;
    var next = el.querySelector('[data-world-next]');
    if (next) next.hidden = seenCount() < total();
    if (seenCount() >= total()) S.mark('worldExplored');
  }

  /* ---------------- klik yang didelegasikan ---------------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var view = e.target.closest('[data-media-view]');
    if (view) {
      var which = view.getAttribute('data-media-view');
      A.sfx.tap();
      if (which === 'photo') showPhotos();
      else if (which === 'video') showVideos();
      else openMedia();
      return;
    }

    var del = e.target.closest('[data-del-strip]');
    if (del) {
      A.sfx.pop();
      var id = del.getAttribute('data-del-strip');
      if (LOVE.gallery) {
        LOVE.gallery.remove(id).then(function () {
          showPhotos();
          refreshStrip();
        });
      }
      return;
    }

    var go = e.target.closest('[data-go-scene]');
    if (go) {
      ui.hideSheet();
      A.sfx.tap();
      S.go(go.getAttribute('data-go-scene'));
    }
  });

  /* gambar yang gagal dimuat: buang, jangan tampilkan ikon rusak */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.closest) return;
    var fig = img.closest('.sheet-film');
    if (fig) { fig.remove(); return; }
    if (img.closest('.prop-posters')) img.remove();
  }, true);

  LOVE.state.register('world', {
    onEnter: function () {
      build();
      refreshStrip();
      update();
    },
    onLeave: function () { ui.hideSheet(); },
    onReplay: function () {
      seen = {};
      var el = root();
      var props = el ? el.querySelectorAll('.prop') : [];
      for (var i = 0; i < props.length; i++) props[i].classList.remove('is-seen');
      var star = el ? el.querySelector('#roomStar') : null;
      if (star) star.classList.remove('is-found');
      refreshStrip();
      update();
    }
  });
})();

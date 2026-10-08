/* ============================================================================
   games.js — Scene 06: dua mini game.
   1) Find the heart.  → objek bergerak, satu menyembunyikan hati.
   2) How well do you know us? → jawaban salah berbuah "You owe me one hug."
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};
  var C = window.LOVE_CONTENT;
  var S = LOVE.state, A = LOVE.audio, ui = LOVE.ui;
  var esc = ui.esc;

  var G = C.games;
  var SHAPES = ['✿', '❀', '✧', '☾', '❋', '✢', '✳'];
  var DECOYS = ['✿', '❀', '✧', '☾', '❋', '✢', '✳'];

  var built = false;
  var raf = null;
  var floaters = [];
  var stage = null;
  var round = 0;
  var qi = 0;
  var hearts = 0;
  var hugs = 0;
  var answered = false;

  function root() { return document.querySelector('.scene[data-scene="games"]'); }
  function findBlock() { return root().querySelector('[data-game="find"]'); }
  function quizBlock() { return root().querySelector('[data-game="quiz"]'); }
  function note(txt) { var n = document.getElementById('findNote'); if (n) n.textContent = txt || ''; }

  /* ---------------- game 1: find the heart ---------------- */
  function startFind() {
    var block = findBlock();
    block.hidden = false;
    quizBlock().hidden = true;
    block.querySelector('.game-title').textContent = G.findTitle;
    block.querySelector('.lede').textContent = G.findHint;
    round = 0;
    note('');
    buildRound();
  }

  function buildRound() {
    stage = document.getElementById('findStage');
    stage.innerHTML = '';
    floaters = [];
    var count = 6;
    var heartIdx = Math.floor(Math.random() * count);
    var w = stage.clientWidth || 320;
    var h = stage.clientHeight || 320;

    for (var i = 0; i < count; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'floater';
      var heart = i === heartIdx;
      b.textContent = heart ? '♥' : DECOYS[i % DECOYS.length];
      if (heart) b.classList.add('is-heart');
      b.setAttribute('aria-label', heart ? 'heart' : 'object');
      var f = {
        el: b,
        heart: heart,
        x: 20 + Math.random() * Math.max(40, w - 90),
        y: 20 + Math.random() * Math.max(40, h - 90),
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5),
        vy: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5)
      };
      b.addEventListener('click', function (fl) {
        return function () { pickFloater(fl); };
      }(f));
      stage.appendChild(b);
      floaters.push(f);
    }
    move();
  }

  function move() {
    if (raf) window.cancelAnimationFrame(raf);
    if (!stage) return;
    var w = stage.clientWidth, h = stage.clientHeight;
    var move$ = function () {
      raf = window.requestAnimationFrame(move$);
      for (var i = 0; i < floaters.length; i++) {
        var f = floaters[i];
        f.x += f.vx * 1.6;
        f.y += f.vy * 1.6;
        if (f.x < 0) { f.x = 0; f.vx *= -1; }
        if (f.y < 0) { f.y = 0; f.vy *= -1; }
        if (f.x > w - 46) { f.x = w - 46; f.vx *= -1; }
        if (f.y > h - 46) { f.y = h - 46; f.vy *= -1; }
        f.el.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px)';
      }
    };
    move$();
  }

  function stopMove() {
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
  }

  function pickFloater(f) {
    if (f.heart) {
      f.el.classList.add('is-gone');
      A.sfx.correct();
      note(G.findFound);
      stopMove();
      window.setTimeout(function () {
        round++;
        if (round >= (G.findRounds || 1)) { note(''); startQuiz(); }
        else { note(''); buildRound(); }
      }, 900);
    } else {
      A.sfx.wrong();
      note(G.findMiss);
      f.vx *= -1.2;
      f.vy *= -1.2;
    }
  }

  /* ---------------- game 2: quiz ---------------- */
  function startQuiz() {
    stopMove();
    findBlock().hidden = true;
    var block = quizBlock();
    block.hidden = false;
    block.querySelector('.game-title').textContent = G.quizTitle;
    block.querySelector('.lede').textContent = G.quizHint;
    qi = 0;
    hearts = 0;
    hugs = 0;
    render();
  }

  function render() {
    var q = G.questions[qi];
    if (!q) return finish();
    answered = false;
    var block = quizBlock();
    block.querySelector('.quiz-q').textContent = q.q;
    var fb = block.querySelector('.quiz-feedback');
    fb.textContent = '';
    fb.className = 'quiz-feedback';

    var opts = block.querySelector('.quiz-opts');
    opts.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = q.options[i];
      b.setAttribute('data-i', i);
      b.addEventListener('click', function (ev) {
        answer(parseInt(ev.currentTarget.getAttribute('data-i'), 10));
      });
      opts.appendChild(b);
    }
    updateCount();
  }

  function answer(i) {
    if (answered) return;
    answered = true;
    var q = G.questions[qi];
    var block = quizBlock();
    var opts = block.querySelectorAll('.quiz-opt');
    var fb = block.querySelector('.quiz-feedback');
    var right = i === q.answer;

    for (var k = 0; k < opts.length; k++) {
      var idx = parseInt(opts[k].getAttribute('data-i'), 10);
      opts[k].disabled = true;
      if (idx === q.answer) opts[k].classList.add('is-right');
      else if (idx === i) opts[k].classList.add('is-wrong');
    }
    fb.textContent = right ? q.right : q.wrong;
    fb.className = 'quiz-feedback ' + (right ? 'is-right' : 'is-wrong');
    if (right) { hearts++; A.sfx.correct(); } else { hugs++; A.sfx.wrong(); }
    updateCount();

    window.setTimeout(function () {
      qi++;
      if (qi < G.questions.length) render(); else finish();
    }, 1500);
  }

  function updateCount() {
    var c = document.getElementById('heartCount');
    if (!c) return;
    var total = G.questions.length;
    c.textContent = '💗 ' + hearts + '/' + total + (hugs ? '  ·  ' + hugs + ' hugs owed' : '');
  }

  function finish() {
    updateCount();
    var block = root().querySelector('[data-games-next]');
    if (block) {
      block.hidden = false;
      block.textContent = G.next;
      block.classList.add('is-in');
    }
    S.mark('gamesDone');
    A.sfx.chime();
  }

  /* ---------------- daftar scene ---------------- */
  function enter() {
    if (!built) {
      var el = root();
      var hn = el.querySelector('[data-games-next]');
      if (hn) {
        hn.addEventListener('click', function () {
          A.sfx.tap();
          S.complete('gamesDone', 'voice');
        });
      }
      built = true;
    }
    if (S.isDone('gamesDone')) {
      /* sudah selesai sebelumnya: langsung tampilkan hasil kuis */
      startQuiz();
      finish();
    } else {
      startFind();
    }
  }

  LOVE.state.register('games', {
    onEnter: enter,
    onLeave: stopMove,
    onReplay: function () {
      stopMove();
      round = 0; qi = 0; hearts = 0; hugs = 0;
      var n = root().querySelector('[data-games-next]');
      if (n) { n.hidden = true; n.classList.remove('is-in'); }
    }
  });
})();

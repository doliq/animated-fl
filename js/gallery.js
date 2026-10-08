/* ============================================================================
   gallery.js — penyimpanan photo strip.
   Strip disimpan sebagai blob di IndexedDB, jadi tetap ada setelah halaman
   ditutup/di-refresh. Kalau IndexedDB tidak tersedia (mode privat), otomatis
   jatuh ke penyimpanan sementara di memori.
   ========================================================================== */
(function () {
  var LOVE = window.LOVE = window.LOVE || {};

  var DB_NAME = 'dira-album';
  var STORE = 'strips';
  var VERSION = 1;
  var TIMEOUT = 4000;     /* pengaman: kalau database tidak menjawab, pakai memori */

  var dbPromise = null;
  var memory = [];        /* cadangan kalau IndexedDB gagal */
  var seq = 0;
  var latestRec = null;   /* strip terakhir yang ditambahkan sesi ini (sinkron) */

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('indexeddb-unavailable')); return; }
      var req = window.indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('date', 'date');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function store(mode) {
    return open().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function wrap(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  /* jangan biarkan UI menunggu selamanya kalau database tidak merespons */
  function guard(promise, fallback) {
    return Promise.race([
      promise,
      new Promise(function (resolve) { window.setTimeout(function () { resolve(fallback); }, TIMEOUT); })
    ]);
  }

  function decorate(rows) {
    rows.sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].url && rows[i].blob) rows[i].url = URL.createObjectURL(rows[i].blob);
    }
    return rows;
  }

  var Gallery = {
    /* simpan satu strip baru; mengembalikan record-nya */
    add: function (blob) {
      if (!blob) return Promise.resolve(null);
      var rec = {
        id: 'strip-' + Date.now() + '-' + (seq++),
        date: Date.now(),
        blob: blob,
        url: URL.createObjectURL(blob)
      };
      latestRec = rec;
      return guard(
        store('readwrite')
          .then(function (os) { return wrap(os.put(rec)); })
          .then(function () { return rec; })
          .catch(function () { memory.unshift(rec); return rec; }),
        rec
      );
    },

    /* strip terakhir yang diketahui tanpa menunggu database */
    peek: function () { return latestRec; },

    /* semua strip, terbaru lebih dulu */
    list: function () {
      return guard(
        store('readonly')
          .then(function (os) { return wrap(os.getAll()); })
          .then(function (rows) { return decorate(rows || []); })
          .catch(function () { return memory.slice(); }),
        memory.slice()
      );
    },

    latest: function () {
      return Gallery.list().then(function (rows) { return rows[0] || null; });
    },

    remove: function (id) {
      var i;
      if (latestRec && latestRec.id === id) latestRec = null;
      for (i = 0; i < memory.length; i++) {
        if (memory[i].id === id) {
          if (memory[i].url) URL.revokeObjectURL(memory[i].url);
          memory.splice(i, 1);
        }
      }
      return guard(
        store('readwrite')
          .then(function (os) { return wrap(os.delete(id)); })
          .then(function () { return true; })
          .catch(function () { return false; }),
        true
      );
    },

    count: function () {
      return Gallery.list().then(function (rows) { return rows.length; });
    }
  };

  LOVE.gallery = Gallery;
})();

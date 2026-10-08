/* ============================================================================
   content.js — SEMUA ISI ADA DI SINI. Bahasa Inggris, sengaja sesingkat mungkin.
   ----------------------------------------------------------------------------
   Foto     : assets/photos/01.jpeg … 06.jpeg   (belum ada = placeholder, aman)
   Video    : assets/video/*.mp4                (diputar di objek "Media")
   Poster   : assets/film/*.jpg                 (diputar di objek "movies")
   Voice    : assets/audio/voice.mp3
   Lagu     : assets/music/lagu.mp3
   Aturan   : satu pikiran = satu baris pendek. Jangan tambah kalimat kalau tidak
              perlu — bagian ini yang bikin situsnya terasa personal.
   Catatan  : kalau file ini diedit dari luar (mis. oleh asisten), buka ulang
              tabnya di editor (Revert File) supaya tidak menimpa versi terbaru.
   ========================================================================== */
(function () {
  window.LOVE_CONTENT = {

    name: 'Dira',
    sender: 'Oliq',

    /* ---------- label kecil yang dipakai berulang ---------- */
    ui: {
      ok: 'Okeyy',
      go: 'Letsgowww'
    },

    /* ---------- Scene 01 — Opening / Digital Letter ---------- */
    opening: {
      sealHint: 'Tap to open',
      lines: [
        'Hi, Dira.',
        "I don't really know how to put everything I feel into words…",
        'So I made you a little place instead.'
      ],
      cta: 'Come with me'
    },

    /* ---------- Scene 02 — Photobooth (pintu masuk tempatnya) ---------- */
    photobooth: {
      kicker: 'the first thing',
      title: 'A photo first.',
      hint: '3 shots. Pick a filter if you feel like it.',
      start: 'Start',
      useFile: 'Or pick from gallery',
      cameraDenied: 'No camera here. Pick from your gallery instead.',
      filterLabel: 'Filter',
      frameLabel: 'Frame',
      pose: ['Look here.', 'One more.', 'Last one.'],
      countdown: 3,
      shots: 3,
      retake: 'Again',
      download: 'Save',
      share: 'Share',
      stripCaption: 'Dira & Oliq',
      stripSub: 'A photo, today',
      next: 'Go inside',
      filters: [
        { id: 'none',  name: 'Original', css: 'none', tint: null },
        { id: 'warm',  name: 'Warm',     css: 'sepia(0.22) saturate(1.16) brightness(1.06)', tint: 'rgba(255,176,110,0.10)' },
        { id: 'soft',  name: 'Soft',     css: 'brightness(1.08) saturate(0.92) contrast(0.96)', tint: 'rgba(255,170,205,0.14)' },
        { id: 'mono',  name: 'Mono',     css: 'grayscale(1) contrast(1.08) brightness(1.03)', tint: null },
        { id: 'dusk',  name: 'Dusk',     css: 'saturate(1.25) hue-rotate(-10deg) brightness(1.02)', tint: 'rgba(255,120,80,0.14)' },
        { id: 'film',  name: 'Film',     css: 'contrast(1.12) saturate(1.05) sepia(0.14)', tint: 'rgba(120,90,200,0.08)' }
      ],
      frames: [
        { id: 'cinema',   name: 'Cinema' },
        { id: 'polaroid', name: 'Polaroid' },
        { id: 'noir',     name: 'Noir' },
        { id: 'paper',    name: 'Paper' },
        { id: 'plain',    name: 'Plain' },
        { id: 'hearts',   name: 'Hearts' },
        { id: 'garden',   name: 'Garden' }
      ]
    },

    /* ---------- Scene 03 — Little World (ruangan) ---------- */
    world: {
      hint: 'Tap things.',
      /* hanya tiga benda yang punya isi & interaksi */
      objects: [
        { id: 'photo', icon: '🖼️', label: 'Media', media: true,
          lines: ['Remember those videos I edited a while ago?',
                  'Haha, the edits were so unserious.'],
          videos: [
            { src: 'assets/video/edenberq.mp4', label: 'edenberq' },
            { src: 'assets/video/oc.mp4', label: 'oc' },
            { src: 'assets/video/swisy.mp4', label: 'swisy' }
          ] },

        { id: 'film', icon: '🎬', label: 'movies',
          posters: [
            { src: 'assets/film/exhuma.jpg', title: 'Exhuma' },
            { src: 'assets/film/crazy-rich-asians.jpg', title: 'Crazy Rich Asians' },
            { src: 'assets/film/shutter-island.jpg', title: 'Shutter Island' }
          ],
          lines: ["What we've watched so far.", 'And still counting'] },

        { id: 'flower', icon: '🌷', label: 'flower', goScene: 'flower',
          lines: ['Not yet.', 'Tap it.'] }
      ],
      next: 'Keep going',
      emptyLine: 'The frame is empty. Take the photo first.',

      /* isi panel "Media": dua pilihan dulu, baru isinya */
      media: {
        photo: 'Photo',
        video: 'Video',
        back: 'Back',
        empty: 'No photo strips yet. Take one in the photobooth first.',
        videoEmpty: 'No videos inside yet.',
        countOne: 'strip',
        countMany: 'strips',
        deleteOne: 'Delete'
      },

      /* teks yang tidak lagi jadi benda di ruangan — disimpan di sini supaya
         gampang dipasang lagi: pindahkan satu blok ke objects di atas */
      parked: [
        { id: 'laptop', icon: '💻', label: 'laptop or phone',
          lines: ["The place we hang out when we're virtual.",
                  'Watch some movies, chit chat, talk randomly, share random things.'] },
        { id: 'bed', icon: '🛏️', label: 'bed',
          lines: ['Where we share a lot of things.',
                  'Random stories, deep talk, even government language.',
                  "And you can't call until you've touched the bed."] },
        { id: 'dira', label: 'dira', figure: true,
          lines: ['This is you.', 'I drew you from memory.'] }
      ],

      star: {
        lines: ["You weren't supposed to find this.",
                'But since you did: you are my favorite notification.']
      }
    },

    /* ---------- Scene 04 — Interactive Flower ---------- */
    flower: {
      steps: ['Tap the flower.', 'Again.', 'One more.'],
      afterBloom: ["Flowers for someone as gorgeous as they are. 🌸"],
      gardenHint: 'Tap anywhere else to plant more.',
      next: 'Keep going'
    },

    /* ---------- Scene 05 — Our Timeline (memory map) ---------- */
    timeline: {
      title: 'Our timeline',
      hint: 'One by one.',
      /* teks untuk kartu ber-media "text" (penerima bisa menulis sendiri) */
      text: {
        prompt: 'Your turn.',
        placeholder: 'Write something here…',
        note: 'It stays on this phone.',
        save: 'Save',
        saved: 'Saved.'
      },
      nodes: [
        { when: 'The day we know each other',
          media: { type: 'photo', src: 'assets/photos/01.jpeg' },
          story: ['I did not expect we both got acquainted from people nearby.',
                  'But this moment was going to become one of my favorite memories.',
                  '(07/09)'] },

        { when: 'Do some scam for to be moots ig haha...',
          media: { type: 'photo', src: ['assets/photos/02.jpeg', 'assets/photos/03.jpeg'] },
          story: ['I was really serious about the scam, I even sent screenshots and asked GPT to edit them, hehehe',
                  'Even tho I got Ansel’s twin’s Instagram account LOL.',
                  '(13/09)'] },

        { when: 'The first time we do calling',
          media: { type: 'photo', src: 'assets/photos/04.jpeg' },
          story: ['Honestly, I did not expect that we would be able to talk for hours.',
                  'But hey, thankss for accepting me to join the call, even though we struggled with the network, and do not forget about the phone sound being too low.',
                  '(13/09)'] },

        { when: 'The first day you sent me a pap',
          media: { type: 'photo', src: 'assets/photos/05.jpeg' },
          story: ['I was very dery cherry berry apple pie happy, tbh.',
                  'For the first time I saw u, even just from the outfit I was like "terpana".'] },

        { when: 'The moment I called you "Sayang"',
          media: { type: 'photo', src: 'assets/photos/06.jpeg' },
          story: ['Kinda nervous, but I wanted to say it.',
                  '(29/09)'] },

        { when: 'Today',
          media: { type: 'text', prompt: 'Your turn.', placeholder: 'Write something…', note: 'It stays on this phone.' },
          story: ['Still you.', 'Still choosing this.'] }
      ],
      next: 'Keep going'
    },

    /* ---------- Scene 06 — Mini games ---------- */
    games: {
      findTitle: 'Find the heart.',
      findHint: 'Tap the one hiding it.',
      findFound: 'Found it.',
      findMiss: 'Nope.',
      findRounds: 2,
      quizTitle: 'How well do you know us?',
      quizHint: 'Wrong answers cost you a hug.',
      questions: [
        { q: 'Who takes longer to reply?',
          options: ['Me', 'You', 'Depends on the day', 'Neither, we are fast'], answer: 1,
          right: 'Correct. mostly you.',
          wrong: 'Wrong. You owe me one hug.' },
        { q: 'Who falls asleep first?',
          options: ['Me', 'We both do', 'We never did that', 'You'], answer: 3,
          right: 'Correct. And always.',
          wrong: 'Wrong. You owe me one hug.' },
        { q: 'Who is more annoying?',
          options: ['You', 'Me', 'Equal', 'We take turns'], answer: 1,
          right: 'Correct, and I own it.',
          wrong: 'Wrong. You owe me one hug.' },
        { q: 'Who fell in love first?',
          options: ['Me', 'You', 'Nobody, we just knew', 'Both, same week'], answer: 2,
          right: 'Correct. Suddenly, maybe because we have so much in common.',
          wrong: 'Wrong. You owe me one hug.' }
      ],
      heartWord: 'hearts',
      next: 'One more thing'
    },

    /* ---------- Scene 07 — Voice message ---------- */
    voice: {
      title: 'Listen to this.',
      hint: 'Put your headphones on.',
      play: '🎧  Listen',
      transcriptToggle: 'Words',
      file: 'assets/audio/voice.mp3',
      missing: 'Not recorded yet. Drop it in assets/audio/voice.mp3.',
      transcript: [
        'No recording yet — this text is just a placeholder.',
        'When you put the file in assets/audio/voice.mp3, this part comes alive.'
      ],
      next: 'Last part'
    },

    /* ---------- Hidden easter egg ---------- */
    easter: {
      word: 'dira',
      title: 'ACCESS GRANTED',
      lines: ['You type ur name gorgy, such a pretty as an angel👼',
              'I love you so much, I hope you know that.'],
      next: 'Back to the world'
    },

    /* ---------- Scene 08 — Final ---------- */
    final: {
      lines: [
        "And that's it.",
        'No big reason.',
        'I just wanted to make something that reminds you…',
        '…that somewhere in this world, there\u2019s someone who chose to spend his time making this for you.'
      ],
      pause: [900, 900, 1100, 1400],
      love: 'I love you.',
      sign: '— Oliq',
      replay: 'Start Again ♡'
    }
  };
})();

(() => {
  'use strict';

  const DECKS = {
    symbols: ['◆','●','▲','★','♥','✦','◈','✚','❖','⬟','⬢','✳','✶','✷','✸','✹','⬣','⬠','⬡','▣','◐','◑','◒','◓'],
    animals: ['🐵','🐶','🐱','🦁','🐮','🐷','🐸','🐨','🐼','🦊','🐰','🐻','🐯','🐹','🐭','🐔','🐧','🐦','🦆','🦉','🦇','🐗','🐴','🐝'],
    planets: ['🪐','🌍','🌕','🌞','☄️','🌟','🌌','🛰️','🚀','🌠','🔭','🌑','🌎','🌏','🌒','🌓','🌔','🌖','🌗','🌘','🌙','✨','💫','🛸'],
  };

  const SIZES = {
    '3x2': { cols: 3, pairs: 3 },
    '4x3': { cols: 4, pairs: 6 },
    '4x4': { cols: 4, pairs: 8 },
    '6x4': { cols: 6, pairs: 12 },
    '6x6': { cols: 6, pairs: 18 },
    '8x6': { cols: 8, pairs: 24 },
  };

  const boardEl = document.getElementById('board');
  const movesEl = document.getElementById('moves').querySelector('strong');
  const timerEl = document.getElementById('timer').querySelector('strong');
  const scoreEls = { 1: document.getElementById('score-p1'), 2: document.getElementById('score-p2') };
  const railEls = { 1: document.getElementById('rail-p1'), 2: document.getElementById('rail-p2') };
  const labelEls = { 1: railEls[1].querySelector('.rail__label'), 2: railEls[2].querySelector('.rail__label') };

  const setupOverlay = document.getElementById('setup-overlay');
  const winOverlay = document.getElementById('win-overlay');
  const gridSizeGroup = document.getElementById('grid-size');
  const deckThemeGroup = document.getElementById('deck-theme');

  let state = null;
  let choice = { size: '4x4', theme: 'symbols' };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck(sizeKey, themeKey) {
    const { pairs } = SIZES[sizeKey];
    const symbols = DECKS[themeKey].slice(0, pairs);
    const deck = shuffle([...symbols, ...symbols]).map((sym, i) => ({
      id: i, sym, flipped: false, matched: false,
    }));
    return deck;
  }

  function startGame(sizeKey, themeKey) {
    const { cols } = SIZES[sizeKey];
    boardEl.style.setProperty('--cols', cols);
    boardEl.style.setProperty('--gap', cols >= 8 ? '6px' : cols >= 6 ? '8px' : '12px');

    state = {
      deck: buildDeck(sizeKey, themeKey),
      current: 1,
      scores: { 1: 0, 2: 0 },
      moves: 0,
      locked: false,
      firstPick: null,
      startTime: null,
      timerHandle: null,
      sizeKey, themeKey,
    };

    render();
    updateTurnUI();
    scoreEls[1].textContent = '0';
    scoreEls[2].textContent = '0';
    movesEl.textContent = '0';
    timerEl.textContent = '0:00';

    setupOverlay.hidden = true;
    winOverlay.hidden = true;
  }

  function render() {
    boardEl.innerHTML = '';
    state.deck.forEach((card) => {
      const el = document.createElement('button');
      el.className = 'card';
      el.setAttribute('aria-label', 'Memory card');
      el.dataset.id = card.id;
      el.innerHTML = `
        <span class="card__face card__face--back"></span>
        <span class="card__face card__face--front">${card.sym}</span>
      `;
      el.addEventListener('click', () => onCardClick(card.id));
      boardEl.appendChild(el);
    });
  }

  function cardEl(id) {
    return boardEl.querySelector(`.card[data-id="${id}"]`);
  }

  function ensureTimer() {
    if (state.startTime) return;
    state.startTime = Date.now();
    state.timerHandle = setInterval(() => {
      const s = Math.floor((Date.now() - state.startTime) / 1000);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      timerEl.textContent = `${m}:${rem.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopTimer() {
    if (state.timerHandle) clearInterval(state.timerHandle);
  }

  function onCardClick(id) {
    if (state.locked) return;
    const card = state.deck.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    ensureTimer();
    card.flipped = true;
    cardEl(id).classList.add('is-flipped');

    if (state.firstPick === null) {
      state.firstPick = card;
      return;
    }

    // second pick
    state.locked = true;
    state.moves += 1;
    movesEl.textContent = state.moves;

    const a = state.firstPick;
    const b = card;
    state.firstPick = null;

    if (a.sym === b.sym) {
      a.matched = true; b.matched = true;
      state.scores[state.current] += 1;
      scoreEls[state.current].textContent = state.scores[state.current];
      setTimeout(() => {
        cardEl(a.id).classList.add('is-matched');
        cardEl(b.id).classList.add('is-matched');
        state.locked = false;
        checkWin();
      }, 260);
    } else {
      setTimeout(() => {
        a.flipped = false; b.flipped = false;
        cardEl(a.id).classList.remove('is-flipped');
        cardEl(b.id).classList.remove('is-flipped');
        state.current = state.current === 1 ? 2 : 1;
        updateTurnUI();
        state.locked = false;
      }, 900);
    }
  }

  function updateTurnUI() {
    const p1Active = state.current === 1;
    const p2Active = state.current === 2;
    railEls[1].classList.toggle('rail--active', p1Active);
    railEls[2].classList.toggle('rail--active', p2Active);
    labelEls[1].textContent = p1Active ? 'Your turn' : 'Player 1';
    labelEls[2].textContent = p2Active ? 'Your turn' : 'Player 2';
  }

  function checkWin() {
    if (!state.deck.every((c) => c.matched)) return;
    stopTimer();
    const { 1: s1, 2: s2 } = state.scores;
    let title;
    if (s1 === s2) title = "It's a tie!";
    else title = `Player ${s1 > s2 ? 1 : 2} wins!`;
    document.getElementById('win-title').textContent = title;
    document.getElementById('win-sub').textContent =
      `${s1} – ${s2} · ${state.moves} moves · ${timerEl.textContent}`;
    winOverlay.hidden = false;
  }

  // ---- setup overlay interactions ----
  function wireSegmented(group, key) {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      [...group.children].forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      choice[key] = btn.dataset.size || btn.dataset.theme;
    });
  }
  wireSegmented(gridSizeGroup, 'size');
  wireSegmented(deckThemeGroup, 'theme');

  // ---- orientation lock ----
  // Chrome only allows screen.orientation.lock() while the page is
  // fullscreen (or running as an installed app), and Safari doesn't
  // implement the lock at all — so on top of that best-effort JS call,
  // stageEl gets a CSS class recording whichever orientation category
  // (portrait/landscape) the device is already in when the game
  // starts. A plain @media query in style.css rotates #stage back by
  // 90deg the instant the device's *actual* category later disagrees
  // with that class. This has to stay a media query rather than a JS
  // handler: it needs to land in the same layout pass as the browser's
  // own reflow, or there's a visible flash of the unrotated layout for
  // the moment before a JS event handler could catch up.
  //
  // A plain category media query can't tell portrait-primary from
  // portrait-secondary (or landscape-primary from -secondary) though,
  // so it can still land 180deg off: a flip straight to the opposite
  // side within the same category, or turning into landscape from the
  // "other" direction. #stage-fix corrects that residual using the
  // real screen.orientation.angle (a read-only property Safari does
  // implement, unlike .lock()) — the residual between the media
  // query's assumption and the true angle is always exactly 0 or
  // 180deg, so this only ever adds a plain flip, and only in those
  // rarer cases, leaving the common single-direction rotation untouched
  // and instant.
  const stageEl = document.getElementById('stage');
  const stageFixEl = document.getElementById('stage-fix');
  let lockedCategory = null;
  let lockedAngle = null;

  function currentCategory() {
    return matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
  }

  function currentAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    return currentCategory() === 'portrait' ? 0 : 90;
  }

  function applyFlipFix() {
    if (lockedAngle === null) return;
    const trueDelta = ((currentAngle() - lockedAngle) % 360 + 360) % 360;
    const naiveDelta = currentCategory() === lockedCategory ? 0 : 90;
    const residual = ((trueDelta - naiveDelta) % 360 + 360) % 360;
    stageFixEl.classList.toggle('orient-flip', residual === 180);
  }

  function lockOrientationCSS() {
    lockedCategory = currentCategory();
    lockedAngle = currentAngle();
    stageEl.classList.toggle('orient-lock--portrait', lockedCategory === 'portrait');
    stageEl.classList.toggle('orient-lock--landscape', lockedCategory === 'landscape');
    applyFlipFix();
  }

  function unlockOrientationCSS() {
    lockedCategory = null;
    lockedAngle = null;
    stageEl.classList.remove('orient-lock--portrait', 'orient-lock--landscape');
    stageFixEl.classList.remove('orient-flip');
  }

  if (screen.orientation && 'onchange' in screen.orientation) {
    screen.orientation.addEventListener('change', applyFlipFix);
  }
  window.addEventListener('orientationchange', applyFlipFix);
  matchMedia('(orientation: portrait)').addEventListener('change', applyFlipFix);

  function lockOrientation() {
    lockOrientationCSS();
    const lock = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock(screen.orientation.type).catch(() => {});
      }
    };
    if (document.fullscreenElement) {
      lock();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(lock).catch(lock);
    } else {
      lock();
    }
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    lockOrientation();
    startGame(choice.size, choice.theme);
  });
  document.getElementById('btn-new').addEventListener('click', () => {
    stopTimer();
    unlockOrientationCSS();
    setupOverlay.hidden = false;
    winOverlay.hidden = true;
  });
  document.getElementById('btn-rematch').addEventListener('click', () => {
    lockOrientation();
    startGame(state.sizeKey, state.themeKey);
  });
  document.getElementById('btn-change-setup').addEventListener('click', () => {
    unlockOrientationCSS();
    winOverlay.hidden = true;
    setupOverlay.hidden = false;
  });

  // ---- PWA install prompt ----
  let deferredPrompt = null;
  const installBtn = document.getElementById('btn-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  // ---- service worker ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();

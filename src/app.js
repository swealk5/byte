const STORAGE_CUSTOM_GAMES = 'playdeck_custom_games_v1';
const STORAGE_FAVORITES = 'playdeck_favorites_v1';

const state = {
  baseGames: [],
  customGames: [],
  favorites: new Set(),
  activeCategory: 'All',
  searchQuery: '',
  currentGameId: null,
  theatreMode: false,
  loading: true,
  error: null,
};

const els = {
  pageMain: document.getElementById('top'),
  brandLink: document.getElementById('brandLink'),
  navLinks: Array.from(document.querySelectorAll('[data-nav-category]')),
  filterTabs: Array.from(document.querySelectorAll('[data-filter]')),
  searchInput: document.getElementById('searchInput'),
  catalogCount: document.getElementById('catalogCount'),
  catalogStatus: document.getElementById('catalogStatus'),
  gameGrid: document.getElementById('gameGrid'),
  libraryView: document.getElementById('libraryView'),
  featuredHero: document.getElementById('featuredHero'),
  featuredKicker: document.getElementById('featuredKicker'),
  featuredTitle: document.getElementById('featuredTitle'),
  featuredDesc: document.getElementById('featuredDesc'),
  featuredMeta: document.getElementById('featuredMeta'),
  featuredImage: document.getElementById('featuredImage'),
  featuredPlayBtn: document.getElementById('featuredPlayBtn'),
  randomGameBtn: document.getElementById('randomGameBtn'),
  playerView: document.getElementById('playerView'),
  backToLibraryBtn: document.getElementById('backToLibraryBtn'),
  playerTitle: document.getElementById('playerTitle'),
  playerMeta: document.getElementById('playerMeta'),
  playerDescription: document.getElementById('playerDescription'),
  stageShell: document.getElementById('stageShell'),
  iframeLoader: document.getElementById('iframeLoader'),
  iframeHost: document.getElementById('iframeHost'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  reloadGameBtn: document.getElementById('reloadGameBtn'),
  theatreBtn: document.getElementById('theatreBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  toggleJsonBtn: document.getElementById('toggleJsonBtn'),
  removeCustomBtn: document.getElementById('removeCustomBtn'),
  jsonPreview: document.getElementById('jsonPreview'),
  relatedGrid: document.getElementById('relatedGrid'),
  openAddModalBtn: document.getElementById('openAddModalBtn'),
  addGameModal: document.getElementById('addGameModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  addGameForm: document.getElementById('addGameForm'),
  gameTitleInput: document.getElementById('gameTitleInput'),
  gameCategoryInput: document.getElementById('gameCategoryInput'),
  gameControlsInput: document.getElementById('gameControlsInput'),
  gameIframeInput: document.getElementById('gameIframeInput'),
  gameDescInput: document.getElementById('gameDescInput'),
  formError: document.getElementById('formError'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
};

function loadLocalData() {
  try {
    const savedCustom = localStorage.getItem(STORAGE_CUSTOM_GAMES);
    if (savedCustom) {
      const parsed = JSON.parse(savedCustom);
      if (Array.isArray(parsed)) {
        state.customGames = parsed.map((g) => ({ ...g, isCustom: true }));
      }
    }
  } catch {
    state.customGames = [];
  }

  try {
    const savedFavs = localStorage.getItem(STORAGE_FAVORITES);
    if (savedFavs) {
      const parsedFavs = JSON.parse(savedFavs);
      if (Array.isArray(parsedFavs)) {
        state.favorites = new Set(parsedFavs);
      }
    }
  } catch {
    state.favorites = new Set();
  }
}

function saveCustomGames() {
  const clean = state.customGames.map(({ isCustom, ...rest }) => rest);
  localStorage.setItem(STORAGE_CUSTOM_GAMES, JSON.stringify(clean));
}

function saveFavorites() {
  localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(Array.from(state.favorites)));
}

function getAllGames() {
  return [...state.baseGames, ...state.customGames];
}

function isSafeIframeSrc(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/games/') || trimmed.startsWith('./games/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseIframeFromJson(iframeString, fallbackTitle) {
  const doc = new DOMParser().parseFromString(String(iframeString || ''), 'text/html');
  const sourceFrame = doc.querySelector('iframe');
  if (!sourceFrame) return null;

  const src = sourceFrame.getAttribute('src') || '';
  if (!isSafeIframeSrc(src)) return null;

  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = sourceFrame.getAttribute('title') || fallbackTitle || 'Unblocked Game';
  frame.loading = sourceFrame.getAttribute('loading') || 'eager';

  const allowAttr = sourceFrame.getAttribute('allow');
  if (allowAttr) {
    frame.setAttribute('allow', allowAttr);
  }
  if (sourceFrame.hasAttribute('allowfullscreen')) {
    frame.setAttribute('allowfullscreen', '');
  }

  const sandboxAttr = sourceFrame.getAttribute('sandbox');
  if (sandboxAttr) {
    frame.setAttribute('sandbox', sandboxAttr);
  } else {
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-forms');
  }

  return frame;
}

function normalizeIframeInput(rawInput, title) {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().includes('<iframe')) {
    const parsed = parseIframeFromJson(trimmed, title);
    if (!parsed) return null;
    const wrapper = document.createElement('div');
    wrapper.appendChild(parsed);
    return wrapper.innerHTML;
  }

  if (!isSafeIframeSrc(trimmed)) return null;
  const frame = document.createElement('iframe');
  frame.src = trimmed;
  frame.title = title;
  frame.loading = 'lazy';
  frame.setAttribute('allow', 'fullscreen');
  frame.setAttribute('allowfullscreen', '');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-forms');
  const wrapper = document.createElement('div');
  wrapper.appendChild(frame);
  return wrapper.innerHTML;
}

function getFilteredGames() {
  const query = state.searchQuery.trim().toLowerCase();
  return getAllGames().filter((game) => {
    const matchesCategory =
      state.activeCategory === 'All' ||
      (state.activeCategory === 'Favorites'
        ? state.favorites.has(game.id)
        : game.category === state.activeCategory);

    if (!matchesCategory) return false;
    if (!query) return true;

    const haystack = `${game.title} ${game.category} ${game.controls} ${game.description}`.toLowerCase();
    return haystack.includes(query);
  });
}

function createStarSvg(filled) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  );
  svg.appendChild(path);
  return svg;
}

function createGameCard(game) {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;

  const openHandler = () => launchGame(game.id);
  card.addEventListener('click', (event) => {
    if (event.target.closest('.fav-star-btn')) return;
    openHandler();
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target.closest('.fav-star-btn')) return;
      event.preventDefault();
      openHandler();
    }
  });

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'game-thumb-wrap';

  const fallback = document.createElement('div');
  fallback.className = 'game-thumb-fallback';
  fallback.textContent = game.title;
  thumbWrap.appendChild(fallback);

  if (game.thumbnail) {
    const img = document.createElement('img');
    img.className = 'game-thumb-img';
    img.src = game.thumbnail;
    img.alt = `${game.title} cover artwork`;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => {
      fallback.hidden = true;
    });
    img.addEventListener('error', () => {
      img.remove();
      fallback.hidden = false;
    });
    thumbWrap.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'game-card-body';

  const headerRow = document.createElement('div');
  headerRow.className = 'game-card-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'game-card-title';
  titleEl.textContent = game.title;

  const isFav = state.favorites.has(game.id);
  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = `fav-star-btn${isFav ? ' is-favorited' : ''}`;
  favBtn.setAttribute('aria-label', isFav ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`);
  favBtn.setAttribute('aria-pressed', String(isFav));
  favBtn.appendChild(createStarSvg(isFav));
  favBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFavorite(game.id);
  });

  headerRow.appendChild(titleEl);
  headerRow.appendChild(favBtn);

  const meta = document.createElement('div');
  meta.className = 'game-card-meta';
  const catSpan = document.createElement('span');
  catSpan.textContent = game.category;
  const sep = document.createElement('span');
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '·';
  const ctrlSpan = document.createElement('span');
  ctrlSpan.textContent = game.controls || 'Keyboard & Mouse';
  meta.append(catSpan, sep, ctrlSpan);

  if (game.isCustom) {
    const customSep = document.createElement('span');
    customSep.setAttribute('aria-hidden', 'true');
    customSep.textContent = '·';
    const customSpan = document.createElement('span');
    customSpan.textContent = 'Custom';
    meta.append(customSep, customSpan);
  }

  const desc = document.createElement('p');
  desc.className = 'game-card-desc';
  desc.textContent = game.description || 'Play directly inside an embedded iframe.';

  body.append(headerRow, meta, desc);
  card.append(thumbWrap, body);
  return card;
}

function renderFeatured() {
  const games = getAllGames();
  const featured = games.find((g) => g.featured) || games[0];
  if (!featured) {
    els.featuredHero.hidden = true;
    return;
  }

  els.featuredHero.hidden = false;
  els.featuredKicker.textContent = `Featured ${featured.category}`;
  els.featuredTitle.textContent = featured.title;
  els.featuredDesc.textContent = featured.description;
  els.featuredMeta.innerHTML = '';

  const cSpan = document.createElement('span');
  cSpan.textContent = featured.category;
  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  dot.textContent = '·';
  const kSpan = document.createElement('span');
  kSpan.textContent = featured.controls;
  els.featuredMeta.append(cSpan, dot, kSpan);

  if (featured.thumbnail) {
    els.featuredImage.src = featured.thumbnail;
    els.featuredImage.alt = `${featured.title} cover artwork`;
  }

  els.featuredPlayBtn.onclick = () => launchGame(featured.id);
}

function renderCatalog() {
  els.navLinks.forEach((link) => {
    const cat = link.getAttribute('data-nav-category');
    link.classList.toggle('is-active', cat === state.activeCategory);
  });

  els.filterTabs.forEach((tab) => {
    const filter = tab.getAttribute('data-filter');
    const active = filter === state.activeCategory;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  if (state.loading) {
    els.gameGrid.innerHTML = '';
    els.catalogStatus.hidden = false;
    els.catalogStatus.innerHTML = `
      <h3 class="catalog-status-title">Loading games catalog</h3>
      <p class="catalog-status-text">Reading iframe entries from games.json...</p>
    `;
    els.catalogCount.textContent = 'Loading...';
    return;
  }

  if (state.error) {
    els.gameGrid.innerHTML = '';
    els.catalogStatus.hidden = false;
    els.catalogStatus.innerHTML = `
      <h3 class="catalog-status-title">Could not load games.json</h3>
      <p class="catalog-status-text">${escapeHtml(state.error)}</p>
      <button type="button" id="retryLoadBtn" class="btn-secondary">Retry</button>
    `;
    const retryBtn = document.getElementById('retryLoadBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', fetchCatalog);
    }
    els.catalogCount.textContent = '0 games';
    return;
  }

  const filtered = getFilteredGames();
  els.catalogCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'game' : 'games'}`;

  if (filtered.length === 0) {
    els.gameGrid.innerHTML = '';
    els.catalogStatus.hidden = false;
    const isFavFilter = state.activeCategory === 'Favorites';
    els.catalogStatus.innerHTML = `
      <h3 class="catalog-status-title">${isFavFilter ? 'No favorite games yet' : 'No matching games found'}</h3>
      <p class="catalog-status-text">${
        isFavFilter
          ? 'Star any game card in the catalog to keep it handy here.'
          : 'Try clearing your search filter or adding a custom iframe game.'
      }</p>
      <button type="button" id="resetFilterBtn" class="btn-secondary">Show All Games</button>
    `;
    const resetBtn = document.getElementById('resetFilterBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.activeCategory = 'All';
        state.searchQuery = '';
        els.searchInput.value = '';
        renderCatalog();
      });
    }
    return;
  }

  els.catalogStatus.hidden = true;
  els.gameGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  filtered.forEach((game) => {
    fragment.appendChild(createGameCard(game));
  });
  els.gameGrid.appendChild(fragment);
}

function mountGameIframe(game) {
  els.iframeHost.innerHTML = '';
  els.iframeLoader.classList.remove('is-ready');
  els.iframeLoader.innerHTML = '<span>Loading game frame...</span>';

  const frame = parseIframeFromJson(game.iframe, game.title);
  if (!frame) {
    els.iframeLoader.innerHTML = '<span>Invalid iframe entry in JSON catalog.</span>';
    return;
  }

  frame.addEventListener('load', () => {
    els.iframeLoader.classList.add('is-ready');
    try {
      frame.focus();
    } catch {
      // Cross-origin iframes ignore programmatic focus
    }
  });

  els.iframeHost.appendChild(frame);
}

function renderPlayerView(game) {
  els.libraryView.hidden = true;
  els.playerView.hidden = false;
  els.pageMain.classList.toggle('is-theatre', state.theatreMode);

  els.playerTitle.textContent = game.title;
  els.playerDescription.textContent = game.description || '';

  els.playerMeta.innerHTML = '';
  const cat = document.createElement('span');
  cat.textContent = game.category;
  const sep = document.createElement('span');
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '·';
  const ctrl = document.createElement('span');
  ctrl.textContent = game.controls || 'Keyboard & Mouse';
  els.playerMeta.append(cat, sep, ctrl);

  const isFav = state.favorites.has(game.id);
  els.favoriteBtn.setAttribute('aria-pressed', String(isFav));
  els.favoriteBtn.textContent = isFav ? 'Favorited' : 'Favorite';

  els.theatreBtn.setAttribute('aria-pressed', String(state.theatreMode));
  els.theatreBtn.textContent = state.theatreMode ? 'Exit Theatre' : 'Theatre Mode';

  els.removeCustomBtn.hidden = !game.isCustom;

  const { isCustom, ...cleanEntry } = game;
  els.jsonPreview.textContent = JSON.stringify(cleanEntry, null, 2);
  els.jsonPreview.hidden = true;
  els.toggleJsonBtn.textContent = 'View Iframe JSON';

  mountGameIframe(game);
  renderRelatedGames(game.id);
}

function renderRelatedGames(excludeId) {
  const related = getAllGames()
    .filter((g) => g.id !== excludeId)
    .slice(0, 3);

  els.relatedGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  related.forEach((g) => fragment.appendChild(createGameCard(g)));
  els.relatedGrid.appendChild(fragment);
}

function launchGame(gameId, pushHash = true) {
  const game = getAllGames().find((g) => g.id === gameId);
  if (!game) return;

  state.currentGameId = game.id;
  if (pushHash) {
    window.location.hash = `play=${encodeURIComponent(game.id)}`;
  }
  renderPlayerView(game);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLibrary(pushHash = true) {
  state.currentGameId = null;
  state.theatreMode = false;
  els.pageMain.classList.remove('is-theatre');
  els.iframeHost.innerHTML = '';
  els.playerView.hidden = true;
  els.libraryView.hidden = false;

  if (pushHash && window.location.hash.startsWith('#play=')) {
    history.replaceState(null, '', '#library');
  }

  renderFeatured();
  renderCatalog();
}

function toggleFavorite(gameId) {
  if (state.favorites.has(gameId)) {
    state.favorites.delete(gameId);
  } else {
    state.favorites.add(gameId);
  }
  saveFavorites();

  if (state.currentGameId === gameId) {
    const isFav = state.favorites.has(gameId);
    els.favoriteBtn.setAttribute('aria-pressed', String(isFav));
    els.favoriteBtn.textContent = isFav ? 'Favorited' : 'Favorite';
  }
  renderCatalog();
}

function openAddModal() {
  els.formError.hidden = true;
  els.addGameModal.hidden = false;
  els.gameTitleInput.focus();
}

function closeAddModal() {
  els.addGameModal.hidden = true;
  els.addGameForm.reset();
  els.formError.hidden = true;
}

function slugify(text) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'custom-game'}-${Date.now().toString(36).slice(-4)}`;
}

function handleAddGameSubmit(event) {
  event.preventDefault();
  els.formError.hidden = true;

  const title = els.gameTitleInput.value.trim();
  const category = els.gameCategoryInput.value;
  const controls = els.gameControlsInput.value.trim() || 'Keyboard & Mouse';
  const rawIframe = els.gameIframeInput.value.trim();
  const description = els.gameDescInput.value.trim() || 'Custom iframe game added to your local catalog.';

  if (!title) {
    els.formError.textContent = 'Please enter a game title.';
    els.formError.hidden = false;
    return;
  }

  const normalizedIframe = normalizeIframeInput(rawIframe, title);
  if (!normalizedIframe) {
    els.formError.textContent = 'Enter a valid <iframe> tag or an https:// or /games/ URL.';
    els.formError.hidden = false;
    return;
  }

  const newGame = {
    id: slugify(title),
    title,
    category,
    controls,
    description,
    thumbnail: '',
    featured: false,
    iframe: normalizedIframe,
    isCustom: true,
  };

  state.customGames.push(newGame);
  saveCustomGames();
  closeAddModal();
  renderFeatured();
  renderCatalog();
  launchGame(newGame.id);
}

function exportCatalogJson() {
  const cleanGames = getAllGames().map(({ isCustom, ...rest }) => rest);
  const payload = JSON.stringify({ games: cleanGames }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'games.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchCatalog() {
  state.loading = true;
  state.error = null;
  renderCatalog();

  try {
    const response = await fetch('/games.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching /games.json`);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.games)) {
      throw new Error('games.json must contain a "games" array.');
    }
    state.baseGames = data.games;
    state.loading = false;
    renderFeatured();
    renderCatalog();
    handleHashRoute();
  } catch (err) {
    state.loading = false;
    state.error = err instanceof Error ? err.message : 'Unable to read games.json';
    renderCatalog();
  }
}

function handleHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#play=')) {
    const id = decodeURIComponent(hash.slice('#play='.length));
    const found = getAllGames().find((g) => g.id === id);
    if (found) {
      launchGame(found.id, false);
      return;
    }
  }
  if (state.currentGameId) {
    showLibrary(false);
  }
}

function bindEvents() {
  els.brandLink.addEventListener('click', (event) => {
    event.preventDefault();
    state.activeCategory = 'All';
    showLibrary();
  });

  els.navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      state.activeCategory = link.getAttribute('data-nav-category') || 'All';
      if (state.currentGameId) {
        showLibrary();
      } else {
        renderCatalog();
      }
      const catalogSection = document.getElementById('library');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  els.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activeCategory = tab.getAttribute('data-filter') || 'All';
      renderCatalog();
    });
  });

  els.searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    renderCatalog();
  });

  els.randomGameBtn.addEventListener('click', () => {
    const games = getAllGames();
    if (games.length === 0) return;
    const picked = games[Math.floor(Math.random() * games.length)];
    launchGame(picked.id);
  });

  els.backToLibraryBtn.addEventListener('click', () => showLibrary());

  els.favoriteBtn.addEventListener('click', () => {
    if (state.currentGameId) {
      toggleFavorite(state.currentGameId);
    }
  });

  els.reloadGameBtn.addEventListener('click', () => {
    const game = getAllGames().find((g) => g.id === state.currentGameId);
    if (game) {
      mountGameIframe(game);
    }
  });

  els.theatreBtn.addEventListener('click', () => {
    state.theatreMode = !state.theatreMode;
    els.pageMain.classList.toggle('is-theatre', state.theatreMode);
    els.theatreBtn.setAttribute('aria-pressed', String(state.theatreMode));
    els.theatreBtn.textContent = state.theatreMode ? 'Exit Theatre' : 'Theatre Mode';
  });

  els.fullscreenBtn.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (els.stageShell.requestFullscreen) {
      await els.stageShell.requestFullscreen().catch(() => {});
    }
  });

  els.toggleJsonBtn.addEventListener('click', () => {
    const nextHidden = !els.jsonPreview.hidden;
    els.jsonPreview.hidden = nextHidden;
    els.toggleJsonBtn.textContent = nextHidden ? 'View Iframe JSON' : 'Hide Iframe JSON';
  });

  els.removeCustomBtn.addEventListener('click', () => {
    if (!state.currentGameId) return;
    state.customGames = state.customGames.filter((g) => g.id !== state.currentGameId);
    saveCustomGames();
    showLibrary();
  });

  els.openAddModalBtn.addEventListener('click', openAddModal);
  els.closeModalBtn.addEventListener('click', closeAddModal);
  els.cancelModalBtn.addEventListener('click', closeAddModal);
  els.addGameModal.addEventListener('click', (event) => {
    if (event.target === els.addGameModal) {
      closeAddModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.addGameModal.hidden) {
      closeAddModal();
    }
  });

  els.addGameForm.addEventListener('submit', handleAddGameSubmit);
  els.exportJsonBtn.addEventListener('click', exportCatalogJson);
  window.addEventListener('hashchange', handleHashRoute);
}

loadLocalData();
bindEvents();
fetchCatalog();

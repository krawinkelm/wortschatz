const state = {
  entries: Array.isArray(entries) ? entries : [],
  currentIndex: 0,
  byId: new Map(),
  currentView: "single",
  favorites: new Set(),
};

const FAVORITES_KEY = "wortschatz:favorites";

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter(Boolean));
  } catch (error) {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function setFavoriteButtonState(button, isFavorite) {
  button.setAttribute("aria-pressed", String(isFavorite));
  button.textContent = isFavorite ? "★" : "☆";
  button.title = isFavorite ? "Aus Favoriten entfernen" : "Als Favorit markieren";
}

function updateFavoriteButtons(entryId) {
  if (!entryId) {
    return;
  }
  const isFavorite = state.favorites.has(entryId);
  const singleButton = document.getElementById("favorite-button");
  if (singleButton) {
    singleButton.dataset.entryId = entryId;
    setFavoriteButtonState(singleButton, isFavorite);
  }
  document.querySelectorAll(".favorite-button[data-entry-id]").forEach((button) => {
    if (button.dataset.entryId !== entryId) {
      return;
    }
    setFavoriteButtonState(button, isFavorite);
  });
}

function toggleFavorite(entryId) {
  if (!entryId) {
    return;
  }
  if (state.favorites.has(entryId)) {
    state.favorites.delete(entryId);
  } else {
    state.favorites.add(entryId);
  }
  saveFavorites();
  updateFavoriteButtons(entryId);
  renderFavoritesList();
}

state.favorites = loadFavorites();

state.entries.forEach((entry, index) => {
  if (entry && entry.id) {
    state.byId.set(entry.id, { entry, index });
  }
});

function renderEntry(entry) {
  const wordText = document.getElementById("word-text");
  const definitionText = document.getElementById("definition-text");
  const examplesList = document.getElementById("examples-list");

  wordText.textContent = entry.word;
  definitionText.textContent = entry.definition;

  updateFavoriteButtons(entry.id);
  renderFavoritesList();

  examplesList.innerHTML = "";
  if (Array.isArray(entry.examples)) {
    entry.examples.slice(0, 5).forEach((sentence) => {
      const li = document.createElement("li");
      li.textContent = sentence;
      examplesList.appendChild(li);
    });
  }
}

function renderFavoritesList() {
  const list = document.getElementById("favorites-list");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const favoriteEntries = state.entries
    .filter((entry) => entry && entry.id && state.favorites.has(entry.id))
    .sort((a, b) => (a.word || "").localeCompare(b.word || "", "de"));
  favoriteEntries.forEach((entry) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#view=single&id=${encodeURIComponent(entry.id)}`;
    link.textContent = entry.word || entry.id;
    link.addEventListener("click", () => {
      setView("single");
    });
    item.appendChild(link);
    list.appendChild(item);
  });
}

function renderEntriesList() {
  const list = document.getElementById("entries-list");
  const nav = document.getElementById("letter-nav");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  if (nav) {
    nav.innerHTML = "";
  }
  const sorted = [...state.entries].sort((a, b) =>
    (a.word || "").localeCompare(b.word || "", "de")
  );
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const presentLetters = new Set();
  sorted.forEach((entry) => {
    const word = entry && (entry.word || entry.id);
    if (!word) {
      return;
    }
    const firstLetter = word.trim().charAt(0).toUpperCase();
    if (firstLetter) {
      presentLetters.add(firstLetter);
    }
  });
  if (nav) {
    alphabet.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = letter;
      if (!presentLetters.has(letter)) {
        button.classList.add("is-disabled");
        button.disabled = true;
      } else {
        button.addEventListener("click", () => {
          const target = document.getElementById(`letter-${letter}`);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
      nav.appendChild(button);
    });
  }
  let lastLetter = "";
  sorted.forEach((entry) => {
    if (!entry || !entry.id) {
      return;
    }
    const word = entry.word || entry.id;
    const firstLetter = word.trim().charAt(0).toUpperCase();
    if (firstLetter && firstLetter !== lastLetter) {
      const headingItem = document.createElement("li");
      headingItem.id = `letter-${firstLetter}`;
      headingItem.textContent = `${firstLetter}:`;
      headingItem.classList.add("entries-heading");
      list.appendChild(headingItem);
      lastLetter = firstLetter;
    }
    const item = document.createElement("li");
    item.classList.add("entries-item");
    const link = document.createElement("a");
    link.href = `#view=single&id=${encodeURIComponent(entry.id)}`;
    link.textContent = word;
    link.addEventListener("click", () => {
      setView("single");
    });
    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.classList.add("favorite-button");
    favoriteButton.dataset.entryId = entry.id;
    setFavoriteButtonState(favoriteButton, state.favorites.has(entry.id));
    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(entry.id);
    });
    item.appendChild(link);
    item.appendChild(favoriteButton);
    list.appendChild(item);
  });
}

function showEntryById(entryId) {
  const hit = state.byId.get(entryId);
  if (!hit) {
    return;
  }
  state.currentIndex = hit.index;
  renderEntry(hit.entry);
  updateNavigation();
}

function setView(nextView, options = {}) {
  state.currentView = nextView;
  const singleView = document.getElementById("single-view");
  const listView = document.getElementById("list-view");
  const menuPanel = document.getElementById("menu-panel");
  const shouldRenderSingle = options.renderEntry !== false;
  if (singleView) {
    singleView.classList.toggle("is-active", nextView === "single");
  }
  if (listView) {
    listView.classList.toggle("is-active", nextView === "list");
  }
  if (menuPanel) {
    menuPanel.querySelectorAll("[data-view]").forEach((item) => {
      const isActive = item.dataset.view === nextView;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }
  if (nextView === "list") {
    renderEntriesList();
  }
  if (nextView === "single" && state.entries.length > 0 && shouldRenderSingle) {
    renderEntry(state.entries[state.currentIndex]);
    updateNavigation();
  }
  if (options.syncHash) {
    if (nextView === "list") {
      const params = new URLSearchParams();
      params.set("view", "list");
      setHashParams(params);
    } else {
      setHashForCurrentEntry();
    }
  }
}

function getHashParams() {
  if (!window.location.hash) {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function getViewFromHash() {
  const params = getHashParams();
  const hasView = params.has("view");
  const hasId = params.has("id");
  let view = params.get("view") || "single";
  if (view !== "list" && view !== "single") {
    view = "single";
  }
  const entryId = view === "list" ? null : params.get("id");
  return { view, entryId, hasView, hasId };
}

function setHashParams(params) {
  const nextHash = params.toString();
  const currentHash = window.location.hash.replace(/^#/, "");
  if (currentHash === nextHash) {
    return;
  }
  window.location.hash = nextHash ? `#${nextHash}` : "";
}

function setHashForCurrentEntry() {
  const entry = state.entries[state.currentIndex];
  if (!entry || !entry.id) {
    return;
  }
  const params = new URLSearchParams();
  params.set("view", "single");
  params.set("id", entry.id);
  setHashParams(params);
}

function updateNavigation() {
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  prevButton.disabled = state.currentIndex === 0;
  nextButton.disabled = state.currentIndex >= state.entries.length - 1;
}

function setupNavigation() {
  const prevButton = document.getElementById("prev-button");
  const randomButton = document.getElementById("random-button");
  const nextButton = document.getElementById("next-button");

  prevButton.addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderEntry(state.entries[state.currentIndex]);
      updateNavigation();
      setHashForCurrentEntry();
    }
  });

  randomButton.addEventListener("click", () => {
    if (state.entries.length === 0) {
      return;
    }
    let nextIndex = Math.floor(Math.random() * state.entries.length);
    if (state.entries.length > 1 && nextIndex === state.currentIndex) {
      nextIndex = (nextIndex + 1) % state.entries.length;
    }
    state.currentIndex = nextIndex;
    renderEntry(state.entries[state.currentIndex]);
    updateNavigation();
    setHashForCurrentEntry();
  });

  nextButton.addEventListener("click", () => {
    if (state.currentIndex < state.entries.length - 1) {
      state.currentIndex += 1;
      renderEntry(state.entries[state.currentIndex]);
      updateNavigation();
      setHashForCurrentEntry();
    }
  });
  updateNavigation();
}

function setupMenu() {
  const menuButton = document.getElementById("menu-button");
  const menuPanel = document.getElementById("menu-panel");
  if (!menuButton || !menuPanel) {
    return;
  }

  function closeMenu() {
    menuPanel.setAttribute("aria-hidden", "true");
    menuButton.setAttribute("aria-expanded", "false");
  }

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuPanel.setAttribute("aria-hidden", String(isOpen));
  });

  menuPanel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const view = target.dataset.view;
    if (view === "single" || view === "list") {
      setView(view, { syncHash: true });
    }
    closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!menuPanel.contains(event.target) && event.target !== menuButton) {
      closeMenu();
    }
  });
}

function setupFavorites() {
  const favoriteButton = document.getElementById("favorite-button");
  if (!favoriteButton) {
    return;
  }
  favoriteButton.addEventListener("click", () => {
    const entry = state.entries[state.currentIndex];
    if (!entry || !entry.id) {
      return;
    }
    toggleFavorite(entry.id);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (state.entries.length > 0) {
    const hashState = getViewFromHash();
    if (hashState.view === "list") {
      setView("list", { syncHash: !hashState.hasView || hashState.hasId });
    } else if (hashState.entryId && state.byId.has(hashState.entryId)) {
      setView("single", {
        syncHash: !hashState.hasView || !hashState.hasId,
        renderEntry: false,
      });
      showEntryById(hashState.entryId);
    } else {
      setView("single", { syncHash: true });
    }
  }
  setupNavigation();
  setupMenu();
  setupFavorites();
});

window.addEventListener("hashchange", () => {
  const hashState = getViewFromHash();
  if (hashState.view === "list") {
    setView("list", { syncHash: !hashState.hasView || hashState.hasId });
    return;
  }
  if (hashState.entryId && state.byId.has(hashState.entryId)) {
    setView("single", {
      syncHash: !hashState.hasView || !hashState.hasId,
      renderEntry: false,
    });
    showEntryById(hashState.entryId);
    return;
  }
  if (state.entries.length > 0) {
    setView("single", { syncHash: true });
  }
});

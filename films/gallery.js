"use strict";

const films = [
  {
    id: "lisa-journey",
    title: "Lisa’s Journey",
    description: "Contemporary drama · 3:15",
  },
  {
    id: "interstellar",
    title: "Interstellar",
    description: "Science fiction · 2:01",
  },
  {
    id: "casablanca",
    title: "Casablanca",
    description: "Romance · Black & white · 3:48",
  },
  {
    id: "mr-and-mrs-smith",
    title: "Mr. & Mrs. Smith",
    description: "Action comedy · 3:23",
  },
  { id: "titanic", title: "Titanic", description: "Romance · 2:01" },
];

const dialog = document.getElementById("screening");
const player = document.getElementById("film-player");
const status = document.getElementById("share-status");
const error = document.getElementById("player-error");
let currentFilm = null;
let previousFocus = null;
let closeCausedByHistory = false;
let ownsHistoryEntry = false;

const stage = document.getElementById("film-stage");
const cards = [...document.querySelectorAll("[data-select]")];
const previews = [...document.querySelectorAll("[data-preview]")];
const programme = [...document.querySelectorAll("[data-programme]")];
const aboutDialog = document.getElementById("about-dialog");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let selectedIndex = 0;
let previewsPaused =
  reducedMotion.matches || navigator.connection?.saveData === true;
let previewPreferenceChanged = false;
let suppressCardClick = false;

function relativePosition(index) {
  let offset = (index - selectedIndex + films.length) % films.length;
  if (offset > Math.floor(films.length / 2)) offset -= films.length;
  return offset;
}

function updatePreviews() {
  const stopped =
    previewsPaused || document.hidden || dialog.open || aboutDialog.open;
  document.body.classList.toggle("gallery-paused", stopped);
  previews.forEach((video, index) => {
    if (stopped || Math.abs(relativePosition(index)) > 1) {
      video.pause();
      return;
    }
    video.muted = true;
    if (!video.hasAttribute("src"))
      video.src = `previews/${video.dataset.preview}.mp4`;
    video.play().catch(() => {
      /* The poster remains visible if the browser blocks autoplay. */
    });
  });
  const toggle = document.getElementById("preview-toggle");
  const label = previewsPaused ? "Play previews" : "Pause previews";
  toggle.setAttribute("aria-pressed", String(previewsPaused));
  toggle.setAttribute("aria-label", label);
  toggle.querySelector(".toggle-label").textContent = label;
  toggle.firstElementChild.textContent = previewsPaused ? "▶" : "Ⅱ";
}

function selectFilm(index) {
  selectedIndex = (index + films.length) % films.length;
  const film = films[selectedIndex];
  cards.forEach((card, cardIndex) => {
    const active = cardIndex === selectedIndex;
    card.dataset.position = relativePosition(cardIndex);
    card.classList.toggle("is-active", active);
    card.tabIndex = active ? 0 : -1;
    if (active) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
    card.setAttribute(
      "aria-label",
      `${active ? "Watch" : "Preview"} ${films[cardIndex].title}`,
    );
  });
  programme.forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.programme === film.id),
    ),
  );
  const descriptionParts = film.description.split(" · ");
  document.getElementById("selected-runtime").textContent =
    descriptionParts.pop();
  document.getElementById("selected-genre").textContent =
    descriptionParts.join(" · ");
  document.getElementById("selected-title").textContent = film.title;
  document.getElementById("favorite-label").hidden = film.id !== "lisa-journey";
  document.getElementById("selection-count").textContent =
    `${String(selectedIndex + 1).padStart(2, "0")} / 05`;
  const watch = document.getElementById("watch-selected");
  watch.dataset.film = film.id;
  watch.href = `media/${film.id}.mp4`;
  updatePreviews();
}

cards.forEach((card, index) => {
  card.addEventListener("click", (event) => {
    if (suppressCardClick) {
      event.preventDefault();
      return;
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (index === selectedIndex) openFilm(films[index].id, true);
    else selectFilm(index);
  });
  card.addEventListener("dragstart", (event) => event.preventDefault());
});
programme.forEach((button) =>
  button.addEventListener("click", () =>
    selectFilm(films.findIndex((film) => film.id === button.dataset.programme)),
  ),
);
document
  .getElementById("previous-selection")
  .addEventListener("click", () => selectFilm(selectedIndex - 1));
document
  .getElementById("next-selection")
  .addEventListener("click", () => selectFilm(selectedIndex + 1));
document.addEventListener("keydown", (event) => {
  if (
    dialog.open ||
    aboutDialog.open ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.matches("input, textarea, select, [contenteditable]")
  )
    return;
  if (event.target.closest(".site-header, .dock-caption")) return;
  if (event.target === stage && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openFilm(films[selectedIndex].id, true);
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    const cardFocused = event.target.closest("[data-select]");
    const programmeFocused = event.target.closest("[data-programme]");
    selectFilm(selectedIndex + (event.key === "ArrowRight" ? 1 : -1));
    if (cardFocused) cards[selectedIndex].focus({ preventScroll: true });
    if (programmeFocused)
      programme[selectedIndex].focus({ preventScroll: true });
  }
});

let drag = null;
stage.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    moved: false,
  };
});
window.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const delta = event.clientX - drag.x;
  if (!drag.moved && Math.abs(event.clientY - drag.y) > Math.abs(delta) + 12) {
    drag = null;
    return;
  }
  if (Math.abs(delta) > 6) drag.moved = true;
  if (drag.moved) {
    stage.classList.add("dragging");
    stage.style.setProperty(
      "--drag-px",
      `${Math.max(-95, Math.min(95, delta * 0.4))}px`,
    );
  }
});
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const delta = event.clientX - drag.x;
  if (drag.moved) {
    suppressCardClick = true;
    window.setTimeout(() => {
      suppressCardClick = false;
    }, 100);
    if (event.type !== "pointercancel" && Math.abs(delta) > 42)
      selectFilm(selectedIndex + (delta < 0 ? 1 : -1));
  }
  drag = null;
  stage.classList.remove("dragging");
  stage.style.setProperty("--drag-px", "0px");
}
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
let lastWheel = 0;
stage.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) return;
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (Math.abs(delta) < 15) return;
    event.preventDefault();
    if (performance.now() - lastWheel < 800) return;
    lastWheel = performance.now();
    selectFilm(selectedIndex + (delta > 0 ? 1 : -1));
  },
  { passive: false },
);

let sceneFrame = null;
window.addEventListener("pointermove", (event) => {
  if (
    event.pointerType !== "mouse" ||
    reducedMotion.matches ||
    previewsPaused ||
    dialog.open ||
    aboutDialog.open ||
    drag
  )
    return;
  if (sceneFrame) cancelAnimationFrame(sceneFrame);
  sceneFrame = requestAnimationFrame(() => {
    document.documentElement.style.setProperty(
      "--scene-x",
      `${(event.clientX / window.innerWidth - 0.5) * 10}px`,
    );
    document.documentElement.style.setProperty(
      "--scene-y",
      `${(event.clientY / window.innerHeight - 0.5) * 7}px`,
    );
    sceneFrame = null;
  });
});
document.getElementById("preview-toggle").addEventListener("click", () => {
  previewPreferenceChanged = true;
  previewsPaused = !previewsPaused;
  updatePreviews();
});
reducedMotion.addEventListener("change", () => {
  if (!previewPreferenceChanged) {
    previewsPaused =
      reducedMotion.matches || navigator.connection?.saveData === true;
    updatePreviews();
  }
});
document.addEventListener("visibilitychange", updatePreviews);
document
  .getElementById("room-light-toggle")
  .addEventListener("click", (event) => {
    const darkened = document.body.classList.toggle("room-dark");
    const label = darkened ? "Lights up" : "Lights down";
    event.currentTarget.setAttribute("aria-pressed", String(darkened));
    event.currentTarget.setAttribute("aria-label", label);
    event.currentTarget.querySelector(".toggle-label").textContent = label;
  });
document
  .getElementById("room-light-toggle")
  .setAttribute("aria-label", "Lights down");
document.getElementById("about-open").addEventListener("click", () => {
  aboutDialog.showModal();
  updatePreviews();
});
document
  .querySelector(".about-close")
  .addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("close", updatePreviews);

function setFilmHash(id, push = false) {
  const url = new URL(window.location.href);
  url.hash = id;
  if (push) window.history.pushState({ aiFilmGallery: true }, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

function openFilm(id, userInitiated = false) {
  const film = films.find((item) => item.id === id);
  if (!film) return;
  if (typeof dialog.showModal !== "function") {
    window.location.href = new URL(
      `media/${film.id}.mp4`,
      document.baseURI,
    ).href;
    return;
  }
  const wasOpen = dialog.open;
  if (!wasOpen) previousFocus = document.activeElement;
  if (userInitiated) setFilmHash(film.id, !wasOpen);
  if (!wasOpen) ownsHistoryEntry = window.history.state?.aiFilmGallery === true;
  currentFilm = film;
  player.pause();
  error.hidden = true;
  status.textContent = "";
  document.getElementById("share-fallback").hidden = true;
  document.getElementById("screening-title").textContent = film.title;
  document.getElementById("screening-index").textContent =
    `${String(films.indexOf(film) + 1).padStart(2, "0")} / ${String(films.length).padStart(2, "0")}`;
  document.getElementById("screening-description").textContent =
    film.description;
  const videoUrl = new URL(`media/${film.id}.mp4`, document.baseURI).href;
  const download = document.getElementById("download-film");
  download.href = videoUrl;
  download.download = `${film.id}.mp4`;
  document.getElementById("error-download").href = videoUrl;
  player.setAttribute("aria-label", `${film.title} — short film by Ke Wang`);
  player.poster = `assets/${film.id}.webp`;
  player.style.setProperty(
    "--film-ratio",
    film.id === "casablanca" ? "4 / 3" : "2.33",
  );
  player.src = videoUrl;
  player.preload = "metadata";
  player.load();
  document.querySelectorAll("[data-screening]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.screening === film.id),
    );
  });
  if (!dialog.open) {
    dialog.showModal();
  }
  document.body.classList.add("player-open");
  selectFilm(films.indexOf(film));
  if (userInitiated)
    player.play().catch(() => {
      /* Native controls remain available when autoplay is blocked. */
    });
}

function syncLocation() {
  const id = window.location.hash.slice(1);
  if (films.some((film) => film.id === id)) {
    if (currentFilm?.id !== id || !dialog.open) {
      openFilm(id);
    }
  } else if (dialog.open) {
    closeCausedByHistory = true;
    dialog.close();
  }
}

document.querySelectorAll("[data-film]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    openFilm(link.dataset.film, true);
  });
});

document
  .querySelector(".close-screening")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => {
  player.pause();
  dialog.classList.remove("lights-down");
  document
    .getElementById("lights-toggle")
    .setAttribute("aria-pressed", "false");
  document.getElementById("lights-toggle").innerHTML =
    'Lights down <span aria-hidden="true">◐</span>';
  player.removeAttribute("src");
  player.load();
  player.preload = "none";
  document.body.classList.remove("player-open");
  if (!closeCausedByHistory) {
    if (ownsHistoryEntry) window.history.back();
    else if (films.some((film) => film.id === window.location.hash.slice(1)))
      setFilmHash("films");
  }
  closeCausedByHistory = false;
  ownsHistoryEntry = false;
  currentFilm = null;
  updatePreviews();
  if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
    previousFocus.focus({ preventScroll: true });
});
player.addEventListener("error", () => {
  if (currentFilm && player.hasAttribute("src")) error.hidden = false;
});
document.getElementById("next-film").addEventListener("click", () => {
  if (!currentFilm) return;
  openFilm(films[(films.indexOf(currentFilm) + 1) % films.length].id, true);
});
document.getElementById("share-film").addEventListener("click", async () => {
  if (!currentFilm) return;
  const url = new URL(window.location.href);
  url.hash = currentFilm.id;
  try {
    if (!navigator.clipboard || !window.isSecureContext)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url.href);
    status.textContent = "Film link copied. Ready to share.";
  } catch {
    const field = document.getElementById("film-link");
    document.getElementById("share-fallback").hidden = false;
    field.value = url.href;
    field.focus();
    field.select();
    status.textContent = "Copy the selected link to share this film.";
  }
});
window.addEventListener("hashchange", syncLocation);
window.addEventListener("popstate", syncLocation);
syncLocation();
selectFilm(selectedIndex);

document.querySelectorAll("[data-screening]").forEach((button) => {
  button.addEventListener("click", () =>
    openFilm(button.dataset.screening, true),
  );
});
document.getElementById("lights-toggle").addEventListener("click", (event) => {
  const darkened = dialog.classList.toggle("lights-down");
  const button = event.currentTarget;
  button.setAttribute("aria-pressed", String(darkened));
  button.innerHTML = `${darkened ? "Lights up" : "Lights down"} <span aria-hidden="true">◐</span>`;
});

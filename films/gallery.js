'use strict';

const films = [
  { id: 'lisa-journey', title: 'Lisa’s Journey', description: 'Contemporary drama · 3:15' },
  { id: 'interstellar', title: 'Interstellar', description: 'Science fiction · 2:01' },
  { id: 'casablanca', title: 'Casablanca', description: 'Romance · Black & white · 3:48' },
  { id: 'mr-and-mrs-smith', title: 'Mr. & Mrs. Smith', description: 'Action comedy · 3:23' },
  { id: 'titanic', title: 'Titanic', description: 'Romance · 2:01' }
];

const dialog = document.getElementById('screening');
const player = document.getElementById('film-player');
const status = document.getElementById('share-status');
const error = document.getElementById('player-error');
let currentFilm = null;
let previousFocus = null;
let closeCausedByHistory = false;
let ownsHistoryEntry = false;

function setFilmHash(id, push = false) {
  const url = new URL(window.location.href);
  url.hash = id;
  if (push) window.history.pushState({ aiFilmGallery: true }, '', url);
  else window.history.replaceState(window.history.state, '', url);
}

function openFilm(id, userInitiated = false) {
  const film = films.find(item => item.id === id);
  if (!film) return;
  if (typeof dialog.showModal !== 'function') {
    window.location.href = new URL(`media/${film.id}.mp4`, document.baseURI).href;
    return;
  }
  const wasOpen = dialog.open;
  if (!wasOpen) previousFocus = document.activeElement;
  if (userInitiated) setFilmHash(film.id, !wasOpen);
  if (!wasOpen) ownsHistoryEntry = window.history.state?.aiFilmGallery === true;
  currentFilm = film;
  player.pause();
  error.hidden = true;
  status.textContent = '';
  document.getElementById('share-fallback').hidden = true;
  document.getElementById('screening-title').textContent = film.title;
  document.getElementById('screening-index').textContent = `${String(films.indexOf(film) + 1).padStart(2, '0')} / ${String(films.length).padStart(2, '0')}`;
  document.getElementById('screening-description').textContent = film.description;
  const videoUrl = new URL(`media/${film.id}.mp4`, document.baseURI).href;
  const download = document.getElementById('download-film');
  download.href = videoUrl;
  download.download = `${film.id}.mp4`;
  document.getElementById('error-download').href = videoUrl;
  player.setAttribute('aria-label', `${film.title} — short film by Ke Wang`);
  player.poster = `assets/${film.id}.webp`;
  player.style.setProperty('--film-ratio', film.id === 'casablanca' ? '4 / 3' : '2.33');
  player.src = videoUrl;
  player.preload = 'metadata';
  player.load();
  document.querySelectorAll('[data-screening]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.screening === film.id));
  });
  if (!dialog.open) {
    dialog.classList.add('curtain-opening');
    dialog.showModal();
  }
  document.body.classList.add('player-open');
  if (userInitiated) player.play().catch(() => { /* Native controls remain available when autoplay is blocked. */ });
}

function syncLocation() {
  const id = window.location.hash.slice(1);
  if (films.some(film => film.id === id)) {
    if (currentFilm?.id !== id || !dialog.open) {
      openFilm(id);
    }
  } else if (dialog.open) {
    closeCausedByHistory = true;
    dialog.close();
  }
}

document.querySelectorAll('[data-film]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openFilm(link.dataset.film, true);
  });
});

document.querySelector('.close-screening').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  player.pause();
  dialog.classList.remove('curtain-opening', 'lights-down');
  document.getElementById('lights-toggle').setAttribute('aria-pressed', 'false');
  document.getElementById('lights-toggle').innerHTML = 'Lights down <span aria-hidden="true">◐</span>';
  player.removeAttribute('src');
  player.load();
  player.preload = 'none';
  document.body.classList.remove('player-open');
  if (!closeCausedByHistory) {
    if (ownsHistoryEntry) window.history.back();
    else if (films.some(film => film.id === window.location.hash.slice(1))) setFilmHash('films');
  }
  closeCausedByHistory = false;
  ownsHistoryEntry = false;
  currentFilm = null;
  if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
});
player.addEventListener('error', () => {
  if (currentFilm && player.hasAttribute('src')) error.hidden = false;
});
document.getElementById('next-film').addEventListener('click', () => {
  if (!currentFilm) return;
  openFilm(films[(films.indexOf(currentFilm) + 1) % films.length].id, true);
});
document.getElementById('share-film').addEventListener('click', async () => {
  if (!currentFilm) return;
  const url = new URL(window.location.href);
  url.hash = currentFilm.id;
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url.href);
    status.textContent = 'Film link copied. Ready to share.';
  } catch {
    const field = document.getElementById('film-link');
    document.getElementById('share-fallback').hidden = false;
    field.value = url.href;
    field.focus();
    field.select();
    status.textContent = 'Copy the selected link to share this film.';
  }
});
window.addEventListener('hashchange', syncLocation);
window.addEventListener('popstate', syncLocation);
syncLocation();

document.querySelectorAll('[data-screening]').forEach(button => {
  button.addEventListener('click', () => openFilm(button.dataset.screening, true));
});
document.getElementById('lights-toggle').addEventListener('click', event => {
  const darkened = dialog.classList.toggle('lights-down');
  const button = event.currentTarget;
  button.setAttribute('aria-pressed', String(darkened));
  button.innerHTML = `${darkened ? 'Lights up' : 'Lights down'} <span aria-hidden="true">◐</span>`;
});

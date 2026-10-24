/* A small, local-only walking journal. It never changes locomotion or camera state. */
export const DISCOVERY_STORAGE_KEY = 'ke-world-scenic-stamps-v1';

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function validPlaces(places) {
  const ids = new Set();
  return (places || []).filter(place => {
    if (!place || typeof place.id !== 'string' || ids.has(place.id) ||
      !Array.isArray(place.entry) || !place.entry.slice(0, 2).every(Number.isFinite) || place.entry.length < 2) return false;
    ids.add(place.id);
    return true;
  });
}

/** Pure proximity/dwell state; call once per animation frame with delta in seconds. */
export function createDiscoveryTracker({ places, storage = browserStorage(), onDiscover = () => {}, radius = 4.25, dwell = .8, maxAltitude = 7 } = {}) {
  const destinations = validPlaces(places), allowed = new Set(destinations.map(place => place.id));
  const visited = new Set(), pending = new Map();
  let persistent = Boolean(storage);
  const accept = ids => Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && allowed.has(id)) : [];
  try {
    const saved = JSON.parse(storage?.getItem(DISCOVERY_STORAGE_KEY) || 'null');
    if (saved?.version === 1) for (const id of accept(saved.ids)) visited.add(id);
  } catch { persistent = false; /* A disabled store or an old/corrupt record must not stop the world. */ }
  function save() {
    try {
      if (!storage) { persistent = false; return; }
      storage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify({ version: 1, ids: [...visited] }));
      persistent = true;
    } catch { persistent = false; }
  }
  return {
    places: destinations,
    has: id => visited.has(id),
    snapshot: () => [...visited],
    get persistent() { return persistent; },
    update(position, { delta = 0, indoors = false, paused = false, altitude = 0 } = {}) {
      if (indoors || paused || !position || !Number.isFinite(position.x) || !Number.isFinite(position.z) ||
        !Number.isFinite(altitude) || altitude > maxAltitude) { pending.clear(); return []; }
      // A tab resumed after a long pause cannot instantly award every nearby stamp.
      const elapsed = Math.max(0, Math.min(.1, Number.isFinite(delta) ? delta : 0));
      const discovered = [];
      for (const place of destinations) {
        if (visited.has(place.id)) continue;
        if (Math.hypot(position.x - place.entry[0], position.z - place.entry[1]) > radius) { pending.delete(place.id); continue; }
        const time = (pending.get(place.id) || 0) + elapsed;
        pending.set(place.id, time);
        if (time + 1e-8 < dwell) continue;
        visited.add(place.id); pending.delete(place.id); discovered.push(place);
      }
      if (discovered.length) { save(); for (const place of discovered) onDiscover(place); }
      return discovered;
    },
    clear() { const before = [...visited]; visited.clear(); pending.clear(); save(); return before; },
    restore(ids) { visited.clear(); pending.clear(); for (const id of accept(ids)) visited.add(id); save(); }
  };
}

/** A postcard waits for the walker and following camera to settle at the view. */
export function createPostcardTracker({ places, onCapture = () => {} } = {}) {
  const visits = createDiscoveryTracker({ places, storage: null, dwell: 1.2, onDiscover: onCapture });
  return {
    ...visits,
    update(position, options = {}) {
      // Walking past a vista can earn its stamp, but should not photograph the
      // foreground obstruction along the approach. Any movement restarts this
      // separate dwell without changing the persistent discovery progress.
      return visits.update(position, { ...options, paused: Boolean(options.paused || options.moving) });
    }
  };
}

const SCENIC_LINES = {
  lookout: 'M5 31h38M6 26c7-7 13 7 20 0s11-2 16 0M9 17h29M12 17v7m23-7v7M18 15l5-8 5 8M23 7v-3',
  grove: 'M5 34h38M11 28V8M5 18l6-10 6 10M4 25l7-11 7 11M32 31V5M24 16l8-11 8 11M22 25l10-14 10 14',
  pond: 'M4 30c9-7 13 7 22 0s12-2 18 0M7 36c7-5 13 5 20 0M15 24c-6-8-1-13 4-8 5-5 10 0 4 8M19 24v6M34 25V9m0 8 5-6m-5 11-5-7',
  terrace: 'M4 34h40M8 30 23 10 40 30M15 24h18M18 24v6m12-6v6M22 8V4m8 7 3-3M9 14l-3-2'
};

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function scenicArt(document, id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 40'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', SCENIC_LINES[id] || SCENIC_LINES.terrace);
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.35'); path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round'); svg.append(path); return svg;
}

/**
 * Adds a quiet scenic section to the existing Field Journal, not another modal.
 * capture(place) may return a small actual-world data URL (sync or async).
 * Only place IDs persist. Optional postcard thumbnails remain in this session.
 */
export function initDiscovery({ places, journal = globalThis.document?.getElementById('journal-dialog'),
  goTo, capture, storage, document = globalThis.document } = {}) {
  if (!document || !journal) return { update() {}, destroy() {} };
  journal.querySelector('[data-scenic-journal]')?.remove();
  const section = el(document, 'section', 'scenic-journal');
  section.dataset.scenicJournal = ''; section.setAttribute('aria-labelledby', 'scenic-journal-title');
  const header = el(document, 'header', 'scenic-heading');
  const headingCopy = el(document, 'div');
  headingCopy.append(el(document, 'span', 'scenic-eyebrow', 'FOUR QUIET CORNERS'));
  const heading = el(document, 'h3', '', 'The scenic route'); heading.id = 'scenic-journal-title'; heading.tabIndex = -1;
  headingCopy.append(heading, el(document, 'p', '', 'Follow a trail. Pause for the view. Keep a field note.'));
  const counter = el(document, 'span', 'scenic-count');
  header.append(headingCopy, counter);
  const cards = el(document, 'div', 'scenic-cards');
  const footer = el(document, 'div', 'scenic-footer');
  const note = el(document, 'span', 'scenic-storage-note');
  const reset = el(document, 'button', 'scenic-reset', 'Clear stamps'); reset.type = 'button';
  const undo = el(document, 'button', 'scenic-undo', 'Undo'); undo.type = 'button'; undo.hidden = true;
  const live = el(document, 'span', 'sr-only'); live.setAttribute('aria-live', 'polite');
  footer.append(note, reset, undo); section.append(header, cards, footer, live);
  journal.insertBefore(section, journal.querySelector('.journal-footer'));

  const jump = el(document, 'button', 'scenic-jump'); jump.type = 'button';
  jump.setAttribute('aria-controls', heading.id);
  journal.querySelector('.journal-filters')?.after(jump);
  jump.addEventListener('click', () => {
    heading.focus({ preventScroll: true });
    // scrollIntoView can also move the page behind a long dialog on mobile.
    const top = journal.scrollTop + section.getBoundingClientRect().top - journal.getBoundingClientRect().top - 18;
    journal.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  });
  const toast = el(document, 'div', 'scenic-toast'); toast.hidden = true; toast.setAttribute('role', 'status');
  const toastArt = el(document, 'span', 'scenic-toast-art');
  const toastCopy = el(document, 'div', 'scenic-toast-copy');
  const toastTitle = el(document, 'strong'), toastText = el(document, 'span'); toastCopy.append(toastTitle, toastText);
  toast.append(toastArt, toastCopy); document.getElementById('world-stage')?.append(toast);
  let toastTimer, destroyed = false, undoState = null, generation = 0;
  const cardMap = new Map(), photos = new Map();
  let tracker;
  function render() {
    const count = tracker.snapshot().length, total = tracker.places.length;
    counter.textContent = `${count} / ${total}`; counter.setAttribute('aria-label', `${count} of ${total} scenic places discovered`);
    jump.textContent = `The scenic route · ${count} / ${total}  ↓`;
    reset.hidden = count === 0;
    note.textContent = tracker.persistent ? 'Stamps stay in this browser. Postcards last for this visit.' : 'Stamps and postcards last for this visit.';
    for (const place of tracker.places) {
      const card = cardMap.get(place.id), found = tracker.has(place.id), photo = photos.get(place.id);
      card.root.classList.toggle('is-discovered', found);
      card.stamp.textContent = found ? '✓ Discovered' : 'Still to explore';
      card.action.textContent = found ? 'Revisit →' : 'Guide me →';
      card.action.setAttribute('aria-label', `${found ? 'Revisit' : 'Guide me to'} ${place.title}`);
      card.image.hidden = !photo; card.root.classList.toggle('has-postcard', Boolean(photo));
      if (photo) { card.image.src = photo; card.art.classList.add('has-postcard'); }
      else { card.image.removeAttribute('src'); card.art.classList.remove('has-postcard'); }
    }
  }
  tracker = createDiscoveryTracker({ places, ...(storage === undefined ? {} : { storage }), onDiscover(place) {
    render();
    toastArt.replaceChildren(scenicArt(document, place.id));
    toastTitle.textContent = place.title;
    toastText.textContent = tracker.snapshot().length === tracker.places.length ? 'Scenic route complete · four field notes collected' : 'Field note collected · saved in your journal';
    toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  } });
  // A saved stamp should not suppress a new postcard on a later visit. This
  // second, session-only dwell tracker requests at most one capture per place,
  // including places that were already discovered before the page loaded.
  const sessionVisits = capture ? createPostcardTracker({ places, onCapture(place) {
      const requestedGeneration = generation;
      Promise.resolve().then(() => capture(place)).then(photo => {
        if (destroyed || requestedGeneration !== generation || !tracker.has(place.id) || typeof photo !== 'string' || photo.length > 120000 ||
          !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo)) return;
        photos.set(place.id, photo); render();
      }).catch(() => { /* The line-art stamp remains available if capture fails. */ });
  } }) : null;
  for (const [index, place] of tracker.places.entries()) {
    const card = el(document, 'article', 'scenic-card'); card.dataset.scenicCard = place.id;
    const art = el(document, 'div', 'scenic-card-art');
    art.append(scenicArt(document, place.id), el(document, 'span', 'scenic-card-number', String(index + 1).padStart(2, '0')));
    const image = el(document, 'img', 'scenic-postcard'); image.hidden = true; image.alt = `Your view at ${place.title}`;
    image.width = 240; image.height = 140; image.decoding = 'async'; art.append(image);
    const body = el(document, 'div', 'scenic-card-copy');
    const stamp = el(document, 'span', 'scenic-stamp');
    const action = el(document, 'button', 'scenic-walk'); action.type = 'button'; action.disabled = typeof goTo !== 'function';
    action.addEventListener('click', () => {
      if (!goTo) return;
      if (journal.open) journal.close();
      // Let the journal's existing close handler resume the world first.
      requestAnimationFrame(() => {
        if (destroyed) return;
        const window = document.defaultView || globalThis;
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        goTo(place.id); document.getElementById('world')?.focus({ preventScroll: true });
      });
    });
    body.append(stamp, el(document, 'h4', '', place.title), el(document, 'p', '', place.note), action);
    card.append(art, body); cards.append(card);
    cardMap.set(place.id, { root: card, art, image, stamp, action });
  }
  reset.addEventListener('click', () => {
    undoState = { ids: tracker.snapshot(), photos: new Map(photos) };
    generation++; tracker.clear(); sessionVisits?.clear(); photos.clear(); render(); undo.hidden = false; undo.focus();
    live.textContent = 'Scenic stamps cleared. Choose Undo to restore them.';
  });
  undo.addEventListener('click', () => {
    if (!undoState) return;
    generation++; tracker.restore(undoState.ids); photos.clear();
    for (const [id, photo] of undoState.photos) photos.set(id, photo);
    sessionVisits?.restore([...photos.keys()]);
    undoState = null; undo.hidden = true; render(); reset.focus(); live.textContent = 'Scenic stamps restored.';
  });
  render();
  return {
    update(position, options) {
      if (destroyed) return;
      if (options?.indoors || options?.paused) toast.hidden = true;
      const discoveries = tracker.update(position, options);
      sessionVisits?.update(position, options);
      return discoveries;
    },
    snapshot: () => tracker.snapshot(),
    destroy() { destroyed = true; clearTimeout(toastTimer); section.remove(); jump.remove(); toast.remove(); }
  };
}

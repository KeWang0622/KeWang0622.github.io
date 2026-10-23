import { TRAVEL_MODES } from './travel-catalog.js';

export function initTravelUI() {
  const stage = document.getElementById('world-stage');
  if (!stage || document.getElementById('travel-control')) return;
  let selected = 'walk', indoors = false, ready = Boolean(window.KE_WORLD_SCENE?.ready);
  const controls = document.createElement('div');
  controls.id = 'travel-control';
  controls.innerHTML = '<span id="travel-title" class="travel-heading">Travel</span><div class="travel-options" role="radiogroup" aria-labelledby="travel-title" aria-describedby="travel-note"></div><span id="travel-note">Rides stay outside</span>';
  const options = controls.querySelector('.travel-options'), note = controls.querySelector('#travel-note');
  const buttons = [];
  for (const mode of TRAVEL_MODES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'travel-option'; button.dataset.travelId = mode.id;
    button.setAttribute('role', 'radio'); button.setAttribute('aria-label', `${mode.label} · ${mode.pace}`);
    button.style.setProperty('--travel-accent', mode.color);
    button.innerHTML = `<span class="travel-option-art">${mode.icon}</span><span class="travel-option-label">${mode.label}</span><span class="travel-check" aria-hidden="true">✓</span>`;
    button.addEventListener('click', () => {
      if (!ready || indoors) return;
      document.dispatchEvent(new CustomEvent('world:travel-select', { detail: { id: mode.id } }));
      document.getElementById('world')?.focus({ preventScroll: true });
    });
    options.append(button); buttons.push(button);
  }
  function refresh() {
    const effective = indoors ? 'walk' : selected;
    controls.classList.toggle('travel-indoors', indoors);
    note.textContent = indoors ? 'Walking indoors' : 'Rides stay outside';
    for (const button of buttons) {
      const mode = TRAVEL_MODES.find(item => item.id === button.dataset.travelId), active = mode.id === effective;
      button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
      button.disabled = !ready || (indoors && mode.id !== 'walk');
      button.title = !ready ? 'Ready when the village opens' : indoors && mode.id !== 'walk' ? `${mode.label} · parked outside` : `${mode.label} · ${mode.pace}`;
    }
  }
  options.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const available = buttons.filter(button => !button.disabled), index = available.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + available.length) % available.length;
    available[next].focus({ preventScroll: true });
  });
  document.addEventListener('world:travel-changed', event => {
    const state = event.detail || {};
    if (TRAVEL_MODES.some(mode => mode.id === state.id)) selected = state.id;
    indoors = Boolean(state.indoors); refresh();
  });
  document.addEventListener('world:ready', () => { ready = true; refresh(); });
  stage.append(controls); refresh();
  return { element: controls };
}

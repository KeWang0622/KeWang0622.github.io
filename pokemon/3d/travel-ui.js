import { TRAVEL_MODES } from './travel-catalog.js?v=20261023-rides-perspective';

export function initTravelUI() {
  const stage = document.getElementById('world-stage');
  if (!stage || document.getElementById('travel-control')) return;
  let selected = 'walk', indoors = false, ready = Boolean(window.KE_WORLD_SCENE?.ready), view = 'third', reversing = false;
  const controls = document.createElement('div');
  controls.id = 'travel-control';
  controls.innerHTML = '<span id="travel-title" class="travel-heading">Travel</span><div class="travel-options" role="radiogroup" aria-labelledby="travel-title" aria-describedby="travel-note"></div><span id="travel-note">Rides stay outside</span>';
  const options = controls.querySelector('.travel-options'), note = controls.querySelector('#travel-note');
  const cameraControls = document.createElement('div');
  cameraControls.id = 'camera-mode-control';
  cameraControls.innerHTML = '<div class="camera-view-switch" role="group" aria-label="Camera view"><button type="button" data-view="first" aria-pressed="false"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg><span>First person</span></button><button type="button" data-view="third" aria-pressed="true"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><circle cx="10" cy="5.5" r="2.4"/><path d="M5.5 17v-3.5a4.5 4.5 0 0 1 9 0V17M2 7V3h4m8 0h4v4"/></svg><span>Third person</span></button><kbd aria-label="V key switches view">V</kbd></div><button type="button" id="travel-reverse" hidden aria-label="Hold to reverse. Release to stop reversing."><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="m8 4-5 5 5 5M3 9h8a5 5 0 0 1 5 5v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Hold to reverse</span><kbd>R</kbd></button>';
  const viewButtons = [...cameraControls.querySelectorAll('[data-view]')], reverseButton = cameraControls.querySelector('#travel-reverse');
  const drivePad = document.createElement('div');
  drivePad.id = 'first-person-drive'; drivePad.hidden = true;
  drivePad.setAttribute('role', 'group'); drivePad.setAttribute('aria-label', 'First person movement');
  drivePad.innerHTML = '<button type="button" data-drive="forward" aria-label="Move forward" aria-keyshortcuts="W">↑</button><button type="button" data-drive="left" aria-label="Turn left" aria-keyshortcuts="A">↶</button><button type="button" data-drive="back" aria-label="Move backward" aria-keyshortcuts="S">↓</button><button type="button" data-drive="right" aria-label="Turn right" aria-keyshortcuts="D">↷</button>';
  cameraControls.append(drivePad);
  const driveInputs = new Map();
  let driveThrottle = 0, driveTurn = 0;
  function sendDrive() {
    const actions = [...driveInputs.values()];
    const throttle = Number(actions.includes('forward')) - Number(actions.includes('back'));
    const turn = Number(actions.includes('left')) - Number(actions.includes('right'));
    for (const button of drivePad.children) button.classList.toggle('held', actions.includes(button.dataset.drive));
    if (throttle === driveThrottle && turn === driveTurn) return;
    driveThrottle = throttle; driveTurn = turn;
    document.dispatchEvent(new CustomEvent('world:drive', { detail: { throttle, turn } }));
  }
  function releaseDrive() { driveInputs.clear(); sendDrive(); }
  for (const button of drivePad.children) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !ready || view !== 'first') return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      driveInputs.set(event.pointerId, button.dataset.drive); sendDrive();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { driveInputs.delete(event.pointerId); sendDrive(); });
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key) || !ready || view !== 'first') return;
      event.preventDefault(); driveInputs.set(`key-${button.dataset.drive}`, button.dataset.drive); sendDrive();
    });
    button.addEventListener('keyup', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); driveInputs.delete(`key-${button.dataset.drive}`); sendDrive();
    });
    button.addEventListener('blur', () => { driveInputs.delete(`key-${button.dataset.drive}`); sendDrive(); });
  }
  function reverse(active) {
    active = Boolean(active && ready && !indoors && selected !== 'walk');
    if (reversing === active) return;
    reversing = active;
    reverseButton.classList.toggle('reversing', active);
    document.dispatchEvent(new CustomEvent('world:reverse', { detail: { active } }));
  }
  for (const button of viewButtons) button.addEventListener('click', () => {
    if (!ready) return;
    reverse(false);
    releaseDrive();
    document.dispatchEvent(new CustomEvent('world:view-select', { detail: { mode: button.dataset.view } }));
    document.getElementById('world')?.focus({ preventScroll: true });
  });
  reverseButton.addEventListener('pointerdown', event => {
    if (event.button !== 0 || reverseButton.disabled) return;
    event.preventDefault();
    reverseButton.setPointerCapture(event.pointerId);
    reverse(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) reverseButton.addEventListener(type, () => reverse(false));
  reverseButton.addEventListener('keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); reverse(true);
  });
  reverseButton.addEventListener('keyup', event => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); reverse(false); }
  });
  reverseButton.addEventListener('blur', () => reverse(false));
  addEventListener('blur', () => { reverse(false); releaseDrive(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { reverse(false); releaseDrive(); } });
  document.addEventListener('world:pause', () => { reverse(false); releaseDrive(); });
  const buttons = [];
  for (const mode of TRAVEL_MODES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'travel-option'; button.dataset.travelId = mode.id;
    button.setAttribute('role', 'radio'); button.setAttribute('aria-label', `${mode.label} · ${mode.pace}`);
    button.style.setProperty('--travel-accent', mode.color);
    button.innerHTML = `<span class="travel-option-art">${mode.icon}</span><span class="travel-option-label">${mode.label}</span><span class="travel-check" aria-hidden="true">✓</span>`;
    button.addEventListener('click', () => {
      if (!ready || indoors) return;
      reverse(false);
      releaseDrive();
      document.dispatchEvent(new CustomEvent('world:travel-select', { detail: { id: mode.id } }));
      document.getElementById('world')?.focus({ preventScroll: true });
    });
    options.append(button); buttons.push(button);
  }
  function refresh() {
    const effective = indoors ? 'walk' : selected;
    controls.classList.toggle('travel-indoors', indoors);
    note.textContent = indoors ? 'Walking indoors' : 'Rides stay outside';
    reverseButton.hidden = indoors || selected === 'walk';
    reverseButton.disabled = !ready;
    drivePad.hidden = view !== 'first';
    for (const button of drivePad.children) button.disabled = !ready;
    for (const button of viewButtons) { button.disabled = !ready; button.setAttribute('aria-pressed', String(button.dataset.view === view)); }
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
    reverse(false);
    releaseDrive();
    if (TRAVEL_MODES.some(mode => mode.id === state.id)) selected = state.id;
    indoors = Boolean(state.indoors); refresh();
  });
  document.addEventListener('world:view-changed', event => {
    if (!['first', 'third'].includes(event.detail?.mode)) return;
    reverse(false); releaseDrive();
    view = event.detail.mode;
    const hint = document.querySelector('#walk-hint .desktop-hint');
    if (hint) hint.textContent = view === 'first' ? 'W/S move · A/D turn · drag to look' : 'click to walk · drag to look';
    refresh();
  });
  document.addEventListener('world:ready', () => { ready = true; refresh(); });
  stage.append(controls, cameraControls); refresh();
  return { element: controls, cameraControls };
}

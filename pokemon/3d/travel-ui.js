import { TRAVEL_MODES } from './travel-catalog.js?v=20261023-stable-map';

export function initTravelUI() {
  const stage = document.getElementById('world-stage');
  if (!stage || document.getElementById('travel-control')) return;
  let selected = 'walk', indoors = false, ready = Boolean(window.KE_WORLD_SCENE?.ready), view = 'third', reversing = false, paused = false;
  const controls = document.createElement('div');
  controls.id = 'travel-control';
  controls.innerHTML = '<span id="travel-title" class="travel-heading">Travel</span><div class="travel-options" role="radiogroup" aria-labelledby="travel-title" aria-describedby="travel-note"></div><span id="travel-note">Rides stay outside</span>';
  const options = controls.querySelector('.travel-options'), note = controls.querySelector('#travel-note');
  const cameraControls = document.createElement('div');
  cameraControls.id = 'camera-mode-control';
  cameraControls.innerHTML = '<div class="camera-view-switch" role="group" aria-label="Camera view"><button type="button" data-view="first" aria-pressed="false"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg><span>First person</span></button><button type="button" data-view="third" aria-pressed="true"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><circle cx="10" cy="5.5" r="2.4"/><path d="M5.5 17v-3.5a4.5 4.5 0 0 1 9 0V17M2 7V3h4m8 0h4v4"/></svg><span>Third person</span></button><kbd aria-label="V key switches view">V</kbd></div><p id="travel-driving-hint" hidden></p><button type="button" id="travel-reverse" hidden aria-label="Hold to reverse. Release to stop reversing."><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="m8 4-5 5 5 5M3 9h8a5 5 0 0 1 5 5v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Hold to reverse</span><kbd>R</kbd></button>';
  const viewButtons = [...cameraControls.querySelectorAll('[data-view]')], reverseButton = cameraControls.querySelector('#travel-reverse');
  const drivingHint = cameraControls.querySelector('#travel-driving-hint');
  const flightControls = document.createElement('div');
  flightControls.id = 'travel-flight'; flightControls.hidden = true;
  flightControls.setAttribute('role', 'group'); flightControls.setAttribute('aria-label', 'Flight height');
  flightControls.innerHTML = '<span id="travel-flight-status">Taking off</span><button type="button" data-lift="1" aria-label="Hold to rise" aria-keyshortcuts="Space"><span aria-hidden="true">↑</span> Rise <kbd>Space</kbd></button><button type="button" data-lift="-1" aria-label="Hold to descend" aria-keyshortcuts="C"><span aria-hidden="true">↓</span> Descend <kbd>C</kbd></button>';
  const flightStatus = flightControls.querySelector('#travel-flight-status'), flightButtons = [...flightControls.querySelectorAll('[data-lift]')];
  const drivePad = document.createElement('div');
  drivePad.id = 'first-person-drive'; drivePad.hidden = true;
  drivePad.setAttribute('role', 'group'); drivePad.setAttribute('aria-label', 'Riding controls');
  drivePad.innerHTML = '<button type="button" data-drive="forward" aria-label="Move forward" aria-keyshortcuts="W ArrowUp">↑</button><button type="button" data-drive="left" aria-label="Steer left" aria-keyshortcuts="A ArrowLeft">↶</button><button type="button" data-drive="back" aria-label="Brake and reverse" aria-keyshortcuts="S ArrowDown">↓</button><button type="button" data-drive="right" aria-label="Steer right" aria-keyshortcuts="D ArrowRight">↷</button>';
  cameraControls.append(flightControls, drivePad);
  const driveInputs = new Map(), flightInputs = new Map();
  let driveThrottle = 0, driveTurn = 0, flightLift = 0;
  const mounted = () => !indoors && selected !== 'walk';
  const flying = () => !indoors && selected === 'charizard';
  const canDrive = () => ready && !paused && (mounted() || view === 'first');
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
      if (event.button !== 0 || !canDrive()) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      driveInputs.set(event.pointerId, button.dataset.drive); sendDrive();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { driveInputs.delete(event.pointerId); sendDrive(); });
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key) || !canDrive()) return;
      event.preventDefault(); driveInputs.set(`key-${button.dataset.drive}`, button.dataset.drive); sendDrive();
    });
    button.addEventListener('keyup', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); driveInputs.delete(`key-${button.dataset.drive}`); sendDrive();
    });
    button.addEventListener('blur', () => { driveInputs.delete(`key-${button.dataset.drive}`); sendDrive(); });
  }
  function sendFlight() {
    const values = [...flightInputs.values()];
    const lift = Number(values.includes(1)) - Number(values.includes(-1));
    for (const button of flightButtons) button.classList.toggle('held', values.includes(Number(button.dataset.lift)));
    if (lift === flightLift) return;
    flightLift = lift;
    document.dispatchEvent(new CustomEvent('world:flight', { detail: { lift } }));
  }
  function releaseFlight() { flightInputs.clear(); sendFlight(); }
  for (const button of flightButtons) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !ready || paused || !flying()) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      flightInputs.set(event.pointerId, Number(button.dataset.lift)); sendFlight();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { flightInputs.delete(event.pointerId); sendFlight(); });
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key) || !ready || paused || !flying()) return;
      event.preventDefault(); flightInputs.set(`key-${button.dataset.lift}`, Number(button.dataset.lift)); sendFlight();
    });
    button.addEventListener('keyup', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); flightInputs.delete(`key-${button.dataset.lift}`); sendFlight();
    });
    button.addEventListener('blur', () => { flightInputs.delete(`key-${button.dataset.lift}`); sendFlight(); });
  }
  function reverse(active) {
    active = Boolean(active && ready && !paused && mounted() && !flying());
    if (reversing === active) return;
    reversing = active;
    reverseButton.classList.toggle('reversing', active);
    document.dispatchEvent(new CustomEvent('world:reverse', { detail: { active } }));
  }
  function releaseAll() { reverse(false); releaseDrive(); releaseFlight(); }
  for (const button of viewButtons) button.addEventListener('click', () => {
    if (!ready || paused) return;
    releaseAll();
    document.dispatchEvent(new CustomEvent('world:view-select', { detail: { mode: button.dataset.view } }));
    document.getElementById('world')?.focus({ preventScroll: true });
  });
  reverseButton.addEventListener('pointerdown', event => {
    if (event.button !== 0 || reverseButton.disabled) return;
    event.preventDefault(); reverseButton.setPointerCapture(event.pointerId); reverse(true);
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
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  document.addEventListener('world:pause', () => { paused = true; releaseAll(); refresh(); });
  document.addEventListener('world:resume', () => { paused = false; refresh(); });
  const buttons = [];
  for (const mode of TRAVEL_MODES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'travel-option'; button.dataset.travelId = mode.id;
    button.setAttribute('role', 'radio'); button.setAttribute('aria-label', `${mode.label} · ${mode.pace}`);
    button.style.setProperty('--travel-accent', mode.color);
    button.innerHTML = `<span class="travel-option-art">${mode.icon}</span><span class="travel-option-label">${mode.label}</span><span class="travel-check" aria-hidden="true">✓</span>`;
    button.addEventListener('click', () => {
      if (!ready || paused || indoors) return;
      releaseAll();
      document.dispatchEvent(new CustomEvent('world:travel-select', { detail: { id: mode.id } }));
      document.getElementById('world')?.focus({ preventScroll: true });
    });
    options.append(button); buttons.push(button);
  }
  function refresh() {
    const effective = indoors ? 'walk' : selected, isMounted = mounted(), isFlying = flying(), isThird = view === 'third';
    controls.classList.toggle('travel-indoors', indoors);
    cameraControls.classList.toggle('is-flying', isFlying);
    note.textContent = indoors ? 'Walking indoors' : isFlying ? 'Fly over the village' : 'Rides stay outside';
    reverseButton.hidden = !isMounted || isFlying;
    reverseButton.disabled = !ready || paused;
    drivingHint.hidden = !isMounted;
    drivingHint.innerHTML = isThird
      ? `<span>↑ ↓ ← → move on screen</span><span>${isFlying ? 'Space rise · C descend' : 'R reverse · Space stop'}</span>`
      : isFlying
        ? '<span>W/S fly / brake · A/D steer</span><span>Space rise · C descend</span>'
        : '<span>W/S forward / reverse · A/D steer</span><span>Space brake</span>';
    flightControls.hidden = !isFlying;
    for (const button of flightButtons) button.disabled = !ready || paused;
    drivePad.hidden = !isMounted && view !== 'first';
    drivePad.setAttribute('aria-label', isThird ? 'Screen direction controls' : isFlying ? 'Flight steering' : isMounted ? 'Riding controls' : 'First person movement');
    const padLabels = isThird
      ? { forward: ['↑', 'Move up'], left: ['←', 'Move left'], back: ['↓', 'Move down'], right: ['→', 'Move right'] }
      : { forward: ['↑', 'Move forward'], left: ['↶', 'Steer left'], back: ['↓', isFlying ? 'Brake and move backward' : isMounted ? 'Brake and reverse' : 'Move backward'], right: ['↷', 'Steer right'] };
    for (const button of drivePad.children) {
      const [glyph, label] = padLabels[button.dataset.drive];
      button.textContent = glyph; button.setAttribute('aria-label', label); button.disabled = !ready || paused;
    }
    const desktopHint = document.querySelector('#walk-hint .desktop-hint'), mobileHint = document.querySelector('#walk-hint .mobile-hint');
    if (desktopHint) desktopHint.textContent = isThird
      ? isFlying ? 'move on screen · Space rise · C descend' : isMounted ? 'move on screen · R reverse · Space stop' : 'move on screen · click to walk'
      : isFlying ? 'W/S fly · A/D steer · drag to look' : isMounted ? 'W/S forward / reverse · A/D steer' : 'W/S move · A/D turn · drag to look';
    if (mobileHint) mobileHint.textContent = isThird
      ? isFlying ? 'Arrows move on screen · Rise / Descend' : isMounted ? 'Arrows move on screen' : 'Tap a place to visit'
      : isFlying ? 'Arrow pad to fly · drag to look' : isMounted ? 'Arrow pad to drive · drag to look' : 'Arrow pad to move · drag to look';
    for (const button of viewButtons) { button.disabled = !ready || paused; button.setAttribute('aria-pressed', String(button.dataset.view === view)); }
    for (const button of buttons) {
      const mode = TRAVEL_MODES.find(item => item.id === button.dataset.travelId), active = mode.id === effective;
      button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
      button.disabled = !ready || paused || (indoors && mode.id !== 'walk');
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
    releaseAll();
    if (state.id === 'charizard' && selected !== 'charizard') flightStatus.textContent = 'Taking off';
    if (TRAVEL_MODES.some(mode => mode.id === state.id)) selected = state.id;
    indoors = Boolean(state.indoors); refresh();
  });
  document.addEventListener('world:view-changed', event => {
    if (!['first', 'third'].includes(event.detail?.mode)) return;
    releaseAll(); view = event.detail.mode; refresh();
  });
  document.addEventListener('world:flight-state', event => {
    const { height, phase } = event.detail || {};
    const text = phase === 'landing' ? 'Landing…' : phase === 'takeoff' ? 'Taking off' : `Flying · ${Math.max(0, Math.round(Number(height) || 0))} m`;
    if (flightStatus.textContent !== text) flightStatus.textContent = text;
  });
  document.addEventListener('world:ready', () => { ready = true; refresh(); });
  stage.append(controls, cameraControls); refresh();
  return { element: controls, cameraControls };
}

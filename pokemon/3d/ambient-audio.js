/** Optional, locally hosted soundtrack. No media is fetched before a user opts in. */
const TRACK_URL = new URL('./assets/audio/easy-lemon.mp3', import.meta.url).href;
const VOLUME = 0.16;
const controllers = new WeakMap();

export const AMBIENT_MUSIC_CREDIT = Object.freeze({
  title: 'Easy Lemon',
  artist: 'Kevin MacLeod',
  source: 'https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1200076',
  license: 'CC BY 4.0',
  licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
  changes: 'Compressed for web playback; played quietly with entry/exit fades.',
});

export function initAmbientAudio(button) {
  if (!button) return null;
  if (controllers.has(button)) return controllers.get(button);
  const label = button.querySelector('[data-music-label]');
  let media = null, context = null, gain = null;
  let enabled = false, loading = false, failed = false, disposed = false;
  let operation = 0, pauseTimer = 0, fadeFrame = 0;

  function render() {
    const state = failed ? 'error' : !enabled ? 'off' : document.hidden ? 'suspended' : loading ? 'loading' : 'on';
    button.dataset.musicState = state;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-busy', String(loading));
    const title = failed ? 'Music could not load. Try playing it again.'
      : !enabled ? 'Play gentle background music — Easy Lemon by Kevin MacLeod'
      : document.hidden ? 'Music pauses in the background. Click to turn it off.'
      : loading ? 'Loading background music. Click to cancel.'
      : 'Pause background music — Easy Lemon by Kevin MacLeod';
    button.title = title;
    button.setAttribute('aria-label', title);
    if (label) label.textContent = failed ? 'Retry music' : loading ? 'Loading…' : enabled ? 'Music on' : 'Music';
  }

  function clearTransitions() {
    window.clearTimeout(pauseTimer); pauseTimer = 0;
    window.cancelAnimationFrame(fadeFrame); fadeFrame = 0;
  }

  function fadeTo(value, seconds = 0) {
    window.cancelAnimationFrame(fadeFrame); fadeFrame = 0;
    if (gain && context) {
      const now = context.currentTime;
      const level = gain.gain.value;
      if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
      else { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(level, now); }
      if (seconds) gain.gain.linearRampToValueAtTime(value, now + seconds);
      else gain.gain.setValueAtTime(value, now);
    } else if (media) {
      if (!seconds) { media.volume = value; return; }
      const start = performance.now(), from = media.volume;
      const step = now => {
        const progress = Math.min(1, (now - start) / (seconds * 1000));
        media.volume = from + (value - from) * progress;
        if (progress < 1) fadeFrame = window.requestAnimationFrame(step);
        else fadeFrame = 0;
      };
      fadeFrame = window.requestAnimationFrame(step);
    }
  }

  function fail() {
    if (disposed || !enabled) return;
    operation++; enabled = false; loading = false; failed = true;
    clearTransitions(); fadeTo(0); media?.pause(); render();
  }

  function ensureMedia() {
    if (media) return media;
    media = new Audio();
    media.preload = 'none'; media.loop = true; media.volume = 0;
    media.setAttribute('playsinline', '');
    media.addEventListener('error', fail);
    media.src = TRACK_URL;
    // GainNode keeps the intentionally low volume reliable on mobile Safari,
    // where HTMLMediaElement.volume is not consistently programmable.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        context = new AudioContextClass();
        gain = context.createGain(); gain.gain.value = 0;
        context.createMediaElementSource(media).connect(gain);
        gain.connect(context.destination); media.volume = 1;
      } catch {
        context?.close().catch(() => {}); context = null; gain = null;
        media.volume = 0;
      }
    }
    return media;
  }

  async function play() {
    if (disposed || !enabled || document.hidden) { render(); return; }
    const token = ++operation;
    clearTransitions(); failed = false; loading = true; render();
    try {
      const audio = ensureMedia();
      if (audio.error) audio.load();
      fadeTo(0);
      // Both calls happen inside the original click, before awaiting anything.
      const resume = context?.state !== 'running' ? context?.resume() : null;
      await Promise.all([audio.play(), resume]);
      if (disposed || token !== operation || !enabled || document.hidden) return;
      loading = false; fadeTo(VOLUME, 1.2); render();
    } catch {
      if (!disposed && token === operation) fail();
    }
  }

  function pauseImmediately() {
    operation++; loading = false; clearTransitions(); fadeTo(0); media?.pause(); render();
  }

  function setEnabled(value) {
    if (disposed) return Promise.resolve();
    enabled = Boolean(value); failed = false;
    if (enabled) return play();
    const token = ++operation;
    loading = false; clearTransitions(); render();
    if (!media || media.paused || document.hidden) { fadeTo(0); media?.pause(); return Promise.resolve(); }
    fadeTo(0, 0.45);
    pauseTimer = window.setTimeout(() => {
      if (!disposed && token === operation && !enabled) media?.pause();
    }, 480);
    return Promise.resolve();
  }

  const toggle = () => { void setEnabled(!enabled); };
  const visibility = () => {
    if (document.hidden) pauseImmediately();
    else if (enabled) void play();
  };
  const pageHide = () => pauseImmediately();
  const pageShow = () => { if (enabled && !document.hidden) void play(); };
  button.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  render();

  const controller = {
    setEnabled,
    get enabled() { return enabled; },
    get state() { return button.dataset.musicState; },
    destroy() {
      if (disposed) return;
      enabled = false; pauseImmediately(); disposed = true;
      button.removeEventListener('click', toggle);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      if (media) { media.removeEventListener('error', fail); media.removeAttribute('src'); media.load(); }
      context?.close().catch(() => {});
      controllers.delete(button);
    },
  };
  controllers.set(button, controller);
  return controller;
}

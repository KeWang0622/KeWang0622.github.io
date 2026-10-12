/* Standalone deck adapter. Scene timelines stay the source of visual state. */
(function () {
  'use strict';
  window.mountStandaloneSlides = function (options) {
    options = options || {};
    if (!window.gsap) throw new Error('Load GSAP before composition-bridge.js');
    var records = Array.from(document.querySelectorAll('[data-composition-id]')).map(function (el) {
      return {
        el: el,
        id: el.dataset.compositionId,
        start: Number(el.dataset.start || 0),
        duration: Number(el.dataset.duration),
        timeline: (window.__timelines || {})[el.dataset.compositionId]
      };
    });
    if (!records.length || records.some(function (s) { return !Number.isFinite(s.duration) || s.duration <= 0; })) {
      throw new Error('Every scene needs a positive data-duration.');
    }
    var duration = Math.max.apply(null, records.map(function (s) { return s.start + s.duration; }));
    var root = gsap.timeline({ paused: true });
    root.to({}, { duration: duration });
    var active = null;
    var motion = null;
    var lastHold = 0;
    var standalone = false;
    try { standalone = parent !== window && !!parent.document.querySelector('hyperframes-slideshow'); } catch (_) {}
    function stopMotion() { if (motion) motion.kill(); motion = null; }
    function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function animate(s, hold) {
      stopMotion();
      if (!s || !s.timeline) return;
      s.timeline.pause(0, false);
      if (reducedMotion() || hold <= 0) { s.timeline.pause(hold, false); return; }
      motion = s.timeline.tweenTo(hold, { ease: 'none', onComplete: function () { motion = null; } });
    }
    function update(time) {
      var next = records.find(function (s) { return time >= s.start && time < s.start + s.duration; });
      if (!next && time >= duration) next = records[records.length - 1];
      records.forEach(function (s) {
        var visible = s === next;
        s.el.style.opacity = visible ? '1' : '0';
        s.el.style.visibility = visible ? 'visible' : 'hidden';
        s.el.style.pointerEvents = visible ? 'auto' : 'none';
        s.el.setAttribute('aria-hidden', String(!visible));
      });
      if (!next) return;
      var local = Math.max(0, Math.min(next.duration, time - next.start));
      var changed = active !== next;
      stopMotion();
      if (active && active !== next && active.timeline) active.timeline.pause();
      active = next;
      lastHold = local;
      if (next.timeline) {
        if (standalone && changed && next.el.dataset.slideAutoplay === 'true') animate(next, local);
        else next.timeline.pause(local, false);
      }
      window.dispatchEvent(new CustomEvent('hf-slide-active', { detail: { id: next.id, time: local } }));
      if (standalone) parent.postMessage({ source: 'mrfoundry-deck', type: 'slide', sceneId: next.id, replayable: !!next.timeline && next.el.dataset.slideAutoplay === 'true' }, location.origin);
    }
    window.__hfReplayCurrentSlide = function () { animate(active, lastHold); };
    window.__hfSetTime = update;
    window.__slideTimelines = Object.assign({}, window.__timelines || {});
    root.eventCallback('onUpdate', function () { update(root.time()); });
    if (standalone) {
      // The bare player chooses the first scene ID or the last registry key.
      // Keep the original scene timelines separately and expose only the deck clock.
      window.__timelines = { root: root };
    } else {
      window.__timelines = window.__timelines || {};
      window.__timelines.root = root;
    }
    update(0);
    // Let the first actual navigation seek trigger an entrance on the first slide.
    if (standalone) active = null;
    function announce() {
      parent.postMessage({ source: 'hf-preview', type: 'timeline', durationInFrames: Math.round(duration * 30), scenes: records.map(function (s) { return { id: s.id, start: s.start, duration: s.duration }; }) }, location.origin);
    }
    if (document.readyState === 'complete') setTimeout(announce, 300);
    else window.addEventListener('load', function () { setTimeout(announce, 300); }, { once: true });
    // HyperFrames 0.8.150 forwards iframe keydown to its shared onKey handler.
    // A second forwarding listener would advance the controller twice.
    return { root: root, scenes: records, seek: function (time) { root.seek(time, false); } };
  };
})();

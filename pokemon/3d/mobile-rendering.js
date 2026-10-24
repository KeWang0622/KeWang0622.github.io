// Phones spend their GPU budget on the village itself, rather than full-screen
// post-processing and multisampled HDR buffers. Keep the desktop art unchanged.
// Pure input/output makes the orientation and tablet boundary independently
// testable, without browser or GPU detection that varies across vendors.
export function chooseRenderProfile({ width, height, pixelRatio = 1, coarsePointer = false } = {}) {
  const viewportWidth = positiveNumber(width, 1280);
  const viewportHeight = positiveNumber(height, 800);
  const narrowViewport = viewportWidth <= 600;
  // Match a phone in either orientation. A full-size tablet or touch laptop
  // keeps the richer profile, even when it exposes a coarse primary pointer.
  const touchPhone = Boolean(coarsePointer) && Math.min(viewportWidth, viewportHeight) <= 600;
  const compact = narrowViewport || touchPhone;
  const maxPixelRatio = compact ? 1.25 : 1.5;
  return Object.freeze({
    name: compact ? 'mobile' : 'desktop',
    pixelRatio: Math.min(positiveNumber(pixelRatio, 1), maxPixelRatio),
    maxPixelRatio,
    // Canvas antialiasing remains enabled when creating WebGLRenderer. The
    // phone profile renders directly to that canvas, avoiding an HDR composer.
    antialias: true,
    samples: compact ? 0 : 4,
    shadowMapSize: compact ? 1024 : 2048,
    bloomEnabled: !compact,
    useComposer: !compact,
  });
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

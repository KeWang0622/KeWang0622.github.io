/* Display metadata only. Movement and clearance are owned by the world. */
const icon = body => `<svg viewBox="0 0 48 36" width="48" height="36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const TRAVEL_MODES = Object.freeze([
  { id: 'walk', label: 'On foot', shortLabel: 'Walking', pace: 'Easy pace', color: '#66836c',
    icon: icon('<circle cx="26" cy="6" r="3" fill="currentColor" stroke="none"/><path d="m23 12-5 8-7 2m12-10 6 3 6 6m-12-9-1 11-7 10m7-10 8 4 3 6"/>') },
  { id: 'bicycle', label: 'Bicycle', shortLabel: 'Bicycle', pace: 'Brisk ride', color: '#ba744f',
    icon: icon('<circle cx="10" cy="26" r="7"/><circle cx="38" cy="26" r="7"/><path d="m10 26 8-14 9 14H10m17 0 7-17 4 17M15 12h7m10-3h6l2 4"/>') },
  { id: 'model-s', label: 'Blue Model S', shortLabel: 'Model S', pace: 'Fast cruise', color: '#4b7aa4',
    icon: icon('<path d="m4 25 2-9 9-3 7-6h12l8 9 2 9h-5m-27 0h20M14 13h23M23 8l-2 5m-17 5h7m26 0h6"/><circle cx="12" cy="26" r="4"/><circle cx="36" cy="26" r="4"/>') },
  { id: 'cybertruck', label: 'Cybertruck', shortLabel: 'Cybertruck', pace: 'Fast cruise', color: '#7b8587',
    icon: icon('<path d="m3 16 20-9 14 8 8 3-1 9h-5m-27 0H4L3 16Zm0 0h40M23 7v9m14-1-5 1"/><circle cx="12" cy="27" r="4"/><circle cx="35" cy="27" r="4"/>') },
  { id: 'porsche', label: 'Porsche 911', shortLabel: 'Porsche 911', pace: 'Fast cruise', color: '#b36f61',
    icon: icon('<path d="m3 24 3-8 8-2c6-9 17-9 23 0l7 5v7h-5m-27 0H3v-2Zm11-10h23M25 8l1 6m12 4h6M5 19h5"/><circle cx="12" cy="26" r="4"/><circle cx="35" cy="26" r="4"/>') },
  { id: 'horse', label: 'Horse', shortLabel: 'Horseback', pace: 'Gentle canter', color: '#9a7758',
    icon: icon('<path d="m9 17 6-4 14 2 3-8 5-3 3 6 4 5-6 3-3-3-3 10-3 8m3-11-14 1-6 10m11-11 4 11m-13-12-4 6-3 6M10 16 5 14 3 20"/><path d="m34 7 3-3m-7 11 1-7"/><circle cx="38" cy="11" r=".8" fill="currentColor" stroke="none"/>') }
].map(mode => Object.freeze(mode)));

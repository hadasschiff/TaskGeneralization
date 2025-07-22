// vehicle.js
import { gameState } from './gameState.js';

  //  const VEHICLE_ICONS = {
  //   car:
  //      'data:image/svg+xml;utf8,<svg width="800" height="800" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><g id="body" fill="currentColor" stroke="black" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M35,12 C40,12 43.5,14.5 45,18 L46,22 C47.5,23 48.5,25 48.5,29 V35 H1 V29 L2,24 C3,22 4.5,22 4.5,22 L14.5,21 L17,15 C17.5,14 18,14 18,14 L21,12 Z"/></g><g id="windows" fill="white" stroke="black" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"><path d="M42,22 Q42,14 34,14 H27 V22 Z"/><path d="M25,22 V14 H22 Q18,14 17,22 Z"/></g><g id="wheels" fill="white" stroke="black" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle cx="38" cy="36" r="4"/><circle cx="12" cy="36" r="4"/></g></svg>',
  //   truck:
  //     'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KCiAgPCEtLSBDYXJnbyBCb3ggLS0+CiAgPGcgaWQ9ImNhcmdvIj4KICAgIDxyZWN0IHg9IjIiIHk9IjEzIiB3aWR0aD0iMjciIGhlaWdodD0iMzIiIHJ4PSIyIiByeT0iMiIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8L2c+Cgo8IS0tIENhYiAobG93ZXJlZCBzdHlsZSkgLS0+CjxnIGlkPSJjYWIiPgogIDxwYXRoIGQ9Ik0yOSAyM0gzOVE0MSAyMyA0MyAyNUw0OSAzMlE1MCAzMy41IDUwIDM2VjQyUTUwIDQzLjUgNDguNSA0NUgzMVYyNlEzMSAyMyAzNCAyM1oiCiAgICBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8L2c+Cgo8IS0tIFdpbmRvdyAtLT4KPGcgaWQ9IndpbmRvdyI+CiAgPHBhdGgKICAgIGQ9Ik0zOSAyN0wzOSAzMlEzOSAzMyA0MCAzM0g0OFE0NiAzMC41IDQ0LjUgMjguNUw0MiAyNlE0MSAyNSA0MCAyNUg0MFEzOSAyNS4yIDM5IDI3WiIKICAgIGZpbGw9IndoaXRlIgogICAgc3Ryb2tlPSJibGFjayIKICAgIHN0cm9rZS13aWR0aD0iMiIKICAvPgo8L2c+CgogIDwhLS0gV2hlZWxzIC0tPgogIDxnIGlkPSJ3aGVlbHMiPgogICAgPGNpcmNsZSBjeD0iMTMiIGN5PSI0NCIgcj0iNSIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iMzkiIGN5PSI0NCIgcj0iNSIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIvPgogIDwvZz4KPC9zdmc+',
  //   pickup_truck:
  //     'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDUwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoKICA8IS0tIDEuIENhcmdvIGJlZCAtLT4KICA8ZyBpZD0iY2FyZ28iPgogICAgPHBhdGggZD0iTTEsMjUgSDQ1IFYzNSBIMiBBMTAsNiAwIDAgMSAxLDM0IFoiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgoKICA8IS0tIDIuIENhYiBzaWxob3VldHRlIC0tPgogIDxnIGlkPSJjYWIiPgogICAgPHBhdGggZD0iIE0zMCwxMCBWN0MgMjksNi44OTUgMjkuODk1LDYgMzEsNiBIMzkgQzQxLDYgNDIuNSw3IDQ0LDkgTDQ5LDE2IEM1MCwxOCA1MCwyMCA1MCwyMiBWMzUgSDMxIFoiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgoKICA8IS0tIDMuIFdpbmRvdyAtLT4KICA8ZyBpZD0id2luZG93Ij4KICAgIDxyZWN0IHg9IjM2IiB5PSIxMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjciIHJ4PSIxLjUiIHJ5PSIxLjUiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8L2c+CgogIDwhLS0gNC4gV2hlZWxzIC0tPgogIDxnIGlkPSJ3aGVlbHMiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiPgogICAgPGNpcmNsZSBjeD0iOSIgc3Ryb2tlLXdpZHRoPSIyIiBjeT0iMzYiIHI9IjUiLz4KICAgIDxjaXJjbGUgY3g9IjIxIiBjeT0iMzYiIHI9IjUiLz4KICAgIDxjaXJjbGUgY3g9IjM5IiBjeT0iMzYiIHI9IjUiLz4KICA8L2c+Cjwvc3ZnPg=='
  // };
import {
  SEDAN_COLOR,
  SEDAN_PATTERNS_LEARN,
  SEDAN_PATTERNS_PLAN
} from './config.js';

/**
 * Returns an object   { color, patternUrl }   for the next sedan.
 * @param {'learn'|'plan'} phase
 * @param {number} index   // 0-based index of the sedan in that phase
 */
export function makeSedanAppearance(phase, index) {
  const pool = phase === 'learn' ? SEDAN_PATTERNS_LEARN : SEDAN_PATTERNS_PLAN;
  const file = pool[index % pool.length];              // wraps automatically
  return {
    color: SEDAN_COLOR,
    patternUrl: `/patterns/${file}`
  };
}


export function loadColoredSvg(svgPath, color, targetFill = 'pink') {
    return fetch(svgPath)
      .then(res => res.text())
      .then(svgText => {
        const colored = svgText.replace(/fill="currentColor"/gi, `fill="${color}"`);
        const blob = new Blob([colored], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
      })
      .catch(err => {
        console.error(`Error loading SVG: ${svgPath}`, err);
        throw err;
      });
  }

 export function renderVehiclePreview() {
  const el = document.getElementById('vehicle-display');
  if (!el || !gameState.currentVehicle) return;

  el.innerHTML = '';
  const v = document.createElement('div');
  v.className = 'vehicle-image';

  // 1. Paint the body in a single colour
  loadColoredSvg(`/vehicles/${vState.type}.svg`, vState.color)
    .then(colouredBodyUrl => {
      // 2. If this vehicle also has a pattern overlay – add it
      const bgImages = [`url(${colouredBodyUrl})`];
      if (vState.patternUrl) bgImages.push(`url(${vState.patternUrl})`);

      v.style.backgroundImage   = bgImages.join(',');
      v.style.backgroundRepeat  = 'no-repeat, repeat';
      v.style.backgroundSize    = 'contain, 14px';  // second value = pattern tile
      v.style.backgroundBlendMode = 'normal, multiply';
    });

  // sizing (unchanged) …
  el.appendChild(v);
}

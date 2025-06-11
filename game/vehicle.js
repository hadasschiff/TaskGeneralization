// colorSVG.js

/* icons.js  ─────────────────────────────────────────────
   Store each vehicle’s SVG once, as a data-URL that uses
   fill="currentColor" so it auto-inherits CSS color.   */
   const VEHICLE_ICONS = {
    car:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDUwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoKICA8IS0tIDEuIEZ1bGwgY2FyIGJvZHkgc2lsaG91ZXR0ZSAtLT4KICA8ZyBpZD0iYm9keSIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8cGF0aCBkPSIgTTE1LDEyIEMxMCwxMiA2LjUsMTQuNSA1LDE4IEw0LDIyIEMyLjUsMjMgMS41LDI1IDEuNSwyOSBWMzUgSDQ1IFYyOSBMNDgsMjQgQzQ3LDIyIDQ1LjUsMjIgNDUuNSwyMiBMMzUuNSwyMSBMMzMsMTUgQzMyLjUsMTQgMzIsMTQgMzIsMTQgTDI5LDEyIFoiLz4KICA8L2c+Cgo8IS0tIFdpbmRvd3MgLS0+CjxnIGlkPSJ3aW5kb3dzIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CgogIDwhLS0gTGVmdCB3aW5kb3cgLS0+CiAgPHBhdGggZD0iTTgsMjIgUTgsMTQgMTYsMTQgSDIzIFYyMiBaIi8+CgogIDwhLS0gUmlnaHQgd2luZG93IC0tPgogIDxwYXRoIGQ9Ik0yNSwyMiBWMTQgSDI4IFEzMiwxNCAzMywyMiBaIi8+CjwvZz4KCgo8IS0tIDMuIFdoZWVscyAtLT4KICAgPGcgaWQ9IndoZWVscyIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj4KICAgICAgPGNpcmNsZSBjeD0iMTIiIGN5PSIzNiIgcj0iNCIvPgogICAgIDxjaXJjbGUgY3g9IjM4IiBjeT0iMzYiIHI9IjQiLz4KICAgPC9nPgo8L3N2Zz4=',
    truck:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KCiAgPCEtLSBDYXJnbyBCb3ggLS0+CiAgPGcgaWQ9ImNhcmdvIj4KICAgIDxyZWN0IHg9IjIiIHk9IjEzIiB3aWR0aD0iMjciIGhlaWdodD0iMzIiIHJ4PSIyIiByeT0iMiIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8L2c+Cgo8IS0tIENhYiAobG93ZXJlZCBzdHlsZSkgLS0+CjxnIGlkPSJjYWIiPgogIDxwYXRoIGQ9Ik0yOSAyM0gzOVE0MSAyMyA0MyAyNUw0OSAzMlE1MCAzMy41IDUwIDM2VjQyUTUwIDQzLjUgNDguNSA0NUgzMVYyNlEzMSAyMyAzNCAyM1oiCiAgICBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8L2c+Cgo8IS0tIFdpbmRvdyAtLT4KPGcgaWQ9IndpbmRvdyI+CiAgPHBhdGgKICAgIGQ9Ik0zOSAyN0wzOSAzMlEzOSAzMyA0MCAzM0g0OFE0NiAzMC41IDQ0LjUgMjguNUw0MiAyNlE0MSAyNSA0MCAyNUg0MFEzOSAyNS4yIDM5IDI3WiIKICAgIGZpbGw9IndoaXRlIgogICAgc3Ryb2tlPSJibGFjayIKICAgIHN0cm9rZS13aWR0aD0iMiIKICAvPgo8L2c+CgogIDwhLS0gV2hlZWxzIC0tPgogIDxnIGlkPSJ3aGVlbHMiPgogICAgPGNpcmNsZSBjeD0iMTMiIGN5PSI0NCIgcj0iNSIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iMzkiIGN5PSI0NCIgcj0iNSIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIvPgogIDwvZz4KPC9zdmc+',
    new_tuck:
      'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDUwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoKICA8IS0tIDEuIENhcmdvIGJlZCAtLT4KICA8ZyBpZD0iY2FyZ28iPgogICAgPHBhdGggZD0iTTEsMjUgSDQ1IFYzNSBIMiBBMTAsNiAwIDAgMSAxLDM0IFoiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgoKICA8IS0tIDIuIENhYiBzaWxob3VldHRlIC0tPgogIDxnIGlkPSJjYWIiPgogICAgPHBhdGggZD0iIE0zMCwxMCBWN0MgMjksNi44OTUgMjkuODk1LDYgMzEsNiBIMzkgQzQxLDYgNDIuNSw3IDQ0LDkgTDQ5LDE2IEM1MCwxOCA1MCwyMCA1MCwyMiBWMzUgSDMxIFoiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPC9nPgoKICA8IS0tIDMuIFdpbmRvdyAtLT4KICA8ZyBpZD0id2luZG93Ij4KICAgIDxyZWN0IHg9IjM2IiB5PSIxMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjciIHJ4PSIxLjUiIHJ5PSIxLjUiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8L2c+CgogIDwhLS0gNC4gV2hlZWxzIC0tPgogIDxnIGlkPSJ3aGVlbHMiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiPgogICAgPGNpcmNsZSBjeD0iOSIgc3Ryb2tlLXdpZHRoPSIyIiBjeT0iMzYiIHI9IjUiLz4KICAgIDxjaXJjbGUgY3g9IjIxIiBjeT0iMzYiIHI9IjUiLz4KICAgIDxjaXJjbGUgY3g9IjM5IiBjeT0iMzYiIHI9IjUiLz4KICA8L2c+Cjwvc3ZnPg=='
  };
  
  

  function loadColoredSvgFromUrl(svgUrl, color) {
    // Decode the SVG from the original data URL
    const isBase64 = svgUrl.includes(';base64,');
    const raw = svgUrl.split(',')[1];
    const svgText = isBase64 ? atob(raw) : decodeURIComponent(raw);
  
    // Replace fill="currentColor" with the given color
    const colored = svgText.replace(/fill="currentColor"/gi, `fill="${color}"`);
  
    // Return a new utf8 data URL
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(colored);
  }
  





function loadColoredSvg(svgPath, color, targetFill = 'pink') {
    return fetch(svgPath)
      .then(res => res.text())
      .then(svgText => {
        //const colored = svgText.replace(new RegExp(`fill="${targetFill}"`, 'g'), `fill="${color}"`);
        const colored = svgText.replace(/fill="currentColor"/gi, `fill="${color}"`);
        const blob = new Blob([colored], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
      })
      .catch(err => {
        console.error(`Error loading SVG: ${svgPath}`, err);
        throw err;
      });
  }

  function renderVehiclePreview() {
    const previewEl = document.getElementById('vehicle-display');
    if (!previewEl || !currentVehicle) return;
  
    previewEl.innerHTML = ''; // Clear previous preview
  
    const previewVehicle = document.createElement('div');
    previewVehicle.className = 'vehicle-image';
  
    // loadColoredSvg(`/vehicles/${currentVehicle.type}.svg`, currentVehicle.color || 'pink')
    //   .then(coloredUrl => {
    //     previewVehicle.style.backgroundImage = `url(${coloredUrl})`;
    //   });
  

    // Get the base inline SVG (as data URL)
    if (!VEHICLE_ICONS[currentVehicle.type]) {
      console.error(`Unknown vehicle type: "${currentVehicle.type}"`);
      return;
    }
    

    const svgBase = VEHICLE_ICONS[currentVehicle.type];
    const svgColored = loadColoredSvgFromUrl(svgBase, currentVehicle.color || 'pink');

    previewVehicle.style.backgroundImage = `url("${svgColored}")`;
  
    previewVehicle.style.backgroundSize = 'contain';
    previewVehicle.style.backgroundRepeat = 'no-repeat';
    previewVehicle.style.backgroundPosition = 'center';
    previewVehicle.style.filter = `drop-shadow(0 0 0 ${currentVehicle.color || 'pink'}) saturate(200%) brightness(80%)`;
    previewVehicle.style.position = 'relative';
  
    if (currentVehicle.size === 'small') {
      previewVehicle.style.width = '50%';
      previewVehicle.style.height = '50%';
    } else if (currentVehicle.size === 'medium') {
      previewVehicle.style.width = '75%';
      previewVehicle.style.height = '75%';
    } else {
      previewVehicle.style.width = '100%';
      previewVehicle.style.height = '100%';
    }
  
    previewEl.appendChild(previewVehicle);
  }
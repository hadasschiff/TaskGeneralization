// colorSVG.js
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
  
    loadColoredSvg(`/vehicles/${currentVehicle.type}.svg`, currentVehicle.color || 'pink')
      .then(coloredUrl => {
        previewVehicle.style.backgroundImage = `url(${coloredUrl})`;
      });
  
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
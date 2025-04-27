// End the game and show results
function endGame() {
  console.log('Game completed');
  
  // Convert the UI to show game completion
  const container = document.querySelector('.game-container');
  
  // Save completion time
  const completionTime = Date.now();
  
  // Display completion screen
  container.innerHTML = `
      <div class="completion-screen">
          <h1>Game Complete!</h1>
          <p>Thank you for participating.</p>
          <div class="final-score">Final Score: ${score}</div>
      </div>
  `;
  
  // Add completion screen styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
      .completion-screen {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          background-color: white;
          text-align: center;
          padding: 40px;
      }
      
      .completion-screen h1 {
          color: #1e3c72;
          margin-bottom: 30px;
      }
      
      .final-score {
          font-size: 24px;
          font-weight: bold;
          margin: 30px 0;
      }
  `;
  document.head.appendChild(styleEl);
  
  // Save game data
  saveGameData();
}

//Save game data to server or localStorage

function saveGameData() {
  console.log('Saving game data:', gameData);
  
  // Option 1: Save to localStorage (for testing)
  try {
      localStorage.setItem('navigationGameData', JSON.stringify(gameData));
      console.log('Game data saved to localStorage');
  } catch (e) {
      console.error('Failed to save to localStorage:', e);
  }
  
  // Option 2: Save to server (Firebase example)
  /*
  if (typeof firebase !== 'undefined') {
      // Create a unique session ID
      const sessionId = 'session_' + Date.now();
      
      // Prepare data for saving
      const data = {
          timestamp: Date.now(),
          prolificId: gameData.prolificId || 'anonymous',
          studyId: gameData.studyId || 'local_test',
          sessionId: gameData.sessionId || sessionId,
          score: score,
          phase1: gameData.phase1,
          phase2: gameData.phase2
      };
      
      // Save to Firebase
      firebase.database().ref('game_data/' + sessionId).set(data)
          .then(() => {
              console.log('Data saved successfully to Firebase');
          })
          .catch((error) => {
              console.error('Error saving data to Firebase:', error);
          });
  }
  */
}

// Extract Prolific parameters from URL if available
function extractProlificParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const prolificPid = urlParams.get('PROLIFIC_PID');
  const studyId = urlParams.get('STUDY_ID');
  const sessionId = urlParams.get('SESSION_ID');
  
  if (prolificPid) {
      console.log('Prolific participant detected:', prolificPid);
      // Store these IDs with the game data
      gameData.prolificId = prolificPid;
      gameData.studyId = studyId;
      gameData.sessionId = sessionId;
  }
}
// Vehicle Navigation Game - Main game functionality and logic
// Game Configuration
const GRID_SIZE = 4;
const LEARNING_TRIALS = 8;
const PLANNING_TRIALS = 20;
const NEW_SIZE_TRIALS = 10;

// Vehicle types and controls
const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 't', downKey: 'g', leftKey: 'z', rightKey: 'x' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 't', downKey: 'g', leftKey: 'b', rightKey: 'n' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 'u', downKey: 'j', leftKey: 's', rightKey: 'd' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 'u', downKey: 'j', leftKey: 'f', rightKey: 'g' }
};

// Color palettes for vehicle types
const COLOR_PALETTES = {
  car: [
      '#FF5733', '#FF8C33', '#FFC133', '#FFFF33', '#C1FF33', 
      '#8CFF33', '#57FF33', '#33FF33', '#33FF57', '#33FF8C', 
      '#33FFC1', '#33FFFF', '#33C1FF', '#338CFF', '#3357FF', 
      '#3333FF', '#5733FF', '#8C33FF', '#C133FF', '#FF33FF'
  ],
  truck: [
      '#FF3366', '#FF6699', '#FF99CC', '#FFCCFF', '#CC99FF', 
      '#9966FF', '#6633FF', '#3300FF', '#0033FF', '#0066FF', 
      '#0099FF', '#00CCFF', '#00FFFF', '#00FFCC', '#00FF99', 
      '#00FF66', '#00FF33', '#33FF00', '#66FF00', '#99FF00'
  ]
};

// Game state
let currentPhase = 0;
let currentTrial = 0;
let currentVehicle = {
  type: null,
  size: null,
  color: null,
  x: 0,
  y: 0,
  keys: {}
};
let score = 0;
let gridWorld = [];
let obstacles = [];
let rewards = [];

// Data collection
let gameData = {
  phase1: [],
  phase2: []
};

// Initialize the game when opening slide transitions to game
function initializeGame() {
  console.log('Initializing game');
  
  // Replace the opening slide with the game UI
  createGameUI();
  
  // Set up keyboard listeners for navigation
  setupKeyboardListeners();
  
  // Start Phase 1
  startLearningPhase();
}

// Create the game UI elements
function createGameUI() {
  // Get the main container
  const container = document.querySelector('.game-container');
  
  // Clear existing content
  container.innerHTML = '';
  container.style.opacity = '1';
  
  // Create game UI structure
  container.innerHTML = `
      <div class="header-bar">
          <div class="score">Score: <span id="score">0</span></div>
      </div>
      
      <div class="game-grid-outer-container">
          <div class="game-grid-inner-container">
              <div id="game-grid"></div>
          </div>
          <div id="vehicle-display" class="vehicle-display"></div>
      </div>
      
      <div class="controls-container">
          <div id="controls-info"></div>
      </div>
  `;
  
  // Add game-specific styles
  addGameStyles();
}

// Add game-specific styles
function addGameStyles() {
  // Create a style element
  const styleEl = document.createElement('style');
  
  // Add game-specific CSS with REDUCED padding for controls container
  styleEl.textContent = `
      .header-bar {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          background-color: #1e3c72;
          color: white;
          font-weight: bold;
      }
      
      .game-grid-outer-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px;
          gap: 30px;
      }

      .game-grid-inner-container {
          display: flex;
          flex-shring: 0;
      }
      
      #game-grid {
          display: grid;
          grid-template-columns: repeat(${GRID_SIZE}, 1fr);
          grid-template-rows: repeat(${GRID_SIZE}, 1fr);
          gap: 2px;
          width: 550px;
          height: 520px;
          background-color: #eee;
          flex-shrink: 0;
      }
      
      .grid-cell {
          background-color: white;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .fade-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: white;
          opacity: 0;
          z-index: 200;
          pointer-events: none;
          transition: opacity 0.5s ease;
      }


      .obstacle {
          background-color: #ffcccc;
      }
      
      .reward {
          background-color: #ccffcc;
      }
      
      .car-svg, .truck-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
      }
      
      .controls-container {
          padding: 6px; /* REDUCED padding for smaller bottom border */
          display: flex;
          justify-content: center;
          background-color: #f0f0f0;
      }
      
      .message-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
      }
      
      .message-box {
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          max-width: 80%;
      }
      
      .message-box h2 {
          margin-bottom: 20px;
          color: #1e3c72;
      }
      
      .message-box button {
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #1e3c72;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
      }
      
      .trial-transition {
          animation: fadeInOut 1s ease-in-out;
      }
      
      .vehicle-display {
          position: absolute;
          top: 40px;
          right: 40px;
          width: 200px;
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f8f8f8;
          border: 2px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0; /* prevent shrinking */
          margin-top: 20px;
      }

      .grid-wrapper {
          flex-shring: 0;
      }
      
      @keyframes fadeInOut {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
      }
  `;
  
  // Add the style to the document head
  document.head.appendChild(styleEl);
}

// Setup keyboard event listeners
function setupKeyboardListeners() {
  document.addEventListener('keydown', function(event) {
      // Only handle key presses during the active learning phase
      if (currentPhase !== 1) return;
      
      const key = event.key.toLowerCase();
      console.log("Key pressed:", key);
      
      // Check if the key matches current vehicle controls
      if (key === currentVehicle.keys.up) {
          console.log("Moving up");
          moveVehicle('up');
      } else if (key === currentVehicle.keys.down) {
          console.log("Moving down");
          moveVehicle('down');
      } else if (key === currentVehicle.keys.left) {
          console.log("Moving left");
          moveVehicle('left');
      } else if (key === currentVehicle.keys.right) {
          console.log("Moving right");
          moveVehicle('right');
      }
  });
}

// Start the learning phase (Phase 1)
function startLearningPhase() {
  currentPhase = 1;
  currentTrial = 1;
  score = 0;
  
  // Update UI - only update score
  document.getElementById('score').textContent = score;
  
  // Reset game data
  gameData.phase1 = [];
  
  // Show initial instructions before starting the first trial
  showTrialInstructions();
}

// Show instructions before starting a trial
function showTrialInstructions() {
  // Create instruction overlay
  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';
  
  // header text
  overlay.innerHTML = `
      <div class="message-box">
          <h2>Instructions</h2>
          <p>Navigate the vehicle using the keyboard controls.</p>
          <p>Collect rewards (💰) and avoid obstacles (🔥).</p>
          <button id="start-trial-btn">Start</button>
      </div>
  `;
  
  document.querySelector('.game-container').appendChild(overlay);
  
  // Add event listener to start trial button
  const startButton = document.getElementById('start-trial-btn');
  startButton.addEventListener('click', function() {
      overlay.remove();
      createTrial();
  });
}

// Create a new trial with a specific vehicle and grid
function createTrial() {
  // Select vehicle type based on trial number to ensure equal distribution
  const vehicleTypeIndex = (currentTrial - 1) % 4;
  const vehicleTypes = Object.values(VEHICLE_TYPES);
  const selectedVehicleType = vehicleTypes[vehicleTypeIndex];
  
  // Update current vehicle
  currentVehicle.type = selectedVehicleType.type;
  currentVehicle.size = selectedVehicleType.size;
  currentVehicle.keys = {
      up: selectedVehicleType.upKey,
      down: selectedVehicleType.downKey,
      left: selectedVehicleType.leftKey,
      right: selectedVehicleType.rightKey
  };
  
  // Select color based on trial number
  const colorIndex = Math.floor((currentTrial - 1) / 4) % 20;
  currentVehicle.color = currentVehicle.type === 'car' ? 
                        COLOR_PALETTES.car[colorIndex] : 
                        COLOR_PALETTES.truck[colorIndex];
  
  // Reset grid and place vehicle at random position
  resetGrid();
  
  // Update vehicle info display
  updateVehicleInfo();
  
  // Start trial timer and record data
  startTrialTimer();
}

// Reset and generate new grid world
function resetGrid() {
  // Clear previous grid
  gridWorld = [];
  obstacles = [];
  rewards = [];
  
  // Create empty grid
  for (let y = 0; y < GRID_SIZE; y++) {
      gridWorld[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
          gridWorld[y][x] = 'empty';
      }
  }
  
  // Place vehicle at random position
  currentVehicle.x = Math.floor(Math.random() * GRID_SIZE);
  currentVehicle.y = Math.floor(Math.random() * GRID_SIZE);
  
  // Place obstacles and rewards
  placeObstaclesAndRewards();
  
  // Render grid
  renderGrid();
}

// Place obstacles and rewards in the grid
function placeObstaclesAndRewards() {
  // Place obstacles (8)
  for (let i = 0; i < 8; i++) {
      let x, y;
      do {
          x = Math.floor(Math.random() * GRID_SIZE);
          y = Math.floor(Math.random() * GRID_SIZE);
      } while ((x === currentVehicle.x && y === currentVehicle.y) || 
               obstacles.some(obs => obs.x === x && obs.y === y) ||
               rewards.some(rew => rew.x === x && rew.y === y));
      
      obstacles.push({ x, y });
      gridWorld[y][x] = 'obstacle';
  }
  
  // Place rewards (4)
  for (let i = 0; i < 4; i++) {
      let x, y;
      do {
          x = Math.floor(Math.random() * GRID_SIZE);
          y = Math.floor(Math.random() * GRID_SIZE);
      } while ((x === currentVehicle.x && y === currentVehicle.y) || 
               obstacles.some(obs => obs.x === x && obs.y === y) ||
               rewards.some(rew => rew.x === x && rew.y === y));
      
      rewards.push({ x, y });
      gridWorld[y][x] = 'reward';
  }
}

// Render the grid based on current state
function renderGrid() {
  const gridEl = document.getElementById('game-grid');
  
  // Clear existing grid
  gridEl.innerHTML = '';
  
  // Create cells
  for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
          const cellEl = document.createElement('div');
          cellEl.className = 'grid-cell';
          cellEl.dataset.x = x;
          cellEl.dataset.y = y;
          
          // Add cell type class
          if (gridWorld[y][x] === 'obstacle') {
              cellEl.classList.add('obstacle');
              cellEl.innerHTML = '🔥'; // Fire emoji
          } else if (gridWorld[y][x] === 'reward') {
              cellEl.classList.add('reward');
              cellEl.innerHTML = '💰'; // Money bag emoji
          }
          
          // Add vehicle if this is vehicle position
          if (x === currentVehicle.x && y === currentVehicle.y) {
              const vehicle = document.createElement('div');
              vehicle.className = 'vehicle-image';
              vehicle.style.backgroundImage = `url('/vehicles/${currentVehicle.type}.svg')`; // just 'car.svg' for now
              vehicle.style.backgroundSize = 'contain';
              vehicle.style.backgroundRepeat = 'no-repeat';
              vehicle.style.backgroundPosition = 'center';
              vehicle.style.filter = `drop-shadow(0 0 0 ${currentVehicle.color}) saturate(200%) brightness(80%)`;
              vehicle.style.position = 'absolute';
              vehicle.style.top = '50%';
              vehicle.style.left = '50%';
              vehicle.style.transform = 'translate(-50%, -50%)';

            // Set size depending on small or big
            if (currentVehicle.size === 'small') {
                vehicle.style.width = '50%';
                vehicle.style.height = '50%';
            } else {
                vehicle.style.width = '100%';
                vehicle.style.height = '100%';
            }

              cellEl.appendChild(vehicle);

          }

          gridEl.appendChild(cellEl);
      }

  }
  // Preview the vehicle in the side panel
  const previewEl = document.getElementById('vehicle-display');
  if (previewEl) {
      previewEl.innerHTML = ''; // clean previous one

      const previewVehicle = document.createElement('div');
      previewVehicle.className = 'vehicle-image';
      previewVehicle.style.backgroundImage = `url('/vehicles/${currentVehicle.type}.svg')`;
      previewVehicle.style.backgroundSize = 'contain';
      previewVehicle.style.backgroundRepeat = 'no-repeat';
      previewVehicle.style.backgroundPosition = 'center';
      previewVehicle.style.filter = `drop-shadow(0 0 0 ${currentVehicle.color}) saturate(200%) brightness(80%)`;
      previewVehicle.style.position = 'relative';

      if (currentVehicle.size === 'small') {
          previewVehicle.style.width = '140px';
          previewVehicle.style.height = '140px';
      } else {
          previewVehicle.style.width = '260px';
          previewVehicle.style.height = '260px';
      }

      previewEl.appendChild(previewVehicle);
  }
        }


/**
* Create a car SVG element
* @param {string} size - 'small' or 'big'
* @param {string} color - color code
* @returns {HTMLElement} - SVG element
*/

/**
* Create a truck SVG element
* @param {string} size - 'small' or 'big'
* @param {string} color - color code
* @returns {HTMLElement} - SVG element
*/
function createTruckSVG(size, color) {
  const sizeFactor = size === 'small' ? 0.7 : 0.9;
  
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = (sizeFactor * 100) + "%";
  svg.style.height = (sizeFactor * 100) + "%";
  svg.style.margin = ((1 - sizeFactor) * 50) + "%";
  
  // Truck cargo (back) with 3D effect
  const cargoSide = document.createElementNS(svgNS, "rect");
  cargoSide.setAttribute("x", "5");
  cargoSide.setAttribute("y", "25");
  cargoSide.setAttribute("width", "45");
  cargoSide.setAttribute("height", "40");
  cargoSide.setAttribute("rx", "3");
  cargoSide.setAttribute("ry", "3");
  cargoSide.setAttribute("fill", color);
  cargoSide.setAttribute("stroke", "#000");
  cargoSide.setAttribute("stroke-width", "2");
  
  // Cargo top - darker shade for 3D effect
  const cargoTop = document.createElementNS(svgNS, "rect");
  cargoTop.setAttribute("x", "5");
  cargoTop.setAttribute("y", "20");
  cargoTop.setAttribute("width", "45");
  cargoTop.setAttribute("height", "5");
  cargoTop.setAttribute("rx", "1");
  cargoTop.setAttribute("ry", "1");
  // Darken the color for the top
  const darkerColor = adjustColor(color, -30);
  cargoTop.setAttribute("fill", darkerColor);
  cargoTop.setAttribute("stroke", "#000");
  cargoTop.setAttribute("stroke-width", "1");
  
  // Truck cab (front) with more detail
  const cab = document.createElementNS(svgNS, "rect");
  cab.setAttribute("x", "50");
  cab.setAttribute("y", "32");
  cab.setAttribute("width", size === 'big' ? "40" : "35");
  cab.setAttribute("height", size === 'big' ? "33" : "30");
  cab.setAttribute("rx", "5");
  cab.setAttribute("ry", "5");
  cab.setAttribute("fill", color);
  cab.setAttribute("stroke", "#000");
  cab.setAttribute("stroke-width", "2");
  
  // Cab roof with curve for big truck
  const cabRoof = document.createElementNS(svgNS, "path");
  if (size === 'big') {
    cabRoof.setAttribute("d", "M50,32 C50,25 85,25 90,32");
    cabRoof.setAttribute("fill", darkerColor);
    cabRoof.setAttribute("stroke", "#000");
    cabRoof.setAttribute("stroke-width", "1");
  }
  
  // Front windshield
  const windshield = document.createElementNS(svgNS, "path");
  if (size === 'big') {
    windshield.setAttribute("d", "M55,32 C55,27 80,27 85,32");
  } else {
    windshield.setAttribute("d", "M55,32 C55,28 75,28 80,32");
  }
  windshield.setAttribute("fill", "#B3E5FC");
  windshield.setAttribute("stroke", "#000");
  windshield.setAttribute("stroke-width", "1");
  
  // Side window
  const sideWindow = document.createElementNS(svgNS, "rect");
  sideWindow.setAttribute("x", "60");
  sideWindow.setAttribute("y", size === 'big' ? "35" : "37");
  sideWindow.setAttribute("width", size === 'big' ? "25" : "20");
  sideWindow.setAttribute("height", size === 'big' ? "12" : "10");
  sideWindow.setAttribute("rx", "2");
  sideWindow.setAttribute("ry", "2");
  sideWindow.setAttribute("fill", "#B3E5FC");
  sideWindow.setAttribute("stroke", "#000");
  sideWindow.setAttribute("stroke-width", "1");
  
  // Enhanced wheels with more detail
  const frontWheel = document.createElementNS(svgNS, "g");
  const frontWheelOuter = document.createElementNS(svgNS, "circle");
  frontWheelOuter.setAttribute("cx", size === 'big' ? "75" : "70");
  frontWheelOuter.setAttribute("cy", "70");
  frontWheelOuter.setAttribute("r", size === 'big' ? "11" : "8");
  frontWheelOuter.setAttribute("fill", "#333");
  
  const frontWheelInner = document.createElementNS(svgNS, "circle");
  frontWheelInner.setAttribute("cx", size === 'big' ? "75" : "70");
  frontWheelInner.setAttribute("cy", "70");
  frontWheelInner.setAttribute("r", size === 'big' ? "5" : "3");
  frontWheelInner.setAttribute("fill", "#999");
  
  frontWheel.appendChild(frontWheelOuter);
  frontWheel.appendChild(frontWheelInner);
  
  const middleWheel = document.createElementNS(svgNS, "g");
  const middleWheelOuter = document.createElementNS(svgNS, "circle");
  middleWheelOuter.setAttribute("cx", "40");
  middleWheelOuter.setAttribute("cy", "70");
  middleWheelOuter.setAttribute("r", size === 'big' ? "11" : "8");
  middleWheelOuter.setAttribute("fill", "#333");
  
  const middleWheelInner = document.createElementNS(svgNS, "circle");
  middleWheelInner.setAttribute("cx", "40");
  middleWheelInner.setAttribute("cy", "70");
  middleWheelInner.setAttribute("r", size === 'big' ? "5" : "3");
  middleWheelInner.setAttribute("fill", "#999");
  
  middleWheel.appendChild(middleWheelOuter);
  middleWheel.appendChild(middleWheelInner);
  
  const rearWheel = document.createElementNS(svgNS, "g");
  const rearWheelOuter = document.createElementNS(svgNS, "circle");
  rearWheelOuter.setAttribute("cx", "15");
  rearWheelOuter.setAttribute("cy", "70");
  rearWheelOuter.setAttribute("r", size === 'big' ? "11" : "8");
  rearWheelOuter.setAttribute("fill", "#333");
  
  const rearWheelInner = document.createElementNS(svgNS, "circle");
  rearWheelInner.setAttribute("cx", "15");
  rearWheelInner.setAttribute("cy", "70");
  rearWheelInner.setAttribute("r", size === 'big' ? "5" : "3");
  rearWheelInner.setAttribute("fill", "#999");
  
  rearWheel.appendChild(rearWheelOuter);
  rearWheel.appendChild(rearWheelInner);
  
  // Headlights and taillights
  const headlight = document.createElementNS(svgNS, "circle");
  headlight.setAttribute("cx", size === 'big' ? "88" : "83");
  headlight.setAttribute("cy", "40");
  headlight.setAttribute("r", "3");
  headlight.setAttribute("fill", "#FFFF99");
  headlight.setAttribute("stroke", "#000");
  headlight.setAttribute("stroke-width", "1");
  
  const taillight = document.createElementNS(svgNS, "rect");
  taillight.setAttribute("x", "7");
  taillight.setAttribute("y", "35");
  taillight.setAttribute("width", "3");
  taillight.setAttribute("height", "8");
  taillight.setAttribute("rx", "1");
  taillight.setAttribute("ry", "1");
  taillight.setAttribute("fill", "#FF3333");
  taillight.setAttribute("stroke", "#000");
  taillight.setAttribute("stroke-width", "1");
  
  // Special details for the big truck
  if (size === 'big') {
    // Truck grill
    const grill = document.createElementNS(svgNS, "rect");
    grill.setAttribute("x", "85");
    grill.setAttribute("y", "38");
    grill.setAttribute("width", "5");
    grill.setAttribute("height", "12");
    grill.setAttribute("fill", "#DDDDDD");
    grill.setAttribute("stroke", "#000");
    grill.setAttribute("stroke-width", "1");
    
    // Exhaust stack
    const exhaust = document.createElementNS(svgNS, "rect");
    exhaust.setAttribute("x", "52");
    exhaust.setAttribute("y", "15");
    exhaust.setAttribute("width", "3");
    exhaust.setAttribute("height", "17");
    exhaust.setAttribute("fill", "#777777");
    exhaust.setAttribute("stroke", "#000");
    exhaust.setAttribute("stroke-width", "1");
    
    svg.appendChild(exhaust);
    svg.appendChild(grill);
  }
  
  // Connection between cab and cargo
  const connection = document.createElementNS(svgNS, "rect");
  connection.setAttribute("x", "49");
  connection.setAttribute("y", size === 'big' ? "40" : "43");
  connection.setAttribute("width", "3");
  connection.setAttribute("height", "10");
  connection.setAttribute("fill", "#555555");
  connection.setAttribute("stroke", "#000");
  connection.setAttribute("stroke-width", "1");
  
  // Append all elements to SVG
  svg.appendChild(cargoSide);
  svg.appendChild(cargoTop);
  svg.appendChild(connection);
  svg.appendChild(cab);
  if (size === 'big') {
    svg.appendChild(cabRoof);
  }
  svg.appendChild(windshield);
  svg.appendChild(sideWindow);
  svg.appendChild(rearWheel);
  svg.appendChild(middleWheel);
  svg.appendChild(frontWheel);
  svg.appendChild(headlight);
  svg.appendChild(taillight);
  
  return svg;
}

/**
 * Helper function to adjust a color's brightness
 * @param {string} color - The color to adjust (hex format: #RRGGBB)
 * @param {number} amount - Amount to adjust (-255 to 255)
 * @returns {string} - The adjusted color in hex format
 */
function adjustColor(color, amount) {
  // Check if it's a hex color
  let hex = color;
  if (color.startsWith('#')) {
    hex = color.slice(1);
  }
  
  // Convert to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  
  // Convert back to hex
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Update vehicle info display
function updateVehicleInfo() {
  // Only display the controls info, no vehicle type info
  const controlsInfoEl = document.getElementById('controls-info');
  
  // Update controls info
  controlsInfoEl.innerHTML = `
      <p>Up: ${currentVehicle.keys.up.toUpperCase()} | 
         Down: ${currentVehicle.keys.down.toUpperCase()} | 
         Left: ${currentVehicle.keys.left.toUpperCase()} | 
         Right: ${currentVehicle.keys.right.toUpperCase()}</p>
  `;
}

// Start trial timer and record initial data

function startTrialTimer() {
  // Record trial start time
  const trialStartTime = Date.now();
  
  // Store initial trial data
  const trialData = {
      trial: currentTrial,
      phase: currentPhase,
      vehicleType: currentVehicle.type,
      vehicleSize: currentVehicle.size,
      vehicleColor: currentVehicle.color,
      startPosition: { x: currentVehicle.x, y: currentVehicle.y },
      obstacles: [...obstacles],
      rewards: [...rewards],
      startTime: trialStartTime,
      moves: [],
      rewardsCollected: 0,
      obstaclesHit: 0,
      endTime: null,
      totalTime: null
  };
  
  if (currentPhase === 1) {
      gameData.phase1.push(trialData);
  } else {
      gameData.phase2.push(trialData);
  }
}

// Move vehicle in specified direction
function moveVehicle(direction) {
  // Store old position
  const oldPosition = { x: currentVehicle.x, y: currentVehicle.y };
  
  // Calculate new position
  let newPosition = { x: currentVehicle.x, y: currentVehicle.y };
  
  switch (direction) {
      case 'up':
          newPosition.y = Math.max(0, currentVehicle.y - 1);
          break;
      case 'down':
          newPosition.y = Math.min(GRID_SIZE - 1, currentVehicle.y + 1);
          break;
      case 'left':
          newPosition.x = Math.max(0, currentVehicle.x - 1);
          break;
      case 'right':
          newPosition.x = Math.min(GRID_SIZE - 1, currentVehicle.x + 1);
          break;
  }
  
  // Record move
  const trialIndex = currentTrial - 1;
  const currentTrialData = currentPhase === 1 ? 
                        gameData.phase1[trialIndex] : 
                        gameData.phase2[trialIndex];
  
  currentTrialData.moves.push({
      direction,
      fromPosition: { ...oldPosition },
      toPosition: { ...newPosition },
      time: Date.now() - currentTrialData.startTime
  });
  
  // Update vehicle position
  currentVehicle.x = newPosition.x;
  currentVehicle.y = newPosition.y;
  
  // Check for collisions with obstacles or rewards
  checkCollisions();
  
  // Render updated grid
  renderGrid();
}

// Check for collisions with obstacles or rewards
function checkCollisions() {
  // Check for obstacle collision
  const hitObstacle = obstacles.findIndex(
      obs => obs.x === currentVehicle.x && obs.y === currentVehicle.y
  );
  
  if (hitObstacle !== -1) {
      // Remove obstacle
      obstacles.splice(hitObstacle, 1);
      gridWorld[currentVehicle.y][currentVehicle.x] = 'empty';
      
      // Decrease score
      score -= 10;
      document.getElementById('score').textContent = score;
      
      // Record obstacle hit
      const trialIndex = currentTrial - 1;
      const currentTrialData = currentPhase === 1 ? 
                            gameData.phase1[trialIndex] : 
                            gameData.phase2[trialIndex];
      currentTrialData.obstaclesHit++;
  }
  
  // Check for reward collision
  const collectedReward = rewards.findIndex(
      rew => rew.x === currentVehicle.x && rew.y === currentVehicle.y
  );
  
  if (collectedReward !== -1) {
      // Remove reward
      rewards.splice(collectedReward, 1);
      gridWorld[currentVehicle.y][currentVehicle.x] = 'empty';
      
      // Increase score
      score += 10;
      document.getElementById('score').textContent = score;
      
      // Record reward collection
      const trialIndex = currentTrial - 1;
      const currentTrialData = currentPhase === 1 ? 
                            gameData.phase1[trialIndex] : 
                            gameData.phase2[trialIndex];
      currentTrialData.rewardsCollected++;
  }
  
  // Check if all rewards are collected or no more moves possible
  if (rewards.length === 0 || (obstacles.length === 0 && rewards.length === 0)) {
      endTrial();
  }
}

// End current trial
function endTrial() {
  // Record trial end data
  const trialIndex = currentTrial - 1;
  const currentTrialData = currentPhase === 1 ? 
                        gameData.phase1[trialIndex] : 
                        gameData.phase2[trialIndex];
  
  currentTrialData.endTime = Date.now();
  currentTrialData.totalTime = currentTrialData.endTime - currentTrialData.startTime;
  currentTrialData.endPosition = { x: currentVehicle.x, y: currentVehicle.y };
  
  // Show trial results
  showTrialResults();
}

// Show results of current trial and transition to next
function showTrialResults() {
  // Create fade overlay
  const fadeOverlay = document.createElement('div');
  fadeOverlay.className = 'fade-overlay';
  document.querySelector('.game-container').appendChild(fadeOverlay);

  //fade in
  requestAnimationFrame(() => {
    fadeOverlay.style.opacity = 1;
  });

  // after fade in go to next trial
  setTimeout(() => {
    continueToNextTrial();
    // fade out after new trial
    setTimeout(() => {
      fadeOverlay.style.opacity = 0;
      // remove overlay after fadeout ends
      setTimeout(() => {
        fadeOverlay.remove();
      }, 500);
    } ,100);
  }, 500);
}
  
  overlay.innerHTML = `
      <div class="message-box">
          <button id="next-trial-btn">NEXT</button>
      </div>
  `;
  
  document.querySelector('.game-container').appendChild(overlay);
  
  // Use a more explicit event handler attachment with a named function
  function continueClickHandler() {
    console.log("Next button clicked");
    // Remove event listener to prevent multiple calls
    this.removeEventListener('click', continueClickHandler);
    // Continue to next trial
    continueToNextTrial();
  }

  // Add event listener to next trial button
  const nextButton = document.getElementById('next-trial-btn');
  if (nextButton) {
    console.log("Adding click event listener to next button");
    nextButton.addEventListener('click', continueClickHandler);
  } else {
    console.error("Next trial button not found!");
  }


// Continue to the next trial or phase
function continueToNextTrial() {
  // Remove the overlay
  const overlay = document.querySelector('.message-overlay');
  if (overlay) {
      overlay.remove();
  }
  
  console.log(`Current trial: ${currentTrial}, Phase: ${currentPhase}`);
  
  // Check if phase is complete
  if (currentPhase === 1 && currentTrial >= LEARNING_TRIALS) {
      console.log("Starting planning phase...");
      startPlanningPhase();
  } else if (currentPhase === 2 && currentTrial >= PLANNING_TRIALS) {
      console.log("Ending game...");
      endGame();
  } else {
      // Start next trial
      currentTrial++;
      console.log(`Moving to trial ${currentTrial}`);

      // only show instuctions if its trial #1
      if (currentTrial === 1) {
        showTrialInstructions();
      } else {
        createTrial();
      }
  }
}

// Start the planning phase (Phase 2)
function startPlanningPhase() {
  currentPhase = 2;
  currentTrial = 1;
  
  // Show phase transition message
  showPhaseTransition();
}

// Show phase transition message
function showPhaseTransition() {
  // Create phase transition overlay
  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';
  
  overlay.innerHTML = `
      <div class="message-box">
          <h2>Phase 1 Complete!</h2>
          <p>Now moving to Phase 2: Planning</p>
          <p>In this phase, you will plan your moves in advance without seeing the results.</p>
          <button id="start-phase2-btn">Begin Phase 2</button>
      </div>
  `;
  
  document.querySelector('.game-container').appendChild(overlay);
  
  // Add event listener to start phase 2 button
  const startPhase2Button = document.getElementById('start-phase2-btn');
  startPhase2Button.addEventListener('click', function startPhase2Handler() {
      console.log("Starting Phase 2 preparation...");
      overlay.remove();
      
      // Convert grid to planning mode
      convertToPlanningMode();
      
      // Reset game data for phase 2
      gameData.phase2 = [];
      
      // Show instructions for first planning trial
      showPlanningInstructions();
  });
}

// Show planning phase instructions
function showPlanningInstructions() {
  // Create instruction overlay
  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';
  
  overlay.innerHTML = `
      <div class="message-box">
          <h2>Planning Phase</h2>
          <p>Enter a sequence of keys to navigate to rewards.</p>
          <p>You won't see the results until you submit your plan.</p>
          <button id="start-planning-btn">Start Planning</button>
      </div>
  `;
  
  document.querySelector('.game-container').appendChild(overlay);
  
  // Add event listener to start planning button
  const startButton = document.getElementById('start-planning-btn');
  startButton.addEventListener('click', function startPlanningHandler() {
      overlay.remove();
      createPlanningTrial();
  });
}

// Convert the grid to planning mode
function convertToPlanningMode() {
  console.log("Converting to planning mode...");
  
  // Add planning-specific UI elements
  const controlsContainer = document.querySelector('.controls-container');
  
  // First check if planning controls already exist
  if (!document.getElementById('planning-controls')) {
      controlsContainer.innerHTML += `
          <div id="planning-controls">
              <p>Enter move sequence:</p>
              <input type="text" id="move-sequence" placeholder="e.g. uujjzx">
              <button id="submit-plan">Submit</button>
          </div>
      `;
      
      // Add event listener for submit button
      const submitButton = document.getElementById('submit-plan');
      if (submitButton) {
          submitButton.addEventListener('click', submitPlan);
          console.log("Submit plan button event listener added");
      } else {
          console.error("Submit plan button not found!");
      }
  }
}

// Create a planning trial
function createPlanningTrial() {
  // Similar to createTrial but for planning phase
  // Select vehicle type - 5 of each category
  const categoryIndex = Math.floor((currentTrial - 1) / 5);
  const vehicleTypes = Object.values(VEHICLE_TYPES);
  const selectedVehicleType = vehicleTypes[categoryIndex % 4];
  
  // Update current vehicle
  currentVehicle.type = selectedVehicleType.type;
  currentVehicle.size = selectedVehicleType.size;
  currentVehicle.keys = {
      up: selectedVehicleType.upKey,
      down: selectedVehicleType.downKey,
      left: selectedVehicleType.leftKey,
      right: selectedVehicleType.rightKey
  };
  
  // New color for phase 2
  currentVehicle.color = '#' + Math.floor(Math.random()*16777215).toString(16);
  
  // Reset grid
  resetGrid();
  
  // Update vehicle info display
  updateVehicleInfo();
  
  // Start trial timer
  startTrialTimer();
  
  // Clear move sequence input
  const moveSequenceInput = document.getElementById('move-sequence');
  if (moveSequenceInput) {
      moveSequenceInput.value = '';
  }
}

// Submit plan for current trial
function submitPlan() {
  console.log("Submitting plan...");
  
  const moveSequenceInput = document.getElementById('move-sequence');
  
  if (!moveSequenceInput) {
      console.error("Move sequence input element not found!");
      return;
  }
  
  const moveSequence = moveSequenceInput.value.toLowerCase();
  console.log(`Move sequence submitted: ${moveSequence}`);
  
  // Record moves
  const trialIndex = currentTrial - 1;
  
  // Make sure we have phase 2 data
  if (!gameData.phase2[trialIndex]) {
      console.error(`No data for phase 2, trial ${currentTrial}`);
      return;
  }
  
  const currentTrialData = gameData.phase2[trialIndex];
  
  // Process each key in the sequence
  for (let i = 0; i < moveSequence.length; i++) {
      const key = moveSequence[i];
      let direction = null;
      
      // Map key to direction
      if (key === currentVehicle.keys.up) {
          direction = 'up';
      } else if (key === currentVehicle.keys.down) {
          direction = 'down';
      } else if (key === currentVehicle.keys.left) {
          direction = 'left';
      } else if (key === currentVehicle.keys.right) {
          direction = 'right';
      }
      
      if (direction) {
          currentTrialData.moves.push({
              direction,
              keyPressed: key,
              time: Date.now() - currentTrialData.startTime
          });
      }
  }
  
  // Record trial end data
  currentTrialData.endTime = Date.now();
  currentTrialData.totalTime = currentTrialData.endTime - currentTrialData.startTime;
  currentTrialData.inputSequence = moveSequence;
  
  // Clear the input field
  moveSequenceInput.value = '';
  
  // End the trial
  endTrial();
}
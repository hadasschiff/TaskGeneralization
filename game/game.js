//game.js
let vehicleTrialQueueLearn = [];
let vehicleTrialQueuePlan = [];
let LEARN_POOL = [];
let PLAN_POOL = [];


function rInt(rng, n) { return Math.floor(rng() * n); }

//maze generator
function buildMaze(rng, vehicleType) {
  const g = Array.from({length: GRID_SIZE}, _=>Array(GRID_SIZE).fill('empty'));
  const start = { x: rInt(rng, GRID_SIZE), y: rInt(rng, GRID_SIZE) };

  const dirs = [{dx:0,dy:-1, name:'up'},{dx:0,dy:1, name:'down'},{dx:-1,dy:0, name:'left'},{dx:1,dy:0, name:'right'}];
  let queue = [{ path: [start], visited: new Set([`${start.x},${start.y}`]) }];
  let validPath = null;

  while (queue.length > 0) {
    const { path, visited } = queue.shift();
    const last = path[path.length - 1];

    if (path.length === 5) {
      validPath = path;
      break;
    }

    // shuffle directions to randomize path shape
    const shuffledDirs = dirs.slice().sort(() => rng() - 0.5);

    for (const d of shuffledDirs) {
      const nx = last.x + d.dx;
      const ny = last.y + d.dy;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 && nx < GRID_SIZE &&
        ny >= 0 && ny < GRID_SIZE &&
        !visited.has(key)
      ) {
        const newPath = [...path, { x: nx, y: ny }];
        const newVisited = new Set(visited);
        newVisited.add(key);
        queue.push({ path: newPath, visited: newVisited });
      }
    }
  }

  if (!validPath) {
    throw new Error('BFS failed to find a valid path');
  }

  const rewards = validPath.slice(1);
  rewards.forEach(p=>g[p.y][p.x]='reward');
  
  const optimalDirections = [];
  for (let i = 1; i < validPath.length; i++) {
    const dx = validPath[i].x - validPath[i - 1].x;
    const dy = validPath[i].y - validPath[i - 1].y;

    if (dx === 1) optimalDirections.push('right');
    else if (dx === -1) optimalDirections.push('left');
    else if (dy === 1) optimalDirections.push('down');
    else if (dy === -1) optimalDirections.push('up');
  }

  // add terminator or obstacles depending on vehicle type
  let terminator = null;
  let obstacles = [];
  const isCar = vehicleType.type.startsWith('car');
  const isTruck = vehicleType.type.startsWith('truck') || vehicleType.type.startsWith('new_truck');

  if (isTruck) {
    let placed = 0;
    while (placed < 2) {
      const ox = rInt(rng, GRID_SIZE);
      const oy = rInt(rng, GRID_SIZE);
      if (g[oy][ox] !== 'empty') continue;
      if (ox === start.x && oy === start.y) continue;

      g[oy][ox] = 'obstacle';
      obstacles.push({ x: ox, y: oy }); 
      placed++;
    }

  } else if (isCar) {
    let placed = false;
    while (!placed) {
      const tx = rInt(rng, GRID_SIZE);
      const ty = rInt(rng, GRID_SIZE);
      if (g[ty][tx] !== 'empty') continue;
      if (tx === start.x && ty === start.y) continue;

      g[ty][tx] = 'terminator';
      terminator = { x: tx, y: ty }; 
      placed = true;
    }
  }
  return { grid: g, start, rewards, optimalDirections, terminator, obstacles, vehicleType };
}

function sigOf(maze) {
  const path = maze.rewards.map(p => `${p.x},${p.y}`).join('|');
  const obs  = maze.obstacles?.map(p => `${p.x},${p.y}`).sort().join('|') || '';
  const term = maze.terminator ? `${maze.terminator.x},${maze.terminator.y}` : '';
  return [path, obs, term].join(' || ');
}

function makeMazePool(vehiclesqueue, seedPrefix, tag) {
  const seen = new Set();      // signatures we’ve already produced
  const pool = [];
  vehiclesqueue.forEach((vehicle, idx) => {
    let attempt = 0, maze, sig;

    do {
      // add “-0”, “-1”, … to the seed until we find a new layout
      const seed   = `${seedPrefix}-${idx}-${attempt}`;
      const rng    = new Math.seedrandom(seed);
      maze = buildMaze(rng, vehicle); 
      sig  = sigOf(maze);
      attempt++;
    } while (seen.has(sig));   
    seen.add(sig);
    maze.id = `${tag}-${idx}`;
    pool.push(maze);
  });

  return pool;                          
  }

//function shuffleOnce(a){
//  const c=[...a]; for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}
//  return c;
//}
//const learnOrder = shuffleOnce([...LEARN_POOL.keys()]);
//const planOrder  = shuffleOnce([...PLAN_POOL.keys()]);

//console.log('Learning order for this session:', learnOrder.map(i => 'L-' + i));
//console.log('Planning order for this session:', planOrder.map(i => 'P-' + i));

function loadMazeFrom(pool, idx){
  const m = pool[idx];
  if (!m) {
    console.error("Invalid maze lookup:", { idx, pool, poolLength: pool.length });
    throw new Error("Maze not found in pool");
  }
  console.log(`Loaded maze ${m.id}  (trial ${idx + 1}, phase ${currentPhase})`);

  gridWorld = m.grid.map(r=>[...r]);
  rewards   = m.rewards.map(r=>({...r}));
  obstacles = m.obstacles ? m.obstacles.map(o => ({ ...o })) : [];
  terminator = m.terminator ? { ...m.terminator } : null;
  currentVehicle.x = m.start.x;
  currentVehicle.y = m.start.y;

  console.log("b");
  console.log("Gridworld" , gridWorld);
  console.log(`Optimal route for ${m.id}: ${m.optimalDirections.join(', ')}`);
  renderGrid();
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const vehicleColorQueues = {
  car_small: shuffleArray(COLOR_PALETTE),
  car_big: shuffleArray(COLOR_PALETTE),
  car_medium: shuffleArray(COLOR_PALETTE),
  truck_small: shuffleArray(COLOR_PALETTE),
  truck_big: shuffleArray(COLOR_PALETTE),
  truck_medium: shuffleArray(COLOR_PALETTE),
  new_truck_small:shuffleArray(COLOR_PALETTE),
  new_truck_big: shuffleArray(COLOR_PALETTE)
};

let vehicleTrialQueue = [];

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
          <p style="font-size: 24px;">Thank you for participating.</p>
          <p style="font-size: 24px;">Due to technical difficulties, you will not need to take part in the public speaking task.</p>
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
let inputEnabled = false;

// Data collection
let gameData = {
  phase1: [],
  phase2: []
};

// Initialize the game when opening slide transitions to game
function initializeGame() {
  // Reset container styles for game
  const container = document.querySelector('.game-container');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'flex-start';
  container.style.alignItems = 'center';
  container.style.padding = '0';
  container.style.height = '100vh';
  container.style.width = '100vw';
  container.style.backgroundColor = 'white';
  document.documentElement.style.setProperty('--grid-size', GRID_SIZE);

  // Create and add the wrong key alert element
  const wrongKeyAlert = document.createElement('div');
  wrongKeyAlert.id = 'wrong-key-alert';
  wrongKeyAlert.textContent = 'Wrong Key!';
  wrongKeyAlert.classList.add('wrong-key-alert');
  wrongKeyAlert.style.display = 'none'; 
  document.body.appendChild(wrongKeyAlert);

  // Replace the opening slide with the game UI
  createGameUI();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'style.css';
  document.head.appendChild(link);
  
  // Set up keyboard listeners for navigation
  setupKeyboardListeners();
  showTrialInstructions();
}

function createGameUI() {
  // Get the main container
  const container = document.querySelector('.game-container');

  // Clear existing content
  container.innerHTML = '';
  container.style.opacity = '1';
    container.innerHTML = `
    <div class="header-bar">
        <div class="score-group">
            <div class="score">Score: <span id="score">0</span></div>
            <div class="score">✅ Successes: <span id="success-count">0</span></div>
            <div class="score">❌ Failures: <span id="failure-count">0</span></div>
        </div>
    </div>
  
    <div class="game-layout">
        <!-- 1.  Key panel  -->
        <div id="controls-info" class="controls-info">
            <div id="movement-instructions"></div>
            <div id="planning-controls" style="display:none">
                <p><strong>Plan your 4 moves!</strong></p>
                <div class="planning-input">
                    <input id="move-sequence" placeholder="e.g. wasd" autocomplete="off" />
                    <button id="submit-plan">Submit</button>
              </div>
          </div>
      </div>

      <!-- Maze wrapper  (flex-grow:1) -->
      <div class="grid-wrapper">
          <div class="game-grid-inner-container">
              <div id="game-grid"></div>
          </div>
      </div>

      <!-- 3.  Vehicle preview -->
      <div id="vehicle-display" class="vehicle-display"></div>
  </div>
`;
}

// Setup keyboard event listeners
function setupKeyboardListeners() {
  document.addEventListener('keydown', function(event) {
      // Only handle key presses during the active learning phase
      if (!inputEnabled || currentPhase !== 1 && currentPhase !== 0) return;
      
      const key = event.key.toLowerCase();
      const currentTrialData = getCurrentTrialData();

      //console.log("Key pressed:", key);
      
      if (!currentTrialData.routeTaken) currentTrialData.routeTaken = [];

      // Check if the key matches current vehicle controls
      if (key === currentVehicle.keys.up) {
          //console.log("up");
          moveVehicle('up');
          currentTrialData.routeTaken.push('up');

      } else if (key === currentVehicle.keys.down) {
          //console.log("down");
          moveVehicle('down');
          currentTrialData.routeTaken.push('down');

      } else if (key === currentVehicle.keys.left) {
          //console.log("left");
          moveVehicle('left');
          currentTrialData.routeTaken.push('left');

      } else if (key === currentVehicle.keys.right) {
          //console.log("right");
          moveVehicle('right');
          currentTrialData.routeTaken.push('right');

      } else {
        //wrong key presed
        showWrongKeyAlert();
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
  generateVehicleQueue();

}

function generateVehicleQueue() {
  const vehicleTypes = Object.values(VEHICLE_TYPES);
  console.log('Phase:', currentPhase, 'Vehicles:', vehicleTypes.length);
  //Learning Phase Queue
  const learnQueue = [];
  for (const v of vehicleTypes) {
    if (v.type === 'new_truck' || v.size === 'medium'){
      console.log('Skipping', v.type, v.size);
      continue; // skip for learning
    } 
    for (let i = 0; i < LEARNING_TRIALS; i++) {
    console.log('Using reps', LEARNING_TRIALS, 'for', v.type, v.size);
      learnQueue.push({
        type: v.type,
        size: v.size,
        keys: {up: v.upKey, down: v.downKey, left: v.leftKey, right: v.rightKey}
        });
      }
    }
  vehicleTrialQueueLearn = learnQueue;

  //vehicleTrialQueueLearn = shuffleArray(learnQueue);
  LEARN_POOL = makeMazePool(vehicleTrialQueueLearn, 'maze-learn-v1', 'L');
  learnOrder = shuffleArray([...Array(LEARN_POOL.length).keys()]);

  //Planning Phase Queue
  const planQueue = [];
  for (const v of vehicleTypes) {
    for (let i = 0; i < PLANNING_TRIALS; i++) {
      planQueue.push({
        type: v.type,
        size: v.size,
        keys: {up: v.upKey, down: v.downKey, left: v.leftKey, right: v.rightKey}
      });
    }
  }
  vehicleTrialQueuePlan = planQueue;
  //vehicleTrialQueuePlan = shuffleArray(planQueue);
  PLAN_POOL = makeMazePool(vehicleTrialQueuePlan, 'maze-plan-v1', 'P');
  planOrder = shuffleArray([...Array(PLAN_POOL.length).keys()]);

  // Debug
  console.log("Learn pool:", LEARN_POOL.map(m => m.id));
  console.log("Learn order:", learnOrder);
  console.log("Plan pool:", PLAN_POOL.map(m => m.id));
  console.log("Plan order:", planOrder);
}

// Show instructions before starting a trial
function showTrialInstructions(page = 1) {
  const container = document.querySelector('.game-container');
  container.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';

  if (page === 1) {
    overlay.innerHTML = `
      <div class="message-box" style="font-family: 'Segoe UI', sans-serif; background: #fff; color: #222; border-radius: 12px; margin: auto; padding: 36px 40px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); text-align: left;">
        <h2 style="font-size: 2rem; color: #1e3c72; margin-bottom: 20px;">Instructions</h2>
        <p style="font-size: 1.2rem; margin: 12px 0; line-height: 1.6; text-align: left;">
            In this task, you will navigate a vehicle through different mazes. In each trial you will be instructed how to move the vehicle across the maze.</p>
        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">
        Your goal is to collect as many <strong style="color: green;">rewards (💰)</strong> as possible while avoiding <strong style="color: red;">obstacles (🔥)</strong>.</p>
        
        <div style="background: #f5f5f5; border-radius: 10px; padding: 20px 24px; margin: 24px 0; text-align: left;">
          <p style="margin-bottom: 12px; font-size: 1.2rem; line-height: 1.6; text-align: left;">
          A few trials will be <strong style="color: #1e3c72;">randomly selected</strong>. These trials will determine:</p>
          
          <ul style="list-style: none; padding-left: 0; margin: 0;">
            <li style="margin-bottom: 10px; font-size: 1.1rem;">

            <strong>Your bonus payment</strong> — based on the number of <span style="color: green;">rewards (💰)</span> you collect.</li>
            <li style="margin-bottom: 10px; font-size: 1.1rem;">

            <strong>Your time in a public speaking task</strong> — based on the number of <span style="color: red;">obstacles (🔥)</span> you hit. You’ll read from a teleprompter while a live audience gives feedback in a chat. They will rate your performance and confidence.</li>
          </ul>
        </div>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">
        <strong>Some trials will have no obstacles.</strong> In those trials, you'll see a <strong style="color: black;">❌</strong>. Reaching it will end the trial with <strong style="color: green;">no penalty</strong>.</p>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">

        Try your best on each trial — you won’t know which ones will determine your outcomes!</p>
        <div style="text-align: center; margin-top: 24px;">
          <button id="next-instructions-btn" style="background-color: #1e3c72; color: white; padding: 12px 28px; font-size: 18px; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;">
            Next
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    document.getElementById('next-instructions-btn').addEventListener('click', () => {
      showTrialInstructions(2);
    });

  } else if (page === 2) {
    overlay.innerHTML = `
      <div class="message-box" style="font-family: 'Segoe UI', sans-serif; background: #fff; color: #222; border-radius: 12px; margin: auto; padding: 36px 40px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); text-align: left;">
        <h2 style="font-size: 2rem; color: #1e3c72; margin-bottom: 20px; text-align: left;">Reminder</h2>

        <p style="font-size: 1.2rem; margin: 12px 0; line-height: 1.6 ; text-align: left;">
          <strong>Some vehicles will NOT tell you how to navigate around the maze,</strong> So you can prepare for these vechicles by learning to naviage that ones that do.
        </p>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">
          Remember, a few trials will be <strong style="color: #1e3c72;">randomly selected</strong> for your bonus and a public speaking task.
        </p>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">
          The more <span style="color: red;">obstacles (🔥)</span> you hit in those trials, the <strong>longer</strong> you'll have to speak in front of a live audience, with <strong>your face and voice visible</strong>. They will rate your performance and confidence in real time.
        </p>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;">
          Make careful choices — your actions will matter!
        </p>

        <p style="font-size: 1.1rem; margin: 12px 0; text-align: left;"><strong>Good luck!</strong></p>

        <div style="text-align: center; margin-top: 24px;">
          <button id="start-trial-btn" style="background-color: #1e3c72; color: white; padding: 12px 28px; font-size: 18px; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;">
            Start
          </button>
        </div>
      </div>

    `;

    container.appendChild(overlay);

    document.getElementById('start-trial-btn').addEventListener('click', () => {
      overlay.remove();
      startTeleprompterSimulation()
    });
  }
}

function createTrial() {
  inputEnabled = true;
  // Reset score for the new trial
  if (currentPhase === 1) {
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('success-count').textContent = 0;
    document.getElementById('failure-count').textContent = 0;
  }
  const maze = LEARN_POOL[learnOrder[currentTrial - 1]];
  const vehicleData = maze.vehicleType;

  if (!maze || !maze.vehicleType) {
    console.error('Missing vehicle data in maze:', maze);
    return;
  }

  currentVehicle.type = vehicleData.type;
  currentVehicle.size = vehicleData.size;
  currentVehicle.keys = vehicleData.keys;

  //const vehicleData = vehicleTrialQueue[currentTrial - 1];
  //currentVehicle.type = vehicleData.type;
  //currentVehicle.size = vehicleData.size;
  console.log(`Learning Phase - Vehicle: ${currentVehicle.type}, Size: ${currentVehicle.size}`);
  //currentVehicle.keys = vehicleData.keys;

  // Select color
  const key = `${currentVehicle.type}_${currentVehicle.size}`;
  const queue = vehicleColorQueues[key];
  const colorIndex = Math.floor((currentTrial - 1) / 4) % 20;
  // Get a color and assign to vehicle
  currentVehicle.color = queue.shift();

  // if the queue runs out (all 20 colors used), re-shuffle
  if (queue.length === 0) {
    vehicleColorQueues[key] = shuffleArray(COLOR_PALETTE);
  }

  // Reset maze and place vehicle at random position
  loadMazeFrom(LEARN_POOL, learnOrder[currentTrial - 1]);

  // Update vehicle info display
  updateVehicleInfo();

  renderVehiclePreview();
  // Start trial timer and record data
  startTrialTimer();
}

function vehicleAllowsObstacles(vehicle) {
  return (vehicle.type.startsWith('truck') || vehicle.type === 'new_truck');
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
              cellEl.innerHTML = '🔥'; 
          } else if (gridWorld[y][x] === 'reward') {
              cellEl.classList.add('reward');
              cellEl.innerHTML = '💰';
          } else if (gridWorld[y][x] === 'terminator') {
              cellEl.classList.add('terminator');
              cellEl.innerHTML = '❌'; 
          }
          
          // Add vehicle if this is vehicle position
          if (x === currentVehicle.x && y === currentVehicle.y) {
              const vehicle = document.createElement('div');
              vehicle.className = 'vehicle-image';
              loadColoredSvg(`/vehicles/${currentVehicle.type}.svg`, currentVehicle.color)
                .then(coloredUrl => {
                  vehicle.style.backgroundImage = `url(${coloredUrl})`;
                });

              vehicle.style.backgroundSize = 'contain';
              vehicle.style.backgroundRepeat = 'no-repeat';
              vehicle.style.backgroundPosition = 'center';
              vehicle.style.filter = `drop-shadow(0 0 0 ${currentVehicle.color}) saturate(200%) brightness(80%)`;
              vehicle.style.position = 'absolute';
              vehicle.style.top = 0
              vehicle.style.right = 0
              vehicle.style.top = '50%';
              vehicle.style.left = '50%';
              vehicle.style.transform = 'translate(-50%, -50%)';

            // Set size depending on small or big
            if (currentVehicle.size === 'small') {
                vehicle.style.width = '50%';
                vehicle.style.height = '50%';
            } else if (currentVehicle.size === 'medium') {
                vehicle.style.width = '75%';
                vehicle.style.height = '75%';
            } else {
                vehicle.style.width = '100%';
                vehicle.style.height = '100%';
            }
              cellEl.appendChild(vehicle);
          }
          gridEl.appendChild(cellEl);
      }
  }
        }

function showWrongKeyAlert() {
  const wrongKeyAlert = document.getElementById('wrong-key-alert');
  if (!wrongKeyAlert) {
    console.error("Wrong key alert element not found!");
    return;
  }
  wrongKeyAlert.style.display = 'block';
  wrongKeyAlert.style.opacity = '1';
  setTimeout(() => {
    wrongKeyAlert.style.opacity = '0';
    setTimeout(() => {
      wrongKeyAlert.style.display = 'none';
    }, 300);
  }, 1000);
}

// Update vehicle info display
function updateVehicleInfo() {
  const movementInstructionsEl = document.getElementById('movement-instructions');
  const planningControlsEl = document.getElementById('planning-controls');
  
  if (!movementInstructionsEl || !planningControlsEl) {
      console.error("Required elements not found!");
      return;
  }
  
  if (currentPhase === 1 || currentPhase === 0) {
    movementInstructionsEl.innerHTML = `
  <h3 class="keys-title">Keys</h3>
  <div class="key-diamond">
    <div class="key up">
      <kbd>${currentVehicle.keys.up.toUpperCase()}</kbd>
      <span class="key-name">Up</span>
    </div>

    <div class="key left">
      <kbd>${currentVehicle.keys.left.toUpperCase()}</kbd>
      <span class="key-name">Left</span>
    </div>

    <div class="key right">
      <kbd>${currentVehicle.keys.right.toUpperCase()}</kbd>
      <span class="key-name">Right</span>
    </div>

    <div class="key down">
      <kbd>${currentVehicle.keys.down.toUpperCase()}</kbd>
      <span class="key-name">Down</span>
    </div>
  </div>
`;

    movementInstructionsEl.style.display = 'block';
    planningControlsEl.style.display = 'none';
  
  } else if (currentPhase === 2) {
    // Phase 2 (planning) - hide movement, show planning input
    movementInstructionsEl.style.display = 'none';
    planningControlsEl.style.display = 'block';
  
    const submitButton = document.getElementById('submit-plan');
    const moveSequenceInput = document.getElementById('move-sequence');

    if (submitButton && !submitButton.listenerAdded) {
      submitButton.addEventListener('click', submitPlan);
      submitButton.listenerAdded = true; // Prevent multiple listeners
    }

    if (moveSequenceInput && !moveSequenceInput.listenerAdded) {
    moveSequenceInput.listenerAdded = true;

    moveSequenceInput.addEventListener('keydown', function(event) {
    const currentTrialData = getCurrentTrialData();

    // Initialize input log if not present
    if (!currentTrialData.rawInputKeys) {
      currentTrialData.rawInputKeys = [];
    }

    // Record the raw key
    currentTrialData.rawInputKeys.push(event.key);

    // Prevent typing more than 4 characters unless it's a control key
    const isControlKey = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(event.key);

    // Block input if already 4 characters, unless it's a control key or Enter
    if (
      !isControlKey &&
      event.key.length === 1 &&  // only block actual characters
      moveSequenceInput.value.length >= 4 &&
      event.key !== 'Enter'
    ) {
      event.preventDefault();} 

    if (event.key === 'Enter') {
        event.preventDefault();
        submitPlan();
    }
  });
  moveSequenceInput.listenerAdded = true;
}
  }
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
  const currentTrialData = getCurrentTrialData();
  if (!currentTrialData) return;
  
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
  const currentTrialData = getCurrentTrialData(); 
  if (!currentTrialData) return;
  if (!currentTrialData.hits) currentTrialData.hits = [];

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
      let failCount = parseInt(document.getElementById('failure-count').textContent, 10);
      document.getElementById('failure-count').textContent = failCount + 1;

      document.getElementById('score').textContent = score;
      
      // Record obstacle hit
      //const currentTrialData = getCurrentTrialData();
      //if (!currentTrialData) return;
      
      //if (!currentTrialData.hits) currentTrialData.hits = [];
      currentTrialData.hits.push('obstacle'); 
      currentTrialData.obstaclesHit++;
  }
  
  // Check for reward collision
  const collectedReward = rewards.findIndex(rew => rew.x === currentVehicle.x && rew.y === currentVehicle.y);
  
  if (collectedReward !== -1) {
      // Remove reward
      rewards.splice(collectedReward, 1);
      gridWorld[currentVehicle.y][currentVehicle.x] = 'empty';
      
      // Increase score
      score += 10;
      let successCount = parseInt(document.getElementById('success-count').textContent, 10);
      document.getElementById('success-count').textContent = successCount + 1;

      document.getElementById('score').textContent = score;
      
      // Record reward collection
      const currentTrialData = getCurrentTrialData();
      if (!currentTrialData) return;
      
      //if (!currentTrialData.hits) currentTrialData.hits = [];
      currentTrialData.hits.push('reward');
      currentTrialData.rewardsCollected++;
  }
  if (gridWorld[currentVehicle.y][currentVehicle.x] === 'terminator') {
    console.log("Hit terminator tile. Ending trial.");
    currentTrialData.hits.push('terminator');

    setTimeout(endTrial, 0);  //let the last key push finish

  }
  // Check if all rewards are collected or no more moves possible
  if (rewards.length === 0 || (obstacles.length === 0 && rewards.length === 0)) {
    setTimeout(endTrial, 0);  // let the last key push finish
  }
  
  if (currentPhase === 0 && (rewards.length === 0)) {
    setTimeout(endPracticeTrial, 0);  // let the last key push finish
  }
}

// End current trial
function endTrial() {
  // Record trial end data
  const currentTrialData = getCurrentTrialData();
  if (!currentTrialData) return;
  
  currentTrialData.endTime = Date.now();
  currentTrialData.totalTime = currentTrialData.endTime - currentTrialData.startTime;
  currentTrialData.endPosition = { x: currentVehicle.x, y: currentVehicle.y };

  console.log(`Hits during trial ${currentTrial}:`);
  console.log(currentTrialData.hits);
  
  if (currentPhase === 1) {
    const maze = LEARN_POOL[learnOrder[currentTrial - 1]];

    //const maze = LEARN_POOL[learnOrder[currentTrial - 1]];
    
    const optimal = maze.optimalDirections;
    const actual = currentTrialData.routeTaken || [];
  
    let matchCount = 0;
    for (let i = 0; i < optimal.length; i++) {
      if (actual[i] === optimal[i]) matchCount++;
    }
  
    const accuracy = matchCount / optimal.length;
    console.log(`Optimal: ${optimal.join(', ')}`);
    console.log(`Player:  ${actual.join(', ')}`);  
    currentTrialData.matchAccuracy = accuracy;
  }
  
  // Show trial results
  showTrialResults();
}

// Show results of current trial and transition to next
function showTrialResults() {
  inputEnabled = false;
  console.log('trial ended');

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
    if (currentPhase === 0) return; // Block extra trials in practice
    continueToNextTrial();
    // fade out after new trial
    setTimeout(() => {
      fadeOverlay.style.opacity = 0;
      // remove overlay after fadeout ends
      setTimeout(() => {
        fadeOverlay.remove();
        inputEnabled = true;
      }, 500);
    } ,100);
  }, 500);
}
  
// Continue to the next trial or phase
function continueToNextTrial() {
  if (currentPhase === 0) {
    return;
  }
  // Remove the overlay
  const overlay = document.querySelector('.message-overlay');
  if (overlay) {
      overlay.remove();
  }
    
  // Check if phase is complete
  if (currentPhase === 1 && currentTrial >= vehicleTrialQueueLearn.length) {
      startPlanningPhase();
  } else if (currentPhase === 2 && currentTrial >= vehicleTrialQueuePlan.length) {
      console.log("Ending game");
      endGame();
  } else {
      // Start next trial
      currentTrial++;
  if (currentPhase === 2) {
    createPlanningTrial();
  } else {
    //Phase 1 
    createTrial();
  }
}
}

// Start the planning phase (Phase 2)
function startPlanningPhase() {
  currentPhase = 2;
  currentTrial = 1;

  const allVehicleTypes = ['car_small', 'car_medium', 'car_big', 'truck_small', 'truck_medium', 'truck_big', 'new_truck_small', 'new_truck_big'];
  
  allVehicleTypes.forEach(key => {
    vehicleColorQueues[key] = shuffleArray(COLOR_PALETTE.slice());
  });
  
  // hiding score bar
  const headerBar = document.querySelector('.header-bar');
  if (headerBar) {
    headerBar.style.display = 'none';
  }
 
  // Convert grid to planning mode
  convertToPlanningMode();
  // Reset game data for phase 2
  gameData.phase2 = [];
  //generateVehicleQueue();
  // Show instructions for first planning trial
  showPlanningInstructions();
  };

// Show planning phase instructions
function showPlanningInstructions() {
  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';

  overlay.innerHTML = `
  <div class="message-box" style="font-family: 'Segoe UI', sans-serif; font-size: 17px; color: #333; line-height: 1.6; margin: 0 auto;">
      <h2 style="color: #1e3c72; margin-bottom: 16px; text-align: left;">Instructions</h2>

      <p style="margin-bottom: 16px; text-align: left;">
          Now, it's time to use what you've learned! In this phase, you will <strong>plan your moves in advance</strong> to collect as many  <strong style="color: green;">rewards (💰)</strong> as possible while avoiding <strong style="color: red;">obstacles (🔥)</strong>.
      </p>

      <p style="margin-bottom: 16px; text-align: left;">
          You will <strong>not see feedback.</strong> You'll enter a sequence of <strong>4 moves</strong>, and the game will execute them. You will not see how your vehicle moves.
      </p>

      <div style="background: #f5f5f5; border-radius: 8px; padding: 12px 16px; text-align: left; margin-bottom: 16px; font-family: 'Segoe UI', sans-serif; font-size: 18px;">
        <p style="margin: 0 0 8px 0; text-align: left; font-weight: bold;">Just like before, a few trials will be <strong style="color: #1e3c72;">randomly selected</strong> to determine:</p>
        <ul style="list-style: none; padding-left: 0; text-align: left; margin: 0;">
          <li style="margin-bottom: 8px; text-align: left;">
            <strong>Your bonus payment</strong> — based on the number of <span style="color: green;">rewards (💰)</span> you collected.
          </li>
          <li>
            <strong>Your time in a public speaking task</strong> — based on the number of <span style="color: red;">obstacles (🔥)</span>. You will read from a teleprompter while a live audience gives feedback in a real-time chat. They will rate your performance and confidence.
          </li>
        </ul>
      </div>

      <p style="font-weight: bold; margin-bottom: 12px; text-align: left;">
          Plan carefully and think about what you learned from the earlier mazes.
      </p>

      <p style="margin-bottom: 20px; text-align: left;">
          Good luck! When you're ready, click below to begin.
      </p>

      <button id="start-trial-btn" style="background-color: #1e3c72; color: white; padding: 12px 24px; font-size: 18px; border: none; border-radius: 6px; cursor: pointer;">
          Start
      </button>
  </div>
  `;

  document.querySelector('.game-container').appendChild(overlay);

  const startButton = document.getElementById('start-trial-btn');
  startButton.addEventListener('click', function() {
      overlay.remove();
      createPlanningTrial();
  });
}

// Convert the grid to planning mode
function convertToPlanningMode() {  
  updateVehicleInfo();
}

// Create a planning trial
function createPlanningTrial() {
  // Similar to createTrial but for planning phase
  const maze = PLAN_POOL[planOrder[currentTrial - 1]];
  if (!maze || !maze.vehicleType) {
  console.error("Missing maze or vehicleType in PLAN_POOL:", maze);
  return;
}

  const vehicleData = maze.vehicleType;

  //const vehicleData = vehicleTrialQueue[currentTrial - 1];
  const key = `${vehicleData.type}_${vehicleData.size}`;
  let queue = vehicleColorQueues[key];

  if (!queue || queue.length === 0) {
    queue = shuffleArray(COLOR_PALETTE.slice());
    vehicleColorQueues[key] = queue;
  }

  const color = queue.shift();

  currentVehicle = {
    type: vehicleData.type,
    size: vehicleData.size,
    keys: vehicleData.keys,
    color: color,
    x: 0,
    y: 0
  };
  
  loadMazeFrom(PLAN_POOL, (planOrder[currentTrial - 1]));

  // Update vehicle info display
  updateVehicleInfo();
  console.log(`Planning Phase - Vehicle: ${currentVehicle.type}, Size: ${currentVehicle.size}`);
  renderVehiclePreview(); 

  // Start trial timer
  startTrialTimer();
  
  // Clear move sequence input
  const moveSequenceInput = document.getElementById('move-sequence');
  if (moveSequenceInput) {
      moveSequenceInput.value = '';
  }
}

function getCurrentTrialData() {
  const trialIndex = currentTrial - 1;
  switch (currentPhase) {
      case 0: return gameData.practice[0]; // single practice trial
      case 1: return gameData.phase1[trialIndex];
      case 2: return gameData.phase2[trialIndex];
      default: return null;
  }
}

function submitPlan() {
  console.log("Submitting plan");
  
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

  // Translate player's input sequence to directions
  const playerDirections = [];

  for (let char of moveSequence) {
    if (char === currentVehicle.keys.up) playerDirections.push('up');
    else if (char === currentVehicle.keys.down) playerDirections.push('down');
    else if (char === currentVehicle.keys.left) playerDirections.push('left');
    else if (char === currentVehicle.keys.right) playerDirections.push('right');
    else playerDirections.push('invalid');
  }

  // Save to trialData
  currentTrialData.inputSequence = moveSequence;
  currentTrialData.decodedDirections = playerDirections;

  // Also get the optimal directions from the maze used in this trial
  //const mazeused =loadMazeFrom(PLAN_POOL, planOrder, currentTrial - 1);
  const mazeused = PLAN_POOL[planOrder[currentTrial - 1]];
  console.log(mazeused);
  currentTrialData.mazeId = mazeused.id;
  currentTrialData.planOrderIndex = planOrder[currentTrial - 1]; // index used
  currentTrialData.optimalDirections = mazeused.optimalDirections;

  let simulatedX = mazeused.start.x;
  let simulatedY = mazeused.start.y;
  const hitsDuringPlan = [];

  let tile;
  for (const direction of playerDirections) {

    let nextX = simulatedX;
    let nextY = simulatedY;

    // Move according to direction
    if (direction === 'up') nextY--;
    else if (direction === 'down') nextY++;
    else if (direction === 'left') nextX--;
    else if (direction === 'right') nextX++;

    // Check bounds
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      hitsDuringPlan.push(`out_of_bounds_${direction}`);
      continue;
    }

    simulatedX = nextX;
    simulatedY = nextY;

    tile = mazeused.grid[simulatedY][simulatedX];
    console.log(`At (${simulatedY}, ${simulatedX}): tile =`, tile);
    if (tile === 'reward') {
        hitsDuringPlan.push('reward');
        console.log('hit reward');
        mazeused.grid[simulatedY][simulatedX] = 'empty'; // mark as collected

    } else if (tile === 'obstacle') {
        hitsDuringPlan.push('obstacle');
        console.log('hit obstacle');
    } else if (tile === 'terminator') {
        hitsDuringPlan.push('terminator');
        console.log('hit terminator ');
        break; // stop simulating further moves after hitting terminator
    } else {
        hitsDuringPlan.push('empty');
    }

    //tile = mazeused.grid[simulatedY][simulatedX];
    }

  // Save to trial data
  currentTrialData.hits = hitsDuringPlan;

  // Debug print
  console.log("Optimal:", mazeused.optimalDirections);
  console.log("Player: ", playerDirections);
  console.log("Simulated hits:", hitsDuringPlan);

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
  currentTrialData.inputSequence = moveSequence;
  currentTrialData.vehicleInfo = {
    type: currentVehicle.type,
    size: currentVehicle.size,
    trialNumber: currentTrial
  };

  // Debug print
  console.log('Submitted Plan Summary:', {
    inputSequence: currentTrialData.inputSequence,
    rawInputKeys: currentTrialData.rawInputKeys,
    vehicle: currentTrialData.vehicleInfo
  });

  // Clear the input field
  moveSequenceInput.value = '';

  // End the trial
  endTrial();
}
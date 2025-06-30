//game.js
import * as config from './config.js';
import * as teleprompter from './teleprompter.js'
import { gameState } from './gameState.js';
import * as vehicles from './vehicle.js';
import * as practice from './practiceTrial.js'
import { db } from './firebaseconfig.js';
import {collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

function rInt(rng, n) { return Math.floor(rng() * n); }

//maze generator
function buildMaze(rng, vehicleType) {
  const g = Array.from({length: config.GRID_SIZE}, _=>Array(config.GRID_SIZE).fill('empty'));
  const start = { x: rInt(rng, config.GRID_SIZE), y: rInt(rng, config.GRID_SIZE) };

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
        nx >= 0 && nx < config.GRID_SIZE &&
        ny >= 0 && ny < config.GRID_SIZE &&
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
      const ox = rInt(rng, config.GRID_SIZE);
      const oy = rInt(rng, config.GRID_SIZE);
      if (g[oy][ox] !== 'empty') continue;
      if (ox === start.x && oy === start.y) continue;

      g[oy][ox] = 'obstacle';
      obstacles.push({ x: ox, y: oy }); 
      placed++;
    }

  } else if (isCar) {
    let placed = false;
    while (!placed) {
      const tx = rInt(rng, config.GRID_SIZE);
      const ty = rInt(rng, config.GRID_SIZE);
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

function loadMazeFrom(pool, idx){
  const m = pool[idx];
  if (!m) {
    console.error("Invalid maze lookup:", { idx, pool, poolLength: pool.length });
    throw new Error("Maze not found in pool");
  }
  console.log(`Loaded maze ${m.id}. phase ${gameState.currentPhase}, (trial ${gameState.currentTrial})`);

  gameState.gridWorld = m.grid.map(r=>[...r]);
  gameState.rewards   = m.rewards.map(r=>({...r}));
  gameState.obstacles = m.obstacles ? m.obstacles.map(o => ({ ...o })) : [];
  gameState.terminator = m.terminator ? { ...m.terminator } : null;
  gameState.currentVehicle.x = m.start.x;
  gameState.currentVehicle.y = m.start.y;
  gameState.startPosition = { x: gameState.currentVehicle.x, y: gameState.currentVehicle.y };
  gameState.mazeId = m.id

  console.log("Gridworld" , gameState.gridWorld);
  gameState.initialGrid = structuredClone(gameState.gridWorld)
  console.log(`Optimal route for ${m.id}: ${m.optimalDirections.join(', ')}`);
  gameState.optimalDirections = m.optimalDirections;
  console.log("starting position:", gameState.startPosition);
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
  car_small: shuffleArray(config.COLOR_PALETTE),
  car_big: shuffleArray(config.COLOR_PALETTE),
  car_medium: shuffleArray(config.COLOR_PALETTE),
  truck_small: shuffleArray(config.COLOR_PALETTE),
  truck_big: shuffleArray(config.COLOR_PALETTE),
  truck_medium: shuffleArray(config.COLOR_PALETTE),
  new_truck_small:shuffleArray(config.COLOR_PALETTE),
  new_truck_big: shuffleArray(config.COLOR_PALETTE)
};

function endGame() {
  console.log('Game completed');
  
  // Convert the UI to show game completion
  const container = document.querySelector('.game-container');
  
  // Save completion time
  const completionTime = Date.now();
  gameState.gameData.totalGameTime = completionTime - gameState.gameStartTime;
  
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

function flattenGridWorldToWords(grid) {
  if (!Array.isArray(grid) || !Array.isArray(grid[0])) return grid;

  return grid[0].flat();
}

function normaliseGameData(data){
  const Copy = structuredClone(data); // Safe deep copy
  const trials = [];
  const phaseId = { practice: 0, phase1: 1, phase2: 2 };

  const tidyActs = arr =>
    Array.isArray(arr)
      ? arr.map(e =>
          Array.isArray(e) && e.length === 4
            ? { key: e[0], direction: e[1], rt: e[2], time: e[3] }
            : e)
      : arr;

  for (const key of ["practice", "phase1", "phase2"]) {
    (Copy[key] || []).forEach(trial => {
      if (trial.gridWorld) trial.gridWorld = flattenGridWorldToWords(trial.gridWorld);
      if (trial.actions)   trial.actions   = tidyActs(trial.actions);
      if (trial.RT_L)      trial.RT_L      = tidyActs(trial.RT_L);
      if (trial.RT_P)      trial.RT_P      = tidyActs(trial.RT_P);
      trials.push({ phase: phaseId[key], ...trial });
    });
  }

  return {
    meta: { totalGameTime: Copy.totalGameTime ?? null },
    trials
  };
}

async function saveGameData() {
  console.log('Saving game data:', (gameState.gameData));
  const sanitizedData = normaliseGameData(gameState.gameData);
  const timestamp = new Date().toISOString();

  console.log('Saving game data:', sanitizedData);
  

  const { prolificId, studyId, sessionId } = getProlificParams();
  const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  sanitizedData.meta.sessionId = finalSessionId;
  sanitizedData.meta.timestamp = timestamp;
  const gameDataRef = doc(collection(db, 'gameSessions'), finalSessionId);

  const sessionData = {
  prolificId: prolificId || null,
  studyId: studyId || null,
  sessionId: finalSessionId,
  startTime: Date.now(),
  gameData: normaliseGameData(gameState.gameData)
};
 
try {
  await setDoc(gameDataRef, sessionData);       // <-- await the network round-trip
  console.log(`saved game session: ${finalSessionId}`);

  // *only* after Firestore says “OK” do we redirect
  window.location.href =
    "https://app.prolific.com/submissions/complete?cc=C1C88DFD";
} catch (err) {
  console.error('Error saving game data:', err);
  alert("We couldn’t save your data automatically. " +
        "Please take a screenshot and contact the researcher.");

//  setDoc(gameDataRef, sessionData) 
//  .then(() => console.log (`saved game session: ${finalSessionId}`))
//   .catch((error) => {
//     console.error('Error saving game data:', error);
//   });

  // window.location.href =
  //    "https://app.prolific.com/submissions/complete?cc=C1C88DFD"
} }

function getProlificParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    prolificId: params.get('PROLIFIC_PID'),
    studyId: params.get('STUDY_ID'),
    sessionId: params.get('SESSION_ID')
  };
}

export function initializeGame() {
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
  document.documentElement.style.setProperty('--grid-size', config.GRID_SIZE);

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

export function createGameUI() {
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
    <div id="controls-info">
      <div id="movement-instructions"></div>
       <div id="planning-controls" style="display: none;">
        <p><strong>Plan your 4 moves!</strong></p>

        <div class="planning-input" id="slots">
          <input class="move-box" maxlength="1" data-idx="0">
          <input class="move-box" maxlength="1" data-idx="1">
          <input class="move-box" maxlength="1" data-idx="2">
          <input class="move-box" maxlength="1" data-idx="3">

        </div>

        <button id="submit-plan">Submit</button>
        <input id="move-sequence"  maxlength="4" autocomplete="off" style="opacity:0;position:absolute;" />
        
      </div>
    </div>

      <div class="grid-wrapper">
          <div class="game-grid-inner-container">
              <div id="game-grid"></div>
          </div>
      </div>
      <div id="vehicle-display" class="vehicle-display"></div>
  </div>
  </div> 
`;
}

function setupKeyboardListeners() {
  document.addEventListener('keydown', function(event) {
      // Only handle key presses during the active learning phase
      if (!gameState.inputEnabled || gameState.currentPhase !== 1 && gameState.currentPhase !== 0) return;
      
      const key = event.key.toLowerCase();
      const currentTrialData = getCurrentTrialData();
      
      if (!currentTrialData.routeTaken) currentTrialData.routeTaken = [];
      if (!currentTrialData.actions) currentTrialData.actions = [];
      

      const now = Date.now();
      const timeSinceStart = now - currentTrialData.startTime;

      let direction = null;
      if (key === gameState.currentVehicle.keys.up) direction = 'up';
      else if (key === gameState.currentVehicle.keys.down) direction = 'down';
      else if (key === gameState.currentVehicle.keys.left) direction = 'left';
      else if (key === gameState.currentVehicle.keys.right) direction = 'right';
      
      if (direction) {
        let rt;

       if (!currentTrialData.lastValidKeyTime) {
        // first valid key
        rt = timeSinceStart;
       } else {
       rt = now - currentTrialData.lastValidKeyTime;
      }
      currentTrialData.lastValidKeyTime = now;

      currentTrialData.routeTaken.push(direction);
      currentTrialData.actions.push(
        [key,
        direction,
        rt,
        timeSinceStart
      ]);
      moveVehicle(direction);

      } else {
        showWrongKeyAlert();
      }

  });
}

export function startLearningPhase() {
  gameState.currentPhase = 1;
  gameState.currentTrial= 1;
  gameState.score = 0;
  
  if (!gameState.gameStartTime) gameState.gameStartTime = Date.now();

  // update score
  document.getElementById('score').textContent = gameState.score;
  // Reset game data
  gameState.gameData.phase1 = [];
  generateVehicleQueue();
}

function generateVehicleQueue() {
  const vehicleTypes = Object.values(config.VEHICLE_TYPES);
  console.log('Phase:', gameState.currentPhase, 'Vehicles:', vehicleTypes.length);
  //Learning Phase Queue
  const learnQueue = [];
  for (const v of vehicleTypes) {
    if (v.type === 'new_truck' || v.size === 'medium'){
      console.log('Skipping', v.type, v.size);
      continue;
    } 
    for (let i = 0; i < config.LEARNING_TRIALS; i++) {
    console.log('Using reps', config.LEARNING_TRIALS, 'for', v.type, v.size);
      learnQueue.push({
        type: v.type,
        size: v.size,
        keys: {up: v.upKey, down: v.downKey, left: v.leftKey, right: v.rightKey}
        });
      }
    }
  gameState.vehicleTrialQueueLearn = learnQueue;
  //console.log("vehicleTrialQueueLearn:", gameState.vehicleTrialQueueLearn);

  gameState.LEARN_POOL = makeMazePool(gameState.vehicleTrialQueueLearn, 'maze-learn-v1', 'L');
  gameState.learnOrder = shuffleArray([...Array(gameState.LEARN_POOL.length).keys()]);

  //Planning Phase Queue
  const planQueue = [];
  for (const v of vehicleTypes) {
    for (let i = 0; i < config.PLANNING_TRIALS; i++) {
      planQueue.push({
        type: v.type,
        size: v.size,
        keys: {up: v.upKey, down: v.downKey, left: v.leftKey, right: v.rightKey}
      });
    }
  }
  gameState.vehicleTrialQueuePlan = planQueue;
  gameState.PLAN_POOL = makeMazePool(gameState.vehicleTrialQueuePlan, 'maze-plan-v1', 'P');
  gameState.planOrder = shuffleArray([...Array(gameState.PLAN_POOL.length).keys()]);

  console.log("Learn pool:", gameState.LEARN_POOL.map(m => m.id));
  console.log("Learn order:", gameState.learnOrder);
  console.log("Plan pool:", gameState.PLAN_POOL.map(m => m.id));
  console.log("Plan order:", gameState.planOrder);
}

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
          <strong>Some vehicles will NOT tell you how to navigate around the maze,</strong> So you can prepare to use these vechicles by learning to navigate the vehicles you see in the learning phase. 
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
      teleprompter.startTeleprompterSimulation()
      //createGameUI();
      //practice.startPracticeTrial();


    });
  }
}

export function createTrial() {
  gameState.inputEnabled = true;
  // Reset score for the new trial
  if (gameState.currentPhase === 1) {
    gameState.score = 0;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('success-count').textContent = 0;
    document.getElementById('failure-count').textContent = 0;
  }
  const maze = gameState.LEARN_POOL[gameState.learnOrder[gameState.currentTrial- 1]];
  const vehicleData = maze.vehicleType;

  if (!maze || !maze.vehicleType) {
    console.error('Missing vehicle data in maze:', maze);
    return;
  }

  gameState.currentVehicle.type = vehicleData.type;
  gameState.currentVehicle.size = vehicleData.size;
  gameState.currentVehicle.keys = vehicleData.keys;
  console.log(`Learning Phase - Vehicle: ${gameState.currentVehicle.type}, Size: ${gameState.currentVehicle.size}`);

  // Select color
  const key = `${gameState.currentVehicle.type}_${gameState.currentVehicle.size}`;
  const queue = vehicleColorQueues[key];
  const colorIndex = Math.floor((gameState.currentTrial- 1) / 4) % 20;
  // Get a color and assign to vehicle
  gameState.currentVehicle.color = queue.shift();

  // if the queue runs out (all 20 colors used), re-shuffle
  if (queue.length === 0) {
    vehicleColorQueues[key] = shuffleArray(config.COLOR_PALETTE);
  }

  // Reset maze
  loadMazeFrom(gameState.LEARN_POOL, gameState.learnOrder[gameState.currentTrial- 1]);

  // Update vehicle info display
  updateVehicleInfo();
  vehicles.renderVehiclePreview();
  // Start trial timer and record data
  startTrialTimer();
}

function vehicleAllowsObstacles(vehicle) {
  return (vehicle.type.startsWith('truck') || vehicle.type === 'new_truck');}

export function renderGrid() {
  const gridEl = document.getElementById('game-grid');
  // Clear existing grid
  gridEl.innerHTML = '';
  
  // Create cells
  for (let y = 0; y < config.GRID_SIZE; y++) {
      for (let x = 0; x < config.GRID_SIZE; x++) {
          const cellEl = document.createElement('div');
          cellEl.className = 'grid-cell';
          cellEl.dataset.x = x;
          cellEl.dataset.y = y;
          
          // Add cell type class
          if (gameState.gridWorld[y][x] === 'obstacle') {
              cellEl.classList.add('obstacle');
              cellEl.innerHTML = '🔥'; 
          } else if (gameState.gridWorld[y][x] === 'reward') {
              cellEl.classList.add('reward');
              cellEl.innerHTML = '💰';
          } else if (gameState.gridWorld[y][x] === 'terminator') {
              cellEl.classList.add('terminator');
              cellEl.innerHTML = '✖';
              // cellEl.innerHTML = '✖️'; 
              // cellEl.style.color = '#000';
          }
          
          // Add vehicle if this is vehicle position
          if (x === gameState.currentVehicle.x && y === gameState.currentVehicle.y) {
              const vehicle = document.createElement('div');
              vehicle.className = 'vehicle-image';
              vehicles.loadColoredSvg(`/vehicles/${gameState.currentVehicle.type}.svg`, gameState.currentVehicle.color)
                .then(coloredUrl => {
                  vehicle.style.backgroundImage = `url(${coloredUrl})`;
                });
              vehicle.style.backgroundSize = 'contain';
              vehicle.style.backgroundRepeat = 'no-repeat';
              vehicle.style.backgroundPosition = 'center';
              vehicle.style.filter = `drop-shadow(0 0 0 ${gameState.currentVehicle.color}) saturate(200%) brightness(80%)`;
              vehicle.style.position = 'absolute';
              vehicle.style.top = 0
              vehicle.style.right = 0
              vehicle.style.top = '50%';
              vehicle.style.left = '50%';
              vehicle.style.transform = 'translate(-50%, -50%)';

            // Set size depending on small or big
            if (gameState.currentVehicle.size === 'small') {
                vehicle.style.width = '50%';
                vehicle.style.height = '50%';
            } else if (gameState.currentVehicle.size === 'medium') {
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

export function updateVehicleInfo() {
  const movementInstructionsEl = document.getElementById('movement-instructions');
  const planningControlsEl = document.getElementById('planning-controls');

  if (!movementInstructionsEl || !planningControlsEl) {
    console.error("Required elements not found!");
    return;
  }

  if (gameState.currentPhase === 1 || gameState.currentPhase === 0) {
    movementInstructionsEl.innerHTML = `
  <h3 class="keys-title">Keys</h3>
  <div class="key-diamond">
    <div class="key up">
      <kbd>${gameState.currentVehicle.keys.up.toUpperCase()}</kbd>
      <span class="key-name">Up</span>
    </div>

    <div class="key left">
      <kbd>${gameState.currentVehicle.keys.left.toUpperCase()}</kbd>
      <span class="key-name">Left</span>
    </div>

    <div class="key right">
      <kbd>${gameState.currentVehicle.keys.right.toUpperCase()}</kbd>
      <span class="key-name">Right</span>
    </div>

    <div class="key down">
      <kbd>${gameState.currentVehicle.keys.down.toUpperCase()}</kbd>
      <span class="key-name">Down</span>
    </div>
  </div>
`;

    movementInstructionsEl.style.display = 'flex';
    planningControlsEl.style.display = 'none';
  
  } else if (gameState.currentPhase === 2) {
    // Phase 2 (planning) - hide movement, show planning input
    movementInstructionsEl.style.display = 'none';
    planningControlsEl.style.display = 'block';

  if (!planningControlsEl.initialised) {
    initPlanningInput();
    planningControlsEl.initialised = true;
  }
  }
}
  
function initPlanningInput () {
  const boxes = document.querySelectorAll('.move-box');
  const btn = document.getElementById('submit-plan');
  
  boxes.forEach((box, idx) => {
    box.addEventListener('keydown', (e) => {
    const trialIndex = gameState.currentTrial - 1;
      if (!gameState.gameData.phase2[trialIndex]) {
      gameState.gameData.phase2[trialIndex] = {};
    }
    const currentTrialData = gameState.gameData.phase2[trialIndex]; // BY REF!
  
    if (!currentTrialData.rawInputKeys) {
      currentTrialData.rawInputKeys = [];
    }
      currentTrialData.rawInputKeys.push(e.key);

      const isLetter = /^[a-zA-Z]$/.test(e.key);
      const isBackspace = e.key === 'Backspace';
      const isEnter = e.key === 'Enter';

      if (isLetter) {
        // Allow letter, but defer to 'input' handler
        return;
      }

      if (isBackspace) {
        if (!box.value && idx > 0) {
          boxes[idx - 1].focus();
        }
        return;
      }

      if (isEnter) {
        e.preventDefault();
        if (!btn.disabled) btn.click();
        return;
      }

      // Block anything else
      e.preventDefault();
    });

    box.addEventListener('input', () => {
      // Always keep only a single uppercase letter
      box.value = box.value.slice(0, 1).toUpperCase();

      if (box.value && idx < 3) {
        boxes[idx + 1].focus();
      }

      // Enable submit button only if all boxes are filled
      const allFilled = [...boxes].every(b => b.value.length === 1);
      btn.disabled = !allFilled;
    });
  });

  btn.addEventListener('click', () => {
    const sequence = [...boxes].map(b => b.value.toLowerCase()).join('');
    const trialIndex = gameState.currentTrial - 1;
    const currentTrialData = gameState.gameData.phase2[trialIndex];
    submitPlan(sequence, currentTrialData.rawInputKeys );
  });
}

function startTrialTimer() {
  const trialStartTime = Date.now();
  
  // Store initial trial data
  const trialData = {
      trial: gameState.currentTrial,
      phase: gameState.currentPhase,
      vehicleType: gameState.currentVehicle.type,
      vehicleSize: gameState.currentVehicle.size,
      vehicleColor: gameState.currentVehicle.color,
      startPosition: { x: gameState.currentVehicle.x, y: gameState.currentVehicle.y },
      obstacles: [...gameState.obstacles],
      rewards: [...gameState.rewards],
      terminator: gameState.terminator,
      gridWorld: [gameState.initialGrid],
      startTime: trialStartTime,
      moves: [],
      rewardsCollected: 0,
      obstaclesHit: 0,
      endTime: null,
      mazeId: gameState.mazeId,
      optimalRoute: gameState.optimalDirections, 
      actions: [],
  
  };
  if (gameState.currentPhase === 1) {
      gameState.gameData.phase1.push(trialData);
  } else {
      gameState.gameData.phase2.push(trialData);
  }
}

function moveVehicle(direction) {
  // Store old position
  const oldPosition = { x: gameState.currentVehicle.x, y: gameState.currentVehicle.y };
  // Calculate new position
  let newPosition = { x: gameState.currentVehicle.x, y: gameState.currentVehicle.y };
  
  switch (direction) {
      case 'up':
          newPosition.y = Math.max(0, gameState.currentVehicle.y - 1);
          break;
      case 'down':
          newPosition.y = Math.min(config.GRID_SIZE - 1, gameState.currentVehicle.y + 1);
          break;
      case 'left':
          newPosition.x = Math.max(0, gameState.currentVehicle.x - 1);
          break;
      case 'right':
          newPosition.x = Math.min(config.GRID_SIZE - 1, gameState.currentVehicle.x + 1);
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
  gameState.currentVehicle.x = newPosition.x;
  gameState.currentVehicle.y = newPosition.y;
  
  checkCollisions();
  renderGrid();
}

function checkCollisions() {
  const currentTrialData = getCurrentTrialData(); 
  if (!currentTrialData) return;
  if (!currentTrialData.hits) currentTrialData.hits = [];

  // Check for obstacle collision
  const hitObstacle = gameState.obstacles.findIndex(
      obs => obs.x === gameState.currentVehicle.x && obs.y === gameState.currentVehicle.y
  );
  
  if (hitObstacle !== -1) {
      // Remove obstacle
      gameState.obstacles.splice(hitObstacle, 1);
      gameState.gridWorld[gameState.currentVehicle.y][gameState.currentVehicle.x] = 'empty';
      
      // Decrease score
      gameState.score -= 10;
      let failCount = parseInt(document.getElementById('failure-count').textContent, 10);
      document.getElementById('failure-count').textContent = failCount + 1;
      document.getElementById('score').textContent = gameState.score;
      currentTrialData.hits.push('obstacle'); 
      currentTrialData.obstaclesHit++;
  }
  
  // Check for reward collision
  const collectedReward = gameState.rewards.findIndex(rew => rew.x === gameState.currentVehicle.x && rew.y === gameState.currentVehicle.y);
  
  if (collectedReward !== -1) {
      // Remove reward
      gameState.rewards.splice(collectedReward, 1);
      gameState.gridWorld[gameState.currentVehicle.y][gameState.currentVehicle.x] = 'empty';
      
      // Increase score
      gameState.score += 10;
      let successCount = parseInt(document.getElementById('success-count').textContent, 10);
      document.getElementById('success-count').textContent = successCount + 1;

      document.getElementById('score').textContent = gameState.score;
      
      // Record reward collection
      const currentTrialData = getCurrentTrialData();
      if (!currentTrialData) return;
      
      currentTrialData.hits.push('reward');
      currentTrialData.rewardsCollected++;
  }
  if (gameState.gridWorld[gameState.currentVehicle.y][gameState.currentVehicle.x] === 'terminator') {
    gameState.inputEnabled = false
    console.log("Hit terminator tile. Ending trial.");
    currentTrialData.hits.push('terminator');
    if (gameState.currentPhase === 0) {   // practice phase
      // jump to your helper that shows the quiz / retry screen
      setTimeout(practice.endPracticeTrial, 0);
    } else {
      // learning & planning phases keep the normal flow
      setTimeout(endTrial, 0);
    }
  }
        
  
  // Check if all rewards are collected or no more moves possible
  if (gameState.rewards.length === 0 || (gameState.obstacles.length === 0 && gameState.rewards.length === 0)) {
    setTimeout(endTrial, 0); 
  }
  if (gameState.currentPhase === 0 && (gameState.rewards.length === 0)) {
    setTimeout(practice.endPracticeTrial, 0);
  }
}

function endTrial() {
  // Record trial end data
  const currentTrialData = getCurrentTrialData();
  if (!currentTrialData) return;
  currentTrialData.endTime = Date.now();
  currentTrialData.totalTime = currentTrialData.endTime - currentTrialData.startTime;

  console.log(`Hits during trial ${gameState.currentTrial}:`);
  console.log(currentTrialData.hits);
  
  if (gameState.currentPhase === 1) {
    const maze = gameState.LEARN_POOL[gameState.learnOrder[gameState.currentTrial- 1]];    
    const optimal = maze.optimalDirections;
    const actual = currentTrialData.routeTaken || [];
    console.table(currentTrialData.actions);
    currentTrialData.RT_L = structuredClone(currentTrialData.actions);

    let matchCount = 0;
    for (let i = 0; i < optimal.length; i++) {
      if (actual[i] === optimal[i]) matchCount++;
    }
  
    const accuracy = matchCount / optimal.length;
    console.log(`Players actions:  ${actual.join(', ')}`);  
    const totalTrialTime = currentTrialData.lastValidKeyTime - currentTrialData.startTime;
    console.log("Total Trial Time:", totalTrialTime, "ms");
    currentTrialData.trialtime = totalTrialTime;
    delete currentTrialData.actions;
    delete currentTrialData.lastValidKeyTime;
    delete currentTrialData.endTime;
    delete currentTrialData.moves;
    delete currentTrialData.endTime;
    delete currentTrialData.startTime;
  }
  showTrialResults();
}

function showTrialResults() {
  gameState.inputEnabled = false;

  const container = document.querySelector('.game-container');
  let fadeOverlay = document.querySelector('.fade-overlay');
  if (!fadeOverlay) {
    fadeOverlay = document.createElement('div');
    fadeOverlay.className = 'fade-overlay';
    container.appendChild(fadeOverlay);
  }
  // Force a reflow so transition works reliably
  void fadeOverlay.offsetWidth;
  // Start fade-in
  fadeOverlay.style.opacity = '1';
  // Wait for fade-in to finish
  setTimeout(() => {
    if (gameState.currentPhase === 0) return;
    // Load next trial **while** screen is white
    continueToNextTrial();
    // Fade out after short delay
    setTimeout(() => {
      fadeOverlay.style.opacity = '0';
      // Fully remove after transition
      setTimeout(() => {
        fadeOverlay.remove();
        gameState.inputEnabled = true;
      }, 400); // match CSS duration
    }, 100);
  }, 400); // wait for fade-in first
}

function continueToNextTrial() {
  if (gameState.currentPhase === 0) {
    return;
  }
  // Remove the overlay
  const overlay = document.querySelector('.message-overlay');
  if (overlay) {
      overlay.remove();
  }
    
  // Check if phase is complete
  if (gameState.currentPhase === 1 && gameState.currentTrial>= gameState.vehicleTrialQueueLearn.length) {
      startPlanningPhase();
  } else if (gameState.currentPhase === 2 && gameState.currentTrial>= gameState.vehicleTrialQueuePlan.length) {
      console.log("Ending game");
      endGame();
  } else {
      // Start next trial
      gameState.currentTrial++;
  if (gameState.currentPhase === 2) {
    createPlanningTrial();
  } else {
    //Phase 1 
    createTrial();
  }
}
}

function startPlanningPhase() {
  gameState.currentPhase = 2;
  gameState.currentTrial= 1;

  const allVehicleTypes = ['car_small', 'car_medium', 'car_big', 'truck_small', 'truck_medium', 'truck_big', 'new_truck_small', 'new_truck_big'];
  
  allVehicleTypes.forEach(key => {
    vehicleColorQueues[key] = shuffleArray(config.COLOR_PALETTE.slice());
  });
  
  // hiding score bar
  const headerBar = document.querySelector('.header-bar');
  if (headerBar) {
    headerBar.style.display = 'none';
  }
 
  // Convert grid to planning mode
  convertToPlanningMode();
  // Reset game data for phase 2
  gameState.gameData.phase2 = [];
  // Show instructions for first planning trial
  showPlanningInstructions();
  };

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
      document.querySelector('.move-box').focus();

  });
}

function convertToPlanningMode() {  
  updateVehicleInfo();
}

function createPlanningTrial() {
  const maze = gameState.PLAN_POOL[gameState.planOrder[gameState.currentTrial- 1]];
  if (!maze || !maze.vehicleType) {
  console.error("Missing maze or vehicleType in PLAN_POOL:", maze);
  return;
}
  const vehicleData = maze.vehicleType;
  const key = `${vehicleData.type}_${vehicleData.size}`;
  let queue = vehicleColorQueues[key];

  if (!queue || queue.length === 0) {
    queue = shuffleArray(config.COLOR_PALETTE.slice());
    vehicleColorQueues[key] = queue;
  }

  const color = queue.shift();
  gameState.currentVehicle = {
    type: vehicleData.type,
    size: vehicleData.size,
    keys: vehicleData.keys,
    color: color,
    x: 0,
    y: 0
  };
  
  loadMazeFrom(gameState.PLAN_POOL, (gameState.planOrder[gameState.currentTrial- 1]));

  updateVehicleInfo();
  console.log(`Planning Phase - Vehicle: ${gameState.currentVehicle.type}, Size: ${gameState.currentVehicle.size}`);
  vehicles.renderVehiclePreview(); 
  startTrialTimer();
  
  // Clear move sequence input
  const moveSequenceInput = document.getElementById('move-sequence');
  if (moveSequenceInput) {
      moveSequenceInput.value = '';
  }
}

function getCurrentTrialData() {
  const trialIndex = gameState.currentTrial- 1;
  switch (gameState.currentPhase) {
      case 0: return gameState.gameData.practice[0]; // single practice trial
      case 1: return gameState.gameData.phase1[trialIndex];
      case 2: return gameState.gameData.phase2[trialIndex];
      default: return null;
  }
}

function submitPlan(sequence, rawInputKeys) {
  console.log("Submitting plan");
  const moveSequence = sequence;

  console.log(`Move sequence submitted: ${moveSequence}`);
  
  // Record moves
  const trialIndex = gameState.currentTrial- 1;
  
  // Make sure we have phase 2 data
  if (!gameState.gameData.phase2[trialIndex]) {
      console.error(`No data for phase 2, trial ${currentTrial}`);
      return;
  }
  
  const currentTrialData = gameState.gameData.phase2[trialIndex];

  // Translate player's input sequence to directions
  const playerDirections = [];

  for (let char of moveSequence) {
    if (char === gameState.currentVehicle.keys.up) playerDirections.push('up');
    else if (char === gameState.currentVehicle.keys.down) playerDirections.push('down');
    else if (char === gameState.currentVehicle.keys.left) playerDirections.push('left');
    else if (char === gameState.currentVehicle.keys.right) playerDirections.push('right');
    else playerDirections.push('invalid');
  }

  // Save to trialData
  currentTrialData.inputSequence = moveSequence;
  currentTrialData.decodedDirections = playerDirections;

  // Also get the optimal directions from the maze used in this trial
  const mazeused = gameState.PLAN_POOL[gameState.planOrder[gameState.currentTrial- 1]];
  console.log(mazeused);

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
    if (nextX < 0 || nextX >= config.GRID_SIZE || nextY < 0 || nextY >= config.GRID_SIZE) {
      hitsDuringPlan.push(`out_of_bounds_${direction}`);
      continue;
    }

    simulatedX = nextX;
    simulatedY = nextY;

    tile = mazeused.grid[simulatedY][simulatedX];
    if (tile === 'reward') {
        hitsDuringPlan.push('reward');
        mazeused.grid[simulatedY][simulatedX] = 'empty'; // mark as collected
    } else if (tile === 'obstacle') {
        hitsDuringPlan.push('obstacle');
    } else if (tile === 'terminator') {
        hitsDuringPlan.push('terminator');
        break; 
    } else {
        hitsDuringPlan.push('empty');
    }
    }

  currentTrialData.hits = hitsDuringPlan;

  console.log("Optimal:", mazeused.optimalDirections);
  console.log("Player: ", playerDirections);
  console.log("Simulated hits:", hitsDuringPlan);

  // Process each key in the sequence
  for (let i = 0; i < moveSequence.length; i++) {
      const key = moveSequence[i];
      let direction = null;
      
      if (key === gameState.currentVehicle.keys.up) {
          direction = 'up';
      } else if (key === gameState.currentVehicle.keys.down) {
          direction = 'down';
      } else if (key === gameState.currentVehicle.keys.left) {
          direction = 'left';
      } else if (key === gameState.currentVehicle.keys.right) {
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
  
  currentTrialData.endTime = Date.now();
  currentTrialData.totalTime = currentTrialData.endTime - currentTrialData.startTime;
  console.log(`Planning RT for this trial (ms): ${currentTrialData.totalTime}`);
  currentTrialData.RT_P = currentTrialData.totalTime;
  currentTrialData.trialtime = currentTrialData.totalTime;

  currentTrialData.inputSequence = moveSequence;
  
  document.querySelectorAll('.move-box').forEach(box => box.value = '');
  document.getElementById('submit-plan').disabled = true;
  document.querySelector('.move-box').focus();

  currentTrialData.inputSequence = moveSequence;
  currentTrialData.vehicleInfo = {
    type: gameState.currentVehicle.type,
    size: gameState.currentVehicle.size,
    trialNumber: gameState.currentTrial
  };

  console.log('Submitted Plan Summary:', {
    inputSequence: currentTrialData.inputSequence,
    rawInputKeys: rawInputKeys,
    vehicle: currentTrialData.vehicleInfo
  });
  console.log('Raw Input Keys:', rawInputKeys);


  // Clear the input field
  document.querySelectorAll('.move-box').forEach(box => box.value = '');
  document.getElementById('submit-plan').disabled = true;
  document.querySelector('.move-box').focus();

  endTrial();
}
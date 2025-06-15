//game.js


function rInt(rng, n) {
  return Math.floor(rng() * n);
}


/* pure maze generator that never calls Math.random() */
function buildMaze(rng) {
  const g = Array.from({length: GRID_SIZE}, _=>Array(GRID_SIZE).fill('empty'));
  const start = { x: rInt(rng, GRID_SIZE), y: rInt(rng, GRID_SIZE) };

  const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
  const path=[ {...start} ], used=new Set([`${start.x},${start.y}`]);
  while(path.length<5){
    const {x,y}=path[path.length-1];
    const cand=dirs.map(d=>({x:x+d.dx,y:y+d.dy}))
                   .filter(p=>p.x>=0&&p.x<GRID_SIZE&&p.y>=0&&p.y<GRID_SIZE&&!used.has(`${p.x},${p.y}`));
    if(!cand.length) break;
    const nxt=cand[rInt(rng,cand.length)];
    path.push(nxt); used.add(`${nxt.x},${nxt.y}`);
  }
  if(path.length<5) throw Error('path fail');

  const rewards = path.slice(1);
  rewards.forEach(p=>g[p.y][p.x]='reward');

  return { grid:g, start, rewards }; // no obstacles yet—handled per-vehicle later
}

/* build once, identical for all players */
const LEARN_POOL = Array.from({ length: LEARN_POOL_SIZE }, (_, i) => {
  const m = buildMaze(POOL_RNG_LEARN);
  m.id    = 'L-' + i;          // L-0 … L-79 (or L-11 in dev)
  return m;
});


const PLAN_POOL  = Array.from({ length: PLAN_POOL_SIZE  }, (_, i) => {
  const m = buildMaze(POOL_RNG_PLAN);
  m.id    = 'P-' + i;          // P-0 … P-79
  return m;
});



/* per-session shuffle orders */
function shuffleOnce(a){
  const c=[...a]; for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}
  return c;
}
const learnOrder = shuffleOnce([...LEARN_POOL.keys()]);
const planOrder  = shuffleOnce([...PLAN_POOL.keys()]);

console.log('Learning order for this session:', learnOrder.map(i => 'L-' + i));
console.log('Planning order for this session:', planOrder.map(i => 'P-' + i));


/* loader that copies a maze layout into live state */
function loadMazeFrom(pool, order, idx){
  
  const m = pool[ order[idx] ];
  console.log(`Loading from pool:`, pool.map(m => m.id), `order:`, order);

  if (!m) {
    console.error("Invalid maze lookup:", { idx, order, pool, poolLength: pool.length });
    throw new Error("Maze not found in pool");
  }
  console.log(`Loaded maze ${m.id}  (trial ${idx + 1} / ${order.length}, phase ${currentPhase})`);
  
  gridWorld = m.grid.map(r=>[...r]);
  rewards   = m.rewards.map(r=>({...r}));
  obstacles = [];                              // (filled below if truck)
  currentVehicle.x = m.start.x;
  currentVehicle.y = m.start.y;

  const startX = m.start.x;
  const startY = m.start.y;

  /* vehicle-specific extras */
  if (vehicleAllowsObstacles(currentVehicle)) {
    // three fresh obstacles, deterministic per trial but fine with Math.random()
    while(obstacles.length<3){
      const ox=Math.floor(Math.random()*GRID_SIZE);
      const oy=Math.floor(Math.random()*GRID_SIZE);
      if(gridWorld[oy][ox]!=='empty') continue;
      if (ox === startX && oy === startY)     continue;     // avoid start tile

      obstacles.push({x:ox,y:oy}); 
      gridWorld[oy][ox]='obstacle';
    }
  } else {
    // one terminator tile
    let placed=false;
    while(!placed){
      const tx=Math.floor(Math.random()*GRID_SIZE);
      const ty=Math.floor(Math.random()*GRID_SIZE);
      if(gridWorld[ty][tx]!=='empty') continue;
      if (tx === startX && ty === startY)     continue;

      gridWorld[ty][tx]='terminator';
      placed=true;
    }
  }

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
  console.log('Initializing game');
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
  wrongKeyAlert.style.display = 'none'; // Hide by default
  document.body.appendChild(wrongKeyAlert);

  // Replace the opening slide with the game UI
  createGameUI();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'style.css';
  document.head.appendChild(link);
  
  // Set up keyboard listeners for navigation
  setupKeyboardListeners();
  
  // Start Phase 1
  showTrialInstructions();
  //startLearningPhase();
}

// Create the game UI elements
function createGameUI() {
  // Get the main container
  const container = document.querySelector('.game-container');
  
  // Clear existing content
  container.innerHTML = '';
  container.style.opacity = '1';
  
  // Create game UI structure
  console.log('Creating the game UI');
  // container.innerHTML = `
  //     <div class="header-bar">
  //         <div class="score-group">
  //             <div class="score">Score: <span id="score">0</span></div>
  //           <div class="score">✅ Successes: <span id="success-count">0</span></div>
  //           <div class="score">❌ Failures: <span id="failure-count">0</span></div>
  //         </div>
  //     </div> 
      
  //     <div class="game-grid-outer-container">

  //         <div class="game-grid-inner-container">
  //             <div id="game-grid"></div>
  //         </div>
  //         <div id="vehicle-display" class="vehicle-display"></div>
  //     </div>
      
  //     <div class="controls-container">
  //         <div id="controls-info">
  //           <div id="movement-instructions"></div>
  //           <div id="planning-controls" style="display: none;">
  //             <p><strong>plan your 4 moves!</strong> Enter your move sequence below:</p>
  //             <div class="planning-input">
  //               <input type="text" id="move-sequence" placeholder="e.g. uujjzx">
  //               <button id="submit-plan">Submit</button>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //   `;




    container.innerHTML = `
    <div class="header-bar">
        <div class="score-group">
            <div class="score">Score: <span id="score">0</span></div>
            <div class="score">✅ Successes: <span id="success-count">0</span></div>
            <div class="score">❌ Failures: <span id="failure-count">0</span></div>
        </div>
    </div>
  
    <!-- ⭐ NEW FLEX WRAPPER ⭐ -->
    <div class="game-layout">
        <!-- 1.  Key panel  -->
        <div id="controls-info" class="controls-info">
            <div id="movement-instructions"></div>
            <div id="planning-controls" style="display:none">
                <p><strong>Plan your 4 moves!</strong></p>
                <div class="planning-input">
                    <input id="move-sequence" placeholder="e.g. wasd">
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

  // Show initial instructions before starting the first trial
  //showTrialInstructions();
}

function generateVehicleQueue() {
  const vehicleTypes = Object.values(VEHICLE_TYPES);
  console.log('Phase:', currentPhase, 'Vehicles:', vehicleTypes.length);

  let queue = [];

  for (const v of vehicleTypes) {
    // Skip the new truck and the medium sizes if we're in the learning phase
    if (currentPhase === 1 && (v.type === 'new_truck' || v.size === 'medium')) {
      console.log('Skipping', v.type, v.size);
      continue;
    }

    // Use 20 repetitions for learning (4 for dev), 10 for planning
    const repetitions = currentPhase === 1 ? LEARNING_TRIALS : PLANNING_TRIALS;
    console.log('Using reps', repetitions, 'for', v.type, v.size);


    for (let i = 0; i < repetitions; i++) {
      queue.push({
        type: v.type,
        size: v.size,
        keys: {
          up: v.upKey,
          down: v.downKey,
          left: v.leftKey,
          right: v.rightKey
          }
        });
      }
    }
  vehicleTrialQueue = shuffleArray(queue);
  console.log("Generated trials:", vehicleTrialQueue.map(v => `${v.type}-${v.size}`));

}

// Show instructions before starting a trial
function showTrialInstructions(page = 1) {
  console.log('Showing the main game instructions');
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


// Create a new trial with a specific vehicle and maze
function createTrial() {
  inputEnabled = true;
  console.log('creating new trial');
  // Reset score for the new trial
  if (currentPhase === 1) {
    console.log('Phase 1');
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('success-count').textContent = 0;
    document.getElementById('failure-count').textContent = 0;
  }
  // Use the randomized vehicle queue
  const vehicleData = vehicleTrialQueue[currentTrial - 1];
  currentVehicle.type = vehicleData.type;
  console.log('Set the vehicle type');
  currentVehicle.size = vehicleData.size;
  console.log(`Learning Phase - Vehicle: ${currentVehicle.type}, Size: ${currentVehicle.size}`);
  currentVehicle.keys = vehicleData.keys;

  // Select color
  const key = `${currentVehicle.type}_${currentVehicle.size}`;
  const queue = vehicleColorQueues[key];
  const colorIndex = Math.floor((currentTrial - 1) / 4) % 20;
  // Get a color and assign to vehicle
  currentVehicle.color = queue.shift();

  // Optional: if the queue runs out (all 20 colors used), re-shuffle
  if (queue.length === 0) {
    vehicleColorQueues[key] = shuffleArray(COLOR_PALETTE);
  }

  // Reset maze and place vehicle at random position
  //resetGrid();
  loadMazeFrom(LEARN_POOL, learnOrder, currentTrial - 1);


  // Update vehicle info display
  updateVehicleInfo();

  renderVehiclePreview();

    // // Preview the vehicle in the side panel
    // const previewEl = document.getElementById('vehicle-display');
    // if (previewEl) {
    //     previewEl.innerHTML = ''; // clean previous one
  
    //     const previewVehicle = document.createElement('div');
    //     previewVehicle.className = 'vehicle-image';
    //     //previewVehicle.style.backgroundImage = `url('/vehicles/${currentVehicle.type}.svg')`;
    //     loadColoredSvg(`/vehicles/${currentVehicle.type}.svg`, 'pink')
    //     .then(coloredUrl => {
    //       previewVehicle.style.backgroundImage = `url(${coloredUrl})`;
    //     });
    //     previewVehicle.style.backgroundSize = 'contain';
    //     previewVehicle.style.backgroundRepeat = 'no-repeat';
    //     previewVehicle.style.backgroundPosition = 'center';
    //     previewVehicle.style.filter = `drop-shadow(0 0 0 ${currentVehicle.color}) saturate(200%) brightness(80%)`;
    //     previewVehicle.style.position = 'relative';
  
    //     if (currentVehicle.size === 'small') {
    //         previewVehicle.style.width = '50%';
    //         previewVehicle.style.height = '50%';
    //     } else if (currentVehicle.size === 'medium') {
    //         previewVehicle.style.width = '75%';
    //         previewVehicle.style.height = '75%';
    //     } else {
    //         previewVehicle.style.width = '100%';
    //         previewVehicle.style.height = '100%';
    //     }
  
    //     previewEl.appendChild(previewVehicle);
    // }
  
  // Start trial timer and record data
  startTrialTimer();
}

// Reset and generate new maze
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

function vehicleAllowsObstacles(vehicle) {
  return (vehicle.type.startsWith('truck') || vehicle.type === 'new_truck');
}

// Place obstacles and rewards in the grid
function placeObstaclesAndRewards() {
  gridWorld = [];
  for (let y = 0; y < GRID_SIZE; y++) {
      gridWorld[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
          gridWorld[y][x] = 'empty';
      }
  }

  rewards = [];
  obstacles = [];

  // Define valid movement directions
  const directions = [
      { dx: 0, dy: -1 },  // up
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: 0 },  // left
      { dx: 1, dy: 0 }    // right
  ];

  let path = [];

  // Try generating a valid 4-step reward path
  let attempts = 0;
  while (path.length < 5 && attempts < 100) {
      attempts++;
      path = [];

      // Random starting point
      let x = Math.floor(Math.random() * GRID_SIZE);
      let y = Math.floor(Math.random() * GRID_SIZE);

      path.push({ x, y });
      let used = new Set([`${x},${y}`]);

      for (let step = 0; step < 4; step++) {
          // Get valid directions from current cell
          const validNextSteps = directions
              .map(d => ({ x: x + d.dx, y: y + d.dy }))
              .filter(p =>
                  p.x >= 0 && p.x < GRID_SIZE &&
                  p.y >= 0 && p.y < GRID_SIZE &&
                  !used.has(`${p.x},${p.y}`)
              );

          if (validNextSteps.length === 0) break;

          const next = validNextSteps[Math.floor(Math.random() * validNextSteps.length)];
          x = next.x;
          y = next.y;
          path.push({ x, y });
          used.add(`${x},${y}`);
      }
  }

  if (path.length < 5) {
      console.error("Failed to generate 4-step reward path");
      return;
  }

  // Set vehicle start position to path[0]
  currentVehicle.x = path[0].x;
  currentVehicle.y = path[0].y;

  // Place rewards at path[1] to path[4]
  for (let i = 1; i < path.length; i++) {
      const { x, y } = path[i];
      rewards.push({ x, y });
      gridWorld[y][x] = 'reward';
  }

  // If the vehicle is a car, skip obstacles entirely
  if (!vehicleAllowsObstacles(currentVehicle)) {
    console.log("No obstacles for cars in this trial. Placing terminator tile.");
  
    // Place one "terminator" tile not on the path
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const tx = Math.floor(Math.random() * GRID_SIZE);
      const ty = Math.floor(Math.random() * GRID_SIZE);
  
      const occupied = path.some(p => p.x === tx && p.y === ty);
      if (!occupied) {
        gridWorld[ty][tx] = 'terminator';
        break;
      }
    }
    return;
  }  

  // Place obstacles (3), avoiding all path positions
  let obstacleAttempts = 0;
  while (obstacles.length < 3 && obstacleAttempts < 100) {
      obstacleAttempts++;
      let ox = Math.floor(Math.random() * GRID_SIZE);
      let oy = Math.floor(Math.random() * GRID_SIZE);

      if (path.some(p => p.x === ox && p.y === oy)) continue;

      if (!obstacles.some(o => o.x === ox && o.y === oy)) {
          obstacles.push({ x: ox, y: oy });
          gridWorld[oy][ox] = 'obstacle';
      }
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
          } else if (gridWorld[y][x] === 'terminator') {
              cellEl.classList.add('terminator');
              cellEl.innerHTML = '❌'; 
          }
          
          // Add vehicle if this is vehicle position
          if (x === currentVehicle.x && y === currentVehicle.y) {
              const vehicle = document.createElement('div');
              vehicle.className = 'vehicle-image';
              console.log(`using color: ${currentVehicle.color}`);
              loadColoredSvg(`/vehicles/${currentVehicle.type}.svg`, currentVehicle.color)
                .then(coloredUrl => {
                  vehicle.style.backgroundImage = `url(${coloredUrl})`;
                });

              //vehicle.style.backgroundImage = `url('/vehicles/${currentVehicle.type}.svg')`; 
              //               vehicle.style.backgroundImage = `url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%201024%201024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M766.976%20508.736c80.576%200%20152.448%2032.128%20199.232%2082.176%22%20fill%3D%22%23AEBCC3%22/%3E%3Cpath%20d%3D%22M64.704%20684.992c10.816%2019.2%2032.064%2032.192%2056.576%2032.192h784.64c35.84%200%2064.832-27.648%2064.832-61.76v-17.408h-36.608a15.744%2015.744%200%200%201-16.064-15.296V550.912a277.568%20277.568%200%200%200-150.144-44.16h1.6l-55.04-0.256c-53.632-115.2-157.504-210.752-294.208-210.752-136.512%200-251.008%2089.728-282.176%20210.688h-16.832c-35.456%200-56.128%2027.392-56.128%2061.184%22%20fill%3D%22%23e8447a%22/%3E%3Cpath%20d%3D%22M64.704%20654.464h13.76a39.168%2039.168%200%200%200%2040.064-38.272v-17.6c0-21.12-17.92-38.208-40.064-38.208h-13.376%22%20fill%3D%22%23F5BB1D%22/%3E%3Cpath%20d%3D%22M160%20684.992a101.632%2096.832%200%201%200%20203.264%200%20101.632%2096.832%200%201%200-203.264%200Z%22%20fill%3D%22%23455963%22/%3E%3Cpath%20d%3D%22M218.88%20684.992a42.752%2040.768%200%201%200%2085.504%200%2042.752%2040.768%200%201%200-85.504%200Z%22%20fill%3D%22%23AEBCC3%22/%3E%3Cpath%20d%3D%22M652.032%20684.992a101.568%2096.832%200%201%200%20203.136%200%20101.568%2096.832%200%201%200-203.136%200Z%22%20fill%3D%22%23455963%22/%3E%3Cpath%20d%3D%22M710.912%20684.992a42.752%2040.768%200%201%200%2085.504%200%2042.752%2040.768%200%201%200-85.504%200Z%22%20fill%3D%22%23AEBCC3%22/%3E%3Cpath%20d%3D%22M966.272%20591.104v-0.192a257.92%20257.92%200%200%200-48.192-40V622.72c0%208.448%207.232%2015.296%2016.064%2015.296h36.608v-42.304l-4.48-4.608z%22%20fill%3D%22%23F5BB1D%22/%3E%3Cpath%20d%3D%22M405.568%20335.616c-104.896%206.336-191.296%2076.8-216.64%20170.816h216.64V335.616zM445.696%20506.432h216.64c-41.216-86.848-117.12-159.616-216.64-170.048v170.048z%22%20fill%3D%22%23631536%22/%3E%3C/svg%3E")`;

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
  // Only display the controls info, no vehicle type info
  const movementInstructionsEl = document.getElementById('movement-instructions');
  const planningControlsEl = document.getElementById('planning-controls');
  
  if (!movementInstructionsEl || !planningControlsEl) {
      console.error("Required elements not found!");
      return;
  }
  
  if (currentPhase === 1 || currentPhase === 0) {
    console.log('Showing control keys');
    // Phase 1 (learning) - show movement instructions
    // movementInstructionsEl.innerHTML = `
    //   <p style="margin: 0; font-size: 18px; font-weight: bold; color: #020814;">
    //   Up: ${currentVehicle.keys.up.toUpperCase()} | 
    //   Down: ${currentVehicle.keys.down.toUpperCase()} | 
    //   Left: ${currentVehicle.keys.left.toUpperCase()} | 
    //   Right: ${currentVehicle.keys.right.toUpperCase()}
    // </p>`;

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
      const currentTrialData = getCurrentTrialData();
      if (!currentTrialData) return;
      
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
      let successCount = parseInt(document.getElementById('success-count').textContent, 10);
      document.getElementById('success-count').textContent = successCount + 1;

      document.getElementById('score').textContent = score;
      
      // Record reward collection
      const currentTrialData = getCurrentTrialData();
      if (!currentTrialData) return;
      
      currentTrialData.rewardsCollected++;
     
  }
  if (gridWorld[currentVehicle.y][currentVehicle.x] === 'terminator') {
    console.log("Hit terminator tile. Ending trial.");
    endTrial();
  }
  // Check if all rewards are collected or no more moves possible
  if (rewards.length === 0 || (obstacles.length === 0 && rewards.length === 0)) {
      endTrial();
  }
  
  if (currentPhase === 0 && (rewards.length === 0)) {
    endPracticeTrial();
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
  
  // Show trial results
  showTrialResults();
}

// Show results of current trial and transition to next
function showTrialResults() {
  inputEnabled = false;
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
  
  console.log(`Current trial: ${currentTrial}, Phase: ${currentPhase}`);
  
  // Check if phase is complete
  if (currentPhase === 1 && currentTrial >= vehicleTrialQueue.length) {
      console.log("Starting planning phase...");
      startPlanningPhase();
  } else if (currentPhase === 2 && currentTrial >= vehicleTrialQueue.length) {
      console.log("Ending game...");
      endGame();
  } else {
      // Start next trial
      currentTrial++;
      console.log(`Moving to trial ${currentTrial}`);
  if (currentPhase === 2) {
    createPlanningTrial();
  } else {
    createTrial();
  }
}
}

// Start the planning phase (Phase 2)
function startPlanningPhase() {
  currentPhase = 2;
  currentTrial = 1;

  console.log("starting planning phase"); 

  const allVehicleTypes = [
    'car_small', 'car_medium', 'car_big',
    'truck_small', 'truck_medium', 'truck_big',
    'new_truck_small', 'new_truck_big'
  ];
  
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
      
  generateVehicleQueue();

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
  console.log("Converting to planning mode");
  
  updateVehicleInfo();
}

// Create a planning trial
function createPlanningTrial() {
  // Similar to createTrial but for planning phase
  // Use the randomized vehicle queue
  const vehicleData = vehicleTrialQueue[currentTrial - 1];
  
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
    x: 0, // will be set in resetGrid
    y: 0
  };
  
  // Reset grid
  //resetGrid();
  loadMazeFrom(PLAN_POOL, planOrder, currentTrial - 1);


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


// Submit plan for current trial
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


  // ✅ Debug print
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
// practiceTrial.js
function startPracticeTrial() {
    console.log('Starting practice phase');
    currentPhase = 0;
    currentTrial = 1;

    const smallCar = VEHICLE_TYPES.CAR_SMALL;

    currentVehicle = {
        ...VEHICLE_TYPES.CAR_SMALL,
        keys: {
            up: smallCar.upKey,
            down: smallCar.downKey,
            left: smallCar.leftKey,
            right: smallCar.rightKey,
        },
        x: GRID_SIZE -1,
        y: 0
    };


    rewards = [
        { x: 1, y: 1 },
        { x: 0, y: 2 }
      ];
      
      obstacles = [
        { x: 2, y: 1 },
        { x: 2, y: 2 }
      ];



    gridWorld = Array.from({ length: GRID_SIZE }, () =>
        Array.from({ length: GRID_SIZE }, () => 'empty')
    );
    


    // Place rewards
    rewards.forEach(pos => {
        gridWorld[pos.y][pos.x] = 'reward';
    });
    
    // Place obstacles
    obstacles.forEach(pos => {
        gridWorld[pos.y][pos.x] = 'obstacle';
    });

    createGameUI();
    renderGrid();
    updateVehicleInfo();
    inputEnabled = false;

    showPracticeInstructions();
    inputEnabled = true;       // Allow key presses to affect the game

    gameData.practice = [{
        vehicle: currentVehicle,
        startTime: Date.now(),
        moves: [],
        rewardsCollected: 0,
        obstaclesHit: 0,
    }];
}

function showPracticeInstructions() {
    console.log('Showing practice instructions');
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';
    overlay.innerHTML = `
        <div class="message-box" style="text-align: left;">
            <h2>This is a Practice Trial</h2>
            <p style="font-size: 1.2rem; margin: 12px 0; line-height: 1.6; text-align: left;">
            Use the correct keys to move the car around the maze.</p>
            <p>Try collecting the 💰 reward and avoiding the 🔥 obstacle.</p>
            <div style="text-align: center; margin-top: 20px;">
                <button id="start-practice-btn" style="padding: 10px 20px;">Start</button>
            </div>
        </div>
    `;
    document.querySelector('.game-container').appendChild(overlay);
    
    document.getElementById('start-practice-btn').addEventListener('click', () => {
        overlay.remove();
        inputEnabled = true;
    });
    
}
    

function endPracticeTrial() {
    // small delay before showing questions
    setTimeout(() => {
        showPracticeQuestions();
    }, 800);
}

function showPracticeQuestions() {
    console.log('Practice Quiz');
    inputEnabled = false;

    const container = document.querySelector('.game-container');
    container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';

    overlay.innerHTML = `
        <div class="message-box">
            <h2>Practice Quiz</h2>

            <p>1. How many moves do you have?</p>
            <button onclick="checkAnswer(1, 'A')" data-question="1" data-choice="A">A) 4</button>
            <button onclick="checkAnswer(1, 'B')" data-question="1" data-choice="B">B) Unlimited</button>
            <button onclick="checkAnswer(1, 'C')" data-question="1" data-choice="C">C) 10</button>

            <p>2. What happens when you hit a failure (🔥)?</p>
            <button onclick="checkAnswer(2, 'A')" data-question="2" data-choice="A">A) You earn points</button>
            <button onclick="checkAnswer(2, 'B')" data-question="2" data-choice="B">B) It increases your public speaking time</button>
            <button onclick="checkAnswer(2, 'C')" data-question="2" data-choice="C">C) Nothing</button>

            <p>3. Which trials determine your outcomes?</p>
            <button onclick="checkAnswer(3, 'A')" data-question="3" data-choice="A">A) All trials</button>
            <button onclick="checkAnswer(3, 'B')" data-question="3" data-choice="B">B) Every second trial</button>
            <button onclick="checkAnswer(3, 'C')" data-question="3" data-choice="C">C) A few randomly selected ones</button>

            <div id="quiz-feedback" style="margin-top: 20px;"></div>
        </div>

    `;

    container.appendChild(overlay);
}

let practiceAnswers = {};

function checkAnswer(qNum, choice) {
    // Disable all buttons for this question
    const allButtons = document.querySelectorAll(`button[data-question='${qNum}']`);
    allButtons.forEach(btn => btn.disabled = true);

    // Find the clicked button
    const clickedBtn = document.querySelector(`button[data-question='${qNum}'][data-choice='${choice}']`);

    // Correct answers
    const correctAnswers = {
        1: 'A',
        2: 'B',
        3: 'C'
    };

    const isCorrect = correctAnswers[qNum] === choice;

    if (isCorrect) {
        clickedBtn.style.backgroundColor = 'green';
        clickedBtn.style.color = 'white';
    } else {
        clickedBtn.style.backgroundColor = 'red';
        clickedBtn.style.color = 'white';
        const correctBtn = document.querySelector(`button[data-question='${qNum}'][data-choice='${correctAnswers[qNum]}']`);
        if (correctBtn) {
            correctBtn.style.backgroundColor = 'green';
            correctBtn.style.color = 'white';
        }
    }

    // Save answer
    practiceAnswers[qNum] = choice;

    const feedback = document.getElementById('quiz-feedback');
    if (Object.keys(practiceAnswers).length === 3) {
        feedback.innerHTML = `
            <p style="color: #333;"><strong>Check your answers and make sure you understand before continuing.</strong></p>
            <div style="margin-top: 10px;">
                <button id="continue-to-game-btn" style="padding: 8px 16px;">Continue</button>
            </div>
        `;

        document.getElementById('continue-to-game-btn').addEventListener('click', () => {
            document.querySelector('.message-overlay').remove();
            currentPhase = 1;
            createGameUI();
            startLearningPhase();
            createTrial(); // Proceed to main game
        });
    }
}

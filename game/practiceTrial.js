// practiceTrial.js
import * as config from './config.js';
import { gameState } from './gameState.js';
import * as game from './game.js';
import * as vehicle from './vehicle.js';


export function startPracticeTrial() {
    gameState.currentPhase = 0;
    gameState.currentTrial = 1;
    const smallCar = config.VEHICLE_TYPES.CAR_SMALL;

    gameState.currentVehicle = {
        ...config.VEHICLE_TYPES.CAR_SMALL,
        keys: {
            up: smallCar.upKey,
            down: smallCar.downKey,
            left: smallCar.leftKey,
            right: smallCar.rightKey,
        },
        color: 'red',
        x: config.GRID_SIZE -1,
        y: 0
    };

    gameState.rewards = [
        { x: 1, y: 1 },
        { x: 0, y: 2 }
      ];
      
      gameState.obstacles = [
        { x: 2, y: 1 },
        { x: 2, y: 2 }
      ];

    gameState.gridWorld = Array.from({ length: config.GRID_SIZE }, () =>
        Array.from({ length: config.GRID_SIZE }, () => 'empty')
    );

    gameState.rewards.forEach(pos => {
        gameState.gridWorld[pos.y][pos.x] = 'reward';
    });
    
    gameState.obstacles.forEach(pos => {
        gameState.gridWorld[pos.y][pos.x] = 'obstacle';
    });

    game.createGameUI();
    vehicle.renderVehiclePreview();
    game.renderGrid();
    game.updateVehicleInfo();
    showPracticeInstructions();

    gameState.gameData.practice = [{
        vehicle: gameState.currentVehicle,
        startTime: Date.now(),
        moves: [],
        rewardsCollected: 0,
        obstaclesHit: 0,
    }];
}

function showPracticeInstructions() {
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';
    overlay.innerHTML = `
        <div class="message-box" style="text-align: left;">
            <h2>This is a Practice Trial</h2>
            <p style="font-size: 1.2rem; margin: 12px 0; line-height: 1.6; text-align: left;">
            This is practicing the learning phase. Here you have unlimited moves. <br>
            In the planning phase, you only have 4 moves. <br>
            Use the correct keys to move the car around the maze.</p>
            <p style="font-size: 1.2rem; margin: 12px 0; line-height: 1.6; text-align: left;">

            Try collecting the 💰 reward and avoiding the 🔥 obstacle.</p>
            <div style="text-align: center; margin-top: 20px;">
                <button id="start-practice-btn" style="padding: 10px 20px;">Start</button>
            </div>
        </div>
    `;
    document.querySelector('.game-container').appendChild(overlay);  
    document.getElementById('start-practice-btn').addEventListener('click', () => {
        overlay.remove();
        gameState.inputEnabled = true;
    });   
}
    
export function endPracticeTrial() {
    setTimeout(() => {
        showPracticeQuestions();
    }, 800);
}

function showPracticeQuestions() {
    gameState.inputEnabled = false;
    const container = document.querySelector('.game-container');
    container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';

    overlay.innerHTML = `
        <div class="message-box">
            <h2>Practice Quiz</h2>

            <p>1. How many moves do you have in the Learning Phase?</p>
            <button data-question="1" data-choice="A">A) 4</button>
            <button data-question="1" data-choice="B">B) Unlimited</button>
            <button data-question="1" data-choice="C">C) 10</button>

            <p>2. How many moves do you have in the Planning phase?</p>
            <button data-question="2" data-choice="A">A) 4</button>
            <button data-question="2" data-choice="B">B) Unlimited</button>
            <button data-question="2" data-choice="C">C) 10</button>

            <p>3. What happens when you hit a failure (🔥)?</p>
            <button data-question="3" data-choice="A">A) You earn points</button>
            <button data-question="3" data-choice="B">B) It increases your public speaking time</button>
            <button data-question="3" data-choice="C">C) Nothing</button>

            <p>4. Which trials determine your outcomes?</p>
            <button data-question="4" data-choice="A">A) All trials</button>
            <button data-question="4" data-choice="B">B) Every second trial</button>
            <button data-question="4" data-choice="C">C) A few randomly selected ones</button>

            <div id="quiz-feedback" style="margin-top: 20px;"></div>
        </div>
    `;

    container.appendChild(overlay);

    // ✅ Bind click listeners AFTER inserting the buttons
    overlay.querySelectorAll('button[data-question]').forEach(button => {
        button.addEventListener('click', () => {
            const q = parseInt(button.dataset.question);
            const c = button.dataset.choice;
            checkAnswer(q, c);
        });
    });
}


let practiceAnswers = {};
function checkAnswer(qNum, choice) {
    const allButtons = document.querySelectorAll(`button[data-question='${qNum}']`);
    allButtons.forEach(btn => btn.disabled = true);
    const clickedBtn = document.querySelector(`button[data-question='${qNum}'][data-choice='${choice}']`);
    const correctAnswers = {1: 'B', 2: 'A', 3: 'B', 4:'C'};

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

    practiceAnswers[qNum] = choice;
    const feedback = document.getElementById('quiz-feedback');
    if (Object.keys(practiceAnswers).length === 4) {
        feedback.innerHTML = `
            <p style="color: #333;"><strong>Check your answers and make sure you understand before continuing.</strong></p>
            <div style="margin-top: 10px;">
                <button id="continue-to-game-btn" style="padding: 8px 16px;">Continue</button>
            </div>
        `;

        document.getElementById('continue-to-game-btn').addEventListener('click', () => {
            document.querySelector('.message-overlay').remove();
            gameState.currentPhase = 1;
            game.createGameUI();
            game.startLearningPhase();
            game.createTrial(); 
        });
    }
}
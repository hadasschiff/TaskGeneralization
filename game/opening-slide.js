import {initializeGame} from './game.js'
export function setupOpeningSlideHandlers() {
    const startButton = document.querySelector('.start-btn');
    const carImage = document.querySelector('.car-image');

    if (startButton) {
        startButton.addEventListener('click', () => {
            const gameContainer = document.querySelector('.game-container');
            if (typeof initializeGame === 'function' && gameContainer) {
                gameContainer.style.opacity = '0';
                gameContainer.style.transition = 'opacity 0.5s ease';
                setTimeout(() => initializeGame(), 500);
            } else {
                console.error("initializeGame not found or game container missing.");
                alert("Error starting the game. Please refresh the page and try again.");
            }
        });
    }

    if (carImage) {
        carImage.addEventListener('mouseover', () => {
        });
    }
}

// // opening-slide.js
// document.addEventListener('DOMContentLoaded', function() {
//     const startButton = document.querySelector('.start-btn');
//     if (startButton) {
//         startButton.addEventListener('click', startGame);
//     }    
//     const carImage = document.querySelector('.car-image');
//     if (carImage) {
//         carImage.addEventListener('mouseover', function() {
//         });
//     }
// });

// function startGame() {
//     if (typeof initializeGame === 'function') {
//         const gameContainer = document.querySelector('.game-container');
//         gameContainer.style.opacity = '0';
//         gameContainer.style.transition = 'opacity 0.5s ease';
        
//         setTimeout(function() {
//             initializeGame();
//         }, 500);
//     } else {
//         console.error("Game initialization function not found. Make sure game.js is loaded correctly.");
//         alert("Error starting the game. Please refresh the page and try again.");
//     }
// }
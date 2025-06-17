// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Ensure the start button is properly connected
    const startButton = document.querySelector('.start-btn');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
    
    // Add hover effect for car if needed beyond CSS
    const carImage = document.querySelector('.car-image');
    if (carImage) {
        carImage.addEventListener('mouseover', function() {
            // Additional hover effects could be added here
        });
    }
});

//Starts the game when the start button is clicked
function startGame() {
    // Trigger game initialization function from game.js
    if (typeof initializeGame === 'function') {
        // Fade out the opening slide
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.opacity = '0';
        gameContainer.style.transition = 'opacity 0.5s ease';
        
        // Initialize the game after transition
        setTimeout(function() {
            initializeGame();
        }, 500);
    } else {
        // If game.js isn't loaded properly, show error
        console.error("Game initialization function not found. Make sure game.js is loaded correctly.");
        alert("Error starting the game. Please refresh the page and try again.");
    }
}
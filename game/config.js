// Vehicle Navigation Game - Main game functionality and logic
// Game Configuration
const GRID_SIZE = 4;
const LEARNING_TRIALS = 4;
const PLANNING_TRIALS = 10;
const NEW_SIZE_TRIALS = 10;

// Vehicle types and controls
const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'w', downKey: 's', leftKey: 'a', rightKey: 'd' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'w', downKey: 's', leftKey: 'q', rightKey: 'e' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 'u', downKey: 'j', leftKey: 'h', rightKey: 'k' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 'u', downKey: 'j', leftKey: 'y', rightKey: 'i' }
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
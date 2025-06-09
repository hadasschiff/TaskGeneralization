// Vehicle Navigation Game - Main game functionality and logic
// Game Configuration
const GRID_SIZE = 3;
// number of repettions for each vehicle type
const LEARNING_TRIALS = 1; // change after to 20
const PLANNING_TRIALS = 2; // change after to 10


// Vehicle types and controls
const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'w', downKey: 's', leftKey: 'a', rightKey: 'd' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'w', downKey: 's', leftKey: 'q', rightKey: 'e' },
  CAR_MEDIUM: { type: 'car', size: 'medium', upKey: 'e', downKey: 'd', leftKey: 's', rightKey: 'f' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 'u', downKey: 'j', leftKey: 'h', rightKey: 'k' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 'u', downKey: 'j', leftKey: 'y', rightKey: 'i' },
  TRUCK_MEDIUM: { type: 'truck', size: 'medium', upKey: 'u', downKey: 'j', leftKey: 'h', rightKey: 'k' },
  NEW_TRUCK_BIG: { type: 'new_truck', size: 'big', upKey: 'u', downKey: 'j', leftKey: 'y', rightKey: 'i' },
  NEW_TRUCK_SMALL: { type: 'new_truck', size: 'small', upKey: 'u', downKey: 'j', leftKey: 'y', rightKey: 'i' }
};

// Color palettes for vehicle types
const COLOR_PALETTE = [
      '#FF5733', '#FF8C33', '#FFC133', '#FFFF33', '#C1FF33', 
      '#8CFF33', '#57FF33', '#33FF8C', '#FF3366', '#FF99CC',
      '#33FFC1', '#33FFFF', '#33C1FF', '#338CFF', '#3357FF', 
      '#5733FF', '#8C33FF', '#C133FF', '#CC99FF', '#FF33FF'
  ]
;
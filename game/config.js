// Vehicle Navigation Game - Main game functionality and logic
// Game Configuration
const GRID_SIZE = 3;
// number of repettions for each vehicle type
const LEARNING_TRIALS = 1; // change after to 20
const PLANNING_TRIALS = 2; // change after to 10

// number of trials
const LEARN_POOL_SIZE = 4; // change after to 80
const PLAN_POOL_SIZE  = 16; // change after to 80

/* independent seeds so you can regenerate one pool without touching the other */
const POOL_RNG_LEARN = new Math.seedrandom('maze-learn-v1');
const POOL_RNG_PLAN  = new Math.seedrandom('maze-plan-v1');

// Vehicle types and controls
const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'w', downKey: 's', leftKey: 'a', rightKey: 'd' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'w', downKey: 's', leftKey: 'q', rightKey: 'e' },
  CAR_MEDIUM: { type: 'car', size: 'medium', upKey: 'w', downKey: 's', leftKey: '-', rightKey: '-' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 'u', downKey: 'j', leftKey: 'h', rightKey: 'k' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 'u', downKey: 'j', leftKey: 'y', rightKey: 'i' },
  TRUCK_MEDIUM: { type: 'truck', size: 'medium', upKey: 'u', downKey: 'j', leftKey: '-', rightKey: '-' },
  NEW_TRUCK_BIG: { type: 'new_truck', size: 'big', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' },
  NEW_TRUCK_SMALL: { type: 'new_truck', size: 'small', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' }
};

// Color palettes for vehicle types
const COLOR_PALETTE = [
      '#FF5733', '#f5a567', '#F08080', '#FFFF33', '#ad5d24', 
      '#DC143C', '#33FF57', '#f03513', '#FF3366', '#FF99CC',
      '#33FFC1', '#228B22', '#33C1FF', '#2c0eb5', '#3357FF', 
      '#801212', '#8C33FF', '#C133FF', '#CC99FF', '#FF33FF'
  ]
;
// Vehicle Navigation Game - Main game functionality and logic
// Game Configuration
export const GRID_SIZE = 3;
// number of repettions for each vehicle type
export const LEARNING_TRIALS = 1; // change after to 20
export const PLANNING_TRIALS = 2; // change after to 10

// Vehicle types and controls
export const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'e', downKey: 'c', leftKey: 'a', rightKey: 'd' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'e', downKey: 'c', leftKey: 's', rightKey: 'f' },
  CAR_MEDIUM: { type: 'car', size: 'medium', upKey: 'e', downKey: 'c', leftKey: '-', rightKey: '-' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 'u', downKey: 'm', leftKey: 'g', rightKey: 'j' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 'u', downKey: 'm', leftKey: 'h', rightKey: 'k' },
  TRUCK_MEDIUM: { type: 'truck', size: 'medium', upKey: 'u', downKey: 'm', leftKey: '-', rightKey: '-' },
  NEW_TRUCK_BIG: { type: 'new_truck', size: 'big', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' },
  NEW_TRUCK_SMALL: { type: 'new_truck', size: 'small', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' }
};

// Color palettes for vehicle types
export const COLOR_PALETTE = [
      '#FF5733', '#f5a567', '#F08080', '#FFFF33', '#ad5d24', 
      '#DC143C', '#33FF57', '#f03513', '#FF3366', '#FF99CC',
      '#33FFC1', '#228B22', '#33C1FF', '#2c0eb5', '#3357FF', 
      '#801212', '#8C33FF', '#C133FF', '#CC99FF', '#FF33FF'
  ]
;
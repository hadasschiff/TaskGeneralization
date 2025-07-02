// Game Configuration
export const GRID_SIZE = 3;
// number of repettions for each vehicle type
export const LEARNING_TRIALS = 15; // change after to 15
//export const PLANNING_TRIALS = 3; // change after to 3

// Vehicle types and controls
export const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'e', downKey: 'c', leftKey: 'q', rightKey: 'w' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'e', downKey: 'c', leftKey: 'z', rightKey: 'x' },
  CAR_MEDIUM: { type: 'car', size: 'medium', upKey: 'e', downKey: 'c', leftKey: '-', rightKey: '-' },
  TRUCK_SMALL: { type: 'truck', size: 'small', upKey: 't', downKey: 'b', leftKey: 'y', rightKey: 'u' },
  TRUCK_BIG: { type: 'truck', size: 'big', upKey: 't', downKey: 'b', leftKey: 'n', rightKey: 'm' },
  TRUCK_MEDIUM: { type: 'truck', size: 'medium', upKey: 't', downKey: 'b', leftKey: 'n', rightKey: 'm' },
  PICKUP_TRUCK_BIG: { type: 'pickup_truck', size: 'big', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' },
  PICKUP_TRUCK_SMALL: { type: 'pickup_truck', size: 'small', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-' },
  PICKUP_TRUCK_MEDIUM: { type: 'pickup_truck', size: 'medium', upKey: 't', downKey: 'b', leftKey: 'y', rightKey: 'u' }, 
  TOW_TRUCK_MEDIUM: {type: 'tow_truck', size: 'medium', upKey: '-', downKey: '-', leftKey: '-', rightKey: '-'}
};

// config.js
export const PLANNING_REPS = {
  car_small: 3, //3
  car_big: 3, //3
  car_medium: 6, // 6
  truck_medium: 3, //3
  pickup_truck_medium: 3, //3
  tow_truck_medium: 6// 6
};

export const LEARN_ALLOWED = new Set(['truck_medium', 'pickup_truck_medium', 'car_small', 'car_big']);

export const PLAN_ALLOWED = new Set(['truck_medium', 'pickup_truck_medium', 'car_small', 'car_big', 'car_medium', 'tow_truck_medium']);

// Color palettes for vehicle types
export const COLOR_PALETTE = [
      '#FF5733', '#f5a567', '#F08080', '#FFFF33', '#ad5d24', 
      '#DC143C', '#33FF57', '#f03513', '#FF3366', '#FF99CC',
      '#33FFC1', '#228B22', '#33C1FF', '#2c0eb5', '#3357FF', 
      '#801212', '#8C33FF', '#C133FF', '#CC99FF', '#FF33FF'
  ];

 export const COLOR_PALETTE_LEARN = [
      '#822cd1', '#ebeb5e',  '#2ca02c', '#FF5733', '#FF99CC',   
  ];

 export const COLOR_PALETTE_PLAN = [
      '#e02319','#dbc7f0', '#33FF57', '#2c0eb5', '#33C1FF', '#ad5d24', 
  ];
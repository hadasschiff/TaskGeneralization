// Game Configuration
export const GRID_SIZE = 3;
// number of repettions for each vehicle type
export const LEARNING_TRIALS = 15; // change after to 15
//export const PLANNING_TRIALS = 3; // change after to 3

// Vehicle types and controls
export const VEHICLE_TYPES = {
  CAR_SMALL: { type: 'car', size: 'small', upKey: 'w', downKey: 'x', leftKey: 'a', rightKey: 'd' },
  CAR_BIG: { type: 'car', size: 'big', upKey: 'e', downKey: 'c', leftKey: 's', rightKey: 'f' },
  CAR_MEDIUM: { type: 'car', size: 'medium', upKey: 'e', downKey: 'c', leftKey: '-', rightKey: '-' },
  SEDAN_SMALL: { type: 'sedan', size: 'small', upKey: 'y', downKey: 'n', leftKey: 'g', rightKey: 'j' },
  SEDAN_BIG: { type: 'sedan', size: 'big', upKey: 'u', downKey: 'm', leftKey: 'h', rightKey: 'k' },
  SEDAN_MEDIUM: { type: 'sedan', size: 'medium', upKey: 't', downKey: 'b', leftKey: '-', rightKey: '-' },
  

};

// config.js
export const PLANNING_REPS = {
  car_small: 3, //3
  car_big: 3, //3
  car_medium: 6, // 6
  sedan_small: 3, //3
  sedan_big: 3, //3
  sedan_medium: 6, // 6
};

export const LEARN_ALLOWED = new Set(['sedan_small', 'sedan_big', 'car_small', 'car_big']);

export const PLAN_ALLOWED = new Set(['sedan_small', 'sedan_big', 'car_small', 'car_big', 'car_medium', 'sedan_medium']);





  // ─── Vehicle body-colours ────────────────────────────────────────────────
export const SEDAN_COLOR = '#822cd1';

export const SEDAN_PATTERNS_LEARN = [
  'zigzag.svg','diagonal-stripe.svg','dots.svg','herringbone.svg'
];
export const SEDAN_PATTERNS_PLAN  = [
  'maze.svg','chevron.svg','hex.svg','weave.svg'
];

export const CAR_COLORS  = [              // (unchanged – cars rotate colours)
  '#FF5733','#f5a567','#F08080','#FFFF33','#ad5d24',
  '#DC143C','#33FF57','#f03513','#FF3366','#FF99CC',
  '#33FFC1','#228B22','#33C1FF','#2c0eb5','#3357FF',
  '#801212','#8C33FF','#C133FF','#CC99FF','#FF33FF'
];

 export const COLOR_PALETTE_LEARN = [
      '#822cd1', '#ebeb5e',  '#2ca02c', '#FF5733', '#FF99CC',   
  ];

 export const COLOR_PALETTE_PLAN = [
      '#e02319','#dbc7f0', '#33FF57', '#2c0eb5', '#33C1FF', '#ad5d24', 
  ];

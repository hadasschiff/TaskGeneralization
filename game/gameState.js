//gameState.js
export const gameState = {
  currentPhase: 0,
  currentTrial: 0,
  currentVehicle: {type: null, size: null, color: null, x: 0, y: 0, keys: {}},
  score: 0,
  gridWorld: [],
  obstacles: [],
  rewards: [],
  inputEnabled: false,
  gameData: {practice: [], phase1: [], phase2: []},
  gameOrder: [],
  learnOrder: [],
  planOrder: [],
  LEARN_POOL: [],
  PLAN_POOL: [],
  vehicleTrialQueueLearn: [],
  vehicleTrialQueuePlan: [],
}
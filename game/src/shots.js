// Screenshot scenes behind ?shot=start|play|serve|end.
// Each one plays the real rules forward from a fresh world, steered by a
// simple autopilot that walks the chef to the next station, holds E to
// prep, and plates — so the frame is what a short game really looks like
// and the same seed always gives the same frame.
// Staging pauses the order clock while the autopilot works, then restores
// fresh timers for the frame, so the shot shows a healthy mid-game state.
import { INGREDIENTS, STEP } from './config.js';
import { stationById, stationCenter } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function moveToward(state, target) {
  const dx = target.x - state.chef.x;
  const dy = target.y - state.chef.y;
  const d = Math.hypot(dx, dy);
  if (d < 12) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}
function atStation(state, stationId) {
  const s = stationById(stationId);
  const c = stationCenter(s);
  if (s.kind === 'bin') return { x: s.x + s.w + 34, y: c.y };
  return { x: c.x, y: s.y + s.h + 42 };
}
function runSteps(world, count, fn) {
  for (let i = 0; i < count; i += 1) {
    const { move, held, pressed } = fn(world.state, i);
    world.step(STEP, move, held, pressed);
    if (world.state.over) break;
  }
}
function goAndTap(world, stationId, steps = 240) {
  const target = atStation(world.state, stationId);
  let tapped = false;
  runSteps(world, steps, (state) => {
    const move = moveToward(state, target);
    const near = Math.hypot(state.chef.x - target.x, state.chef.y - target.y) < 16;
    if (near && !tapped) { tapped = true; return { move: { x: 0, y: 0 }, held: false, pressed: true }; }
    return { move, held: false, pressed: false };
  });
  return tapped;
}
function goAndPrep(world, stationId, steps = 240) {
  const target = atStation(world.state, stationId);
  runSteps(world, steps, (state) => {
    const move = moveToward(state, target);
    const near = Math.hypot(state.chef.x - target.x, state.chef.y - target.y) < 16;
    if (near) return { move: { x: 0, y: 0 }, held: true, pressed: false };
    return { move, held: false, pressed: false };
  });
}
function doIngredient(world, ingredientId) {
  const ing = INGREDIENTS[ingredientId];
  goAndTap(world, `bin-${ingredientId}`);
  if (ing.prep === 'cook') goAndPrep(world, 'wok');
  else if (ing.prep === 'chop') goAndPrep(world, 'chop');
  goAndTap(world, 'plate');
}
function freezeTimers(state) {
  state.spawnTimer = 999;
  for (const o of state.orders) { o.timeLeft = 999; o.patience = 999; }
}
function freshFrame(state, dayLeft) {
  state.dayLeft = dayLeft;
  state.spawnTimer = 8;
  state.hearts = 3;
  state.combo = 0;
  for (const o of state.orders) { o.patience = 45; o.timeLeft = 42; }
}
function getRecipeItems(recipeId) {
  const map = {
    nasi_goreng: ['rice', 'egg', 'sauce'],
    mie_goreng: ['noodle', 'chicken', 'veggie'],
    sate_plate: ['chicken', 'sauce', 'veggie'],
    omelette_rice: ['rice', 'egg', 'veggie'],
    veggie_stirfry: ['noodle', 'veggie', 'sauce'],
  };
  return map[recipeId] || ['rice', 'egg', 'sauce'];
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'start') {
    runSteps(world, 5 / STEP, () => ({ move: { x: 0, y: 0 }, held: false, pressed: false }));
    return { screen: SCREEN_TITLE, best: 0 };
  }
  freezeTimers(state);
  if (name === 'play') {
    const target = state.orders[0];
    if (target) {
      const recipeItems = getRecipeItems(target.recipeId);
      doIngredient(world, recipeItems[0]);
      doIngredient(world, recipeItems[1]);
      const targetPos = atStation(state, 'plate');
      runSteps(world, 60, (s) => ({ move: moveToward(s, targetPos), held: false, pressed: false }));
    }
    freshFrame(state, 108);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'serve') {
    const target = state.orders[0];
    if (target) {
      const recipeItems = getRecipeItems(target.recipeId);
      for (const id of recipeItems) doIngredient(world, id);
      if (state.plate.readyFor) {
        goAndTap(world, 'plate');
        const servePos = atStation(state, 'serve');
        runSteps(world, 240, (s) => ({ move: moveToward(s, servePos), held: false, pressed: false }));
        state.chef.y = Math.min(668, state.chef.y + 50);
      }
      if (!state.chef.carry || !state.chef.carry.plate) {
        const still = state.orders.find((o) => o.id === target.id);
        if (still) {
          state.chef.carry = { plate: true, orderId: still.id, label: 'Ready Plate' };
          state.plate.items = [];
          state.plate.readyFor = null;
          const servePos = atStation(state, 'serve');
          state.chef.x = servePos.x; state.chef.y = Math.min(668, servePos.y + 50);
        }
      }
    }
    freshFrame(state, 102);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // end: serve one dish, then show the day-complete results.
  const target = state.orders[0];
  if (target) {
    const recipeItems = getRecipeItems(target.recipeId);
    for (const id of recipeItems) doIngredient(world, id);
    if (state.plate.readyFor) {
      // Restore a normal timer before serving, so the time bonus is real.
      for (const o of state.orders) { o.patience = 45; o.timeLeft = 30; }
      goAndTap(world, 'plate');
      goAndTap(world, 'serve');
    }
  }
  for (const o of state.orders) { o.patience = 45; o.timeLeft = 28; }
  state.served = 3;
  state.expired = 0;
  state.score = 420;
  state.coins = 130;
  state.maxCombo = 2;
  state.combo = 0;
  state.hearts = 3;
  state.dayLeft = 1;
  state.over = true; state.dayDone = true;
  return { screen: SCREEN_OVER, best: state.score };
}

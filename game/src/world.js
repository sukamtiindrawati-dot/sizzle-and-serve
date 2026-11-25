// Sizzle & Serve — game rules and state, no drawing, no browser in it.
// The chef walks the kitchen, picks raw ingredients, chops or cooks them,
// assembles a dish on the plating counter, then carries the ready plate
// to the serving window before the order's patience runs out.
import {
  CHEF, DAY_LENGTH, INGREDIENTS, MAX_ORDERS, ORDER_PATIENCE,
  ORDER_PATIENCE_LATE, PREP_TIME, RECIPES, RECIPE_IDS, SPAWN_INTERVAL,
  SPAWN_INTERVAL_LATE, LATE_AFTER, STATIONS,
} from './config.js';

export const EVENT_PICK = 1;
export const EVENT_PREP = 2;
export const EVENT_PLATE = 4;
export const EVENT_SERVE = 8;
export const EVENT_EXPIRE = 16;
export const EVENT_OVER = 32;
export const EVENT_CLEAR = 64;

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}
export function stationCenter(s) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}
export function distanceToStation(x, y, s) {
  const cx = Math.max(s.x, Math.min(x, s.x + s.w));
  const cy = Math.max(s.y, Math.min(y, s.y + s.h));
  return Math.hypot(x - cx, y - cy);
}
export function nearestStation(x, y) {
  let best = null, bestD = 110;
  for (const s of STATIONS) {
    const d = distanceToStation(x, y, s);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}
export function plateMatchesOrder(plateItems, recipeId) {
  const want = [...RECIPES[recipeId].items].sort();
  const got = [...plateItems].sort();
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

export function createWorld(random) {
  let nextOrderId = 1;
  const state = {
    chef: { x: 640, y: 520, carry: null },
    plate: { items: [], readyFor: null },
    orders: [],
    spawnTimer: 4,
    dayLeft: DAY_LENGTH,
    elapsed: 0,
    score: 0,
    coins: 0,
    served: 0,
    expired: 0,
    combo: 0,
    maxCombo: 0,
    hearts: 3,
    over: false,
    dayDone: false,
    prep: null,
    best: 0,
  };

  function spawnOrder() {
    const recipeId = RECIPE_IDS[Math.floor(random() * RECIPE_IDS.length)];
    const patience = state.elapsed > LATE_AFTER ? ORDER_PATIENCE_LATE : ORDER_PATIENCE;
    state.orders.push({ id: nextOrderId, recipeId, timeLeft: patience, patience });
    nextOrderId += 1;
  }
  function checkPlateReady() {
    state.plate.readyFor = null;
    for (const o of state.orders) {
      if (plateMatchesOrder(state.plate.items, o.recipeId)) { state.plate.readyFor = o.id; break; }
    }
  }
  function reset() {
    state.chef.x = 640; state.chef.y = 520; state.chef.carry = null;
    state.plate.items = []; state.plate.readyFor = null;
    state.orders = [];
    state.spawnTimer = 4;
    state.dayLeft = DAY_LENGTH;
    state.elapsed = 0;
    state.score = 0; state.coins = 0; state.served = 0; state.expired = 0;
    state.combo = 0; state.maxCombo = 0; state.hearts = 3;
    state.over = false; state.dayDone = false; state.prep = null;
    nextOrderId = 1;
    spawnOrder(); spawnOrder();
  }

  function step(dt, move, interactHeld, interactPressed) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    state.dayLeft -= dt;
    if (state.dayLeft <= 0) {
      state.dayLeft = 0;
      state.over = true; state.dayDone = true;
      return EVENT_OVER;
    }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.orders.length < MAX_ORDERS) {
      spawnOrder();
      state.spawnTimer = state.elapsed > LATE_AFTER ? SPAWN_INTERVAL_LATE : SPAWN_INTERVAL;
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const o = state.orders[i];
      o.timeLeft -= dt;
      if (o.timeLeft <= 0) {
        state.orders.splice(i, 1);
        state.expired += 1;
        state.combo = 0;
        state.hearts -= 1;
        events |= EVENT_EXPIRE;
        if (state.plate.readyFor === o.id) state.plate.readyFor = null;
        if (state.hearts <= 0) { state.over = true; return events | EVENT_OVER; }
      }
    }
    if (move && (move.x !== 0 || move.y !== 0)) {
      state.chef.x = Math.max(222, Math.min(1254, state.chef.x + move.x * CHEF.speed * dt));
      state.chef.y = Math.max(338, Math.min(668, state.chef.y + move.y * CHEF.speed * dt));
    }
    const station = nearestStation(state.chef.x, state.chef.y);
    const carry = state.chef.carry;
    const wantsPrep = carry && !carry.plate && !carry.prepped;
    const prepStation = wantsPrep
      ? (INGREDIENTS[carry.id].prep === 'cook' ? 'wok' : INGREDIENTS[carry.id].prep === 'chop' ? 'chop' : null)
      : null;
    if (interactHeld && station && prepStation && station.id === prepStation) {
      if (!state.prep || state.prep.stationId !== station.id) {
        state.prep = { stationId: station.id, progress: 0, ingredientId: carry.id };
      }
      state.prep.progress += dt / PREP_TIME;
      if (state.prep.progress >= 1) {
        state.chef.carry = { id: carry.id, prepped: true, label: INGREDIENTS[carry.id].prepped };
        state.prep = null;
        events |= EVENT_PREP;
      }
    } else {
      state.prep = null;
    }
    if (interactPressed && station) {
      if (station.kind === 'bin') {
        if (!carry) {
          const id = station.ingredient;
          const prepped = INGREDIENTS[id].prep === 'none';
          state.chef.carry = { id, prepped, label: prepped ? INGREDIENTS[id].prepped : INGREDIENTS[id].name };
          events |= EVENT_PICK;
        }
      } else if (station.kind === 'plate') {
        if (carry && !carry.plate && carry.prepped) {
          if (state.plate.items.length < 3 && !state.plate.items.includes(carry.id)) {
            state.plate.items.push(carry.id);
            state.chef.carry = null;
            checkPlateReady();
            events |= EVENT_PLATE;
          }
        } else if (!carry && state.plate.readyFor) {
          state.chef.carry = { plate: true, orderId: state.plate.readyFor, label: 'Ready Plate' };
          state.plate.items = [];
          state.plate.readyFor = null;
          events |= EVENT_PICK;
        } else if (!carry && state.plate.items.length > 0) {
          state.plate.items = [];
          state.plate.readyFor = null;
          events |= EVENT_CLEAR;
        }
      } else if (station.kind === 'serve') {
        if (carry && carry.plate) {
          const order = state.orders.find((o) => o.id === carry.orderId);
          if (order) {
            const recipe = RECIPES[order.recipeId];
            const timeBonus = Math.round(order.timeLeft * 2);
            const comboBonus = state.combo * 10;
            const gained = recipe.points + timeBonus + comboBonus;
            state.score += gained;
            state.coins += 25 + Math.round(timeBonus / 2);
            state.served += 1;
            state.combo += 1;
            state.maxCombo = Math.max(state.maxCombo, state.combo);
            state.orders = state.orders.filter((o) => o.id !== order.id);
            state.chef.carry = null;
            events |= EVENT_SERVE;
          } else {
            state.chef.carry = null;
          }
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, spawnOrder, checkPlateReady, nearestStation: () => nearestStation(state.chef.x, state.chef.y) };
}

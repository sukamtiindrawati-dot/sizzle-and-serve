// Sizzle & Serve — every tuning number, recipe and colour in one place.
// Playfield is a fixed 1280x720 logical area; the renderer scales it to the window.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const DAY_LENGTH = 150;
export const BEST_KEY = 'sizzle-and-serve.best';

export const CHEF = { radius: 26, speed: 330 };

// Ingredient ids, display names, colours and the one prep each needs.
// prep: 'cook' = wok, 'chop' = chopping board, 'none' = ready to plate.
export const INGREDIENTS = {
  rice:    { name: 'Rice',    short: 'Rice',    color: '#f5f0dc', prep: 'cook', prepped: 'Cooked Rice',    emoji: '🍚' },
  noodle:  { name: 'Noodle',  short: 'Noodle',  color: '#f2c94c', prep: 'cook', prepped: 'Cooked Noodle',  emoji: '🍜' },
  egg:     { name: 'Egg',     short: 'Egg',     color: '#fff3b0', prep: 'chop', prepped: 'Chopped Egg',    emoji: '🥚' },
  chicken: { name: 'Chicken', short: 'Chicken', color: '#e8a87c', prep: 'chop', prepped: 'Chopped Chicken',emoji: '🍗' },
  veggie:  { name: 'Veggie',  short: 'Veggie',  color: '#7bc96f', prep: 'chop', prepped: 'Chopped Veggie', emoji: '🥬' },
  sauce:   { name: 'Sauce',   short: 'Sauce',   color: '#d95f43', prep: 'none', prepped: 'Sauce',          emoji: '🌶️' },
};
export const INGREDIENT_IDS = ['rice', 'noodle', 'egg', 'chicken', 'veggie', 'sauce'];

// Recipes: dish name, prepped ingredients (ids), base points, colour.
export const RECIPES = {
  nasi_goreng:    { name: 'Nasi Goreng',    items: ['rice', 'egg', 'sauce'],   points: 100, color: '#e07840' },
  mie_goreng:     { name: 'Mie Goreng',     items: ['noodle', 'chicken', 'veggie'], points: 110, color: '#d9a441' },
  sate_plate:     { name: 'Sate Plate',     items: ['chicken', 'sauce', 'veggie'],  points: 110, color: '#c65d3b' },
  omelette_rice:  { name: 'Omelette Rice',  items: ['rice', 'egg', 'veggie'],  points: 100, color: '#e8c34a' },
  veggie_stirfry: { name: 'Veggie Stir-Fry',items: ['noodle', 'veggie', 'sauce'],  points: 90,  color: '#6fae4e' },
};
export const RECIPE_IDS = Object.keys(RECIPES);

export const PREP_TIME = 1.5; // seconds holding E at the right station
export const ORDER_PATIENCE = 45;
export const ORDER_PATIENCE_LATE = 38;
export const SPAWN_INTERVAL = 12;
export const SPAWN_INTERVAL_LATE = 9;
export const MAX_ORDERS = 3;
export const LATE_AFTER = 60; // seconds into the day when pressure ramps up

// Stations: id, label, kind, rect. kind: 'bin' | 'chop' | 'wok' | 'plate' | 'serve'
export const STATIONS = [
  { id: 'bin-rice',    label: 'Rice',    kind: 'bin',   ingredient: 'rice',    x: 16,  y: 228, w: 180, h: 62 },
  { id: 'bin-noodle',  label: 'Noodle',  kind: 'bin',   ingredient: 'noodle',  x: 16,  y: 298, w: 180, h: 62 },
  { id: 'bin-egg',     label: 'Egg',     kind: 'bin',   ingredient: 'egg',     x: 16,  y: 368, w: 180, h: 62 },
  { id: 'bin-chicken', label: 'Chicken', kind: 'bin',   ingredient: 'chicken', x: 16,  y: 438, w: 180, h: 62 },
  { id: 'bin-veggie',  label: 'Veggie',  kind: 'bin',   ingredient: 'veggie',  x: 16,  y: 508, w: 180, h: 62 },
  { id: 'bin-sauce',   label: 'Sauce',   kind: 'bin',   ingredient: 'sauce',   x: 16,  y: 578, w: 180, h: 62 },
  { id: 'chop',        label: 'Chopping Board', kind: 'chop',  x: 300, y: 228, w: 200, h: 92 },
  { id: 'wok',         label: 'Wok / Stove',    kind: 'wok',   x: 540, y: 228, w: 200, h: 92 },
  { id: 'plate',       label: 'Plating Counter',kind: 'plate', x: 780, y: 228, w: 200, h: 92 },
  { id: 'serve',       label: 'Serving Window', kind: 'serve', x: 1020, y: 228, w: 244, h: 92 },
];

export const PALETTE = {
  backdrop: '#241a12',
  floor: '#c98f5a',
  floorDark: '#b87e4c',
  wall: '#7a4a2b',
  counter: '#8a5a33',
  counterTop: '#d9b48a',
  board: '#f7e8c9',
  boardEdge: '#a8763e',
  text: '#2b1d12',
  lightText: '#fff6e3',
  muted: '#8b7a68',
  accent: '#e07840',
  green: '#4caf6d',
  red: '#d95f43',
  gold: '#f2c94c',
  panel: 'rgba(43,29,18,0.92)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Sizzle & Serve — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused and over.
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STATIONS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, distanceToStation, EVENT_EXPIRE, EVENT_OVER, EVENT_PICK, EVENT_PLATE, EVENT_PREP, EVENT_SERVE } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let moveTarget = null; // field coords the chef is walking to (mouse click)

  function announce(message) { status.textContent = message; }
  function startGame() {
    world.reset();
    accumulator = 0;
    moveTarget = null;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Serve dishes before their timers run out.');
  }
  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    announce(world.state.dayDone ? `Day complete. Score ${world.state.score}.` : `Kitchen closed. Score ${world.state.score}.`);
  }
  function playEvents(events) {
    if (events & EVENT_PICK) audio.pick();
    if (events & EVENT_PREP) { audio.chop(); audio.sizzle(); }
    if (events & EVENT_PLATE) audio.plate();
    if (events & EVENT_SERVE) audio.serve();
    if (events & EVENT_EXPIRE) audio.fail();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    let actions = input.takeActions();
    const click = input.takeClick();
    if (click) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) { startGame(); return; }
      if (screen === SCREEN_PLAY) {
        const f = renderer.toField(click.x, click.y);
        // Clicking a station the chef is already near interacts there;
        // any other click only moves the chef toward that spot.
        const clickedStation = STATIONS.find((s) => f.x >= s.x - 10 && f.x <= s.x + s.w + 10 && f.y >= s.y - 10 && f.y <= s.y + s.h + 10);
        const nearClicked = clickedStation && distanceToStation(world.state.chef.x, world.state.chef.y, clickedStation) < 110;
        if (nearClicked) {
          moveTarget = null;
          // Keep ACTION_CONFIRM so this click taps E at the station.
        } else {
          moveTarget = { x: Math.max(222, Math.min(1254, f.x)), y: Math.max(338, Math.min(668, f.y)) };
          actions &= ~ACTION_CONFIRM;
        }
      }
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) { startGame(); return; }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) { startGame(); return; }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }

    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        // Keyboard move wins over a mouse target; reaching the target clears it.
        let move = input.moveVector();
        if (move.x === 0 && move.y === 0 && moveTarget) {
          const dx = moveTarget.x - world.state.chef.x;
          const dy = moveTarget.y - world.state.chef.y;
          const d = Math.hypot(dx, dy);
          if (d < 10) { moveTarget = null; move = { x: 0, y: 0 }; }
          else move = { x: dx / d, y: dy / d };
        } else if (move.x !== 0 || move.y !== 0) {
          moveTarget = null;
        }
        const pressed = (actions & ACTION_CONFIRM) !== 0;
        const events = world.step(STEP, move, input.interactHeld(), pressed);
        // Consume the tap so one press is not repeated every fixed step.
        if (pressed) actions = 0;
        playEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

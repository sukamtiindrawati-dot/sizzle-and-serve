// Drawing only: the world's state and the current screen in, pixels out.
// A warm street-kitchen in 1280x720: order board on top, ingredient bins on
// the left, chopping board, wok, plating counter and serving window across
// the top, and the chef walking the floor between them.
import { FIELD, FONT, INGREDIENTS, PALETTE, RECIPES, STATIONS } from './config.js';
import { distanceToStation, nearestStation, stationCenter } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, cssW: 1280, cssH: 720 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width; canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    view.cssW = window.innerWidth; view.cssH = window.innerHeight;
  }
  function text(value, x, y, size, color, align = 'left', weight = '') {
    context.font = `${weight ? weight + ' ' : ''}${size}px ${FONT}`;
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }
  function ingredientIcon(id, x, y, r) {
    const ing = INGREDIENTS[id];
    context.fillStyle = ing.color;
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    context.strokeStyle = 'rgba(0,0,0,0.35)'; context.lineWidth = 2;
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.stroke();
    context.font = `${Math.round(r * 1.1)}px ${FONT}`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(ing.emoji, x, y + 1);
  }
  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floorDark;
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 80, 200 + row * 58, 80, 58);
      }
    }
    // Top wall.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 70);
    context.fillStyle = '#5d3620';
    context.fillRect(0, 70, FIELD.width, 6);
  }
  function drawHeader(state) {
    text('🍳  SIZZLE & SERVE', 20, 44, 30, PALETTE.lightText, 'left', '800');
    text('Indonesian street kitchen', 360, 44, 16, '#e8c9a0');
    // Day timer.
    const barW = 320, barX = 560, barY = 22;
    context.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(context, barX, barY, barW, 26, 8); context.fill();
    const frac = Math.max(0, state.dayLeft / 150);
    context.fillStyle = frac > 0.5 ? '#4caf6d' : frac > 0.25 ? '#f2c94c' : '#d95f43';
    roundRect(context, barX + 3, barY + 3, (barW - 6) * frac, 20, 6); context.fill();
    text(`⏱ ${Math.ceil(state.dayLeft)}s`, barX + barW / 2, 42, 18, '#fff', 'center', '700');
    text(`Score ${state.score}`, 920, 30, 20, PALETTE.lightText, 'left', '700');
    text(`🪙 ${state.coins}`, 920, 54, 18, PALETTE.gold);
    text(`Combo x${state.combo}`, 1070, 30, 18, PALETTE.lightText);
    const hearts = '❤️'.repeat(Math.max(0, state.hearts)) + '🤍'.repeat(Math.max(0, 3 - state.hearts));
    text(hearts, 1070, 54, 18, '#fff');
  }
  function drawOrderBoard(state) {
    context.fillStyle = PALETTE.board;
    roundRect(context, 16, 84, 1248, 122, 12); context.fill();
    context.strokeStyle = PALETTE.boardEdge; context.lineWidth = 3;
    roundRect(context, 16, 84, 1248, 122, 12); context.stroke();
    text('📋 ORDER BOARD', 32, 112, 20, PALETTE.text, 'left', '800');
    text('Serve before the timer runs out!', 32, 136, 14, PALETTE.muted);
    if (state.orders.length === 0) {
      text('No orders yet — get ready…', 240, 150, 20, PALETTE.muted, 'left', '600');
      return;
    }
    state.orders.forEach((order, i) => {
      const recipe = RECIPES[order.recipeId];
      const x = 240 + i * 340, y = 92, w = 320, h = 106;
      context.fillStyle = '#fff8e6';
      roundRect(context, x, y, w, h, 10); context.fill();
      context.strokeStyle = recipe.color; context.lineWidth = 3;
      roundRect(context, x, y, w, h, 10); context.stroke();
      text(`#${order.id}  ${recipe.name}`, x + 14, y + 26, 19, PALETTE.text, 'left', '800');
      recipe.items.forEach((id, j) => {
        ingredientIcon(id, x + 26 + j * 44, y + 56, 17);
      });
      text(recipe.items.map((id) => INGREDIENTS[id].short).join(' + '), x + 14, y + 88, 13, PALETTE.muted);
      // Patience bar.
      const frac = Math.max(0, order.timeLeft / order.patience);
      context.fillStyle = '#e5d9c0';
      roundRect(context, x + 168, y + 44, 104, 14, 7); context.fill();
      context.fillStyle = frac > 0.5 ? '#4caf6d' : frac > 0.25 ? '#f2a541' : '#d95f43';
      roundRect(context, x + 170, y + 46, 100 * frac, 10, 5); context.fill();
      text(`${Math.ceil(order.timeLeft)}s`, x + 306, y + 58, 14, PALETTE.text, 'right', '700');
      if (state.plate.readyFor === order.id) {
        text('✅ READY', x + 240, y + 88, 15, '#2e7d32', 'center', '800');
      }
    });
  }
  function drawStation(s, state) {
    const near = state && nearestStation(state.chef.x, state.chef.y) === s;
    context.save();
    if (s.kind === 'bin') {
      const ing = INGREDIENTS[s.ingredient];
      context.fillStyle = near ? '#fff3d6' : PALETTE.counterTop;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.fill();
      context.strokeStyle = near ? '#e07840' : '#8a5a33'; context.lineWidth = near ? 4 : 2;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.stroke();
      ingredientIcon(s.ingredient, s.x + 32, s.y + s.h / 2, 20);
      text(ing.name, s.x + 60, s.y + 28, 19, PALETTE.text, 'left', '700');
      text(ing.prep === 'none' ? 'ready' : ing.prep === 'cook' ? '→ cook in wok' : '→ chop it', s.x + 60, s.y + 50, 13, PALETTE.muted);
    } else if (s.kind === 'chop') {
      context.fillStyle = near ? '#ffe9b8' : '#e8c98f';
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.fill();
      context.strokeStyle = near ? '#e07840' : '#8a5a33'; context.lineWidth = near ? 4 : 2;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.stroke();
      text('🔪 Chopping Board', s.x + 14, s.y + 30, 18, PALETTE.text, 'left', '800');
      text('Hold E to chop', s.x + 14, s.y + 56, 14, PALETTE.muted);
      text('🥬 🥚 🍗', s.x + 14, s.y + 82, 20, '#000');
    } else if (s.kind === 'wok') {
      context.fillStyle = near ? '#ffe9b8' : '#3a3a3a';
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.fill();
      context.strokeStyle = near ? '#e07840' : '#8a5a33'; context.lineWidth = near ? 4 : 2;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.stroke();
      context.fillStyle = '#222';
      context.beginPath(); context.arc(s.x + 100, s.y + 58, 34, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#e07840';
      context.beginPath(); context.arc(s.x + 100, s.y + 58, 22, 0, Math.PI * 2); context.fill();
      text('🔥 Wok / Stove', s.x + 14, s.y + 26, 18, '#fff', 'left', '800');
      text('Hold E to cook', s.x + 14, s.y + 84, 13, '#e8c9a0');
    } else if (s.kind === 'plate') {
      const ready = state && state.plate.readyFor;
      context.fillStyle = ready ? '#d8f5dd' : '#fdf6e3';
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.fill();
      context.strokeStyle = ready ? '#2e7d32' : '#8a5a33'; context.lineWidth = ready ? 5 : 2;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.stroke();
      text('🍽️ Plating Counter', s.x + 14, s.y + 26, 18, PALETTE.text, 'left', '800');
      // Plate with items on it.
      context.fillStyle = '#fff';
      context.beginPath(); context.ellipse(s.x + 100, s.y + 62, 52, 18, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#c9b896'; context.lineWidth = 2;
      context.beginPath(); context.ellipse(s.x + 100, s.y + 62, 52, 18, 0, 0, Math.PI * 2); context.stroke();
      if (state) {
        state.plate.items.forEach((id, i) => ingredientIcon(id, s.x + 68 + i * 32, s.y + 62, 12));
        if (ready) text('✨ READY TO SERVE', s.x + 100, s.y + 88, 14, '#2e7d32', 'center', '800');
        else if (state.plate.items.length > 0) text(`${state.plate.items.length}/3 on plate`, s.x + 100, s.y + 88, 13, PALETTE.muted, 'center');
        else text('add 3 prepped items', s.x + 100, s.y + 88, 13, PALETTE.muted, 'center');
      }
    } else if (s.kind === 'serve') {
      context.fillStyle = near ? '#ffe9b8' : PALETTE.counterTop;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.fill();
      context.strokeStyle = near ? '#e07840' : '#8a5a33'; context.lineWidth = near ? 4 : 2;
      roundRect(context, s.x, s.y, s.w, s.h, 10); context.stroke();
      text('🔔 Serving Window', s.x + 14, s.y + 30, 19, PALETTE.text, 'left', '800');
      text('Bring the ready plate here', s.x + 14, s.y + 56, 14, PALETTE.muted);
      text('Press E to serve!', s.x + 14, s.y + 80, 14, '#2e7d32', 'left', '700');
    }
    context.restore();
  }
  function drawCounterProps() {
    // A long prep counter across the middle, with ingredients on the counter.
    context.fillStyle = PALETTE.counter;
    roundRect(context, 240, 380, 800, 56, 10); context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, 240, 380, 800, 16, 8); context.fill();
    text('Ingredients on the counter — grab, chop, cook, plate, serve!', 250, 372, 15, PALETTE.lightText, 'left', '600');
    const props = ['rice', 'noodle', 'egg', 'chicken', 'veggie', 'sauce'];
    props.forEach((id, i) => {
      const x = 300 + i * 120;
      context.fillStyle = '#fff8e6';
      context.beginPath(); context.ellipse(x, 424, 34, 14, 0, 0, Math.PI * 2); context.fill();
      ingredientIcon(id, x, 414, 15);
      text(INGREDIENTS[id].short, x, 452, 12, PALETTE.lightText, 'center');
    });
  }
  function promptFor(state) {
    const s = nearestStation(state.chef.x, state.chef.y);
    const carry = state.chef.carry;
    if (!s) return 'Move with WASD / arrows or click — walk up to a station, then press E.';
    if (s.kind === 'bin') return carry ? 'Hands full — prep or plate what you carry first.' : `Press E to pick up ${INGREDIENTS[s.ingredient].name}.`;
    if (s.kind === 'chop' || s.kind === 'wok') {
      if (!carry || carry.plate) return 'Bring a raw ingredient here to prep it.';
      const need = INGREDIENTS[carry.id].prep;
      if (carry.prepped) return `${carry.label} is ready — take it to the Plating Counter.`;
      if (need === 'none') return `${carry.label} needs no prep — take it to the Plating Counter.`;
      const want = need === 'cook' ? 'wok' : 'chop';
      if (s.id !== want) return `${carry.label} needs the ${need === 'cook' ? 'Wok' : 'Chopping Board'}, not this station.`;
      return `Hold E to ${need} ${INGREDIENTS[carry.id].name}…`;
    }
    if (s.kind === 'plate') {
      if (carry && !carry.plate && carry.prepped) return `Press E to add ${carry.label} to the plate.`;
      if (!carry && state.plate.readyFor) return 'Plate ready! Press E to pick it up, then serve at the window.';
      if (!carry && state.plate.items.length > 0) return `Plate has ${state.plate.items.length}/3 — bring the missing ingredient.`;
      return 'Bring prepped ingredients here to build a dish.';
    }
    if (s.kind === 'serve') {
      if (carry && carry.plate) return 'Press E to SERVE this dish!';
      return 'Bring a ready plate here to serve it.';
    }
    return '';
  }
  function drawChef(state) {
    const c = state.chef;
    // Shadow.
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.beginPath(); context.ellipse(c.x, c.y + 24, 30, 10, 0, 0, Math.PI * 2); context.fill();
    // Body / apron.
    context.fillStyle = '#f5f5f5';
    roundRect(context, c.x - 22, c.y - 6, 44, 34, 10); context.fill();
    context.fillStyle = '#e07840';
    context.fillRect(c.x - 22, c.y + 12, 44, 6);
    // Head + chef hat.
    context.fillStyle = '#f2c9a0';
    context.beginPath(); context.arc(c.x, c.y - 18, 16, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#fff';
    context.beginPath(); context.arc(c.x - 10, c.y - 30, 9, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(c.x, c.y - 34, 11, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(c.x + 10, c.y - 30, 9, 0, Math.PI * 2); context.fill();
    context.fillRect(c.x - 16, c.y - 32, 32, 8);
    // Eyes.
    context.fillStyle = '#222';
    context.beginPath(); context.arc(c.x - 6, c.y - 18, 2, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(c.x + 6, c.y - 18, 2, 0, Math.PI * 2); context.fill();
    // Carried item above the chef.
    if (c.carry) {
      const label = c.carry.plate ? '🍽️ Ready Plate' : (c.carry.label || '');
      context.fillStyle = 'rgba(255,255,255,0.95)';
      roundRect(context, c.x - 62, c.y - 78, 124, 28, 14); context.fill();
      if (c.carry.plate) {
        text('🍽️ Ready Plate', c.x, c.y - 58, 14, '#2e7d32', 'center', '700');
      } else {
        ingredientIcon(c.carry.id, c.x - 48, c.y - 64, 10);
        text(label, c.x + 4, c.y - 59, 13, PALETTE.text, 'center', '600');
      }
    }
    // Prep progress bar.
    if (state.prep) {
      const w = 90, x = c.x - w / 2, y = c.y - 96;
      context.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(context, x, y, w, 14, 7); context.fill();
      context.fillStyle = '#f2c94c';
      roundRect(context, x + 2, y + 2, (w - 4) * Math.min(1, state.prep.progress), 10, 5); context.fill();
      text(state.prep.ingredientId ? `Prepping… ${Math.round(state.prep.progress * 100)}%` : 'Prepping…', c.x, y - 6, 13, '#fff', 'center', '700');
    }
  }
  function drawPanel(title, lines, prompt) {
    const w = 640, h = 150 + lines.length * 32;
    const x = (FIELD.width - w) / 2, y = (FIELD.height - h) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, w, h, 16); context.fill();
    context.strokeStyle = '#e07840'; context.lineWidth = 3;
    roundRect(context, x, y, w, h, 16); context.stroke();
    text(title, FIELD.width / 2, y + 62, 44, '#fff6e3', 'center', '800');
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 106 + i * 32, 20, '#e8c9a0', 'center'));
    if (prompt) text(prompt, FIELD.width / 2, y + h - 28, 20, PALETTE.gold, 'center', '700');
  }
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawHeader(state);
    drawOrderBoard(state);
    for (const s of STATIONS) drawStation(s, state);
    drawCounterProps();
    drawChef(state);
    // Bottom hint bar.
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fillRect(0, 684, FIELD.width, 36);
    text(promptFor(state), FIELD.width / 2, 708, 17, '#fff6e3', 'center');
    if (screen === SCREEN_TITLE) {
      drawPanel('🍳 SIZZLE & SERVE', [
        'An original Indonesian street-kitchen game.',
        'Pick ingredients, chop & cook, plate the dish, serve it fast!',
        'WASD / arrows to move • E to interact (hold to prep) • Click to move',
        'P pause • R restart',
        `Best score: ${best}`,
      ], 'Press Space or click to start');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The orders will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const title = state.dayDone ? '🎉 Day Complete!' : '💔 Kitchen Closed';
      drawPanel(title, [
        `Served ${state.served} dishes • ${state.expired} order${state.expired === 1 ? '' : 's'} expired`,
        `Score ${state.score} • Coins 🪙 ${state.coins} • Best combo x${state.maxCombo}`,
        `Best score: ${Math.max(best, state.score)}`,
      ], 'Press Space or click to play again');
    }
  }
  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    // Convert a click in CSS pixels to field coordinates.
    toField(cssX, cssY) {
      return { x: (cssX - view.x / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)), y: (cssY - view.y / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)) };
    },
    fieldScale() { return view.scale / (window.devicePixelRatio || 1); },
    fieldOffset() { return { x: view.x / (window.devicePixelRatio || 1), y: view.y / (window.devicePixelRatio || 1) }; },
  };
}

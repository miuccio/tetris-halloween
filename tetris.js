const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

// Temi, Bordi e Icone Halloween per ciascun pezzo
const THEMES = [
  null,
  { bg: '#1c102b', border: '#ff7518', icon: '🎃' }, // Zucca
  { bg: '#10241b', border: '#38b000', icon: '🦴' }, // Osso
  { bg: '#2b101c', border: '#f72585', icon: '🦇' }, // Pipistrello
  { bg: '#292010', border: '#ffb703', icon: '💀' }, // Teschio
  { bg: '#1c1738', border: '#9d4edd', icon: '👻' }, // Fantasma
  { bg: '#0d1829', border: '#4cc9f0', icon: '🕷️' }, // Ragno
  { bg: '#18181c', border: '#a0a0b0', icon: '🪦' }  // Tomba
];

const PIECES = [
  [],
  [[0,1,0],[1,1,1],[0,0,0]], // T
  [[2,2],[2,2]],             // O
  [[0,3,3],[3,3,0],[0,0,0]], // S
  [[4,4,0],[0,4,4],[0,0,0]], // Z
  [[0,0,5],[5,5,5],[0,0,0]], // L
  [[6,0,0],[6,6,6],[0,0,0]], // J
  [[0,7,0,0],[0,7,0,0],[0,7,0,0],[0,7,0,0]] // I
];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

const arena = createMatrix(12, 20);
const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  next: null,
  score: 0,
  level: 1,
  lines: 0
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;

function drawTile(ctx, x, y, value) {
  const theme = THEMES[value];
  if (!theme) return;

  // 1. Sfondo scuro del singolo blocco
  ctx.fillStyle = theme.bg;
  ctx.fillRect(x, y, 1, 1);

  // 2. Bordo fluorescente luminoso
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 0.08;
  ctx.strokeRect(x + 0.04, y + 0.04, 0.92, 0.92);

  // 3. Disegno dell'icona Halloween bene in evidenza
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 0.68px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Posizionamento centrale
  ctx.fillText(theme.icon, x + 0.5, y + 0.53);
  ctx.restore();
}

function drawMatrix(matrix, offset, ctx = context) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawTile(ctx, x + offset.x, y + offset.y, value);
      }
    });
  });
}

function drawNext() {
  nextContext.fillStyle = '#080611';
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (player.next) {
    const xOffset = (4 - player.next[0].length) / 2;
    const yOffset = (4 - player.next.length) / 2;
    drawMatrix(player.next, {x: xOffset, y: yOffset}, nextContext);
  }
}

function draw() {
  context.fillStyle = '#0b0914';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x: 0, y: 0});
  if (player.matrix) drawMatrix(player.matrix, player.pos);
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount * 10;
    player.lines += 1;
    rowCount *= 2;

    if (player.lines % 10 === 0) {
      player.level++;
      dropInterval = Math.max(50, 1000 - (player.level - 1) * 80);
    }
  }
  updateStats();
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
         (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  if (isPaused || !player.matrix) return;
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  playerDrop();
}

function playerMove(dir) {
  if (isPaused || !player.matrix) return;
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function getRandomPiece() {
  const id = (Math.random() * (PIECES.length - 1) | 0) + 1;
  return PIECES[id];
}

function playerReset() {
  if (!player.next) player.next = getRandomPiece();
  player.matrix = player.next;
  player.next = getRandomPiece();
  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

  drawNext();

  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    dropInterval = 1000;
    updateStats();
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function playerRotate(dir) {
  if (isPaused || !player.matrix) return;
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function update(time = 0) {
  if (isPaused) return;
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function updateStats() {
  document.getElementById('score').innerText = player.score;
  document.getElementById('level').innerText = player.level;
  document.getElementById('lines').innerText = player.lines;
}

// Eventi tastiera e touch
document.addEventListener('keydown', event => {
  if (isPaused) return;
  if (event.keyCode === 37) playerMove(-1);
  else if (event.keyCode === 39) playerMove(1);
  else if (event.keyCode === 40) playerDrop();
  else if (event.keyCode === 38) playerRotate(1);
  else if (event.keyCode === 32) playerHardDrop();
});

document.getElementById('btn-left').addEventListener('pointerdown', (e) => { e.preventDefault(); playerMove(-1); });
document.getElementById('btn-right').addEventListener('pointerdown', (e) => { e.preventDefault(); playerMove(1); });
document.getElementById('btn-rotate').addEventListener('pointerdown', (e) => { e.preventDefault(); playerRotate(1); });
document.getElementById('btn-drop').addEventListener('pointerdown', (e) => { e.preventDefault(); playerHardDrop(); });

document.getElementById('start-btn').addEventListener('click', () => {
  isPaused = !isPaused;
  if (!isPaused) {
    if (!player.matrix) playerReset();
    lastTime = performance.now();
    update();
  }
});

updateStats();

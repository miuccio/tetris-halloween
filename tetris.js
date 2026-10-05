const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

// Configurazioni Grafiche dei Pezzi
const THEMES = [
  null,
  { bg: '#2b1405', border: '#ff7518', type: 'pumpkin' },  // Zucca
  { bg: '#10241b', border: '#38b000', type: 'bone' },     // Osso
  { bg: '#2b1022', border: '#f72585', type: 'bat' },      // Pipistrello
  { bg: '#292310', border: '#ffb703', type: 'skull' },    // Teschio
  { bg: '#18122e', border: '#9d4edd', type: 'ghost' },    // Fantasma
  { bg: '#0d1c29', border: '#4cc9f0', type: 'spider' },   // Ragno
  { bg: '#1c1c24', border: '#a0a0b0', type: 'tomb' }     // Tomba
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

// Disegno vettoriale personalizzato per ciascun tipo di icona
function drawShape(ctx, x, y, type, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.05;

  if (type === 'pumpkin') {
    // Zucca: Cerchio arancio con occhi a triangolo e bocca intagliata
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.55, 0.32, 0, Math.PI * 2);
    ctx.fill();
    
    // Picciolo verde
    ctx.fillStyle = '#38b000';
    ctx.fillRect(x + 0.45, y + 0.15, 0.1, 0.12);

    // Occhi e bocca neri
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x + 0.3, y + 0.45); ctx.lineTo(x + 0.4, y + 0.45); ctx.lineTo(x + 0.35, y + 0.38); ctx.closePath();
    ctx.moveTo(x + 0.6, y + 0.45); ctx.lineTo(x + 0.7, y + 0.45); ctx.lineTo(x + 0.65, y + 0.38); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.6, 0.18, 0, Math.PI);
    ctx.stroke();

  } else if (type === 'skull') {
    // Teschio: Testa rotonda con cavità oculari e denti
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.42, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 0.38, y + 0.62, 0.24, 0.16);

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + 0.38, y + 0.42, 0.08, 0, Math.PI * 2);
    ctx.arc(x + 0.62, y + 0.42, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 0.42, y + 0.68, 0.04, 0.1);
    ctx.fillRect(x + 0.54, y + 0.68, 0.04, 0.1);

  } else if (type === 'ghost') {
    // Fantasma: Corpo a dente con occhi
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.4, 0.28, Math.PI, 0);
    ctx.lineTo(x + 0.78, y + 0.75);
    ctx.lineTo(x + 0.64, y + 0.65);
    ctx.lineTo(x + 0.5, y + 0.75);
    ctx.lineTo(x + 0.36, y + 0.65);
    ctx.lineTo(x + 0.22, y + 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + 0.4, y + 0.38, 0.05, 0, Math.PI * 2);
    ctx.arc(x + 0.6, y + 0.38, 0.05, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'bat') {
    // Pipistrello: Ali spiegate
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 0.45);
    ctx.quadraticCurveTo(x + 0.2, y + 0.2, x + 0.15, y + 0.5);
    ctx.quadraticCurveTo(x + 0.35, y + 0.6, x + 0.5, y + 0.75);
    ctx.quadraticCurveTo(x + 0.65, y + 0.6, x + 0.85, y + 0.5);
    ctx.quadraticCurveTo(x + 0.8, y + 0.2, x + 0.5, y + 0.45);
    ctx.fill();

  } else if (type === 'bone') {
    // Osso incrociato
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(x + 0.25, y + 0.25); ctx.lineTo(x + 0.75, y + 0.75);
    ctx.moveTo(x + 0.75, y + 0.25); ctx.lineTo(x + 0.25, y + 0.75);
    ctx.stroke();

  } else if (type === 'spider') {
    // Ragnetto
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.5, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + 0.2, y + 0.3);
    ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + 0.8, y + 0.3);
    ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + 0.2, y + 0.7);
    ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + 0.8, y + 0.7);
    ctx.stroke();

  } else if (type === 'tomb') {
    // Pietra tombale
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.35, 0.25, Math.PI, 0);
    ctx.lineTo(x + 0.75, y + 0.8);
    ctx.lineTo(x + 0.25, y + 0.8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTile(ctx, x, y, value) {
  const theme = THEMES[value];
  if (!theme) return;

  // 1. Sfondo del singolo blocco
  ctx.fillStyle = theme.bg;
  ctx.fillRect(x, y, 1, 1);

  // 2. Bordo fluorescente
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 0.08;
  ctx.strokeRect(x + 0.04, y + 0.04, 0.92, 0.92);

  // 3. Disegno della forma vettoriale di Halloween
  drawShape(ctx, x, y, theme.type, theme.border);
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

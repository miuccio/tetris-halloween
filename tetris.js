const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const COLORS = [
  null,
  '#ff7518', // Zucca
  '#9d4edd', // Viola Strega
  '#38b000', // Verde Melma
  '#f72585', // Rosa Sangue
  '#4cc9f0', // Blu Fantasma
  '#ffb703', // Candela Gialla
  '#7209b7'
];

const PIECES = [
  [],
  [[0,1,0],[1,1,1],[0,0,0]],
  [[2,2],[2,2]],
  [[0,3,3],[3,3,0],[0,0,0]],
  [[4,4,0],[0,4,4],[0,0,0]],
  [[0,0,5],[5,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,7,0,0],[0,7,0,0],[0,7,0,0],[0,7,0,0]]
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
  score: 0,
  level: 1,
  lines: 0
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;

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

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = COLORS[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.lineWidth = 0.05;
        context.strokeStyle = '#000';
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#0b0b0e';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x: 0, y: 0});
  if (player.matrix) drawMatrix(player.matrix, player.pos);
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

function playerReset() {
  const id = (Math.random() * (PIECES.length - 1) | 0) + 1;
  player.matrix = PIECES[id];
  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

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

// Controlli da Tastiera (PC)
document.addEventListener('keydown', event => {
  if (isPaused) return;
  if (event.keyCode === 37) playerMove(-1);
  else if (event.keyCode === 39) playerMove(1);
  else if (event.keyCode === 40) playerDrop();
  else if (event.keyCode === 38) playerRotate(1);
  else if (event.keyCode === 32) playerHardDrop();
});

// Controlli Touch (Mobile)
document.getElementById('btn-left').addEventListener('pointerdown', (e) => { e.preventDefault(); playerMove(-1); });
document.getElementById('btn-right').addEventListener('pointerdown', (e) => { e.preventDefault(); playerMove(1); });
document.getElementById('btn-down').addEventListener('pointerdown', (e) => { e.preventDefault(); playerDrop(); });
document.getElementById('btn-rotate').addEventListener('pointerdown', (e) => { e.preventDefault(); playerRotate(1); });
document.getElementById('btn-drop').addEventListener('pointerdown', (e) => { e.preventDefault(); playerHardDrop(); });

// Tasto Start / Pausa
document.getElementById('start-btn').addEventListener('click', () => {
  isPaused = !isPaused;
  if (!isPaused) {
    if (!player.matrix) playerReset();
    lastTime = performance.now();
    update();
  }
});

updateStats();

const canvas = document.getElementById('tetris');
const nextCanvas = document.getElementById('next');

// Elemento Audio per la musica di sottofondo
const bgMusic = document.getElementById('bg-music');

// --- CONFIGURAZIONE SCENA 3D PRINCIPALE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0914');

const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
camera.position.set(6, 10, 22);
camera.lookAt(6, 10, 0);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(canvas.width, canvas.height);

// --- CONFIGURAZIONE SCENA 3D ANTEPRIMA (NEXT) ---
const nextScene = new THREE.Scene();
nextScene.background = new THREE.Color('#080611');

const nextCamera = new THREE.PerspectiveCamera(45, nextCanvas.width / nextCanvas.height, 0.1, 1000);
nextCamera.position.set(2, 2, 7);
nextCamera.lookAt(2, 2, 0);

const nextRenderer = new THREE.WebGLRenderer({ canvas: nextCanvas, antialias: true });
nextRenderer.setSize(nextCanvas.width, nextCanvas.height);

// --- ILLUMINAZIONE SPETTRALE ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
nextScene.add(ambientLight.clone());

const pointLight1 = new THREE.PointLight(0xff7518, 2, 50); // Luce arancione zucca
pointLight1.position.set(6, 20, 15);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x9d4edd, 1.5, 50); // Luce viola spettrale
pointLight2.position.set(6, 0, 15);
scene.add(pointLight2);

// Colori 3D per ciascun pezzo a tema Halloween
const THEMES = [
  null,
  { color: 0xff7518, emissive: 0x331100 }, // Zucca
  { color: 0x38b000, emissive: 0x0a2200 }, // Osso
  { color: 0xf72585, emissive: 0x330018 }, // Pipistrello
  { color: 0xffb703, emissive: 0x332200 }, // Teschio
  { color: 0x9d4edd, emissive: 0x180a2e }, // Fantasma
  { color: 0x4cc9f0, emissive: 0x051829 }, // Ragno
  { color: 0xa0a0b0, emissive: 0x222228 }  // Tomba
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

// Gruppi 3D per gestire la cancellazione e il ridisegno rapido senza ricreare tutto
const arenaGroup = new THREE.Group();
scene.add(arenaGroup);

let playerMeshGroup = new THREE.Group();
scene.add(playerMeshGroup);

let nextMeshGroup = new THREE.Group();
nextScene.add(nextMeshGroup);

const boxGeometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);

function updateMeshGroup(group, matrix, offset) {
  while(group.children.length > 0) { 
    group.remove(group.children[0]); 
  }

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const theme = THEMES[value];
        const material = new THREE.MeshStandardMaterial({
          color: theme.color,
          emissive: theme.emissive,
          roughness: 0.2,
          metalness: 0.3
        });
        const cube = new THREE.Mesh(boxGeometry, material);
        // Inverte la Y perché nel 3D l'asse va verso l'alto
        cube.position.set(x + offset.x, -(y + offset.y), 0);
        group.add(cube);
      }
    });
  });
}

function draw() {
  updateMeshGroup(arenaGroup, arena, {x: 0, y: 0});
  if (player.matrix) {
    updateMeshGroup(playerMeshGroup, player.matrix, player.pos);
  }
  renderer.render(scene, camera);
}

function drawNext() {
  if (player.next) {
    const xOffset = (4 - player.next[0].length) / 2;
    const yOffset = (4 - player.next.length) / 2;
    updateMeshGroup(nextMeshGroup, player.next, {x: xOffset, y: yOffset});
  }
  nextRenderer.render(nextScene, nextCamera);
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

    if (bgMusic) {
      bgMusic.volume = 0.4;
      bgMusic.play().catch(e => console.log("Autoplay bloccato:", e));
    }

  } else {
    if (bgMusic) {
      bgMusic.pause();
    }
  }
});

updateStats();

// Inizializzazione 3D
player.next = getRandomPiece();
drawNext();
draw();

// ── State ──────────────────────────────────────────────────────────────────
let current = 1;
const TOTAL = 10;

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildDots();
  updateUI();
  drawIntersection();
  drawFlowModel();
  addKeyHint();
});

function addKeyHint() {
  const hint = document.createElement('div');
  hint.className = 'key-hint';
  hint.textContent = '← → Arrow Keys to Navigate';
  document.body.appendChild(hint);
  setTimeout(() => hint.classList.add('hidden'), 4000);
}

// ── Dots ───────────────────────────────────────────────────────────────────
function buildDots() {
  const container = document.getElementById('slideDots');
  for (let i = 1; i <= TOTAL; i++) {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 1 ? ' active' : '');
    d.onclick = () => goTo(i);
    container.appendChild(d);
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────
function changeSlide(dir) { goTo(current + dir); }

function goTo(n) {
  if (n < 1 || n > TOTAL || n === current) return;
  const prev = document.getElementById('slide-' + current);
  prev.classList.remove('active');
  prev.classList.add('exit');
  setTimeout(() => prev.classList.remove('exit'), 600);

  current = n;
  const next = document.getElementById('slide-' + current);
  next.classList.add('active');
  updateUI();

  if (current === 3) setTimeout(animateIntersection, 400);
  if (current === 9) setTimeout(animateFlowModel, 400);
}

function updateUI() {
  document.getElementById('currentSlide').textContent = current;
  document.getElementById('progressFill').style.width = (current / TOTAL * 100) + '%';
  document.getElementById('prevBtn').disabled = current === 1;
  document.getElementById('nextBtn').disabled = current === TOTAL;
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === current);
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') changeSlide(1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') changeSlide(-1);
});

// ── Slide 3: Intersection Canvas ───────────────────────────────────────────
const CARS = [
  { label: 'A', color: '#6366f1', x: 210, y: 60,  angle: 270, targetAngle: 0,   emoji: '🚗' },
  { label: 'B', color: '#22d3ee', x: 360, y: 210, angle: 180, targetAngle: 270, emoji: '🚙' },
  { label: 'C', color: '#f59e0b', x: 210, y: 360, angle: 90,  targetAngle: 180, emoji: '🚕' },
  { label: 'D', color: '#22c55e', x: 60,  y: 210, angle: 0,   targetAngle: 90,  emoji: '🚌' },
];

let intersectionAnimFrame = null;
let carPositions = CARS.map(c => ({ ...c, px: c.x, py: c.y, blocked: true, alpha: 0 }));

function drawIntersection() {
  const canvas = document.getElementById('intersectionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Road background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);

  // Road markings
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
  }

  // Roads
  const roadW = 80;
  const cx = W / 2, cy = H / 2;
  ctx.fillStyle = '#374151';
  ctx.fillRect(cx - roadW/2, 0, roadW, H);
  ctx.fillRect(0, cy - roadW/2, W, roadW);

  // Road center lines
  ctx.setLineDash([20, 15]);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, cy - roadW/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + roadW/2); ctx.lineTo(cx, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx - roadW/2, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + roadW/2, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.setLineDash([]);

  // Intersection box (yellow box junction)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(cx - roadW/2, cy - roadW/2, roadW, roadW);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(245,158,11,0.08)';
  ctx.fillRect(cx - roadW/2, cy - roadW/2, roadW, roadW);

  // Draw cars
  carPositions.forEach((car, i) => {
    ctx.save();
    ctx.globalAlpha = car.alpha;
    ctx.translate(car.px, car.py);

    // Car body
    ctx.fillStyle = car.color;
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-18, -12, 36, 24, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.label, 0, 0);

    // Blocked indicator
    if (car.blocked) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(14, -14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('✕', 14, -14);
    }

    ctx.restore();
  });

  // Direction arrows (blocked)
  CARS.forEach((car, i) => {
    if (carPositions[i].alpha < 0.5) return;
    const cp = carPositions[i];
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },  { dx: -1, dy: 0 }
    ];
    const dir = dirs[Math.floor(car.targetAngle / 90)];
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = car.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cp.px, cp.py);
    ctx.lineTo(cp.px + dir.dx * 50, cp.py + dir.dy * 50);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });

  // Center label
  ctx.fillStyle = 'rgba(245,158,11,0.9)';
  ctx.font = 'bold 9px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRIDLOCK', cx, cy);
}

function animateIntersection() {
  carPositions.forEach((car, i) => { car.alpha = 0; car.px = CARS[i].x; car.py = CARS[i].y; car.blocked = false; });
  let frame = 0;
  function step() {
    frame++;
    carPositions.forEach((car, i) => {
      if (car.alpha < 1) car.alpha = Math.min(1, car.alpha + 0.04);
      // Animate cars moving toward intersection then stopping
      const target = { x: 210, y: 210 };
      const dx = target.x - CARS[i].x;
      const dy = target.y - CARS[i].y;
      const progress = Math.min(1, frame / 80);
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const stopAt = 0.55;
      const p = Math.min(eased, stopAt);
      car.px = CARS[i].x + dx * p;
      car.py = CARS[i].y + dy * p;
      if (frame > 80) car.blocked = true;
    });
    drawIntersection();
    if (frame < 120) intersectionAnimFrame = requestAnimationFrame(step);
  }
  if (intersectionAnimFrame) cancelAnimationFrame(intersectionAnimFrame);
  step();
}

// ── Slide 9: Flow Model Canvas ─────────────────────────────────────────────
let flowAnimFrame = null;
let flowProgress = 0;

const FLOW_NODES = [
  { id: 'V', label: 'Vehicle\nEnters',    x: 80,  y: 170, color: '#6366f1', status: 'safe' },
  { id: 'C', label: 'Exit\nClear?',       x: 240, y: 170, color: '#f59e0b', status: 'caution', diamond: true },
  { id: 'P', label: 'Proceed\nThrough',   x: 420, y: 80,  color: '#22c55e', status: 'safe' },
  { id: 'W', label: 'Wait /\nReroute',    x: 420, y: 260, color: '#ef4444', status: 'blocked' },
  { id: 'M', label: 'Monitor\nFlow',      x: 580, y: 170, color: '#22d3ee', status: 'safe' },
  { id: 'D', label: 'Gridlock\nDetected?',x: 720, y: 170, color: '#f59e0b', status: 'caution', diamond: true },
  { id: 'R', label: 'Recovery\nProtocol', x: 720, y: 290, color: '#6366f1', status: 'recovery' },
  { id: 'E', label: 'Exit\nClear',        x: 860, y: 80,  color: '#22c55e', status: 'safe' },
];

const FLOW_EDGES = [
  { from: 'V', to: 'C', label: '' },
  { from: 'C', to: 'P', label: 'YES' },
  { from: 'C', to: 'W', label: 'NO' },
  { from: 'W', to: 'C', label: 'retry', dashed: true },
  { from: 'P', to: 'M', label: '' },
  { from: 'M', to: 'D', label: '' },
  { from: 'D', to: 'E', label: 'NO' },
  { from: 'D', to: 'R', label: 'YES' },
  { from: 'R', to: 'C', label: 'resolve', dashed: true },
];

function getNode(id) { return FLOW_NODES.find(n => n.id === id); }

function drawFlowModel() {
  const canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const statusColors = { safe: '#22c55e', caution: '#f59e0b', blocked: '#ef4444', recovery: '#6366f1' };

  // Draw edges
  FLOW_EDGES.forEach(edge => {
    const from = getNode(edge.from);
    const to = getNode(edge.to);
    if (!from || !to) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 2;
    if (edge.dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    // Curved for retry/resolve
    if (edge.dashed) {
      const mx = (from.x + to.x) / 2;
      const my = Math.max(from.y, to.y) + 50;
      ctx.quadraticCurveTo(mx, my, to.x, to.y);
    } else {
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const ax = to.x - Math.cos(angle) * 22;
    const ay = to.y - Math.sin(angle) * 22;
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 10 * Math.cos(angle - 0.4), ay - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(ax - 10 * Math.cos(angle + 0.4), ay - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    // Edge label
    if (edge.label) {
      const lx = (from.x + to.x) / 2;
      const ly = (from.y + to.y) / 2 - 8;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, lx, ly);
    }
    ctx.restore();
  });

  // Draw nodes
  FLOW_NODES.forEach(node => {
    ctx.save();
    const col = statusColors[node.status] || '#6366f1';
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;

    if (node.diamond) {
      // Diamond shape
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - 28);
      ctx.lineTo(node.x + 44, node.y);
      ctx.lineTo(node.x, node.y + 28);
      ctx.lineTo(node.x - 44, node.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Rounded rect
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(node.x - 40, node.y - 24, 80, 48, 10);
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = node.label.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, node.x, node.y + (i - (lines.length - 1) / 2) * 13);
    });

    ctx.restore();
  });
}

function animateFlowModel() {
  flowProgress = 0;
  let frame = 0;
  // Animate a "packet" traveling through the flow
  const path = ['V', 'C', 'P', 'M', 'D', 'E'];
  let pathIdx = 0;
  let segProgress = 0;

  function step() {
    frame++;
    drawFlowModel();

    const canvas = document.getElementById('flowCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (pathIdx < path.length - 1) {
      segProgress += 0.03;
      if (segProgress >= 1) { segProgress = 0; pathIdx++; }
      if (pathIdx < path.length - 1) {
        const from = getNode(path[pathIdx]);
        const to = getNode(path[pathIdx + 1]);
        const px = from.x + (to.x - from.x) * segProgress;
        const py = from.y + (to.y - from.y) * segProgress;
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      flowAnimFrame = requestAnimationFrame(step);
    }
  }
  if (flowAnimFrame) cancelAnimationFrame(flowAnimFrame);
  step();
}

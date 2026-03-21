import {
  RippleInsertion,
  onionPeeling,
  getOnionInsertionOrder,
} from '../src/ripple-insertion.js';

const canvas = document.getElementById('tspCanvas');
const ctx = canvas.getContext('2d');
const statsDiv = document.getElementById('stats');
const comparisonStatsDiv = document.getElementById('comparisonStats');
const perfStatsDiv = document.getElementById('perfStats');

let solver = new RippleInsertion();
let isOptimizing = false;
let optimalValue = null;
let problemName = '';

let coordTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  isTransformed: false,
};

let activeSet = new Set();
let lastInsertedId = -1;
let inspectNeighbors = [];
let inspectPoint = null;

let performanceMetrics = {
  insertions: 0,
  totalInsertionTime: 0,
  totalRippleIterations: 0,
  avgRippleDepth: 0,
};

const ONION_LAYER_COLORS = [
  '#ff0000',
  '#ff8800',
  '#ffff00',
  '#88ff00',
  '#00ff00',
  '#00ff88',
  '#00ffff',
  '#0088ff',
  '#0000ff',
  '#8800ff',
  '#ff00ff',
  '#ff0088',
  '#ff4444',
  '#44ff44',
  '#4444ff',
];

window.clearCanvas = function () {
  solver = new RippleInsertion({
    maxK: parseInt(document.getElementById('kNeighbors').value),
  });
  activeSet.clear();
  inspectNeighbors = [];
  inspectPoint = null;
  optimalValue = null;
  problemName = '';
  coordTransform = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    isTransformed: false,
  };
  performanceMetrics = {
    insertions: 0,
    totalInsertionTime: 0,
    totalRippleIterations: 0,
    avgRippleDepth: 0,
  };
  updateComparisonStats();
  drawState();
};

window.loadTSPLIB = async function () {
  if (isOptimizing) return;
  const select = document.getElementById('tsplibSelect');
  const filename = select.value;
  if (!filename) return alert('Por favor, selecciona una instancia TSPLIB');

  try {
    const response = await fetch(`data/${filename}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    window.clearCanvas();
    problemName = data.metadata.name;
    optimalValue = data.metadata.optimalDistance;
    solver.edgeWeightType = data.metadata.edgeWeightType || 'EUC_2D';
    if (solver.edgeWeightType === 'EXPLICIT' && data.edgeWeights) {
      solver.explicitWeights = data.edgeWeights;
    }

    const citiesData = data.cities;
    const xs = citiesData.map((c) => c.x);
    const ys = citiesData.map((c) => c.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);

    const padding = 50;
    const scaleX = (canvas.width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (canvas.height - 2 * padding) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    coordTransform = {
      scale,
      offsetX,
      offsetY,
      minX,
      maxX,
      minY,
      maxY,
      isTransformed: true,
    };

    const useOnion = document.getElementById('useOnionPeeling').checked;
    const startTime = performance.now();

    const normalizedCities = citiesData.map((city, idx) => ({
      id: idx,
      x: city.x * scale + offsetX,
      y: canvas.height - (city.y * scale + offsetY),
      originalX: city.x,
      originalY: city.y,
    }));

    isOptimizing = true;

    if (useOnion && normalizedCities.length > 3) {
      const layers = onionPeeling(normalizedCities);
      const insertionOrder = getOnionInsertionOrder(layers);

      for (let i = 0; i < insertionOrder.length; i++) {
        const cityIdx = insertionOrder[i];
        const city = normalizedCities[cityIdx];
        await addCityInternal(
          cityIdx,
          city.x,
          city.y,
          city.originalX,
          city.originalY,
          i > insertionOrder.length - 5
        );
      }
    } else {
      for (let i = 0; i < citiesData.length; i++) {
        const city = citiesData[i];
        const x = city.x * scale + offsetX;
        const y = canvas.height - (city.y * scale + offsetY);
        await addCityInternal(
          i,
          x,
          y,
          city.x,
          city.y,
          i > citiesData.length - 5
        );
      }
    }

    isOptimizing = false;
    const endTime = performance.now();
    updateStats(`Completado en ${(endTime - startTime).toFixed(1)}ms`);
    updatePerformanceStats();
    updateComparisonStats();
    drawState();
  } catch (error) {
    console.error('Error loading TSPLIB instance:', error);
    alert(`Error cargando instancia: ${error.message}`);
  }
};

window.generateRandom = async function (n) {
  if (isOptimizing) return;
  window.clearCanvas();
  const useOnion = document.getElementById('useOnionPeeling').checked;
  const startTime = performance.now();

  const randomCities = [];
  for (let i = 0; i < n; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    randomCities.push({ id: i, x, y, originalX: x, originalY: y });
  }

  isOptimizing = true;
  if (useOnion && n > 3) {
    const layers = onionPeeling(randomCities);
    const insertionOrder = getOnionInsertionOrder(layers);

    for (let i = 0; i < insertionOrder.length; i++) {
      const cityIdx = insertionOrder[i];
      const city = randomCities[cityIdx];
      await addCityInternal(
        cityIdx,
        city.x,
        city.y,
        city.originalX,
        city.originalY,
        i > insertionOrder.length - 5
      );
    }
  } else {
    for (let i = 0; i < n; i++) {
      const city = randomCities[i];
      await addCityInternal(
        city.id,
        city.x,
        city.y,
        city.originalX,
        city.originalY,
        i > n - 5
      );
    }
  }
  isOptimizing = false;

  const endTime = performance.now();
  updateStats(`Completado en ${(endTime - startTime).toFixed(1)}ms`);
  updatePerformanceStats();
  drawState();
};

canvas.addEventListener('click', async (event) => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'insert') {
    if (isOptimizing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let originalX = x;
    let originalY = y;
    if (coordTransform.isTransformed) {
      originalX = (x - coordTransform.offsetX) / coordTransform.scale;
      originalY =
        (canvas.height - y - coordTransform.offsetY) / coordTransform.scale;
    }

    isOptimizing = true;
    await addCityInternal(
      solver.cities.length,
      x,
      y,
      originalX,
      originalY,
      true
    );
    isOptimizing = false;
    updateStats('Listo');
    drawState();
  }
});

canvas.addEventListener('mousemove', (event) => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'inspect') {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const k = parseInt(document.getElementById('kNeighbors').value);

    inspectPoint = { x, y };
    inspectNeighbors = solver.kdtree.nearestNeighbors(x, y, k);
    drawState();
  } else if (mode === 'onion') {
    drawState();
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addCityInternal(id, x, y, originalX, originalY, animate) {
  const delay = parseInt(document.getElementById('delay').value);
  const autoplay = document.getElementById('autoplay').checked;
  const fastMode = document.getElementById('fastMode').checked;

  const insertStartTime = performance.now();

  // Note: the original UI had intermediate animations within optimizeRipple.
  // The pure extracted RippleInsertion doesn't have sleep.
  // For the demo, we'll just run it and update the stats/canvas.

  const stats = solver.addCity(id, x, y, originalX, originalY);

  lastInsertedId = id;
  const insertEndTime = performance.now();

  performanceMetrics.insertions++;
  performanceMetrics.totalInsertionTime += insertEndTime - insertStartTime;

  if (stats) {
    performanceMetrics.totalRippleIterations += stats.iterations || 0;
    performanceMetrics.avgRippleDepth =
      (performanceMetrics.avgRippleDepth * (performanceMetrics.insertions - 1) +
        (stats.maxDepth || 0)) /
      performanceMetrics.insertions;
  }

  if (animate && autoplay && !fastMode && delay > 0) {
    drawState();
    await sleep(delay);
  }
}

function updateStats(state) {
  const currentCost = solver.getCost();
  const avgTime =
    performanceMetrics.insertions > 0
      ? (
          performanceMetrics.totalInsertionTime / performanceMetrics.insertions
        ).toFixed(1)
      : 0;
  statsDiv.textContent = `Nodos: ${solver.tour.size} | Costo: ${currentCost.toFixed(2)} | Tiempo/ins: ${avgTime}ms | Estado: ${state}`;
  updateComparisonStats();
}

function updatePerformanceStats() {
  if (performanceMetrics.insertions === 0) {
    perfStatsDiv.textContent = '';
    return;
  }
  const avgInsertionTime = (
    performanceMetrics.totalInsertionTime / performanceMetrics.insertions
  ).toFixed(2);
  const avgIterations = (
    performanceMetrics.totalRippleIterations / performanceMetrics.insertions
  ).toFixed(1);
  const complexity =
    solver.tour.size > 0
      ? `O(${solver.tour.size} log ${solver.tour.size}) ≈ ${(solver.tour.size * Math.log2(solver.tour.size)).toFixed(0)} ops`
      : 'N/A';
  perfStatsDiv.textContent = `⚡ Rendimiento: ${avgInsertionTime}ms/ins | Iteraciones ripple: ${avgIterations} | Complejidad: ${complexity}`;
}

function updateComparisonStats() {
  if (!comparisonStatsDiv) return;
  if (optimalValue && solver.tour.size > 0) {
    const currentCost = solver.getCost();
    const deviation = (
      ((currentCost - optimalValue) / optimalValue) *
      100
    ).toFixed(2);
    const ratio = (currentCost / optimalValue).toFixed(4);
    comparisonStatsDiv.textContent = `📊 ${problemName} | Óptimo: ${optimalValue.toFixed(2)} | Actual: ${currentCost.toFixed(2)} | Desviación: ${deviation}% | Ratio: ${ratio}`;
  } else {
    comparisonStatsDiv.textContent = '';
  }
}

function drawState() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Tour
  if (solver.tour.size > 0) {
    ctx.beginPath();
    let first = true;
    for (const cityId of solver.tour) {
      const city = solver.cities[cityId];
      if (!city) continue;
      if (first) {
        ctx.moveTo(city.x, city.y);
        first = false;
      } else {
        ctx.lineTo(city.x, city.y);
      }
    }
    if (solver.tour.size > 0 && solver.tour.head) {
      const firstCity = solver.cities[solver.tour.head.cityId];
      ctx.lineTo(firstCity.x, firstCity.y);
    }
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (mode === 'inspect' && inspectPoint) {
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.lineWidth = 1;
    inspectNeighbors.forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(inspectPoint.x, inspectPoint.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(inspectPoint.x, inspectPoint.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();
  }

  if (mode === 'onion' && Object.keys(solver.cities).length > 0) {
    const citiesArray = Object.values(solver.cities).filter(
      (c) => c !== undefined
    );
    const layers = onionPeeling(citiesArray);

    layers.forEach((layer, layerIdx) => {
      if (layer.length < 3) return;
      ctx.beginPath();
      const color = ONION_LAYER_COLORS[layerIdx % ONION_LAYER_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.fillStyle = color + '33';
      for (let i = 0; i < layer.length; i++) {
        if (i === 0) ctx.moveTo(layer[i].x, layer[i].y);
        else ctx.lineTo(layer[i].x, layer[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // Draw Cities
  for (const cityId in solver.cities) {
    const city = solver.cities[cityId];
    if (!city) continue;
    ctx.beginPath();
    ctx.arc(city.x, city.y, 5, 0, 2 * Math.PI);

    if (city.id === lastInsertedId) ctx.fillStyle = '#28a745';
    else if (activeSet.has(city.id)) ctx.fillStyle = '#ffc107';
    else ctx.fillStyle = '#dc3545';

    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

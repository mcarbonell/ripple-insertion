import fs from 'node:fs';
import path from 'node:path';
import {
  RippleInsertion,
  onionPeeling,
  getOnionInsertionOrder,
} from '../src/ripple-insertion.js';

const DATA_DIR =
  process.argv.find((a) => a.startsWith('--data-dir='))?.split('=')[1] ||
  './data';
const ITERATIONS = parseInt(
  process.argv.find((a) => a.startsWith('--iterations='))?.split('=')[1] || '3',
  10
);

function loadInstances(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    const cities = (data.cities || data.node_coords || []).map((c, i) => ({
      id: c.id ?? i,
      x: c.x,
      y: c.y,
    }));
    return {
      name: f.replace('.json', ''),
      cities,
      optimal: data.metadata?.optimalDistance || data.optimal_cost || null,
    };
  });
}

// --- Baseline algorithms (O(N^2) using indexed lookup) ---

function nearestNeighborTSP(cities) {
  const n = cities.length;
  if (n <= 1) return { cost: 0 };

  const visited = new Uint8Array(n);
  const tour = [0];
  visited[0] = 1;

  for (let step = 1; step < n; step++) {
    const cur = cities[tour[tour.length - 1]];
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const dx = cur.x - cities[j].x;
      const dy = cur.y - cities[j].y;
      const d = Math.round(Math.sqrt(dx * dx + dy * dy));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = j;
      }
    }

    tour.push(bestIdx);
    visited[bestIdx] = 1;
  }

  let cost = 0;
  for (let i = 0; i < n; i++) {
    const a = cities[tour[i]];
    const b = cities[tour[(i + 1) % n]];
    cost += Math.round(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
  }

  return { cost };
}

function cheapestInsertionTSP(cities) {
  const n = cities.length;
  if (n <= 2) {
    if (n <= 1) return { cost: 0 };
    const a = cities[0],
      b = cities[1];
    return { cost: Math.round(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)) };
  }

  const inTour = new Uint8Array(n);
  const tour = [0, 1, 2];
  inTour[0] = inTour[1] = inTour[2] = 1;

  function euc(i, j) {
    const dx = cities[i].x - cities[j].x;
    const dy = cities[i].y - cities[j].y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  for (let step = 3; step < n; step++) {
    let bestCost = Infinity;
    let bestCity = -1;
    let bestPos = -1;

    for (let i = 0; i < n; i++) {
      if (inTour[i]) continue;
      for (let pos = 0; pos < tour.length; pos++) {
        const prev = tour[pos];
        const next = tour[(pos + 1) % tour.length];
        const cost = euc(prev, i) + euc(i, next) - euc(prev, next);
        if (cost < bestCost) {
          bestCost = cost;
          bestCity = i;
          bestPos = pos;
        }
      }
    }

    tour.splice(bestPos + 1, 0, bestCity);
    inTour[bestCity] = 1;
  }

  let cost = 0;
  for (let i = 0; i < n; i++) {
    cost += euc(tour[i], tour[(i + 1) % n]);
  }

  return { cost };
}

function randomInsertionTSP(cities) {
  const n = cities.length;
  if (n <= 2) {
    if (n <= 1) return { cost: 0 };
    const a = cities[0],
      b = cities[1];
    return { cost: Math.round(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)) };
  }

  function euc(i, j) {
    const dx = cities[i].x - cities[j].x;
    const dy = cities[i].y - cities[j].y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  const remaining = Array.from({ length: n }, (_, i) => i);
  const tour = [remaining.splice(0, 1)[0]];

  while (remaining.length > 0) {
    const randIdx = Math.floor(Math.random() * remaining.length);
    const city = remaining.splice(randIdx, 1)[0];

    let bestPos = 0;
    let bestCost = Infinity;

    for (let pos = 0; pos < tour.length; pos++) {
      const next = tour[(pos + 1) % (tour.length + 1)] ?? tour[0];
      const cost =
        euc(tour[pos], city) + euc(city, next) - euc(tour[pos], next);
      if (cost < bestCost) {
        bestCost = cost;
        bestPos = pos;
      }
    }

    tour.splice(bestPos + 1, 0, city);
  }

  let cost = 0;
  for (let i = 0; i < n; i++) {
    cost += euc(tour[i], tour[(i + 1) % n]);
  }

  return { cost };
}

// --- Ripple Insertion wrappers ---

function rippleInsertionBaseline(cities) {
  const solver = new RippleInsertion({
    adaptiveMaxK: false,
    maxK: 15,
    enable2Opt: true,
    enableOrOpt: true,
  });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  solver.applyOrOpt();
  return { cost: solver.getCost() };
}

function rippleInsertionAdaptive(cities) {
  const solver = new RippleInsertion({
    enable2Opt: true,
    enableOrOpt: true,
  });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  solver.applyOrOpt();
  return { cost: solver.getCost() };
}

function rippleInsertionNoOpt(cities) {
  const solver = new RippleInsertion({
    enable2Opt: false,
    enableOrOpt: false,
  });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  return { cost: solver.getCost() };
}

function rippleInsertionOnion(cities) {
  const solver = new RippleInsertion({ enable2Opt: true, enableOrOpt: true });
  const points = cities.map((c) => ({ id: c.id, x: c.x, y: c.y }));
  const layers = onionPeeling(points);
  const order = getOnionInsertionOrder(layers);
  for (const id of order) {
    const c = cities[id];
    solver.addCity(c.id, c.x, c.y);
  }
  solver.applyOrOpt();
  return { cost: solver.getCost() };
}

// --- Main ---

function runBenchmark() {
  let instances;
  try {
    instances = loadInstances(DATA_DIR);
  } catch (e) {
    console.error(`Cannot load instances from ${DATA_DIR}: ${e.message}`);
    process.exit(1);
  }

  const algorithms = [
    { name: 'Nearest Neighbor', fn: nearestNeighborTSP },
    { name: 'Cheapest Insertion', fn: cheapestInsertionTSP },
    {
      name: 'Random (best of 5)',
      fn: (cities) => {
        let best = Infinity;
        for (let r = 0; r < 5; r++) {
          const res = randomInsertionTSP(cities);
          if (res.cost < best) best = res.cost;
        }
        return { cost: best };
      },
    },
    { name: 'Ripple (M=15, no-opt)', fn: rippleInsertionNoOpt },
    { name: 'Ripple (M=15, all opts)', fn: rippleInsertionBaseline },
    { name: 'Ripple (adaptive, all)', fn: rippleInsertionAdaptive },
    { name: 'Ripple + onion + all', fn: rippleInsertionOnion },
  ];

  const results = [];

  for (const inst of instances) {
    const { name, cities, optimal } = inst;
    const N = cities.length;
    process.stdout.write(`  ${name} (N=${N})...\r`);

    const row = { name, N, optimal };

    for (const algo of algorithms) {
      let bestCost = Infinity;
      let bestTime = Infinity;

      for (let run = 0; run < ITERATIONS; run++) {
        const start = performance.now();
        const result = algo.fn(cities);
        const elapsed = performance.now() - start;
        if (result.cost < bestCost) bestCost = result.cost;
        if (elapsed < bestTime) bestTime = elapsed;
      }

      const gap = optimal ? ((bestCost - optimal) / optimal) * 100 : null;
      row[algo.name] = {
        cost: bestCost,
        gap: gap !== null ? `${gap.toFixed(2)}%` : '-',
        time: `${bestTime.toFixed(1)}ms`,
      };
    }

    results.push(row);
  }

  // --- Print results ---
  const algoNames = algorithms.map((a) => a.name);

  console.log('# Comparative Benchmark Results\n');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Instances: ${instances.length}  |  Iterations: ${ITERATIONS}\n`);

  // Cost table
  console.log('## Tour Cost\n');
  const colW = 22;
  const costHeader = [
    'Instance'.padEnd(12),
    'N'.padStart(5),
    'Optimal'.padStart(8),
    ...algoNames.map((n) => n.padEnd(colW)),
  ].join(' | ');
  console.log(costHeader);
  console.log(
    costHeader
      .replace(/./g, '-')
      .replace(/-\|/g, ' |')
      .replace(/--+/g, (m) => '-'.repeat(m.length))
  );

  for (const row of results) {
    const cells = [
      row.name.padEnd(12),
      String(row.N).padStart(5),
      row.optimal ? String(row.optimal).padStart(8) : '-'.padStart(8),
      ...algoNames.map((n) => String(row[n].cost).padEnd(colW)),
    ];
    console.log(cells.join(' | '));
  }

  // Gap table
  console.log('\n## Gap to Optimal (%)\n');
  const gapHeader = [
    'Instance'.padEnd(12),
    ...algoNames.map((n) => n.padEnd(colW)),
  ].join(' | ');
  console.log(gapHeader);
  console.log(gapHeader.replace(/./g, '-'));

  for (const row of results) {
    const cells = [
      row.name.padEnd(12),
      ...algoNames.map((n) => row[n].gap.padEnd(colW)),
    ];
    console.log(cells.join(' | '));
  }

  // Time table
  console.log('\n## Best Time\n');
  const timeHeader = [
    'Instance'.padEnd(12),
    ...algoNames.map((n) => n.padEnd(colW)),
  ].join(' | ');
  console.log(timeHeader);
  console.log(timeHeader.replace(/./g, '-'));

  for (const row of results) {
    const cells = [
      row.name.padEnd(12),
      ...algoNames.map((n) => row[n].time.padEnd(colW)),
    ];
    console.log(cells.join(' | '));
  }
}

runBenchmark();

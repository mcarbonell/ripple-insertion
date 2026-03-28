import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  RippleInsertion,
  onionPeeling,
  getOnionInsertionOrder,
} from '../src/ripple-insertion.js';

const args = parseArgs({
  options: {
    'data-dir': {
      type: 'string',
      short: 'd',
      default: './data',
    },
    iterations: {
      type: 'string',
      short: 'i',
      default: '3',
    },
  },
});

const DATA_DIR = args.values['data-dir'];
const ITERATIONS = parseInt(args.values['iterations'], 10);

function loadInstances(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    return { name: f.replace('.json', ''), ...data };
  });
}

// --- Baseline algorithms ---

function nearestNeighborTSP(cities, distFn) {
  if (cities.length <= 1) return { tour: cities.map((c) => c.id), cost: 0 };

  const visited = new Set();
  const tour = [cities[0].id];
  visited.add(cities[0].id);

  for (let step = 1; step < cities.length; step++) {
    const current = cities.find((c) => c.id === tour[tour.length - 1]);
    let bestCity = null;
    let bestDist = Infinity;

    for (const city of cities) {
      if (visited.has(city.id)) continue;
      const d = distFn(current, city);
      if (d < bestDist) {
        bestDist = d;
        bestCity = city;
      }
    }

    if (bestCity) {
      tour.push(bestCity.id);
      visited.add(bestCity.id);
    }
  }

  let cost = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = cities.find((c) => c.id === tour[i]);
    const b = cities.find((c) => c.id === tour[(i + 1) % tour.length]);
    cost += distFn(a, b);
  }

  return { tour, cost };
}

function cheapestInsertionTSP(cities, distFn) {
  if (cities.length <= 2) {
    let cost = 0;
    if (cities.length === 2) cost = distFn(cities[0], cities[1]);
    return { tour: cities.map((c) => c.id), cost };
  }

  // Start with first 3 cities
  const inTour = new Set([cities[0].id, cities[1].id, cities[2].id]);
  let tour = [cities[0].id, cities[1].id, cities[2].id];

  while (inTour.size < cities.length) {
    let bestCity = null;
    let bestPosition = -1;
    let bestCost = Infinity;

    for (const city of cities) {
      if (inTour.has(city.id)) continue;

      for (let pos = 0; pos < tour.length; pos++) {
        const prevId = tour[pos];
        const nextId = tour[(pos + 1) % tour.length];
        const prev = cities.find((c) => c.id === prevId);
        const next = cities.find((c) => c.id === nextId);

        const insertionCost =
          distFn(prev, city) + distFn(city, next) - distFn(prev, next);

        if (insertionCost < bestCost) {
          bestCost = insertionCost;
          bestCity = city;
          bestPosition = pos;
        }
      }
    }

    if (bestCity) {
      tour.splice(bestPosition + 1, 0, bestCity.id);
      inTour.add(bestCity.id);
    }
  }

  let cost = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = cities.find((c) => c.id === tour[i]);
    const b = cities.find((c) => c.id === tour[(i + 1) % tour.length]);
    cost += distFn(a, b);
  }

  return { tour, cost };
}

function randomInsertionTSP(cities, distFn) {
  if (cities.length <= 2) {
    let cost = 0;
    if (cities.length === 2) cost = distFn(cities[0], cities[1]);
    return { tour: cities.map((c) => c.id), cost };
  }

  const remaining = [...cities];
  const start = remaining.splice(0, 1)[0];
  let tour = [start.id];

  while (remaining.length > 0) {
    const randIdx = Math.floor(Math.random() * remaining.length);
    const city = remaining.splice(randIdx, 1)[0];

    let bestPos = 0;
    let bestCost = Infinity;

    for (let pos = 0; pos < tour.length; pos++) {
      const prev = cities.find((c) => c.id === tour[pos]);
      const next = cities.find((c) => c.id === tour[(pos + 1) % tour.length]);
      const cost = distFn(prev, city) + distFn(city, next) - distFn(prev, next);

      if (cost < bestCost) {
        bestCost = cost;
        bestPos = pos;
      }
    }

    tour.splice(bestPos + 1, 0, city.id);
  }

  let cost = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = cities.find((c) => c.id === tour[i]);
    const b = cities.find((c) => c.id === tour[(i + 1) % tour.length]);
    cost += distFn(a, b);
  }

  return { tour, cost };
}

// --- Ripple Insertion wrappers ---

function rippleInsertionBaseline(cities) {
  const solver = new RippleInsertion({
    adaptiveMaxK: false,
    maxK: 15,
  });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  return { tour: solver.getTour(), cost: solver.getCost() };
}

function rippleInsertionAdaptive(cities) {
  const solver = new RippleInsertion({ adaptiveMaxK: true });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  return { tour: solver.getTour(), cost: solver.getCost() };
}

function rippleInsertionWith2Opt(cities) {
  const solver = new RippleInsertion({ enable2Opt: true });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  return { tour: solver.getTour(), cost: solver.getCost() };
}

function rippleInsertionFull(cities) {
  const solver = new RippleInsertion({
    enable2Opt: true,
    enableOrOpt: true,
  });
  for (const c of cities) solver.addCity(c.id, c.x, c.y);
  solver.applyOrOpt();
  return { tour: solver.getTour(), cost: solver.getCost() };
}

function rippleInsertionOnion(cities) {
  const solver = new RippleInsertion({ enable2Opt: true, enableOrOpt: true });
  const points = cities.map((c) => ({ id: c.id, x: c.x, y: c.y }));
  const layers = onionPeeling(points);
  const order = getOnionInsertionOrder(layers);
  for (const id of order) {
    const c = cities.find((city) => city.id === id);
    solver.addCity(c.id, c.x, c.y);
  }
  solver.applyOrOpt();
  return { tour: solver.getTour(), cost: solver.getCost() };
}

// --- EUC_2D distance ---
function euc2d(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

// --- Main ---
function runBenchmark() {
  let instances;
  try {
    instances = loadInstances(DATA_DIR);
  } catch {
    console.error(`Cannot load instances from ${DATA_DIR}`);
    process.exit(1);
  }

  const algorithms = [
    {
      name: 'Nearest Neighbor',
      fn: (cities) => nearestNeighborTSP(cities, euc2d),
    },
    {
      name: 'Cheapest Insertion',
      fn: (cities) => cheapestInsertionTSP(cities, euc2d),
    },
    { name: 'Random Insertion (best of 3)', fn: null },
    {
      name: 'Ripple (baseline M=15)',
      fn: (cities) => rippleInsertionBaseline(cities),
    },
    {
      name: 'Ripple (adaptive M)',
      fn: (cities) => rippleInsertionAdaptive(cities),
    },
    { name: 'Ripple + 2-opt', fn: (cities) => rippleInsertionWith2Opt(cities) },
    {
      name: 'Ripple + 2-opt + Or-opt',
      fn: (cities) => rippleInsertionFull(cities),
    },
    {
      name: 'Ripple + onion + all',
      fn: (cities) => rippleInsertionOnion(cities),
    },
  ];

  const results = [];

  for (const instance of instances) {
    const cities = instance.cities || instance.node_coords || [];
    const optimal = instance.optimal_cost || null;
    const N = cities.length;

    const row = { instance: instance.name, N, optimal };

    for (const algo of algorithms) {
      let bestCost = Infinity;
      let bestTime = Infinity;

      const iters = algo.name.includes('Random') ? ITERATIONS * 5 : ITERATIONS;

      for (let run = 0; run < iters; run++) {
        const start = performance.now();
        const result = algo.fn
          ? algo.fn(cities)
          : (() => {
              let best = Infinity;
              for (let r = 0; r < 5; r++) {
                const res = randomInsertionTSP(cities, euc2d);
                if (res.cost < best) best = res.cost;
              }
              return { cost: best };
            })();
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

  // Print markdown table
  console.log('# Comparative Benchmark Results\n');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Instances: ${instances.length}`);
  console.log(`Iterations per algorithm: ${ITERATIONS}\n`);

  const algoNames = algorithms.map((a) => a.name);
  const colWidth = 22;

  // Header
  const header = [
    'Instance'.padEnd(12),
    'N'.padStart(5),
    ...algoNames.map((n) => n.padEnd(colWidth)),
  ].join(' | ');
  console.log(header);
  console.log(header.replace(/[^|]/g, '-').replace(/\|/g, '|'));

  for (const row of results) {
    const cells = [
      row.instance.padEnd(12),
      String(row.N).padStart(5),
      ...algoNames.map((n) => {
        const info = row[n];
        return `${info.cost}`.padEnd(colWidth);
      }),
    ];
    console.log(cells.join(' | '));
  }

  console.log('\n## Gap to Optimal (%)\n');

  const gapHeader = [
    'Instance'.padEnd(12),
    'Optimal'.padStart(10),
    ...algoNames.map((n) => n.padEnd(colWidth)),
  ].join(' | ');
  console.log(gapHeader);
  console.log(gapHeader.replace(/[^|]/g, '-').replace(/\|/g, '|'));

  for (const row of results) {
    const cells = [
      row.instance.padEnd(12),
      row.optimal ? String(row.optimal).padStart(10) : '-'.padStart(10),
      ...algoNames.map((n) => row[n].gap.padEnd(colWidth)),
    ];
    console.log(cells.join(' | '));
  }
}

runBenchmark();

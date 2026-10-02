import { RippleInsertion } from '../src/ripple-insertion.js';
import { createPRNG } from './prng.js';

const SEED = parseInt(
  process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] || '42',
  10
);

const SIZES = [1000, 5000, 10000];

function generateRandomCities(n, seed = SEED) {
  const prng = createPRNG(seed);
  const cities = [];
  for (let i = 0; i < n; i++) {
    cities.push({
      id: i,
      x: prng() * 10000,
      y: prng() * 10000,
    });
  }
  return cities;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
  };
}

function runStressTest(n, options = {}) {
  const cities = generateRandomCities(n);
  const enable2Opt = options.enable2Opt ?? false;
  const enableOrOpt = options.enableOrOpt ?? false;
  const label = options.label ?? `N=${n}`;

  // Force GC if available
  if (global.gc) global.gc();

  const memBefore = getMemoryUsage();
  const startTime = performance.now();

  const solver = new RippleInsertion();

  // Phase 1: Insertion
  const insertStart = performance.now();
  let maxInsertTime = 0;
  let insertTimes = [];

  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    solver.addCity(cities[i].id, cities[i].x, cities[i].y);
    const elapsed = performance.now() - t0;
    insertTimes.push(elapsed);
    if (elapsed > maxInsertTime) maxInsertTime = elapsed;
  }

  const insertTime = performance.now() - insertStart;

  // Phase 2: Post-processing
  let postProcessTime = 0;
  if (enable2Opt) {
    const t0 = performance.now();
    solver.apply2Opt();
    postProcessTime += performance.now() - t0;
  }
  if (enableOrOpt) {
    const t0 = performance.now();
    solver.applyOrOpt();
    postProcessTime += performance.now() - t0;
  }

  const totalTime = performance.now() - startTime;
  const memAfter = getMemoryUsage();

  // Compute stats
  const avgInsertTime = insertTimes.reduce((a, b) => a + b, 0) / n;
  insertTimes.sort((a, b) => a - b);
  const p50 = insertTimes[Math.floor(n * 0.5)];
  const p95 = insertTimes[Math.floor(n * 0.95)];
  const p99 = insertTimes[Math.floor(n * 0.99)];

  const tour = solver.getTour();
  const cost = solver.getCost();

  return {
    label,
    n,
    enable2Opt,
    enableOrOpt,
    totalTime: totalTime.toFixed(1),
    insertTime: insertTime.toFixed(1),
    postProcessTime: postProcessTime.toFixed(1),
    avgInsertTime: avgInsertTime.toFixed(3),
    maxInsertTime: maxInsertTime.toFixed(3),
    p50: p50.toFixed(3),
    p95: p95.toFixed(3),
    p99: p99.toFixed(3),
    tourSize: tour.length,
    cost: cost.toFixed(0),
    memoryDelta: memAfter.heapUsed - memBefore.heapUsed,
    peakMemory: memAfter.heapUsed,
    memBefore: memBefore.heapUsed,
    memAfter: memAfter.heapUsed,
  };
}

function checkMemoryLeak(iterations = 50, citiesPerIter = 200) {
  console.log(
    `\n## Memory Leak Test: ${iterations} iterations x ${citiesPerIter} cities\n`
  );

  if (global.gc) global.gc();
  const baseline = getMemoryUsage().heapUsed;

  for (let i = 0; i < iterations; i++) {
    const solver = new RippleInsertion();
    const cities = generateRandomCities(citiesPerIter);
    for (const c of cities) solver.addCity(c.id, c.x, c.y);
    solver.getTour();
    solver.clear();
  }

  if (global.gc) global.gc();
  const after = getMemoryUsage().heapUsed;

  const delta = after - baseline;
  console.log(`  Baseline memory:  ${formatBytes(baseline)}`);
  console.log(`  After ${iterations} cycles: ${formatBytes(after)}`);
  console.log(`  Delta:            ${formatBytes(delta)}`);

  if (delta > 50 * 1024 * 1024) {
    console.log(`  ⚠️  WARNING: Possible memory leak (delta > 50MB)`);
  } else {
    console.log(`  ✅ OK (delta within acceptable range)`);
  }
}

function runAll() {
  console.log('# Stress Testing Results (Phase 9.3)\n');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Node: ${process.version}\n`);

  // Main stress tests
  const configs = [
    { size: 1000, opts: {} },
    { size: 1000, opts: { enable2Opt: true, label: '1000 (2-opt)' } },
    { size: 5000, opts: {} },
    { size: 5000, opts: { enable2Opt: true, label: '5000 (2-opt)' } },
    { size: 10000, opts: {} },
    { size: 10000, opts: { enable2Opt: true, label: '10000 (2-opt)' } },
  ];

  console.log('## Insertion Performance\n');
  console.log(
    [
      'Config'.padEnd(18),
      'N'.padStart(6),
      'Total(s)'.padStart(9),
      'Insert(s)'.padStart(10),
      'Avg(ms)'.padStart(9),
      'P50(ms)'.padStart(9),
      'P95(ms)'.padStart(9),
      'P99(ms)'.padStart(9),
      'Max(ms)'.padStart(9),
      'Memory'.padStart(10),
    ].join(' | ')
  );
  console.log(
    [18, 6, 9, 10, 9, 9, 9, 9, 10].map((w) => '-'.repeat(w)).join(' | ')
  );

  for (const { size, opts } of configs) {
    const label = opts.label ?? `N=${size}`;
    const result = runStressTest(size, opts);

    console.log(
      [
        label.padEnd(18),
        String(result.n).padStart(6),
        (result.totalTime / 1000).toFixed(2).padStart(9),
        (result.insertTime / 1000).toFixed(2).padStart(10),
        result.avgInsertTime.padStart(9),
        result.p50.padStart(9),
        result.p95.padStart(9),
        result.p99.padStart(9),
        result.maxInsertTime.padStart(9),
        formatBytes(result.peakMemory).padStart(10),
      ].join(' | ')
    );
  }

  // Memory leak test
  checkMemoryLeak(50, 200);
  checkMemoryLeak(100, 500);

  console.log('\n---\n');
  console.log('Run with `--expose-gc` for accurate memory measurements:');
  console.log('  node --expose-gc benchmark/stress.js');
}

runAll();

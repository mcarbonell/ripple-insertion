import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  RippleInsertion,
  onionPeeling,
  getOnionInsertionOrder,
} from '../src/ripple-insertion.js';

// Configuration
const args = parseArgs({
  options: {
    'data-dir': {
      type: 'string',
      short: 'd',
      default: './data',
    },
    'use-onion': {
      type: 'boolean',
      short: 'o',
      default: false,
    },
    'disable-2opt': {
      type: 'boolean',
      default: false,
    },
    'disable-oropt': {
      type: 'boolean',
      default: false,
    },
  },
});

function parseExplicitWeights(weights, N, format) {
  if (!weights || weights.length === 0) return null;
  const matrix = Array.from({ length: N }, () => new Array(N).fill(0));
  let idx = 0;
  if (format === 'UPPER_ROW') {
    for (let i = 0; i < N - 1; i++) {
      for (let j = i + 1; j < N; j++) {
        matrix[i][j] = matrix[j][i] = weights[idx++];
      }
    }
  } else if (format === 'LOWER_ROW') {
    for (let i = 1; i < N; i++) {
      for (let j = 0; j < i; j++) {
        matrix[i][j] = matrix[j][i] = weights[idx++];
      }
    }
  } else if (format === 'UPPER_DIAG_ROW') {
    for (let i = 0; i < N; i++) {
      for (let j = i; j < N; j++) {
        matrix[i][j] = matrix[j][i] = weights[idx++];
      }
    }
  } else if (format === 'LOWER_DIAG_ROW') {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j <= i; j++) {
        matrix[i][j] = matrix[j][i] = weights[idx++];
      }
    }
  } else if (format === 'FULL_MATRIX') {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        matrix[i][j] = weights[idx++];
      }
    }
  }
  return matrix;
}

const dataDir = args.values['data-dir'];
const useOnion = args.values['use-onion'];
const use2Opt = !args.values['disable-2opt'];
const useOrOpt = !args.values['disable-oropt'];

console.log(
  `\n🚀 Starting Benchmark (Data Dir: ${dataDir} | Onion Peeling: ${useOnion} | 2-opt: ${use2Opt} | Or-opt: ${useOrOpt})\n`
);

async function runBenchmark() {
  let files;
  try {
    files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  } catch (error) {
    console.error(`❌ Error reading directory ${dataDir}:`, error.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.warn(`⚠️ No .json files found in ${dataDir}`);
    process.exit(0);
  }

  const results = [];

  for (const file of files) {
    const filepath = path.join(dataDir, file);
    const dataRaw = fs.readFileSync(filepath, 'utf8');
    const instance = JSON.parse(dataRaw);

    if (!instance.metadata) {
      continue;
    }

    const problemName = instance.metadata.name;
    const optimalDistance = instance.metadata.optimalDistance || null;
    const edgeWeightType = instance.metadata.edgeWeightType || 'EUC_2D';
    const edgeWeightFormat = instance.metadata.edgeWeightFormat || null;
    let explicitWeights = instance.edgeWeights || null;
    let citiesData = instance.cities || [];
    let N = instance.metadata.dimension;

    // Handle missing coordinates for EXPLICIT instances
    if (citiesData.length === 0 && N > 0) {
      citiesData = Array.from({ length: N }, (_, i) => ({
        x: Math.cos((i / N) * 2 * Math.PI) * 1000,
        y: Math.sin((i / N) * 2 * Math.PI) * 1000,
      }));
    }

    if (explicitWeights && edgeWeightFormat && !Array.isArray(explicitWeights[0])) {
      explicitWeights = parseExplicitWeights(explicitWeights, N, edgeWeightFormat);
    }

    // Limit to 6000 for reasonable benchmark times
    if (N > 6000) {
      console.log(`Skipping ${problemName} (N=${N}) - too large for full benchmark run.`);
      continue;
    }
    console.log(`Processing ${problemName} (N=${N})...`);

    if (!optimalDistance) continue;

    // We don't scale the coordinates for backend benchmark, we use exact numbers
    // But we need to check if the instance needs scaling for pure JS math (usually not).

    const solver = new RippleInsertion({
      edgeWeightType,
      explicitWeights,
      maxK: 15,
      adaptiveMaxK: true,
      enable2Opt: use2Opt,
      enableOrOpt: useOrOpt,
    });

    const startTotal = performance.now();
    let totalInsertTime = 0;
    let totalRippleSteps = 0;

    // Determine insertion order
    let insertionOrder = [];
    if (useOnion && N > 3) {
      // For onion peeling we need an array of {id, x, y}
      const pointsForOnion = citiesData.map((c, i) => ({
        id: i,
        x: c.x,
        y: c.y,
      }));
      const layers = onionPeeling(pointsForOnion);
      insertionOrder = getOnionInsertionOrder(layers);
    } else {
      insertionOrder = Array.from({ length: N }, (_, i) => i);
    }

    for (let i = 0; i < insertionOrder.length; i++) {
      const idx = insertionOrder[i];
      const city = citiesData[idx];

      const t0 = performance.now();
      const stats = solver.addCity(idx, city.x, city.y, city.x, city.y);
      const t1 = performance.now();

      totalInsertTime += t1 - t0;
      if (stats) {
        totalRippleSteps += stats.iterations || 0;
      }
    }

    // Apply post-processing operators if enabled (after all insertions)
    let twoOptStats = { iterations: 0, improvements: 0 };
    let orOptStats = { iterations: 0, improvements: 0 };

    if (use2Opt) {
      twoOptStats = solver.apply2Opt();
    }

    if (useOrOpt) {
      orOptStats = solver.applyOrOpt();
    }

    const endTotal = performance.now();
    const finalCost = solver.getCost();

    let gap = null;
    let ratio = null;
    if (optimalDistance) {
      gap = ((finalCost - optimalDistance) / optimalDistance) * 100;
      ratio = finalCost / optimalDistance;
    }

    results.push({
      Instance: problemName,
      N,
      Type: edgeWeightType,
      Optimal: optimalDistance,
      Achieved: finalCost,
      'Gap (%)': gap !== null ? gap.toFixed(2) + '%' : 'N/A',
      'Time (ms)': (endTotal - startTotal).toFixed(1),
      'Time/Ins (ms)': (totalInsertTime / N).toFixed(3),
      'Ripples/Ins': (totalRippleSteps / N).toFixed(1),
    });
  }

  // Sort results by N
  results.sort((a, b) => a.N - b.N);

  // Print nicely formatted table
  console.table(results);

  // Save Markdown Report
  generateMarkdownReport(results, useOnion, 15, use2Opt, useOrOpt); // Pass maxK and options to report
}

function generateMarkdownReport(results, usedOnion, maxK, used2Opt, usedOrOpt) {
  const mdPath = path.join(process.cwd(), 'benchmark_report.md');

  let md = `# Ripple Insertion Benchmark Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Strategy:** ${usedOnion ? 'Onion Peeling' : 'File Order'}\n`;
  md += `**Neighbors (M):** ${maxK} (adaptive)\n`;
  md += `**2-opt:** ${used2Opt ? 'Enabled (50 iterations)' : 'Disabled'}\n`;
  md += `**Or-opt:** ${usedOrOpt ? 'Enabled (50 iterations)' : 'Disabled'}\n\n`;
  md += `| Instance | N | Type | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) | Ripples/Ins |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    const opt = r.Optimal !== null ? r.Optimal : '-';
    md += `| ${r.Instance} | ${r.N} | ${r.Type || 'EUC_2D'} | ${opt} | ${r.Achieved} | ${r['Gap (%)']} | ${r['Time (ms)']} | ${r['Time/Ins (ms)']} | ${r['Ripples/Ins']} |\n`;
  }

  fs.writeFileSync(mdPath, md);
  console.log(`\n📄 Report saved to: ${mdPath}`);
}

runBenchmark().catch(console.error);

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
  },
});

const dataDir = args.values['data-dir'];
const useOnion = args.values['use-onion'];

console.log(
  `\n🚀 Starting Benchmark (Data Dir: ${dataDir} | Onion Peeling: ${useOnion})\n`
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

    const problemName = instance.metadata.name;
    const optimalDistance = instance.metadata.optimalDistance || null;
    const edgeWeightType = instance.metadata.edgeWeightType || 'EUC_2D';
    const explicitWeights = instance.edgeWeights || null;
    const citiesData = instance.cities;
    const N = citiesData.length;

    // We don't scale the coordinates for backend benchmark, we use exact numbers
    // But we need to check if the instance needs scaling for pure JS math (usually not).

    const solver = new RippleInsertion({
      edgeWeightType,
      explicitWeights,
      maxK: 15, // Usually an adaptive M is better, but keeping 15 as base
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
      Optimal: optimalDistance,
      Achieved: finalCost,
      'Gap (%)': gap !== null ? gap.toFixed(2) + '%' : 'N/A',
      'Time (ms)': (endTotal - startTotal).toFixed(1),
      'Time/Ins (ms)': (totalInsertTime / N).toFixed(3),
      'Ripples/Ins': (totalRippleSteps / N).toFixed(1),
    });
  }

  // Print nicely formatted table
  console.table(results);

  // Save Markdown Report
  generateMarkdownReport(results, useOnion);
}

function generateMarkdownReport(results, usedOnion) {
  const mdPath = path.join(process.cwd(), 'benchmark_report.md');

  let md = `# Ripple Insertion Benchmark Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Strategy:** ${usedOnion ? 'Onion Peeling' : 'File Order'}\n\n`;

  md += `| Instance | N | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) | Ripples/Ins |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    const opt = r.Optimal !== null ? r.Optimal : '-';
    md += `| ${r.Instance} | ${r.N} | ${opt} | ${r.Achieved} | ${r['Gap (%)']} | ${r['Time (ms)']} | ${r['Time/Ins (ms)']} | ${r['Ripples/Ins']} |\n`;
  }

  fs.writeFileSync(mdPath, md);
  console.log(`\n📄 Report saved to: ${mdPath}`);
}

runBenchmark().catch(console.error);

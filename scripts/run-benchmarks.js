#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const seed =
  process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] || '42';

console.log(`\n========================================`);
console.log(` Ripple Insertion Reproducibility Runner`);
console.log(` Seed: ${seed} | Node: ${process.version}`);
console.log(`========================================\n`);

function run(cmd, args) {
  console.log(`\n▶ Running: node ${args.join(' ')}`);
  const res = spawnSync('node', args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    console.error(`Command failed with exit code ${res.status}`);
    process.exit(res.status || 1);
  }
}

// 1. TSPLIB standard benchmark
run('node', ['benchmark/benchmark.js', '--output-dir=./results']);

// 2. Comparative benchmark against baselines (NN, CI, Random)
run('node', ['benchmark/comparative.js', `--seed=${seed}`, '--iterations=3']);

console.log(`\n✅ Benchmark suite completed reproducibly.`);

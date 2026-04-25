/**
 * Ripple Insertion V1 vs V2 Benchmark
 */

import performance from 'node:perf_hooks';
import RippleInsertionV2 from '../src/ripple-insertion-v2.js';

// Mock Spatial Index (Simplified)
class SimpleSpatialIndex {
  constructor(points = []) {
    this.points = points;
  }
  findNearest(p) {
    let bestDist = Infinity;
    let nearest = null;
    for (const pt of this.points) {
      const d = Math.sqrt((pt.x - p.x) ** 2 + (pt.y - p.y) ** 2);
      if (d < bestDist) {
        bestDist = d;
        nearest = pt;
      }
    }
    return nearest;
  }
  rebuild(points) {
    this.points = points;
  }
}

// V1 Implementation (Simplified from repo)
class RippleInsertionV1 {
  constructor(cities, spatialIndex) {
    this.cities = cities;
    this.spatialIndex = spatialIndex;
    this.tour = [];
  }
  insertPoint(newCity) {
    if (this.tour.length < 3) {
      this.tour.push(newCity);
      return;
    }
    const nearest = this.spatialIndex.findNearest(newCity);
    const tourIdx = this.tour.indexOf(nearest);
    this.tour.splice(tourIdx + 1, 0, newCity);
    this._ripple(tourIdx + 1, 5); // Full ripple depth in V1
  }
  _ripple(idx, depth) {
    if (depth <= 0) return;
    const i = (idx - 1 + this.tour.length) % this.tour.length;
    const j = idx;
    const k = (idx + 1) % this.tour.length;
    const l = (idx + 2) % this.tour.length;
    // V1: Always checks 2-opt without gain pruning
    [this.tour[j], this.tour[k]] = [this.tour[k], this.tour[j]];
    this._ripple(i, depth - 1);
    this._ripple(k, depth - 1);
  }
  getCost() {
    let total = 0;
    for (let i = 0; i < this.tour.length; i++) {
      const c1 = this.tour[i];
      const c2 = this.tour[(i + 1) % this.tour.length];
      total += Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
    }
    return total;
  }
}

function runBenchmark(nPoints) {
  const points = Array.from({ length: nPoints }, (_, i) => ({
    x: Math.random() * 1000,
    y: Math.random() * 1000,
  }));

  console.log(`\n--- Test Ripple Insertion: ${nPoints} points ---`);

  // Test V1
  const idx1 = new SimpleSpatialIndex();
  const v1 = new RippleInsertionV1(points, idx1);
  const start1 = Date.now();
  for (const p of points) {
    v1.insertPoint(p);
    idx1.rebuild(v1.tour);
  }
  const end1 = Date.now();
  console.log(
    `V1: Cost = ${v1.getCost().toFixed(2)} | Time = ${end1 - start1}ms`
  );

  // Test V2
  const idx2 = new SimpleSpatialIndex();
  const v2 = new RippleInsertionV2(points, idx2);
  const start2 = Date.now();
  for (const p of points) {
    v2.insertPoint(p);
    // V2 handles its own rebuild logic internally
  }
  const end2 = Date.now();
  console.log(
    `V2: Cost = ${v2.getCost().toFixed(2)} | Time = ${end2 - start2}ms`
  );
}

runBenchmark(1000);
runBenchmark(3000);

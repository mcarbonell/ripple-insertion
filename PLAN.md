# Ripple Insertion - Roadmap

**Status:** v2.0 Stable - O(N log N) Dynamic TSP algorithm
**Goal:** Evolucionar a v3.0 con mejoras de calidad, escalabilidad y funcionalidad

---

## Phase 6: Quality Improvements (✅ Completed - High Priority)

### 6.1 Add 2-opt Post-Processing Operator

- [x] Implement optional 2-opt local search after each insertion
- [x] Add `enable2Opt: true` option to constructor
- [x] Limit 2-opt iterations to maintain real-time performance
- [x] Benchmark quality improvement vs performance cost

```javascript
// Implemented API
const solver = new RippleInsertion({
  maxK: 15,
  enable2Opt: true, // Enable 2-opt refinement
  max2OptIterations: 50, // Limit iterations per insertion
});
```

**Actual Impact:**

- Gap reduction: Significant improvements on several instances
  - `kroA100`: 0.11% → 0.05% (55% better)
  - `ch130`: 4.94% → 4.29% (13% better)
  - `ch150`: 7.11% → 3.69% (48% better)
- Time increase: ~50-100% per insertion (higher than expected)
- Still maintains real-time performance for N < 1000

**Notes:**

- 2-opt is applied after each insertion, which can be expensive
- Consider making it optional only at the end (not after each insertion)
- The improvement varies by instance - some benefit more than others
  Vale

### 6.2 Adaptive M (Neighbors) as Function of N ✅

- [x] Replace fixed `maxK` with adaptive formula
- [x] Default: `maxK = Math.min(50, Math.max(15, Math.floor(N * 0.20)))`
- [x] Allow manual override via options
- [x] Benchmark with different formulas

**Implemented formula:**

```javascript
_getAdaptiveK() {
  const n = this.tour.size;
  return Math.min(50, Math.max(15, Math.floor(n * 0.20)));
}
```

**Impact:**

- ch150: 7.11% → 3.77% (53% better without 2-opt)
- ch150: 7.11% → 2.45% (65% better with 2-opt)
- Small instances (N<100): uses minimum of 15 neighbors (same as before)

````

**Expected Impact:**

- Better quality for large instances (N > 200)
- No performance degradation for small instances
- More consistent gap across different problem sizes

### 6.3 Additional Local Search Operators ✅

- [x] Implement Or-opt (relocate segments of 1-3 cities) - prioritize first, cheaper than 3-opt
- [x] Implement 3-opt only if Or-opt shows significant gains - expensive O(N³)
- [x] Make operators configurable via options
- [x] Benchmark each operator's impact

**Impact:**
- Or-opt alone: eil51 5.16%→4.23%, ch150 3.77%→3.58%
- Or-opt + 2-opt: ch150 2.45%→2.27%, eil51 5.16%→4.23%

```javascript
// Implemented API
const solver = new RippleInsertion({
  enable2Opt: true,
  enableOrOpt: true,
});

solver.applyOrOpt(); // Returns: { iterations, improvements }
```

```javascript
// Proposed operators configuration
const solver = new RippleInsertion({
  operators: {
    relocate: true, // Current ripple (default)
    twoOpt: true, // 2-opt swaps
    orOpt: true, // Or-opt segments
    threeOpt: false, // 3-opt (expensive, optional)
  },
});
````

---

## Phase 7: Functionality Extensions (📋 Pending - Medium Priority)

### 7.1 City Removal Support ✅

- [x] Implement `removeCity(cityId)` method
- [x] Handle tour reconnection after removal
- [x] Trigger ripple optimization on affected area
- [x] Add tests for removal edge cases
- [x] Add `remove(id)` method to KD-tree

```javascript
// Implemented API
const stats = solver.removeCity(cityId);
// Returns: { iterations, maxDepth, removedCost }
```

### 7.2 Batch Insertion Support ✅

- [x] Implement `addCities(citiesArray, options)` method
- [x] Integrate convex hull / onion peeling as option
- [x] Single ripple pass after all insertions (already happens per insertion)
- [x] Benchmark vs sequential insertion

```javascript
// Implemented API
const stats = solver.addCities(
  [
    { id: 10, x: 100, y: 200 },
    { id: 11, x: 150, y: 300 },
    { id: 12, x: 200, y: 250 },
  ],
  { useOnionPeeling: true }
);
// Returns: { totalIterations, avgRipplesPerInsert, totalTime }
```

```javascript
// Proposed API
const stats = solver.addCities([
  { id: 10, x: 100, y: 200 },
  { id: 11, x: 150, y: 300 },
  { id: 12, x: 200, y: 250 },
]);
// Returns: { totalIterations, avgDepth, totalTime }
```

### 7.3 State Persistence

- [ ] Implement `serialize()` method → JSON string
- [ ] Implement `deserialize(jsonString)` static method
- [ ] Include tour, cities, KD-Tree state
- [ ] Add compression for large instances

```javascript
// Proposed API
const state = solver.serialize();
// Save to file/database

const solver = RippleInsertion.deserialize(state);
// Restore complete state
```

---

## Phase 8: Performance & Scalability (📋 Pending - Medium Priority)

### 8.1 Web Workers Support

- [ ] Create worker wrapper for background processing
- [ ] Implement message protocol for addCity/getTour
- [ ] Handle state synchronization
- [ ] Benchmark UI responsiveness improvement

### 8.2 Spatial Hashing for Dense Regions

- [ ] Implement grid-based spatial hash
- [ ] Use for neighbor queries in dense clusters
- [ ] Fallback to KD-Tree for sparse regions
- [ ] Benchmark with clustered distributions

### 8.3 Typed Arrays for Large Instances (N > 10000)

- [ ] Use Float64Array for coordinates
- [ ] Optimize distance calculations
- [ ] Reduce memory footprint
- [ ] Benchmark memory usage improvement

---

## Phase 9: Testing & Validation (📋 Pending - High Priority)

### 9.1 Comprehensive Edge Case Testing

- [ ] Test with dense clusters (cities very close together)
- [ ] Test with uniform grid distributions
- [ ] Test with extreme aspect ratios
- [ ] Test with duplicate coordinates
- [ ] Test insertion/removal sequences

### 9.2 Comparative Benchmarks

- [ ] Compare vs Nearest Neighbor (dynamic)
- [ ] Compare vs Cheapest Insertion (dynamic)
- [ ] Compare vs random insertion order
- [ ] Document quality vs speed tradeoffs

### 9.3 Stress Testing

- [ ] Test with N = 1000, 5000, 10000
- [ ] Measure memory usage over time
- [ ] Test for memory leaks
- [ ] Profile hot paths

---

## Phase 10: Documentation & Publishing (📋 Pending - Low Priority)

### 10.1 Enhanced Documentation

- [ ] Add JSDoc comments to all public methods
- [ ] Create API reference documentation
- [ ] Add more code examples
- [ ] Document performance characteristics

### 10.2 npm Publishing

- [ ] Prepare package.json for npm
- [ ] Add TypeScript type definitions (.d.ts)
- [ ] Create CHANGELOG.md
- [ ] Publish to npm registry

### 10.3 Academic Contribution

- [ ] Write technical paper describing the algorithm
- [ ] Include formal complexity analysis
- [ ] Compare with existing dynamic TSP literature
- [ ] Submit to optimization conference/journal

---

## Phase 1: Standalone Repo Setup (✅ Completed)

### Data

- [x] Create `data/` with demo subset (6 instances):
  - `eil51.json`, `berlin52.json`, `st70.json`, `kroA100.json`, `ch130.json`, `ch150.json`
- [x] Update `fetch()` paths in HTML visualizers to use `data/`
- [x] Do NOT copy full `tsplib-json/` (~80 files = unnecessary duplication)
- [x] Benchmark scripts accept `--data-dir` flag for full TSPLIB path

### Structure

```text
ripple-insertion/
├── src/
│   ├── ripple-insertion.js        # Core algorithm (extract from HTML)
│   ├── kd-tree.js                 # KD-Tree implementation
│   └── doubly-linked-tour.js      # Tour data structure
├── data/                          # Demo instances (6 files)
├── docs/
│   ├── RIPPLE_INSERTION.md
│   └── evaluacion-ripple-insertion.md
├── img/
│   └── ripple_insertion.png
├── demo/
│   ├── optimized.js                      # Refactored UI wrapper
│   ├── ripple-insertion-animated.html    # v0.1.1
│   └── ripple-insertion-optimized.html   # v2.0
├── benchmark/
│   └── benchmark.js               # Standalone benchmark runner
├── test/
│   └── ripple-insertion.spec.js
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions for automated testing
├── OPTIMIZATIONS.md
├── README.md
├── PLAN.md
└── package.json
```

### Init & Tooling

- [x] `git init` + first commit
- [x] `package.json` with name `ripple-insertion` and `"type": "module"` for native ES Modules
- [x] `.gitignore`
- [x] Set up Prettier and/or ESLint for consistent formatting
- [x] GitHub repo creation

---

## Phase 2: Extract Algorithm from HTML (✅ Completed)

Both visualizers have the algorithm embedded inline. Extract into reusable modules.

### Core Module: `src/ripple-insertion.js`

- [x] Extract from `ripple-insertion-optimized.html` (v2.0, O(N log N))
- [x] Export as ES module: `export class RippleInsertion`
- [x] API surface:
  ```js
  const solver = new RippleInsertion();
  solver.addCity(cityId, x, y); // O(log N) insertion + ripple
  solver.clear(); // Removal/reset support
  solver.getTour(); // Returns ordered city IDs
  solver.getCost(); // Total tour distance
  solver.on('ripple', callback); // Event for visualization
  ```
- [x] Zero dependencies, pure JS. Implement `on` using `EventTarget` (with CustomEvent fallback for Node 18) to remain environment-agnostic.
- [x] Add comprehensive **JSDoc** comments for autocompletion and type safety without needing TypeScript compilation.

### KD-Tree: `src/kd-tree.js`

- [x] Extract `OptimizedKDTree` class
- [x] Self-balancing with rebuild threshold
- [x] k-NN queries with binary heap

### Doubly Linked Tour: `src/doubly-linked-tour.js`

- [x] Extract `DoublyLinkedTour` class
- [x] O(1) insert, remove, move, get neighbors

### Update HTML Demos

- [x] Refactor demos to import from `src/` modules (via `demo/optimized.js`)
- [x] Keep demos as thin UI wrappers

---

## Phase 3: Testing (✅ Completed)

Use **Node.js Native Test Runner (`node:test`)** to maintain the zero-dependency philosophy.

- [x] `test/ripple-insertion.spec.js`
  - [x] Insert cities in order, verify tour correctness
  - [x] Insert random cities, verify no duplicates
  - [x] Verify total cost calculation
  - [x] Test ripple propagation (neighbors get re-optimized)
  - [x] Edge cases: 1 city, 2 cities, 3 cities
- [x] `test/kd-tree.spec.js`
  - [x] Insert + query nearest neighbor
  - [x] k-NN returns correct results
  - [x] Rebuild maintains correctness
- [x] `test/doubly-linked-tour.spec.js`
  - [x] Insert/remove/move operations
  - [x] Neighbor retrieval
  - [x] Tour iteration

---

## Phase 4: Benchmarking (✅ Completed)

### Standalone Benchmark Runner

- [x] `benchmark/benchmark.js`
  - [x] Accepts `--data-dir` for full TSPLIB instances
  - [x] Falls back to `data/` subset if no dir specified
  - [x] Outputs JSON + Markdown reports (Includes M/Neighbors config)
- [x] Run against TSPLIB instances N=51 to N=657
- [x] Record: cost, gap to optimal, time per insertion, ripple depth stats

### Improvements to Test

- [x] Insert order: convex hull first (currently uses file order)
- [ ] Adaptive M (neighbors) as function of N
- [ ] Additional operators beyond Relocate (2-opt, or-opt)

---

## Phase 5: Documentation & Publish (✅ Completed)

- [x] README.md with:
  - [x] What is Dynamic TSP
  - [x] Algorithm explanation (elastic band analogy)
  - [x] Quick start / usage
  - [x] Benchmark results table
  - [x] Comparison table (vs Nearest Neighbor, Cheapest Insertion, LKH)
  - [x] Use cases (gaming, logistics, interactive UI)
- [ ] npm publish (optional)
- [ ] CITATION.cff

---

## Notes

### Why not copy tsplib-json/

The full `tsplib-json/` directory has ~80 parsed TSPLIB instances (~2MB). Copying it into every repo that uses TSP data is wasteful. Instead:

- Include a small `data/` subset for demos and quick tests
- Accept external data paths for full benchmarks
- Users can download from TSPLIB or generate with `convert-tsplib-to-json.js`

### Relationship to k-alternatives

This algorithm was originally developed inside the k-alternatives repo as a "bonus" experiment. It has been extracted because:

1. Different problem domain (dynamic vs static TSP)
2. Different target audience (game devs, interactive apps vs researchers)
3. Deserves its own identity, docs, and versioning

### Pending Additions

- **Ripple convergence metric**: Measure when ripple naturally stops without 2-opt
- **Integrated convex hull/onion peeling**: Move utilities to constructor options
- **TypeScript definitions**: Add .d.ts for type safety

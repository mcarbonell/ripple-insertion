# Ripple Insertion - Roadmap

**Status:** Early stage - extraction from k-alternatives repo
**Goal:** Standalone repo for the O(N log N) Dynamic TSP algorithm

---

## Phase 1: Standalone Repo Setup

### Data

- [ ] Create `data/` with demo subset (6 instances):
  - `eil51.json`, `berlin52.json`, `st70.json`, `kroA100.json`, `ch130.json`, `ch150.json`
- [ ] Update `fetch()` paths in HTML visualizers to use `data/`
- [ ] Do NOT copy full `tsplib-json/` (~80 files = unnecessary duplication)
- [ ] Benchmark scripts accept `--data-dir` flag for full TSPLIB path

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

- [ ] `git init` + first commit
- [ ] `package.json` with name `ripple-insertion` and `"type": "module"` for native ES Modules
- [ ] `.gitignore`
- [ ] Set up Prettier and/or ESLint for consistent formatting
- [ ] GitHub repo creation

---

## Phase 2: Extract Algorithm from HTML

Both visualizers have the algorithm embedded inline. Extract into reusable modules.

### Core Module: `src/ripple-insertion.js`

- [ ] Extract from `ripple-insertion-optimized.html` (v2.0, O(N log N))
- [ ] Export as ES module: `export class RippleInsertion`
- [ ] API surface:
  ```js
  const solver = new RippleInsertion();
  solver.addCity(cityId, x, y); // O(log N) insertion + ripple
  solver.removeCity(cityId); // Future: removal support
  solver.getTour(); // Returns ordered city IDs
  solver.getCost(); // Total tour distance
  solver.on('ripple', callback); // Event for visualization
  ```
- [ ] Zero dependencies, pure JS. Implement `on` using a 10-line micro-pubsub or `EventTarget` to remain environment-agnostic.
- [ ] Add comprehensive **JSDoc** comments for autocompletion and type safety without needing TypeScript compilation.

### KD-Tree: `src/kd-tree.js`

- [ ] Extract `OptimizedKDTree` class
- [ ] Self-balancing with rebuild threshold
- [ ] k-NN queries with binary heap

### Doubly Linked Tour: `src/doubly-linked-tour.js`

- [ ] Extract `DoublyLinkedTour` class
- [ ] O(1) insert, remove, move, get neighbors

### Update HTML Demos

- [ ] Refactor demos to import from `src/` modules
- [ ] Keep demos as thin UI wrappers

---

## Phase 3: Testing

Use **Node.js Native Test Runner (`node:test`)** to maintain the zero-dependency philosophy.

- [ ] `test/ripple-insertion.spec.js`
  - [ ] Insert cities in order, verify tour correctness
  - [ ] Insert random cities, verify no duplicates
  - [ ] Verify total cost calculation
  - [ ] Test ripple propagation (neighbors get re-optimized)
  - [ ] Edge cases: 1 city, 2 cities, 3 cities
- [ ] `test/kd-tree.spec.js`
  - [ ] Insert + query nearest neighbor
  - [ ] k-NN returns correct results
  - [ ] Rebuild maintains correctness
- [ ] `test/doubly-linked-tour.spec.js`
  - [ ] Insert/remove/move operations
  - [ ] Neighbor retrieval
  - [ ] Tour iteration

---

## Phase 4: Benchmarking

### Standalone Benchmark Runner

- [ ] `benchmark/benchmark.js`
  - [ ] Accepts `--data-dir` for full TSPLIB instances
  - [ ] Falls back to `data/` subset if no dir specified
  - [ ] Outputs JSON + Markdown reports
- [ ] Run against TSPLIB instances N=51 to N=657
- [ ] Record: cost, gap to optimal, time per insertion, ripple depth stats

### Improvements to Test

- [ ] Insert order: convex hull first (currently uses file order)
- [ ] Adaptive M (neighbors) as function of N
- [ ] Additional operators beyond Relocate (2-opt, or-opt)

---

## Phase 5: Documentation & Publish

- [ ] README.md with:
  - [ ] What is Dynamic TSP
  - [ ] Algorithm explanation (elastic band analogy)
  - [ ] Quick start / usage
  - [ ] Benchmark results table
  - [ ] Comparison table (vs Nearest Neighbor, Cheapest Insertion, LKH)
  - [ ] Use cases (gaming, logistics, interactive UI)
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

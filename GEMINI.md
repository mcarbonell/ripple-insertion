# Gemini Workspace Context: Ripple Insertion

## Project Overview

**Ripple Insertion** is an experimental dynamic routing algorithm designed for **Dynamic / Online Traveling Salesperson Problem (TSP)** scenarios. Unlike traditional static solvers that recalculate routes from scratch, this algorithm integrates new points into an existing tour in real-time, optimizing locally via a cascading "ripple" relocate heuristic.

Key architectural components include:

- **Spatial Querying:** Uses a self-balancing KD-Tree for spatial nearest-neighbor queries ($O(M \log N)$ per insertion).
- **Data Structures:** Employs a Doubly Linked Tour with Map indexing for $O(1)$ node lookups and deletions, and FastBinaryHeap for $k$-NN tracking.
- **Local Wave Search:** Bounded cascade propagation ("ripple") that triggers local relocate moves only in stressed neighborhoods.
- **Post-Processing:** Optional global 2-opt and Or-opt refinement passes.

## Repository Architecture

- `src/`: Core ES modules (`ripple-insertion.js`, `kd-tree.js`, `doubly-linked-tour.js`).
- `src/experimental/`: Experimental prototypes isolated from the public API (`ripple-insertion-v2.js`).
- `test/`: Node.js native unit, edge-case, and reproducibility tests.
- `benchmark/`: Standalone deterministic benchmarking scripts (`benchmark.js`, `comparative.js`, `stress.js`, `prng.js`).
- `scripts/`: Unified reproducibility runner (`run-benchmarks.js`).
- `results/`: Versioned raw benchmark artifacts (CSV, JSON, Markdown).
- `data/`: Curated subset of standard TSPLIB Euclidean instances.
- `demo/` & `*.html`: Interactive browser visualizers.

## Available Commands

- `npm test`: Runs the native Node.js test runner across all test suites.
- `npm run benchmark`: Executes the full reproducibility benchmark pipeline.
- `npm run format`: Formats code with Prettier.
- `npm run format:check`: Validates formatting in CI.

## Development Conventions

- **Zero External Dependencies:** Runtime library code must remain pure zero-dependency JavaScript (ES Modules).
- **Correctness & Reproducibility First:** All benchmarks and randomized tests must use deterministic PRNG with fixed seeds.
- **Strict API Contracts:** Input validation on dynamic additions, explicit error throwing for invalid/missing weights, and clean separation between online insertion and offline post-processing.

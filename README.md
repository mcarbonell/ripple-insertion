# Ripple Insertion: Dynamic TSP Solver

[![Node.js CI](https://github.com/mcarbonell/ripple-insertion/actions/workflows/ci.yml/badge.svg)](https://github.com/mcarbonell/ripple-insertion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Ripple Insertion** (Recursive Cheapest Insertion) is an experimental algorithm designed for **Dynamic Traveling Salesperson Problem (TSP)** scenarios. Unlike traditional solvers that calculate a route from scratch, this algorithm specializes in integrating new points into an existing route in real-time, optimizing locally via a cascading "ripple" effect.

## 🌊 What is Dynamic TSP?

In static TSP, all cities are known upfront. In dynamic (or online) TSP, cities appear incrementally, and the route must adapt on the fly without causing unacceptable delays.

Imagine the route as a tight elastic band stretched around nails (cities). When you add a new nail, you stretch the band to cover it. This creates local "tension". The Ripple Insertion algorithm checks nearby "stressed" cities. If moving a city to a nearby edge releases tension (shortens distance), it moves, propagating the check outwards like a ripple until the route stabilizes.

## ✨ Features

- **O(N log N) Complexity:** Scales almost linearly, making it capable of handling real-time interactions with thousands of nodes without UI lag.
- **Zero Dependencies:** Pure JavaScript implementation.
- **Event-Driven:** Emits `inserted` and `rippleStep` events natively via `EventTarget`, perfect for visualizations.
- **Optimized Data Structures:** Uses a self-balancing KD-Tree for O(log N) spatial nearest-neighbor queries and a Doubly Linked Tour for O(1) node operations.
- **2-opt Post-Processing:** Optional local search refinement that can further improve tour quality after all cities are inserted.

## 🎯 Use Cases

| Scenario                                       | Recommended Solver   | Why?                                                                                  |
| :--------------------------------------------- | :------------------- | :------------------------------------------------------------------------------------ |
| **Interactive UI** (User clicks to add points) | **Ripple Insertion** | Visually pleasing "organic" adjustment; zero UI freeze.                               |
| **Gaming AI** (RTS Unit Pathing)               | **Ripple Insertion** | Fast, "good enough" routing that reacts to map changes in real-time.                  |
| **Logistics/Delivery** (Adding a stop)         | **Ripple Insertion** | Retains existing route structure while locally optimizing. Instant feedback.          |
| **Static Planning** (1000 stops from scratch)  | **LKH**              | If you don't need real-time insertions, use LKH for better global optimization power. |

## 🚀 Quick Start

### Installation

You can include it directly in your project. It is written using ES Modules.

```javascript
import { RippleInsertion } from './src/ripple-insertion.js';

// 1. Initialize the solver
const solver = new RippleInsertion({
  edgeWeightType: 'EUC_2D', // Distance metric (EUC_2D, GEO, ATT, CEIL_2D)
  maxK: 15, // Fixed neighbors (ignored if adaptiveMaxK is true)
  adaptiveMaxK: true, // Adaptive: scales from 15 to 50 based on N
});

// 2. Listen to events for visualization (Optional)
solver.on('tourUpdated', (e) => {
  console.log(`Tour updated after inserting city ${e.detail.id}`);
});

// 3. Add cities dynamically
solver.addCity(0, 100, 200);
solver.addCity(1, 150, 300);
solver.addCity(2, 50, 50);

// 4. Retrieve the optimal tour and cost
const tour = solver.getTour(); // Returns array of city IDs: [0, 1, 2]
const cost = solver.getCost(); // Returns total distance
```

### 2-opt Post-Processing

After inserting all cities, you can optionally apply 2-opt local search to further improve the tour:

```javascript
// Apply 2-opt refinement after all insertions
const twoOptStats = solver.apply2Opt();
console.log(
  `2-opt: ${twoOptStats.improvements} improvements in ${twoOptStats.iterations} iterations`
);

// Get the improved tour and cost
const optimizedTour = solver.getTour();
const optimizedCost = solver.getCost();
```

**When to use 2-opt:**

- When quality is more important than speed
- For static or batch scenarios where you can afford extra computation
- After all cities have been inserted (not during real-time insertion)

**Performance impact:**

- Adds ~10-30% overhead depending on tour size
- Typically improves gap by 1-3% on standard benchmarks
- Best for tours with 50+ cities

### City Removal

You can also remove cities dynamically from the tour:

```javascript
// Remove a city from the tour
const removeStats = solver.removeCity(1);
console.log(
  `Removed city 1: ${removeStats.removedCost} cost savings in ${removeStats.iterations} ripple iterations`
);

// Get the updated tour
const tour = solver.getTour();
const cost = solver.getCost();
```

### Batch Insertion

You can also insert multiple cities at once with optimized insertion order:

```javascript
// Add multiple cities at once
const cities = [
  { id: 10, x: 100, y: 200 },
  { id: 11, x: 150, y: 300 },
  { id: 12, x: 200, y: 250 },
  { id: 13, x: 80, y: 180 },
];

// Without optimization (uses file order)
const stats1 = solver.addCities(cities);

// With onion peeling (convex hull first - better quality)
const stats2 = solver.addCities(cities, { useOnionPeeling: true });
console.log(
  `Inserted ${cities.length} cities in ${stats2.totalTime.toFixed(2)}ms`
);
```

**Benefits of onion peeling:**

- Inserts cities from outside (convex hull) inward
- Provides better initial tour structure
- Reduces total ripple iterations

### Post-Processing Optimization

After inserting all cities, you can apply local search operators to improve tour quality:

```javascript
// Apply 2-opt optimization
const twoOptStats = solver.apply2Opt();

// Apply Or-opt optimization
const orOptStats = solver.applyOrOpt();

// Or enable both during solver initialization
const solver = new RippleInsertion({
  enable2Opt: true,
  enableOrOpt: true,
});
```

**Operator effects:**

- **2-opt**: Reverses tour segments to eliminate edge crossings
- **Or-opt**: Relocates cities to better positions in the tour
- Combined: Best quality, moderate time increase

## 📊 Benchmarks

Performance on standard TSPLIB instances (EUC*2D).
\_Gap is compared against the known optimal static solution. The focus of this algorithm is speed per insertion, not finding the absolute static minimum.*

#### Without 2-opt (Real-time insertion)

| Instance | N   | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) |
| -------- | --- | ------- | -------- | ------- | --------- | ------------- |
| berlin52 | 52  | 7542    | 7783     | 3.20%   | 11.8      | 0.226         |
| eil51    | 51  | 426     | 448      | 5.16%   | 2.4       | 0.046         |
| st70     | 70  | 675     | 703      | 4.15%   | 3.8       | 0.054         |
| kroA100  | 100 | 21282   | 21305    | 0.11%   | 5.3       | 0.052         |
| ch130    | 130 | 6110    | 6412     | 4.94%   | 12.2      | 0.093         |
| ch150    | 150 | 6528    | 6992     | 7.11%   | 11.1      | 0.073         |

#### With 2-opt (Post-processing refinement)

| Instance | N   | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) |
| -------- | --- | ------- | -------- | ------- | --------- | ------------- |
| berlin52 | 52  | 7542    | 7783     | 3.20%   | 18.0      | 0.330         |
| eil51    | 51  | 426     | 448      | 5.16%   | 4.8       | 0.091         |
| st70     | 70  | 675     | 703      | 4.15%   | 4.3       | 0.059         |
| kroA100  | 100 | 21282   | 21292    | 0.05%   | 17.0      | 0.161         |
| ch130    | 130 | 6110    | 6372     | 4.29%   | 24.0      | 0.131         |
| ch150    | 150 | 6528    | 6769     | 3.69%   | 25.6      | 0.136         |

**2-opt improvements:**

- `kroA100`: 0.11% → 0.05% (55% better)
- `ch130`: 4.94% → 4.29% (13% better)
- `ch150`: 7.11% → 3.69% (48% better)

### Recent Improvements

**With File Order:**

- `kroA100` gap dropped from 0.70% to an impressive 0.11%.
- `st70` gap dropped from 6.22% to 4.15%.
- `ch150` gap dropped from 8.47% to 7.11%.

**With Onion Peeling:**

- `berlin52` gap dropped from 13.09% to 8.71%.
- `kroA100` gap dropped from 11.21% to 7.27%.

### Comparison with other heuristics

| Algorithm                     | Complexity     | Best for...               | Typical Gap (N=100) | Dynamic? |
| :---------------------------- | :------------- | :------------------------ | :------------------ | :------- |
| **Nearest Neighbor**          | O(N²)          | Extreme speed             | 5-15%               | ❌       |
| **Cheapest Insertion**        | O(N²)          | Decent quality            | 4-8%                | ❌       |
| **LKH (Simulated Annealing)** | O(N²)          | **Best quality (static)** | 0.5-2%              | ❌       |
| **👉 Ripple Insertion**       | **O(N log N)** | **Dynamic + Interactive** | **~4%**             | ✅✅✅   |

## 🛠️ Development

Run the internal benchmarks:

```bash
node benchmark/benchmark.js
```

Run tests (uses native Node.js test runner):

```bash
npm test
```

## 📜 License

MIT

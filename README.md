# Ripple Insertion: Dynamic TSP Solver

[![Node.js CI](https://github.com/MarioRaul/ripple-insertion/actions/workflows/ci.yml/badge.svg)](https://github.com/MarioRaul/ripple-insertion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Ripple Insertion** (Recursive Cheapest Insertion) is an experimental algorithm designed for **Dynamic Traveling Salesperson Problem (TSP)** scenarios. Unlike traditional solvers that calculate a route from scratch, this algorithm specializes in integrating new points into an existing route in real-time, optimizing locally via a cascading "ripple" effect.

## 🌊 What is Dynamic TSP?
In static TSP, all cities are known upfront. In dynamic (or online) TSP, cities appear incrementally, and the route must adapt on the fly without causing unacceptable delays.

Imagine the route as a tight elastic band stretched around nails (cities). When you add a new nail, you stretch the band to cover it. This creates local "tension". The Ripple Insertion algorithm checks nearby "stressed" cities. If moving a city to a nearby edge releases tension (shortens distance), it moves, propagating the check outwards like a ripple until the route stabilizes.

## ✨ Features
*   **O(N log N) Complexity:** Scales almost linearly, making it capable of handling real-time interactions with thousands of nodes without UI lag.
*   **Zero Dependencies:** Pure JavaScript implementation.
*   **Event-Driven:** Emits `inserted` and `rippleStep` events natively via `EventTarget`, perfect for visualizations.
*   **Optimized Data Structures:** Uses a self-balancing KD-Tree for O(log N) spatial nearest-neighbor queries and a Doubly Linked Tour for O(1) node operations.

## 🎯 Use Cases
| Scenario | Recommended Solver | Why? |
| :--- | :--- | :--- |
| **Interactive UI** (User clicks to add points) | **Ripple Insertion** | Visually pleasing "organic" adjustment; zero UI freeze. |
| **Gaming AI** (RTS Unit Pathing) | **Ripple Insertion** | Fast, "good enough" routing that reacts to map changes in real-time. |
| **Logistics/Delivery** (Adding a stop) | **Ripple Insertion** | Retains existing route structure while locally optimizing. Instant feedback. |
| **Static Planning** (1000 stops from scratch) | **LKH** | If you don't need real-time insertions, use LKH for better global optimization power. |

## 🚀 Quick Start

### Installation
You can include it directly in your project. It is written using ES Modules.

```javascript
import { RippleInsertion } from './src/ripple-insertion.js';

// 1. Initialize the solver
const solver = new RippleInsertion({
  edgeWeightType: 'EUC_2D', // Distance metric (EUC_2D, GEO, ATT, CEIL_2D)
  maxK: 15 // Number of spatial neighbors to check during ripple
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

## 📊 Benchmarks

Performance on standard TSPLIB instances (EUC_2D).
*Gap is compared against the known optimal static solution. The focus of this algorithm is speed per insertion, not finding the absolute static minimum.*

| Instance | N | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) |
|---|---|---|---|---|---|---|
| berlin52 | 52 | 7542 | 7800 | 3.42% | 6.4 | 0.122 |
| st70 | 70 | 675 | 717 | 6.22% | 3.1 | 0.043 |
| kroA100 | 100 | 21282 | 21432 | 0.70% | 3.5 | 0.035 |
| ch130 | 130 | 6110 | 6372 | 4.29% | 7.3 | 0.056 |
| ch150 | 150 | 6528 | 7081 | 8.47% | 4.5 | 0.030 |

### Comparison with other heuristics

| Algorithm | Complexity | Best for... | Typical Gap (N=100) | Dynamic? |
| :--- | :--- | :--- | :--- | :--- |
| **Nearest Neighbor** | O(N²) | Extreme speed | 5-15% | ❌ |
| **Cheapest Insertion** | O(N²) | Decent quality | 4-8% | ❌ |
| **LKH (Simulated Annealing)** | O(N²) | **Best quality (static)** | 0.5-2% | ❌ |
| **👉 Ripple Insertion** | **O(N log N)** | **Dynamic + Interactive** | **~4%** | ✅✅✅ |

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

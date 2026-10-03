# Ripple Insertion: A Spatially-Constrained Dynamic TSP Solver

**Author:** Mario Raúl Carbonell Martínez  
**Email:** marioraulcarbonell@gmail.com  
**Paper & Artifacts:** [paper/main.pdf](file:///c:/Users/mrcm_/Local/proj/algorithms/ripple-insertion/paper/main.pdf) | [GitHub Repository](https://github.com/mcarbonell/ripple-insertion)

---

## Overview

**Ripple Insertion** is an online heuristic algorithm designed specifically for **Dynamic / Online Traveling Salesperson Problem (TSP)** scenarios. Unlike traditional static solvers that recalculate entire tours from scratch ($O(N^2)$ to $O(N^3)$), Ripple Insertion integrates newly arrived cities into an active tour in real time ($< 0.3$ ms per insertion), locally absorbing geometric perturbation via a cascading "ripple" wavefront of relocate moves.

---

## 🌊 The Core Concept

Imagine a traveling salesperson tour as a closed elastic loop stretched over peg coordinates in $\mathbb{R}^2$:

1. **Initial Insertion:** When a new peg arrives, the band stretches locally to incorporate it into the cheapest compatible edge among its spatial nearest neighbors.
2. **Metric Tension:** Incorporating the new city introduces local tension into the surrounding segments. Surrounding cities may now be sub-optimally placed relative to their neighbors.
3. **Localized Relaxation:** The algorithm examines stressed nodes. If relocating a neighboring city to an adjacent edge shortens the total tour length (positive relocation gain $G > \epsilon$), the node moves ($O(1)$ pointer rewiring).
4. **Wavefront Propagation:** Relocating a node shifts tension to its former and new neighbors. The evaluation wave propagates outward with an incremented generation counter ($g + 1 \le g_{\max}$) until all local tension relaxes.

---

## ⚙️ Architecture & Data Structures

Ripple Insertion coordinates three primary structures:

1. **Doubly Linked Circular Tour (`DoublyLinkedTour`):**
   - Each node contains `prev`, `next`, and `cityId`.
   - Backed by an auxiliary `Map<number, TourNode>` for $O(1)$ direct node access, removal, and relocation without $O(N)$ linear scans.
2. **Spatial Index (`OptimizedKDTree`):**
   - 2D self-balancing $k$-d tree with array-backed fast inserts and periodic rebalancing.
   - Provides logarithmic $k$-Nearest Neighbors ($k$-NN) queries: $O(M \log N)$.
3. **Adaptive Neighborhood Strategy:**
   - The neighborhood size $M$ scales logarithmically with tour size:
     $$M(N) = \max(15, \lfloor 4 \log_2 N \rfloor)$$
   - Prevents quadratic candidate explosion while ensuring adequate geometric density coverage.
4. **Set Pool (`SetPool`):**
   - Pre-allocated object pool of reusable `Set` structures to eliminate allocation churn and garbage collection pauses in interactive 60 FPS applications.

---

## 📝 Formal Pseudocode

```
Algorithm: Ripple Insertion (Online Step)
----------------------------------------------------------------------
Input : New city x = (x, y), Tour T, Spatial Index K, Neighborhood M
Output: Updated valid Hamiltonian tour T'

1. If |T| < 3:
     Insert x into T directly, add x to K, return.

2. Query M nearest spatial neighbors of x:
     N_M(x) = kNN(K, x, M)

3. Find best insertion edge (u*, v*) minimizing insertion cost delta:
     Delta_ins(x, u, v) = dist(u, x) + dist(x, v) - dist(u, v)
     over edges (u, succ(u)) and (pred(u), u) for u in N_M(x).

4. Splice x between u* and v* in T.
   Insert x into K.

5. Initialize wave queue Q with:
     W_0 = {x, u*, v*} U N_M(x) with generation g = 0.

6. While Q is not empty:
     Dequeue (u, g).
     Compute cost saved if u is excised:
       Delta_rem = dist(pred(u), succ(u)) - dist(pred(u), u) - dist(u, succ(u))
     Query N_M(u) = kNN(K, u, M).
     Find best candidate target edge (a*, b*) among edges of N_M(u):
       Delta_add = dist(a*, u) + dist(u, b*) - dist(a*, b*)
     Gain = -(Delta_rem + Delta_add)

     If Gain > epsilon:
       Relocate u after a* in T (O(1) pointer update).
       If g + 1 <= g_max:
         Enqueue {pred(u), succ(u), a*, b*} U N_M(u) with generation g + 1.

7. Return updated tour T'.
```

---

## 📊 Complexity & Scaling

| Operation | Worst-Case Theoretical | Practical / Empirical |
|---|---|---|
| **$k$-NN Spatial Query** | $O(N)$ (degraded tree) | $O(M \log N)$ expected |
| **Initial Local Edge Insertion** | $O(M)$ | $O(M)$ |
| **Relocation Check per Node** | $O(M \log N)$ | $O(M \log N)$ |
| **Node Pointer Relocation** | $O(1)$ | $O(1)$ |
| **Cascade Depth per Insertion** | $O(N)$ (unbounded wave) | $O(1)$ expected ($< 3$ generations) |
| **Empirical Total Tour Time $T(N)$** | — | **$T(N) \approx 0.0139 \cdot N^{1.4542}$ ($R^2 = 0.9994$)** |

> **Key Distinction:** Unlike static recomputation from scratch at each step ($T_{\text{static}}(N) = \sum_{i=1}^N O(i^2) = O(N^3)$), Ripple Insertion scales sub-quadratically ($N^{1.45}$), keeping average per-insertion latency strictly below **$0.3$ ms** for instances up to $N = 5000$.

---

## 📈 Benchmark Results

### 1. TSPLIB Standard Benchmark (`EUC_2D`)

Deterministic measurements using standard integer distance rounding across 10 random arrival order permutations:

| Instance | $N$ | Known Optimal | Online Default Cost | Online Gap (%) | + 2-Opt Gap (%) | Permutations Mean Gap (%) | Runtime (ms) |
|---|---|---|---|---|---|---|---|
| `eil51` | 51 | 426 | 444 | 4.23% | 4.23% | 2.58% | 15.3 |
| `berlin52` | 52 | 7542 | 7783 | 3.20% | 3.20% | 7.32% | 5.2 |
| `st70` | 70 | 675 | 691 | 2.37% | 2.37% | 2.33% | 6.5 |
| `kroA100` | 100 | 21282 | 21292 | **0.05%** | **0.05%** | 4.45% | 12.2 |
| `ch130` | 130 | 6110 | 6372 | 4.29% | 4.29% | 3.99% | 17.7 |
| `ch150` | 150 | 6528 | 6691 | 2.50% | 2.50% | 5.95% | 19.9 |

### 2. Dynamic Streaming TSP (Online Latency & Speedup)

Initial tour built on first $50\%$ of cities ($N_0 = \lfloor N/2 \rfloor$); remaining $50\%$ streamed dynamically:

| Instance | Stream Size | Ripple Latency p50 | Ripple Latency p95 | Ripple Cost | Naive Cost | Ripple Quality Gain | Speedup vs Static Recomputation |
|---|---|---|---|---|---|---|---|
| `eil51` | 26 | 0.078 ms | 0.114 ms | 444 | 461 | +3.69% | **5.61x** |
| `berlin52` | 26 | 0.084 ms | 0.303 ms | 7783 | 7886 | +1.31% | **1.36x** |
| `st70` | 35 | 0.101 ms | 0.163 ms | 691 | 707 | +2.26% | **2.57x** |
| `kroA100` | 50 | 0.110 ms | 0.180 ms | 21292 | 22392 | +4.91% | **7.60x** |
| `ch130` | 65 | 0.126 ms | 0.290 ms | 6372 | 6496 | +1.91% | **15.29x** |
| `ch150` | 75 | 0.136 ms | 0.282 ms | 6691 | 7144 | +6.34% | **19.81x** |

### 3. Factorial Ablation Insights

- **Ripple Cascade Contribution:** On $N = 200$ synthetic instances (10 seeds), Ripple ON reduces tour cost by **$5.17\%$** compared to naive greedy edge insertion without ripple ($p = 0.00506$, paired Wilcoxon signed-rank test).
- **Post-Processing Role:** Applying offline 2-Opt and Or-Opt after online insertion yields only an additional $+0.44\%$ improvement, showing that the online cascade achieves the vast majority of local optimizations during stream ingestion.
- **Convex Hull / Onion Peeling:** Sorting insertion order via multi-layer convex hull peeling (`onionPeeling`) provides stable initial spatial boundaries, improving consistency on non-uniform cluster distributions.

---

## 📊 Comparison with Other Heuristics

| Algorithm | Paradigm | Complexity | Typical Gap ($N=100$) | Online / Real-Time? | Route Churn |
|---|---|---|---|---|---|
| **Nearest Neighbor** | Greedy Construction | $O(N^2)$ | 10–20% | ❌ Static | Total recalculation |
| **Cheapest Insertion** | Edge Construction | $O(N^2)$ | 4–8% | ❌ Static | Total recalculation |
| **Lin-Kernighan-Helsgaun (LKH-3)** | Local Search Metaheuristic | $O(N^{2.2})$ | 0.0–0.5% | ❌ Static | Complete sequence rewrite |
| **👉 Ripple Insertion** | Spatial Dynamic Online | **$O(N^{1.45})$ empirical** | **~2–4%** | **✅ Sub-millisecond** | **Local, minimal churn** |

---

## 🎯 Primary Use Cases

1. **On-Demand Dispatch & Courier Routing:** Inserting newly assigned pickup/delivery stops into active delivery routes without reordering unaffected commitments or delaying dispatchers.
2. **Interactive GIS & Route Editors:** Instantaneous visual updates when users click, drag, or delete waypoints in mapping tools (sub-16 ms latency for smooth 60 FPS interfaces).
3. **Robotics & Autonomous Vehicle Pathing:** Dynamic waypoint insertion when autonomous drones or mobile robots encounter obstacles or new surveillance targets en route.

---

## 🔍 Interactive Visualizer

Open `demo/index.html` or `ripple-insertion-animated.html` in any modern web browser to view the real-time ripple cascade:

- **Green Marker:** The newly inserted city.
- **Yellow Markers:** Cities actively evaluated and relocated by the wavefront cascade.
- **Blue Rays:** Real-time $k$-d tree spatial nearest-neighbor queries.

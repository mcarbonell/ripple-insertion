# Gemini Workspace Context: Ripple Insertion

## Project Overview
**Ripple Insertion** (Recursive Cheapest Insertion) is an experimental algorithm designed for **Dynamic Traveling Salesperson Problem (TSP)** scenarios. Unlike traditional solvers that calculate a route from scratch, this algorithm specializes in integrating new points into an existing route in real-time, optimizing locally via a cascading "ripple" effect. 

Key architectural components include:
- **Spatial Querying:** Uses a self-balancing KD-Tree for O(log N) spatial nearest-neighbor queries.
- **Data Structures:** Employs a Doubly Linked Tour with HashMaps for O(1) node operations and Binary Heaps for fast k-NN search.
- **Performance:** Achieves an overall complexity of O(N log N), making it highly suitable for interactive UIs, gaming AI, and dynamic routing, compared to standard O(N²) approaches.

The project is currently in the early stages of being extracted from a larger repository into a standalone JavaScript library, as detailed in the `PLAN.md` roadmap.

## Building and Running
Currently, the project is structured around self-contained HTML visualizers and documentation. 

**To view the demos:**
- Open `ripple-insertion-animated.html` or `ripple-insertion-optimized.html` directly in any modern web browser.

**Future Architecture (Planned):**
According to `PLAN.md`, the repository will soon be restructured to include:
- `src/` for core ES modules (`ripple-insertion.js`, `kd-tree.js`, `doubly-linked-tour.js`).
- `test/` for unit testing.
- `benchmark/` for standalone benchmarking scripts.
- A `package.json` for managing dependencies and scripts.

## Development Conventions
- **Performance First:** The codebase heavily emphasizes performance optimizations, such as Object Pooling to reduce Garbage Collection pressure and careful management of candidate lists (with fallbacks to avoid bugs).
- **Data Management:** The repository intentionally only includes a small subset of TSPLIB instances in the `data/` directory (e.g., `berlin52.json`, `st70.json`) to keep the repository lightweight. Full benchmark runs are intended to accept an external data directory path.
- **Technology Stack:** Pure, zero-dependency JavaScript.

*Note: As the project is actively undergoing structural changes outlined in `PLAN.md`, be aware that the directory layout and available commands will evolve.*
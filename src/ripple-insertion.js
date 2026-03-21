import { OptimizedKDTree } from './kd-tree.js';
import { DoublyLinkedTour } from './doubly-linked-tour.js';

// ============================================
// OBJECT POOL FOR SETS
// ============================================
class SetPool {
  constructor(initialSize = 10) {
    this.available = [];
    this.inUse = new Set();
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new Set());
    }
  }

  acquire() {
    let set = this.available.pop();
    if (!set) {
      set = new Set();
    }
    set.clear();
    this.inUse.add(set);
    return set;
  }

  release(set) {
    if (this.inUse.has(set)) {
      this.inUse.delete(set);
      set.clear();
      this.available.push(set);
    }
  }

  releaseAll() {
    this.inUse.forEach((set) => {
      set.clear();
      this.available.push(set);
    });
    this.inUse.clear();
  }
}

// ============================================
// CONVEX HULL & ONION PEELING ALGORITHMS
// ============================================
export function convexHull(points) {
  if (points.length <= 3) return [...points];

  const sorted = [...points].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const lower = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function onionPeeling(allPoints) {
  const layers = [];
  let remaining = [...allPoints];

  while (remaining.length > 0) {
    const hull = convexHull(remaining);
    if (hull.length === 0) break;

    layers.push(hull);
    const hullIds = new Set(hull.map((p) => p.id));
    remaining = remaining.filter((p) => !hullIds.has(p.id));
  }
  return layers;
}

export function getOnionInsertionOrder(layers) {
  const order = [];
  for (const layer of layers) {
    for (const point of layer) {
      order.push(point.id);
    }
  }
  return order;
}

// ============================================
// DISTANCE FUNCTIONS
// ============================================
function nint(x) {
  return Math.floor(x + 0.5);
}

function toRad(coordinate) {
  const PI = 3.141592;
  const deg = Math.floor(coordinate);
  const min = coordinate - deg;
  return (PI * (deg + (5.0 * min) / 3.0)) / 180.0;
}

export function distEUC2D(n1, n2) {
  const xd = n1.x - n2.x;
  const yd = n1.y - n2.y;
  return nint(Math.sqrt(xd * xd + yd * yd));
}

export function distCEIL2D(n1, n2) {
  const xd = n1.x - n2.x;
  const yd = n1.y - n2.y;
  return Math.ceil(Math.sqrt(xd * xd + yd * yd));
}

export function distATT(n1, n2) {
  const xd = n1.x - n2.x;
  const yd = n1.y - n2.y;
  const rij = Math.sqrt((xd * xd + yd * yd) / 10.0);
  const tij = nint(rij);
  return tij < rij ? tij + 1 : tij;
}

export function distGEO(n1, n2) {
  const RRR = 6378.388;
  const lat1 = toRad(n1.x);
  const lon1 = toRad(n1.y);
  const lat2 = toRad(n2.x);
  const lon2 = toRad(n2.y);
  const q1 = Math.cos(lon1 - lon2);
  const q2 = Math.cos(lat1 - lat2);
  const q3 = Math.cos(lat1 + lat2);
  return Math.floor(
    RRR * Math.acos(0.5 * ((1.0 + q1) * q2 - (1.0 - q1) * q3)) + 1.0
  );
}

// ============================================
// MAIN RIPPLE INSERTION ALGORITHM
// ============================================

/**
 * EventTarget is available natively in Node.js (>=16) and Browsers
 */
export class RippleInsertion extends EventTarget {
  constructor(options = {}) {
    super();
    this.edgeWeightType = options.edgeWeightType || 'EUC_2D';
    this.explicitWeights = options.explicitWeights || null;
    this.maxK = options.maxK || 20; // Number of neighbors to consider
    
    this.cities = [];
    this.tour = new DoublyLinkedTour();
    this.kdtree = new OptimizedKDTree();
    this.setPool = new SetPool(20);
    
    // Original coordinates for exact distance calculation 
    // when using visualization scaling
    this.originalCities = []; 
  }

  clear() {
    this.cities = [];
    this.originalCities = [];
    this.tour.clear();
    this.kdtree.clear();
    this.setPool.releaseAll();
  }

  dist(a, b) {
    const origA = this.originalCities[a.id] || a;
    const origB = this.originalCities[b.id] || b;

    switch (this.edgeWeightType) {
      case 'GEO':
        return distGEO(origA, origB);
      case 'ATT':
        return distATT(origA, origB);
      case 'CEIL_2D':
        return distCEIL2D(origA, origB);
      case 'EXPLICIT':
        if (
          this.explicitWeights &&
          this.explicitWeights[a.id] &&
          this.explicitWeights[a.id][b.id] !== undefined
        ) {
          return this.explicitWeights[a.id][b.id];
        }
        return distEUC2D(origA, origB);
      case 'EUC_2D':
      default:
        return distEUC2D(origA, origB);
    }
  }

  insertionCost(cityId, prevId, nextId) {
    return (
      this.dist(this.cities[cityId], this.cities[prevId]) +
      this.dist(this.cities[cityId], this.cities[nextId]) -
      this.dist(this.cities[prevId], this.cities[nextId])
    );
  }

  /**
   * Adds a city to the tour and optimizes it.
   * @param {number} id - City ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} originalX - Original X coordinate (optional, for TSPLIB)
   * @param {number} originalY - Original Y coordinate (optional, for TSPLIB)
   */
  addCity(id, x, y, originalX = null, originalY = null) {
    const newCity = { id, x, y };
    // Ensure array grows appropriately if ids are not sequential
    this.cities[id] = newCity;
    this.originalCities[id] = {
      id,
      x: originalX !== null ? originalX : x,
      y: originalY !== null ? originalY : y,
    };
    
    this.kdtree.insert(newCity);

    // Initial simple circular tour
    if (this.tour.size < 3) {
      this.tour.insertAfter(this.tour.head, id);
      if (this.tour.size === 3) {
        // Complete the circle when 3 cities are added
        const nodes = Array.from(this.tour).map(cId => this.tour.getNode(cId));
        if (nodes.length === 3) {
          nodes[0].next = nodes[1];
          nodes[1].prev = nodes[0];
          nodes[1].next = nodes[2];
          nodes[2].prev = nodes[1];
          nodes[2].next = nodes[0];
          nodes[0].prev = nodes[2];
        }
      }
      this.dispatchEvent(new CustomEvent('tourUpdated', { detail: { id } }));
      return { iterations: 0, maxDepth: 0 };
    } else {
      return this._insertAndOptimize(id);
    }
  }

  _insertAndOptimize(cityId) {
    const city = this.cities[cityId];
    const nearestNeighbors = this.kdtree.nearestNeighbors(city.x, city.y, this.maxK);

    let bestInsertion = { cost: Infinity, afterNode: null };
    const checkedNodes = new Set();

    // 1. Check insertion points near spatial neighbors
    for (const neighbor of nearestNeighbors) {
      const neighborNode = this.tour.getNode(neighbor.id);
      if (neighborNode && !checkedNodes.has(neighborNode)) {
        checkedNodes.add(neighborNode);
        const cost = this.insertionCost(
          cityId,
          neighborNode.cityId,
          neighborNode.next.cityId
        );
        if (cost < bestInsertion.cost) {
          bestInsertion = { cost, afterNode: neighborNode };
        }
      }
    }

    // Fallback: check random positions if no good candidates
    if (bestInsertion.cost === Infinity) {
      let current = this.tour.head;
      let count = 0;
      do {
        const cost = this.insertionCost(cityId, current.cityId, current.next.cityId);
        if (cost < bestInsertion.cost) {
          bestInsertion = { cost, afterNode: current };
        }
        current = current.next;
        count++;
      } while (current !== this.tour.head && count < 20);
    }

    // Insert the city
    this.tour.insertAfter(bestInsertion.afterNode, cityId);
    this.dispatchEvent(new CustomEvent('inserted', { detail: { cityId } }));

    // 2. Cascade Optimization
    const startNodes = this.setPool.acquire();
    startNodes.add(cityId);
    startNodes.add(bestInsertion.afterNode.cityId);
    startNodes.add(bestInsertion.afterNode.next.cityId);

    for (const neighbor of nearestNeighbors.slice(0, Math.min(5, nearestNeighbors.length))) {
      if (this.tour.has(neighbor.id)) {
        startNodes.add(neighbor.id);
      }
    }

    const rippleStats = this._optimizeRipple(startNodes);
    this.setPool.release(startNodes);

    this.dispatchEvent(new CustomEvent('tourUpdated', { detail: { id: cityId } }));
    return rippleStats;
  }

  _optimizeRipple(initialSet) {
    let modified = this.setPool.acquire();
    initialSet.forEach((id) => modified.add(id));

    let iterations = 0;
    let maxDepth = 0;
    const MAX_ITER = this.tour.size * 5;

    while (modified.size > 0 && iterations < MAX_ITER) {
      iterations++;
      maxDepth = Math.max(maxDepth, iterations);

      const currentCityId = modified.values().next().value;
      const currentNode = this.tour.getNode(currentCityId);

      if (!currentNode) {
        modified.delete(currentCityId);
        continue;
      }

      this.dispatchEvent(new CustomEvent('rippleStep', { detail: { currentCityId, modified: new Set(modified) } }));

      const city = this.cities[currentCityId];
      const spatialNeighbors = this.kdtree.nearestNeighbors(city.x, city.y, this.maxK);

      const prevCityId = currentNode.prev.cityId;
      const nextCityId = currentNode.next.cityId;
      const currentCost =
        this.dist(this.cities[prevCityId], city) + this.dist(city, this.cities[nextCityId]);
      const bridgedCost = this.dist(this.cities[prevCityId], this.cities[nextCityId]);
      const savingByRemoval = currentCost - bridgedCost;

      let bestMove = { gain: 0, targetNode: null };

      for (const neighbor of spatialNeighbors) {
        if (!this.tour.has(neighbor.id)) continue;

        const neighborNode = this.tour.getNode(neighbor.id);
        const candidatePositions = [
          { after: neighborNode.prev, before: neighborNode },
          { after: neighborNode, before: neighborNode.next },
        ];

        for (const pos of candidatePositions) {
          if (pos.after.cityId === currentCityId || pos.before.cityId === currentCityId) continue;
          if (pos.after === currentNode || pos.before === currentNode) continue;

          const costToInsert =
            this.dist(this.cities[pos.after.cityId], city) +
            this.dist(city, this.cities[pos.before.cityId]) -
            this.dist(this.cities[pos.after.cityId], this.cities[pos.before.cityId]);

          const gain = savingByRemoval - costToInsert;

          if (gain > 0.000001 && gain > bestMove.gain) {
            bestMove = { gain, targetNode: pos.after };
          }
        }
      }

      if (bestMove.gain > 0) {
        const oldPrev = currentNode.prev;
        const oldNext = currentNode.next;

        this.tour.moveToAfter(currentNode, bestMove.targetNode);

        modified.add(oldPrev.cityId);
        modified.add(oldNext.cityId);
        modified.add(bestMove.targetNode.cityId);
        modified.add(bestMove.targetNode.next.cityId);
        modified.add(currentCityId);
      }

      modified.delete(currentCityId);
    }

    const stats = { iterations, maxDepth };
    this.setPool.release(modified);
    return stats;
  }

  /**
   * Alias for addEventListener to provide a simpler API
   */
  on(eventName, listener) {
    this.addEventListener(eventName, listener);
  }

  getTour() {
    return this.tour.toArray();
  }

  getCost() {
    if (this.tour.size === 0) return 0;
    let c = 0;
    for (const cityId of this.tour) {
      const node = this.tour.getNode(cityId);
      c += this.dist(this.cities[cityId], this.cities[node.next.cityId]);
    }
    return c;
  }
}

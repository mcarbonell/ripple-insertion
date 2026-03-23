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
 * CustomEvent polyfill for Node.js environments (like Node 18.x) where
 * EventTarget is available but CustomEvent is not exposed globally.
 */
class CustomEventFallback extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.detail = eventInitDict.detail;
  }
}

const SafeCustomEvent =
  typeof CustomEvent !== 'undefined' ? CustomEvent : CustomEventFallback;

/**
 * EventTarget is available natively in Node.js (>=16) and Browsers
 */
export class RippleInsertion extends EventTarget {
  constructor(options = {}) {
    super();
    this.edgeWeightType = options.edgeWeightType || 'EUC_2D';
    this.explicitWeights = options.explicitWeights || null;
    this.maxK = options.maxK || 20;
    this.adaptiveMaxK = options.adaptiveMaxK ?? true;

    // 2-opt options
    this.enable2Opt = options.enable2Opt || false;
    this.max2OptIterations = options.max2OptIterations || 50;
    this._twoOptApplied = false; // Track if 2-opt has been applied

    // Or-opt options
    this.enableOrOpt = options.enableOrOpt || false;
    this.maxOrOptIterations = options.maxOrOptIterations || 50;

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
        const nodes = Array.from(this.tour).map((cId) =>
          this.tour.getNode(cId)
        );
        if (nodes.length === 3) {
          nodes[0].next = nodes[1];
          nodes[1].prev = nodes[0];
          nodes[1].next = nodes[2];
          nodes[2].prev = nodes[1];
          nodes[2].next = nodes[0];
          nodes[0].prev = nodes[2];
        }
      }
      this.dispatchEvent(
        new SafeCustomEvent('tourUpdated', { detail: { id } })
      );
      return {
        iterations: 0,
        maxDepth: 0,
        twoOpt: { iterations: 0, improvements: 0 },
      };
    } else {
      return this._insertAndOptimize(id);
    }
  }

  _insertAndOptimize(cityId) {
    const city = this.cities[cityId];
    const currentK = this._getAdaptiveK();
    const nearestNeighbors = this.kdtree.nearestNeighbors(
      city.x,
      city.y,
      currentK
    );

    let bestInsertion = { cost: Infinity, afterNode: null };
    const checkedNodes = new Set();

    // 1. Check insertion points near spatial neighbors
    for (const neighbor of nearestNeighbors) {
      const neighborNode = this.tour.getNode(neighbor.id);
      if (neighborNode && !checkedNodes.has(neighborNode)) {
        checkedNodes.add(neighborNode);

        // Check inserting AFTER the neighbor
        const costAfter = this.insertionCost(
          cityId,
          neighborNode.cityId,
          neighborNode.next.cityId
        );
        if (costAfter < bestInsertion.cost) {
          bestInsertion = { cost: costAfter, afterNode: neighborNode };
        }

        // Check inserting BEFORE the neighbor (i.e., after its prev)
        const costBefore = this.insertionCost(
          cityId,
          neighborNode.prev.cityId,
          neighborNode.cityId
        );
        if (costBefore < bestInsertion.cost) {
          bestInsertion = { cost: costBefore, afterNode: neighborNode.prev };
        }
      }
    }

    // Fallback: check random positions if no good candidates
    if (bestInsertion.cost === Infinity) {
      let current = this.tour.head;
      let count = 0;
      do {
        const cost = this.insertionCost(
          cityId,
          current.cityId,
          current.next.cityId
        );
        if (cost < bestInsertion.cost) {
          bestInsertion = { cost, afterNode: current };
        }
        current = current.next;
        count++;
      } while (current !== this.tour.head && count < 20);
    }

    // Insert the city
    this.tour.insertAfter(bestInsertion.afterNode, cityId);
    this.dispatchEvent(new SafeCustomEvent('inserted', { detail: { cityId } }));

    // 2. Cascade Optimization
    const startNodes = this.setPool.acquire();
    startNodes.add(cityId);
    startNodes.add(bestInsertion.afterNode.cityId);
    startNodes.add(bestInsertion.afterNode.next.cityId);

    for (const neighbor of nearestNeighbors) {
      if (this.tour.has(neighbor.id)) {
        startNodes.add(neighbor.id);
      }
    }

    const rippleStats = this._optimizeRipple(startNodes);
    this.setPool.release(startNodes);

    this.dispatchEvent(
      new SafeCustomEvent('tourUpdated', { detail: { id: cityId } })
    );
    return rippleStats;
  }

  /**
   * Removes a city from the tour and triggers ripple optimization.
   * @param {number} cityId - ID of the city to remove
   * @returns {{ iterations: number, maxDepth: number, removedCost: number }}
   */
  removeCity(cityId) {
    if (this.tour.size === 0) {
      return { iterations: 0, maxDepth: 0, removedCost: 0 };
    }

    const node = this.tour.getNode(cityId);
    if (!node) {
      return { iterations: 0, maxDepth: 0, removedCost: 0 };
    }

    const prevNode = node.prev;
    const nextNode = node.next;

    const removedCost =
      this.dist(this.cities[cityId], prevNode) +
      this.dist(this.cities[cityId], nextNode) -
      this.dist(this.cities[prevNode.cityId], this.cities[nextNode.cityId]);

    this.tour.remove(node);
    delete this.cities[cityId];
    delete this.originalCities[cityId];
    this.kdtree.remove(cityId);

    if (this.tour.size < 3) {
      this.dispatchEvent(
        new SafeCustomEvent('tourUpdated', {
          detail: { id: cityId, removed: true },
        })
      );
      return { iterations: 0, maxDepth: 0, removedCost };
    }

    const affectedSet = this.setPool.acquire();
    affectedSet.add(prevNode.cityId);
    affectedSet.add(nextNode.cityId);

    const rippleStats = this._optimizeRipple(affectedSet);
    this.setPool.release(affectedSet);

    this.dispatchEvent(
      new SafeCustomEvent('tourUpdated', {
        detail: { id: cityId, removed: true },
      })
    );

    return { ...rippleStats, removedCost };
  }

  /**
   * Adds multiple cities to the tour in optimized order.
   * @param {Array<{id: number, x: number, y: number}>} cities - Array of cities to add
   * @param {Object} options - Options for batch insertion
   * @param {boolean} options.useOnionPeeling - Use convex hull order (default: false)
   * @returns {{ totalIterations: number, avgRipplesPerInsert: number, totalTime: number }}
   */
  addCities(cities, options = {}) {
    const useOnionPeeling = options.useOnionPeeling ?? false;
    let insertionOrder = cities.map((c) => c.id);

    if (useOnionPeeling && cities.length > 3) {
      const points = cities.map((c) => ({ id: c.id, x: c.x, y: c.y }));
      const layers = onionPeeling(points);
      insertionOrder = getOnionInsertionOrder(layers);
    }

    const startTime = performance.now();
    let totalIterations = 0;

    for (const cityId of insertionOrder) {
      const city = cities.find((c) => c.id === cityId);
      if (city) {
        const result = this.addCity(city.id, city.x, city.y);
        totalIterations += result.iterations;
      }
    }

    const totalTime = performance.now() - startTime;
    const avgRipplesPerInsert =
      cities.length > 0 ? totalIterations / cities.length : 0;

    return {
      totalIterations,
      avgRipplesPerInsert,
      totalTime,
    };
  }

  /**
   * Applies 2-opt optimization to the entire tour.
   * Should be called after all cities have been added.
   * @returns {{ iterations: number, improvements: number }}
   */
  apply2Opt() {
    if (this.tour.size < 4) {
      return { iterations: 0, improvements: 0 };
    }

    const stats = this._twoOptOptimize();
    this._twoOptApplied = true;

    this.dispatchEvent(
      new SafeCustomEvent('tourUpdated', { detail: { id: '2opt' } })
    );

    return stats;
  }

  /**
   * Applies Or-opt optimization to the entire tour.
   * Relocates segments of 1-3 consecutive cities to better positions.
   * @param {number} maxIterations - Maximum passes over the tour (default: 50)
   * @returns {{ iterations: number, improvements: number }}
   */
  applyOrOpt(maxIterations = 50) {
    if (this.tour.size < 4) {
      return { iterations: 0, improvements: 0 };
    }

    let improvements = 0;
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      let improved = false;
      const tourArray = this.tour.toArray();
      const n = tourArray.length;

      for (let i = 0; i < n; i++) {
        const cityId = tourArray[i];
        const node = this.tour.getNode(cityId);

        const prevId = node.prev.cityId;
        const nextId = node.next.cityId;

        const currentCost =
          this.dist(this.cities[prevId], this.cities[cityId]) +
          this.dist(this.cities[cityId], this.cities[nextId]) -
          this.dist(this.cities[prevId], this.cities[nextId]);

        let bestGain = 0;
        let bestAfterId = null;

        for (let j = 0; j < n; j++) {
          if (j === i || j === (i + 1) % n) continue;

          const afterId = tourArray[j];
          const afterNode = this.tour.getNode(afterId);

          if (afterNode.next.cityId === cityId) continue;
          if (afterId === prevId) continue;

          const newCost =
            this.dist(this.cities[afterId], this.cities[cityId]) +
            this.dist(this.cities[cityId], this.cities[afterNode.next.cityId]) -
            this.dist(this.cities[afterId], this.cities[afterNode.next.cityId]);

          const gain = currentCost - newCost;
          if (gain > bestGain) {
            bestGain = gain;
            bestAfterId = afterId;
          }
        }

        if (bestGain > 0.000001) {
          const afterNode = this.tour.getNode(bestAfterId);
          this.tour.moveToAfter(node, afterNode);
          improved = true;
          improvements++;
        }
      }

      iterations++;
      if (!improved) break;
    }

    return { iterations, improvements };
  }

  /**
   * 2-opt local search optimization.
   * Reverses tour segments to eliminate edge crossings.
   * @returns {{ iterations: number, improvements: number }}
   */
  _twoOptOptimize() {
    let improvements = 0;
    let iterations = 0;
    const n = this.tour.size;

    if (n < 4) return { iterations: 0, improvements: 0 };

    const tourArray = this.tour.toArray();

    for (let i = 0; i < Math.min(this.max2OptIterations, n); i++) {
      let improved = false;

      for (let a = 0; a < n - 1; a++) {
        for (let b = a + 2; b < n; b++) {
          if (a === 0 && b === n - 1) continue;

          const cityA = tourArray[a];
          const cityB = tourArray[(a + 1) % n];
          const cityC = tourArray[b];
          const cityD = tourArray[(b + 1) % n];

          const currentDist =
            this.dist(this.cities[cityA], this.cities[cityB]) +
            this.dist(this.cities[cityC], this.cities[cityD]);

          const newDist =
            this.dist(this.cities[cityA], this.cities[cityC]) +
            this.dist(this.cities[cityB], this.cities[cityD]);

          if (newDist < currentDist - 0.000001) {
            this._reverseSegment(a + 1, b);
            improved = true;
            improvements++;

            // Update tour array after reversal
            const newTour = this.tour.toArray();
            for (let k = 0; k < n; k++) {
              tourArray[k] = newTour[k];
            }
          }
        }
        iterations++;
      }

      if (!improved) break;
    }

    return { iterations, improvements };
  }

  /**
   * Reverses a segment of the tour from index start to end (inclusive).
   * Uses DoublyLinkedTour API to maintain data structure integrity.
   * @param {number} start - Start index in tour array
   * @param {number} end - End index in tour array
   */
  _reverseSegment(start, end) {
    const tourArray = this.tour.toArray();
    const n = tourArray.length;

    if (start >= end || start < 0 || end >= n) return;

    // Get nodes for the segment
    const segmentNodes = [];
    for (let i = start; i <= end; i++) {
      const node = this.tour.getNode(tourArray[i]);
      if (node) segmentNodes.push(node);
    }

    if (segmentNodes.length < 2) return;

    // Get the node before the segment (or null if segment starts at head)
    const beforeSegment = segmentNodes[0].prev;
    const afterSegment = segmentNodes[segmentNodes.length - 1].next;

    // Remove all nodes in the segment
    for (const node of segmentNodes) {
      this.tour.remove(node);
    }

    // Re-insert in reversed order
    let insertAfter = beforeSegment;
    for (let i = segmentNodes.length - 1; i >= 0; i--) {
      insertAfter = this.tour.insertAfter(insertAfter, segmentNodes[i].cityId);
    }
  }

  _optimizeRipple(initialSet) {
    let modified = this.setPool.acquire();
    initialSet.forEach((id) => modified.add(id));

    let iterations = 0;
    let maxDepth = 0;

    while (modified.size > 0) {
      iterations++;
      maxDepth = Math.max(maxDepth, iterations);

      const currentCityId = modified.values().next().value;
      const currentNode = this.tour.getNode(currentCityId);

      if (!currentNode) {
        modified.delete(currentCityId);
        continue;
      }

      this.dispatchEvent(
        new SafeCustomEvent('rippleStep', {
          detail: { currentCityId, modified: new Set(modified) },
        })
      );

      const city = this.cities[currentCityId];
      const currentK = this._getAdaptiveK();
      const spatialNeighbors = this.kdtree.nearestNeighbors(
        city.x,
        city.y,
        currentK
      );

      const prevCityId = currentNode.prev.cityId;
      const nextCityId = currentNode.next.cityId;
      const currentCost =
        this.dist(this.cities[prevCityId], city) +
        this.dist(city, this.cities[nextCityId]);
      const bridgedCost = this.dist(
        this.cities[prevCityId],
        this.cities[nextCityId]
      );
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
          if (
            pos.after.cityId === currentCityId ||
            pos.before.cityId === currentCityId
          )
            continue;
          if (pos.after === currentNode || pos.before === currentNode) continue;

          const costToInsert =
            this.dist(this.cities[pos.after.cityId], city) +
            this.dist(city, this.cities[pos.before.cityId]) -
            this.dist(
              this.cities[pos.after.cityId],
              this.cities[pos.before.cityId]
            );

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

  _getAdaptiveK() {
    if (!this.adaptiveMaxK) {
      return this.maxK;
    }
    const n = this.tour.size;
    return Math.min(50, Math.max(15, Math.floor(n * 0.2)));
  }
}

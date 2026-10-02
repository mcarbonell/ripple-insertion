/**
 * Ripple Insertion V2 - Dynamic TSP Optimizer.
 * Optimized with Wavefront Pruning and Lazy Spatial Indexing.
 */

class RippleInsertionV2 {
  constructor(cities, spatialIndex) {
    this.cities = cities;
    this.spatialIndex = spatialIndex;
    this.tour = [];
    this.rebalanceThreshold = 50;
    this.insertionsSinceRebalance = 0;
  }

  insertPoint(newCity) {
    // Step 1: Handling initial tour formation
    if (this.tour.length < 3) {
      this.tour.push(newCity);
      if (this.tour.length === 3) {
        this.spatialIndex.rebuild(this.tour);
      }
      return;
    }

    // Step 2: Find nearest neighbor in the existing tour
    const nearest = this.spatialIndex.findNearest(newCity);

    // Safety fallback: if index fails, use first point
    let tourIdx = nearest ? this.tour.indexOf(nearest) : 0;
    if (tourIdx === -1) tourIdx = 0;

    // Step 3: Initial Insertion (Cheapest neighbor search)
    const prev = this.tour[(tourIdx - 1 + this.tour.length) % this.tour.length];
    const current = this.tour[tourIdx];
    const next = this.tour[(tourIdx + 1) % this.tour.length];

    const costPrev =
      this._dist(prev, newCity) +
      this._dist(newCity, current) -
      this._dist(prev, current);
    const costNext =
      this._dist(current, newCity) +
      this._dist(newCity, next) -
      this._dist(current, next);

    let insertAt =
      costPrev < costNext ? tourIdx : (tourIdx + 1) % this.tour.length;
    this.tour.splice(insertAt, 0, newCity);

    // Step 4: Ripple Effect (Adaptive Wavefront Pruning)
    this._ripple(insertAt, 3);

    // Step 5: Lazy Maintenance of spatial index
    this.insertionsSinceRebalance++;
    if (this.insertionsSinceRebalance >= this.rebalanceThreshold) {
      this.spatialIndex.rebuild(this.tour);
      this.insertionsSinceRebalance = 0;
    }
  }

  _ripple(idx, depth) {
    if (depth <= 0 || this.tour.length < 4) return;

    const i = (idx - 1 + this.tour.length) % this.tour.length;
    const j = idx;
    const k = (idx + 1) % this.tour.length;
    const l = (idx + 2) % this.tour.length;

    const cI = this.tour[i],
      cJ = this.tour[j],
      cK = this.tour[k],
      cL = this.tour[l];

    if (!cI || !cJ || !cK || !cL) return;

    const currentDist = this._dist(cI, cJ) + this._dist(cK, cL);
    const swapDist = this._dist(cI, cK) + this._dist(cJ, cL);

    if (swapDist < currentDist * 0.999) {
      [this.tour[j], this.tour[k]] = [this.tour[k], this.tour[j]];
      this._ripple(i, depth - 1);
      this._ripple(k, depth - 1);
    }
  }

  _dist(c1, c2) {
    if (!c1 || !c2) return 0;
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getCost() {
    let total = 0;
    for (let i = 0; i < this.tour.length; i++) {
      total += this._dist(this.tour[i], this.tour[(i + 1) % this.tour.length]);
    }
    return total;
  }
}

export default RippleInsertionV2;

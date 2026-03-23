// Optimized for KD-Tree nearest neighbor search: Structure of Arrays
export class FastBinaryHeap {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.nodes = new Array(maxSize);
    // Use Float64Array for fast squared distance storage
    this.sqDistances = new Float64Array(maxSize);
    this._size = 0;
  }

  push(node, sqDist) {
    if (this._size < this.maxSize) {
      this.nodes[this._size] = node;
      this.sqDistances[this._size] = sqDist;
      this._bubbleUp(this._size);
      this._size++;
    } else if (sqDist < this.sqDistances[0]) {
      this.nodes[0] = node;
      this.sqDistances[0] = sqDist;
      this._sinkDown(0);
    }
  }

  peekDistance() {
    return this._size === 0 ? Infinity : this.sqDistances[0];
  }

  size() {
    return this._size;
  }

  toArray() {
    const result = new Array(this._size);
    for (let i = 0; i < this._size; i++) {
      result[i] = { node: this.nodes[i], sqDistance: this.sqDistances[i] };
    }
    return result;
  }

  _bubbleUp(idx) {
    const node = this.nodes[idx];
    const sqDist = this.sqDistances[idx];

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      // Max-heap logic: parent should be LARGER. If new item is smaller, stop bubbling up.
      if (sqDist <= this.sqDistances[parentIdx]) break;

      this.nodes[idx] = this.nodes[parentIdx];
      this.sqDistances[idx] = this.sqDistances[parentIdx];
      idx = parentIdx;
    }
    this.nodes[idx] = node;
    this.sqDistances[idx] = sqDist;
  }

  _sinkDown(idx) {
    const node = this.nodes[idx];
    const sqDist = this.sqDistances[idx];
    const len = this._size;

    while (true) {
      const leftIdx = 2 * idx + 1;
      const rightIdx = 2 * idx + 2;
      let swapIdx = -1;

      // We want to sink the item down if it's SMALLER than its children.
      // So we swap with the LARGEST child.
      if (leftIdx < len && this.sqDistances[leftIdx] > sqDist) {
        swapIdx = leftIdx;
      }

      if (rightIdx < len) {
        if (
          (swapIdx === -1 && this.sqDistances[rightIdx] > sqDist) ||
          (swapIdx !== -1 &&
            this.sqDistances[rightIdx] > this.sqDistances[leftIdx])
        ) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === -1) break;

      this.nodes[idx] = this.nodes[swapIdx];
      this.sqDistances[idx] = this.sqDistances[swapIdx];
      idx = swapIdx;
    }
    this.nodes[idx] = node;
    this.sqDistances[idx] = sqDist;
  }
}

class KDTreeNode {
  constructor(point, axis, data) {
    this.point = point;
    this.left = null;
    this.right = null;
    this.axis = axis;
    this.data = data;
  }
}

export class OptimizedKDTree {
  constructor() {
    this.root = null;
    this.points = []; // Batch insertions for bulk rebuild
    this.insertionCount = 0;
    this.lastRebuildSize = 0;
    this.REBUILD_THRESHOLD = 50; // Rebuild after this many insertions
  }

  insert(city) {
    this.points.push({ arr: [city.x, city.y], data: city });
    this.insertionCount++;

    // Rebuild if threshold reached or tree too unbalanced
    const shouldRebuild =
      this.insertionCount >= this.REBUILD_THRESHOLD ||
      (this.root && this.insertionCount > Math.sqrt(this.points.length) * 2);

    if (shouldRebuild) {
      this.rebuild();
    } else if (!this.root) {
      // First insertion
      this.root = new KDTreeNode([city.x, city.y], 0, city);
    } else {
      // Incremental insertion
      this._insertIncremental(this.root, [city.x, city.y], city, 0);
    }
  }

  _insertIncremental(node, point, data, depth) {
    const axis = depth % 2;
    if (point[axis] < node.point[axis]) {
      if (node.left === null) {
        node.left = new KDTreeNode(point, (depth + 1) % 2, data);
      } else {
        this._insertIncremental(node.left, point, data, depth + 1);
      }
    } else {
      if (node.right === null) {
        node.right = new KDTreeNode(point, (depth + 1) % 2, data);
      } else {
        this._insertIncremental(node.right, point, data, depth + 1);
      }
    }
  }

  rebuild() {
    if (this.points.length === 0) return;
    this.root = this._buildTree([...this.points], 0);
    this.insertionCount = 0;
    this.lastRebuildSize = this.points.length;
  }

  _buildTree(points, depth) {
    if (points.length === 0) return null;
    const axis = depth % 2;
    points.sort((a, b) => a.arr[axis] - b.arr[axis]);
    const medianIndex = Math.floor(points.length / 2);
    const node = new KDTreeNode(
      points[medianIndex].arr,
      axis,
      points[medianIndex].data
    );
    node.left = this._buildTree(points.slice(0, medianIndex), depth + 1);
    node.right = this._buildTree(points.slice(medianIndex + 1), depth + 1);
    return node;
  }

  nearestNeighbors(x, y, k) {
    if (!this.root) return [];
    const point = [x, y];
    // Use squared distance for faster comparisons without Math.sqrt
    const neighbors = new FastBinaryHeap(k);
    this._searchNearest(this.root, point, k, neighbors);
    return neighbors.toArray().map((n) => n.node.data);
  }

  _searchNearest(node, point, k, neighbors) {
    if (!node) return;
    const dx = point[0] - node.point[0];
    const dy = point[1] - node.point[1];
    const sqDist = dx * dx + dy * dy;

    neighbors.push(node, sqDist);

    const axis = node.axis;
    const diff = point[axis] - node.point[axis];
    const nearChild = diff < 0 ? node.left : node.right;
    const farChild = diff < 0 ? node.right : node.left;

    this._searchNearest(nearChild, point, k, neighbors);

    if (neighbors.size() < k || diff * diff < neighbors.peekDistance()) {
      this._searchNearest(farChild, point, k, neighbors);
    }
  }

  clear() {
    this.root = null;
    this.points = [];
    this.insertionCount = 0;
    this.lastRebuildSize = 0;
  }

  remove(cityId) {
    const idx = this.points.findIndex((p) => p.data.id === cityId);
    if (idx !== -1) {
      this.points.splice(idx, 1);
    }
    if (this.points.length === 0) {
      this.root = null;
    } else {
      this.rebuild();
    }
  }
}

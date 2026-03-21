export class FastBinaryHeap {
  constructor(compare, maxSize) {
    this.compare = compare;
    this.maxSize = maxSize;
    this.heap = [];
  }

  push(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else if (this.compare(item, this.heap[0]) < 0) {
      this.heap[0] = item;
      this._sinkDown(0);
    }
  }

  peek() {
    return this.heap[0];
  }

  size() {
    return this.heap.length;
  }

  toArray() {
    return this.heap;
  }

  _bubbleUp(idx) {
    const item = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.compare(item, this.heap[parentIdx]) >= 0) break;
      this.heap[idx] = this.heap[parentIdx];
      idx = parentIdx;
    }
    this.heap[idx] = item;
  }

  _sinkDown(idx) {
    const item = this.heap[idx];
    const len = this.heap.length;
    while (true) {
      const leftIdx = 2 * idx + 1;
      const rightIdx = 2 * idx + 2;
      let swapIdx = -1;

      if (leftIdx < len && this.compare(this.heap[leftIdx], item) < 0) {
        swapIdx = leftIdx;
      }
      if (
        rightIdx < len &&
        this.compare(this.heap[rightIdx], item) < 0 &&
        (swapIdx === -1 ||
          this.compare(this.heap[rightIdx], this.heap[leftIdx]) < 0)
      ) {
        swapIdx = rightIdx;
      }

      if (swapIdx === -1) break;
      this.heap[idx] = this.heap[swapIdx];
      idx = swapIdx;
    }
    this.heap[idx] = item;
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
      (this.root &&
        this.insertionCount > Math.sqrt(this.points.length) * 2);

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
    node.right = this._buildTree(
      points.slice(medianIndex + 1),
      depth + 1
    );
    return node;
  }

  nearestNeighbors(x, y, k) {
    if (!this.root) return [];
    const point = [x, y];
    const neighbors = new FastBinaryHeap(
      (a, b) => a.distance - b.distance,
      k
    );
    this._searchNearest(this.root, point, k, neighbors);
    return neighbors.toArray().map((n) => n.node.data);
  }

  _searchNearest(node, point, k, neighbors) {
    if (!node) return;
    const d = Math.hypot(
      point[0] - node.point[0],
      point[1] - node.point[1]
    );
    neighbors.push({ node, distance: d });

    const axis = node.axis;
    const diff = point[axis] - node.point[axis];
    const nearChild = diff < 0 ? node.left : node.right;
    const farChild = diff < 0 ? node.right : node.left;

    this._searchNearest(nearChild, point, k, neighbors);

    if (
      neighbors.size() < k ||
      Math.abs(diff) < neighbors.peek().distance
    ) {
      this._searchNearest(farChild, point, k, neighbors);
    }
  }

  clear() {
    this.root = null;
    this.points = [];
    this.insertionCount = 0;
    this.lastRebuildSize = 0;
  }
}

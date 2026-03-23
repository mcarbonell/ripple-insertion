import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OptimizedKDTree, FastBinaryHeap } from '../src/kd-tree.js';

describe('FastBinaryHeap', () => {
  it('should maintain max size and order correctly', () => {
    const heap = new FastBinaryHeap(3);

    heap.push({ id: 1 }, 10);
    heap.push({ id: 2 }, 5);
    heap.push({ id: 3 }, 20);

    assert.equal(heap.size(), 3);
  });

  it('should behave as a max-heap for nearest neighbor tracking', () => {
    // For kNN we want to keep the K smallest elements.
    // Therefore, the heap must be a MAX-HEAP (the root is the largest of the K smallest).

    const heap = new FastBinaryHeap(3);

    heap.push({ id: 1 }, 10);
    heap.push({ id: 2 }, 30);
    heap.push({ id: 3 }, 20);

    // Root should be 30
    assert.equal(heap.peekDistance(), 30);

    // If we push a smaller one, it should replace 30
    heap.push({ id: 4 }, 5);

    // Now the largest should be 20
    assert.equal(heap.peekDistance(), 20);

    // Verify it kept the smallest ones
    const ids = heap.toArray().map((n) => n.node.id);
    assert.ok(ids.includes(1)); // dist 10
    assert.ok(ids.includes(3)); // dist 20
    assert.ok(ids.includes(4)); // dist 5
    assert.ok(!ids.includes(2)); // dist 30 should be gone
  });
});

describe('OptimizedKDTree', () => {
  it('should insert points and build tree correctly', () => {
    const kdtree = new OptimizedKDTree();

    kdtree.insert({ id: 1, x: 10, y: 10 });
    kdtree.insert({ id: 2, x: 20, y: 20 });
    kdtree.insert({ id: 3, x: 5, y: 5 });

    assert.equal(kdtree.insertionCount, 3);
    assert.ok(kdtree.root);
  });

  it('should rebuild tree when threshold is reached', () => {
    const kdtree = new OptimizedKDTree();
    kdtree.REBUILD_THRESHOLD = 5; // Lower threshold for testing

    for (let i = 0; i < 5; i++) {
      kdtree.insert({ id: i, x: Math.random() * 100, y: Math.random() * 100 });
    }

    assert.equal(kdtree.insertionCount, 0); // 5th insertion triggers rebuild, resetting it to 0
    assert.equal(kdtree.points.length, 5);

    // Trigger another insertion
    kdtree.insert({ id: 5, x: 50, y: 50 });

    assert.equal(kdtree.insertionCount, 1);
    assert.equal(kdtree.points.length, 6);
  });

  it('should find nearest neighbors correctly', () => {
    const kdtree = new OptimizedKDTree();

    kdtree.insert({ id: 1, x: 0, y: 0 });
    kdtree.insert({ id: 2, x: 1, y: 1 });
    kdtree.insert({ id: 3, x: 10, y: 10 });
    kdtree.insert({ id: 4, x: 100, y: 100 });

    const neighbors = kdtree.nearestNeighbors(2, 2, 2);

    // The closest to (2,2) are (1,1) [id: 2] and (0,0) [id: 1] or (10,10) [id: 3] depending on k.
    // dist to (1,1) is sqrt(2) ≈ 1.41
    // dist to (0,0) is sqrt(8) ≈ 2.82
    // dist to (10,10) is sqrt(128) ≈ 11.3

    assert.equal(neighbors.length, 2);

    // Verify ids are present. The order from FastBinaryHeap.toArray() is not strictly sorted,
    // but the array contains the correct items.
    const ids = neighbors.map((n) => n.id);
    assert.ok(ids.includes(1));
    assert.ok(ids.includes(2));
    assert.ok(!ids.includes(4));
  });

  it('should clear state', () => {
    const kdtree = new OptimizedKDTree();
    kdtree.insert({ id: 1, x: 0, y: 0 });

    kdtree.clear();

    assert.equal(kdtree.root, null);
    assert.equal(kdtree.points.length, 0);
    assert.equal(kdtree.insertionCount, 0);
    assert.deepEqual(kdtree.nearestNeighbors(0, 0, 1), []);
  });
});

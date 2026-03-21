import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DoublyLinkedTour, TourNode } from '../src/doubly-linked-tour.js';

describe('DoublyLinkedTour', () => {
  it('should initialize empty', () => {
    const tour = new DoublyLinkedTour();
    assert.equal(tour.size, 0);
    assert.equal(tour.head, null);
    assert.deepEqual(tour.toArray(), []);
  });

  it('should insert first node correctly', () => {
    const tour = new DoublyLinkedTour();
    const node = tour.insertAfter(null, 1);

    assert.equal(tour.size, 1);
    assert.equal(tour.head, node);
    assert.equal(node.cityId, 1);
    assert.equal(node.next, node);
    assert.equal(node.prev, node);
    assert.deepEqual(tour.toArray(), [1]);
    assert.equal(tour.has(1), true);
  });

  it('should insert multiple nodes and maintain circular links', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);
    const n3 = tour.insertAfter(n2, 3);

    assert.equal(tour.size, 3);
    assert.deepEqual(tour.toArray(), [1, 2, 3]);

    // Check circularity
    assert.equal(n1.next, n2);
    assert.equal(n2.next, n3);
    assert.equal(n3.next, n1);

    assert.equal(n3.prev, n2);
    assert.equal(n2.prev, n1);
    assert.equal(n1.prev, n3);
  });

  it('should remove a node correctly', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);
    const n3 = tour.insertAfter(n2, 3);

    tour.remove(n2);

    assert.equal(tour.size, 2);
    assert.deepEqual(tour.toArray(), [1, 3]);
    assert.equal(n1.next, n3);
    assert.equal(n3.prev, n1);
    assert.equal(tour.has(2), false);
  });

  it('should update head if head is removed', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);

    tour.remove(n1);

    assert.equal(tour.size, 1);
    assert.equal(tour.head, n2);
    assert.deepEqual(tour.toArray(), [2]);
  });

  it('should clear to empty state if last node is removed', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);

    tour.remove(n1);

    assert.equal(tour.size, 0);
    assert.equal(tour.head, null);
    assert.deepEqual(tour.toArray(), []);
    assert.equal(tour.has(1), false);
  });

  it('should move a node after a target node', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);
    const n3 = tour.insertAfter(n2, 3);
    const n4 = tour.insertAfter(n3, 4);
    // State: 1 -> 2 -> 3 -> 4

    // Move 2 after 4
    tour.moveToAfter(n2, n4);

    assert.equal(tour.size, 4);
    assert.deepEqual(tour.toArray(), [1, 3, 4, 2]);
    assert.equal(n4.next, n2);
    assert.equal(n2.prev, n4);
    assert.equal(n2.next, n1);
    assert.equal(n1.prev, n2);
  });

  it('should not break if moving a node after itself or its immediate prev', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);
    const n3 = tour.insertAfter(n2, 3);

    // Moving n2 after n2 shouldn't do anything
    tour.moveToAfter(n2, n2);
    assert.deepEqual(tour.toArray(), [1, 2, 3]);

    // Moving n3 after n2 (where it already is) shouldn't do anything
    tour.moveToAfter(n3, n2);
    assert.deepEqual(tour.toArray(), [1, 2, 3]);
  });

  it('should retrieve node by cityId using getNode', () => {
    const tour = new DoublyLinkedTour();
    tour.insertAfter(null, 10);
    tour.insertAfter(tour.getNode(10), 20);

    const node = tour.getNode(20);
    assert.ok(node);
    assert.equal(node.cityId, 20);
  });

  it('should correctly return neighbors', () => {
    const tour = new DoublyLinkedTour();
    const n1 = tour.insertAfter(null, 1);
    const n2 = tour.insertAfter(n1, 2);
    const n3 = tour.insertAfter(n2, 3);

    assert.deepEqual(tour.getNeighbors(2), [1, 3]);
    assert.deepEqual(tour.getNeighbors(1), [3, 2]);
  });

  it('should clear the tour entirely', () => {
    const tour = new DoublyLinkedTour();
    tour.insertAfter(null, 1);
    tour.insertAfter(tour.getNode(1), 2);

    tour.clear();

    assert.equal(tour.size, 0);
    assert.equal(tour.head, null);
    assert.equal(tour.has(1), false);
    assert.equal(tour.nodeMap.size, 0);
  });

  it('should iterate correctly with for...of', () => {
    const tour = new DoublyLinkedTour();
    tour.insertAfter(null, 1);
    tour.insertAfter(tour.getNode(1), 2);
    tour.insertAfter(tour.getNode(2), 3);

    const values = [];
    for (const cityId of tour) {
      values.push(cityId);
    }

    assert.deepEqual(values, [1, 2, 3]);
  });
});

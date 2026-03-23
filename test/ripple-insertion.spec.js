import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RippleInsertion } from '../src/ripple-insertion.js';

describe('RippleInsertion Algorithm', () => {
  it('should initialize correctly', () => {
    const solver = new RippleInsertion();
    assert.equal(solver.tour.size, 0);
    assert.equal(solver.cities.length, 0);
    assert.equal(solver.getCost(), 0);
    assert.deepEqual(solver.getTour(), []);
  });

  it('should handle first 3 cities without full optimization', () => {
    const solver = new RippleInsertion();

    // First insertion
    solver.addCity(0, 0, 0);
    assert.equal(solver.tour.size, 1);

    // Second insertion
    solver.addCity(1, 0, 10);
    assert.equal(solver.tour.size, 2);

    // Third insertion completes the triangle
    solver.addCity(2, 10, 0);
    assert.equal(solver.tour.size, 3);

    // Circular order, exact array order depends on insertion strategy (head points to 0, then 2, then 1)
    const tourArr = solver.getTour();
    assert.equal(tourArr.length, 3);
    assert.ok(
      tourArr.includes(0) && tourArr.includes(1) && tourArr.includes(2)
    );

    // Cost of a right triangle with sides 10, 10 and hypotenuse ~14.14
    // Using EUC_2D (rounded): 10 + 10 + 14 = 34
    assert.equal(solver.getCost(), 34);
  });

  it('should insert 4th city and optimize', () => {
    const solver = new RippleInsertion({ maxK: 5 });

    solver.addCity(0, 0, 0);
    solver.addCity(1, 0, 10);
    solver.addCity(2, 10, 10);

    // 4th city completes a square
    const stats = solver.addCity(3, 10, 0);

    assert.equal(solver.tour.size, 4);
    assert.ok(
      stats.iterations !== undefined,
      'Should return ripple optimization stats'
    );

    // The tour should be the perimeter of the square, cost = 40
    // EUC_2D uses nint, so exactly 40.
    assert.equal(solver.getCost(), 40);
  });

  it('should emit events correctly', (t) => {
    const solver = new RippleInsertion();

    let insertedFired = false;
    let tourUpdatedFired = false;

    solver.on('inserted', (e) => {
      if (e.detail.cityId === 3) insertedFired = true;
    });

    solver.on('tourUpdated', (e) => {
      if (e.detail.id === 3) tourUpdatedFired = true;
    });

    solver.addCity(0, 0, 0);
    solver.addCity(1, 0, 10);
    solver.addCity(2, 10, 10);
    solver.addCity(3, 10, 0);

    assert.equal(insertedFired, true);
    assert.equal(tourUpdatedFired, true);
  });

  it('should handle custom edge weight types correctly (GEO, ATT, CEIL_2D)', () => {
    // Testing GEO distance
    const solverGeo = new RippleInsertion({ edgeWeightType: 'GEO' });
    solverGeo.addCity(0, 0, 0); // Need coordinate logic based on TSPLIB for exact tests, but let's just ensure it runs
    solverGeo.addCity(1, 1, 1);
    assert.ok(solverGeo.dist({ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }) > 0);

    // Testing CEIL_2D
    const solverCeil = new RippleInsertion({ edgeWeightType: 'CEIL_2D' });
    // sqrt(1^2 + 1^2) = 1.414 -> ceil is 2
    assert.equal(
      solverCeil.dist({ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }),
      2
    );

    // EUC_2D uses nint (nearest integer), so sqrt(2)=1.414 -> nint is 1
    const solverEuc = new RippleInsertion({ edgeWeightType: 'EUC_2D' });
    assert.equal(
      solverEuc.dist({ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }),
      1
    );
  });

  it('should clear state properly', () => {
    const solver = new RippleInsertion();
    solver.addCity(0, 0, 0);
    solver.addCity(1, 0, 10);

    solver.clear();

    assert.equal(solver.tour.size, 0);
    assert.equal(solver.cities.length, 0);
    assert.equal(solver.kdtree.points.length, 0);
  });

  describe('2-opt Optimization', () => {
    it('should improve tour quality with 2-opt', () => {
      const solver = new RippleInsertion();

      // Create a scenario where 2-opt can improve
      // Cities arranged in a cross pattern
      const cities = [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 10, y: 10 },
        { id: 2, x: 20, y: 0 },
        { id: 3, x: 10, y: -10 },
      ];

      for (const city of cities) {
        solver.addCity(city.id, city.x, city.y);
      }

      const costBefore = solver.getCost();
      const stats = solver.apply2Opt();
      const costAfter = solver.getCost();

      // 2-opt should not make the tour worse
      assert.ok(
        costAfter <= costBefore + 0.001,
        `2-opt should not increase cost: ${costAfter} vs ${costBefore}`
      );

      // Stats should be returned
      assert.ok(
        typeof stats.iterations === 'number',
        'Should have iterations count'
      );
      assert.ok(
        typeof stats.improvements === 'number',
        'Should have improvements count'
      );
    });

    it('should return 2-opt stats from apply2Opt', () => {
      const solver = new RippleInsertion();

      solver.addCity(0, 0, 0);
      solver.addCity(1, 0, 10);
      solver.addCity(2, 10, 10);
      solver.addCity(3, 10, 0);

      const stats = solver.apply2Opt();

      assert.ok(
        typeof stats.iterations === 'number',
        'Should have iterations count'
      );
      assert.ok(
        typeof stats.improvements === 'number',
        'Should have improvements count'
      );
    });

    it('should not run 2-opt for tours with less than 4 cities', () => {
      const solver = new RippleInsertion();

      solver.addCity(0, 0, 0);
      solver.addCity(1, 0, 10);
      solver.addCity(2, 10, 10);

      const stats = solver.apply2Opt();

      assert.equal(stats.iterations, 0);
      assert.equal(stats.improvements, 0);
    });

    it('should maintain valid tour after 2-opt', () => {
      const solver = new RippleInsertion();

      // Add several cities
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, Math.random() * 100, Math.random() * 100);
      }

      solver.apply2Opt();
      const tour = solver.getTour();

      // Tour should contain all cities
      assert.equal(tour.length, 10);

      // All city IDs should be present
      for (let i = 0; i < 10; i++) {
        assert.ok(tour.includes(i), `Tour should contain city ${i}`);
      }

      // No duplicates
      const uniqueIds = new Set(tour);
      assert.equal(uniqueIds.size, 10);
    });
  });
});

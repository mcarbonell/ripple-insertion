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

  describe('Phase 1 Remediation Regressions', () => {
    it('should return valid finite removedCost from removeCity (C2 regression)', () => {
      const solver = new RippleInsertion();
      // Form a square: (0,0), (0,10), (10,10), (10,0)
      solver.addCity(0, 0, 0);
      solver.addCity(1, 0, 10);
      solver.addCity(2, 10, 10);
      solver.addCity(3, 10, 0);

      const costBefore = solver.getCost();
      const stats = solver.removeCity(3);

      assert.equal(typeof stats.removedCost, 'number');
      assert.ok(
        Number.isFinite(stats.removedCost),
        `removedCost must be finite, got: ${stats.removedCost}`
      );
      assert.ok(
        !Number.isNaN(stats.removedCost),
        'removedCost must not be NaN'
      );

      const costAfter = solver.getCost();
      // In square of side 10, removing one corner leaves right triangle of sides 10, 10, hypotenuse ~14.14
      // costBefore was 40, costAfter is 34. Difference is ~6.
      assert.ok(stats.removedCost > 0, 'removedCost should be positive');
      assert.ok(
        Math.abs(costBefore - costAfter - stats.removedCost) < 0.001,
        `removedCost (${stats.removedCost}) should equal cost delta (${costBefore - costAfter})`
      );
    });

    it('should validate inputs in addCity (M8)', () => {
      const solver = new RippleInsertion();

      // Non-integer ID
      assert.throws(
        () => solver.addCity('abc', 10, 10),
        /City id must be an integer/
      );
      assert.throws(
        () => solver.addCity(1.5, 10, 10),
        /City id must be an integer/
      );

      // Non-finite coordinates
      assert.throws(
        () => solver.addCity(0, NaN, 10),
        /City coordinates must be finite numbers/
      );
      assert.throws(
        () => solver.addCity(0, 10, Infinity),
        /City coordinates must be finite numbers/
      );

      // Duplicate ID
      solver.addCity(0, 10, 10);
      assert.throws(
        () => solver.addCity(0, 20, 20),
        /already exists in the tour/
      );
    });

    it('should throw explicit error on missing EXPLICIT weights (M3)', () => {
      const explicitWeights = [
        [0, 10],
        [10, 0],
      ];
      const solver = new RippleInsertion({
        edgeWeightType: 'EXPLICIT',
        explicitWeights,
      });

      solver.addCity(0, 0, 0);
      solver.addCity(1, 10, 0);

      // Pair (0, 2) is missing from the explicit weights matrix
      assert.throws(
        () => solver.dist({ id: 0 }, { id: 2 }),
        /Explicit weight missing for city pair \(0, 2\)/
      );
    });

    it('should track real cascade depth in maxDepth and relocatedCount (A1)', () => {
      const solver = new RippleInsertion();
      // Add points
      for (let i = 0; i < 8; i++) {
        solver.addCity(i, i * 10, (i % 2) * 10);
      }

      const stats = solver.addCity(8, 15, 5);
      assert.ok(Number.isInteger(stats.iterations));
      assert.ok(Number.isInteger(stats.maxDepth));
      assert.ok(stats.maxDepth >= 0, 'maxDepth should be non-negative');
      assert.ok(
        stats.maxDepth <= stats.iterations,
        `maxDepth (${stats.maxDepth}) should be <= iterations (${stats.iterations})`
      );
      assert.ok(stats.relocatedCount !== undefined);
    });

    it('should respect custom maxIterations in apply2Opt and applyOrOpt (A4)', () => {
      const solver = new RippleInsertion({
        max2OptIterations: 5,
        maxOrOptIterations: 5,
      });

      for (let i = 0; i < 20; i++) {
        solver.addCity(i, Math.random() * 100, Math.random() * 100);
      }

      const stats2Opt = solver.apply2Opt(2);
      assert.ok(stats2Opt.iterations <= 2);

      const statsOrOpt = solver.applyOrOpt(3);
      assert.ok(statsOrOpt.iterations <= 3);
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RippleInsertion } from '../src/ripple-insertion.js';

function createGrid(rows, cols, spacing = 10) {
  const cities = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cities.push({ id: id++, x: c * spacing, y: r * spacing });
    }
  }
  return cities;
}

function assertValidTour(solver, expectedSize) {
  const tour = solver.getTour();
  assert.equal(
    tour.length,
    expectedSize,
    `Tour should have ${expectedSize} cities`
  );
  const unique = new Set(tour);
  assert.equal(unique.size, expectedSize, 'Tour should have no duplicates');
  assert.ok(solver.getCost() >= 0, 'Tour cost should be non-negative');
}

describe('Edge Case Testing (Phase 9.1)', () => {
  describe('Dense clusters (cities very close together)', () => {
    it('should handle cluster of cities at same position', () => {
      const solver = new RippleInsertion();
      // All cities at same location
      solver.addCity(0, 100, 100);
      solver.addCity(1, 100, 100);
      solver.addCity(2, 100, 100);
      solver.addCity(3, 100, 100);

      assertValidTour(solver, 4);
    });

    it('should handle two dense clusters far apart', () => {
      const solver = new RippleInsertion();
      // Cluster A near origin
      for (let i = 0; i < 5; i++) {
        solver.addCity(i, i * 0.01, i * 0.01);
      }
      // Cluster B far away
      for (let i = 5; i < 10; i++) {
        solver.addCity(i, 1000 + (i - 5) * 0.01, 1000 + (i - 5) * 0.01);
      }

      assertValidTour(solver, 10);
    });

    it('should handle one city surrounded by very close neighbors', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 100, 100);
      // 8 neighbors within 0.001 distance
      for (let i = 1; i < 9; i++) {
        const angle = (i / 8) * Math.PI * 2;
        solver.addCity(
          i,
          100 + 0.001 * Math.cos(angle),
          100 + 0.001 * Math.sin(angle)
        );
      }

      assertValidTour(solver, 9);
    });

    it('should handle dense cluster with 2-opt post-processing', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, 50 + Math.random() * 0.01, 50 + Math.random() * 0.01);
      }

      assertValidTour(solver, 10);

      const costBefore = solver.getCost();
      solver.apply2Opt();
      const costAfter = solver.getCost();

      assert.ok(
        costAfter <= costBefore + 0.001,
        '2-opt should not increase cost'
      );
    });
  });

  describe('Uniform grid distributions', () => {
    it('should produce valid tour on 3x3 grid', () => {
      const solver = new RippleInsertion();
      const cities = createGrid(3, 3);
      for (const c of cities) solver.addCity(c.id, c.x, c.y);

      assertValidTour(solver, 9);
      // Optimal for 3x3 grid with spacing=10 is 80 (perimeter)
      assert.ok(solver.getCost() <= 120, 'Cost should be reasonable for grid');
    });

    it('should produce valid tour on 5x5 grid', () => {
      const solver = new RippleInsertion();
      const cities = createGrid(5, 5);
      for (const c of cities) solver.addCity(c.id, c.x, c.y);

      assertValidTour(solver, 25);
    });

    it('should produce valid tour on 10x10 grid', () => {
      const solver = new RippleInsertion();
      const cities = createGrid(10, 10);
      for (const c of cities) solver.addCity(c.id, c.x, c.y);

      assertValidTour(solver, 100);
    });

    it('should work with onion peeling on grid', () => {
      const solver = new RippleInsertion();
      const cities = createGrid(5, 5);
      const stats = solver.addCities(cities, { useOnionPeeling: true });

      assertValidTour(solver, 25);
      assert.ok(stats.totalIterations >= 0);
    });
  });

  describe('Extreme aspect ratios', () => {
    it('should handle very wide rectangle (1000x1)', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, i * 111, 0.5);
      }

      assertValidTour(solver, 10);
      // Optimal for line is ~1000 (go left to right, jump back)
      // Heuristic may produce slightly suboptimal, allow generous range
      assert.ok(
        solver.getCost() >= 999,
        `Cost ${solver.getCost()} should be at least 999`
      );
    });

    it('should handle very tall rectangle (1x1000)', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, 0.5, i * 111);
      }

      assertValidTour(solver, 10);
      assert.ok(
        solver.getCost() >= 999,
        `Cost ${solver.getCost()} should be at least 999`
      );
    });

    it('should handle extreme coordinates', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 0, 0);
      solver.addCity(1, 1e6, 0);
      solver.addCity(2, 0, 1e6);
      solver.addCity(3, 1e6, 1e6);

      assertValidTour(solver, 4);
    });
  });

  describe('Duplicate coordinates', () => {
    it('should handle cities with exact same coordinates', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 50, 50);
      solver.addCity(1, 50, 50);
      solver.addCity(2, 100, 100);
      solver.addCity(3, 50, 50);
      solver.addCity(4, 0, 0);

      assertValidTour(solver, 5);
    });

    it('should handle all cities on a horizontal line (y=0)', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 8; i++) {
        solver.addCity(i, i * 50, 0);
      }

      assertValidTour(solver, 8);
    });

    it('should handle all cities on a vertical line (x=0)', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 8; i++) {
        solver.addCity(i, 0, i * 50);
      }

      assertValidTour(solver, 8);
    });

    it('should handle mixed duplicates with near-zero distances', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 100.0001, 200.0001);
      solver.addCity(1, 100.0002, 200.0002);
      solver.addCity(2, 300, 400);
      solver.addCity(3, 100.0003, 200.0003);

      assertValidTour(solver, 4);
    });
  });

  describe('Insert/remove sequences', () => {
    it('should maintain valid tour after removing middle city', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, i * 20, (i % 3) * 30);
      }
      assertValidTour(solver, 10);

      solver.removeCity(5);
      assertValidTour(solver, 9);
      assert.ok(!solver.getTour().includes(5));
    });

    it('should maintain valid tour after removing all cities one by one', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 6; i++) {
        solver.addCity(i, i * 30, i * 20);
      }

      for (let i = 0; i < 6; i++) {
        solver.removeCity(i);
      }

      assert.equal(solver.tour.size, 0);
      assert.deepEqual(solver.getTour(), []);
      assert.equal(solver.getCost(), 0);
    });

    it('should handle interleave insert and remove', () => {
      const solver = new RippleInsertion();

      solver.addCity(0, 0, 0);
      solver.addCity(1, 100, 0);
      solver.addCity(2, 100, 100);
      solver.addCity(3, 0, 100);

      assertValidTour(solver, 4);

      solver.removeCity(1);
      assertValidTour(solver, 3);

      solver.addCity(4, 50, 50);
      assertValidTour(solver, 4);

      solver.removeCity(2);
      assertValidTour(solver, 3);

      solver.addCity(5, 200, 200);
      assertValidTour(solver, 4);
    });

    it('should handle removing non-existent city gracefully', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 0, 0);
      solver.addCity(1, 10, 0);

      const stats = solver.removeCity(999);
      assert.equal(stats.iterations, 0);
      assert.equal(stats.removedCost, 0);
      assertValidTour(solver, 2);
    });

    it('should handle removing from empty tour', () => {
      const solver = new RippleInsertion();
      const stats = solver.removeCity(0);
      assert.equal(stats.iterations, 0);
      assert.equal(stats.removedCost, 0);
    });

    it('should handle removing last city from tour of size 1', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 50, 50);

      solver.removeCity(0);
      assert.equal(solver.tour.size, 0);
      assert.equal(solver.getCost(), 0);
    });

    it('should re-add city after removal with same id', () => {
      const solver = new RippleInsertion();
      solver.addCity(0, 0, 0);
      solver.addCity(1, 100, 0);
      solver.addCity(2, 100, 100);

      solver.removeCity(1);
      assertValidTour(solver, 2);

      // Re-add with same id different position
      solver.addCity(1, 50, 50);
      assertValidTour(solver, 3);
    });

    it('should handle batch addCities followed by removes', () => {
      const solver = new RippleInsertion();
      const cities = [];
      for (let i = 0; i < 20; i++) {
        cities.push({ id: i, x: Math.random() * 100, y: Math.random() * 100 });
      }

      solver.addCities(cities);
      assertValidTour(solver, 20);

      // Remove every other city
      for (let i = 0; i < 20; i += 2) {
        solver.removeCity(i);
      }

      assertValidTour(solver, 10);
    });

    it('should handle clear and re-add', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 10; i++) {
        solver.addCity(i, i * 20, i * 15);
      }
      assertValidTour(solver, 10);

      solver.clear();
      assert.equal(solver.tour.size, 0);

      for (let i = 0; i < 5; i++) {
        solver.addCity(i, i * 30, i * 25);
      }
      assertValidTour(solver, 5);
    });
  });

  describe('Algorithm correctness', () => {
    it('should produce same or better cost with 2-opt post-processing', () => {
      const cities = [];
      for (let i = 0; i < 15; i++) {
        cities.push({ id: i, x: Math.random() * 200, y: Math.random() * 200 });
      }

      const solver = new RippleInsertion();
      for (const c of cities) solver.addCity(c.id, c.x, c.y);
      const costPlain = solver.getCost();

      solver.apply2Opt();
      const cost2Opt = solver.getCost();

      assert.ok(
        cost2Opt <= costPlain + 0.001,
        `2-opt should not produce worse tour: ${cost2Opt} vs ${costPlain}`
      );
    });

    it('should produce same or better cost with or-opt', () => {
      const solver = new RippleInsertion();
      for (let i = 0; i < 15; i++) {
        solver.addCity(i, Math.random() * 200, Math.random() * 200);
      }

      const costBefore = solver.getCost();
      solver.applyOrOpt();
      const costAfter = solver.getCost();

      assert.ok(
        costAfter <= costBefore + 0.001,
        `Or-opt should not increase cost: ${costAfter} vs ${costBefore}`
      );
    });

    it('should produce valid tour with all optimizations combined', () => {
      const solver = new RippleInsertion();

      for (let i = 0; i < 20; i++) {
        solver.addCity(i, Math.random() * 300, Math.random() * 300);
      }

      solver.apply2Opt();
      solver.applyOrOpt();

      assertValidTour(solver, 20);
    });

    it('should handle fibonacci spiral distribution', () => {
      const solver = new RippleInsertion();
      const n = 30;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(i) * 50;
        const theta = i * goldenAngle;
        solver.addCity(i, r * Math.cos(theta), r * Math.sin(theta));
      }

      assertValidTour(solver, n);
    });

    it('should handle circular distribution', () => {
      const solver = new RippleInsertion();
      const n = 20;
      const radius = 100;

      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        solver.addCity(i, radius * Math.cos(angle), radius * Math.sin(angle));
      }

      assertValidTour(solver, n);
      // For a circle, optimal is close to 2*PI*R = ~628
      assert.ok(
        solver.getCost() < 700,
        'Circle tour should be close to optimal'
      );
    });
  });
});

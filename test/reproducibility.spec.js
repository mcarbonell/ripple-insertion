import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RippleInsertion } from '../src/ripple-insertion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

function loadInstance(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

describe('Reproducibility & Golden Values Regression (Phase 2)', () => {
  it('should reproduce deterministic tour cost on eil51 (golden cost: 444)', () => {
    const data = loadInstance('eil51');
    const solver = new RippleInsertion({
      edgeWeightType: data.metadata.edgeWeightType,
      maxK: 15,
      adaptiveMaxK: true,
    });

    for (let i = 0; i < data.cities.length; i++) {
      const c = data.cities[i];
      solver.addCity(i, c.x, c.y);
    }
    solver.apply2Opt();
    solver.applyOrOpt();

    const cost = solver.getCost();
    assert.equal(
      cost,
      444,
      `eil51 golden cost mismatch: expected 444, got ${cost}`
    );
  });

  it('should reproduce deterministic tour cost on berlin52 (golden cost: 7783)', () => {
    const data = loadInstance('berlin52');
    const solver = new RippleInsertion({
      edgeWeightType: data.metadata.edgeWeightType,
      maxK: 15,
      adaptiveMaxK: true,
    });

    for (let i = 0; i < data.cities.length; i++) {
      const c = data.cities[i];
      solver.addCity(i, c.x, c.y);
    }
    solver.apply2Opt();
    solver.applyOrOpt();

    const cost = solver.getCost();
    assert.equal(
      cost,
      7783,
      `berlin52 golden cost mismatch: expected 7783, got ${cost}`
    );
  });

  it('should reproduce deterministic tour cost on st70 (golden cost: 691)', () => {
    const data = loadInstance('st70');
    const solver = new RippleInsertion({
      edgeWeightType: data.metadata.edgeWeightType,
      maxK: 15,
      adaptiveMaxK: true,
    });

    for (let i = 0; i < data.cities.length; i++) {
      const c = data.cities[i];
      solver.addCity(i, c.x, c.y);
    }
    solver.apply2Opt();
    solver.applyOrOpt();

    const cost = solver.getCost();
    assert.equal(
      cost,
      691,
      `st70 golden cost mismatch: expected 691, got ${cost}`
    );
  });
});

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  mean,
  stdDev,
  median,
  iqr,
  summarize,
  linearRegression,
  wilcoxonSignedRank,
} from '../benchmark/stats.js';

describe('Statistical Analysis Utilities', () => {
  it('should compute mean, stdDev, median, and iqr correctly', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    assert.strictEqual(mean(data), 5);
    assert.ok(Math.abs(stdDev(data) - 2.138) < 0.01);
    assert.strictEqual(median(data), 4.5);
    assert.strictEqual(iqr(data), 1.5);
  });

  it('should generate complete summary with percentiles', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const s = summarize(data);
    assert.strictEqual(s.count, 10);
    assert.strictEqual(s.mean, 55);
    assert.strictEqual(s.min, 10);
    assert.strictEqual(s.max, 100);
    assert.ok(s.p95 >= 90);
  });

  it('should perform linear regression with exact slope and R2', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // y = 2x
    const reg = linearRegression(x, y);
    assert.strictEqual(reg.alpha, 2);
    assert.strictEqual(reg.beta, 0);
    assert.strictEqual(reg.r2, 1);
  });

  it('should perform Wilcoxon signed-rank test accurately', () => {
    // 10 paired samples with clear difference
    const sampleA = [10, 12, 15, 14, 18, 20, 22, 19, 21, 25];
    const sampleB = [15, 16, 20, 19, 23, 24, 28, 25, 27, 30]; // B is consistently larger
    const result = wilcoxonSignedRank(sampleA, sampleB);
    assert.strictEqual(result.n, 10);
    assert.ok(result.pValue < 0.01, 'Should detect significant difference');
    assert.strictEqual(result.significant, true);
  });
});

/**
 * Statistical analysis utilities for deterministic benchmarking and paper battery
 */

export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

export function stdDev(arr) {
  if (!arr || arr.length <= 1) return 0;
  const m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (arr.length - 1));
}

export function quantile(arr, q) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function median(arr) {
  return quantile(arr, 0.5);
}

export function iqr(arr) {
  return quantile(arr, 0.75) - quantile(arr, 0.25);
}

export function summarize(arr) {
  if (!arr || arr.length === 0) {
    return { count: 0, mean: 0, std: 0, median: 0, iqr: 0, min: 0, max: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    count: sorted.length,
    mean: Number(mean(sorted).toFixed(4)),
    std: Number(stdDev(sorted).toFixed(4)),
    median: Number(median(sorted).toFixed(4)),
    iqr: Number(iqr(sorted).toFixed(4)),
    p90: Number(quantile(sorted, 0.9).toFixed(4)),
    p95: Number(quantile(sorted, 0.95).toFixed(4)),
    p99: Number(quantile(sorted, 0.99).toFixed(4)),
    min: Number(sorted[0].toFixed(4)),
    max: Number(sorted[sorted.length - 1].toFixed(4)),
  };
}

/**
 * Ordinary Least Squares linear regression: y = alpha * x + beta
 * Returns { alpha (slope), beta (intercept), r2 (coefficient of determination) }
 */
export function linearRegression(xArr, yArr) {
  const n = xArr.length;
  if (n !== yArr.length || n < 2) {
    return { alpha: 0, beta: 0, r2: 0 };
  }

  const mx = mean(xArr);
  const my = mean(yArr);

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0) return { alpha: 0, beta: my, r2: 0 };

  const alpha = sxy / sxx;
  const beta = my - alpha * mx;
  const r2 = syy !== 0 ? (sxy * sxy) / (sxx * syy) : 0;

  return {
    alpha: Number(alpha.toFixed(4)),
    beta: Number(beta.toFixed(4)),
    r2: Number(r2.toFixed(4)),
  };
}

/**
 * Wilcoxon Signed-Rank Test for paired samples (two-sided).
 * Tests null hypothesis: difference between pairs has median zero.
 */
export function wilcoxonSignedRank(xArr, yArr) {
  const diffs = [];
  for (let i = 0; i < xArr.length; i++) {
    const diff = xArr[i] - yArr[i];
    if (diff !== 0) {
      diffs.push({ diff, abs: Math.abs(diff) });
    }
  }

  const n = diffs.length;
  if (n === 0) return { w: 0, z: 0, pValue: 1.0, significant: false };

  // Sort by absolute difference
  diffs.sort((a, b) => a.abs - b.abs);

  // Assign ranks with average rank for ties
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && diffs[j + 1].abs === diffs[j].abs) j++;
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) {
      diffs[k].rank = avgRank;
    }
    i = j + 1;
  }

  let wPlus = 0;
  let wMinus = 0;
  for (const d of diffs) {
    if (d.diff > 0) wPlus += d.rank;
    else wMinus += d.rank;
  }

  const w = Math.min(wPlus, wMinus);

  // Normal approximation for n >= 10
  const meanW = (n * (n + 1)) / 4;
  const varW = (n * (n + 1) * (2 * n + 1)) / 24;
  const z = (w - meanW) / Math.sqrt(varW);

  // Two-tailed p-value from standard normal distribution CDF
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  return {
    n,
    wPlus: Number(wPlus.toFixed(1)),
    wMinus: Number(wMinus.toFixed(1)),
    w: Number(w.toFixed(1)),
    z: Number(z.toFixed(4)),
    pValue: Number(Math.max(1e-10, pValue).toExponential(4)),
    significant: pValue < 0.05,
  };
}

function normalCdf(x) {
  // Approximation of complementary error function (Abramowitz and Stegun 7.1.26)
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const erf =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

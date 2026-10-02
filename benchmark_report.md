# Ripple Insertion Benchmark Report

**Date:** 2026-10-02
**Strategy:** File Order
**Neighbors (M):** Adaptive (base: 15, M = max(15, floor(4 * log2(N))))
**2-opt:** Enabled (post-processing, up to 50 iterations)
**Or-opt:** Enabled (post-processing, up to 50 iterations)

| Instance | N | Type | Optimal | Achieved | Gap (%) | Time (ms) | Time/Ins (ms) | Ripples/Ins |
|---|---|---|---|---|---|---|---|---|
| eil51 | 51 | EUC_2D | 426 | 444 | 4.23% | 6.1 | 0.117 | 16.1 |
| berlin52 | 52 | EUC_2D | 7542 | 7783 | 3.20% | 14.8 | 0.265 | 16.3 |
| st70 | 70 | EUC_2D | 675 | 691 | 2.37% | 8.6 | 0.119 | 17.9 |
| kroA100 | 100 | EUC_2D | 21282 | 21292 | 0.05% | 16.0 | 0.154 | 20.3 |
| ch130 | 130 | EUC_2D | 6110 | 6372 | 4.29% | 28.3 | 0.207 | 21.7 |
| ch150 | 150 | EUC_2D | 6528 | 6691 | 2.50% | 27.5 | 0.158 | 22.9 |

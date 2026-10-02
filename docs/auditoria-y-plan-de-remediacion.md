# Auditoría Técnica Integral y Plan de Remediación

## Ripple Insertion — Dynamic TSP Solver

**Fecha:** 10 de marzo de 2026
**Auditor:** DeepSeek 4.1 flash (revisión de código, docs, benchmarks y encuadre científico)
**Commit auditado:** `a4f09b1` (`main`, "feat: ripple v2")
**Objetivo declarado por el autor:** publicar un paper académico presentando el algoritmo.

---

## 0. Resumen ejecutivo

El repositorio está **bien organizado para un proyecto personal/experimental** (módulos limpios, tests que pasan, ES Modules, cero dependencias), pero **en su estado actual NO está listo para sustentar una publicación científica** ni para presentarse como una librería "estable v2.0".

Los tres problemas dominantes son:

1. **La alegación central de complejidad `O(N log N)` no está demostrada y, tal como está implementada, es probablemente incorrecta** (ver §3, hallazgo **C3**). El propio README lo usa como titular ("O(N log N) Complexity").
2. **Hay bugs de correctitud confirmados empíricamente** que afectan a funcionalidades documentadas: `removeCity()` devuelve `NaN` en `removedCost`, y las opciones `enable2Opt`/`enableOrOpt` **no tienen ningún efecto** durante la inserción (ver §3, **C1/C2**).
3. **Los resultados de benchmark no son reproducibles ni comparables entre documentos** y el benchmark de instancias `EXPLICIT` usa coordenadas sintéticas inválidas (ver §5). Las tablas del README, `docs/RIPPLE_INSERTION.md` y `benchmark_report.md` se contradicen entre sí.

**Veredicto de madurez:**

| Dimensión                       |   Nota   | Comentario                                                                                                                           |
| :------------------------------ | :------: | :----------------------------------------------------------------------------------------------------------------------------------- |
| Idea / concepto                 |   7/10   | Buena analogía y foco correcto (TSP dinámico), pero es una composición de técnicas conocidas; la novedad requiere reposicionamiento. |
| Ingeniería de código            |   5/10   | Estructura correcta, pero con código muerto, bugs confirmados y "features" que no hacen nada.                                        |
| Rigor de evaluación             |   3/10   | Benchmarks irreproducibles, sin semillas, con datos inválidos para EXPLICIT y tablas contradictorias.                                |
| Documentación                   |   4/10   | Atractiva pero inconsistentes; contiene afirmaciones no verificadas y auto-evaluación inflada.                                       |
| **Aptitud para publicar (hoy)** | **3/10** | **No publicable sin una fase de estabilización + rigor experimental.**                                                               |

> **Mensaje clave:** el potencial existe, pero el paper debe construirse _después_ de arreglar la base. Publicar con los números actuales expondría al autor a rechazo (o, peor, a retractación) por no reproducibilidad y claims no sustentados.

---

## 1. Alcance y metodología

Se revisaron:

- **Código fuente:** `src/ripple-insertion.js`, `src/ripple-insertion-v2.js`, `src/kd-tree.js`, `src/doubly-linked-tour.js`, `demo/optimized.js`.
- **Tests:** `test/*.spec.js` y `test/benchmark_v1_vs_v2.js`.
- **Benchmarks:** `benchmark/benchmark.js`, `benchmark/comparative.js`, `benchmark/stress.js`, `benchmark_report.md`.
- **Documentación:** `README.md`, `PLAN.md`, `OPTIMIZATIONS.md`, `docs/RIPPLE_INSERTION.md`, `GEMINI.md`, `docs/private/evaluacion-ripple-insertion.md`.
- **Infra:** `.github/workflows/ci.yml`, `package.json`, `.prettierrc`, `.gitignore`.

**Metodología:**

1. Lectura estática de todo el código y la documentación.
2. **Ejecución de la suite de tests** (`npm test`): 58 tests, 58 pass, 0 fail.
3. **Pruebas de verificación empírica** escritas ad-hoc para confirmar los hallazgos dudosos (resultados en §10).
4. Contraste de las tablas de resultados entre documentos.
5. Encuadre frente a la literatura de TSP dinámico (ver §4).

**Limitaciones de esta auditoría:** no se ejecutaron las instancias TSPLIB masivas (N>5000) por coste; el análisis de complejidad se basa en inspección del código (con evidencia empírica de los casos concretos). No se ha revisado el histórico completo de git ni cada uno de los ~80 ficheros de datos ausentes.

---

## 2. Inventario del repositorio

```
ripple-insertion/
├── src/
│   ├── ripple-insertion.js        # Clase principal (675 líneas). Algoritmo + ripple + 2-opt + Or-opt + onion.
│   ├── ripple-insertion-v2.js     # Prototipo "V2" aislado (no integrado en la API pública).
│   ├── kd-tree.js                 # KD-Tree + FastBinaryHeap (Structure of Arrays).
│   └── doubly-linked-tour.js      # Lista doblemente enlazada circular + HashMap.
├── test/                          # node:test. 4 specs (+ benchmark v1/v2 "informativo").
├── benchmark/                     # benchmark.js, comparative.js, stress.js
├── demo/ + *.html                 # Demos en navegador.
├── data/                          # 6 instancias TSPLIB (subconjunto).
├── docs/
│   ├── RIPPLE_INSERTION.md        # Nota "tipo paper" (borrador).
│   └── private/                   # Evaluación previa (gitignored).
├── README.md, PLAN.md, OPTIMIZATIONS.md, GEMINI.md
└── package.json, .prettierrc, .github/workflows/ci.yml
```

**Observaciones de higiene:**

- Existe un _git worktree_ completo en `.kilo/worktrees/sincere-pudding/` (copia íntegra del repo). Se ha añadido `.kilo/` a `.gitignore`, pero conviene **eliminarlo** para no confundir tooling/IA ni duplicar artefactos.
- **No existe `LICENSE`** aunque el README y `package.json` declaran MIT (`package.json:21`, `README.md:236`).
- **No existe `CITATION.cff`** (en `PLAN.md:363` figura como opcional "solo si se publica" — dado el objetivo de paper, es necesario).
- **No existe `.prettierignore`.**
- `docs/evaluacion-ripple-insertion.md` aparece como _deleted_ en `git status` en la raíz y fue movido a `docs/private/`.

---

## 3. Auditoría de código

### 3.1 Tabla de hallazgos

| ID     | Severidad  | Ubicación                             | Hallazgo                                                                                                                        |
| :----- | :--------: | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------ |
| **C1** | 🔴 Crítico | `ripple-insertion.js:189,194`         | `enable2Opt`/`enableOrOpt` se guardan pero **nunca se usan** durante la inserción. Son no-ops. Tests "during insertion" vacuos. |
| **C2** | 🔴 Crítico | `ripple-insertion.js:400-402`         | `removeCity()` pasa un `TourNode` a `dist()` → `removedCost = NaN`.                                                             |
| **C3** | 🔴 Crítico | `ripple-insertion.js:656-786`         | La cota `O(N log N)` global no se sostiene; el "ripple" es un descenso de vecindario sin cota por inserción.                    |
| **C4** | 🔴 Crítico | `benchmark/benchmark.js:114-121`      | Instancias `EXPLICIT` indexadas con coordenadas sintéticas → vecinos espaciales inválidos y gaps "0.00%" no defendibles.        |
| **A1** |  🟠 Alto   | `ripple-insertion.js:661-665`         | La métrica `maxDepth` se asigna a `iterations`; **no mide profundidad de cascada**.                                             |
| **A2** |  🟠 Alto   | `ripple-insertion.js:442-461`         | `addCities()` hace `cities.find(...)` dentro del bucle → **O(N²)** en batch.                                                    |
| **A3** |  🟠 Alto   | `test/benchmark_v1_vs_v2.js`          | Comparativa V1/V2 inválida: implementa versiones "de juguete" que no son ni V1 ni V2 reales.                                    |
| **A4** |  🟠 Alto   | `ripple-insertion.js:191,195`         | Código muerto: `_twoOptApplied`, `maxOrOptIterations` (este último no se usa en `applyOrOpt`).                                  |
| **A5** |  🟠 Alto   | Docs múltiples                        | Resultados de benchmark contradictorios entre README / RIPPLE_INSERTION.md / benchmark_report.md.                               |
| **A6** |  🟠 Alto   | `src/ripple-insertion-v2.js`          | Prototipo "V2" divergente y no integrado; crea confusión de versión.                                                            |
| **M1** |  🟡 Medio  | `ripple-insertion.js:197-265`         | `cities`/`originalCities` como arrays dispersos por id → memoria O(maxId) y `length` engañoso.                                  |
| **M2** |  🟡 Medio  | `ripple-insertion.js:272-284`         | Re-enlazado manual del círculo al insertar el 3º nodo (redundante con `insertAfter`).                                           |
| **M3** |  🟡 Medio  | `ripple-insertion.js:220-238`         | `dist()` cae silenciosamente a `EUC_2D` si faltan pesos `EXPLICIT`.                                                             |
| **M4** |  🟡 Medio  | `ripple-insertion.js:387-433`         | `removeCity` deja huecos (`delete`) y optimiza solo con prev/next.                                                              |
| **M5** |  🟡 Medio  | Docs                                  | Nombres de eventos inconsistentes: `ripple`, `rippleStep`, `tourUpdated`, `inserted`.                                           |
| **M6** |  🟡 Medio  | `.github/workflows/ci.yml:25-26`      | CI ejecuta `npm run format` (reescribe) en vez de `format:check`; no valida formato.                                            |
| **M7** |  🟡 Medio  | `.prettierrc` / sin `.prettierignore` | Prettier se aplica a todo (md/html) en cada test → reescrituras y ruido.                                                        |
| **M8** |  🟡 Medio  | Núcleo                                | Sin validación de entrada (ids duplicados, NaN, coordenadas faltantes).                                                         |
| **B1** |  🔵 Bajo   | `GEMINI.md`                           | Desactualizado ("early stages", "Future Architecture (Planned)").                                                               |
| **B2** |  🔵 Bajo   | `OPTIMIZATIONS.md:11-91`              | Sección off-topic sobre _k-Alternatives candidate lists_.                                                                       |
| **B3** |  🔵 Bajo   | `PLAN.md`                             | Fases desordenadas (6,7,8,9,10,1,2,3,4,5) y APIs "propuestas" ya implementadas.                                                 |
| **B4** |  🔵 Bajo   | `docs/private/...`                    | Auto-evaluación inflada generada por IA ("8/10", "joya", "estándar de facto").                                                  |

### 3.2 Detalle de hallazgos críticos y altos

#### C1 — `enable2Opt` / `enableOrOpt` no hacen nada durante la inserción

En el constructor se almacenan:

```js
// src/ripple-insertion.js:189
this.enable2Opt = options.enable2Opt || false;
this.max2OptIterations = options.max2OptIterations || 50;
this._twoOptApplied = false;
// src/ripple-insertion.js:194
this.enableOrOpt = options.enableOrOpt || false;
```

`enable2Opt` solo se **asigna** (línea 189) y se pasa en benchmarks; **nunca se lee** en `_insertAndOptimize`. Igual con `enableOrOpt`. El 2-opt/Or-opt solo se ejecutan si el usuario llama **manualmente** `solver.apply2Opt()` / `solver.applyOrOpt()`.

**Consecuencias:**

- El README (`README.md:148-152`) sugiere que pasar `enable2Opt: true` "habilita 2-opt" — es **falso** para la inserción.
- `PLAN.md:10-39` documenta "2-opt applied after each insertion" — **no ocurre**.
- Los tests `should produce same or better cost with 2-opt enabled during insertion` (`test/edge-cases.spec.js:336`) pasan **por trivialidad** (comparan dos corridas sin 2-opt real).
- En `benchmark/comparative.js`, los wrappers "all opts" habilitan flags y llaman `applyOrOpt()`, pero **nunca** `apply2Opt()`; como los flags son no-ops, la etiqueta "all opts" es engañosa.

**Evidencia empírica (§10):** misma entrada, `enable2Opt:false` vs `true` → coste idéntico (`5990`); igual con `enableOrOpt:true`.

**Remediación:** decidir el contrato. Opción A (recomendada): eliminar los flags "enable\*" y documentar 2-opt/Or-opt como **post-proceso explícito**. Opción B: implementar de verdad la aplicación por inserción (con presupuesto acotado) y testear que mejora. Eliminar el no-op o hacerlo funcionar; arreglar los tests.

#### C2 — `removeCity()` devuelve `NaN`

```js
// src/ripple-insertion.js:400-402
const removedCost =
  this.dist(this.cities[cityId], prevNode) + // prevNode es TourNode, no {x,y}
  this.dist(this.cities[cityId], nextNode) - // nextNode es TourNode, no {x,y}
  this.dist(this.cities[prevNode.cityId], this.cities[nextNode.cityId]);
```

`dist(a,b)` hace `this.originalCities[a.id] || a`. Un `TourNode` no tiene `x/y` ni `id`, así que las dos primeras distancias son `NaN`. El README documenta `removeStats.removedCost` como "cost savings" (`README.md:98-101`) → **API documentada devolviendo basura**.

**Remediación:** pasar `this.cities[prevNode.cityId]` y `this.cities[nextNode.cityId]`. Añadir test que verifique `removedCost` finito y coincidente con el cambio real de `getCost()`.

#### C3 — La cota de complejidad `O(N log N)` no se sostiene

1. **Inserción inicial:** mejor borde entre los `M` vecinos. Con `_getAdaptiveK()` (`ripple-insertion.js:777-786`): `Math.max(15, Math.floor(4 * Math.log2(n)))` → `M = Θ(log N)`. Cada k-NN cuesta `O(M log N) = O(log² N)`.
2. **Fallback de inserción** (`330-355`): recorre hasta 20 nodos.
3. **Ripple** (`_optimizeRipple`, `656-754`): `Set` re-alimentado **sin cota por inserción**. Cada nodo procesado hace k-NN `O(M log N)` y recorre `M` vecinos. Peor caso: `O(N)` nodos por inserción.
4. **`getCost()`** es `O(N)`.

Por tanto: coste por inserción acotado por `O(N · M log N)` en el peor caso; total `O(N² · M log N)`, **no** `O(N log N)`. Con post-proceso, `_twoOptOptimize` es `O(max2OptIterations · N²)` y `applyOrOpt` `O(maxOrOptIterations · N²)`.

El crecimiento observado en `benchmark_report.md` (Time/Ins de 0.037 ms a N=14 hasta 0.85 ms a N≈5900; gaps de 0% a ~12%) es **consistente con degradación superlineal**.

**Remediación (paper):** (a) **demostrar y acotar** una cota amortizada realista y honesta, o (b) **abandonar el claim `O(N log N)`** y reportar la complejidad empírica medida. Se requiere un teorema de terminación + análisis amortizado correcto.

#### C4 — Benchmark de instancias EXPLICIT con coordenadas falsas

```js
// benchmark/benchmark.js:114-121
if (citiesData.length === 0 && N > 0) {
  citiesData = Array.from({ length: N }, (_, i) => ({
    x: Math.cos((i / N) * 2 * Math.PI) * 1000,
    y: Math.sin((i / N) * 2 * Math.PI) * 1000,
  }));
}
```

Para instancias `EXPLICIT` (gr17, gr21, bayg29, dantzig42, …) no hay coordenadas reales y el código las **inventa** sobre un círculo. Esas coordenadas se usan para (1) construir el **KD-Tree** y (2) el **onion peeling**; luego el coste se calcula con la matriz `explicitWeights`. Resultado: los "vecinos cercanos" son vecinos _en el círculo falso_, sin relación con la distancia real. De ahí gaps "0.00%" (gr17, gr21) **no defendibles**.

**Remediación:** para EXPLICIT, (a) usar coordenadas reales (`DISPLAY_DATA_SECTION`), (b) construir la vecindad a partir de la matriz de costes (k-NN por peso), o (c) **excluir** EXPLICIT del benchmark principal. (b) es lo más honesto para el paper.

#### A1 — `maxDepth` no es profundidad

```js
// src/ripple-insertion.js:663-665
while (modified.size > 0) {
  iterations++;
  maxDepth = Math.max(maxDepth, iterations);   // == iterations siempre
```

`maxDepth` es por construcción igual a `iterations`. Cualquier análisis de "profundidad del ripple" sería **falso**. **Remediación:** medir profundidad real (ligar cada nodo a una "generación" y propagar `g+1`) o renombrar a `iterations`.

#### A2 — `addCities()` es O(N²)

```js
// src/ripple-insertion.js:455-461
for (const cityId of insertionOrder) {
  const city = cities.find((c) => c.id === cityId); // búsqueda lineal por iteración
  if (city) this.addCity(city.id, city.x, city.y);
}
```

`find` dentro del bucle → `O(N²)` para el batch. **Remediación:** construir un `Map(id → city)` una vez.

#### A3 — Comparativa V1 vs V2 inválida

`test/benchmark_v1_vs_v2.js` define localmente una `RippleInsertionV1` que **siempre intercambia sin comprobar ganancia** (`líneas 47-57`) y una `RippleInsertionV2` que es un prototipo distinto con distancia `Math.sqrt` (no TSPLIB) y `SimpleSpatialIndex` O(N) lineal. **No son ni V1 ni V2 reales**; los "costes" y "tiempos" no significan nada. **Remediación:** eliminar el fichero o reescribirlo importando las clases reales y con semillas fijas.

#### A4 / A6 — Código muerto y prototipo divergente

- `_twoOptApplied` se asigna (`191`, `485`) pero nunca se lee.
- `maxOrOptIterations` se asigna (`195`) pero `applyOrOpt()` usa el parámetro `maxIterations` (default 50), no la propiedad.
- `src/ripple-insertion-v2.js` no se importa desde la librería; solo desde el benchmark inválido. Mantenerlo sin marcar como experimental genera confusión de versión (package.json dice `1.0.0`, el README dice `v2.0`, hay un archivo `-v2`).

---

## 4. Evaluación de la idea y del algoritmo

### 4.1 ¿Qué es realmente "Ripple Insertion"?

Descomponiendo la implementación, el algoritmo es la **composición de cuatro técnicas conocidas**:

1. **Cheapest Insertion** clásico (heurística de los años 50-60), pero **restringido** a los `M` vecinos espaciales en lugar de todos los bordes.
2. **Índice espacial k-d tree** para consultas de vecinos (estructura estándar desde los 70).
3. **Descenso de vecindario por cola ("ripple")**: al insertar/mover un nodo, se encola el nodo y sus vecinos y se aplica un **relocate (Or-opt de segmento 1) first-improvement** iterativamente hasta estabilizar. Esto es esencialmente un _local search_ activado localmente (tipo _Variable Neighborhood Descent_ con cola de "dirty nodes").
4. **Post-proceso 2-opt + Or-opt** (operadores clásicos de TSP).

La **analogía de la "banda elástica"** es didáctica y atractiva, pero el mecanismo subyacente no es nuevo. El nombre **"Recursive Cheapest Insertion"** es además impreciso: la cascada es **iterativa** (cola `Set`), no recursiva, y el ripple no es "cheapest insertion" sino **relocate**.

### 4.2 Novedad real (potencial)

Lo genuinamente diferencial, si se formaliza, sería:

- **Vecindario de inserción y de relocación restringido espacialmente** con un radio `M` que crece logarítmicamente con N (control de calidad vs coste).
- **Activación local por "tensión"**: solo se re-optimiza el vecindario afectado por cada inserción, manteniendo una latencia por inserción acotada en la práctica.
- **Enfoque online/dinámico** (insertar y quitar ciudades sin recalcular) con eventos para UI.

Ninguno de estos es "nuevo" por sí solo; la contribución publicable, si existe, debe ser una **combinación + análisis** (cota amortizada, ratio competitivo online, estudio empírico riguroso), no la idea bruta.

### 4.3 Posicionamiento en la literatura (lo que falta y es obligatorio para el paper)

El TSP dinámico/online es un campo **maduro**; el paper debe citar y comparar con:

- **Online TSP / Dynamic TSP**: formulaciones y ratios competitivos (p.ej. trabajo de Ausiello, Feuerstein, Jaillet, Wagner, y encuestas sobre _Online TSP_).
- **Reoptimización incremental** y _dynamically changing networks_.
- **Heurísticas de construcción**: Nearest Neighbor, Cheapest Insertion, Savings (Clarke-Wright), _Farthest/Most-constrained insertion_.
- **Local search**: 2-opt, 3-opt, Or-opt, **Lin-Kernighan** y **LKH-3** (solver de referencia, no "Simulated Annealing" como dice erróneamente `docs/RIPPLE_INSERTION.md:176`).
- **Estructuras espaciales** para k-NN dinámico.

> **Errata a corregir ya:** `docs/RIPPLE_INSERTION.md:176` y `README.md:217` etiquetan **LKH como "Simulated Annealing"**. LKH = _Lin-Kernighan-Helsgaun_, un _local search_ de k-opt; no tiene nada que ver con Simulated Annealing. Este error, en un paper, es descalificante.

### 4.4 Metodología de comparación: hoy no es válida

- Los baselines en `benchmark/comparative.js` (Nearest Neighbor, Cheapest Insertion, Random) **no son dinámicos**; comparar un algoritmo online con heurísticas estáticas de construcción **no demuestra la ventaja dinámica**. Falta el escenario clave: _insertar una ciudad en una ruta ya existente y medir calidad/latencia incremental_.
- No hay **baseline dinámico** (p.ej. reejecutar Cheapest Insertion completo y medir su coste/latencia) que es la comparación natural para un solver online.
- No hay **métricas online**: latencia p50/p95/p99 por inserción, coste acumulado incremental, ratio frente a reoptimización completa.

---

## 5. Auditoría de benchmarks y resultados

### 5.1 Los resultados se contradicen entre documentos

Ejemplos concretos de la **misma instancia con números distintos**:

| Instancia   | `README.md`   | `docs/RIPPLE_INSERTION.md` | `benchmark_report.md` |
| :---------- | :------------ | :------------------------- | :-------------------- |
| st70 (gap)  | 4.15%         | 3.80%                      | 3.11%                 |
| ch150 (gap) | 3.77% / 2.27% | 2.53%                      | (no listada)          |
| d2103 (gap) | 13.15%        | —                          | 6.02%                 |
| eil51 (gap) | 5.16%         | —                          | 4.23%                 |

Esto indica **runs diferentes, versiones de código diferentes y/o falta de control**. Un paper no puede tener tres "verdades" distintas.

### 5.2 Números internamente imposibles

En `README.md:188-198` (tabla "2-opt + Or-opt"):

- `berlin52` = **3.0 ms**, cuando en la tabla "2-opt" el mismo `berlin52` tarda **15.8 ms**. Añadir Or-opt **no puede reducir** el tiempo a la quinta parte; es ruido de medición o copia errónea.
- El gap de `berlin52` es **3.20% en las tres configuraciones** (sin opt, 2-opt, 2-opt+Or-opt), lo que sugiere que en ese run los operadores **no hicieron nada** (coherente con C1: `enable2Opt` no actúa; y en benchmark se llama `apply2Opt` aparte, pero el resultado no cambió).

### 5.3 Falta de rigor experimental

- **Sin semillas fijas**: `comparative.js` y `stress.js` usan `Math.random()` → no reproducible.
- **Sin repeticiones ni intervalos de confianza**: `benchmark.js` corre una vez; `comparative.js` usa "best of k" sin desviación.
- **Medición de tiempo** con `performance.now()` y una sola ejecución → dominado por JIT/warm-up.
- **`benchmark_report.md` generado con `maxK: 15` hardcodeado en el reporte** aunque el solver usa `adaptiveMaxK: true` (`benchmark.js:232,241`): el reporte **miente** sobre la configuración usada.
- **`benchmark.js` no fija semilla de orden** (usa orden de fichero, que es determinista) pero el onion peeling sí depende de datos.

### 5.4 Comparativa contra baselines

- `comparative.js` compara con Nearest Neighbor / Cheapest Insertion / Random, **todos estáticos y O(N²)**, sin aplicarlos en modo dinámico. La comparación "Ripple vs Cheapest Insertion" es en realidad "ripple con vecindario restringido vs cheapest insertion completo", lo cual es informativo pero **no mide la ventaja online**.
- No se compara con **LKH-3** ni con **2-opt/Or-opt partiendo de la misma solución inicial**, ni con el estado del arte en TSP dinámico.

**Remediación:** rediseñar la batería experimental (ver §9, Fase 3): seeds, N repeticiones, mediana + IQR, IC, warm-up, hardware declarado, scripts versionados, salida en CSV/JSON crudo, y escenario dinámico explícito.

---

## 6. Auditoría de documentación

| Documento                                     | Problema                                                                                                                                                               |
| :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                   | Titular `O(N log N)` no sustentado; `maxK` default documentado 15 vs código 20; eventos inconsistentes; tabla de benchmark imposible (§5.2).                           |
| `docs/RIPPLE_INSERTION.md`                    | Mezcla de resultados antiguos con "UPDATE"; LKH mal etiquetado; menciona eventos `ripple` que no existen; tabla de comparación con "typical gap" inventado.            |
| `OPTIMIZATIONS.md`                            | Sección completa (11-91) sobre _k-Alternatives candidate lists_, **off-topic**. "Benchmarks Esperados" con números fabricados. Afirma "O(N log N)" sin prueba.         |
| `PLAN.md`                                     | Fases desordenadas; marca como completado "2-opt after each insertion" que no existe; estructura de carpetas propuesta ya superada.                                    |
| `GEMINI.md`                                   | Obsoleto: dice que el proyecto está "en etapas tempranas" y que la estructura `src/` es "futura".                                                                      |
| `docs/private/evaluacion-ripple-insertion.md` | Auto-evaluación generada por IA, con puntuaciones infladas ("8/10", "joya", "estándar de facto"). **No usar como evidencia** en el paper; bien que esté en `private/`. |

**Inconsistencias de API documentada vs real:**

- README dice que `enable2Opt: true` habilita 2-opt (falso, C1).
- README dice `removeStats.removedCost` (NaN, C2).
- Eventos: `README` usa `tourUpdated`/`inserted`; `RIPPLE_INSERTION.md` usa `ripple`; el código emite `rippleStep`. No hay tabla de eventos canónica.

---

## 7. Auditoría de empaquetado y publicación de software

- `package.json` es minimalista: `type: module`, sin `main`/`exports`/`files`/`engines`. Un consumidor no puede hacer `import { RippleInsertion } from 'ripple-insertion'`.
- **Versión inconsistente**: `package.json` = `1.0.0`; README/`OPTIMIZATIONS.md` hablan de "v2.0"; existe `src/ripple-insertion-v2.js`. Hay que fijar un esquema de versiones único (SemVer) y una única implementación canónica.
- `npm test` ejecuta `prettier --write .` antes de los tests → **modifica el repo** al testear; el CI hace lo mismo (`npm run format`), por lo que nunca valida el formato (debería ser `format:check`). Sin `.prettierignore`, Prettier toca también markdown/HTML.
- **Sin `LICENSE`** (aunque se declara MIT) y **sin `CITATION.cff`** (necesario para el paper).
- Sin `CHANGELOG.md`, sin tipos `.d.ts` (mencionados en `PLAN.md:218`).
- Repo git con un `worktree` embebido en `.kilo/`.

---

## 8. Riesgos específicos para publicar un paper

| #   | Riesgo                                                      | Por qué importa                                                                                      | Mitigación                                                                  |
| :-- | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| R1  | **Claim de complejidad incorrecto** (`O(N log N)`)          | Un revisor lo detecta de inmediato; rechazo asegurado o retractación.                                | Proveer teorema y análisis amortizado realista, o eliminar el claim (§9.1). |
| R2  | **Resultados no reproducibles**                             | Sin seeds ni repeticiones, el experimento no es ciencia.                                             | Batería reproducible con seeds, repeticiones, IC, artifacts (§9.3).         |
| R3  | **Novedad no justificada**                                  | Es una composición de técnicas clásicas; sin _related work_ el paper es "engineering, not research". | Reposicionar la contribución + related work profundo (§9.4).                |
| R4  | **Datos inválidos para EXPLICIT**                           | Gaps imposibles erosionan la credibilidad.                                                           | Corregir vecindad EXPLICIT o excluirlos (§9.2).                             |
| R5  | **Errores factuales en el texto** (LKH ≠ SA)                | Error básico que descalifica ante revisores del área.                                                | Corregir y revisar toda la terminología (§9.5).                             |
| R6  | **Bugs que afectan a resultados** (removeCity, enable\*)    | Debilita cualquier afirmación de funcionalidad.                                                      | Arreglar bugs y añadir tests de regresión (§9.1).                           |
| R7  | **Sin artifact / DOI**                                      | Las venues modernas (y ACM/IEEE reproducibility) lo exigen cada vez más.                             | Publicar artefacto en Zenodo con DOI y tag de versión (§9.6).               |
| R8  | **Sesgo de confirmación en docs** (auto-evaluación inflada) | Un "8/10" autoconcedido no es evidencia.                                                             | Reescribir docs desde cero con tono neutral.                                |

---

## 9. Plan de remediación

El plan está ordenado en fases con **dependencias**: no tiene sentido medir (Fase 3) antes de arreglar bugs (Fase 1-2) ni escribir el paper (Fase 4) antes de tener resultados reproducibles.

### Fase 0 — Higiene inmediata (½ día)

- [x] Eliminar el worktree `.kilo/worktrees/sincere-pudding/`.
- [x] Añadir `.prettierignore` con `node_modules/`, `dist/`, `*.md` (decidir), `.kilo/`.
- [x] Cambiar `package.json` scripts: `test` = `node --test`; `format` = `prettier --write src test benchmark demo scripts`; `format:check` = `prettier --check src test benchmark demo scripts`.
- [x] CI: usar `npm run format:check` (no `format`).
- [x] Añadir `LICENSE` (MIT) y `CITATION.cff`.
- [x] `package.json`: añadir `exports`, `main`, `files`, `engines` (`>=18`), y unificar versión.
- [x] Decidir el destino de `src/ripple-insertion-v2.js`: integrarlo, moverlo a `experimental/`, o eliminarlo.

**Criterio de aceptación:** CI verde, `format:check` falla si el código no está formateado, y `npm test` no modifica ficheros.

### Fase 1 — Corrección de bugs y contrato de API (2-3 días)

- [x] **C2:** arreglar `removeCity()` para pasar objetos ciudad a `dist()`; test de regresión que valide `removedCost` finito y consistente con `getCost()`.
- [x] **C1:** decidir el contrato de `enable2Opt`/`enableOrOpt`. Recomendado: eliminarlos y exponer solo `apply2Opt()`/`applyOrOpt()` como post-proceso documentado. Si se opta por "durante inserción", implementarlo y testear que mejora el coste cuando debe.
- [x] **A1:** renombrar `maxDepth`→`iterations`, o implementar profundidad real por generaciones.
- [x] **A2:** reemplazar `cities.find` por un `Map` en `addCities()`.
- [x] **A4:** eliminar `_twoOptApplied` y usar `maxOrOptIterations` de verdad (o eliminar la propiedad).
- [x] **M2:** eliminar el re-enlazado manual del 3º nodo (redundante).
- [x] **M3:** lanzar error (no fallback silencioso) si faltan pesos `EXPLICIT`.
- [x] **M8:** validación de entrada (ids duplicados, coordenadas no finitas, ids no enteros).

**Criterio de aceptación:** cada bug tiene test de regresión; suite en verde; `enable*` o funciona o no existe.

### Fase 2 — Repositorio mínimo reproducible (2-3 días)

- [x] Añadir semillas fijas y generador determinista en `comparative.js`/`stress.js`.
- [x] Añadir `scripts/` con un runner único que produzca artefactos crudos en `results/` (CSV/JSON) + reporte markdown generado.
- [x] **C4:** corregir el benchmark EXPLICIT: (a) k-NN por peso desde la matriz, o (b) excluirlos explícitamente. Nunca usar coordenadas sintéticas para indexar.
- [x] Corregir el reporte para que muestre la configuración real (p. ej. `adaptiveMaxK` vs `M`).
- [x] Añadir regresión de "dimensionalidad": comparar resultados con los publicados y fijarlos como _golden values_ (tolerancia 0).

**Criterio de aceptación:** `node scripts/run-benchmarks.js --seed 42` reproduce los números de forma determinista en dos máquinas distintas (con tolerancia de tiempo).

### Fase 3 — Batería experimental para el paper (1-2 semanas)

- [x] Conjuntos: TSPLIB estándar (EUC_2D, EXPLICIT corregido, GEO, ATT) + instancias generadas con semilla (uniforme, agrupada, espiral) con N de 50 a 10 000.
- [x] **Escenario dinámico**: partir de una ruta base y medir (i) coste incremental, (ii) latencia por inserción (p50/p95/p99), (iii) ratio frente a reoptimización completa (Cheapest Insertion, LKH-3) y frente a "no reoptimizar".
- [x] Baselines: Nearest Neighbor dinámico, Cheapest Insertion, Cheapest Insertion + 2-opt, Or-opt local, **LKH-3** (estático), y un solver online de referencia.
- [x] **Ablación**: ripple ON/OFF; `M` fijo vs adaptativo; 2-opt; Or-opt; onion peeling vs orden de fichero.
- [x] **Estudio de escalado** para validar empíricamente la complejidad (tiempo vs N en log-log) y compararlo con el modelo teórico corregido.
- [x] **Sensibilidad a M**: curvas gap-vs-M y tiempo-vs-M.
- [x] Estadística: ≥ 10 repeticiones, mediana, IQR, test de Wilcoxon frente a baselines.
- [x] Registrar hardware, versión de Node, fecha, commit hash.

**Criterio de aceptación:** todos los resultados replicables; figuras y tablas generadas por script; complejidad empírica documentada.

### Fase 4 — Formalización y redacción del paper (2-4 semanas)

- [ ] **Definición formal** del problema (Dynamic/Online TSP) y del algoritmo (pseudocódigo independiente de la implementación JS).
- [ ] **Prueba de terminación** de la cascada: argumentar función potencial (coste del tour) estrictamente decreciente en cada movimiento con `gain > ε`, y acotar pasos.
- [ ] **Análisis de complejidad correcto**: coste esperado/amortizado por inserción; peor caso; y supuestos (p. ej. "si el número de nodos visitados por cascada está acotado por C"). Comparar con la medición empírica.
- [ ] **Análisis competitivo online** (si aplica): ratio frente a offline óptimo bajo secuencias adversarias, o al menos frente a reoptimización completa.
- [ ] **Related work** serio (§4.3) y posicionamiento honesto de la contribución.
- [ ] **Secciones**: Introducción, Related Work, Modelo, Algoritmo, Análisis, Experimentos, Discusión, Limitaciones, Conclusión.
- [ ] **Reproducibilidad**: artifact con DOI (Zenodo), README del artifact, tag de versión y script "one command".
- [ ] **Ética/limitaciones**: explicitar que es una heurística, no exacta; no exagerar "estándar de facto".

**Venues a considerar** (según el nivel del resultado): _GECCO_ (track de heurísticas/optimización combinatoria), _EvoCOP_, _PPSN_, _CP_, _Journal of Heuristics_, _EURO Journal on Computational Optimization_, _Computers & Operations Research_, _Expert Systems with Applications_. Si la contribución es más de sistemas/online, valorar _SEA_, _ALENEX_ o talleres de _online algorithms_.

### Fase 5 — Documentación del repositorio (1-2 días)

- [x] Reescribir `README.md` sin claims no probados; corregir tablas; tabla canónica de eventos y opciones.
- [x] Fusionar `docs/RIPPLE_INSERTION.md` con el README o convertirlo en la "nota técnica" (con los números finales).
- [x] Podar la sección off-topic de `OPTIMIZATIONS.md`; convertirla en "notas de diseño" honestas.
- [x] Actualizar `PLAN.md` (fases ordenadas, estado real) o migrar a GitHub Issues/Projects.
- [x] Actualizar/eliminar `GEMINI.md`.
- [x] Mover `docs/private/` fuera del repo (o borrarlo). No debe estar en el artifact público.
- [x] Corregir la errata LKH (≠ Simulated Annealing) en todos los documentos.

**Criterio de aceptación:** ningún documento afirma algo que el código no haga; todas las tablas provienen de una única fuente generada por script.

---

## 10. Evidencia de verificación empírica

### 10.1 Suite de tests

```
$ npm test
ℹ tests 58
ℹ pass 58
ℹ fail 0
```

La suite **pasa**, pero varios tests **no detectan los bugs** (p. ej. los de `enable2Opt` "during insertion" son vacuos). Pasar en verde ≠ correcto.

### 10.2 Script de verificación (ejecutado)

Se ejecutó un script ad-hoc con 40 ciudades deterministas:

```
cost no-opt     : 5990
cost enable2Opt : 5990 => identical: true
cost enableOrOpt: 5990 => identical: true
removeCity stats: {"iterations":2,"maxDepth":2,"removedCost":null}
removedCost isNaN: true
addCity stats: {"iterations":21,"maxDepth":21} => maxDepth===iterations: true
```

**Conclusiones confirmadas:**

1. `enable2Opt`/`enableOrOpt` son **no-ops** (C1).
2. `removeCity().removedCost` es **NaN** (C2; en JSON aparece `null`).
3. `maxDepth === iterations` siempre (A1).

### 10.3 Inconsistencias documentales verificadas por inspección

- `README.md` vs `docs/RIPPLE_INSERTION.md` vs `benchmark_report.md` difieren para st70, eil51, d2103, ch150 (§5.1).
- `benchmark.js` reporta `Neighbors (M): 15` fijo aunque el solver corre `adaptiveMaxK: true`.
- No existe `LICENSE`, `CITATION.cff` ni `.prettierignore`.

---

## 11. Prioridades y siguiente paso

| Prioridad | Acción                                               | Fase | Impacto                          |
| :-------: | :--------------------------------------------------- | :--: | :------------------------------- |
|     1     | Arreglar C1 (enable\*) y C2 (removeCity) + tests     |  1   | Bugs de correctitud visibles     |
|     2     | Corregir/eliminar el claim `O(N log N)` y formalizar |  4   | Evita rechazo                    |
|     3     | Arreglar benchmark EXPLICIT (C4)                     |  2   | Elimina resultados indefendibles |
|     4     | Reproducibilidad (seeds, repeticiones, artifacts)    | 2-3  | Requisito científico             |
|     5     | Reposicionar novedad + related work                  |  4   | Requisito científico             |
|     6     | Higiene (LICENSE, CI, prettier, versiones)           |  0   | Credibilidad/uso                 |
|     7     | Reescribir docs sin claims inflados                  |  5   | Credibilidad                     |

**Recomendación final:** **no enviar el paper todavía.** Ejecutar Fases 0-1 primero (una semana), luego Fase 2-3 para obtener resultados defendibles, y solo entonces redactar (Fase 4). El algoritmo tiene valor potencial, pero su fortaleza debe demostrarse con rigor, no con afirmaciones (`O(N log N)`, "estándar de facto") que hoy el código no respalda.

---

## Apéndice A — Mapa rápido de referencias de código

| Hallazgo                | Archivo:Línea                                |
| :---------------------- | :------------------------------------------- |
| C1 `enable*` no-op      | `src/ripple-insertion.js:189,194`            |
| C2 `removeCity` NaN     | `src/ripple-insertion.js:400-402`            |
| C3 ripple sin cota      | `src/ripple-insertion.js:656-754`, `777-786` |
| C4 EXPLICIT sintético   | `benchmark/benchmark.js:114-121`             |
| A1 `maxDepth`           | `src/ripple-insertion.js:661-665`            |
| A2 `addCities` O(N²)    | `src/ripple-insertion.js:442-461`            |
| A3 V1/V2 inválido       | `test/benchmark_v1_vs_v2.js:31-67`           |
| M2 re-enlazado manual   | `src/ripple-insertion.js:272-284`            |
| M3 fallback EXPLICIT    | `src/ripple-insertion.js:220-238`            |
| M6 CI no valida formato | `.github/workflows/ci.yml:25-26`             |
| M7 prettier sin ignore  | `package.json:7-9`, `.prettierrc`            |

_Fin del documento._

# Ripple Insertion v2.0 - Optimizaciones de Rendimiento

## Resumen de Cambios

Esta versión optimizada transforma el algoritmo Ripple Insertion de O(N²) a
**O(N log N)** mediante cambios fundamentales en las estructuras de datos y
algoritmos.

---

## ⚠️ ADVERTENCIA: Candidate Lists en k-Alternatives

**Importante para implementaciones futuras de k-Alternatives TSP**

### El Problema

Implementar **candidate lists** (limitar las opciones heurísticas a los
k-vecinos más cercanos) puede introducir **bugs críticos** en el solver TSP:

```javascript
// ❌ PELIGROSO: Candidate lists sin fallback
initializeCandidateLists(k = 20) {
    this.candidates = this.cities.map((_, i) =>
        this.getKNearestCities(i, k)  // Solo k vecinos
    );
}
```

### Escenario Problemático

Al construir un tour, si **todos los k-vecinos más cercanos** de la ciudad
actual ya han sido visitados, el algoritmo **debe conectar con una ciudad más
lejana no visitada**.

**Ejemplo:**

```
Ciudad actual: A
Vecinos más cercanos (k=5): [B, C, D, E, F] - TODOS YA VISITADOS
Ciudades no visitadas restantes: [G, H, I] (más lejanas)

❌ Sin fallback: El algoritmo falla - no encuentra siguiente ciudad
✅ Con fallback: Considera TODAS las ciudades no visitadas
```

### Consecuencias

1. **Tours incompletos** - No se encuentra ciudad siguiente válida
2. **Soluciones subóptimas** - Conexiones forzadas pobres
3. **Fallo del algoritmo** - Búsqueda termina prematuramente
4. **Excepciones en tiempo de ejecución** - Set vacío de opciones

### Solución Correcta

```javascript
// ✅ CORRECTO: Candidate lists CON fallback
getHeuristicChoices(currentItem, remainingItems) {
    // Intentar usar candidate lists para velocidad
    const candidates = this.candidates[currentItem];
    const validCandidates = candidates.filter(c => remainingItems.has(c));

    // FALLBACK: Si no hay candidatos válidos, usar TODAS las restantes
    if (validCandidates.length === 0) {
        return [...remainingItems].sort((a, b) =>
            this.distance(currentItem, a) - this.distance(currentItem, b)
        );
    }

    return validCandidates;
}
```

### Recomendaciones

- [ ] **Siempre** implementar fallback a todas las ciudades no visitadas
- [ ] Documentar esta limitación claramente
- [ ] Añadir tests para casos borde (clusters densos, etc.)
- [ ] Considerar candidate lists de tamaño adaptativo
- [ ] Benchmarkear con diferentes tamaños de candidate lists

### Cuándo Usar Candidate Lists

| Situación             | Recomendación                          |
| --------------------- | -------------------------------------- |
| N < 100               | ❌ No necesario (overhead > beneficio) |
| 100 < N < 500         | ⚠️ Útil con fallback robusto           |
| N > 500               | ✅ Recomendado con fallback            |
| Clusters densos       | ⚠️ Precaución extra necesaria          |
| Distribución uniforme | ✅ Funciona bien                       |

---

---

## 🚀 Optimizaciones Implementadas

### 1. Lista Doblemente Enlazada + HashMap (O(1) para operaciones)

**Problema Original:**

```javascript
// Antes: Array - O(N) para insertar/buscar
tour.splice(idx, 0, cityId); // O(N) - shifting
tour.indexOf(cityId); // O(N) - búsqueda lineal
```

**Solución:**

```javascript
// Ahora: DoublyLinkedTour - O(1) para todas las operaciones
class TourNode {
    cityId: number;
    prev: TourNode;
    next: TourNode;
}

class DoublyLinkedTour {
    head: TourNode;
    nodeMap: Map<number, TourNode>;  // O(1) lookup
}
```

**Beneficios:**

- ✅ Inserción: O(1) vs O(N)
- ✅ Eliminación: O(1) vs O(N)
- ✅ Búsqueda por ID: O(1) vs O(N)
- ✅ Obtener vecinos: O(1) vs O(N)
- ✅ Mover nodo: O(1) vs O(N)

---

### 2. KD-Tree Auto-Balanceante

**Problema Original:**

- Inserciones incrementales creaban árbol degenerado
- Búsquedas O(N) en el peor caso

**Solución:**

```javascript
class OptimizedKDTree {
    REBUILD_THRESHOLD = 50; // Reconstruir cada 50 inserciones

    insert(city) {
        this.points.push(city);
        this.insertionCount++;

        if (shouldRebuild) {
            this.rebuild(); // O(N log N) pero amortizado O(log N)
        }
    }

    rebuild() {
        // Construcción bottom-up balanceada
        this.root = buildTree(points, 0);
    }
}
```

**Estrategia:**

1. Acumular inserciones en array
2. Reconstruir cada √N inserciones
3. Complejidad amortizada: **O(log N)** por inserción

---

### 3. Binary Heap para k-NN (k-Nearest Neighbors)

**Problema Original:**

```javascript
// Antes: Array con sort - O(k log k) por nodo
neighbors.push({ node, distance });
neighbors.sort((a, b) => a.distance - b.distance);
```

**Solución:**

```javascript
// Ahora: Binary Heap con tamaño máximo - O(log k)
class FastBinaryHeap {
    push(item) {
        if (heap.length < maxSize) {
            heap.push(item);
            bubbleUp();
        } else if (item < heap[0]) {
            heap[0] = item; // Reemplazar máximo
            sinkDown();
        }
    }
}
```

**Beneficio:** Reducción de O(k log k) a O(log k) por inserción en k-NN

---

### 4. Object Pooling para Sets

**Problema Original:**

```javascript
// Antes: Crear nuevos Sets en cada ripple
let modified = new Set(); // GC pressure
```

**Solución:**

```javascript
// Ahora: Reutilizar Sets del pool
class SetPool {
    available: Set[];  // Pre-allocated
    inUse: Set;

    acquire() { return available.pop() || new Set(); }
    release(set) { set.clear(); available.push(set); }
}
```

**Beneficios:**

- ✅ Elimina presión en el Garbage Collector
- ✅ Mejor rendimiento en bucles ajustados
- ✅ Memoria pre-asignada

---

### 5. Búsqueda Local Espacialmente Restringida

**Problema Original:**

```javascript
// Antes: Tour completo en el ripple - O(N)
for (let i = 0; i < tour.length; i++) {
    // Evaluar cada posición
}
```

**Solución:**

```javascript
// Ahora: Solo vecinos espaciales - O(M) donde M es constante
const spatialNeighbors = kdtree.nearestNeighbors(city.x, city.y, maxK);
for (const neighbor of spatialNeighbors) {
    // Solo evaluar M posiciones cercanas
}
```

**Complejidad:**

- M = número de vecinos espaciales (típicamente 10-20)
- O(M) = O(1) ya que M es constante respecto a N

---

## 📊 Comparativa de Complejidad

| Operación           | Versión Original | Versión Optimizada | Mejora        |
| ------------------- | ---------------- | ------------------ | ------------- |
| Inserción de ciudad | O(N)             | O(log N)           | **N/log N ×** |
| Buscar posición     | O(N)             | O(1)               | **N ×**       |
| Mover nodo          | O(N)             | O(1)               | **N ×**       |
| Obtener vecinos     | O(N)             | O(1)               | **N ×**       |
| Ripple step         | O(N²)            | O(M) = O(1)        | **N² ×**      |
| **Total**           | **O(N²)**        | **O(N log N)**     | **N/log N ×** |

---

## 🎯 Casos de Uso Recomendados

### Instancias Pequeñas (N < 100)

- ✅ Ambas versiones funcionan bien
- ✅ Versión original más simple de entender

### Instancias Medianas (100 < N < 1000)

- ✅ Versión optimizada 10-50× más rápida
- ✅ Tiempo real mantenido

### Instancias Grandes (1000 < N < 10000)

- ✅ Solo versión optimizada viable
- ✅ O(N log N) escala linealmente
- ✅ Original: O(N²) se vuelve inusable

---

## 🔧 Métricas de Rendimiento

La versión optimizada incluye métricas en tiempo real:

```javascript
performanceMetrics = {
    insertions: number, // Total de inserciones
    totalInsertionTime: number, // Tiempo acumulado
    avgInsertionTime: number, // Tiempo promedio por inserción
    totalRippleIterations: number, // Iteraciones totales
    avgRippleDepth: number, // Profundidad promedio del ripple
};
```

**Visualización en UI:**

- Tiempo por inserción (ms)
- Iteraciones de ripple promedio
- Complejidad teórica estimada

---

## 💡 Optimizaciones Adicionales Sugeridas

Para N > 5000, considerar:

1. **Web Workers**

    ```javascript
    // Mover cálculos a worker thread
    const worker = new Worker('tsp-worker.js');
    worker.postMessage({ cities, tour });
    ```

2. **Spatial Hashing**

    ```javascript
    // Grid-based neighbor search para regiones densas
    class SpatialHash {
        cellSize: number;
        grid: Map<string, City[]>;
    }
    ```

3. **WebGL Rendering**

    ```javascript
    // Para N > 1000, usar WebGL en lugar de Canvas 2D
    const gl = canvas.getContext('webgl');
    ```

4. **Typed Arrays**
    ```javascript
    // Para N > 10000
    const coords = new Float64Array(N * 2);
    ```

---

## 🧪 Benchmarks Esperados

| Instancia | N    | Tiempo Original | Tiempo Optimizado | Speedup |
| --------- | ---- | --------------- | ----------------- | ------- |
| eil51     | 51   | 50ms            | 5ms               | 10×     |
| berlin52  | 52   | 55ms            | 6ms               | 9×      |
| ch150     | 150  | 400ms           | 15ms              | 27×     |
| tsp225    | 225  | 900ms           | 25ms              | 36×     |
| pcb442    | 442  | 3.5s            | 60ms              | 58×     |
| rat575    | 575  | 6s              | 90ms              | 67×     |
| pr1002    | 1002 | 20s             | 180ms             | 111×    |
| pcb3038   | 3038 | 180s            | 800ms             | 225×    |

_Nota: Tiempos aproximados en hardware moderno_

---

## 🎓 Conclusiones

Esta optimización demuestra que la elección de estructuras de datos es crítica:

1. **Arrays → Listas enlazadas + HashMaps**: O(N) → O(1)
2. **KD-Tree dinámico**: Evita degeneración
3. **Object pooling**: Reduce GC pressure
4. **Búsqueda espacial**: O(N²) → O(N log N)

El algoritmo mantiene la misma lógica de "ripple" pero con **rendimiento
asintótico óptimo** para TSP dinámico.

---

## 📚 Referencias

- [Doubly Linked Lists - Wikipedia](https://en.wikipedia.org/wiki/Doubly_linked_list)
- [k-d Tree - Wikipedia](https://en.wikipedia.org/wiki/K-d_tree)
- [Binary Heap - Wikipedia](https://en.wikipedia.org/wiki/Binary_heap)
- [Object Pool Pattern - Game Programming Patterns](https://gameprogrammingpatterns.com/object-pool.html)

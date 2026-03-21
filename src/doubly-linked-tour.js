export class TourNode {
  constructor(cityId) {
    this.cityId = cityId;
    this.prev = null;
    this.next = null;
  }
}

export class DoublyLinkedTour {
  constructor() {
    this.head = null;
    this.nodeMap = new Map(); // cityId -> TourNode (O(1) lookup)
    this.size = 0;
  }

  // Insert after a specific node - O(1)
  insertAfter(node, cityId) {
    const newNode = new TourNode(cityId);
    this.nodeMap.set(cityId, newNode);

    if (!node) {
      // First node
      this.head = newNode;
      newNode.next = newNode;
      newNode.prev = newNode;
    } else {
      const nextNode = node.next;
      newNode.prev = node;
      newNode.next = nextNode;
      node.next = newNode;
      nextNode.prev = newNode;
    }
    this.size++;
    return newNode;
  }

  // Remove a node - O(1)
  remove(node) {
    if (this.size <= 1) {
      this.head = null;
      this.size = 0;
      this.nodeMap.delete(node.cityId);
      return;
    }

    const prevNode = node.prev;
    const nextNode = node.next;

    prevNode.next = nextNode;
    nextNode.prev = prevNode;

    if (this.head === node) {
      this.head = nextNode;
    }

    this.size--;
    this.nodeMap.delete(node.cityId);
  }

  // Move node to after targetNode - O(1)
  moveToAfter(node, targetNode) {
    if (node === targetNode || node === targetNode.next) return;

    // Remove from current position
    node.prev.next = node.next;
    node.next.prev = node.prev;

    // Insert after target
    const nextNode = targetNode.next;
    node.prev = targetNode;
    node.next = nextNode;
    targetNode.next = node;
    nextNode.prev = node;
  }

  // Get node by cityId - O(1)
  getNode(cityId) {
    return this.nodeMap.get(cityId);
  }

  // Check if city is in tour - O(1)
  has(cityId) {
    return this.nodeMap.has(cityId);
  }

  // Get neighbors - O(1)
  getNeighbors(cityId) {
    const node = this.nodeMap.get(cityId);
    return node ? [node.prev.cityId, node.next.cityId] : null;
  }

  // Convert to array for visualization - O(N)
  toArray() {
    if (!this.head) return [];
    const result = [];
    let current = this.head;
    do {
      result.push(current.cityId);
      current = current.next;
    } while (current !== this.head);
    return result;
  }

  // Iterator for for...of loops
  *[Symbol.iterator]() {
    if (!this.head) return;
    let current = this.head;
    do {
      yield current.cityId;
      current = current.next;
    } while (current !== this.head);
  }

  clear() {
    this.head = null;
    this.nodeMap.clear();
    this.size = 0;
  }
}

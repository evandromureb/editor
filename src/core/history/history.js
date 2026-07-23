/** @typedef {import('../transactions/transaction.js').Transaction} Transaction */

export class History {
  /** @type {Transaction[]} */
  #undoStack = []

  /** @type {Transaction[]} */
  #redoStack = []

  /** @type {number} */
  #limit

  /** @param {{ limit?: number }} [options] */
  constructor(options = {}) {
    this.#limit = options.limit ?? 100
  }

  /** @param {Transaction} transaction */
  record(transaction) {
    this.#undoStack.push(transaction)

    if (this.#undoStack.length > this.#limit) {
      this.#undoStack.shift()
    }

    this.#redoStack = []
  }

  /** @returns {Transaction | null} */
  undo() {
    return this.#undoStack.pop() ?? null
  }

  /** @returns {Transaction | null} */
  redo() {
    return this.#redoStack.pop() ?? null
  }

  /** @param {Transaction} transaction */
  pushRedo(transaction) {
    this.#redoStack.push(transaction)
  }

  /** @param {Transaction} transaction */
  pushUndo(transaction) {
    this.#undoStack.push(transaction)
  }

  /** @returns {boolean} */
  canUndo() {
    return this.#undoStack.length > 0
  }

  /** @returns {boolean} */
  canRedo() {
    return this.#redoStack.length > 0
  }
}

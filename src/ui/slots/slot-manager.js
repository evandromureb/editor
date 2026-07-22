/**
 * Manages extensible UI slots (statusbar, sidebar, etc.).
 */

/** @typedef {'statusbar-left' | 'statusbar-center' | 'statusbar-right' | 'sidebar' | 'toolbar'} SlotName */

/**
 * @typedef {object} SlotEntry
 * @property {string} pluginId
 * @property {string} id
 * @property {HTMLElement} element
 */

export class SlotManager {
  /** @type {Map<SlotName, HTMLElement>} */
  #containers = new Map()

  /** @type {Map<string, SlotEntry[]>} pluginId → entries */
  #pluginEntries = new Map()

  /**
   * @param {Record<string, HTMLElement>} containers
   */
  constructor(containers) {
    for (const [name, el] of Object.entries(containers)) {
      this.#containers.set(/** @type {SlotName} */ (name), el)
    }
  }

  /**
   * @param {SlotName} slot
   * @param {string} pluginId
   * @param {string} id
   * @param {HTMLElement} element
   */
  mount(slot, pluginId, id, element) {
    const container = this.#containers.get(slot)
    if (!container) {
      throw new Error(`[SlotManager] Slot desconhecido: ${slot}`)
    }

    element.dataset.pluginSlot = id
    element.dataset.pluginId = pluginId
    container.appendChild(element)

    const entries = this.#pluginEntries.get(pluginId) ?? []
    entries.push({ pluginId, id, element })
    this.#pluginEntries.set(pluginId, entries)
  }

  /**
   * @param {SlotName} slot
   * @param {string} pluginId
   * @param {string} id
   */
  unmount(slot, pluginId, id) {
    const entries = this.#pluginEntries.get(pluginId) ?? []
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) return

    const entry = entries[idx]
    entry.element.remove()
    entries.splice(idx, 1)

    if (entries.length === 0) {
      this.#pluginEntries.delete(pluginId)
    }
  }

  /** @param {string} pluginId */
  unmountAll(pluginId) {
    const entries = this.#pluginEntries.get(pluginId) ?? []
    for (const entry of [...entries]) {
      entry.element.remove()
    }
    this.#pluginEntries.delete(pluginId)
  }

  /**
   * @param {SlotName} slot
   * @returns {HTMLElement | undefined}
   */
  getContainer(slot) {
    return this.#containers.get(slot)
  }
}

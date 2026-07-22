/**
 * @file DOM and browser API polyfills for tests (linkedom-based).
 */
import { parseHTML } from 'linkedom'

const { window } = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>')

globalThis.window = window
globalThis.document = window.document
globalThis.Node = window.Node
globalThis.HTMLElement = window.HTMLElement
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement
if (typeof window.HTMLButtonElement === 'function') {
  globalThis.HTMLButtonElement = window.HTMLButtonElement
}
globalThis.customElements = window.customElements
globalThis.NodeFilter = window.NodeFilter ?? {
  SHOW_TEXT: 4,
}

// linkedom@0.18.12's <select>.value has only a getter (no native "selected
// option" tracking on set) — confirmed against the latest published version,
// no upstream fix available. Patch a setter so select.value = x works like
// in a real browser, matching the behavior production code relies on.
if (typeof window.HTMLSelectElement === 'function') {
  const valueDescriptor = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')
  if (valueDescriptor && !valueDescriptor.set) {
    Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
      configurable: true,
      enumerable: false,
      get: valueDescriptor.get,
      set(value) {
        for (const option of this.options) {
          option.selected = option.value === String(value)
        }
      },
    })
  }
}

if (typeof window.MouseEvent === 'function') {
  globalThis.MouseEvent = window.MouseEvent
} else {
  globalThis.MouseEvent = class MouseEvent extends window.Event {
    /**
     * @param {string} type
     * @param {MouseEventInit} [init]
     */
    constructor(type, init = {}) {
      super(type, init)
      this.clientX = init.clientX ?? 0
      this.clientY = init.clientY ?? 0
      this.shiftKey = init.shiftKey ?? false
    }
  }
}

// linkedom@0.18.12 (the latest published version, verified via
// `npm view linkedom versions`) does not expose a global KeyboardEvent constructor
// — window.KeyboardEvent is undefined. Without this, tests that simulate
// mod/shift/alt (keyboard shortcuts) would have no way to do so. There is
// no package update that fixes this; polyfill is the only option.
globalThis.KeyboardEvent = class KeyboardEvent extends window.Event {
  /**
   * @param {string} type
   * @param {KeyboardEventInit} [init]
   */
  constructor(type, init = {}) {
    super(type, init)
    this.key = init.key ?? ''
    this.ctrlKey = init.ctrlKey ?? false
    this.metaKey = init.metaKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
  }
}

// linkedom@0.18.12 does not implement Element.scrollIntoView (does not exist in
// any published version to date). Without this no-op, any test
// that goes through the real path of Editor's #paintSelection (scrollIntoView
// in src/core/cursor/scroll.js) would throw TypeError.
if (typeof window.HTMLElement.prototype.scrollIntoView !== 'function') {
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {}
}

// linkedom@0.18.12 doesn't implement window.innerWidth/innerHeight at all
// (confirmed against the latest published version — grep over node_modules
// finds no reference). Code that clamps floating UI to the viewport
// (src/ui/runtime/positioning.js, src/ui/select/Select.js) depends on
// these, so default to a plausible desktop viewport size.
if (typeof window.innerWidth !== 'number') {
  window.innerWidth = 1280
}
if (typeof window.innerHeight !== 'number') {
  window.innerHeight = 800
}

if (typeof window.getComputedStyle === 'function') {
  globalThis.getComputedStyle = window.getComputedStyle.bind(window)
} else {
  globalThis.getComputedStyle = () => ({
    getPropertyValue: () => '',
  })
}

globalThis.DOMParser = class DOMParser {
  /**
   * @param {string} html
   * @param {string} type
   */
  parseFromString(html, type) {
    if (type === 'text/html') {
      const { document } = parseHTML(
        `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
      )
      return document
    }

    const { document } = parseHTML(html)
    return document
  }
}

/** @type {Map<string, string>} */
const storage = new Map()

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, String(value))
  },
  removeItem: (key) => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
}

/** @type {{ anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number } | null} */
let activeSelection = null

class TestRange {
  /** @type {Node} */
  startContainer = document.createElement('div')
  /** @type {number} */
  startOffset = 0
  /** @type {Node} */
  endContainer = document.createElement('div')
  /** @type {number} */
  endOffset = 0

  /** @param {Node} node @param {number} offset */
  setStart(node, offset) {
    this.startContainer = node
    this.startOffset = offset
  }

  /** @param {Node} node @param {number} offset */
  setEnd(node, offset) {
    this.endContainer = node
    this.endOffset = offset
  }

  collapse() {}

  getBoundingClientRect() {
    return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }
  }

  toString() {
    if (this.startContainer === this.endContainer && this.startContainer.nodeType === Node.TEXT_NODE) {
      const text = this.startContainer.textContent ?? ''
      return text.slice(this.startOffset, this.endOffset)
    }

    if (this.endContainer.nodeType === Node.TEXT_NODE) {
      let length = 0
      const root =
        this.startContainer.nodeType === Node.ELEMENT_NODE
          ? this.startContainer
          : this.startContainer.parentElement

      if (!root) return ''

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()

      while (node) {
        if (node === this.endContainer) {
          length += this.endOffset
          break
        }
        length += node.textContent?.length ?? 0
        node = walker.nextNode()
      }

      return 'x'.repeat(length)
    }

    return ''
  }
}

globalThis.document.createRange = () => new TestRange()

globalThis.window.getSelection = () => ({
  rangeCount: activeSelection ? 1 : 0,
  get anchorNode() {
    return activeSelection?.anchorNode ?? null
  },
  get anchorOffset() {
    return activeSelection?.anchorOffset ?? 0
  },
  get focusNode() {
    return activeSelection?.focusNode ?? null
  },
  get focusOffset() {
    return activeSelection?.focusOffset ?? 0
  },
  removeAllRanges: () => {
    activeSelection = null
  },
  collapse: (node, offset) => {
    activeSelection = {
      anchorNode: node,
      anchorOffset: offset,
      focusNode: node,
      focusOffset: offset,
    }
  },
  extend: (node, offset) => {
    if (!activeSelection) return
    activeSelection.focusNode = node
    activeSelection.focusOffset = offset
  },
  setBaseAndExtent: (anchorNode, anchorOffset, focusNode, focusOffset) => {
    activeSelection = { anchorNode, anchorOffset, focusNode, focusOffset }
  },
  addRange: (range) => {
    activeSelection = {
      anchorNode: range.startContainer,
      anchorOffset: range.startOffset,
      focusNode: range.endContainer,
      focusOffset: range.endOffset,
    }
  },
})

globalThis.Range = TestRange

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (callback) => {
    queueMicrotask(callback)
  }
}

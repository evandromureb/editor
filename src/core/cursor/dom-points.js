/** @typedef {import('./cursor-types.js').Pos} Pos */

import { isCodeBlockGutter } from '../pipeline/code-block-render.js'

/**
 * Zero-width space used as the content of "empty" anchor text nodes. Browsers
 * cannot compute a layout box (and thus a caret rect) for a range positioned
 * inside a truly empty text node, so anchor nodes use this character instead
 * of an empty string. It has zero logical length in the document model.
 */
const ZERO_WIDTH_SPACE = '​'

/**
 * @param {Node} node
 * @returns {number}
 */
function textNodeLogicalLength(node) {
  return node.textContent === ZERO_WIDTH_SPACE ? 0 : (node.textContent?.length ?? 0)
}

/**
 * @param {Node} node
 * @returns {number}
 */
export function logicalInlineLength(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return textNodeLogicalLength(node)
  }

  if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'BR') {
    return 1
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    if (isCodeBlockGutter(node)) {
      return 0
    }

    let length = 0
    let prevWasParagraph = false
    for (const child of node.childNodes) {
      const isParagraph = child.nodeType === Node.ELEMENT_NODE && child.nodeName === 'P'
      if (isParagraph && prevWasParagraph) {
        length += 1
      }
      length += logicalInlineLength(child)
      prevWasParagraph = isParagraph
    }
    return length
  }

  return 0
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
function isParagraphElement(node) {
  return node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'P'
}

/**
 * @param {Node} parent
 * @param {number} offset
 * @returns {{ node: Node, offset: number } | null}
 */
function findLogicalPointIn(parent, offset) {
  let remaining = offset
  let prevWasParagraph = false

  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    if (isCodeBlockGutter(child)) {
      continue
    }

    const isParagraph = isParagraphElement(child)

    if (isParagraph && prevWasParagraph) {
      if (remaining === 0) {
        return { node: parent, offset: i }
      }
      remaining -= 1
    }
    prevWasParagraph = isParagraph

    if (child.nodeType === Node.TEXT_NODE) {
      const length = textNodeLogicalLength(child)
      if (remaining <= length) {
        return { node: child, offset: remaining }
      }
      remaining -= length
      continue
    }

    if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === 'BR') {
      if (remaining === 0) {
        return { node: parent, offset: i }
      }
      remaining -= 1
      if (remaining === 0) {
        const next = parent.childNodes[i + 1]
        if (next?.nodeType === Node.TEXT_NODE) {
          return { node: next, offset: 0 }
        }
        return { node: parent, offset: i + 1 }
      }
      continue
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      const childLength = logicalInlineLength(child)
      if (remaining < childLength) {
        return findLogicalPointIn(child, remaining)
      }
      if (remaining === childLength) {
        // Prefer a point inside the child (its deepest trailing text/br
        // node) over the parent-level boundary point. A collapsed range
        // sitting right after the last child of a block-level element can
        // fail to produce a usable layout rect in real browsers, which is
        // the same caret-invisibility quirk `appendMarkedText` works around
        // with a zero-width space anchor node.
        const inner = findLogicalPointIn(child, remaining)
        if (inner) return inner
        return { node: parent, offset: i + 1 }
      }
      remaining -= childLength
    }
  }

  return null
}

/**
 * @param {HTMLElement} surface
 * @returns {HTMLElement[]}
 */
export function getBlockChildren(surface) {
  return [...surface.querySelectorAll(':scope > [data-block-index]')].filter(
    (node) => node instanceof HTMLElement
  )
}

/**
 * Direct children of a container block element (e.g. a task-list's
 * task-items), mirroring `getBlockChildren` one level down.
 *
 * @param {HTMLElement} containerElement
 * @returns {HTMLElement[]}
 */
export function getContainerChildren(containerElement) {
  return [...containerElement.querySelectorAll(':scope > [data-child-index]')].filter(
    (node) => node instanceof HTMLElement
  )
}

/**
 * @param {HTMLElement} childElement
 * @returns {number | null}
 */
export function readChildIndex(childElement) {
  const value = childElement.dataset.childIndex
  if (value === undefined) return null
  return Number(value)
}

/**
 * Walks up from `node` to the nearest direct child of `containerElement`
 * carrying `data-child-index` — mirrors `findBlockElement`'s one-level-only
 * walk, scoped inside a container instead of the surface.
 *
 * @param {HTMLElement} containerElement
 * @param {Node} node
 * @returns {HTMLElement | null}
 */
export function findContainerChildElement(containerElement, node) {
  if (node === containerElement) return null

  let current = node instanceof HTMLElement ? node : node.parentElement

  while (current && current !== containerElement) {
    if (current.parentElement === containerElement && current.dataset.childIndex !== undefined) {
      return current
    }
    current = current.parentElement
  }

  return null
}

/**
 * @param {HTMLElement} blockElement
 * @param {number} offset
 * @returns {{ node: Node, offset: number }}
 */
export function findTextPointInBlock(blockElement, offset) {
  const point = findLogicalPointIn(blockElement, offset)
  if (point) return point

  const length = logicalInlineLength(blockElement)
  const clamped = Math.max(0, Math.min(offset, length))

  const lastPoint = findLogicalPointIn(blockElement, clamped)
  if (lastPoint) return lastPoint

  const lastText = findLastTextNode(blockElement)
  if (lastText) {
    const lastLength = textNodeLogicalLength(lastText)
    return { node: lastText, offset: Math.min(clamped, lastLength) }
  }

  return { node: blockElement, offset: 0 }
}

/**
 * @param {HTMLElement} element
 * @returns {Text | null}
 */
export function findLastTextNode(element) {
  const root = element.querySelector('.editor__code-body') ?? element
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let last = null
  let current = walker.nextNode()

  while (current) {
    last = /** @type {Text} */ (current)
    current = walker.nextNode()
  }

  return last
}

/**
 * Resolves the DOM element that should receive text-offset math for `pos`:
 * the block element itself for an ordinary block, or the addressed child
 * element when `pos.childIndex` is set (container block). Shared by
 * mapper.js/coordinates.js/scroll.js, which all need this same lookup.
 *
 * @param {HTMLElement} surface
 * @param {Pos} pos
 * @returns {HTMLElement | null}
 */
export function resolveBlockElementForPos(surface, pos) {
  const blockElement = surface.querySelector(`[data-block-index="${pos.block}"]`)
  if (!(blockElement instanceof HTMLElement)) return null

  if (pos.childIndex === undefined) return blockElement

  const childElement = blockElement.querySelector(`:scope > [data-child-index="${pos.childIndex}"]`)
  return childElement instanceof HTMLElement ? childElement : blockElement
}

/**
 * @param {HTMLElement} surface
 * @param {Node} node
 * @returns {HTMLElement | null}
 */
export function findBlockElement(surface, node) {
  if (node === surface) return null

  let current = node instanceof HTMLElement ? node : node.parentElement

  while (current && current !== surface) {
    if (current.parentElement === surface && current.dataset.blockIndex !== undefined) {
      return current
    }
    current = current.parentElement
  }

  return null
}

/**
 * @param {HTMLElement} blockElement
 * @returns {number | null}
 */
export function blockIndex(blockElement) {
  const value = blockElement.dataset.blockIndex
  if (value === undefined) return null
  return Number(value)
}

/**
 * @param {HTMLElement} surface
 * @param {Node | null} node
 * @param {number} offset
 * @returns {Pos | null}
 */
export function posFromDomPoint(surface, node, offset) {
  if (!node) return null

  if (node === surface) {
    return posFromSurfacePoint(surface, offset)
  }

  const blockElement = findBlockElement(surface, node)
  if (!blockElement) return null

  const block = blockIndex(blockElement)
  if (block === null) return null

  const containerChildren = getContainerChildren(blockElement)
  if (containerChildren.length) {
    const childElement = findContainerChildElement(blockElement, node) ?? containerChildren[0]
    const childIdx = readChildIndex(childElement)
    if (childIdx === null) return null

    const childOffset = textOffsetWithinBlock(childElement, node, offset)
    return { block, childIndex: childIdx, offset: childOffset }
  }

  const blockOffset = textOffsetWithinBlock(blockElement, node, offset)
  return { block, offset: blockOffset }
}

/**
 * @param {HTMLElement} surface
 * @param {Range} range
 * @returns {Pos | null}
 */
export function posFromDomRange(surface, range) {
  return posFromDomPoint(surface, range.startContainer, range.startOffset)
}

/**
 * @param {HTMLElement} surface
 * @param {number} offset
 * @returns {Pos | null}
 */
function posFromSurfacePoint(surface, offset) {
  const blocks = getBlockChildren(surface)
  if (!blocks.length) return null

  const index = Math.max(0, Math.min(offset, blocks.length))

  if (index === 0) {
    const block = blockIndex(blocks[0])
    if (block === null) return null
    return { block, offset: 0 }
  }

  const blockElement = blocks[index - 1]
  const block = blockIndex(blockElement)
  if (block === null) return null

  const textLength = logicalInlineLength(blockElement)
  return { block, offset: textLength }
}

/**
 * @param {HTMLElement} blockElement
 * @param {Node} targetNode
 * @param {number} targetOffset
 * @returns {number}
 */
function measureTextOffsetUpTo(blockElement, targetNode, targetOffset) {
  let measured = 0

  /** @param {Node} parent @returns {boolean} */
  function walk(parent) {
    let prevWasParagraph = false
    for (const child of parent.childNodes) {
      if (isCodeBlockGutter(child)) {
        continue
      }

      const isParagraph = isParagraphElement(child)
      if (isParagraph && prevWasParagraph) {
        measured += 1
      }
      prevWasParagraph = isParagraph

      if (child === targetNode && child.nodeType === Node.TEXT_NODE) {
        measured += targetOffset
        return true
      }

      if (child.nodeType === Node.TEXT_NODE) {
        measured += textNodeLogicalLength(child)
      } else if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === 'BR') {
        measured += 1
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (walk(child)) return true
      }
    }

    return false
  }

  walk(blockElement)
  return measured
}

/**
 * @param {NodeListOf<ChildNode> | Node[]} children
 * @param {number} count
 * @returns {number}
 */
function sumChildLengths(children, count) {
  let length = 0
  let prevWasParagraph = false
  for (let i = 0; i < count && i < children.length; i++) {
    const child = children[i]
    if (isCodeBlockGutter(child)) {
      continue
    }

    const isParagraph = isParagraphElement(child)
    if (isParagraph && prevWasParagraph) {
      length += 1
    }
    length += logicalInlineLength(child)
    prevWasParagraph = isParagraph
  }
  return length
}

/**
 * @param {HTMLElement} blockElement
 * @param {Node} container
 * @param {number} offset
 * @returns {number}
 */
export function textOffsetWithinBlock(blockElement, container, offset) {
  if (container.nodeType === Node.ELEMENT_NODE && container.nodeName === 'BR') {
    const parent = container.parentElement ?? blockElement
    const index = [...parent.childNodes].indexOf(container)
    return measureTextOffsetInBlock(blockElement, parent, index + (offset > 0 ? 1 : 0))
  }

  if (container.nodeType === Node.TEXT_NODE) {
    return measureTextOffsetUpTo(blockElement, container, offset)
  }

  if (container.nodeType === Node.ELEMENT_NODE && blockElement.contains(container)) {
    return measureTextOffsetInBlock(blockElement, container, offset)
  }

  return measureTextOffsetInBlock(
    blockElement,
    blockElement,
    Math.min(offset, blockElement.childNodes.length)
  )
}

/**
 * @param {HTMLElement} blockElement
 * @param {Node} container
 * @param {number} offset
 * @returns {number}
 */
function measureTextOffsetInBlock(blockElement, container, offset) {
  if (container === blockElement) {
    return sumChildLengths(blockElement.childNodes, offset)
  }

  let measured = 0
  let reached = false

  /** @param {Node} node */
  const walk = (node) => {
    if (reached) return

    if (node === container) {
      measured += sumChildLengths(node.childNodes, offset)
      reached = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      measured += textNodeLogicalLength(node)
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'BR') {
      measured += 1
      return
    }

    let prevWasParagraph = false
    for (const child of node.childNodes) {
      if (isCodeBlockGutter(child)) {
        continue
      }

      const isParagraph = isParagraphElement(child)
      if (isParagraph && prevWasParagraph) {
        measured += 1
      }
      prevWasParagraph = isParagraph
      walk(child)
      if (reached) return
    }
  }

  let prevWasParagraph = false
  for (const child of blockElement.childNodes) {
    if (isCodeBlockGutter(child)) {
      continue
    }

    const isParagraph = isParagraphElement(child)
    if (isParagraph && prevWasParagraph) {
      measured += 1
    }
    prevWasParagraph = isParagraph
    walk(child)
    if (reached) break
  }

  return measured
}

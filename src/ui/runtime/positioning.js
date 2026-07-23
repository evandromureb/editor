/**
 * Positions floating elements (popover, menu) relative to an anchor.
 */

/**
 * @typedef {'top' | 'bottom' | 'left' | 'right'} Placement
 */

/**
 * @typedef {object} PositionOpts
 * @property {HTMLElement} anchor
 * @property {HTMLElement} element
 * @property {Placement} [placement='bottom']
 * @property {number} [offset=4]
 * @property {HTMLElement} [boundary] Element the popover must stay within
 *   (e.g. the editor root). Falls back to the viewport when omitted.
 * @property {boolean} [lockPlacement=false] When true (only meaningful for
 *   'top'/'bottom'), the popover is never pushed to the anchor's opposite
 *   side to make room — it always renders on the given `placement` side,
 *   shrinking (with internal scroll) instead of flipping when the boundary
 *   doesn't have enough space.
 */

const VIEWPORT_MARGIN = 8

/**
 * Bounds within which the popover must be kept, clamped to the viewport so
 * a boundary that is itself partially offscreen doesn't push the popover
 * off the screen. When a boundary is given, it is inset by VIEWPORT_MARGIN
 * too — the popover must stay inside the boundary with a margin, not flush
 * against its edge (popover.left = boundary.left + margin, popover.right =
 * boundary.right - margin).
 *
 * @param {HTMLElement} [boundary]
 */
function getBoundaryRect(boundary) {
  const viewport = { left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, right: window.innerWidth - VIEWPORT_MARGIN, bottom: window.innerHeight - VIEWPORT_MARGIN }
  if (!boundary) return viewport

  const rect = boundary.getBoundingClientRect()
  return {
    left: Math.max(viewport.left, rect.left + VIEWPORT_MARGIN),
    top: Math.max(viewport.top, rect.top + VIEWPORT_MARGIN),
    right: Math.min(viewport.right, rect.right - VIEWPORT_MARGIN),
    bottom: Math.min(viewport.bottom, rect.bottom - VIEWPORT_MARGIN),
  }
}

/**
 * @param {HTMLElement} anchor
 * @param {HTMLElement} element
 * @param {Placement} [preferred='bottom']
 * @param {HTMLElement} [boundary]
 * @returns {Placement}
 */
export function flipPlacement(anchor, element, preferred = 'bottom', boundary) {
  const anchorRect = anchor.getBoundingClientRect()
  const elRect = element.getBoundingClientRect()
  const bounds = getBoundaryRect(boundary)

  if (preferred === 'bottom') {
    if (anchorRect.bottom + elRect.height + VIEWPORT_MARGIN > bounds.bottom) {
      return 'top'
    }
    return 'bottom'
  }

  if (preferred === 'top') {
    if (anchorRect.top - elRect.height - VIEWPORT_MARGIN < bounds.top) {
      return 'bottom'
    }
    return 'top'
  }

  if (preferred === 'right') {
    if (anchorRect.right + elRect.width + VIEWPORT_MARGIN > bounds.right) {
      return 'left'
    }
    return 'right'
  }

  if (preferred === 'left') {
    if (anchorRect.left - elRect.width - VIEWPORT_MARGIN < bounds.left) {
      return 'right'
    }
    return 'left'
  }

  return preferred
}

/**
 * @param {PositionOpts} opts
 */
export function positionElement({ anchor, element, placement = 'bottom', offset = 4, boundary, lockPlacement = false }) {
  const anchorRect = anchor.getBoundingClientRect()
  const elRect = element.getBoundingClientRect()
  const bounds = getBoundaryRect(boundary)

  /** @type {Record<Placement, { top: number, left: number }>} */
  const positions = {
    // Aligned to the anchor's left edge by default (Notion/Docs/CKEditor
    // style) — horizontal clamping below shifts it right/left only when it
    // would otherwise overflow the boundary.
    bottom: {
      top: anchorRect.bottom + offset,
      left: anchorRect.left,
    },
    top: {
      top: anchorRect.top - elRect.height - offset,
      left: anchorRect.left,
    },
    left: {
      top: anchorRect.top + anchorRect.height / 2 - elRect.height / 2,
      left: anchorRect.left - elRect.width - offset,
    },
    right: {
      top: anchorRect.top + anchorRect.height / 2 - elRect.height / 2,
      left: anchorRect.right + offset,
    },
  }

  let { top, left } = positions[placement] ?? positions.bottom

  const maxWidth = Math.max(0, bounds.right - bounds.left)
  // With lockPlacement, the edge touching the anchor (top edge for
  // 'bottom' placement, bottom edge for 'top' placement) is pinned and
  // never flipped to the opposite side — the popover shrinks (and scrolls
  // internally, via overflow) to fit the remaining space instead.
  const maxHeight = lockPlacement && placement === 'bottom'
    ? Math.max(0, bounds.bottom - top)
    : lockPlacement && placement === 'top'
      ? Math.max(0, anchorRect.top - offset - bounds.top)
      : Math.max(0, bounds.bottom - bounds.top)
  const width = Math.min(elRect.width, maxWidth)
  const height = Math.min(elRect.height, maxHeight)

  if (lockPlacement && placement === 'top') {
    // Keep the bottom edge pinned to the anchor as height shrinks.
    top = anchorRect.top - offset - height
  }

  left = Math.max(bounds.left, Math.min(left, bounds.right - width))
  top = lockPlacement
    ? Math.max(bounds.top, top)
    : Math.max(bounds.top, Math.min(top, bounds.bottom - height))

  element.style.position = 'fixed'
  element.style.top = `${top}px`
  element.style.left = `${left}px`
  element.style.maxWidth = `${maxWidth}px`
  element.style.maxHeight = `${maxHeight}px`
  element.style.overflowX = 'auto'
  element.style.overflowY = 'auto'
  element.style.zIndex = ''
}

/**
 * Picks the best placement after vertical and horizontal flip checks.
 *
 * @param {HTMLElement} anchor
 * @param {HTMLElement} element
 * @param {Placement} [preferred='bottom']
 * @param {HTMLElement} [boundary]
 * @returns {Placement}
 */
export function pickPlacement(anchor, element, preferred = 'bottom', boundary) {
  return flipPlacement(anchor, element, preferred, boundary)
}

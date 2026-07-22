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
 */

const VIEWPORT_MARGIN = 8

/**
 * Bounds within which the popover must be kept, clamped to the viewport so
 * a boundary that is itself partially offscreen doesn't push the popover
 * off the screen.
 *
 * @param {HTMLElement} [boundary]
 */
function getBoundaryRect(boundary) {
  const viewport = { left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, right: window.innerWidth - VIEWPORT_MARGIN, bottom: window.innerHeight - VIEWPORT_MARGIN }
  if (!boundary) return viewport

  const rect = boundary.getBoundingClientRect()
  return {
    left: Math.max(viewport.left, rect.left),
    top: Math.max(viewport.top, rect.top),
    right: Math.min(viewport.right, rect.right),
    bottom: Math.min(viewport.bottom, rect.bottom),
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
export function positionElement({ anchor, element, placement = 'bottom', offset = 4, boundary }) {
  const anchorRect = anchor.getBoundingClientRect()
  const elRect = element.getBoundingClientRect()
  const bounds = getBoundaryRect(boundary)

  /** @type {Record<Placement, { top: number, left: number }>} */
  const positions = {
    bottom: {
      top: anchorRect.bottom + offset,
      left: anchorRect.left + anchorRect.width / 2 - elRect.width / 2,
    },
    top: {
      top: anchorRect.top - elRect.height - offset,
      left: anchorRect.left + anchorRect.width / 2 - elRect.width / 2,
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
  const maxHeight = Math.max(0, bounds.bottom - bounds.top)
  const width = Math.min(elRect.width, maxWidth)
  const height = Math.min(elRect.height, maxHeight)

  left = Math.max(bounds.left, Math.min(left, bounds.right - width))
  top = Math.max(bounds.top, Math.min(top, bounds.bottom - height))

  element.style.position = 'fixed'
  element.style.top = `${top}px`
  element.style.left = `${left}px`
  element.style.maxWidth = `${maxWidth}px`
  element.style.maxHeight = `${maxHeight}px`
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

/**
 * Focus trap for dialogs and modal overlays.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * @typedef {object} FocusTrap
 * @property {() => void} activate
 * @property {() => void} deactivate
 */

/**
 * @param {HTMLElement} container
 * @returns {FocusTrap}
 */
export function createFocusTrap(container) {
  /** @type {HTMLElement | null} */
  let previousFocus = null

  /** @type {(e: KeyboardEvent) => void} */
  let keyHandler = null

  function getFocusable() {
    return [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => el instanceof HTMLElement && el.offsetParent !== null
    )
  }

  return {
    activate() {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

      const focusable = getFocusable()
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        container.tabIndex = -1
        container.focus()
      }

      keyHandler = (e) => {
        if (e.key !== 'Tab') return

        const items = getFocusable()
        if (items.length === 0) {
          e.preventDefault()
          return
        }

        const first = items[0]
        const last = items[items.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }

      container.addEventListener('keydown', keyHandler)
    },

    deactivate() {
      if (keyHandler) {
        container.removeEventListener('keydown', keyHandler)
        keyHandler = null
      }

      if (previousFocus?.isConnected) {
        previousFocus.focus()
      }
      previousFocus = null
    },
  }
}

/**
 * Utilities for parsing and matching keyboard shortcuts.
 * Supports: mod+b, mod+shift+b, ctrl+k, alt+f, etc.
 */

/**
 * @typedef {object} ParsedShortcut
 * @property {boolean} mod    - Ctrl or Cmd (OS-dependent)
 * @property {boolean} shift
 * @property {boolean} alt
 * @property {string} key     - final key in lowercase
 */

/**
 * Parses a shortcut string.
 * 'mod' is an alias for Ctrl/Cmd (cross-platform).
 *
 * The final key may be the '+' character itself (e.g. 'mod+shift++').
 * Because '+' is also the modifier separator, that form is
 * recognized by the '++' suffix (or the string being exactly '+')
 * before splitting — otherwise split('+') would produce an
 * empty final segment instead of the '+' key.
 *
 * @param {string} shortcut  - e.g. 'mod+b', 'mod+shift+b', 'alt+f', 'mod+shift++'
 * @returns {ParsedShortcut}
 */
export function parseShortcut(shortcut) {
  const lower = shortcut.toLowerCase()
  const isPlusKey = lower === '+' || lower.endsWith('++')
  const parts = (isPlusKey ? lower.slice(0, -1) : lower).split('+')

  return {
    mod: parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key: isPlusKey ? '+' : parts[parts.length - 1],
  }
}

/**
 * Checks whether a KeyboardEvent matches the given shortcut.
 *
 * @param {KeyboardEvent} event
 * @param {string} shortcut
 * @returns {boolean}
 */
export function matchesShortcut(event, shortcut) {
  const { mod, shift, alt, key } = parseShortcut(shortcut)
  const eventMod = event.ctrlKey || event.metaKey

  return (
    eventMod === mod &&
    event.shiftKey === shift &&
    event.altKey === alt &&
    event.key.toLowerCase() === key
  )
}

/**
 * Formats a shortcut for display.
 * E.g. 'mod+shift+b' → 'Ctrl+Shift+B'
 *
 * @param {string} shortcut
 * @returns {string}
 */
export function formatShortcut(shortcut) {
  return shortcut
    .split('+')
    .map((part) => {
      const p = part.toLowerCase()
      if (p === 'mod' || p === 'ctrl' || p === 'cmd') return 'Ctrl'
      if (p === 'shift') return 'Shift'
      if (p === 'alt' || p === 'option') return 'Alt'
      return part.toUpperCase()
    })
    .join('+')
}

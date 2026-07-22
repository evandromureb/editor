/**
 * Paragraph separator used by `softBreakOnEnter` blocks (e.g. quote) when no
 * custom `softBreakSeparator` is set. Distinct from `'\n'`, which Shift+Enter
 * inserts as a soft line break inside those blocks.
 */
export const PARAGRAPH_SEPARATOR = ' '

/**
 * @param {{ softBreakSeparator?: string } | null | undefined} def
 * @returns {string}
 */
export function getSoftBreakSeparator(def) {
  return def?.softBreakSeparator ?? PARAGRAPH_SEPARATOR
}

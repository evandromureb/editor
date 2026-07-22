/** @typedef {import('./types.js').TextNode} TextNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

/**
 * @param {string[]} [a]
 * @param {string[]} [b]
 * @param {EditorRegistries} registries
 * @param {Record<string, string>} [attrsA]
 * @param {Record<string, string>} [attrsB]
 * @returns {boolean}
 */
export function marksEqual(a = [], b = [], registries, attrsA = {}, attrsB = {}) {
  const left = registries.marks.sortMarks(a)
  const right = registries.marks.sortMarks(b)

  if (left.length !== right.length || !left.every((mark, index) => mark === right[index])) {
    return false
  }

  for (const mark of left) {
    const def = registries.marks.getMarkByName(mark)
    if (def?.styleAttr && (attrsA[mark] ?? '') !== (attrsB[mark] ?? '')) {
      return false
    }
  }

  return true
}

/**
 * @param {string[]} marks
 * @param {string} mark
 * @param {EditorRegistries} registries
 * @returns {string[]}
 */
export function addMark(marks, mark, registries) {
  return registries.marks.sortMarks([...new Set([...marks, mark])])
}

/**
 * @param {string[]} marks
 * @param {string} mark
 * @param {EditorRegistries} registries
 * @returns {string[]}
 */
export function removeMark(marks, mark, registries) {
  return registries.marks.sortMarks(marks.filter((item) => item !== mark))
}

/**
 * @param {Record<string, string>} [markAttrs]
 * @param {string} mark
 * @returns {Record<string, string>}
 */
export function removeMarkAttr(markAttrs, mark) {
  if (!markAttrs?.[mark]) return markAttrs ?? {}
  const next = { ...markAttrs }
  delete next[mark]
  return next
}

/**
 * @param {string} text
 * @param {string[]} [marks]
 * @param {EditorRegistries} [registries]
 * @param {Record<string, string>} [markAttrs]
 * @returns {TextNode}
 */
export function textNode(text, marks = [], registries, markAttrs = {}) {
  if (!marks.length) {
    return { type: 'text', text }
  }

  const sorted = registries.marks.sortMarks(marks)
  /** @type {Record<string, string>} */
  const filteredAttrs = {}

  for (const mark of sorted) {
    if (markAttrs[mark]) {
      filteredAttrs[mark] = markAttrs[mark]
    }
  }

  return {
    type: 'text',
    text,
    marks: sorted,
    ...(Object.keys(filteredAttrs).length ? { markAttrs: filteredAttrs } : {}),
  }
}

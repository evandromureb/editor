/**
 * @typedef {import('../../sdk/types.js').MarkDefinition} MarkDefinition
 */

/**
 * @typedef {object} MarkRegistry
 * @property {(def: MarkDefinition) => void} registerMark
 * @property {(name: string) => void} unregisterMark
 * @property {(name: string) => MarkDefinition | null} getMarkByName
 * @property {(tag: string) => string | null} getMarkByTag
 * @property {() => MarkDefinition[]} getAllMarks
 * @property {(marks: string[]) => string[]} sortMarks
 */

/** @returns {MarkRegistry} */
export function createMarkRegistry() {
  /** @type {Map<string, MarkDefinition>} */
  const marksByName = new Map()

  /** @type {Map<string, string>} */
  const marksByTag = new Map()

  /**
   * @param {MarkDefinition} def
   */
  function registerMark(def) {
    if (marksByName.has(def.name)) {
      throw new Error(`Mark already registered: ${def.name}`)
    }

    marksByName.set(def.name, def)

    if (!def.styleAttr) {
      for (const tag of def.parseTags) {
        marksByTag.set(tag, def.name)
      }
    }
  }

  /**
   * @param {string} name
   */
  function unregisterMark(name) {
    const def = marksByName.get(name)
    if (!def) return

    marksByName.delete(name)
    for (const tag of def.parseTags) {
      if (marksByTag.get(tag) === name) {
        marksByTag.delete(tag)
      }
    }
  }

  /**
   * @param {string} name
   * @returns {MarkDefinition | null}
   */
  function getMarkByName(name) {
    return marksByName.get(name) ?? null
  }

  /**
   * @param {string} tag
   * @returns {string | null}
   */
  function getMarkByTag(tag) {
    return marksByTag.get(tag) ?? null
  }

  /** @returns {MarkDefinition[]} */
  function getAllMarks() {
    return [...marksByName.values()].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    )
  }

  /**
   * @param {string[]} marks
   * @returns {string[]}
   */
  function sortMarks(marks) {
    const all = getAllMarks().map((d) => d.name)
    const known = marks.filter((m) => all.includes(m))
    const unknown = marks.filter((m) => !all.includes(m))
    return [...all.filter((m) => known.includes(m)), ...unknown]
  }

  return { registerMark, unregisterMark, getMarkByName, getMarkByTag, getAllMarks, sortMarks }
}

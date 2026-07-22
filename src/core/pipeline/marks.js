/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

/**
 * @param {string} value
 * @returns {string}
 */
function escapeStyleValue(value) {
  return value.replace(/"/g, '&quot;')
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAttrValue(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

const URL_ATTR_NAMES = new Set(['href', 'src'])
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SAFE_IMAGE_URL_SCHEMES = new Set([...SAFE_URL_SCHEMES, 'blob:'])

/**
 * @param {string} value
 * @param {boolean} allowBlob
 * @returns {boolean}
 */
function isSafeUrlValue(value, allowBlob) {
  const schemeMatch = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)
  if (!schemeMatch) return true

  const scheme = `${schemeMatch[1].toLowerCase()}:`
  const allowedSchemes = allowBlob ? SAFE_IMAGE_URL_SCHEMES : SAFE_URL_SCHEMES
  return allowedSchemes.has(scheme)
}

/**
 * URL-bearing attributes (href, src) only allow the http(s)/mailto/tel
 * schemes by default — relative/anchor values (no scheme prefix) pass
 * through untouched. Image `src` can opt into `blob:` URLs via `allowBlob`
 * for local upload previews/fallbacks. Other attributes keep the narrower
 * javascript:/vbscript: blocklist so free-text values (e.g. a title starting
 * with a word followed by a colon) aren't rejected. Shared by sanitize.js
 * and blocks.js so every attrs-copying path gets the same guard.
 * @param {string} name
 * @param {string} value
 * @param {{ allowBlob?: boolean }} [options]
 * @returns {boolean}
 */
export function isSafeAttrValue(name, value, options = {}) {
  const { allowBlob = false } = options

  if (URL_ATTR_NAMES.has(name)) {
    return isSafeUrlValue(value, allowBlob && name === 'src')
  }

  const schemeMatch = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)
  if (!schemeMatch) return true
  const scheme = `${schemeMatch[1].toLowerCase()}:`
  return scheme !== 'javascript:' && scheme !== 'vbscript:'
}

/**
 * @param {string} raw
 * @returns {Record<string, string>}
 */
function parseAttrsValue(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * @param {string} html
 * @param {string[]} marks
 * @param {EditorRegistries} registries
 * @param {Record<string, string>} [markAttrs]
 * @returns {string}
 */
export function wrapHtmlWithMarks(html, marks, registries, markAttrs = {}) {
  const ordered = registries.marks.sortMarks(marks)

  for (const markName of ordered) {
    const def = registries.marks.getMarkByName(markName)
    if (!def) continue

    if (def.styleAttr) {
      const value = markAttrs[markName]
      if (!value) continue
      html = `<${def.tag} style="${def.styleAttr}: ${escapeStyleValue(value)}">${html}</${def.tag}>`
    } else if (def.attrs?.length) {
      const values = markAttrs[markName] ? parseAttrsValue(markAttrs[markName]) : {}
      const attrString = def.attrs
        .filter((name) => values[name] && isSafeAttrValue(name, values[name]))
        .map((name) => `${name}="${escapeAttrValue(values[name])}"`)
        .join(' ')
      html = attrString
        ? `<${def.tag} ${attrString}>${html}</${def.tag}>`
        : `<${def.tag}>${html}</${def.tag}>`
    } else {
      html = `<${def.tag}>${html}</${def.tag}>`
    }
  }

  return html
}

/**
 * Trailing spaces are rendered as nbsp so they remain visible in contentEditable.
 * The document model still uses regular spaces; nbsp is display-only.
 *
 * @param {string} text
 * @returns {string}
 */
function textForDisplay(text) {
  return text.replace(/ +$/g, (spaces) => '\u00A0'.repeat(spaces.length))
}

/**
 * @param {HTMLElement} parent
 * @param {string} text
 * @param {string[]} marks
 * @param {EditorRegistries} registries
 * @param {Record<string, string>} [markAttrs]
 */
export function appendMarkedText(parent, text, marks, registries, markAttrs = {}) {
  if (!text) {
    parent.appendChild(document.createTextNode('​'))
    return
  }

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      parent.appendChild(document.createElement('br'))
    }
    if (lines[i]) {
      appendMarkedTextSegment(parent, lines[i], marks, registries, markAttrs)
    } else {
      parent.appendChild(document.createTextNode('​'))
    }
  }
}

import { PARAGRAPH_SEPARATOR } from '../document/soft-break.js'

/**
 * Appends the full text content of a block (potentially made of several
 * marked text nodes) into `element`. When the concatenated text contains no
 * paragraph separators, this behaves exactly like calling `appendMarkedText`
 * once per node (the common case for regular blocks). When it does contain
 * paragraph separators, the content is split into paragraphs and each one is
 * wrapped in its own `<p>` element, with `appendMarkedText`'s `'\n'` → `<br>`
 * handling still applying inside each paragraph.
 *
 * @param {HTMLElement} element
 * @param {{ text: string, marks?: string[], markAttrs?: Record<string, string> }[]} nodes
 * @param {EditorRegistries} registries
 */
export function appendBlockTextContent(element, nodes, registries) {
  const hasParagraphBreak = nodes.some((node) => node.text.includes(PARAGRAPH_SEPARATOR))

  if (!hasParagraphBreak) {
    for (const node of nodes) {
      appendMarkedText(element, node.text, node.marks ?? [], registries, node.markAttrs ?? {})
    }
    return
  }

  /** @type {{ text: string, marks?: string[], markAttrs?: Record<string, string> }[][]} */
  const paragraphs = [[]]

  for (const node of nodes) {
    const parts = node.text.split(PARAGRAPH_SEPARATOR)
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        paragraphs.push([])
      }
      if (parts[i]) {
        paragraphs[paragraphs.length - 1].push({
          text: parts[i],
          marks: node.marks,
          markAttrs: node.markAttrs,
        })
      }
    }
  }

  for (const paragraphNodes of paragraphs) {
    const p = document.createElement('p')
    if (paragraphNodes.length) {
      for (const node of paragraphNodes) {
        appendMarkedText(p, node.text, node.marks ?? [], registries, node.markAttrs ?? {})
      }
    } else {
      p.appendChild(document.createTextNode('​'))
    }
    element.appendChild(p)
  }
}

/**
 * @param {HTMLElement} parent
 * @param {string} text
 * @param {string[]} marks
 * @param {EditorRegistries} registries
 * @param {Record<string, string>} [markAttrs]
 */
function appendMarkedTextSegment(parent, text, marks, registries, markAttrs = {}) {
  if (!text) return

  let container = parent
  const ordered = registries.marks.sortMarks(marks)

  for (const def of registries.marks.getAllMarks()) {
    if (!ordered.includes(def.name)) continue

    const element = document.createElement(def.tag)
    element.dataset.mark = def.name

    if (def.styleAttr && markAttrs[def.name]) {
      element.style.setProperty(def.styleAttr, markAttrs[def.name])
    } else if (def.attrs?.length && markAttrs[def.name]) {
      const values = parseAttrsValue(markAttrs[def.name])
      for (const name of def.attrs) {
        if (values[name] && isSafeAttrValue(name, values[name])) element.setAttribute(name, values[name])
      }
    }

    container.appendChild(element)
    container = element
  }

  container.appendChild(document.createTextNode(textForDisplay(text)))
}

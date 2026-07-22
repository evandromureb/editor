/** @typedef {import('../document/types.js').TextNode} TextNode */

export const CODE_BLOCK_GUTTER_CLASS = 'editor__code-gutter'
export const CODE_BLOCK_BODY_CLASS = 'editor__code-body'

/**
 * @param {{ text: string }[]} nodes
 * @returns {number}
 */
export function countCodeBlockLines(nodes) {
  const text = nodes.map((node) => node.text).join('')
  return Math.max(1, text.split('\n').length)
}

/**
 * @param {number} count
 * @returns {string}
 */
export function formatCodeBlockLineNumbers(count) {
  return Array.from({ length: count }, (_, index) => String(index + 1)).join('\n')
}

/**
 * @param {HTMLElement} element
 * @param {TextNode[]} nodes
 * @param {import('../schema/editor-registries.js').EditorRegistries} registries
 * @param {(element: HTMLElement, nodes: TextNode[], registries: import('../schema/editor-registries.js').EditorRegistries) => void} appendContent
 */
export function appendCodeBlockContent(element, nodes, registries, appendContent) {
  const lineCount = countCodeBlockLines(nodes)

  const gutter = document.createElement('span')
  gutter.className = CODE_BLOCK_GUTTER_CLASS
  gutter.setAttribute('aria-hidden', 'true')
  gutter.setAttribute('contenteditable', 'false')
  gutter.textContent = formatCodeBlockLineNumbers(lineCount)

  const body = document.createElement('span')
  body.className = CODE_BLOCK_BODY_CLASS
  appendContent(body, nodes, registries)

  element.append(gutter, body)
}

/**
 * @param {HTMLElement} body
 * @returns {string}
 */
function getCodeBlockTextFromBody(body) {
  let text = ''
  for (const child of body.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? ''
      continue
    }
    if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === 'BR') {
      text += '\n'
      continue
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      text += getCodeBlockTextFromBody(/** @type {HTMLElement} */ (child))
    }
  }
  return text
}

/**
 * Adds gutter line numbers to serialized `<pre>` blocks in read-only containers.
 *
 * @param {ParentNode} root
 */
export function enhanceCodeBlockPreElements(root) {
  for (const pre of root.querySelectorAll('pre')) {
    if (!(pre instanceof HTMLElement)) continue
    const blockType = pre.getAttribute('data-block')
    if (blockType && blockType !== 'code-block') continue
    if (pre.querySelector(`.${CODE_BLOCK_BODY_CLASS}`)) continue
    if (!blockType) {
      pre.setAttribute('data-block', 'code-block')
    }

    const body = document.createElement('span')
    body.className = CODE_BLOCK_BODY_CLASS
    while (pre.firstChild) {
      body.appendChild(pre.firstChild)
    }

    const gutter = document.createElement('span')
    gutter.className = CODE_BLOCK_GUTTER_CLASS
    gutter.setAttribute('aria-hidden', 'true')
    gutter.textContent = formatCodeBlockLineNumbers(
      countCodeBlockLines([{ text: getCodeBlockTextFromBody(body) }]),
    )

    pre.append(gutter, body)
  }
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
export function isCodeBlockGutter(node) {
  return node instanceof HTMLElement && node.classList.contains(CODE_BLOCK_GUTTER_CLASS)
}

import {
  getAllowedTags,
  getContainerTags,
  copyAllowedBlockStyle,
  resolveBlockTypeForElement,
} from '../pipeline/blocks.js'
import { isSafeAttrValue } from '../pipeline/marks.js'
import { PARAGRAPH_BLOCK_TYPE } from '../schema/builtins.js'

/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

export { extractPasteHtml, extractPasteText } from '../pipeline/clipboard.js'

/**
 * @param {import('../../sdk/types.js').BlockDefinition | null | undefined} def
 * @param {string} attrName
 * @returns {boolean}
 */
function allowsBlobUrl(def, attrName) {
  return def?.tag === 'img' && attrName === 'src'
}

/**
 * @param {EditorRegistries} registries
 * @param {string} tag
 * @returns {boolean}
 */
function tagNeedsDataBlock(registries, tag) {
  let count = 0
  for (const def of registries.blocks.getAllBlocks()) {
    if (def.childOnly) continue
    if (def.parseTags.includes(tag)) {
      count += 1
      if (count > 1) return true
    }
  }
  return false
}

/**
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 * @param {EditorRegistries} registries
 */
function copyAllowedStyles(source, target, registries) {
  const tag = target.tagName.toLowerCase()

  for (const def of registries.marks.getAllMarks()) {
    if (!def.parseTags.includes(tag)) continue

    if (def.styleAttr) {
      const value = source.style.getPropertyValue(def.styleAttr).trim()
      if (value) {
        target.style.setProperty(def.styleAttr, value)
      }
    } else if (def.attrs?.length) {
      for (const attrName of def.attrs) {
        const value = source.getAttribute(attrName)
        if (value && isSafeAttrValue(attrName, value, { allowBlob: allowsBlobUrl(def, attrName) })) {
          target.setAttribute(attrName, value)
        }
      }
    }
  }
}

/**
 * Sanitizes a void block element, generically supporting `attrs` and an
 * optional caption — mirrors `parseVoidBlockElement` in pipeline/blocks.js,
 * but produces DOM (sanitizeHtml operates at the string/DOM level, ahead of
 * the actual DocNode parse).
 *
 * @param {HTMLElement} element
 * @param {string} tag
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
function sanitizeVoidBlockElement(element, tag, blockType, registries) {
  const def = registries.blocks.getBlockByType(blockType)
  if (!def) return document.createElement(tag)

  if (def.wrapperTag && tag === def.wrapperTag) {
    const wrapper = document.createElement(def.wrapperTag)
    const inner = document.createElement(def.tag)
    const source = element.querySelector(def.tag)

    if (source && def.attrs?.length) {
      for (const attrName of def.attrs) {
        const value = source.getAttribute(attrName)
        if (value && isSafeAttrValue(attrName, value, { allowBlob: allowsBlobUrl(def, attrName) })) {
          inner.setAttribute(attrName, value)
        }
      }
    }
    wrapper.appendChild(inner)

    if (def.captionTag) {
      const captionText = element.querySelector(def.captionTag)?.textContent?.trim()
      if (captionText) {
        const captionEl = document.createElement(def.captionTag)
        captionEl.textContent = captionText
        wrapper.appendChild(captionEl)
      }
    }

    return wrapper
  }

  const safe = document.createElement(tag)
  if (def.attrs?.length) {
    for (const attrName of def.attrs) {
      const value = element.getAttribute(attrName)
      if (value && isSafeAttrValue(attrName, value, { allowBlob: allowsBlobUrl(def, attrName) })) {
        safe.setAttribute(attrName, value)
      }
    }
  }
  return safe
}

/**
 * @param {HTMLElement} element
 * @param {Record<string, string> | undefined} values
 */
function applyFixedAttrs(element, values) {
  if (!values) return
  for (const [name, value] of Object.entries(values)) {
    if (isSafeAttrValue(name, value)) element.setAttribute(name, value)
  }
}

/**
 * Sanitizes a container block element (e.g. a task-list) by recursing only
 * into children that match the declared `childType`'s own tag — mirrors
 * `parseContainerBlockElement` in pipeline/blocks.js. Never touches the
 * shared `allowedTags`/`blocksByTag` dispatch, so it can't collide with
 * unrelated markup using the same tags.
 *
 * @param {HTMLElement} element
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
function sanitizeContainerBlockElement(element, blockType, registries) {
  const def = registries.blocks.getBlockByType(blockType)
  const safe = document.createElement(def?.tag ?? 'div')
  applyFixedAttrs(safe, def?.fixedAttrs)
  copyAllowedBlockStyle(element, safe)

  const childDef = def?.childType ? registries.blocks.getBlockByType(def.childType) : null
  if (!def || !childDef) return safe

  const allowedTags = getAllowedTags(registries)
  const containerTags = getContainerTags(registries)

  for (const child of element.children) {
    if (child.tagName.toLowerCase() !== childDef.tag) continue
    safe.appendChild(
      sanitizeChildBlockElement(
        /** @type {HTMLElement} */ (child),
        childDef,
        allowedTags,
        containerTags,
        registries,
      ),
    )
  }

  return safe
}

/**
 * @param {HTMLElement} element
 * @param {import('../../sdk/types.js').BlockDefinition} def
 * @param {Set<string>} allowedTags
 * @param {Set<string>} containerTags
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
function sanitizeChildBlockElement(element, def, allowedTags, containerTags, registries) {
  const safe = document.createElement(def.tag)
  applyFixedAttrs(safe, def.fixedAttrs)

  if (def.attrs?.length) {
    for (const attrName of def.attrs) {
      const value = element.getAttribute(attrName)
      if (value && isSafeAttrValue(attrName, value, { allowBlob: allowsBlobUrl(def, attrName) })) {
        safe.setAttribute(attrName, value)
      }
    }
  }

  copyAllowedBlockStyle(element, safe)

  const source = def.contentTag ? (element.querySelector(def.contentTag) ?? element) : element
  for (const child of source.childNodes) {
    appendSanitizedNode(safe, child, allowedTags, containerTags, registries)
  }

  return safe
}

/**
 * @param {string} html
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function sanitizeHtml(html, registries) {
  const trimmed = html.trim()
  if (!trimmed) return ''

  const allowedTags = getAllowedTags(registries)
  const containerTags = getContainerTags(registries)
  const parsed = new DOMParser().parseFromString(trimmed, 'text/html')
  const container = document.createElement('div')

  for (const child of parsed.body.childNodes) {
    appendSanitizedNode(container, child, allowedTags, containerTags, registries)
  }

  // Safe: this is the sanitizer's own output — `container` was built entirely
  // by `appendSanitizedNode` above (tag/attr allowlist + safe URL schemes),
  // so reading its `innerHTML` back out never reflects unsanitized input.
  return container.innerHTML
}

/**
 * @param {HTMLElement} parent
 * @param {Node} node
 * @param {Set<string>} allowedTags
 * @param {Set<string>} containerTags
 * @param {EditorRegistries} registries
 */
function appendSanitizedNode(parent, node, allowedTags, containerTags, registries) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Strip the zero-width space used internally as anchor content for
    // "empty" text nodes (see marks.js) so it never leaks into copied or
    // pasted text.
    const text = (node.textContent ?? '').replace(/\u200B/g, '')
    if (text) {
      parent.appendChild(document.createTextNode(text))
    }
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return

  const element = /** @type {HTMLElement} */ (node)
  const tag = element.tagName.toLowerCase()

  if (tag === 'br') {
    parent.appendChild(document.createElement('br'))
    return
  }

  const blockType = resolveBlockTypeForElement(element, registries)
  if (blockType && blockType !== PARAGRAPH_BLOCK_TYPE) {
    if (registries.blocks.isVoidBlock(blockType)) {
      parent.appendChild(sanitizeVoidBlockElement(element, tag, blockType, registries))
      return
    }

    if (registries.blocks.isContainerBlock(blockType)) {
      parent.appendChild(sanitizeContainerBlockElement(element, blockType, registries))
      return
    }

    const safe = document.createElement(tag)
    const dataBlock = element.getAttribute('data-block')
    const resolvedType =
      dataBlock && registries.blocks.getBlockByType(dataBlock) ? dataBlock : blockType
    const needsDataBlock =
      resolvedType === 'code-block' ||
      (dataBlock && registries.blocks.getBlockByType(dataBlock) !== null) ||
      (resolvedType !== tag && tagNeedsDataBlock(registries, tag))
    if (needsDataBlock) {
      safe.setAttribute('data-block', resolvedType)
    }
    copyAllowedBlockStyle(element, safe)
    for (const child of element.childNodes) {
      appendSanitizedNode(safe, child, allowedTags, containerTags, registries)
    }
    parent.appendChild(safe)
    return
  }

  if (!allowedTags.has(tag)) {
    if (containerTags.has(tag) && parent.tagName.toLowerCase() !== 'p') {
      const paragraph = document.createElement('p')
      for (const child of element.childNodes) {
        appendSanitizedNode(paragraph, child, allowedTags, containerTags, registries)
      }
      if (paragraph.textContent) {
        parent.appendChild(paragraph)
      }
      return
    }

    for (const child of element.childNodes) {
      appendSanitizedNode(parent, child, allowedTags, containerTags, registries)
    }
    return
  }

  const safe = document.createElement(tag)
  copyAllowedStyles(element, safe, registries)
  if (resolveBlockTypeForElement(element, registries)) {
    copyAllowedBlockStyle(element, safe)
  }
  for (const child of element.childNodes) {
    appendSanitizedNode(safe, child, allowedTags, containerTags, registries)
  }
  parent.appendChild(safe)
}

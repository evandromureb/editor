/** @typedef {import('../document/types.js').BlockNode} BlockNode */
/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../document/types.js').ParagraphNode} ParagraphNode */
/** @typedef {import('../document/types.js').TextNode} TextNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { docNode, paragraphNode, textNode } from '../document/nodes.js'
import { PARAGRAPH_BLOCK_TYPE } from '../schema/builtins.js'
import { appendBlockTextContent, isSafeAttrValue, wrapHtmlWithMarks } from './marks.js'
import { appendCodeBlockContent } from './code-block-render.js'

/**
 * @param {HTMLElement} element
 * @param {EditorRegistries} registries
 * @param {string[]} inheritedMarks
 * @param {Record<string, string>} inheritedAttrs
 * @returns {{ marks: string[], markAttrs: Record<string, string> }}
 */
function resolveElementMarks(element, registries, inheritedMarks, inheritedAttrs) {
  let marks = [...inheritedMarks]
  const markAttrs = { ...inheritedAttrs }
  const tag = element.tagName.toLowerCase()

  const tagMark = registries.marks.getMarkByTag(tag)
  if (tagMark) {
    const def = registries.marks.getMarkByName(tagMark)
    if (def && !def.styleAttr) {
      marks = [...new Set([...marks, tagMark])]

      if (def.attrs?.length) {
        /** @type {Record<string, string>} */
        const values = {}
        for (const attrName of def.attrs) {
          const value = element.getAttribute(attrName)
          if (value) values[attrName] = value
        }
        if (Object.keys(values).length) markAttrs[tagMark] = JSON.stringify(values)
      }
    }
  }

  for (const def of registries.marks.getAllMarks()) {
    if (!def.styleAttr || !def.parseTags.includes(tag)) continue

    const value = element.style.getPropertyValue(def.styleAttr).trim()
    if (!value) continue

    marks = [...new Set([...marks, def.name])]
    markAttrs[def.name] = value
  }

  return { marks, markAttrs }
}

/**
 * @param {EditorRegistries} registries
 * @returns {Set<string>}
 */
export function getAllowedTags(registries) {
  const tags = new Set(['br'])

  for (const def of registries.blocks.getAllBlocks()) {
    // Child-only and container blocks are only ever reached through their
    // container's dedicated parse/sanitize path (see parseContainerBlockElement
    // / sanitizeContainerBlockElement) — keeping their tags out of the
    // generic allowed-tags set means an unmatched/stray <ul> or <li> falls
    // through to the existing containerTags → <p> degradation instead of
    // being preserved verbatim or misparsed as a broken container.
    if (def.childOnly || def.isContainer) continue

    tags.add(def.tag)
    for (const tag of def.parseTags) {
      tags.add(tag)
    }
    if (def.captionTag) tags.add(def.captionTag)
    if (def.wrapperTag) tags.add(def.wrapperTag)
  }

  for (const def of registries.marks.getAllMarks()) {
    tags.add(def.tag)
    for (const tag of def.parseTags) {
      tags.add(tag)
    }
  }

  return tags
}

/**
 * @param {EditorRegistries} registries
 * @returns {Set<string>}
 */
export function getContainerTags(registries) {
  const paragraph = registries.blocks.getBlockByType(PARAGRAPH_BLOCK_TYPE)
  return new Set(paragraph?.containerTags ?? [])
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param {string} type
 * @returns {string}
 */
function escapeHtmlAttr(type) {
  return escapeHtml(type)
}

/**
 * @param {import('../../sdk/types.js').BlockDefinition | undefined | null} def
 * @param {string} attrName
 * @returns {boolean}
 */
function allowsBlobUrl(def, attrName) {
  return def?.tag === 'img' && attrName === 'src'
}

/**
 * @param {string[] | undefined} attrNames
 * @param {Record<string, string> | undefined} values
 * @param {{ allowBlob?: boolean }} [options]
 * @returns {string}
 */
function buildVoidAttrString(attrNames, values, options = {}) {
  if (!attrNames?.length || !values) return ''
  return attrNames
    .filter((name) => values[name] && isSafeAttrValue(name, values[name], options))
    .map((name) => `${name}="${escapeHtmlAttr(values[name])}"`)
    .join(' ')
}

/**
 * Generic per-block CSS style bag for non-void text blocks (paragraph,
 * heading-*, quote-*, etc.), mirroring the `attrs` mechanism void blocks
 * already have. Kept to a small whitelist of properties/validators since
 * this is parsed back out of arbitrary pasted HTML.
 */
const BLOCK_STYLE_VALIDATORS = {
  'text-align': (value) => ['left', 'center', 'right', 'justify'].includes(value),
  'margin-left': (value) => /^\d+px$/.test(value),
  // `disc`/`circle`/`square` and the ordered-list numbering keywords are
  // native keywords; a short quoted string (e.g. `"★"`) is also valid CSS —
  // used for custom bullet glyphs beyond the native keyword set. Kept short
  // and free of CSS-breakout characters since it's parsed back out of
  // arbitrary pasted HTML.
  'list-style-type': (value) =>
    ['disc', 'circle', 'square', 'lower-alpha', 'lower-greek', 'lower-roman', 'upper-alpha', 'upper-roman'].includes(
      value,
    ) || /^"[^"\\;{}<>]{1,4}"$/.test(value),
}

/**
 * @param {HTMLElement} element
 * @returns {Record<string, string> | undefined}
 */
function resolveBlockStyle(element) {
  /** @type {Record<string, string>} */
  const style = {}
  for (const [prop, isValid] of Object.entries(BLOCK_STYLE_VALIDATORS)) {
    const value = (element.style.getPropertyValue(prop) ?? '').trim()
    if (value && isValid(value)) style[prop] = value
  }
  return Object.keys(style).length ? style : undefined
}

/**
 * Applies the whitelisted style properties from `style` to `element`.
 *
 * @param {HTMLElement} element
 * @param {Record<string, string> | undefined} style
 */
export function applyAllowedBlockStyle(element, style) {
  for (const prop of Object.keys(BLOCK_STYLE_VALIDATORS)) {
    element.style.removeProperty(prop)
  }

  if (!style) return

  for (const [prop, value] of Object.entries(style)) {
    if (BLOCK_STYLE_VALIDATORS[prop]?.(value)) {
      element.style.setProperty(prop, value)
    }
  }
}

/**
 * Copies whitelisted block-level style properties from a source element to
 * a freshly-built one, mirroring how void blocks' `attrs` are copied during
 * sanitization (src/core/sanitize/sanitize.js).
 *
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 */
export function copyAllowedBlockStyle(source, target) {
  const style = resolveBlockStyle(source)
  applyAllowedBlockStyle(target, style)
}

/**
 * @param {Record<string, string> | undefined} style
 * @returns {string}
 */
function buildBlockStyleString(style) {
  if (!style) return ''
  return Object.entries(style)
    .filter(([prop, value]) => BLOCK_STYLE_VALIDATORS[prop]?.(value))
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ')
}

/**
 * @param {import('../schema/editor-registries.js').EditorRegistries} registries
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
 * @param {Record<string, string> | undefined} values
 * @param {{ allowBlob?: boolean }} [options]
 * @returns {string}
 */
function buildFixedAttrString(values, options = {}) {
  if (!values) return ''
  const parts = Object.entries(values)
    .filter(([name, value]) => isSafeAttrValue(name, value, options))
    .map(([name, value]) => `${name}="${escapeHtmlAttr(value)}"`)
  return parts.length ? ` ${parts.join(' ')}` : ''
}

/**
 * @param {import('../../sdk/types.js').BlockDefinition['leading']} leading
 * @returns {string}
 */
function buildLeadingHtml(leading) {
  if (!leading?.length) return ''
  return leading.map((el) => `<${el.tag}${buildFixedAttrString(el.fixedAttrs)}>`).join('')
}

/**
 * @param {string} tag
 * @param {string} blockType
 * @param {import('../schema/editor-registries.js').EditorRegistries} registries
 * @param {Record<string, string> | undefined} style
 * @param {string} [extraAttrString] pre-built ` name="value"` fragment (fixedAttrs + data-driven attrs)
 * @returns {string}
 */
function blockOpenTag(tag, blockType, registries, style, extraAttrString = '') {
  const styleString = buildBlockStyleString(style)
  const styleAttr = styleString ? ` style="${escapeHtmlAttr(styleString)}"` : ''

  if (blockType === PARAGRAPH_BLOCK_TYPE) {
    return `<${tag}${styleAttr}${extraAttrString}>`
  }
  const needsDataBlock =
    blockType === 'code-block' || (blockType !== tag && tagNeedsDataBlock(registries, tag))
  if (!needsDataBlock) {
    return `<${tag}${styleAttr}${extraAttrString}>`
  }
  return `<${tag} data-block="${escapeHtmlAttr(blockType)}"${styleAttr}${extraAttrString}>`
}

/**
 * @param {HTMLElement} element
 * @param {EditorRegistries} registries
 * @returns {string | null}
 */
export function resolveBlockTypeForElement(element, registries) {
  const tag = element.tagName.toLowerCase()
  const fromAttr = element.dataset.block

  if (fromAttr && registries.blocks.getBlockByType(fromAttr)?.childOnly !== true) {
    if (elementMatchesBlockType(element, fromAttr, registries)) {
      return fromAttr
    }
  }

  const candidates = registries.blocks
    .getAllBlocks()
    .filter((def) => !def.childOnly && def.parseTags.includes(tag))

  const matching = candidates.filter((def) => elementMatchesBlockType(element, def.type, registries))
  if (!matching.length) return null

  matching.sort((a, b) => {
    const aSpecific = a.fixedAttrs ? 1 : 0
    const bSpecific = b.fixedAttrs ? 1 : 0
    return bSpecific - aSpecific || (a.priority ?? 0) - (b.priority ?? 0)
  })

  return matching[0]?.type ?? null
}

/**
 * @param {Node} node
 * @param {EditorRegistries} registries
 * @param {string[]} inheritedMarks
 * @param {Record<string, string>} inheritedAttrs
 * @returns {TextNode[]}
 */
function parseInline(node, registries, inheritedMarks = [], inheritedAttrs = {}) {
  /** @type {TextNode[]} */
  const result = []

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\u00A0/g, ' ')
      if (text) {
        result.push(textNode(text, inheritedMarks, registries, inheritedAttrs))
      }
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = /** @type {HTMLElement} */ (child)
    const tag = element.tagName.toLowerCase()

    if (element.classList.contains('editor__code-gutter')) {
      continue
    }

    if (tag === 'br') {
      result.push(textNode('\n', inheritedMarks, registries, inheritedAttrs))
      continue
    }

    const { marks, markAttrs } = resolveElementMarks(
      element,
      registries,
      inheritedMarks,
      inheritedAttrs,
    )
    result.push(...parseInline(element, registries, marks, markAttrs))
  }

  return result
}

/**
 * @param {HTMLElement} element
 * @param {EditorRegistries} registries
 * @returns {ParagraphNode}
 */
function parseParagraphElement(element, registries) {
  const content = parseInline(element, registries)
  return paragraphNode(
    content.length ? content : [textNode('', [], registries)],
  )
}

/**
 * @param {EditorRegistries} registries
 * @param {TextNode[]} inlineBuffer
 * @returns {ParagraphNode | null}
 */
function flushInlineBuffer(registries, inlineBuffer) {
  if (!inlineBuffer.length) return null
  return paragraphNode(inlineBuffer, { implicit: true })
}

/**
 * @param {HTMLElement} body
 * @param {EditorRegistries} registries
 * @returns {BlockNode[]}
 */
export function parseBodyBlocks(body, registries) {
  /** @type {BlockNode[]} */
  const blocks = []
  /** @type {TextNode[]} */
  let inlineBuffer = []

  const flushInline = () => {
    const block = flushInlineBuffer(registries, inlineBuffer)
    if (block) blocks.push(block)
    inlineBuffer = []
  }

  for (const child of body.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (text) {
        inlineBuffer.push(textNode(text, [], registries))
      }
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = /** @type {HTMLElement} */ (child)
    const tag = element.tagName.toLowerCase()

    if (tag === 'br') {
      inlineBuffer.push(textNode('\n', [], registries))
      continue
    }

    const blockType = resolveBlockTypeForElement(element, registries)
    if (blockType) {
      flushInline()
      const block = parseBlockElement(element, registries)
      if (block) blocks.push(block)
      continue
    }

    inlineBuffer.push(...parseInline(element, registries))
  }

  flushInline()

  return blocks.length ? blocks : [paragraphNode([textNode('', [], registries)])]
}

/**
 * Container/child-only blocks (e.g. task-list) carry a `fixedAttrs` marker
 * (e.g. `data-task-list="true"`) that must be present on the element for the
 * tag→type match to count — otherwise an unrelated `<ul>`/`<li>` pasted from
 * elsewhere would be misparsed as a broken instance of our block.
 *
 * @param {HTMLElement} element
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {boolean}
 */
export function elementMatchesBlockType(element, blockType, registries) {
  const def = registries.blocks.getBlockByType(blockType)
  if (!def?.fixedAttrs) return true
  return Object.entries(def.fixedAttrs).every(
    ([name, value]) => element.getAttribute(name) === value,
  )
}

/**
 * @param {HTMLElement} element
 * @param {EditorRegistries} registries
 * @returns {BlockNode | null}
 */
function parseBlockElement(element, registries) {
  const blockType = resolveBlockTypeForElement(element, registries)
  const tag = element.tagName.toLowerCase()

  if (!blockType) return null

  if (registries.blocks.isVoidBlock(blockType)) {
    return parseVoidBlockElement(element, tag, blockType, registries)
  }

  if (registries.blocks.isContainerBlock(blockType)) {
    return parseContainerBlockElement(element, blockType, registries)
  }

  return parseNonVoidBlockElement(element, blockType, registries)
}

/**
 * Parses a non-void block element generically, supporting `style`,
 * data-driven `attrs`, and an optional `contentTag` wrapping the inline
 * content (used both for root-level blocks and for a container's children).
 *
 * @param {HTMLElement} element
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {import('../document/types.js').TextBlockNode}
 */
function parseNonVoidBlockElement(element, blockType, registries) {
  const def = registries.blocks.getBlockByType(blockType)
  const contentSource = def?.contentTag ? (element.querySelector(def.contentTag) ?? element) : element
  const content = parseInline(contentSource, registries)
  const style = resolveBlockStyle(element)
  const attrs = readNonVoidAttrs(element, def)
  return /** @type {import('../document/types.js').TextBlockNode} */ ({
    type: blockType,
    content: content.length ? content : [textNode('', [], registries)],
    ...(style ? { style } : {}),
    ...(attrs ? { attrs } : {}),
  })
}

/**
 * @param {HTMLElement} element
 * @param {import('../../sdk/types.js').BlockDefinition | null} def
 * @returns {Record<string, string> | undefined}
 */
function readNonVoidAttrs(element, def) {
  if (!def?.attrs?.length) return undefined
  /** @type {Record<string, string>} */
  const values = {}
  for (const name of def.attrs) {
    const value = element.getAttribute(name) ?? def.attrDefaults?.[name]
    if (value) values[name] = value
  }
  return Object.keys(values).length ? values : undefined
}

/**
 * Parses a container block element by iterating its children matching the
 * declared `childType`'s own tag — deliberately NOT via the global
 * `getBlockByTag` dispatch (see `elementMatchesBlockType`/child-only
 * registration), so unrelated child-shaped elements never collide.
 *
 * @param {HTMLElement} element
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {import('../document/types.js').ContainerBlockNode}
 */
function parseContainerBlockElement(element, blockType, registries) {
  const def = registries.blocks.getBlockByType(blockType)
  const childDef = def?.childType ? registries.blocks.getBlockByType(def.childType) : null

  if (!def || !childDef) return { type: blockType, children: [] }

  /** @type {BlockNode[]} */
  const children = []
  for (const child of element.children) {
    if (child.tagName.toLowerCase() !== childDef.tag) continue
    children.push(parseNonVoidBlockElement(/** @type {HTMLElement} */ (child), def.childType, registries))
  }

  const style = resolveBlockStyle(element)

  return {
    type: blockType,
    children: children.length
      ? children
      : [parseNonVoidBlockElement(document.createElement(childDef.tag), def.childType, registries)],
    ...(style ? { style } : {}),
  }
}

/**
 * Parses a void block element, generically supporting `attrs` (real HTML
 * attributes on the block's own tag) and an optional caption. When the
 * matched tag is the block's `wrapperTag` (e.g. `<figure>`), the primary tag
 * and caption tag are looked up among its children instead.
 *
 * @param {HTMLElement} element
 * @param {string} tag
 * @param {string} blockType
 * @param {EditorRegistries} registries
 * @returns {BlockNode}
 */
function parseVoidBlockElement(element, tag, blockType, registries) {
  /** @type {BlockNode} */
  const block = { type: blockType }

  const def = registries.blocks.getBlockByType(blockType)
  if (!def) return block

  let source = element

  if (def.wrapperTag && tag === def.wrapperTag) {
    source = element.querySelector(def.tag) ?? element
    if (def.captionTag) {
      const captionEl = element.querySelector(def.captionTag)
      const captionText = captionEl?.textContent?.trim()
      if (captionText) block.caption = captionText
    }
  }

  if (def.attrs?.length) {
    /** @type {Record<string, string>} */
    const values = {}
    for (const attrName of def.attrs) {
      const value = source.getAttribute?.(attrName)
      if (value) values[attrName] = value
    }
    if (Object.keys(values).length) block.attrs = values
  }

  return block
}

/**
 * @param {HTMLElement} body
 * @param {EditorRegistries} registries
 * @returns {DocNode}
 */
export function parseDocumentBody(body, registries) {
  return docNode(parseBodyBlocks(body, registries))
}

/**
 * @param {TextNode} node
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function serializeTextNode(node, registries) {
  const parts = node.text.split('\n')

  return parts
    .map((part, index) => {
      const html = wrapHtmlWithMarks(
        escapeHtml(part),
        node.marks ?? [],
        registries,
        node.markAttrs ?? {},
      )
      return index > 0 ? `<br>${html}` : html
    })
    .join('')
}

/**
 * @param {BlockNode} block
 * @param {import('../../sdk/types.js').BlockDefinition} def
 * @returns {string}
 */
function serializeVoidBlock(block, def) {
  const attrString = buildVoidAttrString(def.attrs, /** @type {any} */ (block).attrs, {
    allowBlob: allowsBlobUrl(def, 'src'),
  })
  const tagHtml = attrString ? `<${def.tag} ${attrString}>` : `<${def.tag}>`

  const caption = /** @type {any} */ (block).caption
  if (def.wrapperTag && def.captionTag && caption) {
    return `<${def.wrapperTag}>${tagHtml}<${def.captionTag}>${escapeHtml(caption)}</${def.captionTag}></${def.wrapperTag}>`
  }

  return tagHtml
}

/**
 * @param {BlockNode} block
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function serializeBlock(block, registries) {
  if (registries.blocks.isVoidBlock(block.type)) {
    const def = registries.blocks.getBlockByType(block.type)
    return def ? serializeVoidBlock(block, def) : ''
  }

  if (registries.blocks.isContainerBlock(block.type)) {
    return serializeContainerBlock(
      /** @type {import('../document/types.js').ContainerBlockNode} */ (block),
      registries,
    )
  }

  // Any registered non-void block (paragraph, heading-*, task-item, etc.)
  const def = registries.blocks.getBlockByType(block.type)
  if (def && !def.void && 'content' in block) {
    return serializeNonVoidBlock(
      /** @type {import('../document/types.js').TextBlockNode} */ (block),
      def,
      registries,
    )
  }

  return ''
}

/**
 * @param {import('../document/types.js').TextBlockNode} textBlock
 * @param {import('../../sdk/types.js').BlockDefinition} def
 * @param {EditorRegistries} registries
 * @returns {string}
 */
function serializeNonVoidBlock(textBlock, def, registries) {
  const inner = textBlock.content.map((node) => serializeTextNode(node, registries)).join('')
  if (textBlock.implicit) {
    return inner
  }

  const tag = def.tag
  const allowBlob = allowsBlobUrl(def, 'src')
  const attrString = buildVoidAttrString(def.attrs, /** @type {any} */ (textBlock).attrs, {
    allowBlob,
  })
  const extraAttrString = `${buildFixedAttrString(def.fixedAttrs, { allowBlob })}${attrString ? ` ${attrString}` : ''}`
  const open = blockOpenTag(tag, textBlock.type, registries, textBlock.style, extraAttrString)
  const leadingHtml = buildLeadingHtml(def.leading)
  const contentHtml = def.contentTag
    ? `<${def.contentTag}${buildFixedAttrString(def.contentAttrs)}>${inner}</${def.contentTag}>`
    : inner

  return `${open}${leadingHtml}${contentHtml}</${tag}>`
}

/**
 * @param {import('../document/types.js').ContainerBlockNode} containerBlock
 * @param {EditorRegistries} registries
 * @returns {string}
 */
function serializeContainerBlock(containerBlock, registries) {
  const def = registries.blocks.getBlockByType(containerBlock.type)
  if (!def) return ''

  const tag = def.tag
  const styleString = buildBlockStyleString(containerBlock.style)
  const styleAttr = styleString ? ` style="${escapeHtmlAttr(styleString)}"` : ''
  const open = `<${tag}${styleAttr}${buildFixedAttrString(def.fixedAttrs)}>`
  const inner = containerBlock.children.map((child) => serializeBlock(child, registries)).join('')
  return `${open}${inner}</${tag}>`
}

/**
 * @param {DocNode} docNode
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function serializeDocument(docNode, registries) {
  return docNode.content.map((block) => serializeBlock(block, registries)).join('')
}

/**
 * @param {BlockNode} block
 * @returns {string}
 */
export function blockSignature(block) {
  return JSON.stringify(block)
}

/**
 * Shallow signature for a container block's own root-level diff entry —
 * intentionally excludes `children` (see the comment at its call site in
 * createContainerBlockElement / renderer.js).
 *
 * @param {string} blockType
 * @returns {string}
 */
export function containerSignature(blockType) {
  return JSON.stringify({ type: blockType })
}

/**
 * Builds the live editable DOM for a void block: its own tag with `attrs`
 * applied, optionally wrapped with a caption element. The outer element
 * (wrapper when present) is the one appended directly to the surface, so it
 * carries the `data-block*` bookkeeping attributes the renderer/cursor code
 * relies on. `contentEditable="false"` marks it as an atomic island — its
 * data is only ever changed by commands, never by direct typing.
 *
 * @param {BlockNode} block
 * @param {number} index
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
function createVoidBlockElement(block, index, registries) {
  const def = registries.blocks.getBlockByType(block.type)
  const inner = document.createElement(def?.tag ?? 'div')
  const allowBlob = allowsBlobUrl(def, 'src')

  if (def?.attrs?.length) {
    const values = /** @type {any} */ (block).attrs
    if (values) {
      for (const name of def.attrs) {
        const value = values[name]
        if (value && isSafeAttrValue(name, value, { allowBlob })) inner.setAttribute(name, value)
      }
    }
  }

  let element = inner
  const caption = /** @type {any} */ (block).caption

  if (def?.wrapperTag && def?.captionTag && caption) {
    const wrapper = document.createElement(def.wrapperTag)
    wrapper.appendChild(inner)
    const captionEl = document.createElement(def.captionTag)
    captionEl.textContent = caption
    wrapper.appendChild(captionEl)
    element = wrapper
  }

  element.setAttribute('contenteditable', 'false')
  element.dataset.block = block.type
  element.dataset.blockIndex = String(index)
  element.dataset.blockSig = blockSignature(block)
  return element
}

/**
 * @param {BlockNode} block
 * @param {number} index
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
export function createBlockElement(block, index, registries) {
  if (registries.blocks.isVoidBlock(block.type)) {
    return createVoidBlockElement(block, index, registries)
  }

  if (registries.blocks.isContainerBlock(block.type)) {
    return createContainerBlockElement(
      /** @type {import('../document/types.js').ContainerBlockNode} */ (block),
      index,
      registries,
    )
  }

  return createNonVoidBlockElement(block, registries, { blockIndex: index })
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
 * @param {HTMLElement} element
 * @param {string[] | undefined} attrNames
 * @param {Record<string, string> | undefined} values
 */
function applyDataDrivenAttrs(element, attrNames, values) {
  if (!attrNames?.length || !values) return
  const allowBlob = element.tagName.toLowerCase() === 'img'
  for (const name of attrNames) {
    const value = values[name]
    if (value && isSafeAttrValue(name, value, { allowBlob })) element.setAttribute(name, value)
  }
}

/**
 * Builds the live editable DOM for a non-void block, generically supporting
 * `style`, data-driven `attrs`, `leading` decorative elements, and an
 * optional `contentTag` wrapping the editable inline content. Used both for
 * root-level blocks (`blockIndex` set, stamped `data-block-index`) and for a
 * container's children (`childIndex` set, stamped `data-child-index`).
 *
 * @param {BlockNode} block
 * @param {EditorRegistries} registries
 * @param {{ blockIndex?: number, childIndex?: number }} indexing
 * @returns {HTMLElement}
 */
function createNonVoidBlockElement(block, registries, { blockIndex, childIndex } = {}) {
  const def = registries.blocks.getBlockByType(block.type)
  const element = document.createElement(def?.tag ?? 'p')
  element.dataset.block = block.type
  if (blockIndex !== undefined) element.dataset.blockIndex = String(blockIndex)
  if (childIndex !== undefined) element.dataset.childIndex = String(childIndex)
  element.dataset.blockSig = blockSignature(block)

  applyFixedAttrs(element, def?.fixedAttrs)
  applyDataDrivenAttrs(element, def?.attrs, /** @type {any} */ (block).attrs)

  const style = /** @type {any} */ (block).style
  if (style) {
    for (const [prop, value] of Object.entries(style)) {
      if (BLOCK_STYLE_VALIDATORS[prop]?.(value)) element.style.setProperty(prop, value)
    }
  }

  for (const leadingDef of def?.leading ?? []) {
    const leadingEl = document.createElement(leadingDef.tag)
    applyFixedAttrs(leadingEl, leadingDef.fixedAttrs)
    element.appendChild(leadingEl)
  }

  if ('content' in block) {
    const textBlock = /** @type {import('../document/types.js').TextBlockNode} */ (block)
    if (textBlock.implicit) {
      element.dataset.implicit = 'true'
    }

    const contentTarget = def?.contentTag ? document.createElement(def.contentTag) : element
    if (def?.contentTag) applyFixedAttrs(contentTarget, def.contentAttrs)

    if (block.type === 'code-block') {
      appendCodeBlockContent(contentTarget, textBlock.content, registries, appendBlockTextContent)
    } else {
      appendBlockTextContent(contentTarget, textBlock.content, registries)
    }

    if (def?.contentTag) element.appendChild(contentTarget)
  }

  return element
}

/**
 * @param {BlockNode} block
 * @param {number} childIndex
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
export function createChildBlockElement(block, childIndex, registries) {
  return createNonVoidBlockElement(block, registries, { childIndex })
}

/**
 * @param {import('../document/types.js').ContainerBlockNode} containerBlock
 * @param {number} index
 * @param {EditorRegistries} registries
 * @returns {HTMLElement}
 */
function createContainerBlockElement(containerBlock, index, registries) {
  const def = registries.blocks.getBlockByType(containerBlock.type)
  const element = document.createElement(def?.tag ?? 'div')
  element.dataset.block = containerBlock.type
  element.dataset.blockIndex = String(index)
  // Shallow signature (type only, not full JSON.stringify like other
  // blocks) — a container's children change on every keystroke inside any
  // item, and the root-level diff must NOT wholesale-replace this element
  // (and its whole child subtree, stealing focus/breaking IME composition)
  // every time. Per-child diffing (see renderer.js) handles item updates.
  element.dataset.blockSig = containerSignature(containerBlock.type)
  applyFixedAttrs(element, def?.fixedAttrs)
  applyAllowedBlockStyle(element, /** @type {any} */ (containerBlock).style)

  containerBlock.children.forEach((child, childIndex) => {
    element.appendChild(createChildBlockElement(child, childIndex, registries))
  })

  return element
}

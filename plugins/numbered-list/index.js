import { definePlugin, block, toolbarItem, command } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const NUMBERED_LIST_TYPE = 'numbered-list'
const NUMBERED_LIST_ITEM_TYPE = 'numbered-list-item'

const LIST_STYLES = ['default', 'lower-alpha', 'lower-greek', 'lower-roman', 'upper-alpha', 'upper-roman']

/** @type {Record<string, string[]>} */
const PREVIEW_MARKERS = {
  default: ['1.', '2.', '3.'],
  'lower-alpha': ['a.', 'b.', 'c.'],
  'lower-greek': ['α.', 'β.', 'γ.'],
  'lower-roman': ['i.', 'ii.', 'iii.'],
  'upper-alpha': ['A.', 'B.', 'C.'],
  'upper-roman': ['I.', 'II.', 'III.'],
}

/**
 * @param {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'} style
 * @returns {string | undefined}
 */
function styleToCssValue(style) {
  if (style === 'default') return undefined
  return style
}

const INDENT_STEP = 40
const MAX_INDENT_LEVEL = 2
// Marker shown at each indent level, mirroring the classic outline numbering
// convention (1. / a. / i.) so deeper items read as sub-levels regardless of
// the list's own chosen style. Level 0 has no override — it inherits the
// container's style.
const LEVEL_MARKERS = [null, 'lower-alpha', 'lower-roman']

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list-ol" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5"/><path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635z"/></svg>'

/** @type {HTMLButtonElement | null} */
let buttonEl = null

/** @type {{ close: () => void, destroy: () => void } | null} */
let popoverApi = null

/** @type {HTMLDivElement | null} */
let popoverEl = null

/** @type {Map<string, HTMLButtonElement>} */
let optionButtons = new Map()

/** @type {(() => void) | null} */
let unsubscribe = null

/**
 * Normalizes either a style *key* (as picked from the popover, e.g. `'lower-alpha'`)
 * or a raw `list-style-type` CSS value read back from the document to one of
 * the six style keys.
 *
 * @param {unknown} value
 * @returns {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'}
 */
function normalizeStyle(value) {
  if (LIST_STYLES.includes(/** @type {any} */ (value))) return /** @type {any} */ (value)
  return 'default'
}

/**
 * A block can become a numbered-list (or have its numbered-list style
 * changed) when it either already is a numbered-list or is a plain text
 * block (has an inline `content` array) — container/void blocks like
 * task-list, image or hr are left alone.
 *
 * @param {import('@baselab/plugin-sdk').BlockNode | undefined} block
 * @returns {boolean}
 */
function isApplicableBlock(block) {
  if (!block) return false
  if (block.type === NUMBERED_LIST_TYPE) return true
  return Array.isArray(/** @type {any} */ (block).content)
}

/**
 * @param {import('@baselab/plugin-sdk').DocNode} doc
 * @param {import('@baselab/plugin-sdk').EditorSelection} selection
 * @returns {import('@baselab/plugin-sdk').BlockNode[]}
 */
function getSelectedBlocks(doc, selection) {
  const from = Math.min(selection.anchor.block, selection.focus.block)
  const to = Math.max(selection.anchor.block, selection.focus.block)
  return doc.content.slice(from, to + 1)
}

/**
 * @param {PluginContext} ctx
 * @returns {{ inList: boolean, canApply: boolean, style: 'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman' }}
 */
function getActiveListState(ctx) {
  const { doc, selection } = ctx.getState()
  const blocks = getSelectedBlocks(doc, selection)
  const canApply = blocks.length > 0 && blocks.every(isApplicableBlock)

  const allLists = blocks.length > 0 && blocks.every((b) => b.type === NUMBERED_LIST_TYPE)
  if (!allLists) {
    return { inList: false, canApply, style: 'default' }
  }

  const styles = blocks.map((b) => normalizeStyle(/** @type {any} */ (b).style?.['list-style-type']))
  const uniform = styles.every((s) => s === styles[0])
  if (!uniform) {
    return { inList: false, canApply, style: 'default' }
  }

  return { inList: true, canApply, style: styles[0] }
}

/**
 * @param {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'} style
 * @returns {HTMLElement}
 */
function buildPreviewSample(style) {
  const preview = document.createElement('div')
  preview.className = 'editor__numbered-list-preview'

  const markers = PREVIEW_MARKERS[style]
  for (let i = 0; i < 3; i += 1) {
    const row = document.createElement('div')
    row.className = 'editor__numbered-list-preview-row'

    const marker = document.createElement('span')
    marker.className = 'editor__numbered-list-preview-marker'
    marker.textContent = markers[i]

    const bar = document.createElement('span')
    bar.className = 'editor__numbered-list-preview-bar'

    row.appendChild(marker)
    row.appendChild(bar)
    preview.appendChild(row)
  }

  return preview
}

/**
 * @param {PluginContext} ctx
 * @param {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'} style
 * @param {boolean} disabled
 * @param {boolean} active
 * @returns {HTMLButtonElement}
 */
function buildOptionButton(ctx, style, disabled, active) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'editor__numbered-list-option'
  button.disabled = disabled
  button.classList.toggle('is-active', active)
  button.dataset.style = style

  const label = ctx.t(`numbered-list.${style}`)
  button.title = label
  button.setAttribute('aria-label', label)

  const preview = buildPreviewSample(style)
  const caption = document.createElement('span')
  caption.className = 'editor__numbered-list-option-label'
  caption.textContent = label

  button.appendChild(preview)
  button.appendChild(caption)

  button.addEventListener('click', () => {
    if (button.disabled) return
    ctx.execCommand('numbered-list.setStyle', style)
    closePopover()
  })

  return button
}

/**
 * @param {PluginContext} ctx
 */
function syncToolbarState(ctx) {
  if (!buttonEl) return

  const { inList, canApply, style: activeStyle } = getActiveListState(ctx)
  buttonEl.classList.toggle('is-active', inList)
  buttonEl.setAttribute('aria-expanded', popoverApi ? 'true' : 'false')

  if (!popoverEl) return

  for (const [styleName, button] of optionButtons.entries()) {
    button.disabled = !canApply
    button.classList.toggle('is-active', inList && styleName === activeStyle)
  }
}

/**
 * Closes the popover and clears the cached references.
 */
function closePopover() {
  const api = popoverApi
  popoverApi = null
  popoverEl = null
  optionButtons = new Map()
  if (buttonEl) {
    buttonEl.setAttribute('aria-expanded', 'false')
  }
  api?.close()
}

/**
 * @param {PluginContext} ctx
 */
function togglePopover(ctx) {
  if (popoverApi) {
    closePopover()
    return
  }

  if (!buttonEl) return

  const { inList, canApply, style: activeStyle } = getActiveListState(ctx)

  popoverEl = document.createElement('div')
  popoverEl.className = 'editor__numbered-list-popover'

  optionButtons = new Map()
  for (const style of LIST_STYLES) {
    const option = buildOptionButton(ctx, style, !canApply, inList && style === activeStyle)
    optionButtons.set(style, option)
    popoverEl.appendChild(option)
  }

  popoverApi = ctx.ui.createPopover({
    id: 'numbered-list-popover',
    anchor: buttonEl,
    content: popoverEl,
    onClose: () => {
      popoverApi = null
      popoverEl = null
      optionButtons = new Map()
    },
  })

  popoverApi.open()
  syncToolbarState(ctx)
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountNumberedListButton(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__numbered-list'

  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'numbered-list',
      label: 'numbered-list.button',
      title: 'numbered-list.button',
      icon: ICON,
      onClick: () => togglePopover(ctx),
    })
  )

  wrapper.appendChild(buttonEl)

  wrapper.sync = () => {
    if (buttonEl?.isConnected) {
      syncToolbarState(ctx)
    }
  }

  wrapper.destroy = () => {
    closePopover()
    buttonEl = null
  }

  wrapper.relocalize = () => {
    if (!buttonEl) return
    const title = ctx.t('numbered-list.button')
    buttonEl.title = title
    buttonEl.setAttribute('aria-label', title)
    syncToolbarState(ctx)
  }

  syncToolbarState(ctx)
  return wrapper
}

/**
 * @param {PluginContext} ctx
 * @returns {boolean}
 */
function isInNumberedList(ctx) {
  return getActiveListState(ctx).inList
}

/**
 * @param {import('@baselab/plugin-sdk').BlockNode} block
 * @param {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'} style
 * @returns {import('@baselab/plugin-sdk').BlockNode}
 */
function restyleListBlock(block, style) {
  const cssValue = styleToCssValue(style)
  if (cssValue === undefined) {
    const { style: _omit, ...rest } = /** @type {any} */ (block)
    return /** @type {any} */ (rest)
  }

  return /** @type {any} */ ({
    ...block,
    style: { ...(/** @type {any} */ (block).style ?? {}), 'list-style-type': cssValue },
  })
}

/**
 * Applies `style` to every applicable block in the current selection range.
 * Existing numbered-lists are restyled in place; contiguous plain text
 * blocks (paragraphs, headings, ...) are merged into a single new
 * numbered-list with one item per block — mirrors how Word/Docs turn a
 * multi-line selection into one list. Blocks are never restructured across
 * a list boundary.
 *
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {'default' | 'lower-alpha' | 'lower-greek' | 'lower-roman' | 'upper-alpha' | 'upper-roman'} style
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function setListStyle(state, style) {
  const { doc, selection } = state
  const from = Math.min(selection.anchor.block, selection.focus.block)
  const to = Math.max(selection.anchor.block, selection.focus.block)

  const selected = doc.content.slice(from, to + 1)
  if (!selected.length || !selected.every(isApplicableBlock)) return state

  /** @type {import('@baselab/plugin-sdk').BlockNode[]} */
  const result = []
  let i = 0
  while (i < selected.length) {
    const current = selected[i]
    if (current.type === NUMBERED_LIST_TYPE) {
      result.push(restyleListBlock(current, style))
      i += 1
      continue
    }

    /** @type {any[]} */
    const items = []
    while (i < selected.length && selected[i].type !== NUMBERED_LIST_TYPE) {
      items.push({ type: NUMBERED_LIST_ITEM_TYPE, content: /** @type {any} */ (selected[i]).content })
      i += 1
    }
    const cssValue = styleToCssValue(style)
    result.push(/** @type {any} */ ({
      type: NUMBERED_LIST_TYPE,
      ...(cssValue !== undefined ? { style: { 'list-style-type': cssValue } } : {}),
      children: items,
    }))
  }

  return {
    ...state,
    doc: {
      ...doc,
      content: [...doc.content.slice(0, from), ...result, ...doc.content.slice(to + 1)],
    },
  }
}

/**
 * @param {Record<string, string> | undefined} style
 * @returns {number}
 */
function getIndentLevel(style) {
  const margin = Number.parseInt(style?.['margin-left'] ?? '', 10) || 0
  return Math.round(margin / INDENT_STEP)
}

/**
 * @param {number} level
 * @returns {Record<string, string>}
 */
function buildLevelStyle(level) {
  /** @type {Record<string, string>} */
  const style = {}
  if (level > 0) style['margin-left'] = `${level * INDENT_STEP}px`
  const marker = LEVEL_MARKERS[level]
  if (marker) style['list-style-type'] = marker
  return style
}

/**
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {(level: number) => number} transformLevel
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function withIndentLevel(state, transformLevel) {
  const { doc, selection } = state
  const pos = selection.anchor
  if (pos.childIndex == null) return state

  const container = doc.content[pos.block]
  if (!container || container.type !== NUMBERED_LIST_TYPE) return state

  const children = /** @type {any} */ (container).children ?? []
  const child = children[pos.childIndex]
  if (!child) return state

  const nextLevel = Math.max(0, Math.min(transformLevel(getIndentLevel(child.style)), MAX_INDENT_LEVEL))
  const nextStyle = buildLevelStyle(nextLevel)

  const nextChild = Object.keys(nextStyle).length
    ? { ...child, style: nextStyle }
    : (() => {
        const { style: _omit, ...rest } = child
        return rest
      })()

  const nextChildren = children.map((item, index) => (index === pos.childIndex ? nextChild : item))

  return {
    ...state,
    doc: {
      ...doc,
      content: doc.content.map((item, index) =>
        index === pos.block ? { ...container, children: nextChildren } : item,
      ),
    },
  }
}

/** @param {import('@baselab/plugin-sdk').EditorState} state */
function indentNumberedItem(state) {
  return withIndentLevel(state, (level) => level + 1)
}

/** @param {import('@baselab/plugin-sdk').EditorState} state */
function outdentNumberedItem(state) {
  return withIndentLevel(state, (level) => level - 1)
}

export default definePlugin({
  id: 'numbered-list',
  name: 'Numbered List',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block(NUMBERED_LIST_TYPE, {
        tag: 'ol',
        isContainer: true,
        childType: NUMBERED_LIST_ITEM_TYPE,
      }),
      block(NUMBERED_LIST_ITEM_TYPE, {
        tag: 'li',
        childOnly: true,
        tabCommand: 'numbered-list.indent',
        shiftTabCommand: 'numbered-list.outdent',
      }),
    ],
    commands: {
      'numbered-list.setStyle': command((state, _registries, payload) => {
        const style = normalizeStyle(payload)
        return setListStyle(state, style)
      }),
      'numbered-list.indent': command((state) => indentNumberedItem(state)),
      'numbered-list.outdent': command((state) => outdentNumberedItem(state)),
    },
    toolbar: [
      toolbarItem({
        id: 'numbered-list',
        label: 'numbered-list.button',
        title: 'numbered-list.button',
        group: 'format',
        order: 51,
        render: mountNumberedListButton,
        isActive: (ctx) => isInNumberedList(ctx),
      }),
    ],
  },

  activate(ctx) {
    unsubscribe = ctx.subscribe(() => syncToolbarState(ctx))
  },

  deactivate() {
    unsubscribe?.()
    unsubscribe = null
    closePopover()
    buttonEl = null
  },
})

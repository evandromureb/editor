import { definePlugin, block, toolbarItem, command } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const BULLET_LIST_TYPE = 'bullet-list'
const BULLET_LIST_ITEM_TYPE = 'bullet-list-item'

const LIST_STYLES = ['default', 'star', 'circle', 'square']

// A quoted CSS string is a valid `list-style-type` value (renders literally,
// no counter) — used here so "Estrela" reads as a distinct marker instead of
// duplicating the browser's own disc/circle/square keywords. The trailing
// space matches the gap the native keyword markers get for free.
const STAR_MARKER = '"★ "'

/**
 * @param {'default' | 'star' | 'circle' | 'square'} style
 * @returns {string | undefined}
 */
function styleToCssValue(style) {
  if (style === 'default') return undefined
  if (style === 'star') return STAR_MARKER
  return style
}

const INDENT_STEP = 40
const MAX_INDENT_LEVEL = 2
// Marker shown at each indent level, mirroring the browser's own default
// nested-<ul> cycle (disc, circle, square) so deeper items read as
// sub-bullets regardless of the list's own chosen style. Level 0 has no
// override — it inherits the container's style.
const LEVEL_MARKERS = [null, 'circle', 'square']

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list-ul" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/></svg>'

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
 * Normalizes either a style *key* (as picked from the popover, e.g. `'star'`)
 * or a raw `list-style-type` CSS value read back from the document (e.g.
 * `'"★ "'` or `'circle'`) to one of the four style keys.
 *
 * @param {unknown} value
 * @returns {'default' | 'star' | 'circle' | 'square'}
 */
function normalizeStyle(value) {
  if (value === STAR_MARKER || value === 'star') return 'star'
  if (value === 'circle' || value === 'square') return /** @type {any} */ (value)
  return 'default'
}

/**
 * A block can become a bullet-list (or have its bullet-list style changed)
 * when it either already is a bullet-list or is a plain text block (has an
 * inline `content` array) — container/void blocks like task-list, image or
 * hr are left alone.
 *
 * @param {import('@baselab/plugin-sdk').BlockNode | undefined} block
 * @returns {boolean}
 */
function isApplicableBlock(block) {
  if (!block) return false
  if (block.type === BULLET_LIST_TYPE) return true
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
 * @returns {{ inList: boolean, canApply: boolean, style: 'default' | 'star' | 'circle' | 'square' }}
 */
function getActiveListState(ctx) {
  const { doc, selection } = ctx.getState()
  const blocks = getSelectedBlocks(doc, selection)
  const canApply = blocks.length > 0 && blocks.every(isApplicableBlock)

  const allLists = blocks.length > 0 && blocks.every((b) => b.type === BULLET_LIST_TYPE)
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
 * @param {'default' | 'star' | 'circle' | 'square'} style
 * @returns {HTMLElement}
 */
function buildPreviewSample(style) {
  const preview = document.createElement('div')
  preview.className = 'editor__bullet-list-preview'

  for (let i = 0; i < 3; i += 1) {
    const row = document.createElement('div')
    row.className = 'editor__bullet-list-preview-row'

    const marker = document.createElement('span')
    marker.className = `editor__bullet-list-preview-marker editor__bullet-list-preview-marker--${style}`

    const bar = document.createElement('span')
    bar.className = 'editor__bullet-list-preview-bar'

    row.appendChild(marker)
    row.appendChild(bar)
    preview.appendChild(row)
  }

  return preview
}

/**
 * @param {PluginContext} ctx
 * @param {'default' | 'star' | 'circle' | 'square'} style
 * @param {boolean} disabled
 * @param {boolean} active
 * @returns {HTMLButtonElement}
 */
function buildOptionButton(ctx, style, disabled, active) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'editor__bullet-list-option'
  button.disabled = disabled
  button.classList.toggle('is-active', active)
  button.dataset.style = style

  const label = ctx.t(`bullet-list.${style}`)
  button.title = label
  button.setAttribute('aria-label', label)

  const preview = buildPreviewSample(style)
  const caption = document.createElement('span')
  caption.className = 'editor__bullet-list-option-label'
  caption.textContent = label

  button.appendChild(preview)
  button.appendChild(caption)

  button.addEventListener('click', () => {
    if (button.disabled) return
    ctx.execCommand('bullet-list.setStyle', style)
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
  popoverEl.className = 'editor__bullet-list-popover'

  optionButtons = new Map()
  for (const style of LIST_STYLES) {
    const option = buildOptionButton(ctx, style, !canApply, inList && style === activeStyle)
    optionButtons.set(style, option)
    popoverEl.appendChild(option)
  }

  popoverApi = ctx.ui.createPopover({
    id: 'bullet-list-popover',
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
function mountBulletListButton(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__bullet-list'

  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'bullet-list',
      label: 'bullet-list.button',
      title: 'bullet-list.button',
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
    const title = ctx.t('bullet-list.button')
    buttonEl.title = title
    buttonEl.setAttribute('aria-label', title)
    syncToolbarState(ctx)
  }

  syncToolbarState(ctx)
  return wrapper
}

/**
 * @param {PluginContext} ctx
 * @returns {'default' | 'star' | 'circle' | 'square'}
 */
function getCurrentStyle(ctx) {
  return getActiveListState(ctx).style
}

/**
 * @param {PluginContext} ctx
 * @returns {boolean}
 */
function isInBulletList(ctx) {
  return getActiveListState(ctx).inList
}

/**
 * @param {import('@baselab/plugin-sdk').BlockNode} block
 * @param {'default' | 'star' | 'circle' | 'square'} style
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
 * Existing bullet-lists are restyled in place; contiguous plain text blocks
 * (paragraphs, headings, ...) are merged into a single new bullet-list with
 * one item per block — mirrors how Word/Docs turn a multi-line selection
 * into one list. Blocks are never restructured across a list boundary.
 *
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {'default' | 'star' | 'circle' | 'square'} style
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
    if (current.type === BULLET_LIST_TYPE) {
      result.push(restyleListBlock(current, style))
      i += 1
      continue
    }

    /** @type {any[]} */
    const items = []
    while (i < selected.length && selected[i].type !== BULLET_LIST_TYPE) {
      items.push({ type: BULLET_LIST_ITEM_TYPE, content: /** @type {any} */ (selected[i]).content })
      i += 1
    }
    const cssValue = styleToCssValue(style)
    result.push(/** @type {any} */ ({
      type: BULLET_LIST_TYPE,
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
  if (!container || container.type !== BULLET_LIST_TYPE) return state

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
function indentBulletItem(state) {
  return withIndentLevel(state, (level) => level + 1)
}

/** @param {import('@baselab/plugin-sdk').EditorState} state */
function outdentBulletItem(state) {
  return withIndentLevel(state, (level) => level - 1)
}

export default definePlugin({
  id: 'bullet-list',
  name: 'Bullet List',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block(BULLET_LIST_TYPE, {
        tag: 'ul',
        isContainer: true,
        childType: BULLET_LIST_ITEM_TYPE,
      }),
      block(BULLET_LIST_ITEM_TYPE, {
        tag: 'li',
        childOnly: true,
        tabCommand: 'bullet-list.indent',
        shiftTabCommand: 'bullet-list.outdent',
      }),
    ],
    commands: {
      'bullet-list.setStyle': command((state, _registries, payload) => {
        const style = normalizeStyle(payload)
        return setListStyle(state, style)
      }),
      'bullet-list.indent': command((state) => indentBulletItem(state)),
      'bullet-list.outdent': command((state) => outdentBulletItem(state)),
    },
    toolbar: [
      toolbarItem({
        id: 'bullet-list',
        label: 'bullet-list.button',
        title: 'bullet-list.button',
        group: 'format',
        order: 50,
        render: mountBulletListButton,
        isActive: (ctx) => isInBulletList(ctx),
      }),
    ],
    i18n: {
      pt: {
        'bullet-list.button': 'Marcadores',
        'bullet-list.default': 'Disco',
        'bullet-list.star': 'Estrela',
        'bullet-list.circle': 'Círculo',
        'bullet-list.square': 'Quadrado',
      },
      en: {
        'bullet-list.button': 'Bulleted List',
        'bullet-list.default': 'Disc',
        'bullet-list.star': 'Star',
        'bullet-list.circle': 'Circle',
        'bullet-list.square': 'Square',
      },
    },
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

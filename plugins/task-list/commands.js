/**
 * @file Commands for the `task-list` plugin: convert a selection into a
 * checklist (or back out of one), toggle a single item's checked state, and
 * indent/outdent an item (Tab/Shift+Tab), reusing the same `margin-left`
 * style convention as the `text-align` plugin's indent/outdent.
 */

import { command } from '@baselab/plugin-sdk'

export const TASK_LIST_TYPE = 'task-list'
export const TASK_ITEM_TYPE = 'task-item'

const INDENT_STEP = 40

/**
 * @param {unknown} block
 * @returns {block is { content: unknown[] }}
 */
function isTextBlock(block) {
  return Array.isArray(/** @type {any} */ (block)?.content)
}

/**
 * @param {unknown} block
 * @returns {block is { type: 'task-list', children: any[] }}
 */
function isTaskListBlock(block) {
  return /** @type {any} */ (block)?.type === TASK_LIST_TYPE
}

/**
 * @param {unknown[]} content
 * @param {boolean} [checked]
 */
function makeTaskItem(content, checked = false) {
  return {
    type: TASK_ITEM_TYPE,
    content: content?.length ? content : [{ type: 'text', text: '' }],
    attrs: { 'data-checked': checked ? 'true' : 'false' },
  }
}

/**
 * Converts the current selection into a task-list:
 * - selection spans multiple paragraphs: one task-item per paragraph.
 * - cursor in a single paragraph: that paragraph becomes the single item.
 * - cursor already inside a task-item: toggles back off (unwraps the item
 *   into a plain paragraph, splitting the list if the item was in the middle).
 *
 * @type {import('@baselab/plugin-sdk').CommandHandler}
 */
export const insertTaskList = command((state) => {
  const { doc, selection } = state
  const anchorBlock = doc.content[selection.anchor.block]

  if (selection.anchor.childIndex != null && isTaskListBlock(anchorBlock)) {
    return unwrapTaskItem(state, anchorBlock, selection.anchor.block, selection.anchor.childIndex)
  }

  const from = Math.min(selection.anchor.block, selection.focus.block)
  const to = Math.max(selection.anchor.block, selection.focus.block)

  const spanned = doc.content.slice(from, to + 1)
  if (!spanned.length || !spanned.every(isTextBlock)) return state

  const items = spanned.map((block) => makeTaskItem(/** @type {any} */ (block).content))
  const taskList = { type: TASK_LIST_TYPE, children: items }

  const content = [...doc.content.slice(0, from), taskList, ...doc.content.slice(to + 1)]

  const pos = { block: from, childIndex: 0, offset: 0 }
  return { ...state, doc: { ...doc, content }, selection: { anchor: pos, focus: pos } }
})

/**
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {{ children: any[] }} container
 * @param {number} blockIndex
 * @param {number} childIndex
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function unwrapTaskItem(state, container, blockIndex, childIndex) {
  const { doc } = state
  const children = container.children ?? []
  const item = children[childIndex]
  if (!item) return state

  const before = children.slice(0, childIndex)
  const after = children.slice(childIndex + 1)

  const paragraph = {
    type: 'paragraph',
    content: item.content?.length ? item.content : [{ type: 'text', text: '' }],
  }

  const replacement = []
  if (before.length) replacement.push({ type: TASK_LIST_TYPE, children: before })
  replacement.push(paragraph)
  if (after.length) replacement.push({ type: TASK_LIST_TYPE, children: after })

  const content = [
    ...doc.content.slice(0, blockIndex),
    ...replacement,
    ...doc.content.slice(blockIndex + 1),
  ]

  const paragraphIndex = blockIndex + (before.length ? 1 : 0)
  const pos = { block: paragraphIndex, offset: 0 }
  return { ...state, doc: { ...doc, content }, selection: { anchor: pos, focus: pos } }
}

/**
 * Flips the checked state of the task-item at `{ block, childIndex }`.
 *
 * @type {import('@baselab/plugin-sdk').CommandHandler}
 */
export const toggleTaskItem = command((state, _registries, payload) => {
  const { block, childIndex } = /** @type {{ block?: number, childIndex?: number }} */ (
    payload ?? {}
  )
  if (typeof block !== 'number' || typeof childIndex !== 'number') return state

  const { doc } = state
  const container = doc.content[block]
  if (!isTaskListBlock(container)) return state

  const children = container.children ?? []
  const item = children[childIndex]
  if (!item) return state

  const checked = item.attrs?.['data-checked'] === 'true'
  const nextItem = { ...item, attrs: { 'data-checked': checked ? 'false' : 'true' } }

  const nextChildren = children.map((child, i) => (i === childIndex ? nextItem : child))
  const content = doc.content.map((b, i) =>
    i === block ? { ...container, children: nextChildren } : b
  )

  return { ...state, doc: { ...doc, content } }
})

/**
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {(style: Record<string, string>) => Record<string, string>} transform
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function withChildBlockStyle(state, transform) {
  const { doc, selection } = state
  const pos = selection.anchor
  if (pos.childIndex == null) return state

  const container = doc.content[pos.block]
  if (!isTaskListBlock(container)) return state

  const children = container.children ?? []
  const child = children[pos.childIndex]
  if (!child) return state

  const nextStyle = transform({ .../** @type {any} */ (child).style })

  let nextChild
  if (!Object.keys(nextStyle).length) {
    const { style: _omit, ...rest } = child
    nextChild = rest
  } else {
    nextChild = { ...child, style: nextStyle }
  }

  const nextChildren = children.map((c, i) => (i === pos.childIndex ? nextChild : c))
  const content = doc.content.map((b, i) =>
    i === pos.block ? { ...container, children: nextChildren } : b
  )
  return { ...state, doc: { ...doc, content } }
}

/** @type {import('@baselab/plugin-sdk').CommandHandler} */
export const indentTaskItem = command((state) =>
  withChildBlockStyle(state, (style) => {
    const current = Number.parseInt(style['margin-left'] ?? '', 10) || 0
    return { ...style, 'margin-left': `${current + INDENT_STEP}px` }
  })
)

/** @type {import('@baselab/plugin-sdk').CommandHandler} */
export const outdentTaskItem = command((state) =>
  withChildBlockStyle(state, (style) => {
    const current = Number.parseInt(style['margin-left'] ?? '', 10) || 0
    const next = Math.max(current - INDENT_STEP, 0)

    if (next === 0) {
      const { 'margin-left': _omit, ...rest } = style
      return rest
    }

    return { ...style, 'margin-left': `${next}px` }
  })
)

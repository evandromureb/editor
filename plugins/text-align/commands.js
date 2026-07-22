/**
 * @file Commands for the `text-align` plugin: set block alignment and
 * increase/decrease block indentation. Both act on every text block spanned
 * by the current selection, mirroring how `image`'s commands.js hand-rolls
 * attrs-merge logic directly against `state.doc.content[index]`.
 */

import { command } from '@baselab/plugin-sdk'

const ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify'])
const INDENT_STEP = 40

/**
 * @param {unknown} block
 * @returns {block is { content: unknown[] }}
 */
function isTextBlock(block) {
  return Array.isArray(/** @type {any} */ (block)?.content)
}

/**
 * @param {import('@baselab/plugin-sdk').EditorSelection} selection
 * @returns {[number, number]}
 */
function selectedBlockRange(selection) {
  return [
    Math.min(selection.anchor.block, selection.focus.block),
    Math.max(selection.anchor.block, selection.focus.block),
  ]
}

/**
 * Applies `transform` to the `style` bag of every text block spanned by the
 * current selection, dropping the `style` key entirely once it's empty.
 *
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {(style: Record<string, string>) => Record<string, string>} transform
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function withBlockStyle(state, transform) {
  const { doc, selection } = state
  const [from, to] = selectedBlockRange(selection)

  const content = doc.content.map((block, index) => {
    if (index < from || index > to || !isTextBlock(block)) return block

    const nextStyle = transform({ .../** @type {any} */ (block).style })

    if (!Object.keys(nextStyle).length) {
      if (!('style' in block)) return block
      const { style: _omit, ...rest } = /** @type {any} */ (block)
      return rest
    }

    return { ...block, style: nextStyle }
  })

  return { ...state, doc: { ...doc, content } }
}

/**
 * @param {'left' | 'center' | 'right' | 'justify'} value
 * @returns {import('@baselab/plugin-sdk').CommandHandler}
 */
export function setAlign(value) {
  return command((state) => {
    if (!ALIGN_VALUES.has(value)) return state
    return withBlockStyle(state, (style) => ({ ...style, 'text-align': value }))
  })
}

export const indent = command((state) => {
  return withBlockStyle(state, (style) => {
    const current = Number.parseInt(style['margin-left'] ?? '', 10) || 0
    return { ...style, 'margin-left': `${current + INDENT_STEP}px` }
  })
})

export const outdent = command((state) => {
  return withBlockStyle(state, (style) => {
    const current = Number.parseInt(style['margin-left'] ?? '', 10) || 0
    const next = Math.max(current - INDENT_STEP, 0)

    if (next === 0) {
      const { 'margin-left': _omit, ...rest } = style
      return rest
    }

    return { ...style, 'margin-left': `${next}px` }
  })
})

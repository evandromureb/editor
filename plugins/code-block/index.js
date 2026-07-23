/**
 * @file Code Block plugin — plain-text preformatted block with Enter/Tab
 * handling (single Enter adds a line, double Enter exits) and mark-free content.
 */

import { definePlugin, block, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {((event: KeyboardEvent) => void) | null} */
let keydownHandler = null

/** @type {HTMLButtonElement | null} */
let buttonEl = null

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-code-slash" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"/></svg>'

/**
 * @param {import('@baselab/plugin-sdk').BlockNode} textBlock
 * @returns {import('@baselab/plugin-sdk').BlockNode}
 */
function stripMarks(textBlock) {
  if (!textBlock || !Array.isArray(textBlock.content)) return textBlock
  return {
    ...textBlock,
    content: textBlock.content.map((node) => ({ type: 'text', text: node.text })),
  }
}

/**
 * Toggles the current selection between "code-block" and "paragraph".
 * When converting into a code block, all marks are stripped so only
 * plain text remains.
 */
const toggleCodeBlock = command((state, registries) => {
  const { doc, selection } = state
  const anchorBlock = doc.content[selection.anchor.block]

  if (anchorBlock?.type === 'code-block') {
    return command.setBlockType()(state, registries, 'paragraph')
  }

  const fromBlock = Math.min(selection.anchor.block, selection.focus.block)
  const toBlock = Math.max(selection.anchor.block, selection.focus.block)

  const next =
    fromBlock === toBlock
      ? command.setBlockType()(state, registries, 'code-block')
      : command.setBlockTypeForSelection()(state, registries, 'code-block')

  const content = next.doc.content.map((b, index) => {
    if (b.type !== 'code-block') return b
    if (fromBlock === toBlock && index !== fromBlock) return b
    return stripMarks(b)
  })

  return { ...next, doc: { ...next.doc, content } }
})

/**
 * Removes one indentation level (a leading tab, or up to 4 leading spaces)
 * from the current line inside a code block.
 */
const outdentCodeBlock = command((state) => {
  const { doc, selection } = state
  const pos = selection.anchor
  const codeBlock = doc.content[pos.block]

  if (!codeBlock || codeBlock.type !== 'code-block' || !Array.isArray(codeBlock.content)) {
    return state
  }

  const text = codeBlock.content.map((node) => node.text).join('')
  const lineStart = text.lastIndexOf('\n', pos.offset - 1) + 1
  const line = text.slice(lineStart, pos.offset)

  let removeCount = 0
  if (line.startsWith('\t')) {
    removeCount = 1
  } else {
    const match = line.match(/^ {1,4}/)
    if (match) removeCount = match[0].length
  }

  if (removeCount === 0) return state

  const newText = text.slice(0, lineStart) + text.slice(lineStart + removeCount)
  const newBlock = { ...codeBlock, content: [{ type: 'text', text: newText }] }
  const content = doc.content.map((b, index) => (index === pos.block ? newBlock : b))
  const newOffset = pos.offset - removeCount

  return {
    ...state,
    doc: { ...doc, content },
    selection: {
      anchor: { block: pos.block, offset: newOffset },
      focus: { block: pos.block, offset: newOffset },
    },
  }
})

/**
 * @param {PluginContext} ctx
 * @returns {boolean}
 */
function isInsideCodeBlock(ctx) {
  const { doc, selection } = ctx.getState()
  return doc.content[selection.anchor.block]?.type === 'code-block'
}

/**
 * Tab/Shift+Tab are not modifier shortcuts, so they can't be declared via
 * `capabilities.shortcuts` (the input controller only routes plugin
 * shortcuts when Ctrl/Cmd is held). Handled locally instead, scoped to
 * when the caret is actually inside a code block so it never interferes
 * with normal focus navigation elsewhere in the page.
 *
 * @param {PluginContext} ctx
 * @returns {(event: KeyboardEvent) => void}
 */
function createKeydownHandler(ctx) {
  return (event) => {
    if (event.key !== 'Tab') return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (
      !(document.activeElement instanceof HTMLElement) ||
      !document.activeElement.isContentEditable
    )
      return
    if (!isInsideCodeBlock(ctx)) return

    event.preventDefault()
    if (event.shiftKey) {
      ctx.execCommand('code-block.outdent')
    } else {
      ctx.insertText('\t')
    }
  }
}

/**
 * @param {PluginContext} ctx
 */
function syncButton(ctx) {
  if (!buttonEl) return
  buttonEl.classList.toggle('is-active', isInsideCodeBlock(ctx))
}

export default definePlugin({
  id: 'code-block',
  name: 'Code Block',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block('code-block', {
        tag: 'pre',
        softBreakOnEnter: true,
        softBreakSeparator: '\n',
      }),
    ],
    commands: {
      'code-block.toggle': toggleCodeBlock,
      'code-block.outdent': outdentCodeBlock,
    },
    toolbar: [
      toolbarItem({
        id: 'code-block',
        label: 'code-block.label',
        title: 'code-block.title',
        icon: ICON,
        group: 'insert',
        order: 30,
        render: (ctx) => {
          buttonEl = ctx.ui.createToolbarButton({
            id: 'code-block',
            label: 'code-block.label',
            title: 'code-block.title',
            icon: ICON,
            onClick: () => ctx.execCommand('code-block.toggle'),
          })
          syncButton(ctx)
          return buttonEl
        },
      }),
    ],
    shortcuts: shortcut('mod+alt+c', 'code-block.toggle'),
  },

  activate(ctx) {
    unsubscribe = ctx.subscribe(() => syncButton(ctx))
    keydownHandler = createKeydownHandler(ctx)
    document.addEventListener('keydown', keydownHandler, true)
  },

  deactivate() {
    unsubscribe?.()
    unsubscribe = null
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler, true)
      keydownHandler = null
    }
    buttonEl = null
  },
})

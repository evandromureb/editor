import { definePlugin, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eraser" viewBox="0 0 16 16"> <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/> </svg>`

/**
 * Remove all formatting (marks) from the selection.
 * Preserves text content and document structure.
 *
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {import('@baselab/plugin-sdk').CommandRegistries} registries
 * @returns {import('@baselab/plugin-sdk').EditorState}
 */
function clearFormattingHandler(state, registries) {
  const { doc, selection } = state
  const a = selection.anchor
  const b = selection.focus

  // Check if selection is collapsed
  const collapsed = a.block === b.block && a.offset === b.offset

  if (collapsed) {
    // Clear stored marks for next text input
    return {
      ...state,
      storedMarks: [],
      storedMarkAttrs: {},
    }
  }

  // Range selection: remove all marks from selected range
  const from =
    a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? { ...a } : { ...b }
  const to =
    a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? { ...b } : { ...a }

  // Create new document with marks removed from selection
  const newDoc = {
    type: 'doc',
    content: doc.content.map((block, blockIndex) => {
      if (blockIndex < from.block || blockIndex > to.block) return block
      if (!Array.isArray(block.content)) return block

      const start = blockIndex === from.block ? from.offset : 0
      const end = blockIndex === to.block ? to.offset : getTotalLength(block.content)

      if (start >= end) return block

      // Remove all marks from this range
      return {
        ...block,
        content: removeAllMarksInRange(block.content, start, end, registries),
      }
    }),
  }

  return {
    ...state,
    doc: newDoc,
    storedMarks: [],
    storedMarkAttrs: {},
  }
}

/**
 * Get total length of paragraph content
 * @param {import('@baselab/plugin-sdk').TextNode[]} content
 * @returns {number}
 */
function getTotalLength(content) {
  return content.reduce((sum, node) => sum + node.text.length, 0)
}

/**
 * Remove all marks from text nodes in a range
 * @param {import('@baselab/plugin-sdk').TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {import('@baselab/plugin-sdk').CommandRegistries} registries
 * @returns {import('@baselab/plugin-sdk').TextNode[]}
 */
function removeAllMarksInRange(content, start, end, registries) {
  if (start >= end) return content

  const result = []
  let pos = 0

  for (const node of content) {
    const nodeEnd = pos + node.text.length

    // Node is before selection
    if (nodeEnd <= start) {
      result.push(node)
      pos = nodeEnd
      continue
    }

    // Node is after selection
    if (pos >= end) {
      result.push(node)
      pos = nodeEnd
      continue
    }

    // Node is partially or fully in selection
    const nodeStart = Math.max(0, start - pos)
    const nodeEnd2 = Math.min(node.text.length, end - pos)

    // Before selection
    if (nodeStart > 0) {
      result.push({
        text: node.text.slice(0, nodeStart),
        marks: node.marks,
        markAttrs: node.markAttrs,
      })
    }

    // Inside selection - remove all marks
    if (nodeEnd2 > nodeStart) {
      result.push({
        text: node.text.slice(nodeStart, nodeEnd2),
        // Clear marks and attributes
      })
    }

    // After selection
    if (nodeEnd2 < node.text.length) {
      result.push({
        text: node.text.slice(nodeEnd2),
        marks: node.marks,
        markAttrs: node.markAttrs,
      })
    }

    pos = nodeEnd
  }

  return result
}

export default definePlugin({
  id: 'clear-formatting',
  name: 'Clear Formatting',
  version: '1.0.0',

  capabilities: {
    commands: {
      'clear-formatting': command(clearFormattingHandler),
    },
    toolbar: [
      toolbarItem({
        id: 'clear-formatting',
        label: 'clear-formatting.button',
        icon: ICON,
        title: 'clear-formatting.title',
        shortcut: 'shift+mod+x',
        command: 'clear-formatting',
        group: 'color',
        order: 30,
      }),
    ],
    shortcuts: shortcut('shift+mod+x', 'clear-formatting'),
  },
})

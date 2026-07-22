import { definePlugin, mark, command, toolbarItem, shortcut, toggleMark } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-superscript" viewBox="0 0 16 16"> <path d="m4.266 12.496.96-2.853H8.76l.96 2.853H11L7.62 3H6.38L3 12.496zm2.748-8.063 1.419 4.23h-2.88l1.426-4.23zm5.132-1.797v-.075c0-.332.234-.618.619-.618.354 0 .618.256.618.58 0 .362-.271.649-.52.898l-1.788 1.832V6h3.59v-.958h-1.923v-.045l.973-1.04c.415-.438.867-.845.867-1.547 0-.8-.701-1.41-1.787-1.41C11.565 1 11 1.8 11 2.576v.06z"/> </svg>'

/**
 * Returns true if any text node in the selection has the given mark.
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {string} markName
 */
function anyNodeHasMark(state, markName) {
  const { anchor: a, focus: b } = state.selection
  const collapsed = a.block === b.block && a.offset === b.offset
  if (collapsed) return (state.storedMarks ?? []).includes(markName)

  const from = a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? a : b
  const to = a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? b : a

  for (let i = from.block; i <= to.block; i++) {
    const block = state.doc.content[i]
    if (!block?.content) continue
    const rStart = i === from.block ? from.offset : 0
    const rEnd = i === to.block ? to.offset : block.content.reduce((s, n) => s + n.text.length, 0)
    let pos = 0
    for (const node of block.content) {
      const end = pos + node.text.length
      if (end > rStart && pos < rEnd && (node.marks ?? []).includes(markName)) return true
      pos = end
    }
  }
  return false
}

/**
 * Returns true if ALL text nodes in the selection have the given mark.
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {string} markName
 */
function allNodesHaveMark(state, markName) {
  const { anchor: a, focus: b } = state.selection
  const collapsed = a.block === b.block && a.offset === b.offset
  if (collapsed) return (state.storedMarks ?? []).includes(markName)

  const from = a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? a : b
  const to = a.block < b.block || (a.block === b.block && a.offset <= b.offset) ? b : a

  for (let i = from.block; i <= to.block; i++) {
    const block = state.doc.content[i]
    if (!block?.content) continue
    const rStart = i === from.block ? from.offset : 0
    const rEnd = i === to.block ? to.offset : block.content.reduce((s, n) => s + n.text.length, 0)
    let pos = 0
    for (const node of block.content) {
      const end = pos + node.text.length
      if (end > rStart && pos < rEnd && !(node.marks ?? []).includes(markName)) return false
      pos = end
    }
  }
  return true
}

/**
 * Removes the mark from the entire selection, regardless of how many nodes have it.
 * For a collapsed cursor: removes from storedMarks directly.
 * For a range: if all have it → one toggle removes; if only some have it → double toggle removes.
 * @param {import('@baselab/plugin-sdk').EditorState} state
 * @param {import('@baselab/plugin-sdk').EditorRegistries} registries
 * @param {string} markName
 */
function forceRemoveMark(state, registries, markName) {
  const { anchor: a, focus: b } = state.selection
  const collapsed = a.block === b.block && a.offset === b.offset

  if (collapsed) {
    const stored = state.storedMarks ?? []
    if (!stored.includes(markName)) return state
    return { ...state, storedMarks: stored.filter((m) => m !== markName) }
  }

  if (!anyNodeHasMark(state, markName)) return state

  const s1 = toggleMark(state, registries, markName)
  // Se todos tinham o mark → toggle removeu → pronto.
  // Se apenas alguns tinham → toggle adicionou ao restante → segundo toggle remove todos.
  return allNodesHaveMark(state, markName) ? s1 : toggleMark(s1, registries, markName)
}

export default definePlugin({
  id: 'superscript',
  name: 'Superscript',
  version: '1.0.0',

  capabilities: {
    marks: [mark('superscript', { tag: 'sup', parseTags: ['sup'], priority: 3 })],
    commands: {
      superscript: command((state, registries) => {
        const s = forceRemoveMark(state, registries, 'subscript')
        return toggleMark(s, registries, 'superscript')
      }),
    },
    toolbar: [
      toolbarItem({
        id: 'superscript',
        label: 'superscript.button',
        icon: ICON,
        shortcut: 'mod+shift+=',
        activeMark: 'superscript',
        group: 'format',
        order: 50,
      }),
    ],
    shortcuts: {
      ...shortcut('mod+shift+=', 'superscript'),
      ...shortcut('mod+shift++', 'superscript'),
    },
  },
})

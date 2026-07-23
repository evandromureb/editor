/** @typedef {import('./types.js').TextNode} TextNode */
/** @typedef {import('./types.js').ParagraphNode} ParagraphNode */
/** @typedef {import('./types.js').DocNode} DocNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { getBlockContent, getBlockLength, getChildBlocks, isTextBlock } from './block-utils.js'
import { marksEqual, textNode } from './marks.js'

/**
 * @param {TextNode[]} content
 * @returns {string}
 */
export function getParagraphText(content) {
  return content.map((node) => node.text).join('')
}

/**
 * @param {TextNode[]} content
 * @returns {number}
 */
export function getParagraphLength(content) {
  return getParagraphText(content).length
}

/**
 * @param {TextNode[]} content
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function normalizeContent(content, registries) {
  /** @type {TextNode[]} */
  const result = []

  for (const node of content) {
    if (!node.text) continue

    const marks = node.marks?.length ? [...node.marks] : undefined
    const markAttrs = node.markAttrs ? { ...node.markAttrs } : undefined
    const last = result[result.length - 1]

    if (last && marksEqual(last.marks, marks, registries, last.markAttrs, markAttrs)) {
      last.text += node.text
      continue
    }

    result.push(
      marks?.length ? textNode(node.text, marks, registries, markAttrs ?? {}) : textNode(node.text)
    )
  }

  return result.length ? result : [textNode('')]
}

/**
 * @param {TextNode[]} content
 * @param {number} offset
 * @param {EditorRegistries} registries
 * @returns {[TextNode[], TextNode[]]}
 */
export function splitContentAt(content, offset, registries) {
  if (offset <= 0) {
    return [[], normalizeContent([...content], registries)]
  }

  const length = getParagraphLength(content)
  if (offset >= length) {
    return [normalizeContent([...content], registries), []]
  }

  /** @type {TextNode[]} */
  const before = []
  /** @type {TextNode[]} */
  const after = []
  let pos = 0

  for (const node of content) {
    const nodeEnd = pos + node.text.length

    if (nodeEnd <= offset) {
      before.push(
        node.marks?.length
          ? textNode(node.text, node.marks, registries, node.markAttrs ?? {})
          : textNode(node.text)
      )
      pos = nodeEnd
      continue
    }

    if (pos >= offset) {
      after.push(
        node.marks?.length
          ? textNode(node.text, node.marks, registries, node.markAttrs ?? {})
          : textNode(node.text)
      )
      pos = nodeEnd
      continue
    }

    const splitAt = offset - pos
    const left = node.text.slice(0, splitAt)
    const right = node.text.slice(splitAt)
    const marks = node.marks ?? []
    const markAttrs = node.markAttrs ?? {}

    if (left) before.push(textNode(left, marks, registries, markAttrs))
    if (right) after.push(textNode(right, marks, registries, markAttrs))
    pos = nodeEnd
  }

  return [
    before.length ? normalizeContent(before, registries) : [],
    after.length ? normalizeContent(after, registries) : [],
  ]
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {TextNode[]} insert
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function spliceContent(content, start, end, insert, registries) {
  const [before] = splitContentAt(content, start, registries)
  const [, after] = splitContentAt(content, end, registries)
  return normalizeContent([...before, ...insert, ...after], registries)
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function deleteRangeInParagraph(content, start, end, registries) {
  return spliceContent(content, start, end, [], registries)
}

/**
 * @param {TextNode[]} content
 * @param {number} offset
 * @param {string} text
 * @param {EditorRegistries} registries
 * @param {string[]} [marks]
 * @param {Record<string, string>} [markAttrs]
 * @returns {TextNode[]}
 */
export function insertTextInParagraph(
  content,
  offset,
  text,
  registries,
  marks = [],
  markAttrs = {}
) {
  if (!text) return normalizeContent([...content], registries)
  return spliceContent(
    content,
    offset,
    offset,
    [textNode(text, marks, registries, markAttrs)],
    registries
  )
}

/**
 * @param {TextNode[]} left
 * @param {TextNode[]} right
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function mergeParagraphContent(left, right, registries) {
  return normalizeContent([...left, ...right], registries)
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function sliceContentRange(content, start, end, registries) {
  /** @type {TextNode[]} */
  const result = []
  let pos = 0

  for (const node of content) {
    const nodeStart = pos
    const nodeEnd = pos + node.text.length

    if (nodeEnd <= start || nodeStart >= end) {
      pos = nodeEnd
      continue
    }

    const sliceStart = Math.max(0, start - nodeStart)
    const sliceEnd = Math.min(node.text.length, end - nodeStart)
    result.push(
      textNode(
        node.text.slice(sliceStart, sliceEnd),
        node.marks ?? [],
        registries,
        node.markAttrs ?? {}
      )
    )
    pos = nodeEnd
  }

  return result
}

/**
 * @param {TextNode[]} content
 * @param {number} offset
 * @returns {string[]}
 */
export function getMarksAt(content, offset) {
  const length = getParagraphLength(content)
  if (length === 0) return []

  const target = offset === 0 ? 1 : offset
  let pos = 0

  for (const node of content) {
    const nodeEnd = pos + node.text.length
    if (target <= nodeEnd) {
      return node.marks ? [...node.marks] : []
    }
    pos = nodeEnd
  }

  const last = content[content.length - 1]
  return last.marks ? [...last.marks] : []
}

/**
 * @param {TextNode[]} content
 * @param {number} offset
 * @returns {Record<string, string>}
 */
export function getMarkAttrsAt(content, offset) {
  const length = getParagraphLength(content)
  if (length === 0) return {}

  const target = offset === 0 ? 1 : offset
  let pos = 0

  for (const node of content) {
    const nodeEnd = pos + node.text.length
    if (target <= nodeEnd) {
      return node.markAttrs ? { ...node.markAttrs } : {}
    }
    pos = nodeEnd
  }

  const last = content[content.length - 1]
  return last?.markAttrs ? { ...last.markAttrs } : {}
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {string} mark
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function toggleMarkInRange(content, start, end, mark, registries) {
  if (start >= end) return normalizeContent([...content], registries)

  const slice = sliceContentRange(content, start, end, registries)
  const allHaveMark = slice.every((node) => node.marks?.includes(mark))

  const updated = slice.map((node) => {
    const marks = node.marks ?? []
    const nextMarks = allHaveMark
      ? marks.filter((item) => item !== mark)
      : [...new Set([...marks, mark])]

    return textNode(node.text, nextMarks, registries, node.markAttrs ?? {})
  })

  return spliceContent(content, start, end, updated, registries)
}

/**
 * @param {DocNode} doc
 * @param {number} blockIndex
 * @param {TextNode[]} content
 * @param {EditorRegistries} registries
 * @param {number} [childIndex] when set, updates the child at this index inside the container block at `blockIndex` instead of the block itself
 * @returns {DocNode}
 */
export function updateBlockContent(doc, blockIndex, content, registries, childIndex) {
  if (childIndex == null) {
    return {
      type: 'doc',
      content: doc.content.map((block, index) =>
        index === blockIndex && isTextBlock(block)
          ? { ...block, content: normalizeContent(content, registries) }
          : block
      ),
    }
  }

  return {
    type: 'doc',
    content: doc.content.map((block, index) => {
      if (index !== blockIndex) return block

      const children = getChildBlocks(block)
      const nextChildren = children.map((child, i) =>
        i === childIndex && isTextBlock(child)
          ? { ...child, content: normalizeContent(content, registries) }
          : child
      )
      return { ...block, children: nextChildren }
    }),
  }
}

/**
 * Resolves the block a range/pos addresses: the root block at `pos.block`,
 * or — when `pos.childIndex` is set — the addressed child inside that
 * container block's `children` array.
 *
 * @param {DocNode} doc
 * @param {import('../selection/types.js').Pos} pos
 * @returns {import('./types.js').BlockNode | undefined}
 */
export function getTargetBlock(doc, pos) {
  const block = doc.content[pos.block]
  if (!block) return undefined
  if (pos.childIndex == null) return block
  return getChildBlocks(block)[pos.childIndex]
}

/**
 * Applies `transform(content, start, end)` to every child in
 * `[fromChildIndex, toChildIndex]` inside the container at `blockIndex` —
 * the container-child equivalent of mapping a transform across
 * `[from.block, to.block]` at the root. A selection can select several
 * siblings within the *same* container (e.g. two bullet-list items), so
 * this can't assume `fromChildIndex === toChildIndex`.
 *
 * @param {DocNode} doc
 * @param {number} blockIndex
 * @param {number} fromChildIndex
 * @param {number} toChildIndex
 * @param {number} fromOffset
 * @param {number} toOffset
 * @param {(content: TextNode[], start: number, end: number) => TextNode[]} transform
 * @returns {DocNode}
 */
export function mapContainerChildrenRange(
  doc,
  blockIndex,
  fromChildIndex,
  toChildIndex,
  fromOffset,
  toOffset,
  transform
) {
  return {
    type: 'doc',
    content: doc.content.map((block, index) => {
      if (index !== blockIndex) return block

      const children = getChildBlocks(block)
      const nextChildren = children.map((child, childIndex) => {
        if (childIndex < fromChildIndex || childIndex > toChildIndex) return child
        if (!isTextBlock(child)) return child

        const start = childIndex === fromChildIndex ? fromOffset : 0
        const end = childIndex === toChildIndex ? toOffset : getBlockLength(child)

        if (start >= end) return child
        return { ...child, content: transform(child.content, start, end) }
      })
      return { ...block, children: nextChildren }
    }),
  }
}

/**
 * @param {DocNode} doc
 * @param {import('../selection/types.js').Pos} from
 * @param {import('../selection/types.js').Pos} to
 * @param {EditorRegistries} registries
 * @returns {DocNode}
 */
export function deleteRangeInDoc(doc, from, to, registries) {
  if (from.block === to.block && from.childIndex != null) {
    const toChildIndex = to.childIndex ?? from.childIndex

    if (from.childIndex === toChildIndex) {
      const child = getTargetBlock(doc, from)
      if (!isTextBlock(child)) return doc

      const content = deleteRangeInParagraph(child.content, from.offset, to.offset, registries)
      return updateBlockContent(doc, from.block, content, registries, from.childIndex)
    }

    const container = doc.content[from.block]
    const children = getChildBlocks(container)
    const first = children[from.childIndex]
    const last = children[toChildIndex]
    if (!isTextBlock(first) || !isTextBlock(last)) return doc

    const [firstBefore] = splitContentAt(first.content, from.offset, registries)
    const [, lastAfter] = splitContentAt(last.content, to.offset, registries)
    const merged = mergeParagraphContent(firstBefore, lastAfter, registries)

    const nextChildren = [
      ...children.slice(0, from.childIndex),
      { ...first, content: merged },
      ...children.slice(toChildIndex + 1),
    ]

    return {
      type: 'doc',
      content: doc.content.map((block, index) =>
        index === from.block ? { ...container, children: nextChildren } : block
      ),
    }
  }

  if (from.block === to.block) {
    const block = getTargetBlock(doc, from)
    if (!isTextBlock(block)) return doc

    const content = deleteRangeInParagraph(block.content, from.offset, to.offset, registries)
    return updateBlockContent(doc, from.block, content, registries, from.childIndex)
  }

  const first = doc.content[from.block]
  const last = doc.content[to.block]

  if (!isTextBlock(first) || !isTextBlock(last)) {
    return {
      type: 'doc',
      content: doc.content.filter((_, index) => index < from.block || index > to.block),
    }
  }

  const [firstBefore] = splitContentAt(first.content, from.offset, registries)
  const [, lastAfter] = splitContentAt(last.content, to.offset, registries)
  const merged = mergeParagraphContent(firstBefore, lastAfter, registries)

  return {
    type: 'doc',
    content: [
      ...doc.content.slice(0, from.block),
      { ...first, content: merged },
      ...doc.content.slice(to.block + 1),
    ],
  }
}

/**
 * @param {DocNode} doc
 * @param {import('../selection/types.js').Pos} from
 * @param {import('../selection/types.js').Pos} to
 * @param {string} mark
 * @param {EditorRegistries} registries
 * @returns {DocNode}
 */
export function toggleMarkInDoc(doc, from, to, mark, registries) {
  if (from.block === to.block && from.childIndex != null) {
    const toChildIndex = to.childIndex ?? from.childIndex
    return mapContainerChildrenRange(
      doc,
      from.block,
      from.childIndex,
      toChildIndex,
      from.offset,
      to.offset,
      (content, start, end) => toggleMarkInRange(content, start, end, mark, registries)
    )
  }

  return {
    type: 'doc',
    content: doc.content.map((block, index) => {
      if (index < from.block || index > to.block) return block
      if (!isTextBlock(block)) return block

      const start = index === from.block ? from.offset : 0
      const end = index === to.block ? to.offset : getBlockLength(block)

      if (start >= end) return block

      return {
        ...block,
        content: toggleMarkInRange(block.content, start, end, mark, registries),
      }
    }),
  }
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {string} markName
 * @param {string} value
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function setMarkAttrInRange(content, start, end, markName, value, registries) {
  if (start >= end) return normalizeContent([...content], registries)

  const slice = sliceContentRange(content, start, end, registries)
  const updated = slice.map((node) => {
    const marks = [...new Set([...(node.marks ?? []), markName])]
    const markAttrs = { ...(node.markAttrs ?? {}), [markName]: value }
    return textNode(node.text, marks, registries, markAttrs)
  })

  return spliceContent(content, start, end, updated, registries)
}

/**
 * @param {TextNode[]} content
 * @param {number} start
 * @param {number} end
 * @param {string} markName
 * @param {EditorRegistries} registries
 * @returns {TextNode[]}
 */
export function clearMarkAttrInRange(content, start, end, markName, registries) {
  if (start >= end) return normalizeContent([...content], registries)

  const slice = sliceContentRange(content, start, end, registries)
  const updated = slice.map((node) => {
    const marks = (node.marks ?? []).filter((item) => item !== markName)
    const markAttrs = { ...(node.markAttrs ?? {}) }
    delete markAttrs[markName]
    return textNode(node.text, marks, registries, markAttrs)
  })

  return spliceContent(content, start, end, updated, registries)
}

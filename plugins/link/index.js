/**
 * @file Link plugin — inserts, edits and removes hyperlinks via a
 * Word/Docs-style popover anchored to a toolbar button. The `link` mark
 * wraps text in a real `<a>` tag carrying href/target/rel/title attributes.
 */

import {
  definePlugin,
  mark,
  command,
  toolbarItem,
  setMarkAttr,
  clearMarkAttr,
} from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const MARK_NAME = 'link'

const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Only http(s)/mailto/tel absolute schemes are allowed; relative/anchor
 * values (no scheme prefix) pass through untouched.
 * @param {string} value
 * @returns {boolean}
 */
function isSafeHref(value) {
  const schemeMatch = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)
  if (!schemeMatch) return true
  return SAFE_URL_SCHEMES.has(`${schemeMatch[1].toLowerCase()}:`)
}

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/></svg>`

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {HTMLButtonElement | null} */
let buttonEl = null

/** @type {{ close: () => void, destroy: () => void } | null} */
let popoverApi = null

/**
 * @param {import('../../sdk/types.js').EditorSelection} selection
 * @returns {boolean}
 */
function isCollapsed(selection) {
  return (
    selection.anchor.block === selection.focus.block &&
    selection.anchor.offset === selection.focus.offset
  )
}

/**
 * @param {{ href: string, title?: string, target?: string }} payload
 * @returns {string}
 */
function buildAttrsJson(payload) {
  /** @type {Record<string, string>} */
  const values = {}
  if (payload.href) values.href = payload.href
  if (payload.target === '_blank') {
    values.target = '_blank'
    values.rel = 'noopener noreferrer'
  }
  if (payload.title) values.title = payload.title
  return JSON.stringify(values)
}

/**
 * @param {string | 'mixed' | null} raw
 * @returns {{ href: string, title: string, target: string } | null}
 */
function parseAttrsValue(raw) {
  if (!raw || raw === 'mixed') return null
  try {
    const parsed = JSON.parse(raw)
    return {
      href: parsed.href ?? '',
      title: parsed.title ?? '',
      target: parsed.target === '_blank' ? '_blank' : '_self',
    }
  } catch {
    return null
  }
}

/**
 * Finds the contiguous run of text nodes carrying the `link` mark with the
 * same value around `offset`, mirroring how the core mark-attrs range
 * operations locate spans — but scoped to this plugin's own mark, since a
 * collapsed cursor must expand to the whole existing link run instead of
 * only affecting `storedMarks` (which core's generic setMarkAttr would do).
 * @param {import('@baselab/plugin-sdk').TextNode[]} content
 * @param {number} offset
 */
function findLinkRun(content, offset) {
  const target = offset === 0 ? 1 : offset
  let pos = 0
  let idx = -1

  for (let i = 0; i < content.length; i++) {
    const nodeEnd = pos + content[i].text.length
    if (target <= nodeEnd) {
      idx = i
      break
    }
    pos = nodeEnd
  }
  if (idx === -1) idx = content.length - 1

  const node = content[idx]
  if (!node?.marks?.includes(MARK_NAME)) return null

  const value = node.markAttrs?.[MARK_NAME]
  let start = idx
  let end = idx

  while (
    start > 0 &&
    content[start - 1].marks?.includes(MARK_NAME) &&
    content[start - 1].markAttrs?.[MARK_NAME] === value
  ) {
    start--
  }
  while (
    end < content.length - 1 &&
    content[end + 1].marks?.includes(MARK_NAME) &&
    content[end + 1].markAttrs?.[MARK_NAME] === value
  ) {
    end++
  }

  return { startIndex: start, endIndex: end, value }
}

/**
 * @param {import('@baselab/plugin-sdk').TextNode[]} content
 * @param {number} offset
 */
function splitContentAt(content, offset) {
  let pos = 0
  const before = []
  const after = []

  for (const node of content) {
    const nodeEnd = pos + node.text.length
    if (nodeEnd <= offset) {
      before.push(node)
      pos = nodeEnd
      continue
    }
    if (pos >= offset) {
      after.push(node)
      pos = nodeEnd
      continue
    }
    const splitPoint = offset - pos
    const left = node.text.slice(0, splitPoint)
    const right = node.text.slice(splitPoint)
    if (left) before.push({ ...node, text: left })
    if (right) after.push({ ...node, text: right })
    pos = nodeEnd
  }

  return [before, after]
}

/**
 * Applies (insert or edit) a link. Reuses the core range-based
 * `setMarkAttr` for real selections; for a collapsed cursor it either
 * updates the enclosing link run or inserts new linked text.
 */
const applyLink = command((state, registries, payload) => {
  if (!payload?.href || !isSafeHref(payload.href)) return state
  const json = buildAttrsJson(payload)
  const { doc, selection } = state

  if (!isCollapsed(selection)) {
    return setMarkAttr(state, registries, MARK_NAME, json)
  }

  const blockIndex = selection.anchor.block
  const block = doc.content[blockIndex]
  if (!block || !Array.isArray(block.content)) return state

  const run = findLinkRun(block.content, selection.anchor.offset)

  if (run) {
    const newContent = block.content.map((node, i) => {
      if (i < run.startIndex || i > run.endIndex) return node
      return { ...node, markAttrs: { ...(node.markAttrs ?? {}), [MARK_NAME]: json } }
    })
    const content = doc.content.map((b, i) =>
      i === blockIndex ? { ...block, content: newContent } : b
    )
    return { ...state, doc: { ...doc, content } }
  }

  const text = payload.title || payload.href
  const [before, after] = splitContentAt(block.content, selection.anchor.offset)
  const newNode = { type: 'text', text, marks: [MARK_NAME], markAttrs: { [MARK_NAME]: json } }
  const newContent = [...before, newNode, ...after]
  const content = doc.content.map((b, i) =>
    i === blockIndex ? { ...block, content: newContent } : b
  )
  const newOffset = selection.anchor.offset + text.length

  return {
    ...state,
    doc: { ...doc, content },
    selection: {
      anchor: { block: blockIndex, offset: newOffset },
      focus: { block: blockIndex, offset: newOffset },
    },
  }
})

const removeLink = command((state, registries) => {
  const { doc, selection } = state

  if (!isCollapsed(selection)) {
    return clearMarkAttr(state, registries, MARK_NAME)
  }

  const blockIndex = selection.anchor.block
  const block = doc.content[blockIndex]
  if (!block || !Array.isArray(block.content)) return state

  const run = findLinkRun(block.content, selection.anchor.offset)
  if (!run) return state

  const newContent = block.content.map((node, i) => {
    if (i < run.startIndex || i > run.endIndex) return node
    const marks = (node.marks ?? []).filter((m) => m !== MARK_NAME)
    const markAttrs = { ...(node.markAttrs ?? {}) }
    delete markAttrs[MARK_NAME]
    return { ...node, marks, markAttrs }
  })
  const content = doc.content.map((b, i) =>
    i === blockIndex ? { ...block, content: newContent } : b
  )

  return { ...state, doc: { ...doc, content } }
})

/**
 * Closes the popover and immediately nullifies the reference.
 * OverlayStack.remove() does not invoke onClose, so we must reset here
 * whenever we close programmatically to keep popoverApi in sync.
 */
function closePopover() {
  const api = popoverApi
  popoverApi = null
  api?.close()
}

/**
 * @param {PluginContext} ctx
 */
function syncButton(ctx) {
  if (!buttonEl?.isConnected) return
  buttonEl.classList.toggle('is-active', ctx.getActiveMarks().includes(MARK_NAME))
}

/**
 * @param {PluginContext} ctx
 */
function toggleLinkPopover(ctx) {
  if (popoverApi) {
    closePopover()
    return
  }
  if (!buttonEl) return

  const existing = parseAttrsValue(ctx.getMarkAttr(MARK_NAME))
  const isEditing = existing !== null

  const form = document.createElement('form')
  form.className = 'editor__link-popover'
  form.noValidate = true

  const urlField = document.createElement('label')
  urlField.className = 'editor__link-field'
  const urlLabel = document.createElement('span')
  urlLabel.className = 'editor__link-label'
  urlLabel.textContent = ctx.t('link.url')
  const urlInput = ctx.ui.Input({
    type: 'url',
    value: existing?.href ?? '',
    placeholder: 'https://exemplo.com',
    className: 'editor__link-input',
  })
  urlField.append(urlLabel, urlInput)

  const titleField = document.createElement('label')
  titleField.className = 'editor__link-field'
  const titleLabel = document.createElement('span')
  titleLabel.className = 'editor__link-label'
  titleLabel.textContent = ctx.t('link.title')
  const titleInput = ctx.ui.Input({
    type: 'text',
    value: existing?.title ?? '',
    placeholder: ctx.t('link.title'),
    className: 'editor__link-input',
  })
  titleField.append(titleLabel, titleInput)

  const targetField = document.createElement('label')
  targetField.className = 'editor__link-field'
  const targetLabel = document.createElement('span')
  targetLabel.className = 'editor__link-label'
  targetLabel.textContent = ctx.t('link.target')
  const targetSelect = ctx.ui.Select({
    options: [
      { value: '_self', label: ctx.t('link.current') },
      { value: '_blank', label: ctx.t('link.blank') },
    ],
    value: existing?.target ?? '_self',
    className: 'editor__link-select',
  })
  targetField.append(targetLabel, targetSelect)

  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.className = 'editor__link-submit'
  submitBtn.textContent = ctx.t(isEditing ? 'link.save' : 'link.insert')

  form.append(urlField, titleField, targetField, submitBtn)

  if (isEditing) {
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'editor__link-remove'
    removeBtn.textContent = ctx.t('link.remove')
    removeBtn.addEventListener('click', () => {
      ctx.execCommand('link.remove')
      closePopover()
      ctx.services.focus.focusEditor()
    })
    form.appendChild(removeBtn)
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const href = urlInput.value.trim()
    if (!href) {
      urlInput.focus()
      return
    }
    ctx.execCommand(isEditing ? 'link.update' : 'link.set', {
      href,
      title: titleInput.value.trim(),
      target: targetSelect.value,
    })
    closePopover()
    ctx.services.focus.focusEditor()
  })

  popoverApi = ctx.ui.createPopover({
    id: 'link-popover',
    anchor: buttonEl,
    content: form,
    onClose: () => {
      popoverApi = null
    },
  })
  popoverApi.open()
  urlInput.focus()
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountLinkButton(ctx) {
  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'link',
      label: 'link.button',
      title: 'link.button',
      icon: ICON,
      onClick: () => toggleLinkPopover(ctx),
    })
  )

  const wrapper = document.createElement('div')
  wrapper.className = 'editor__link'
  wrapper.appendChild(buttonEl)

  wrapper.sync = () => syncButton(ctx)

  wrapper.destroy = () => {
    closePopover()
    buttonEl = null
  }

  wrapper.relocalize = () => {
    if (!buttonEl) return
    const title = ctx.t('link.button')
    buttonEl.title = title
    buttonEl.setAttribute('aria-label', title)
  }

  syncButton(ctx)
  return wrapper
}

export default definePlugin({
  id: 'link',
  name: 'Link',
  version: '1.0.0',

  capabilities: {
    marks: [
      mark('link', {
        tag: 'a',
        parseTags: ['a'],
        attrs: ['href', 'target', 'rel', 'title'],
        priority: -1,
      }),
    ],
    commands: {
      'link.set': applyLink,
      'link.update': applyLink,
      'link.remove': removeLink,
      'link.toggle': command.toggleMark('link'),
    },
    toolbar: [
      toolbarItem({
        id: 'link',
        label: 'link.button',
        title: 'link.button',
        group: 'insert',
        order: 40,
        render: mountLinkButton,
      }),
    ],
  },

  activate(ctx) {
    unsubscribe = ctx.subscribe(() => syncButton(ctx))
  },

  deactivate(ctx) {
    unsubscribe?.()
    unsubscribe = null
    closePopover()
    buttonEl = null
    ctx.services.overlay.closePopover('link-popover')
  },
})

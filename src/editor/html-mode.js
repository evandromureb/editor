import { createTransaction, statesEqual } from '../core/transactions/index.js'
import { htmlOffsetsToSelection, selectionToHtmlOffsets, validateHtml } from '../core/serializer/index.js'
import { sanitizeHtml } from '../core/sanitize/index.js'
import { enhanceCodeBlockPreElements } from '../core/pipeline/code-block-render.js'

/**
 * @param {{ htmlSource: HTMLTextAreaElement, registries: import('../core/schema/editor-registries.js').EditorRegistries, getState: () => import('../sdk/types.js').EditorState, history: import('../core/history/history.js').History, parseHtml: (html: string) => import('../core/document/types.js').DocNode, applyState: (state: import('../sdk/types.js').EditorState) => void, setHtmlError: (error: string | null) => void, refreshUi: () => void }} deps
 * @returns {boolean}
 */
export function importHtmlSource(deps) {
  const html = deps.htmlSource.value
  const validation = validateHtml(html, deps.registries)

  if (!validation.valid) {
    deps.setHtmlError(validation.message ?? 'invalid')
    deps.htmlSource.classList.add('is-invalid')
    deps.refreshUi()
    return false
  }

  deps.setHtmlError(null)
  deps.htmlSource.classList.remove('is-invalid')

  const anchorOffset = deps.htmlSource.selectionStart
  const focusOffset = deps.htmlSource.selectionEnd
  const selection = htmlOffsetsToSelection(html, anchorOffset, focusOffset, deps.registries)
  const newDoc = deps.parseHtml(html)

  const before = deps.getState()
  const after = {
    doc: newDoc,
    selection,
    storedMarks: [],
  }

  if (statesEqual(before, after)) return true

  deps.history.record(createTransaction(before, after))
  deps.applyState(after)
  return true
}

/**
 * @param {KeyboardEvent} event
 * @param {{ mode: import('../ui/modes/modes.js').EditorMode, undo: () => void, redo: () => void }} deps
 */
export function handleHtmlSourceKeyDown(event, deps) {
  if (deps.mode !== 'html') return

  const mod = event.ctrlKey || event.metaKey
  if (!mod) return

  if (event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    deps.undo()
    return
  }

  if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
    event.preventDefault()
    deps.redo()
  }
}

/**
 * @param {{ mode: import('../ui/modes/modes.js').EditorMode, surface: HTMLElement, htmlSource: HTMLTextAreaElement, preview: HTMLElement, inputController: import('../core/input-controller/input-controller.js').InputController, textarea: HTMLTextAreaElement, document: import('../core/document/document.js').Document, selection: import('../core/selection/types.js').EditorSelection, registries: import('../core/schema/editor-registries.js').EditorRegistries, getHTML: () => string, syncView: () => void, refreshUi: () => void, setHtmlError: (error: string | null) => void }} deps
 */
export function applyEditorMode(deps) {
  const isEditor = deps.mode === 'editor'
  const isHtml = deps.mode === 'html'
  const isView = deps.mode === 'view'

  deps.surface.hidden = !isEditor
  deps.htmlSource.hidden = !isHtml
  deps.preview.hidden = !isView

  if (isEditor) {
    deps.inputController.attach()
    deps.syncView()
    deps.surface.focus()
  } else {
    deps.inputController.detach()
    deps.surface.contentEditable = 'false'
  }

  if (isHtml) {
    const html = deps.getHTML()
    deps.htmlSource.readOnly = false
    deps.htmlSource.disabled = false
    deps.htmlSource.value = html
    deps.textarea.value = html
    deps.setHtmlError(null)
    deps.htmlSource.classList.remove('is-invalid')
    const offsets = selectionToHtmlOffsets(
      deps.document.toJSON(),
      deps.selection,
      deps.registries,
    )
    deps.htmlSource.focus()
    deps.htmlSource.setSelectionRange(offsets.anchor, offsets.focus)
  }

  if (isView) {
    // Safe: sanitizeHtml() whitelist-parses the HTML before this assignment;
    // no unsanitized user content reaches innerHTML here.
    deps.preview.innerHTML = sanitizeHtml(deps.getHTML(), deps.registries)
    enhanceCodeBlockPreElements(deps.preview)
    deps.textarea.value = deps.getHTML()
  }

  deps.refreshUi()
}

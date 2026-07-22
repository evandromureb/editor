import {
  deleteBackward,
  deleteForward,
  insertText,
  outdentText,
  splitParagraph,
} from '../operations/index.js'
import { insertHtml } from '../operations/blocks.js'
import { extractPasteHtml, extractPasteText } from '../pipeline/clipboard.js'
import { collapseTo, isCollapsed, posFromDomPoint, posFromPoint, readFromDom } from '../cursor/index.js'
import { matchesShortcut } from '../shortcuts/index.js'

/** @typedef {import('../operations/types.js').EditorState} EditorState */

/**
 * @typedef {object} InputControllerOptions
 * @property {HTMLElement} surface
 * @property {() => EditorState} getState
 * @property {() => import('../schema/editor-registries.js').EditorRegistries} getRegistries
 * @property {(operation: Operation, ...args: unknown[]) => void} dispatch
 * @property {() => void} undo
 * @property {() => void} redo
 * @property {(selection: import('../selection/types.js').EditorSelection) => void} setSelection
 * @property {(selection: import('../selection/types.js').EditorSelection) => void} [updateSelectionForMutation]
 * @property {() => Record<string, () => void>} [getPluginShortcuts]
 * @property {(name: string, payload?: unknown) => void} [execCommand]
 */

/** @typedef {(state: EditorState, ...args: unknown[]) => EditorState} Operation */

export class InputController {
  /** @type {HTMLElement} */
  #surface

  /** @type {() => EditorState} */
  #getState

  /** @type {() => import('../schema/editor-registries.js').EditorRegistries} */
  #getRegistries

  /** @type {(operation: Operation, ...args: unknown[]) => void} */
  #dispatch

  /** @type {() => void} */
  #undo

  /** @type {() => void} */
  #redo

  /** @type {(selection: import('../selection/types.js').EditorSelection) => void} */
  #setSelection

  /** @type {(selection: import('../selection/types.js').EditorSelection) => void} */
  #updateSelectionForMutation

  /** @type {() => Record<string, () => void>} */
  #getPluginShortcuts

  /** @type {(name: string, payload?: unknown) => void} */
  #execCommand

  /** @type {(event: InputEvent) => void} */
  #onBeforeInput

  /** @type {(event: KeyboardEvent) => void} */
  #onKeyDown

  /** @type {(event: ClipboardEvent) => void} */
  #onPaste

  /** @type {() => void} */
  #onSelectionChange

  /** @type {() => void} */
  #onCompositionEnd

  /** @type {boolean} */
  #ignoreSelectionChange = false

  /** @type {boolean} */
  #attached = false

  /** @type {boolean} */
  #pasteHandled = false

  /** @type {boolean} */
  #pointerSelecting = false

  /** @type {boolean} */
  #enterHandled = false

  /** @type {boolean} */
  #isComposing = false

  /** @type {import('../selection/types.js').EditorSelection | null} */
  #compositionSelection = null

  /** @type {number} */
  #pointerStartX = 0

  /** @type {number} */
  #pointerStartY = 0

  /** @type {boolean} */
  #pointerDragStarted = false

  /** @type {import('../selection/types.js').EditorSelection | null} */
  #pointerStartSelection = null

  /** @type {(event: MouseEvent) => void} */
  #onSurfaceMouseDown

  /** @type {(event: MouseEvent) => void} */
  #onDocumentMouseUp

  /** @type {(event: CompositionEvent) => void} */
  #onCompositionStart

  /** @type {(event: CompositionEvent) => void} */
  #onCompositionUpdate

  /** @type {number} */
  #selectionChangeRaf = 0

  /** @param {InputControllerOptions} options */
  constructor(options) {
    this.#surface = options.surface
    this.#getState = options.getState
    this.#getRegistries = options.getRegistries
    this.#dispatch = options.dispatch
    this.#undo = options.undo
    this.#redo = options.redo
    this.#setSelection = options.setSelection
    this.#updateSelectionForMutation = options.updateSelectionForMutation ?? options.setSelection
    this.#getPluginShortcuts = options.getPluginShortcuts ?? (() => ({}))
    this.#execCommand = options.execCommand ?? (() => {})

    this.#onBeforeInput = (event) => this.#handleBeforeInput(event)
    this.#onKeyDown = (event) => this.#handleKeyDown(event)
    this.#onPaste = (event) => this.#handlePaste(event)
    this.#onSelectionChange = () => this.#handleSelectionChange()
    this.#onCompositionStart = () => this.#handleCompositionStart()
    this.#onCompositionUpdate = () => this.#handleCompositionUpdate()
    this.#onCompositionEnd = (event) => this.#handleCompositionEnd(event)
    this.#onSurfaceMouseDown = (event) => {
      this.#pointerSelecting = true
      this.#pointerDragStarted = false
      this.#pointerStartX = event.clientX
      this.#pointerStartY = event.clientY

      const state = this.#getState()
      this.#pointerStartSelection = readFromDom(this.#surface) ?? {
        anchor: { ...state.selection.anchor },
        focus: { ...state.selection.focus },
      }

      if (document.activeElement !== this.#surface) {
        this.#surface.focus()
      }
    }
    this.#onDocumentMouseUp = (event) => {
      if (!this.#pointerSelecting) return
      this.#pointerSelecting = false

      const moved = Math.hypot(
        event.clientX - this.#pointerStartX,
        event.clientY - this.#pointerStartY,
      )
      const isClick =
        (Number.isNaN(moved) || moved < 5) && !event.shiftKey && !this.#pointerDragStarted

      this.#syncPointerSelection(event.clientX, event.clientY, isClick)
    }
  }

  attach() {
    if (this.#attached) return
    this.#surface.addEventListener('beforeinput', this.#onBeforeInput)
    this.#surface.addEventListener('keydown', this.#onKeyDown)
    this.#surface.addEventListener('paste', this.#onPaste)
    this.#surface.addEventListener('mousedown', this.#onSurfaceMouseDown)
    this.#surface.addEventListener('compositionstart', this.#onCompositionStart)
    this.#surface.addEventListener('compositionupdate', this.#onCompositionUpdate)
    this.#surface.addEventListener('compositionend', this.#onCompositionEnd)
    document.addEventListener('mouseup', this.#onDocumentMouseUp)
    document.addEventListener('selectionchange', this.#onSelectionChange)
    this.#attached = true
  }

  detach() {
    if (!this.#attached) return
    if (this.#selectionChangeRaf) {
      cancelAnimationFrame(this.#selectionChangeRaf)
      this.#selectionChangeRaf = 0
    }
    this.#surface.removeEventListener('beforeinput', this.#onBeforeInput)
    this.#surface.removeEventListener('keydown', this.#onKeyDown)
    this.#surface.removeEventListener('paste', this.#onPaste)
    this.#surface.removeEventListener('mousedown', this.#onSurfaceMouseDown)
    this.#surface.removeEventListener('compositionstart', this.#onCompositionStart)
    this.#surface.removeEventListener('compositionupdate', this.#onCompositionUpdate)
    this.#surface.removeEventListener('compositionend', this.#onCompositionEnd)
    document.removeEventListener('mouseup', this.#onDocumentMouseUp)
    document.removeEventListener('selectionchange', this.#onSelectionChange)
    this.#attached = false
  }

  /** @param {boolean} ignore */
  setIgnoreSelectionChange(ignore) {
    this.#ignoreSelectionChange = ignore
  }

  /** @param {InputEvent} event */
  #handleBeforeInput(event) {
    if (!event.isTrusted) return

    if (event.isComposing) return

    const inputType = event.inputType
    const data = event.data ?? ''

    if (inputType === 'historyUndo') {
      event.preventDefault()
      this.#undo()
      return
    }

    if (inputType === 'historyRedo') {
      event.preventDefault()
      this.#redo()
      return
    }

    if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
      if (this.#enterHandled) {
        this.#enterHandled = false
        return
      }
    }

    if (!isHandledInputType(inputType)) return

    event.preventDefault()

    this.#runMutation(() => {
      switch (inputType) {
        case 'insertText':
        case 'insertReplacementText':
        case 'insertCompositionText':
          this.#dispatch(insertText, data)
          break
        case 'insertLineBreak':
          this.#dispatch(insertText, '\n')
          break
        case 'insertParagraph':
          this.#dispatch(splitParagraph)
          break
        case 'deleteContentBackward':
          this.#dispatch(deleteBackward)
          break
        case 'deleteContentForward':
          this.#dispatch(deleteForward)
          break
        case 'insertFromPaste':
        case 'insertFromDrop':
          if (this.#pasteHandled) return
          this.#dispatch(insertText, data)
          break
      }
    })
  }

  /** @param {ClipboardEvent} event */
  #handlePaste(event) {
    if (!event.clipboardData) return

    event.preventDefault()
    this.#pasteHandled = true

    this.#runMutation(() => {
      const registries = this.#getRegistries()
      const html = extractPasteHtml(event.clipboardData, registries)
      if (html) {
        this.#dispatch(insertHtml, html)
      } else {
        const text = extractPasteText(event.clipboardData, registries)
        this.#dispatch(insertText, text)
      }
    })

    queueMicrotask(() => {
      this.#pasteHandled = false
    })
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.isComposing
    ) {
      event.preventDefault()
      this.#enterHandled = true
      this.#runMutation(() => {
        if (event.shiftKey) {
          this.#dispatch(insertText, '\n')
        } else {
          this.#dispatch(splitParagraph)
        }
      })
      queueMicrotask(() => {
        this.#enterHandled = false
      })
      return
    }

    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // A capture-phase plugin listener (e.g. code-block) may have already
      // handled this Tab and called preventDefault(); don't double-handle it.
      if (event.defaultPrevented) return
      if (this.#handleTab(event.shiftKey)) {
        event.preventDefault()
      }
      return
    }

    const mod = event.ctrlKey || event.metaKey
    if (!mod) return

    if (event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      this.#undo()
      return
    }

    if (event.key === 'z' && event.shiftKey) {
      event.preventDefault()
      this.#redo()
      return
    }

    if (event.key === 'y') {
      event.preventDefault()
      this.#redo()
      return
    }

    const shortcuts = this.#getPluginShortcuts()
    for (const [shortcut, handler] of Object.entries(shortcuts)) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        handler()
        return
      }
    }
  }

  /**
   * A block reacts to Tab structurally when the cursor sits inside a
   * container's child (task-item, etc.) and that child's BlockDefinition
   * declares `tabCommand`/`shiftTabCommand`. Outside of that, Tab must still
   * never leave the editor — it falls back to inserting a plain tab
   * character so focus never escapes to the next focusable element on the
   * page. Always returns true (i.e. always preventDefault).
   *
   * @param {boolean} shiftKey
   * @returns {boolean}
   */
  #handleTab(shiftKey) {
    const state = this.#getState()
    if (isCollapsed(state.selection)) {
      const pos = state.selection.anchor
      const registries = this.#getRegistries()
      const container = pos.childIndex != null ? state.doc.content[pos.block] : null
      const child = /** @type {any} */ (container)?.children?.[pos.childIndex]
      const def = child ? registries.blocks.getBlockByType(child.type) : null
      const commandName = shiftKey ? def?.shiftTabCommand : def?.tabCommand
      if (commandName) {
        this.#execCommand(commandName)
        return true
      }
    }

    this.#runMutation(() => {
      if (shiftKey) {
        this.#dispatch(outdentText)
      } else {
        this.#dispatch(insertText, '\t')
      }
    })

    return true
  }

  #handleSelectionChange() {
    if (this.#selectionChangeRaf) return

    this.#selectionChangeRaf = requestAnimationFrame(() => {
      this.#selectionChangeRaf = 0
      this.#syncSelectionFromDom()
    })
  }

  #syncSelectionFromDom() {
    if (this.#ignoreSelectionChange) return
    if (this.#isComposing) return
    if (!isSelectionInSurface(this.#surface)) return

    const selection = readFromDom(this.#surface)
    if (!selection) return

    if (this.#pointerSelecting && !isCollapsed(selection)) {
      if (this.#selectionChangedDuringPointer(selection)) {
        this.#pointerDragStarted = true
      }
      return
    }

    const current = this.#getState().selection
    if (selectionEquals(current, selection)) return

    this.#setSelection(selection)
  }

  /** @param {import('../selection/types.js').EditorSelection} selection */
  #selectionChangedDuringPointer(selection) {
    const start = this.#pointerStartSelection
    if (!start) return true

    return (
      start.anchor.block !== selection.anchor.block ||
      start.anchor.offset !== selection.anchor.offset ||
      start.focus.block !== selection.focus.block ||
      start.focus.offset !== selection.focus.offset
    )
  }

  /** @returns {boolean} */
  isComposing() {
    return this.#isComposing
  }

  #handleCompositionStart() {
    this.#isComposing = true

    // Capture the selection the composition will replace. The editor model
    // stays frozen while the IME mutates the DOM, so this is the only point
    // where DOM selection and model selection are still in sync.
    const state = this.#getState()
    this.#compositionSelection = readFromDom(this.#surface) ?? {
      anchor: { ...state.selection.anchor },
      focus: { ...state.selection.focus },
    }
  }

  #handleCompositionUpdate() {
    // The IME owns the DOM during composition; the model is updated only at
    // compositionend. Nothing to do here.
  }

  /** @param {CompositionEvent} event */
  #handleCompositionEnd(event) {
    this.#isComposing = false

    const start = this.#compositionSelection
    this.#compositionSelection = null

    // While composing, every beforeinput is ignored (isComposing) and the IME
    // writes straight into the DOM — the editor model never receives the
    // composed text. Commit it here: restore the selection captured at
    // compositionstart and insert the final composed string through the normal
    // pipeline. The resulting re-render replaces the raw IME DOM mutations
    // with model-backed content and places the cursor right after the text.
    this.setIgnoreSelectionChange(true)

    if (start) {
      this.#updateSelectionForMutation(start)
    }
    this.#dispatch(insertText, event.data ?? '')

    this.setIgnoreSelectionChange(false)
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {boolean} isClick
   */
  #syncPointerSelection(clientX, clientY, isClick) {
    if (this.#ignoreSelectionChange) return

    const fromPoint = posFromPoint(this.#surface, clientX, clientY)
    const fromDom = readFromDom(this.#surface)
    const insideSurface = isSelectionInSurface(this.#surface) || fromPoint !== null

    if (!insideSurface) return

    const isDragEnd =
      this.#pointerDragStarted ||
      (fromDom !== null &&
        !isCollapsed(fromDom) &&
        this.#selectionChangedDuringPointer(fromDom))

    const shouldCollapseClick = isClick && !isDragEnd

    if (shouldCollapseClick) {
      if (fromDom && isCollapsed(fromDom)) {
        this.#setSelection(fromDom)
        return
      }

      if (fromPoint) {
        this.#setSelection(collapseTo(fromPoint))
        return
      }

      const domSelection = window.getSelection()
      const focusPos =
        domSelection &&
        posFromDomPoint(
          this.#surface,
          domSelection.focusNode,
          domSelection.focusOffset,
        )

      if (focusPos) {
        this.#setSelection(collapseTo(focusPos))
        return
      }

      if (fromDom) {
        this.#setSelection(isCollapsed(fromDom) ? fromDom : collapseTo(fromDom.focus))
      }

      return
    }

    if (fromDom) {
      this.#setSelection(fromDom)
      return
    }

    if (fromPoint) {
      this.#setSelection(collapseTo(fromPoint))
    }
  }

  /**
   * @param {() => void} mutate
   */
  #runMutation(mutate) {
    this.setIgnoreSelectionChange(true)

    const state = this.#getState()
    const selection = readFromDom(this.#surface) ?? state.selection
    // Sync selection position without clearing storedMarks — the mutation
    // (e.g. insertText) must still be able to consume them.
    this.#updateSelectionForMutation(selection)
    mutate()

    this.setIgnoreSelectionChange(false)
  }
}

/**
 * @param {string} inputType
 * @returns {boolean}
 */
function isHandledInputType(inputType) {
  return [
    'insertText',
    'insertReplacementText',
    'insertCompositionText',
    'insertLineBreak',
    'insertParagraph',
    'deleteContentBackward',
    'deleteContentForward',
    'insertFromPaste',
    'insertFromDrop',
  ].includes(inputType)
}

/**
 * @param {HTMLElement} surface
 * @returns {boolean}
 */
function isSelectionInSurface(surface) {
  const domSelection = window.getSelection()
  if (!domSelection || domSelection.rangeCount === 0) return false

  const { anchorNode, focusNode } = domSelection
  const anchorInside = anchorNode !== null && surface.contains(anchorNode)
  const focusInside = focusNode !== null && surface.contains(focusNode)

  return anchorInside || focusInside
}

/**
 * @param {import('../selection/types.js').EditorSelection} a
 * @param {import('../selection/types.js').EditorSelection} b
 * @returns {boolean}
 */
function selectionEquals(a, b) {
  return (
    a.anchor.block === b.anchor.block &&
    a.anchor.offset === b.anchor.offset &&
    a.anchor.childIndex === b.anchor.childIndex &&
    a.focus.block === b.focus.block &&
    a.focus.offset === b.focus.offset &&
    a.focus.childIndex === b.focus.childIndex
  )
}

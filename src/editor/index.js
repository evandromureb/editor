import { getMarksAt, sliceContentRange } from '../core/document/text-utils.js'
import { getBlockContent, getBlockLength, isTextBlock } from '../core/document/block-utils.js'
import {
  normalize,
  createSelection,
  toCursorState,
  resolveSelection,
  writeToDom,
  scrollIntoView,
} from '../core/cursor/index.js'
import { Document } from '../core/document/index.js'
import { History } from '../core/history/index.js'
import { InputController } from '../core/input-controller/index.js'
import { insertText as insertTextOp } from '../core/operations/operations.js'
import { insertBlock as insertBlockOp } from '../core/operations/blocks.js'
import { setSelection as setSelectionOp } from '../core/operations/selection.js'
import { toggleMark as toggleMarkOp } from '../core/operations/formatting.js'
import { getMarkAttrInSelection } from '../core/operations/mark-attrs.js'
import { PluginRuntime } from '../core/plugins/runtime.js'
import { render } from '../core/renderer/index.js'
import { parse, serialize } from '../core/serializer/index.js'
import { createEditorRegistries } from '../core/schema/index.js'
import { assetsRegistry } from '../generated/assets.registry.js'
import { I18n } from '../core/i18n/index.js'
import { Modes } from '../ui/modes/index.js'
import { createEditorShell } from '../ui/shell.js'
import { SidebarController } from '../ui/sidebar/sidebar-controller.js'
import { Statusbar } from '../ui/statusbar/index.js'
import { AppearanceManager } from '../ui/appearance/index.js'
import { ThemeManager } from '../ui/themes/index.js'
import { Toolbar } from '../ui/toolbar/index.js'
import { PluginUiRuntime } from '../ui/runtime/index.js'
import { SelectionMenuController } from '../ui/runtime/selection-menu-controller.js'
import { getDefaultAssetBaseUrl, resolvePluginAssetUrl } from '../ui/assets/resolve-plugin-asset-url.js'
import { coreI18n } from '../generated/core.i18n.registry.js'
import { parseToolbar, resolveEditorConfig } from '../core/presets/resolve-config.js'
import '../core/presets/index.js'
import { discoveredPlugins } from '../generated/plugins.registry.js'
import { dispatchOperation } from './dispatch.js'
import { handleEditorContextMenu } from './events.js'
import { applyEditorMode, handleHtmlSourceKeyDown, importHtmlSource } from './html-mode.js'
import { resolveRoot, resolveTextarea } from './lifecycle.js'
import { createEditorPluginContext } from './plugin-context.js'
import { refreshEditorUi, relocalizeEditorUi } from './refresh.js'
import { createToolbarItemPluginMap, getFilteredToolbarEntries } from './toolbar.js'

const allItemPluginMap = createToolbarItemPluginMap(discoveredPlugins)

const TEXT_EDITING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * True for elements an ongoing text-editing session can live in (a
 * dialog/popover's `<input>`, the font-size field, any `contenteditable`) —
 * the only elements worth preserving focus for across a re-render. A plain
 * toolbar `<button>` (bold, task-list, ...) is deliberately excluded: it
 * fires a one-off command, and focus should return to the editor content
 * afterwards instead of sitting on the button.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isTextEditingElement(element) {
  return TEXT_EDITING_TAGS.has(element.tagName) || /** @type {HTMLElement} */ (element).isContentEditable
}

/**
 * @typedef {object} EditorOptions
 * @property {HTMLTextAreaElement | string} textarea
 * @property {HTMLElement | string} [root]
 * @property {import('../sdk/types.js').PluginDefinition[]} [plugins]
 * @property {string} [preset]
 * @property {string} [theme]
 * @property {boolean} [persistTheme]
 * @property {'light' | 'dark'} [appearance]
 * @property {boolean} [persistAppearance]
 * @property {string} [locale]
 * @property {string} [assetBaseUrl]
 * @property {number} [width]
 * @property {number} [height]
 * @property {string | string[]} [toolbar]
 * @property {boolean} [responsive]
 * @property {boolean} [footer] - Shows the editor's footer (status bar). Defaults to `true`.
 * @property {{ default?: string, items?: { label: string, value: string }[] }} [fontFamily]
 * @property {{ upload?: (file: File) => Promise<string | { url: string, width?: number, height?: number }>, maxSize?: number, minWidth?: number, maxWidth?: number, minHeight?: number, maxHeight?: number }} [image]
 *   `maxSize` overrides the image plugin's default max upload size, in bytes
 *   (see `DEFAULT_MAX_FILE_SIZE` in plugins/image/dialog.js).
 *   `minWidth`/`maxWidth`/`minHeight`/`maxHeight` clamp the image resize
 *   range, in pixels (see `DEFAULT_MIN_WIDTH`/`DEFAULT_MAX_WIDTH`/
 *   `DEFAULT_MIN_HEIGHT`/`DEFAULT_MAX_HEIGHT` in plugins/image/commands.js).
 */

/** @typedef {import('../sdk/types.js').PluginDefinition} PluginDefinition */
/** @typedef {import('../sdk/types.js').PluginContext} PluginContext */
/** @typedef {import('../sdk/types.js').EditorState} EditorState */

/** @typedef {import('../ui/modes/modes.js').EditorMode} EditorMode */

export class Editor {
  /** @type {HTMLTextAreaElement} */
  #textarea

  /** @type {HTMLElement} */
  #root

  /** @type {HTMLElement} */
  #surface

  /** @type {HTMLTextAreaElement} */
  #htmlSource

  /** @type {HTMLElement} */
  #preview

  /** @type {Document} */
  #document

  /** @type {import('../core/selection/types.js').EditorSelection} */
  #selection

  /** @type {string[]} */
  #storedMarks = []

  /** @type {Record<string, string>} */
  #storedMarkAttrs = {}

  /** @type {History} */
  #history

  /** @type {InputController} */
  #inputController

  /** @type {Toolbar} */
  #toolbar

  /** @type {Statusbar} */
  #statusbar

  /** @type {HTMLElement} */
  #statusbarOuter

  /** @type {Modes} */
  #modes

  /** @type {PluginRuntime} */
  #plugins

  /** @type {PluginUiRuntime} */
  #pluginUiRuntime

  /** @type {HTMLElement} */
  #pane

  /** @type {HTMLElement} */
  #overlayRoot

  /** @type {Map<string, () => void>} */
  #dynamicShortcuts = new Map()

  /** @type {import('../core/schema/editor-registries.js').EditorRegistries} */
  #registries

  /** @type {PluginContext} */
  #pluginContext

  /** @type {Map<string, PluginContext>} */
  #pluginContexts = new Map()

  /** @type {AppearanceManager} */
  #appearanceManager

  /** @type {ThemeManager} */
  #themeManager

  /** @type {I18n} */
  #i18n

  /** @type {EditorMode} */
  #mode = 'editor'

  /** @type {Set<(state: EditorState) => void>} */
  #subscribers = new Set()

  /** @type {SelectionMenuController} */
  #selectionMenuController

  /** @type {SidebarController | null} */
  #sidebarController = null

  /** @type {string} */
  #assetBaseUrl = ''

  /** @type {string | null} */
  #htmlError = null

  /** @type {string[][]} */
  #toolbarLayout = []

  /** @type {EditorOptions} */
  #editorOptions

  /** @param {EditorOptions} options */
  constructor(options) {
    this.#editorOptions = options
    this.#toolbarLayout = parseToolbar(options.toolbar) ?? []
    this.#assetBaseUrl =
      options.assetBaseUrl !== undefined ? options.assetBaseUrl : getDefaultAssetBaseUrl()
    this.#textarea = resolveTextarea(options.textarea)
    this.#root = resolveRoot(options.root)
    this.#i18n = new I18n({ locale: options.locale ?? 'pt' })
    for (const [locale, dict] of Object.entries(coreI18n)) {
      this.#i18n.register(locale, dict)
    }
    this.#selection = createSelection(0, 0)
    this.#history = new History()
    this.#registries = createEditorRegistries()

    const shell = createEditorShell(this.#root)
    this.#surface = shell.surface
    this.#htmlSource = shell.htmlSource
    this.#preview = shell.preview
    this.#pane = shell.pane
    this.#overlayRoot = shell.overlayRoot
    this.#statusbarOuter = shell.statusbar

    this.#statusbarOuter.hidden = options.footer === false

    if (options.width) {
      this.#root.style.width = `${options.width}px`
    }

    if (options.height) {
      this.#root.style.height = `${options.height}px`
    }

    if (options.responsive) {
      this.#root.classList.add('editor--responsive')
      this.#root.style.maxWidth = '100%'
      this.#root.style.width = options.width ? `${options.width}px` : '100%'
    }

    this.#sidebarController = new SidebarController({
      root: this.#root,
      sidebar: shell.sidebar,
      backdrop: shell.sidebarBackdrop,
    })

    this.#pluginUiRuntime = new PluginUiRuntime({
      overlayRoot: shell.overlayRoot,
      boundary: this.#root,
      slotContainers: {
        'statusbar-left': shell.statusbarLeft,
        'statusbar-center': shell.statusbarCenter,
        'statusbar-right': shell.statusbarRight,
        sidebar: shell.sidebar,
        toolbar: shell.toolbar,
      },
    })

    this.#plugins = new PluginRuntime({
      registries: this.#registries,
      i18n: this.#i18n,
      uiRuntime: this.#pluginUiRuntime,
    })

    this.#appearanceManager = new AppearanceManager({
      root: this.#root,
      initial: options.appearance,
      persist: options.persistAppearance,
      onChange: () => this.#refreshUi(),
    })

    this.#themeManager = new ThemeManager({
      root: this.#root,
      initial: options.theme,
      persist: options.persistTheme,
    })

    for (const plugin of options.plugins ?? []) {
      const ctx = this.#createPluginContext(plugin.id)
      this.#pluginContexts.set(plugin.id, ctx)
      this.#plugins.register(plugin, ctx)
    }

    this.#pluginContext = this.#pluginContexts.values().next().value ?? this.#createPluginContext('default')

    // Parsed only after plugin registration so marks/blocks declared by
    // plugins (bold, quote, code-block, ...) are already in the registries —
    // otherwise the sanitizer strips every plugin-provided tag from the
    // initial textarea content.
    this.#document = new Document(parse(this.#textarea.value, this.#registries))

    this.#toolbar = new Toolbar({
      root: shell.toolbar,
      lines: getFilteredToolbarEntries({ plugins: this.#plugins, layout: this.#toolbarLayout, itemPluginMap: allItemPluginMap }),
      t: (key) => this.#i18n.t(key),
    })

    this.#statusbar = new Statusbar({
      root: shell.statusbar,
      leftSlot: shell.statusbarLeft,
      centerSlot: shell.statusbarCenter,
      rightSlot: shell.statusbarRight,
      zoomTarget: shell.pane,
      portalRoot: shell.overlayRoot,
      getDocument: () => this.#document.toJSON(),
      getSelection: () => this.#selection,
      getMode: () => this.#mode,
      getHtmlSource: () => this.#htmlSource.value,
      getHtmlError: () => this.#htmlError,
      getTheme: () => this.#themeManager.getTheme(),
      onThemeChange: (themeId) => this.setTheme(themeId),
      t: (key) => this.#i18n.t(key),
      appearanceManager: this.#appearanceManager,
    })

    this.#modes = new Modes({
      root: this.#statusbar.getRightElement(),
      onChange: (mode) => this.#setMode(mode),
      getMode: () => this.#mode,
      t: (key) => this.#i18n.t(key),
    })

    this.#selectionMenuController = new SelectionMenuController({
      surface: this.#surface,
      getMode: () => this.#mode,
      getSelection: () => this.#selection,
      getDefs: () => this.#plugins.getSelectionMenuDefs(),
      getPluginCtx: (id) => this.#plugins.getPluginContext(id),
      uiRuntime: this.#pluginUiRuntime,
      t: (key) => this.#i18n.t(key),
    })

    this.#inputController = new InputController({
      surface: this.#surface,
      getState: () => this.#getState(),
      getRegistries: () => this.#registries,
      dispatch: (operation, ...args) => this.#dispatch(operation, ...args),
      undo: () => this.undo(),
      redo: () => this.redo(),
      setSelection: (selection) => {
        this.#setSelectionEphemeral(selection)
      },
      updateSelectionForMutation: (selection) => {
        this.#updateSelectionForMutation(selection)
      },
      getPluginShortcuts: () => this.#getPluginShortcuts(),
      execCommand: (name, payload) => this.execCommand(name, payload),
    })

    this.#htmlSource.addEventListener('input', () => {
      this.#textarea.value = this.#htmlSource.value
      this.#htmlError = null
      this.#htmlSource.classList.remove('is-invalid')
      this.#refreshUi()
    })

    this.#htmlSource.addEventListener('keydown', (event) => {
      this.#handleHtmlSourceKeyDown(event)
    })

    this.#surface.addEventListener('contextmenu', (e) => this.#handleContextMenu(e))

    this.#applyMode()
  }

  /** @param {MouseEvent} event */
  #handleContextMenu(event) {
    handleEditorContextMenu(event, {
      plugins: this.#plugins,
      pluginContexts: this.#pluginContexts,
      pluginUiRuntime: this.#pluginUiRuntime,
    })
  }

  destroy() {
    this.#selectionMenuController.destroy()
    this.#sidebarController?.destroy()
    this.#inputController.detach()
    this.#subscribers.clear()
    this.#root.replaceChildren()
  }

  /**
   * Dynamically registers a plugin after initialization.
   *
   * @param {PluginDefinition} plugin
   */
  registerPlugin(plugin) {
    const ctx = this.#createPluginContext(plugin.id)
    this.#pluginContexts.set(plugin.id, ctx)
    this.#plugins.register(plugin, ctx)
    this.#toolbar.setEntries(
      getFilteredToolbarEntries({ plugins: this.#plugins, layout: this.#toolbarLayout, itemPluginMap: allItemPluginMap }),
    )
    this.#refreshUi()
  }

  /** @param {string} id */
  unregisterPlugin(id) {
    this.#plugins.unregister(id)
    this.#pluginContexts.delete(id)
    this.#toolbar.setEntries(
      getFilteredToolbarEntries({ plugins: this.#plugins, layout: this.#toolbarLayout, itemPluginMap: allItemPluginMap }),
    )
    this.#refreshUi()
  }

  /** @returns {PluginDefinition[]} */
  getPlugins() {
    return this.#plugins.getAll()
  }

  /** @returns {import('../core/document/types.js').DocNode} */
  getDocument() {
    return this.#document.toJSON()
  }

  /** @returns {import('../core/selection/types.js').EditorSelection} */
  getSelection() {
    return {
      anchor: { ...this.#selection.anchor },
      focus: { ...this.#selection.focus },
    }
  }

  /** @returns {import('../core/cursor/cursor-types.js').CursorState} */
  getCursor() {
    return toCursorState(this.#selection)
  }

  /**
   * @param {import('../core/selection/types.js').EditorSelection} selection
   * @param {{ history?: boolean }} [options]
   */
  setSelection(selection, options = {}) {
    if (this.#mode !== 'editor') return

    if (options.history) {
      this.#dispatch(setSelectionOp, selection)
      return
    }

    this.#setSelectionEphemeral(selection)
  }

  /** @returns {EditorMode} */
  getMode() {
    return this.#mode
  }

  /** @returns {'light' | 'dark'} */
  getAppearance() {
    return this.#appearanceManager.getAppearance()
  }

  /** @param {'light' | 'dark'} appearance */
  setAppearance(appearance) {
    this.#appearanceManager.setAppearance(appearance)
  }

  /** @returns {'light' | 'dark'} */
  toggleAppearance() {
    return this.#appearanceManager.toggleAppearance()
  }

  /** @returns {string} */
  getTheme() {
    return this.#themeManager.getTheme()
  }

  /** @param {string} themeId */
  setTheme(themeId) {
    this.#themeManager.setTheme(themeId)
    this.#refreshUi()
  }

  /** @param {boolean} visible */
  setFooterVisible(visible) {
    this.#statusbarOuter.hidden = !visible
  }

  /** @returns {boolean} */
  isFooterVisible() {
    return !this.#statusbarOuter.hidden
  }

  /** @returns {boolean} */
  canUndo() {
    return this.#history.canUndo()
  }

  /** @returns {boolean} */
  canRedo() {
    return this.#history.canRedo()
  }

  /**
   * @param {string} name
   * @param {unknown} [payload]
   * @returns {boolean}
   */
  execCommand(name, payload) {
    if (this.#mode !== 'editor') return false

    const command = this.#registries.commands.getCommand(name)
    if (!command) return false

    this.#dispatch(command, payload)
    this.#refreshUi()
    return true
  }

  undo() {
    const transaction = this.#history.undo()
    if (!transaction) return

    this.#history.pushRedo(transaction)
    this.#applyState(transaction.before)
  }

  redo() {
    const transaction = this.#history.redo()
    if (!transaction) return

    this.#history.pushUndo(transaction)
    this.#applyState(transaction.after)
  }

  /** @param {string} html */
  setContent(html) {
    this.#document.replaceContent(parse(html, this.#registries))
    this.#selection = createSelection(0, 0)
    this.#storedMarks = []
    this.#storedMarkAttrs = {}
    this.#history = new History()
    this.#syncView()
    if (this.#mode === 'html') {
      this.#syncHtmlSourceFromDocument()
    }
    this.#refreshUi()
  }

  /** @returns {string} */
  getHTML() {
    return serialize(this.#document.toJSON(), this.#registries)
  }

  /** @param {string} pluginId @returns {PluginContext} */
  #createPluginContext(pluginId) {
    return createEditorPluginContext({
      pluginId,
      editorOptions: this.#editorOptions,
      assetBaseUrl: this.#assetBaseUrl,
      assetsRegistry,
      registries: this.#registries,
      i18n: this.#i18n,
      pane: this.#pane,
      overlayRoot: this.#overlayRoot,
      root: this.#root,
      surface: this.#surface,
      pluginUiRuntime: this.#pluginUiRuntime,
      appearanceManager: this.#appearanceManager,
      themeManager: this.#themeManager,
      dynamicShortcuts: this.#dynamicShortcuts,
      subscribers: this.#subscribers,
      getState: () => this.#getState(),
      getSelection: () => ({
        anchor: { ...this.#selection.anchor },
        focus: { ...this.#selection.focus },
      }),
      getMode: () => this.#mode,
      getActiveMarks: () => this.#getActiveMarks(),
      getMarkAttr: (markName) => this.#getMarkAttr(markName),
      execCommand: (name, payload) => this.execCommand(name, payload),
      insertText: (text) => {
        if (this.#mode !== 'editor') return
        this.#dispatch(insertTextOp, text)
      },
      insertBlock: (blockType) => {
        if (this.#mode !== 'editor') return
        this.#dispatch(insertBlockOp, blockType)
      },
      toggleMark: (mark) => {
        if (this.#mode !== 'editor') return
        this.#dispatch(toggleMarkOp, mark)
      },
      canUndo: () => this.canUndo(),
      canRedo: () => this.canRedo(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      setAppearance: (appearance) => this.setAppearance(appearance),
      toggleAppearance: () => this.toggleAppearance(),
      setTheme: (themeId) => this.setTheme(themeId),
      getHTML: () => this.getHTML(),
      setContent: (html) => this.setContent(html),
      refresh: () => this.#refreshUi(),
      setSelection: (selection) => this.#setSelectionEphemeral(selection),
      getCursor: () => this.getCursor(),
      resolveAssetUrl: (path) => this.#resolveAssetUrl(path),
    })
  }

  #notifySubscribers() {
    const state = this.#getState()
    for (const listener of this.#subscribers) {
      listener(state)
    }
  }

  /** @returns {Record<string, () => void>} keyed by full shortcut string (ex.: 'mod+b') */
  #getPluginShortcuts() {
    /** @type {Record<string, () => void>} */
    const shortcuts = {}

    for (const [shortcut, commandName] of Object.entries(this.#plugins.getShortcuts())) {
      shortcuts[shortcut] = () => this.execCommand(commandName)
    }

    for (const [shortcut, handler] of this.#dynamicShortcuts) {
      shortcuts[shortcut] = handler
    }

    return shortcuts
  }

  /**
   * Changes the editor language at runtime.
   * Updates the UI immediately.
   *
   * @param {string} locale  - e.g. 'pt', 'en'
   */
  setLocale(locale) {
    this.#i18n.setLocale(locale)
    relocalizeEditorUi({
      i18n: this.#i18n,
      toolbar: this.#toolbar,
      modes: this.#modes,
      statusbar: this.#statusbar,
    })
    this.#refreshUi()
  }

  /** @returns {string} */
  getLocale() {
    return this.#i18n.getLocale()
  }

  /** @param {EditorMode} mode */
  #setMode(mode) {
    if (mode === this.#mode) return

    if (this.#mode === 'html') {
      if (!this.#importHtmlSource()) return
    }

    this.#mode = mode
    this.#pluginUiRuntime.closeAllNonModal()
    this.#applyMode()
  }

  /**
   * @returns {boolean} false when validation fails
   */
  #importHtmlSource() {
    return importHtmlSource({
      htmlSource: this.#htmlSource,
      registries: this.#registries,
      getState: () => this.#getState(),
      history: this.#history,
      parseHtml: (html) => parse(html, this.#registries),
      applyState: (state) => this.#applyState(state),
      setHtmlError: (error) => {
        this.#htmlError = error
      },
      refreshUi: () => this.#refreshUi(),
    })
  }

  /** @param {KeyboardEvent} event */
  #handleHtmlSourceKeyDown(event) {
    handleHtmlSourceKeyDown(event, {
      mode: this.#mode,
      undo: () => this.undo(),
      redo: () => this.redo(),
    })
  }

  /** Syncs the HTML textarea with the current document (e.g. undo/redo in HTML mode). */
  #syncHtmlSourceFromDocument() {
    const html = this.getHTML()
    const hadFocus = document.activeElement === this.#htmlSource
    const anchor = this.#htmlSource.selectionStart
    const focus = this.#htmlSource.selectionEnd

    this.#htmlSource.value = html
    this.#textarea.value = html

    if (hadFocus) {
      this.#htmlSource.setSelectionRange(
        Math.min(anchor, html.length),
        Math.min(focus, html.length),
      )
    }
  }

  #applyMode() {
    applyEditorMode({
      mode: this.#mode,
      surface: this.#surface,
      htmlSource: this.#htmlSource,
      preview: this.#preview,
      inputController: this.#inputController,
      textarea: this.#textarea,
      document: this.#document,
      selection: this.#selection,
      registries: this.#registries,
      getHTML: () => this.getHTML(),
      syncView: () => this.#syncView(),
      refreshUi: () => this.#refreshUi(),
      setHtmlError: (error) => {
        this.#htmlError = error
      },
    })
  }

  /**
   * @param {(state: EditorState, ...args: unknown[]) => EditorState} operation
   * @param {...unknown} args
   */
  #dispatch(operation, ...args) {
    dispatchOperation({
      getState: () => this.#getState(),
      registries: this.#registries,
      history: this.#history,
      applyState: (state) => this.#applyState(state),
    }, operation, args)
  }

  /** @returns {EditorState} */
  #getState() {
    return {
      doc: this.#document.toJSON(),
      selection: {
        anchor: { ...this.#selection.anchor },
        focus: { ...this.#selection.focus },
      },
      storedMarks: [...this.#storedMarks],
      storedMarkAttrs: Object.keys(this.#storedMarkAttrs).length
        ? { ...this.#storedMarkAttrs }
        : undefined,
    }
  }

  /** @param {import('../core/selection/types.js').EditorSelection} selection */
  #setSelectionEphemeral(selection) {
    const resolved = resolveSelection(this.#document.toJSON(), selection, this.#registries)

    const unchanged =
      this.#selection.anchor.block === resolved.anchor.block &&
      this.#selection.anchor.offset === resolved.anchor.offset &&
      this.#selection.focus.block === resolved.focus.block &&
      this.#selection.focus.offset === resolved.focus.offset &&
      this.#storedMarks.length === 0

    if (unchanged) return

    this.#selection = {
      anchor: { ...resolved.anchor },
      focus: { ...resolved.focus },
    }

    // Stored marks are tied to the insertion point where they were set.
    // Moving the cursor to a different position resets them so the toolbar
    // reflects the actual formatting at the new cursor position.
    this.#storedMarks = []
    this.#storedMarkAttrs = {}

    if (this.#mode === 'editor' && !this.#inputController.isComposing()) {
      this.#inputController.setIgnoreSelectionChange(true)
      writeToDom(this.#surface, this.#selection)
      this.#inputController.setIgnoreSelectionChange(false)
    }

    this.#refreshUi()
    this.#notifySubscribers()
  }

  /**
   * Syncs only #selection from the current DOM state before a mutation.
   * Does NOT clear storedMarks — the mutation (e.g. insertText) must
   * consume them to apply the pending formatting to the typed character.
   * @param {import('../core/selection/types.js').EditorSelection} selection
   */
  #updateSelectionForMutation(selection) {
    const resolved = resolveSelection(this.#document.toJSON(), selection, this.#registries)
    this.#selection = {
      anchor: { ...resolved.anchor },
      focus: { ...resolved.focus },
    }
  }

  /** @param {EditorState} state */
  #applyState(state) {
    this.#document.replaceContent(state.doc)
    const resolved = resolveSelection(state.doc, state.selection, this.#registries)
    this.#selection = {
      anchor: { ...resolved.anchor },
      focus: { ...resolved.focus },
    }
    this.#storedMarks = state.storedMarks?.length ? [...state.storedMarks] : []
    this.#storedMarkAttrs = state.storedMarkAttrs ? { ...state.storedMarkAttrs } : {}
    this.#syncView()
    if (this.#mode === 'html') {
      this.#syncHtmlSourceFromDocument()
    }
    this.#refreshUi()
    this.#notifySubscribers()
  }

  #syncView() {
    if (this.#mode === 'editor') {
      // Re-rendering a block replaces its DOM node (renderer.js diffs by
      // signature and calls `existing.replaceWith(...)`), which in real
      // browsers can shift focus/selection into the contentEditable surface
      // even when the change is unrelated to whatever currently has focus
      // (e.g. a plugin popover/dialog input driving a command on every
      // keystroke). Save and restore focus around the sync so typing in
      // that field is never interrupted, regardless of the exact mechanism.
      //
      // This must NOT apply to toolbar buttons: clicking "bold", "task-list",
      // etc. fires a one-off command, not an ongoing text-editing session, so
      // focus should return to the editor content afterwards (see
      // #paintSelection below) instead of staying on the button. Only actual
      // text-input widgets (a dialog/popover's <input>, the font-size field,
      // ...) are worth preserving focus for.
      const activeBeforeSync = document.activeElement
      const shouldRestoreFocus =
        activeBeforeSync instanceof HTMLElement &&
        activeBeforeSync !== this.#surface &&
        !this.#surface.contains(activeBeforeSync) &&
        isTextEditingElement(activeBeforeSync)

      this.#inputController.setIgnoreSelectionChange(true)
      render(this.#document.toJSON(), this.#surface, {
        selection: this.#selection,
        registries: this.#registries,
      })
      this.#paintSelection()

      if (!this.#surface.hasAttribute('tabindex')) {
        this.#surface.tabIndex = 0
      }

      this.#inputController.setIgnoreSelectionChange(false)

      if (
        shouldRestoreFocus &&
        activeBeforeSync.isConnected &&
        document.activeElement !== activeBeforeSync
      ) {
        activeBeforeSync.focus()
      }
    }

    this.#textarea.value = this.#mode === 'html'
      ? this.#htmlSource.value
      : serialize(this.#document.toJSON(), this.#registries)
  }

  #paintSelection() {
    if (this.#mode !== 'editor') return

    // Skip syncing the native DOM selection while focus is inside a plugin
    // popover/dialog (overlayRoot) — Selection.collapse() into the
    // contentEditable surface steals focus from that field in real browsers,
    // even without an explicit .focus() call. Toolbar buttons live outside
    // overlayRoot, so commands triggered from there still refocus the editor
    // as before.
    if (this.#overlayRoot.contains(document.activeElement)) return

    writeToDom(this.#surface, this.#selection)
    scrollIntoView(this.#surface, this.#selection.focus)

    if (document.activeElement === this.#surface || this.#surface.contains(document.activeElement)) {
      this.#surface.focus()
    }
  }

  #refreshUi() {
    refreshEditorUi({
      toolbar: this.#toolbar,
      modes: this.#modes,
      statusbar: this.#statusbar,
    })
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  #resolveAssetUrl(path) {
    return resolvePluginAssetUrl(path, this.#assetBaseUrl)
  }

  /** @returns {string[]} */
  #getActiveMarks() {
    const state = this.#getState()

    if (state.storedMarks?.length) {
      return state.storedMarks
    }

    const { doc, selection } = state
    const collapsed =
      selection.anchor.block === selection.focus.block &&
      selection.anchor.offset === selection.focus.offset

    if (collapsed) {
      const block = doc.content[selection.anchor.block]
      if (!block) return []
      return getMarksAt(getBlockContent(block), selection.anchor.offset)
    }

    return this.#getMarksInSelection(state)
  }

  /**
   * @param {string} markName
   * @returns {string | 'mixed' | null}
   */
  #getMarkAttr(markName) {
    const state = this.#getState()

    if (state.storedMarks?.includes(markName)) {
      return state.storedMarkAttrs?.[markName] ?? null
    }

    return getMarkAttrInSelection(state.doc, state.selection, markName, this.#registries)
  }

  /** @param {EditorState} state */
  #getMarksInSelection(state) {
    const { doc, selection } = state
    const { from, to } = normalize(selection)
    /** @type {string[]} */
    const active = []

    for (const def of this.#registries.marks.getAllMarks()) {
      if (this.#selectionHasMark(doc, from, to, def.name)) {
        active.push(def.name)
      }
    }

    return active
  }

  /**
   * @param {import('../core/document/types.js').DocNode} doc
   * @param {import('../core/selection/types.js').Pos} from
   * @param {import('../core/selection/types.js').Pos} to
   * @param {string} mark
   */
  #selectionHasMark(doc, from, to, mark) {
    let found = false

    for (let blockIndex = from.block; blockIndex <= to.block; blockIndex++) {
      const block = doc.content[blockIndex]
      if (!block) continue

      const start = blockIndex === from.block ? from.offset : 0
      const end = blockIndex === to.block ? to.offset : getBlockLength(block)

      if (start >= end || !isTextBlock(block)) continue

      found = true
      const slice = sliceContentRange(
        getBlockContent(block),
        start,
        end,
        this.#registries,
      )
      if (!slice.every((node) => node.marks?.includes(mark))) {
        return false
      }
    }

    return found
  }

  /**
   * @param {HTMLTextAreaElement | string} textarea
   * @param {Omit<EditorOptions, 'textarea'>} [options]
   * @returns {Editor}
   */
  static create(textarea, options = {}) {
    const resolved = resolveEditorConfig({ textarea, ...options }, { discoveredPlugins })
    return new Editor({
      ...resolved,
      plugins: resolved.plugins ?? discoveredPlugins,
    })
  }
}


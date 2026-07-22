/**
 * @file Service types exposed via ctx.services.
 */

/**
 * @typedef {import('../types.js').EditorState} EditorState
 * @typedef {import('../types.js').EditorSelection} EditorSelection
 * @typedef {import('../../core/cursor/cursor-types.js').CursorState} CursorState
 */

/**
 * @typedef {object} SelectionService
 * @property {() => EditorSelection} get
 * @property {() => CursorState} getCursor
 * @property {(selection: EditorSelection) => void} set
 * @property {() => string[]} getActiveMarks
 * @property {() => boolean} isCollapsed
 */

/**
 * @typedef {object} HistoryService
 * @property {() => boolean} canUndo
 * @property {() => boolean} canRedo
 * @property {() => void} undo
 * @property {() => void} redo
 */

/**
 * @typedef {object} ClipboardService
 * @property {(html: string) => string} sanitize
 */

/**
 * @typedef {object} FocusService
 * @property {() => void} focusEditor
 * @property {() => HTMLElement | null} getActiveElement
 */

/**
 * @typedef {object} ViewportService
 * @property {() => number} getZoom
 * @property {() => { width: number, height: number }} getPaneSize
 * @property {() => HTMLElement} getPane
 * @property {() => HTMLElement} getOverlayRoot
 * @property {() => HTMLElement} getSurface
 */

/**
 * @typedef {object} OverlayService
 * @property {(opts: import('../../ui/runtime/plugin-ui-runtime.js').OverlayOpts & { id: string }) => { close: () => void }} register
 * @property {(opts: import('../../ui/runtime/plugin-ui-runtime.js').DialogOpts) => { close: () => void }} openDialog
 * @property {(id: string) => void} closeDialog
 * @property {(opts: import('../../ui/runtime/plugin-ui-runtime.js').PopoverOpts) => { close: () => void }} openPopover
 * @property {(id: string) => void} closePopover
 */

/**
 * @typedef {object} AppearanceService
 * @property {() => 'light' | 'dark'} getAppearance
 * @property {(appearance: 'light' | 'dark') => void} setAppearance
 * @property {() => 'light' | 'dark'} toggle
 * @property {(listener: (appearance: 'light' | 'dark') => void) => () => void} subscribe
 */

/**
 * @typedef {object} ThemeService
 * @property {() => string} getTheme
 * @property {(themeId: string) => void} setTheme
 * @property {(name: string) => string} getToken
 */

/**
 * @typedef {object} AssetsService
 * @property {(pluginId: string, name: string) => string | null} resolve
 * @property {() => Record<string, Record<string, string[]>>} getAll
 */

/**
 * @typedef {object} ShortcutsService
 * @property {(shortcut: string, handler: () => void) => () => void} register
 */

/**
 * @typedef {object} CommandsService
 * @property {(name: string) => boolean} exec
 * @property {() => string[]} list
 */

/**
 * @typedef {object} SerializerService
 * @property {() => string} toHTML
 * @property {(html: string) => void} fromHTML
 */

/**
 * @typedef {object} RendererService
 * @property {() => void} refresh
 */

/**
 * @typedef {object} PluginServices
 * @property {SelectionService} selection
 * @property {HistoryService} history
 * @property {ClipboardService} clipboard
 * @property {FocusService} focus
 * @property {ViewportService} viewport
 * @property {OverlayService} overlay
 * @property {AppearanceService} appearance
 * @property {ThemeService} theme
 * @property {AssetsService} assets
 * @property {ShortcutsService} shortcuts
 * @property {CommandsService} commands
 * @property {SerializerService} serializer
 * @property {RendererService} renderer
 */

export {}

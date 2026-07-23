import { sanitizeHtml } from '../core/sanitize/index.js'
import { createPluginServices } from '../sdk/services/index.js'
import { createPluginUi } from '../sdk/ui/index.js'

/**
 * @param {Record<string, Record<string, Record<string, string>>>} assetsRegistry
 * @param {string} pluginId
 * @param {string} assetBaseUrl
 * @param {(path: string) => string} resolveAssetUrl
 * @returns {(pid: string, name: string) => string | null}
 */
function createAssetResolver(assetsRegistry, pluginId, assetBaseUrl, resolveAssetUrl) {
  void pluginId
  void assetBaseUrl
  return (pid, name) => {
    const pluginAssets = assetsRegistry[pid]
    if (!pluginAssets) return null

    for (const category of Object.values(pluginAssets)) {
      if (category && typeof category === 'object' && !Array.isArray(category)) {
        const url = /** @type {Record<string, string>} */ (category)[name]
        if (url) return resolveAssetUrl(url)
      }
    }
    return null
  }
}

/**
 * @param {{ pluginId: string, editorOptions: Record<string, unknown>, assetBaseUrl: string, assetsRegistry: Record<string, Record<string, Record<string, string>>>, registries: import('../core/schema/editor-registries.js').EditorRegistries, i18n: import('../core/i18n/i18n.js').I18n, pane: HTMLElement, overlayRoot: HTMLElement, root: HTMLElement, surface: HTMLElement, pluginUiRuntime: import('../ui/runtime/plugin-ui-runtime.js').PluginUiRuntime, appearanceManager: import('../ui/appearance/appearance-manager.js').AppearanceManager, themeManager: import('../ui/themes/theme-manager.js').ThemeManager, dynamicShortcuts: Map<string, () => void>, subscribers: Set<(state: import('../sdk/types.js').EditorState) => void>, getState: () => import('../sdk/types.js').EditorState, getSelection: () => import('../core/selection/types.js').EditorSelection, getMode: () => import('../ui/modes/modes.js').EditorMode, getActiveMarks: () => string[], getMarkAttr: (markName: string) => string | "mixed" | null, execCommand: (name: string, payload?: unknown) => boolean, insertText: (text: string) => void, insertBlock: (blockType: string) => void, toggleMark: (mark: string) => void, canUndo: () => boolean, canRedo: () => boolean, undo: () => void, redo: () => void, setAppearance: (appearance: 'light' | 'dark') => void, toggleAppearance: () => 'light' | 'dark', setTheme: (themeId: string) => void, getHTML: () => string, setContent: (html: string) => void, refresh: () => void, setSelection: (selection: import('../core/selection/types.js').EditorSelection) => void, getCursor: () => import('../core/cursor/cursor-types.js').CursorState, resolveAssetUrl: (path: string) => string }} deps
 * @returns {import('../sdk/types.js').PluginContext}
 */
export function createEditorPluginContext(deps) {
  const base = {
    getState: deps.getState,
    selection: deps.getSelection,
    getMode: deps.getMode,
    getActiveMarks: deps.getActiveMarks,
    getMarkAttr: deps.getMarkAttr,
    getOption: (key) => deps.editorOptions[key],
    execCommand: deps.execCommand,
    insertText: deps.insertText,
    insertBlock: deps.insertBlock,
    toggleMark: deps.toggleMark,
    subscribe: (listener) => {
      deps.subscribers.add(listener)
      return () => {
        deps.subscribers.delete(listener)
      }
    },
    t: (key) => deps.i18n.t(key),
  }

  const services = createPluginServices({
    pluginId: deps.pluginId,
    assetBaseUrl: deps.assetBaseUrl,
    getState: base.getState,
    getActiveMarks: base.getActiveMarks,
    canUndo: deps.canUndo,
    canRedo: deps.canRedo,
    undo: deps.undo,
    redo: deps.redo,
    sanitizeHtml: (html) => sanitizeHtml(html, deps.registries),
    focusEditor: () => deps.surface.focus(),
    getZoom: () => {
      const zoom = deps.pane.style.getPropertyValue('--editor-zoom')
      return zoom ? Math.round(parseFloat(zoom) * 100) : 100
    },
    getPane: () => deps.pane,
    getSurface: () => deps.surface,
    getOverlayRoot: () => deps.overlayRoot,
    uiRuntime: deps.pluginUiRuntime,
    getAppearance: () => deps.appearanceManager.getAppearance(),
    setAppearance: deps.setAppearance,
    toggleAppearance: deps.toggleAppearance,
    subscribeAppearance: (listener) => deps.appearanceManager.subscribe(listener),
    getTheme: () => deps.themeManager.getTheme(),
    setTheme: deps.setTheme,
    themeRoot: deps.root,
    assetsRegistry: deps.assetsRegistry,
    registerShortcut: (shortcut, handler) => {
      deps.dynamicShortcuts.set(shortcut, handler)
      return () => deps.dynamicShortcuts.delete(shortcut)
    },
    execCommand: deps.execCommand,
    listCommands: () => Object.keys(deps.registries.commands.getCommands()),
    getHTML: deps.getHTML,
    setContent: deps.setContent,
    refresh: deps.refresh,
    setSelection: deps.setSelection,
    getCursor: deps.getCursor,
  })

  const ui = createPluginUi({
    t: base.t,
    pluginId: deps.pluginId,
    uiRuntime: deps.pluginUiRuntime,
    resolveAsset: createAssetResolver(
      deps.assetsRegistry,
      deps.pluginId,
      deps.assetBaseUrl,
      deps.resolveAssetUrl
    ),
  })

  return { ...base, ui, services, assets: deps.assetsRegistry }
}

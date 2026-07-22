/**
 * Factory to create ctx.services — facades over the editor's internal APIs.
 */

import { resolvePluginAssetUrl } from '../../ui/assets/resolve-plugin-asset-url.js'

/** @typedef {import('./types.js').PluginServices} PluginServices */

/**
 * @param {object} deps
 * @param {string} deps.pluginId
 * @param {() => import('../types.js').EditorState} deps.getState
 * @param {() => string[]} deps.getActiveMarks
 * @param {() => boolean} deps.canUndo
 * @param {() => boolean} deps.canRedo
 * @param {() => void} deps.undo
 * @param {() => void} deps.redo
 * @param {(html: string) => string} deps.sanitizeHtml
 * @param {() => void} deps.focusEditor
 * @param {() => number} deps.getZoom
 * @param {() => HTMLElement} deps.getPane
 * @param {() => HTMLElement} deps.getSurface
 * @param {import('../../ui/runtime/plugin-ui-runtime.js').PluginUiRuntime} deps.uiRuntime
 * @param {() => 'light' | 'dark'} deps.getAppearance
 * @param {(appearance: 'light' | 'dark') => void} deps.setAppearance
 * @param {() => 'light' | 'dark'} deps.toggleAppearance
 * @param {(listener: (appearance: 'light' | 'dark') => void) => () => void} deps.subscribeAppearance
 * @param {() => string} deps.getTheme
 * @param {(themeId: string) => void} deps.setTheme
 * @param {HTMLElement} deps.themeRoot
 * @param {Record<string, Record<string, Record<string, string>>>} deps.assetsRegistry
 * @param {string} [deps.assetBaseUrl]
 * @param {(shortcut: string, handler: () => void) => () => void} deps.registerShortcut
 * @param {(name: string, payload?: unknown) => boolean} deps.execCommand
 * @param {() => string[]} deps.listCommands
 * @param {() => string} deps.getHTML
 * @param {(html: string) => void} deps.setContent
 * @param {() => void} deps.refresh
 * @param {(selection: import('../types.js').EditorSelection) => void} deps.setSelection
 * @param {() => HTMLElement} deps.getOverlayRoot
 * @returns {PluginServices}
 */
export function createPluginServices(deps) {
  const {
    pluginId,
    getState,
    getActiveMarks,
    getCursor,
    setSelection,
    canUndo,
    canRedo,
    undo,
    redo,
    sanitizeHtml,
    focusEditor,
    getZoom,
    getPane,
    getSurface,
    getOverlayRoot,
    uiRuntime,
    getAppearance,
    setAppearance,
    toggleAppearance,
    subscribeAppearance,
    getTheme,
    setTheme,
    themeRoot,
    assetsRegistry,
    assetBaseUrl = '',
    registerShortcut,
    execCommand,
    listCommands,
    getHTML,
    setContent,
    refresh,
  } = deps

  return {
    selection: {
      get: () => {
        const { selection } = getState()
        return {
          anchor: { ...selection.anchor },
          focus: { ...selection.focus },
        }
      },
      getCursor,
      set: setSelection,
      getActiveMarks,
      isCollapsed: () => {
        const { selection } = getState()
        return (
          selection.anchor.block === selection.focus.block &&
          selection.anchor.offset === selection.focus.offset
        )
      },
    },

    history: {
      canUndo,
      canRedo,
      undo,
      redo,
    },

    clipboard: {
      sanitize: sanitizeHtml,
    },

    focus: {
      focusEditor,
      getActiveElement: () =>
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
    },

    viewport: {
      getZoom,
      getPaneSize: () => {
        const pane = getPane()
        return { width: pane.clientWidth, height: pane.clientHeight }
      },
      getPane,
      getOverlayRoot,
      getSurface,
    },

    overlay: {
      register: (opts) => {
        uiRuntime.registerOverlay(pluginId, opts)
        return { close: () => uiRuntime.closePopover(opts.id) }
      },
      openDialog: (opts) => uiRuntime.openDialog(pluginId, opts),
      closeDialog: (id) => uiRuntime.closeDialog(id),
      openPopover: (opts) => uiRuntime.openPopover(pluginId, opts),
      closePopover: (id) => uiRuntime.closePopover(id),
    },

    appearance: {
      getAppearance,
      setAppearance,
      toggle: toggleAppearance,
      subscribe: subscribeAppearance,
    },

    theme: {
      getTheme,
      setTheme,
      getToken: (name) => {
        const value = getComputedStyle(themeRoot).getPropertyValue(name).trim()
        return value
      },
    },

    assets: {
      resolve: (pid, name) => {
        const pluginAssets = assetsRegistry[pid]
        if (!pluginAssets) return null

        for (const category of Object.values(pluginAssets)) {
          if (category && typeof category === 'object' && category[name]) {
            const path = category[name]
            return resolvePluginAssetUrl(path, assetBaseUrl)
          }
        }
        return null
      },
      getAll: () => assetsRegistry,
    },

    shortcuts: {
      register: registerShortcut,
    },

    commands: {
      exec: execCommand,
      list: listCommands,
    },

    serializer: {
      toHTML: getHTML,
      fromHTML: setContent,
    },

    renderer: {
      refresh,
    },
  }
}

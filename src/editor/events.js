import { buildMenuItemsFromMenuDefs } from '../ui/runtime/menu-from-defs.js'
import { createContextMenuElement } from '../ui/design-system/context-menu.js'

/**
 * @param {MouseEvent} event
 * @param {{ plugins: import('../core/plugins/runtime.js').PluginRuntime, pluginContexts: Map<string, import('../sdk/types.js').PluginContext>, pluginUiRuntime: import('../ui/runtime/plugin-ui-runtime.js').PluginUiRuntime }} deps
 */
export function handleEditorContextMenu(event, deps) {
  const defs = deps.plugins.getContextMenuDefs()
  if (defs.length === 0) return

  const items = buildMenuItemsFromMenuDefs(defs, (id) => deps.plugins.getPluginContext(id))
  if (items.length === 0) return

  event.preventDefault()

  const ctx = deps.pluginContexts.values().next().value
  if (!ctx) return

  const menu = createContextMenuElement({ items })
  const id = `ctx-${Date.now()}`
  menu.style.position = 'fixed'
  menu.style.top = `${event.clientY}px`
  menu.style.left = `${event.clientX}px`

  deps.pluginUiRuntime.registerOverlay('context', {
    id,
    element: menu,
    onClose: () => deps.pluginUiRuntime.closePopover(id),
  })
}

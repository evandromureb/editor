/**
 * Builds menu items from declarative plugin defs.
 */

/** @typedef {import('../../sdk/types.js').PluginContext} PluginContext */
/** @typedef {import('./ui-capabilities.js').ContextMenuItemDef} ContextMenuItemDef */
/** @typedef {import('../design-system/menu.js').MenuItemOpts} MenuItemOpts */

/**
 * @param {ContextMenuItemDef[]} items
 * @param {PluginContext} ctx
 * @returns {MenuItemOpts[]}
 */
export function buildMenuItemsFromDefs(items, ctx) {
  return items
    .filter((item) => !item.when || item.when(ctx))
    .map((item) => {
      if (item.separator) {
        return { id: item.id ?? 'sep', label: '', separator: true }
      }

      return {
        id: item.id,
        label: item.label,
        disabled: false,
        onClick: () => {
          if (item.command) ctx.execCommand(item.command)
        },
      }
    })
}

/**
 * @param {import('./ui-capabilities.js').ContextMenuDef[]} defs
 * @param {(pluginId: string) => PluginContext | null} getCtx
 * @returns {MenuItemOpts[]}
 */
export function buildMenuItemsFromMenuDefs(defs, getCtx) {
  /** @type {MenuItemOpts[]} */
  const result = []

  for (const { pluginId, def } of defs) {
    const ctx = getCtx(pluginId)
    if (!ctx) continue
    if (def.when && !def.when(ctx)) continue
    const items = buildMenuItemsFromDefs(def.items, ctx)
    if (items.length > 0) {
      result.push(...items)
    }
  }

  return result
}

import { filterToolbarEntries } from '../core/presets/resolve-config.js'

/**
 * @param {import('../sdk/types.js').PluginDefinition[]} plugins
 * @returns {Map<string, string>}
 */
export function createToolbarItemPluginMap(plugins) {
  return new Map(
    plugins.flatMap((plugin) =>
      (plugin.capabilities?.toolbar ?? [])
        .filter((item) => item.type !== 'separator' && item.id)
        .map((item) => [item.id, plugin.id]),
    ),
  )
}

/**
 * @param {{ plugins: import('../core/plugins/runtime.js').PluginRuntime, layout: string[][], itemPluginMap: Map<string, string> }} deps
 * @returns {import('../core/plugins/runtime.js').ToolbarEntry[][]}
 */
export function getFilteredToolbarEntries({ plugins, layout, itemPluginMap }) {
  const entries = plugins.getToolbarEntries()
  if (!layout?.length) return [entries]

  return layout.map((line) => filterToolbarEntries(entries, line, itemPluginMap))
}

/** @typedef {import('../../editor.js').EditorOptions} EditorOptions */
/** @typedef {import('./PresetRegistry.js').EditorPreset} EditorPreset */
/** @typedef {import('../../sdk/types.js').PluginDefinition} PluginDefinition */

import { DEFAULT_PRESET, PresetRegistry } from './PresetRegistry.js'

/**
 * @typedef {object} ResolveConfigDefaults
 * @property {PluginDefinition[]} [discoveredPlugins]
 */

// Memoizes the Map by discoveredPlugins array reference (not globally):
// resolveEditorConfig may be called with different plugin lists
// within the same process (multiple <wysiwyg-editor>, tests, etc.) — a single
// module-level cache would be locked to the first array received and
// would resolve wrong plugins (or none) for subsequent calls with a
// different discoveredPlugins.
/** @type {WeakMap<PluginDefinition[], Map<string, PluginDefinition>>} */
const pluginMapCache = new WeakMap()

/**
 * @param {PluginDefinition[]} discoveredPlugins
 * @returns {Map<string, PluginDefinition>}
 */
function ensurePluginMap(discoveredPlugins) {
  let map = pluginMapCache.get(discoveredPlugins)
  if (!map) {
    map = new Map(discoveredPlugins.map((plugin) => [plugin.id, plugin]))
    pluginMapCache.set(discoveredPlugins, map)
  }
  return map
}

/**
 * Resolves a list of plugin IDs to PluginDefinition objects.
 * Warns for IDs that are not found.
 *
 * @param {string[] | null | undefined} pluginIds
 * @param {PluginDefinition[]} discoveredPlugins
 * @returns {PluginDefinition[] | undefined}
 */
function resolvePluginList(pluginIds, discoveredPlugins) {
  if (pluginIds == null) return undefined

  const pluginById = ensurePluginMap(discoveredPlugins)

  const result = []
  for (const id of pluginIds) {
    const plugin = pluginById.get(id)
    if (plugin) {
      result.push(plugin)
    } else {
      console.warn(`[BaseLab]\nPlugin "${id}" not found.\nPlugin ignored.`)
    }
  }
  return result
}

/**
 * Resolves the final list of plugins to load.
 *
 * - null/undefined → loads all discovered (or preset) plugins
 * - string[]      → resolves by ID, warning for missing IDs
 * - PluginDefinition[] → uses directly
 *
 * @param {string[] | PluginDefinition[] | null | undefined} userPlugins
 * @param {string[] | undefined} presetPlugins
 * @param {PluginDefinition[]} discoveredPlugins
 * @returns {PluginDefinition[]}
 */
function resolvePlugins(userPlugins, presetPlugins, discoveredPlugins) {
  if (userPlugins == null) {
    const ids = presetPlugins?.length ? presetPlugins : null
    return resolvePluginList(ids, discoveredPlugins) ?? discoveredPlugins
  }

  if (
    Array.isArray(userPlugins) &&
    (userPlugins.length === 0 || typeof userPlugins[0] === 'string')
  ) {
    return resolvePluginList(/** @type {string[]} */ (userPlugins), discoveredPlugins) ?? []
  }

  return /** @type {PluginDefinition[]} */ (userPlugins)
}

/**
 * Parses a TinyMCE-style toolbar line into layout tokens.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function parseToolbarLine(line) {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * @param {unknown[]} toolbar
 * @returns {toolbar is string[][]}
 */
function isNormalizedToolbarLines(toolbar) {
  return toolbar.length > 0 && toolbar.every((line) => Array.isArray(line))
}

/**
 * @param {string[]} toolbar
 * @returns {boolean}
 */
function isMultiLineToolbarArray(toolbar) {
  return toolbar.some((item) => typeof item === 'string' && /\s/.test(item.trim()))
}

/**
 * Normalizes the toolbar option to string[][], supporting TinyMCE-style
 * string format ("undo redo | bold italic"), a flat token array, or a
 * multi-line array of strings (one line per element).
 * Returns undefined when empty/null (enables automatic toolbar generation).
 *
 * @param {string | string[] | string[][] | null | undefined} toolbar
 * @returns {string[][] | undefined}
 */
export function parseToolbar(toolbar) {
  if (toolbar == null) return undefined

  if (Array.isArray(toolbar)) {
    if (!toolbar.length) return undefined
    if (isNormalizedToolbarLines(toolbar)) return /** @type {string[][]} */ (toolbar)
    if (isMultiLineToolbarArray(/** @type {string[]} */ (toolbar))) {
      const lines = /** @type {string[]} */ (toolbar)
        .map((line) => parseToolbarLine(line))
        .filter((tokens) => tokens.length)
      return lines.length ? lines : undefined
    }
    return [/** @type {string[]} */ (toolbar)]
  }

  const tokens = parseToolbarLine(toolbar)
  return tokens.length ? [tokens] : undefined
}

/**
 * @param {EditorOptions & { preset?: string; lang?: string; width?: number; height?: number; toolbar?: string | string[] }} options
 * @param {ResolveConfigDefaults} [defaults]
 * @returns {EditorOptions & { width?: number; height?: number; toolbar?: string[][] }}
 */
export function resolveEditorConfig(options = {}, defaults = {}) {
  const presetName = options.preset
  const preset = presetName ? PresetRegistry.get(presetName) : null

  if (presetName && !preset) {
    throw new Error(`Unknown editor preset: ${presetName}`)
  }

  const { preset: _preset, lang, ...userOptions } = options

  /** @type {EditorPreset} */
  const merged = {
    ...DEFAULT_PRESET,
    ...preset,
    ...userOptions,
  }

  if (lang !== undefined && merged.locale === undefined) {
    merged.locale = lang
  }

  if (userOptions.locale !== undefined) {
    merged.locale = userOptions.locale
  }

  const discovered = defaults.discoveredPlugins ?? []
  const plugins = resolvePlugins(userOptions.plugins, preset?.plugins, discovered)

  const toolbarRaw = userOptions.toolbar ?? preset?.toolbar
  const toolbar = parseToolbar(toolbarRaw)

  return {
    ...merged,
    locale: merged.locale ?? DEFAULT_PRESET.locale,
    theme: merged.theme ?? DEFAULT_PRESET.theme,
    plugins,
    toolbar,
    width: userOptions.width ?? preset?.width,
    height: userOptions.height ?? preset?.height,
    responsive: userOptions.responsive ?? preset?.responsive,
  }
}

/**
 * Filters and orders toolbar entries according to the given layout.
 * When a token does not match any active item, warns if the item
 * belongs to a plugin that is not loaded.
 *
 * @param {import('../../core/plugins/runtime.js').ToolbarEntry[]} entries - items from loaded plugins
 * @param {string[] | undefined} layout - layout tokens ("undo", "redo", "|", ...)
 * @param {Map<string, string>} [allItemPluginMap] - map of item id → plugin id (all discovered plugins)
 * @returns {import('../../core/plugins/runtime.js').ToolbarEntry[]}
 */
export function filterToolbarEntries(entries, layout, allItemPluginMap = new Map()) {
  if (!layout?.length) return entries

  /** @type {import('../../core/plugins/runtime.js').ToolbarEntry[]} */
  const filtered = []
  let order = 0

  for (const token of layout) {
    if (token === '|') {
      filtered.push({
        type: 'separator',
        id: `preset-sep-${order}`,
        pluginId: 'preset',
        group: 'preset',
        order: order++,
      })
      continue
    }

    const match = entries.find((entry) => entry.type === 'item' && entry.item.id === token)
    if (match) {
      // Overrides group and order to ensure Toolbar respects the exact sequence
      // of the layout, ignoring the original grouping from the plugin.
      filtered.push({ ...match, group: 'preset', order: order++ })
    } else {
      const pluginId = allItemPluginMap.get(token)
      if (pluginId) {
        console.warn(
          `[BaseLab]\nToolbar item "${token}" requires plugin "${pluginId}".\nButton removed automatically.`
        )
      }
    }
  }

  return filtered
}

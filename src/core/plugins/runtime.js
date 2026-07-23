/**
 * PluginRuntime — processes capabilities declared by plugins and applies them
 * to core registries. It is the sole integration point between plugins and core.
 */

/** @typedef {import('../../sdk/types.js').PluginDefinition} PluginDefinition */
/** @typedef {import('../../sdk/types.js').PluginContext} PluginContext */
/** @typedef {import('../../sdk/types.js').ToolbarItem} ToolbarItem */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */
/** @typedef {import('../../ui/runtime/plugin-ui-runtime.js').PluginUiRuntime} PluginUiRuntime */

/**
 * @typedef {object} ToolbarItemEntry
 * @property {'item'} type
 * @property {ToolbarItem} item
 * @property {string} pluginId
 * @property {PluginContext} ctx
 * @property {string} group
 * @property {number} order
 */

/**
 * @typedef {object} ToolbarSeparatorEntry
 * @property {'separator'} type
 * @property {string} id
 * @property {string} pluginId
 * @property {string} group
 * @property {number} order
 */

/** @typedef {ToolbarItemEntry | ToolbarSeparatorEntry} ToolbarEntry */

/**
 * @typedef {object} MenuDefWithPlugin
 * @property {string} pluginId
 * @property {import('../../ui/runtime/ui-capabilities.js').ContextMenuDef} def
 */

export class PluginRuntime {
  /** @type {Map<string, PluginDefinition>} */
  #plugins = new Map()

  /** @type {ToolbarEntry[]} */
  #toolbarEntries = []

  /** @type {Record<string, string>} */
  #shortcuts = {}

  /** @type {Map<string, string[]>} plugin id → toolbar item ids */
  #pluginToolbarMap = new Map()

  /** @type {Map<string, string[]>} */
  #pluginMarksMap = new Map()

  /** @type {Map<string, string[]>} */
  #pluginBlocksMap = new Map()

  /** @type {Map<string, string[]>} */
  #pluginCommandsMap = new Map()

  /** @type {Map<string, Record<string, string[]>>} plugin id → locale → keys */
  #pluginI18nMap = new Map()

  /** @type {EditorRegistries} */
  #registries

  /** @type {import('../i18n/i18n.js').I18n} */
  #i18n

  /** @type {PluginUiRuntime | null} */
  #uiRuntime

  /** @type {Map<string, PluginContext>} */
  #pluginCtxMap = new Map()

  /** @type {Map<string, import('../../ui/runtime/ui-capabilities.js').ContextMenuDef[]>} */
  #contextMenus = new Map()

  /** @type {Map<string, import('../../ui/runtime/ui-capabilities.js').SelectionMenuDef[]>} */
  #selectionMenus = new Map()

  /** @type {Record<string, (value: any, ctx: PluginContext, pluginId: string) => void>} */
  #capabilityHandlers

  /**
   * @param {{
   *   registries: EditorRegistries,
   *   i18n: import('../i18n/i18n.js').I18n,
   *   uiRuntime?: PluginUiRuntime
   * }} deps
   */
  constructor({ registries, i18n, uiRuntime = null }) {
    this.#registries = registries
    this.#i18n = i18n
    this.#uiRuntime = uiRuntime

    this.#capabilityHandlers = {
      marks: (items, _ctx, pluginId) => {
        const names = []
        for (const m of items) {
          registries.marks.registerMark(m)
          names.push(m.name)
        }
        this.#pluginMarksMap.set(pluginId, names)
      },
      blocks: (items, _ctx, pluginId) => {
        const types = []
        for (const b of items) {
          registries.blocks.registerBlock(b)
          types.push(b.type)
        }
        this.#pluginBlocksMap.set(pluginId, types)
      },
      commands: (map, _ctx, pluginId) => {
        const names = []
        for (const [name, fn] of Object.entries(map)) {
          registries.commands.registerCommand(name, fn)
          names.push(name)
        }
        this.#pluginCommandsMap.set(pluginId, names)
      },
      toolbar: (items, ctx, pluginId) => this.#registerToolbarItems(items, ctx, pluginId),
      shortcuts: (map) => Object.assign(this.#shortcuts, map),
      i18n: (dict, _ctx, pluginId) => {
        /** @type {Record<string, string[]>} */
        const keysByLocale = {}
        for (const [locale, d] of Object.entries(dict)) {
          this.#i18n.register(locale, d)
          keysByLocale[locale] = Object.keys(d)
        }
        this.#pluginI18nMap.set(pluginId, keysByLocale)
      },
      statusbar: (items, ctx, pluginId) => this.#handleStatusbar(items, ctx, pluginId),
      sidebar: (items, ctx, pluginId) => this.#handleSidebar(items, ctx, pluginId),
      contextMenu: (items, _ctx, pluginId) => this.#contextMenus.set(pluginId, items),
      selectionMenu: (items, _ctx, pluginId) => this.#selectionMenus.set(pluginId, items),
      inspector: (items, ctx, pluginId) => this.#handleInspector(items, ctx, pluginId),
      overlays: (items, ctx, pluginId) => this.#handleOverlays(items, ctx, pluginId),
    }
  }

  /**
   * @param {import('../../sdk/types.js').ToolbarCapabilityItem[]} items
   * @param {PluginContext} ctx
   * @param {string} pluginId
   */
  #registerToolbarItems(items, ctx, pluginId) {
    const toolbarIds = []

    for (const raw of items) {
      if (raw.type === 'separator') {
        const id = raw.id ?? `sep-${pluginId}-${this.#toolbarEntries.length}`
        this.#toolbarEntries.push({
          type: 'separator',
          id,
          pluginId,
          group: raw.group ?? 'default',
          order: raw.order ?? 0,
        })
        toolbarIds.push(id)
        continue
      }

      const item = /** @type {ToolbarItem} */ (raw)
      this.#toolbarEntries.push({
        type: 'item',
        item,
        pluginId,
        ctx,
        group: item.group ?? 'default',
        order: item.order ?? 0,
      })
      toolbarIds.push(item.id)
    }

    this.#pluginToolbarMap.set(pluginId, toolbarIds)
  }

  #handleStatusbar(items, ctx, pluginId) {
    if (!this.#uiRuntime) return
    for (const item of items) {
      const el = typeof item.render === 'function' ? item.render(ctx) : item.element
      if (el instanceof HTMLElement) {
        this.#uiRuntime.mountSlot(`statusbar-${item.slot}`, pluginId, el, item.id)
      }
    }
  }

  #handleSidebar(items, ctx, pluginId) {
    if (!this.#uiRuntime) return
    for (const item of items) {
      const el = typeof item.render === 'function' ? item.render(ctx) : item.element
      if (el instanceof HTMLElement) {
        this.#uiRuntime.mountSlot('sidebar', pluginId, el, item.id)
        this.#uiRuntime.slots.getContainer('sidebar').hidden = false
      }
    }
  }

  #handleInspector(items, ctx, pluginId) {
    if (!this.#uiRuntime) return
    for (const item of items) {
      if (ctx.ui?.createInspector) {
        ctx.ui.createInspector({ id: item.id, title: item.title, content: item.render?.(ctx) })
      }
    }
  }

  #handleOverlays(items, ctx, pluginId) {
    if (!this.#uiRuntime) return
    for (const item of items) {
      const el = typeof item.render === 'function' ? item.render(ctx) : item.element
      if (el instanceof HTMLElement) {
        this.#uiRuntime.registerOverlay(pluginId, { id: item.id, element: el })
      }
    }
  }

  /**
   * TRUST BOUNDARY — capability payloads (`marks`/`blocks`/`commands`/...)
   * are handed to their registry handlers as-is, and `plugin.activate(ctx)`
   * below runs the plugin's own code with the full `ctx` given to it. There
   * is no schema validation of capability shapes and no sandboxing of
   * `activate()` here — this mirrors the trust boundary already crossed at
   * discovery/build time (see scripts/discover.js `loadModule`). A malicious
   * plugin can register
   * capabilities that widen the sanitizer's allowed HTML surface (e.g. a
   * `marks`/`blocks` def with permissive `tag`/`attrs`), which is why
   * plugins must be trusted the same way any other source file is.
   */
  register(plugin, ctx) {
    const { id } = plugin

    if (this.#plugins.has(id)) {
      throw new Error(`Plugin already registered: ${id}`)
    }

    this.#plugins.set(id, plugin)
    this.#pluginCtxMap.set(id, ctx)

    const caps = plugin.capabilities ?? {}

    for (const [capName, value] of Object.entries(caps)) {
      const handler = this.#capabilityHandlers[capName]
      if (handler) {
        handler(value, ctx, id)
      } else {
        console.warn(
          `[PluginRuntime] Capability desconhecida ignorada: "${capName}" (plugin: ${id})`
        )
      }
    }

    if (!caps.toolbar?.length) {
      this.#pluginToolbarMap.set(id, [])
    }

    if (plugin.activate) {
      plugin.activate(ctx)
    }
  }

  unregister(id) {
    const plugin = this.#plugins.get(id)
    const ctx = this.#pluginCtxMap.get(id)

    if (plugin?.deactivate && ctx) {
      try {
        plugin.deactivate(ctx)
      } catch (err) {
        console.error(`[PluginRuntime] Erro em deactivate do plugin "${id}":`, err)
      }
    }

    this.#uiRuntime?.unregisterPlugin(id)

    for (const mark of this.#pluginMarksMap.get(id) ?? []) {
      this.#registries.marks.unregisterMark(mark)
    }
    for (const blockType of this.#pluginBlocksMap.get(id) ?? []) {
      try {
        this.#registries.blocks.unregisterBlock(blockType)
      } catch {
        // built-in blocks are never tracked per plugin
      }
    }
    for (const commandName of this.#pluginCommandsMap.get(id) ?? []) {
      this.#registries.commands.unregisterCommand(commandName)
    }

    const toolbarIds = this.#pluginToolbarMap.get(id) ?? []
    this.#toolbarEntries = this.#toolbarEntries.filter((entry) => entry.pluginId !== id)

    const pluginShortcuts = plugin?.capabilities?.shortcuts ?? {}
    for (const shortcut of Object.keys(pluginShortcuts)) {
      delete this.#shortcuts[shortcut]
    }

    for (const [locale, keys] of Object.entries(this.#pluginI18nMap.get(id) ?? {})) {
      this.#i18n.unregister(locale, keys)
    }

    this.#contextMenus.delete(id)
    this.#selectionMenus.delete(id)
    this.#pluginMarksMap.delete(id)
    this.#pluginBlocksMap.delete(id)
    this.#pluginCommandsMap.delete(id)
    this.#pluginToolbarMap.delete(id)
    this.#pluginI18nMap.delete(id)
    this.#pluginCtxMap.delete(id)
    this.#plugins.delete(id)
  }

  has(id) {
    return this.#plugins.has(id)
  }

  getAll() {
    return [...this.#plugins.values()]
  }

  get(id) {
    return this.#plugins.get(id) ?? null
  }

  /** @returns {PluginContext | null} */
  getPluginContext(pluginId) {
    return this.#pluginCtxMap.get(pluginId) ?? null
  }

  /** @returns {ToolbarEntry[]} */
  getToolbarEntries() {
    return [...this.#toolbarEntries]
  }

  /** @deprecated use getToolbarEntries */
  getToolbarItems() {
    return this.#toolbarEntries
      .filter((e) => e.type === 'item')
      .map((e) => /** @type {ToolbarItemEntry} */ (e).item)
  }

  getPluginToolbarIds(pluginId) {
    return this.#pluginToolbarMap.get(pluginId) ?? []
  }

  getShortcuts() {
    return { ...this.#shortcuts }
  }

  getBlocks() {
    return this.#registries.blocks.getAllBlocks()
  }

  /** @returns {MenuDefWithPlugin[]} */
  getContextMenuDefs() {
    /** @type {MenuDefWithPlugin[]} */
    const all = []
    for (const [pluginId, defs] of this.#contextMenus) {
      for (const def of defs) {
        all.push({ pluginId, def })
      }
    }
    return all
  }

  /** @returns {MenuDefWithPlugin[]} */
  getSelectionMenuDefs() {
    /** @type {MenuDefWithPlugin[]} */
    const all = []
    for (const [pluginId, defs] of this.#selectionMenus) {
      for (const def of defs) {
        all.push({ pluginId, def })
      }
    }
    return all
  }
}

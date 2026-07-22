/**
 * Types for declarative UI capabilities.
 */

/**
 * @typedef {object} StatusbarItemDef
 * @property {string} id
 * @property {'left' | 'center' | 'right'} slot
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => HTMLElement} [render]
 * @property {HTMLElement} [element]
 */

/**
 * @typedef {object} SidebarPanelDef
 * @property {string} id
 * @property {string} [title]
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => HTMLElement} [render]
 * @property {HTMLElement} [element]
 */

/**
 * @typedef {object} ContextMenuItemDef
 * @property {string} id
 * @property {string} label
 * @property {string} [command]
 * @property {boolean} [separator]
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => boolean} [when]
 */

/**
 * @typedef {object} ContextMenuDef
 * @property {string} id
 * @property {ContextMenuItemDef[]} items
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => boolean} [when]
 */

/** @typedef {ContextMenuDef} SelectionMenuDef */

/**
 * @typedef {object} InspectorDef
 * @property {string} id
 * @property {string} [title]
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => HTMLElement} [render]
 */

/**
 * @typedef {object} OverlayDef
 * @property {string} id
 * @property {(ctx: import('../../sdk/types.js').PluginContext) => HTMLElement} [render]
 * @property {HTMLElement} [element]
 */

export {}

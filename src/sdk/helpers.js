/** @typedef {import('./types.js').MarkDefinition} MarkDefinition */
/** @typedef {import('./types.js').BlockDefinition} BlockDefinition */
/** @typedef {import('./types.js').ToolbarItem} ToolbarItem */
/** @typedef {import('./types.js').CommandHandler} CommandHandler */
/** @typedef {import('./types.js').PluginContext} PluginContext */

import { toggleMark } from '../core/operations/formatting.js'
import { setMarkAttr, clearMarkAttr } from '../core/operations/mark-attrs.js'
import { insertBlock, setBlockType, setBlockTypeForSelection } from '../core/operations/blocks.js'

/**
 * @param {{ id?: string }} options
 * @param {string} helperName
 */
function requireId(options, helperName) {
  if (!options.id) throw new Error(`${helperName}: "id" is required`)
}

/**
 * @param {{ id?: string, render?: Function }} options
 * @param {string} helperName
 */
function requireRender(options, helperName) {
  if (typeof options.render !== 'function') {
    throw new Error(`${helperName}(${options.id}): "render" is required`)
  }
}

/**
 * @typedef {object} MarkOptions
 * @property {string} tag
 * @property {string[]} [parseTags]
 * @property {number} [priority]
 * @property {string} [styleAttr]
 * @property {string[]} [attrs] HTML attribute names carried by the mark's tag (e.g. ['href', 'target']). Mutually exclusive with styleAttr.
 */

/**
 * @typedef {object} BlockOptions
 * @property {string} [tag]
 * @property {string[]} [parseTags]
 * @property {string[]} [containerTags]
 * @property {boolean} [void]
 * @property {number} [priority]
 * @property {boolean} [preserveTypeOnSplit]
 * @property {boolean} [exitOnEmptyEnter]
 * @property {boolean} [softBreakOnEnter]
 * @property {string} [softBreakSeparator]
 * @property {boolean} [neverSplitOnEnter]
 * @property {string[]} [attrs] HTML attribute names carried by a block's own tag (e.g. ['src', 'width', 'height'] for a void block, or ['data-checked'] for a non-void block)
 * @property {Record<string, string>} [attrDefaults] Default values for entries in `attrs` that are missing.
 * @property {string} [captionTag] Tag name for an optional text caption rendered as a child (e.g. 'figcaption')
 * @property {string} [wrapperTag] Wrapping tag used when a caption is present (e.g. 'figure'). Should also be listed in `parseTags`.
 * @property {Record<string, string>} [fixedAttrs] HTML attributes always emitted verbatim on the block's own tag, required to match on parse when present.
 * @property {boolean} [isContainer] Marks this block as a container whose `children` are other blocks (one level of nesting only).
 * @property {string} [childType] The block type allowed as this container's children. Required when `isContainer` is true.
 * @property {boolean} [childOnly] Marks this block as only reachable as a container's child — its tag is never registered globally.
 * @property {string} [contentTag] Wraps a non-void block's inline content in an inner tag instead of placing text nodes directly inside the block's own tag.
 * @property {Record<string, string>} [contentAttrs] HTML attributes for `contentTag`.
 * @property {{tag: string, fixedAttrs?: Record<string, string>}[]} [leading] Fixed, non-editable decorative elements rendered before the content.
 * @property {string} [tabCommand] Command name dispatched when Tab is pressed with the cursor inside this (child) block.
 * @property {string} [shiftTabCommand] Command name dispatched when Shift+Tab is pressed with the cursor inside this (child) block.
 */

/**
 * @typedef {object} ToolbarItemOptions
 * @property {string} id
 * @property {string} label
 * @property {string} [title]
 * @property {string} [shortcut]
 * @property {string} [command]
 * @property {string} [icon]
 * @property {string} [activeIcon]
 * @property {string} [iconClass]
 * @property {string} [activeIconClass]
 * @property {string} [activeMark]
 * @property {string} [group]
 * @property {number} [order]
 * @property {(ctx: PluginContext) => boolean} [isActive]
 * @property {(ctx: PluginContext) => boolean} [isEnabled]
 * @property {(ctx: PluginContext, meta: import('./types.js').ToolbarClickMeta) => void} [onClick]
 * @property {(ctx: PluginContext) => HTMLElement} [render]
 */

/**
 * @param {string} name
 * @param {MarkOptions} options
 * @returns {MarkDefinition}
 */
export function mark(name, options) {
  if (!name) {
    throw new Error('mark: "name" is required')
  }
  if (!options?.tag) {
    throw new Error(`mark(${name}): "tag" is required`)
  }

  const { tag, parseTags = [tag], priority, styleAttr, attrs } = options

  return {
    name,
    tag,
    parseTags,
    ...(priority !== undefined ? { priority } : {}),
    ...(styleAttr ? { styleAttr } : {}),
    ...(attrs?.length ? { attrs } : {}),
  }
}

/**
 * @param {string} type
 * @param {BlockOptions} [options]
 * @returns {BlockDefinition}
 */
export function block(type, options = {}) {
  if (!type) {
    throw new Error('block: "type" is required')
  }

  const tag = options.tag ?? type
  const parseTags = options.parseTags ?? [tag]

  return {
    type,
    tag,
    parseTags,
    ...(options.containerTags ? { containerTags: options.containerTags } : {}),
    ...(options.void ? { void: true } : {}),
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    ...(options.preserveTypeOnSplit ? { preserveTypeOnSplit: true } : {}),
    ...(options.exitOnEmptyEnter ? { exitOnEmptyEnter: true } : {}),
    ...(options.softBreakOnEnter ? { softBreakOnEnter: true } : {}),
    ...(options.softBreakSeparator ? { softBreakSeparator: options.softBreakSeparator } : {}),
    ...(options.neverSplitOnEnter ? { neverSplitOnEnter: true } : {}),
    ...(options.attrs?.length ? { attrs: options.attrs } : {}),
    ...(options.attrDefaults ? { attrDefaults: options.attrDefaults } : {}),
    ...(options.captionTag ? { captionTag: options.captionTag } : {}),
    ...(options.wrapperTag ? { wrapperTag: options.wrapperTag } : {}),
    ...(options.fixedAttrs ? { fixedAttrs: options.fixedAttrs } : {}),
    ...(options.isContainer ? { isContainer: true } : {}),
    ...(options.childType ? { childType: options.childType } : {}),
    ...(options.childOnly ? { childOnly: true } : {}),
    ...(options.contentTag ? { contentTag: options.contentTag } : {}),
    ...(options.contentAttrs ? { contentAttrs: options.contentAttrs } : {}),
    ...(options.leading?.length ? { leading: options.leading } : {}),
    ...(options.tabCommand ? { tabCommand: options.tabCommand } : {}),
    ...(options.shiftTabCommand ? { shiftTabCommand: options.shiftTabCommand } : {}),
  }
}

/**
 * @param {CommandHandler} handler
 * @returns {CommandHandler}
 */
export function command(handler) {
  if (typeof handler !== 'function') {
    throw new Error('command: handler must be a function')
  }
  return handler
}

/**
 * @param {string} markName
 * @returns {CommandHandler}
 */
command.toggleMark = function toggleMarkCommand(markName) {
  return (state, registries) => toggleMark(state, registries, markName)
}

/**
 * @param {string} blockType
 * @returns {CommandHandler}
 */
command.insertBlock = function insertBlockCommand(blockType) {
  return (state, registries) => insertBlock(state, registries, blockType)
}

/**
 * Returns a command handler that sets the type of all text blocks in the
 * current selection. The block type is passed as the command payload.
 *
 * @returns {import('./types.js').CommandHandler}
 */
command.setBlockType = function setBlockTypeCommand() {
  return (state, registries, blockType) => {
    if (typeof blockType !== 'string' || !blockType) return state
    return setBlockType(state, registries, blockType)
  }
}

/**
 * Returns a command handler that sets the block type for the current selection.
 * When the selection spans multiple text blocks, merges them into one block.
 *
 * @returns {import('./types.js').CommandHandler}
 */
command.setBlockTypeForSelection = function setBlockTypeForSelectionCommand() {
  return (state, registries, blockType) => {
    if (typeof blockType !== 'string' || !blockType) return state
    return setBlockTypeForSelection(state, registries, blockType)
  }
}

/**
 * @param {string} markName
 * @returns {import('./types.js').CommandHandler}
 */
command.setMarkAttr = function setMarkAttrCommand(markName) {
  return (state, registries, value) => {
    if (typeof value !== 'string' || !value) return state
    return setMarkAttr(state, registries, markName, value)
  }
}

/**
 * @param {string} markName
 * @returns {import('./types.js').CommandHandler}
 */
command.clearMarkAttr = function clearMarkAttrCommand(markName) {
  return (state, registries) => clearMarkAttr(state, registries, markName)
}

/**
 * @param {ToolbarItemOptions} options
 * @returns {ToolbarItem}
 */
export function toolbarItem(options) {
  const { id, label, shortcut, activeMark, isActive, isEnabled, render } = options

  if (!id) {
    throw new Error('toolbarItem: "id" is required')
  }
  if (!label) {
    throw new Error(`toolbarItem(${id}): "label" is required`)
  }

  const commandName = options.command ?? (options.onClick || render ? undefined : id)
  const title = options.title ?? `${id}.title`

  /** @type {ToolbarItem} */
  const item = {
    id,
    label,
    title,
    group: options.group ?? 'default',
    order: options.order ?? 0,
    ...(commandName ? { command: commandName } : {}),
    ...(shortcut ? { shortcut } : {}),
    ...(options.icon ? { icon: options.icon } : {}),
    ...(options.activeIcon ? { activeIcon: options.activeIcon } : {}),
    ...(options.iconClass ? { iconClass: options.iconClass } : {}),
    ...(options.activeIconClass ? { activeIconClass: options.activeIconClass } : {}),
    ...(options.onClick ? { onClick: options.onClick } : {}),
    ...(render ? { render } : {}),
    isEnabled: isEnabled ?? ((ctx) => ctx.getMode() === 'editor'),
  }

  if (isActive) {
    item.isActive = isActive
  } else if (activeMark) {
    item.isActive = (ctx) => ctx.getActiveMarks().includes(activeMark)
  }

  return item
}

/**
 * @typedef {object} ToolbarSeparatorOptions
 * @property {string} [id]
 * @property {string} [group]
 * @property {number} [order]
 */

/**
 * @param {ToolbarSeparatorOptions} [options]
 * @returns {import('./types.js').ToolbarSeparator}
 */
export function toolbarSeparator(options = {}) {
  return {
    type: 'separator',
    id: options.id,
    group: options.group ?? 'default',
    order: options.order ?? 0,
  }
}

/**
 * @param {string} key
 * @param {string} commandName
 * @returns {Record<string, string>}
 */
export function shortcut(key, commandName) {
  if (!key) {
    throw new Error('shortcut: key is required')
  }
  if (!commandName) {
    throw new Error('shortcut: command name is required')
  }

  return { [key]: commandName }
}

/**
 * @typedef {object} ThemeDefinition
 * @property {string} id
 * @property {string} label
 */

/**
 * @param {string | ThemeDefinition} idOrDef
 * @param {string} [label]
 * @returns {ThemeDefinition}
 */
export function theme(idOrDef, label) {
  const definition =
    typeof idOrDef === 'object' ? idOrDef : { id: idOrDef, label: label ?? '' }

  if (!definition.id) {
    throw new Error('theme: "id" is required')
  }
  if (!definition.label) {
    throw new Error(`theme(${definition.id}): "label" is required`)
  }

  return definition
}

/**
 * @typedef {object} StatusbarItemOptions
 * @property {string} id
 * @property {'left' | 'center' | 'right'} slot
 * @property {(ctx: PluginContext) => HTMLElement} render
 */

/**
 * @param {StatusbarItemOptions} options
 */
export function statusbarItem(options) {
  requireId(options, 'statusbarItem')
  if (!options.slot) throw new Error(`statusbarItem(${options.id}): "slot" is required`)
  requireRender(options, 'statusbarItem')
  return options
}

/**
 * @typedef {object} SidebarPanelOptions
 * @property {string} id
 * @property {string} [title]
 * @property {(ctx: PluginContext) => HTMLElement} render
 */

/**
 * @param {SidebarPanelOptions} options
 */
export function sidebarPanel(options) {
  requireId(options, 'sidebarPanel')
  requireRender(options, 'sidebarPanel')
  return options
}

/**
 * @typedef {object} ContextMenuItemOptions
 * @property {string} id
 * @property {string} label
 * @property {string} [command]
 * @property {boolean} [separator]
 * @property {(ctx: PluginContext) => boolean} [when]
 */

/**
 * @param {ContextMenuItemOptions} options
 */
export function contextMenuItem(options) {
  if (!options.id && !options.separator) {
    throw new Error('contextMenuItem: "id" is required')
  }
  return options
}

/**
 * @typedef {object} ContextMenuOptions
 * @property {string} id
 * @property {ContextMenuItemOptions[]} items
 * @property {(ctx: PluginContext) => boolean} [when]
 */

/**
 * @param {ContextMenuOptions} options
 */
export function contextMenu(options) {
  requireId(options, 'contextMenu')
  return options
}

/** @param {ContextMenuOptions} options */
export function selectionMenu(options) {
  return contextMenu(options)
}

/**
 * @typedef {object} InspectorOptions
 * @property {string} id
 * @property {string} [title]
 * @property {(ctx: PluginContext) => HTMLElement} render
 */

/**
 * @param {InspectorOptions} options
 */
export function inspectorPanel(options) {
  requireId(options, 'inspectorPanel')
  requireRender(options, 'inspectorPanel')
  return options
}

/**
 * @typedef {object} OverlayOptions
 * @property {string} id
 * @property {(ctx: PluginContext) => HTMLElement} render
 */

/**
 * @param {OverlayOptions} options
 */
export function overlay(options) {
  requireId(options, 'overlay')
  requireRender(options, 'overlay')
  return options
}

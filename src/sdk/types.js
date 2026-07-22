/**
 * Public SDK types — stable contract for plugins.
 * Plugins should reference only these types, never internal Core modules.
 */

/**
 * @typedef {object} TextNode
 * @property {'text'} type
 * @property {string} text
 * @property {string[]} [marks]
 * @property {Record<string, string>} [markAttrs]
 */

/**
 * @typedef {object} ParagraphNode
 * @property {'paragraph'} type
 * @property {TextNode[]} content
 */

/**
 * @typedef {object} HrNode
 * @property {'hr'} type
 */

/** @typedef {ParagraphNode | HrNode} BlockNode */

/**
 * @typedef {object} DocNode
 * @property {'doc'} type
 * @property {BlockNode[]} content
 */

/**
 * @typedef {object} Pos
 * @property {number} block
 * @property {number} offset
 */

/**
 * @typedef {object} EditorSelection
 * @property {Pos} anchor
 * @property {Pos} focus
 */

/**
 * @typedef {object} EditorState
 * @property {DocNode} doc
 * @property {EditorSelection} selection
 * @property {string[]} [storedMarks]
 * @property {Record<string, string>} [storedMarkAttrs]
 */

/**
 * @typedef {object} MarkDefinition
 * @property {string} name
 * @property {string} tag
 * @property {string[]} parseTags
 * @property {number} [priority]
 * @property {string} [styleAttr]
 * @property {string[]} [attrs] HTML attribute names carried by the mark's tag (e.g. ['href', 'target']). Mutually exclusive with styleAttr.
 */

/**
 * @typedef {object} BlockDefinition
 * @property {string} type
 * @property {string} tag
 * @property {string[]} parseTags
 * @property {string[]} [containerTags]
 * @property {boolean} [void]
 * @property {number} [priority]
 * @property {boolean} [preserveTypeOnSplit] Keep block type when Enter splits (default: false → paragraph)
 * @property {boolean} [exitOnEmptyEnter] Exit to paragraph on Enter in empty block after same-type sibling
 * @property {boolean} [softBreakOnEnter] Enter inserts a line break inside the block; double Enter exits to paragraph
 * @property {string} [softBreakSeparator] Character inserted by Enter inside `softBreakOnEnter` blocks (default: U+2029)
 * @property {boolean} [neverSplitOnEnter] Enter always inserts a literal line break inside the block; never splits or exits
 * @property {string[]} [attrs] HTML attribute names carried by a block's own tag (e.g. ['src', 'width', 'height'] for a void block, or ['data-checked'] for a non-void block)
 * @property {Record<string, string>} [attrDefaults] Default values for entries in `attrs` that are missing (freshly created block, or parsed from an element lacking the attribute) — e.g. `{'data-checked': 'false'}` so a new task-item always serializes with an explicit `data-checked`.
 * @property {string} [captionTag] Tag name for an optional text caption rendered as a child (e.g. 'figcaption')
 * @property {string} [wrapperTag] Wrapping tag used when a caption is present (e.g. 'figure'). Should also be listed in `parseTags`.
 * @property {Record<string, string>} [fixedAttrs] HTML attributes always emitted verbatim on the block's own tag (e.g. `{'data-task-list': 'true'}`), and required to match on parse when present.
 * @property {boolean} [isContainer] Marks this block as a container whose `children` are other blocks (one level of nesting only).
 * @property {string} [childType] The block type allowed as this container's children. Required when `isContainer` is true.
 * @property {boolean} [childOnly] Marks this block as only reachable as a container's child — its tag is never registered globally, so unrelated markup using the same tag falls back to normal handling (e.g. a plain `<li>` becomes a paragraph).
 * @property {string} [contentTag] Wraps a non-void block's inline content in an inner tag (e.g. 'span') instead of placing text nodes directly inside the block's own tag.
 * @property {Record<string, string>} [contentAttrs] HTML attributes for `contentTag`.
 * @property {{tag: string, fixedAttrs?: Record<string, string>}[]} [leading] Fixed, non-editable decorative elements rendered before the content (e.g. a task-item's checkbox `<input>`).
 * @property {string} [tabCommand] Command name dispatched when Tab is pressed with the cursor inside this (child) block. Core has no Tab handling of its own — this is the only way a plugin block reacts to Tab.
 * @property {string} [shiftTabCommand] Command name dispatched when Shift+Tab is pressed with the cursor inside this (child) block.
 */

/**
 * @typedef {object} ToolbarClickMeta
 * @property {HTMLButtonElement} anchor
 * @property {MouseEvent} event
 */

/**
 * @typedef {object} ToolbarItem
 * @property {string} id
 * @property {string} label
 * @property {string} [title]
 * @property {string} [shortcut]
 * @property {string} [command]
 * @property {string} [icon]
 * @property {string} [activeIcon]
 * @property {string} [iconClass]
 * @property {string} [activeIconClass]
 * @property {string} [group]
 * @property {number} [order]
 * @property {(ctx: PluginContext) => boolean} [isActive]
 * @property {(ctx: PluginContext) => boolean} [isEnabled]
 * @property {(ctx: PluginContext, meta: ToolbarClickMeta) => void} [onClick]
 * @property {(ctx: PluginContext) => HTMLElement} [render]
 */

/**
 * @typedef {object} ToolbarSeparator
 * @property {'separator'} type
 * @property {string} [id]
 * @property {string} [group]
 * @property {number} [order]
 */

/** @typedef {ToolbarItem | ToolbarSeparator} ToolbarCapabilityItem */

/**
 * @typedef {object} PluginCapabilities
 * @property {MarkDefinition[]} [marks]
 * @property {BlockDefinition[]} [blocks]
 * @property {Record<string, CommandHandler>} [commands]
 * @property {ToolbarCapabilityItem[]} [toolbar]
 * @property {Record<string, string>} [shortcuts]
 * @property {Record<string, Record<string, string>>} [i18n]
 * @property {import('../ui/runtime/ui-capabilities.js').StatusbarItemDef[]} [statusbar]
 * @property {import('../ui/runtime/ui-capabilities.js').SidebarPanelDef[]} [sidebar]
 * @property {import('../ui/runtime/ui-capabilities.js').ContextMenuDef[]} [contextMenu]
 * @property {import('../ui/runtime/ui-capabilities.js').SelectionMenuDef[]} [selectionMenu]
 * @property {import('../ui/runtime/ui-capabilities.js').InspectorDef[]} [inspector]
 * @property {import('../ui/runtime/ui-capabilities.js').OverlayDef[]} [overlays]
 */

/**
 * @typedef {object} CommandRegistries
 * @description Editor instance registries (marks, blocks, commands).
 * Passed automatically to command handlers by the runtime.
 */

/**
 * @typedef {(state: EditorState, registries: CommandRegistries, payload?: unknown) => EditorState} CommandHandler
 */

/**
 * @typedef {import('./services/types.js').PluginServices} PluginServices
 */

/**
 * @typedef {object} DesignSystem
 * @property {(opts: ButtonOpts) => HTMLButtonElement} createButton
 * @property {(opts: ToggleButtonOpts) => HTMLButtonElement} createToggleButton
 * @property {(opts: ToolbarItem & { onClick?: () => void }) => HTMLButtonElement} createToolbarItem
 * @property {(svg: string, options?: { name?: string, label?: string }) => HTMLElement} createIcon
 * @property {(opts: ButtonOpts) => HTMLButtonElement} Button
 * @property {(opts: ButtonOpts) => HTMLButtonElement} IconButton
 * @property {(opts: ToggleButtonOpts) => HTMLButtonElement} Toggle
 * @property {(...args: any[]) => any} Input
 * @property {(...args: any[]) => any} Textarea
 * @property {(...args: any[]) => any} Select
 * @property {(opts: RichSelectOpts) => RichSelectApi} RichSelect
 * @property {(...args: any[]) => any} Checkbox
 * @property {(...args: any[]) => any} Radio
 * @property {(...args: any[]) => any} Separator
 * @property {(...args: any[]) => any} Divider
 * @property {(...args: any[]) => any} Badge
 * @property {(...args: any[]) => any} Spinner
 * @property {(...args: any[]) => any} Dropdown
 * @property {(...args: any[]) => any} Menu
 * @property {(...args: any[]) => any} ContextMenu
 * @property {(...args: any[]) => any} Tooltip
 * @property {(opts: ToolbarItem & { onClick?: () => void }) => HTMLButtonElement} createToolbarButton
 * @property {(opts: any) => { open: () => any, close: () => void, destroy: () => void }} createPopover
 * @property {(opts: any) => { open: () => any, close: () => void, destroy: () => void }} createDialog
 * @property {(opts: any) => HTMLElement} createDropdown
 * @property {(opts: any) => { open: (e: Event) => any, close: () => void, destroy: () => void }} createContextMenu
 * @property {(opts: any) => { open: (anchor: HTMLElement) => any, close: () => void, destroy: () => void }} createFloatingPanel
 * @property {(opts: any) => { destroy: () => void }} createInspector
 * @property {(opts: any) => { open: () => any, close: () => void, destroy: () => void }} createColorPicker
 * @property {(opts: any) => { show: () => void, hide: () => void, destroy: () => void }} createTooltip
 * @property {(slot: 'left' | 'center' | 'right', element: HTMLElement, id?: string) => void} mountStatusbar
 * @property {(element: HTMLElement, id?: string) => void} mountSidebar
 */

/**
 * @typedef {object} ButtonOpts
 * @property {string} [labelKey]
 * @property {string} [label]
 * @property {string} [titleKey]
 * @property {string} [title]
 * @property {string} [className]
 * @property {() => void} [onClick]
 */

/** @typedef {ButtonOpts} ToggleButtonOpts */

/**
 * @typedef {object} RichSelectOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} [disabled]
 * @property {string} [fontFamily]
 */

/**
 * @typedef {object} RichSelectOpts
 * @property {RichSelectOption[]} [options]
 * @property {string} [value]
 * @property {string} [placeholder]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {boolean} [searchable]
 * @property {'top' | 'bottom'} [placement]
 * @property {HTMLElement} [portalRoot]
 * @property {(value: string) => void} [onChange]
 */

/**
 * @typedef {object} RichSelectApi
 * @property {HTMLElement} element
 * @property {(value: string) => void} setValue
 * @property {(label: string) => void} setLabel
 * @property {(options: RichSelectOption[]) => void} setOptions
 * @property {(placeholder: string) => void} setPlaceholder
 * @property {(t: (key: string) => string, opts?: { placeholder?: string, options?: RichSelectOption[] }) => void} relocalize
 * @property {() => void} sync
 * @property {() => void} destroy
 */

/**
 * @typedef {object} PluginContext
 * @property {() => EditorState} getState
 * @property {() => EditorSelection} selection
 * @property {() => string} getMode
 * @property {() => string[]} getActiveMarks
 * @property {(markName: string) => string | 'mixed' | null} getMarkAttr
 * @property {(key: string) => unknown} getOption
 * @property {(name: string, payload?: unknown) => boolean} execCommand
 * @property {(text: string) => void} insertText
 * @property {(blockType: string) => void} insertBlock
 * @property {(mark: string) => void} toggleMark
 * @property {(listener: (state: EditorState) => void) => () => void} subscribe
 * @property {(key: string) => string} t
 * @property {DesignSystem} ui
 * @property {PluginServices} services
 * @property {Record<string, Record<string, string[]>>} assets
 */

/**
 * @typedef {object} PluginDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} [version]
 * @property {PluginCapabilities} [capabilities]
 * @property {(ctx: PluginContext) => void} [activate]
 * @property {(ctx: PluginContext) => void} [deactivate]
 */

export {}

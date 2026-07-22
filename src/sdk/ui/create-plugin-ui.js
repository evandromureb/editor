import { createButton } from '../../ui/design-system/button.js'
import { createToggleButton } from '../../ui/design-system/toggle-button.js'
import { createIconButton } from '../../ui/design-system/icon-button.js'
import { createIcon } from '../../ui/design-system/icon.js'
import { createInput } from '../../ui/design-system/input.js'
import { createTextarea } from '../../ui/design-system/textarea.js'
import { createSelect } from '../../ui/design-system/select.js'
import { Select } from '../../ui/select/Select.js'
import { createCheckbox } from '../../ui/design-system/checkbox.js'
import { createRadio } from '../../ui/design-system/radio.js'
import { createSeparator, createDivider } from '../../ui/design-system/separator.js'
import { createBadge } from '../../ui/design-system/badge.js'
import { createSpinner } from '../../ui/design-system/spinner.js'
import { createDropdown } from '../../ui/design-system/dropdown.js'
import { createMenu } from '../../ui/design-system/menu.js'
import { createContextMenuElement } from '../../ui/design-system/context-menu.js'
import { createTooltip } from '../../ui/design-system/tooltip.js'
import { resolvePluginAssetUrl } from '../../ui/assets/resolve-plugin-asset-url.js'

/** @typedef {import('../../sdk/types.js').ToolbarItem} ToolbarItem */

/**
 * @typedef {ToolbarItem & {
 *   label?: string,
 *   title?: string,
 *   onClick?: () => void,
 * }} ToolbarItemOpts
 */

/**
 * @typedef {object} CreatePluginUiOpts
 * @property {(key: string) => string} t
 * @property {string} pluginId
 * @property {import('../runtime/plugin-ui-runtime.js').PluginUiRuntime} uiRuntime
 * @property {(pluginId: string, name: string) => string | null} resolveAsset
 */

/**
 * Creates the full `ctx.ui` object for a plugin.
 *
 * @param {CreatePluginUiOpts} opts
 */
export function createPluginUi({ t, pluginId, uiRuntime, resolveAsset }) {
  const resolve = (name) => resolveAsset(pluginId, name)

  const ui = {
    Button: (opts) =>
      createButton({
        ...opts,
        label: opts.labelKey ? t(opts.labelKey) : (opts.label ?? ''),
        title: opts.titleKey ? t(opts.titleKey) : (opts.title ?? ''),
      }),

    IconButton: (opts) =>
      createIconButton({
        ...opts,
        title: opts.titleKey ? t(opts.titleKey) : (opts.title ?? ''),
        iconSvg: opts.iconSvg ?? opts.icon,
      }),

    Toggle: (opts) =>
      createToggleButton({
        ...opts,
        label: opts.labelKey ? t(opts.labelKey) : (opts.label ?? ''),
        title: opts.titleKey ? t(opts.titleKey) : (opts.title ?? ''),
      }),

    Input: createInput,
    Textarea: createTextarea,
    Select: createSelect,

    /**
     * @param {import('../types.js').RichSelectOpts} opts
     * @returns {import('../types.js').RichSelectApi}
     */
    RichSelect(opts) {
      const select = new Select({
        options: opts.options,
        value: opts.value,
        className: opts.className,
        id: opts.id,
        name: opts.name,
        disabled: opts.disabled,
        placement: opts.placement,
        portalRoot: opts.portalRoot,
        searchable: opts.searchable,
        placeholder: opts.placeholder,
        onChange: opts.onChange,
        t,
      })

      return {
        element: select.element,
        setValue: (value) => select.setValue(value),
        setLabel: (label) => select.setLabel(label),
        setOptions: (options) => select.setOptions(options),
        setPlaceholder: (placeholder) => select.setPlaceholder(placeholder),
        relocalize: (nextT, relocalizeOpts) => select.relocalize(nextT, relocalizeOpts),
        sync: () => {},
        destroy: () => select.destroy(),
      }
    },
    Checkbox: createCheckbox,
    Radio: createRadio,
    Separator: createSeparator,
    Divider: createDivider,
    Badge: createBadge,
    Spinner: (className) => createSpinner(className, t),
    Dropdown: createDropdown,
    Menu: createMenu,
    ContextMenu: createContextMenuElement,
    Tooltip: createTooltip,

    Icon: (svg, options) => createIcon(svg, options),

    createButton(opts) {
      return ui.Button(opts)
    },

    createToggleButton(opts) {
      return ui.Toggle(opts)
    },

    createToolbarItem(opts) {
      const label = opts.labelKey ? t(opts.labelKey) : t(opts.label ?? '')
      const titleBase = opts.title
        ? t(opts.title)
        : opts.titleKey
          ? t(opts.titleKey)
          : label

      const button = createToggleButton({
        label: opts.icon ? '' : label,
        title: titleBase,
        className: `editor__toolbar-btn editor__toolbar-btn--${opts.id}`,
        onClick: opts.onClick,
      })

      if (opts.icon) {
        const iconClass = opts.iconClass ?? opts.id
        button.appendChild(createIcon(opts.icon, { name: iconClass, label }))
        if (opts.activeIcon) {
          const activeClass = opts.activeIconClass ?? `${opts.id}-active`
          button.appendChild(createIcon(opts.activeIcon, { name: activeClass, label }))
        }
        button.setAttribute('aria-label', titleBase)
      }

      button.dataset.plugin = opts.id
      if (opts.icon) {
        button.dataset.hasIcon = 'true'
      }
      return button
    },

    createIcon(svg, options) {
      return createIcon(svg, options)
    },

    createToolbarButton(opts) {
      return ui.createToolbarItem(opts)
    },

    createPopover(opts) {
      const id = opts.id ?? `popover-${pluginId}-${Date.now()}`
      let handle = null

      const api = {
        open() {
          if (handle) handle.close()
          handle = uiRuntime.openPopover(pluginId, { ...opts, id })
          return api
        },
        close() {
          uiRuntime.closePopover(id)
          handle = null
        },
        destroy() {
          api.close()
        },
      }

      return api
    },

    createDialog(opts) {
      const id = opts.id ?? `dialog-${pluginId}-${Date.now()}`
      let handle = null

      const api = {
        open() {
          if (handle) handle.close()
          handle = uiRuntime.openDialog(pluginId, { ...opts, id })
          return api
        },
        close() {
          uiRuntime.closeDialog(id)
          handle = null
        },
        destroy() {
          api.close()
        },
      }

      return api
    },

    createDropdown(opts) {
      return createDropdown(opts)
    },

    createContextMenu(opts) {
      const id = opts.id ?? `ctx-${pluginId}-${Date.now()}`
      const menu = createContextMenuElement(opts)

      const api = {
        open(event) {
          event.preventDefault()
          const { clientX: x, clientY: y } = event
          menu.style.position = 'fixed'
          menu.style.top = `${y}px`
          menu.style.left = `${x}px`
          uiRuntime.registerOverlay(pluginId, {
            id,
            element: menu,
            onClose: () => api.close(),
          })
        },
        close() {
          uiRuntime.closePopover(id)
          menu.remove()
        },
        destroy() {
          api.close()
        },
      }

      return api
    },

    createFloatingPanel(opts) {
      const id = opts.id ?? `panel-${pluginId}-${Date.now()}`
      const panel = document.createElement('div')
      panel.className = 'editor__floating-panel'
      if (opts.title) {
        const header = document.createElement('div')
        header.className = 'editor__floating-panel-header'
        header.textContent = opts.title
        panel.appendChild(header)
      }
      if (opts.content) {
        const body = document.createElement('div')
        body.className = 'editor__floating-panel-body'
        if (typeof opts.content === 'string') {
          body.textContent = opts.content
        } else {
          body.appendChild(opts.content)
        }
        panel.appendChild(body)
      }

      const api = {
        open(anchor) {
          uiRuntime.registerOverlay(pluginId, {
            id,
            element: panel,
            anchor,
            onClose: () => api.close(),
          })
        },
        close() {
          uiRuntime.closePopover(id)
        },
        destroy() {
          api.close()
        },
      }

      return api
    },

    createInspector(opts) {
      const panel = document.createElement('div')
      panel.className = 'editor__inspector'
      if (opts.title) {
        const header = document.createElement('div')
        header.className = 'editor__inspector-header'
        header.textContent = opts.title
        panel.appendChild(header)
      }
      if (opts.content) {
        const body = document.createElement('div')
        body.className = 'editor__inspector-body'
        if (typeof opts.content === 'string') {
          body.textContent = opts.content
        } else {
          body.appendChild(opts.content)
        }
        panel.appendChild(body)
      }

      uiRuntime.mountSlot('sidebar', pluginId, panel, opts.id)
      uiRuntime.slots.getContainer('sidebar').hidden = false

      return {
        destroy() {
          uiRuntime.unmountSlot('sidebar', pluginId, opts.id ?? panel.dataset.pluginSlot ?? '')
          const sidebar = uiRuntime.slots.getContainer('sidebar')
          if (sidebar && sidebar.childElementCount === 0) {
            sidebar.hidden = true
          }
        },
      }
    },

    createColorPicker(opts) {
      const content = document.createElement('div')
      content.className = 'editor__color-picker'

      const colors = opts.colors ?? [
        '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
        '#ffff00', '#ff00ff', '#00ffff', '#888888', '#444444',
      ]

      for (const color of colors) {
        const swatch = document.createElement('button')
        swatch.type = 'button'
        swatch.className = 'editor__color-swatch'
        swatch.style.backgroundColor = color
        swatch.title = color
        swatch.addEventListener('click', () => opts.onSelect?.(color))
        content.appendChild(swatch)
      }

      return ui.createPopover({
        id: opts.id,
        anchor: opts.anchor,
        content,
        onClose: opts.onClose,
      })
    },

    createTooltip(opts) {
      return createTooltip(opts)
    },

    mountStatusbar(slot, element, id) {
      uiRuntime.mountSlot(`statusbar-${slot}`, pluginId, element, id)
    },

    mountSidebar(element, id) {
      uiRuntime.mountSlot('sidebar', pluginId, element, id)
      uiRuntime.slots.getContainer('sidebar').hidden = false
    },
  }

  return ui
}

export { createButton, createToggleButton, createIcon } from '../../ui/design-system/index.js'

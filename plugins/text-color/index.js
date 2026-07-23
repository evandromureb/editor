import { definePlugin, mark, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @typedef {{ label: string, value: string, labelKey?: string }} TextColorItem */
/** @typedef {{ items: TextColorItem[] }} TextColorConfig */

const MARK_NAME = 'text-color'

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.433 10.07C14.133 10.585 16 11.15 16 8a8 8 0 1 0-8 8c1.996 0 1.826-1.504 1.649-3.08-.124-1.101-.252-2.237.351-2.92.465-.527 1.42-.237 2.433.07M8 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m4.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>`

const DEFAULT_TEXT_COLOR_CONFIG = {
  items: [
    { labelKey: 'textColor.color.black', label: 'Preto', value: '#000000' },
    { labelKey: 'textColor.color.gray', label: 'Cinza', value: '#6b7280' },
    { labelKey: 'textColor.color.blue', label: 'Azul', value: '#2563eb' },
    { labelKey: 'textColor.color.green', label: 'Verde', value: '#16a34a' },
    { labelKey: 'textColor.color.red', label: 'Vermelho', value: '#dc2626' },
    { labelKey: 'textColor.color.purple', label: 'Roxo', value: '#9333ea' },
    { labelKey: 'textColor.color.orange', label: 'Laranja', value: '#ea580c' },
  ],
}

/** @type {TextColorConfig} */
let pluginConfig = { items: [...DEFAULT_TEXT_COLOR_CONFIG.items] }

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {HTMLButtonElement | null} */
let buttonEl = null

/** @type {HTMLSpanElement | null} */
let barEl = null

/** @type {{ close: () => void, destroy: () => void } | null} */
let popoverApi = null

/**
 * @param {unknown} config
 * @returns {TextColorConfig}
 */
function resolveConfig(config) {
  const input = /** @type {{ items?: TextColorItem[] }} */ (config ?? {})
  const items = input.items?.length
    ? input.items.map((item) => ({ label: item.label, value: item.value }))
    : DEFAULT_TEXT_COLOR_CONFIG.items
  return { items }
}

/**
 * Converts any CSS color value to lowercase #rrggbb hex.
 * Returns null if the input is empty or cannot be converted.
 * @param {string} color
 * @returns {string | null}
 */
function normalizeColor(color) {
  if (!color) return null
  const trimmed = color.trim()

  // Already a 6-digit hex
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()

  // rgb(r, g, b) — produced by browser style parsing
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgbMatch) {
    return (
      '#' +
      [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
        .map((n) => parseInt(n, 10).toString(16).padStart(2, '0'))
        .join('')
    )
  }

  return null
}

/**
 * @param {PluginContext} ctx
 */
function syncButton(ctx) {
  if (!barEl) return
  const current = ctx.getMarkAttr(MARK_NAME)
  if (!current || current === 'mixed') {
    barEl.style.backgroundColor = ''
  } else {
    barEl.style.backgroundColor = normalizeColor(current) ?? current
  }
}

/**
 * Closes the popover and immediately nullifies the reference.
 * OverlayStack.remove() does not invoke onClose, so we must reset here
 * whenever we close programmatically to keep popoverApi in sync.
 */
function closePopover() {
  const api = popoverApi
  popoverApi = null
  api?.close()
}

/**
 * Builds and opens the color picker popover anchored to the toolbar button.
 * Calling while open closes it (toggle behaviour).
 * @param {PluginContext} ctx
 */
function toggleColorPopover(ctx) {
  if (popoverApi) {
    closePopover()
    return
  }

  if (!buttonEl) return

  const current = ctx.getMarkAttr(MARK_NAME)
  const currentHex = current && current !== 'mixed' ? normalizeColor(current) : null

  const content = document.createElement('div')
  content.className = 'editor__text-color-popover'

  // "No color" swatch — clears the mark
  const clearSwatch = document.createElement('button')
  clearSwatch.type = 'button'
  clearSwatch.className = 'editor__text-color-swatch editor__text-color-swatch--clear'
  clearSwatch.title = ctx.t('textColor.clear')
  if (!currentHex) clearSwatch.classList.add('is-active')
  clearSwatch.addEventListener('click', () => {
    ctx.execCommand('text-color.clear')
    closePopover()
  })
  content.appendChild(clearSwatch)

  // Preset color swatches
  for (const item of pluginConfig.items) {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'editor__text-color-swatch'
    swatch.style.backgroundColor = item.value
    swatch.title = item.labelKey ? ctx.t(item.labelKey) : item.label
    if (currentHex === item.value.toLowerCase()) swatch.classList.add('is-active')
    swatch.addEventListener('click', () => {
      ctx.execCommand('text-color.set', item.value)
      closePopover()
    })
    content.appendChild(swatch)
  }

  // Divider
  const divider = document.createElement('span')
  divider.className = 'editor__text-color-divider'
  content.appendChild(divider)

  // Hidden native color input for the custom picker
  const customInput = document.createElement('input')
  customInput.type = 'color'
  customInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none'
  customInput.value = currentHex ?? '#000000'
  customInput.addEventListener('input', () => {
    ctx.execCommand('text-color.set', customInput.value)
  })
  customInput.addEventListener('change', () => {
    closePopover()
  })

  // "Custom color..." pill button
  const customBtn = document.createElement('button')
  customBtn.type = 'button'
  customBtn.className = 'editor__text-color-custom'
  customBtn.textContent = ctx.t('textColor.custom')
  customBtn.addEventListener('click', () => customInput.click())

  content.appendChild(customInput)
  content.appendChild(customBtn)

  popoverApi = ctx.ui.createPopover({
    id: 'text-color-popover',
    anchor: buttonEl,
    content,
    onClose: () => {
      popoverApi = null
    },
  })
  popoverApi.open()
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountTextColorButton(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__text-color'

  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'text-color',
      label: 'textColor.label',
      title: 'textColor.title',
      icon: ICON,
      onClick: () => toggleColorPopover(ctx),
    })
  )

  barEl = document.createElement('span')
  barEl.className = 'editor__text-color-bar'
  buttonEl.appendChild(barEl)

  wrapper.appendChild(buttonEl)

  wrapper.sync = () => {
    if (buttonEl?.isConnected) syncButton(ctx)
  }

  wrapper.destroy = () => {
    closePopover()
    buttonEl = null
    barEl = null
  }

  wrapper.relocalize = () => {
    if (!buttonEl) return
    const titleBase = ctx.t('textColor.title')
    buttonEl.title = titleBase
    buttonEl.setAttribute('aria-label', titleBase)
  }

  syncButton(ctx)
  return wrapper
}

export default definePlugin({
  id: 'text-color',
  name: 'Text Color',
  version: '1.0.0',

  capabilities: {
    marks: [
      mark('text-color', {
        tag: 'span',
        parseTags: ['span'],
        styleAttr: 'color',
        priority: 12,
      }),
    ],
    commands: {
      'text-color.set': command.setMarkAttr('text-color'),
      'text-color.clear': command.clearMarkAttr('text-color'),
    },
    toolbar: [
      toolbarItem({
        id: 'text-color',
        label: 'textColor.label',
        title: 'textColor.title',
        group: 'color',
        order: 20,
        render: mountTextColorButton,
      }),
    ],
  },

  activate(ctx) {
    pluginConfig = resolveConfig(ctx.getOption('textColor'))
    unsubscribe = ctx.subscribe(() => syncButton(ctx))
  },

  deactivate(ctx) {
    unsubscribe?.()
    unsubscribe = null
    closePopover()
    buttonEl = null
    barEl = null
    ctx.services.overlay.closePopover('text-color-popover')
  },
})

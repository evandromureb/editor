import { definePlugin, mark, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @typedef {{ label: string, value: string, labelKey?: string }} HighlightItem */
/** @typedef {{ items: HighlightItem[] }} HighlightConfig */

const MARK_NAME = 'highlight'

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.096.644a2 2 0 0 1 2.791.036l1.433 1.433a2 2 0 0 1 .035 2.791l-.413.435-8.07 8.995a.5.5 0 0 1-.372.166h-3a.5.5 0 0 1-.234-.058l-.412.412A.5.5 0 0 1 2.5 15h-2a.5.5 0 0 1-.354-.854l1.412-1.412A.5.5 0 0 1 1.5 12.5v-3a.5.5 0 0 1 .166-.372l8.995-8.07zm-.115 1.47L2.727 9.52l3.753 3.753 7.406-8.254zm3.585 2.17.064-.068a1 1 0 0 0-.017-1.396L13.18 1.387a1 1 0 0 0-1.396-.018l-.068.065zM5.293 13.5 2.5 10.707v1.586L3.707 13.5z"/></svg>`

const DEFAULT_HIGHLIGHT_CONFIG = {
  items: [
    { labelKey: 'highlight.color.yellow', label: 'Amarelo', value: '#fef08a' },
    { labelKey: 'highlight.color.lightGreen', label: 'Verde claro', value: '#bbf7d0' },
    { labelKey: 'highlight.color.lightBlue', label: 'Azul claro', value: '#bfdbfe' },
    { labelKey: 'highlight.color.pink', label: 'Rosa', value: '#fbcfe8' },
    { labelKey: 'highlight.color.lightPurple', label: 'Roxo claro', value: '#e9d5ff' },
    { labelKey: 'highlight.color.lightOrange', label: 'Laranja claro', value: '#fed7aa' },
    { labelKey: 'highlight.color.lightGray', label: 'Cinza claro', value: '#e2e8f0' },
  ],
}

/** @type {HighlightConfig} */
let pluginConfig = { items: [...DEFAULT_HIGHLIGHT_CONFIG.items] }

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
 * @returns {HighlightConfig}
 */
function resolveConfig(config) {
  const input = /** @type {{ items?: HighlightItem[] }} */ (config ?? {})
  const items = input.items?.length
    ? input.items.map((item) => ({ label: item.label, value: item.value }))
    : DEFAULT_HIGHLIGHT_CONFIG.items
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
function toggleHighlightPopover(ctx) {
  if (popoverApi) {
    closePopover()
    return
  }

  if (!buttonEl) return

  const current = ctx.getMarkAttr(MARK_NAME)
  const currentHex = current && current !== 'mixed' ? normalizeColor(current) : null

  const content = document.createElement('div')
  content.className = 'editor__highlight-popover'

  // "No highlight" swatch — clears the mark
  const clearSwatch = document.createElement('button')
  clearSwatch.type = 'button'
  clearSwatch.className = 'editor__highlight-swatch editor__highlight-swatch--clear'
  clearSwatch.title = ctx.t('highlight.clear')
  if (!currentHex) clearSwatch.classList.add('is-active')
  clearSwatch.addEventListener('click', () => {
    ctx.execCommand('highlight.clear')
    closePopover()
  })
  content.appendChild(clearSwatch)

  // Preset color swatches
  for (const item of pluginConfig.items) {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'editor__highlight-swatch'
    swatch.style.backgroundColor = item.value
    swatch.title = item.labelKey ? ctx.t(item.labelKey) : item.label
    if (currentHex === item.value.toLowerCase()) swatch.classList.add('is-active')
    swatch.addEventListener('click', () => {
      ctx.execCommand('highlight.set', item.value)
      closePopover()
    })
    content.appendChild(swatch)
  }

  // Divider
  const divider = document.createElement('span')
  divider.className = 'editor__highlight-divider'
  content.appendChild(divider)

  // Hidden native color input for the custom picker
  const customInput = document.createElement('input')
  customInput.type = 'color'
  customInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none'
  customInput.value = currentHex ?? '#fef08a'
  customInput.addEventListener('input', () => {
    ctx.execCommand('highlight.set', customInput.value)
  })
  customInput.addEventListener('change', () => {
    closePopover()
  })

  // "Custom color..." pill button
  const customBtn = document.createElement('button')
  customBtn.type = 'button'
  customBtn.className = 'editor__highlight-custom'
  customBtn.textContent = ctx.t('highlight.custom')
  customBtn.addEventListener('click', () => customInput.click())

  content.appendChild(customInput)
  content.appendChild(customBtn)

  popoverApi = ctx.ui.createPopover({
    id: 'highlight-popover',
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
function mountHighlightButton(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__highlight'

  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'highlight',
      label: 'highlight.label',
      title: 'highlight.title',
      icon: ICON,
      onClick: () => toggleHighlightPopover(ctx),
    })
  )

  barEl = document.createElement('span')
  barEl.className = 'editor__highlight-bar'
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
    const titleBase = ctx.t('highlight.title')
    buttonEl.title = titleBase
    buttonEl.setAttribute('aria-label', titleBase)
  }

  syncButton(ctx)
  return wrapper
}

export default definePlugin({
  id: 'highlight',
  name: 'Highlight',
  version: '1.0.0',

  capabilities: {
    marks: [
      mark('highlight', {
        tag: 'span',
        parseTags: ['span'],
        styleAttr: 'background-color',
        priority: 11,
      }),
    ],
    commands: {
      'highlight.set': command.setMarkAttr('highlight'),
      'highlight.clear': command.clearMarkAttr('highlight'),
    },
    toolbar: [
      toolbarItem({
        id: 'highlight',
        label: 'highlight.label',
        title: 'highlight.title',
        group: 'color',
        order: 10,
        render: mountHighlightButton,
      }),
    ],
  },

  activate(ctx) {
    pluginConfig = resolveConfig(ctx.getOption('highlight'))
    unsubscribe = ctx.subscribe(() => syncButton(ctx))
  },

  deactivate(ctx) {
    unsubscribe?.()
    unsubscribe = null
    closePopover()
    buttonEl = null
    barEl = null
    ctx.services.overlay.closePopover('highlight-popover')
  },
})

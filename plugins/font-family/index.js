import { definePlugin, mark, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @typedef {{ label: string, value: string, fontFamily?: string }} FontFamilyItem */

/** @typedef {{ defaultValue: string, defaultLabel: string, items: FontFamilyItem[] }} FontFamilyConfig */

const MARK_NAME = 'font-family'
const CLEAR_VALUE = '__font-family-clear__'

/** @type {FontFamilyConfig} */
const DEFAULT_FONT_FAMILY_CONFIG = {
  defaultLabel: 'Arial',
  defaultValue: 'Arial, sans-serif',
  items: [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman', value: "'Times New Roman', serif" },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Courier New', value: "'Courier New', monospace" },
  ],
}

/** @type {FontFamilyConfig} */
let pluginConfig = { ...DEFAULT_FONT_FAMILY_CONFIG, items: [...DEFAULT_FONT_FAMILY_CONFIG.items] }

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {import('@baselab/plugin-sdk').RichSelectApi | null} */
let selectApi = null

/**
 * @param {unknown} config
 * @returns {FontFamilyConfig}
 */
function resolveConfig(config) {
  const input = /** @type {{ default?: string, items?: FontFamilyItem[] }} */ (config ?? {})
  const items = (input.items?.length ? input.items : DEFAULT_FONT_FAMILY_CONFIG.items).map(
    (item) => ({
      label: item.label,
      value: item.value,
      fontFamily: item.fontFamily ?? item.value,
    }),
  )

  const defaultLabel = input.default ?? DEFAULT_FONT_FAMILY_CONFIG.defaultLabel
  const matched = items.find((item) => item.label === defaultLabel || item.value === defaultLabel)

  return {
    defaultLabel: matched?.label ?? items[0]?.label ?? defaultLabel,
    defaultValue: matched?.value ?? items[0]?.value ?? DEFAULT_FONT_FAMILY_CONFIG.defaultValue,
    items,
  }
}

/**
 * @param {PluginContext} ctx
 * @returns {FontFamilyItem[]}
 */
function buildSelectOptions(ctx) {
  return [
    ...pluginConfig.items.map((item) => ({
      value: item.value,
      label: item.label,
      fontFamily: item.fontFamily ?? item.value,
    })),
    {
      value: CLEAR_VALUE,
      label: ctx.t('fontFamily.clear'),
      disabled: false,
    },
  ]
}

/**
 * @param {PluginContext} ctx
 */
function syncSelect(ctx) {
  if (!selectApi) return

  const current = ctx.getMarkAttr(MARK_NAME)

  if (current === 'mixed') {
    selectApi.setLabel(ctx.t('fontFamily.mixed'))
    return
  }

  if (!current) {
    selectApi.setLabel(pluginConfig.defaultLabel)
    return
  }

  const matched = pluginConfig.items.find((item) => item.value === current)
  if (matched) {
    selectApi.setValue(matched.value)
    return
  }

  selectApi.setLabel(current)
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountFontFamilySelect(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__font-family'

  selectApi = ctx.ui.RichSelect({
    id: 'font-family-select',
    name: 'font-family',
    className: 'editor__font-family-select',
    placement: 'bottom',
    portalRoot: ctx.services.viewport.getOverlayRoot(),
    placeholder: pluginConfig.defaultLabel,
    options: buildSelectOptions(ctx),
    value: pluginConfig.defaultValue,
    onChange: (value) => {
      if (value === CLEAR_VALUE) {
        ctx.execCommand('font-family.clear')
        return
      }
      ctx.execCommand('font-family.set', value)
    },
  })

  wrapper.appendChild(selectApi.element)

  wrapper.sync = () => {
    if (selectApi?.element.isConnected) {
      syncSelect(ctx)
    }
  }

  wrapper.destroy = () => {
    selectApi?.destroy()
    selectApi = null
  }

  wrapper.relocalize = () => {
    selectApi?.relocalize(ctx.t, {
      placeholder: pluginConfig.defaultLabel,
      options: buildSelectOptions(ctx),
    })
    syncSelect(ctx)
  }

  syncSelect(ctx)
  return wrapper
}

export default definePlugin({
  id: 'font-family',
  name: 'Font Family',
  version: '1.0.0',

  capabilities: {
    marks: [
      mark('font-family', {
        tag: 'span',
        parseTags: ['span'],
        styleAttr: 'font-family',
        priority: 10,
      }),
    ],
    commands: {
      'font-family.set': command.setMarkAttr('font-family'),
      'font-family.clear': command.clearMarkAttr('font-family'),
    },
    toolbar: [
      toolbarItem({
        id: 'font-family',
        label: 'fontFamily.label',
        group: 'font',
        order: 20,
        render: mountFontFamilySelect,
      }),
    ],
  },

  activate(ctx) {
    pluginConfig = resolveConfig(ctx.getOption('fontFamily'))
    unsubscribe = ctx.subscribe(() => syncSelect(ctx))
  },

  deactivate() {
    unsubscribe?.()
    unsubscribe = null
    selectApi?.destroy()
    selectApi = null
  },
})

import { definePlugin, mark, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @typedef {{ label: string, value: string }} FontSizeItem */

/** @typedef {{ defaultLabel: string, items: FontSizeItem[] }} FontSizeConfig */

const MARK_NAME = 'font-size'
const CLEAR_VALUE = '__font-size-clear__'

/** @type {FontSizeConfig} */
const DEFAULT_FONT_SIZE_CONFIG = {
  defaultLabel: 'Tamanho',
  items: [
    { label: '8px', value: '8px' },
    { label: '9px', value: '9px' },
    { label: '10px', value: '10px' },
    { label: '11px', value: '11px' },
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' },
    { label: '36px', value: '36px' },
    { label: '48px', value: '48px' },
    { label: '60px', value: '60px' },
    { label: '72px', value: '72px' },
    { label: '96px', value: '96px' },
  ],
}

/** @type {FontSizeConfig} */
let pluginConfig = {
  ...DEFAULT_FONT_SIZE_CONFIG,
  items: [...DEFAULT_FONT_SIZE_CONFIG.items],
}

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {import('@baselab/plugin-sdk').RichSelectApi | null} */
let selectApi = null

/**
 * @param {unknown} config
 * @returns {FontSizeConfig}
 */
function resolveConfig(config) {
  const input = /** @type {{ items?: FontSizeItem[] }} */ (config ?? {})
  const items = (input.items?.length ? input.items : DEFAULT_FONT_SIZE_CONFIG.items).map(
    (item) => ({
      label: item.label,
      value: item.value,
    }),
  )

  return {
    defaultLabel: DEFAULT_FONT_SIZE_CONFIG.defaultLabel,
    items,
  }
}

/**
 * @param {PluginContext} ctx
 * @returns {FontSizeItem[]}
 */
function buildSelectOptions(ctx) {
  return [
    ...pluginConfig.items.map((item) => ({
      value: item.value,
      label: item.label,
    })),
    {
      value: CLEAR_VALUE,
      label: ctx.t('fontSize.clear'),
      disabled: false,
    },
  ]
}

/**
 * @param {PluginContext} ctx
 * @returns {string}
 */
function getDefaultFontSize(ctx) {
  return ctx.services.theme.getToken('--editor-font-size') || '16px'
}

/**
 * @param {PluginContext} ctx
 */
function syncSelect(ctx) {
  if (!selectApi) return

  const current = ctx.getMarkAttr(MARK_NAME)

  if (current === 'mixed') {
    selectApi.setLabel(ctx.t('fontSize.mixed'))
    return
  }

  if (!current) {
    const defaultSize = getDefaultFontSize(ctx)
    const matched = pluginConfig.items.find((item) => item.value === defaultSize)
    if (matched) {
      selectApi.setValue(matched.value)
    } else {
      selectApi.setLabel(defaultSize)
    }
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
function mountFontSizeSelect(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__font-size'

  const defaultSize = getDefaultFontSize(ctx)
  const defaultItem = pluginConfig.items.find((item) => item.value === defaultSize)

  selectApi = ctx.ui.RichSelect({
    id: 'font-size-select',
    name: 'font-size',
    className: 'editor__font-size-select',
    placement: 'bottom',
    portalRoot: ctx.services.viewport.getOverlayRoot(),
    placeholder: defaultSize,
    value: defaultItem?.value,
    options: buildSelectOptions(ctx),
    onChange: (value) => {
      if (value === CLEAR_VALUE) {
        ctx.execCommand('font-size.clear')
        return
      }
      ctx.execCommand('font-size.set', value)
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
      placeholder: getDefaultFontSize(ctx),
      options: buildSelectOptions(ctx),
    })
    syncSelect(ctx)
  }

  syncSelect(ctx)
  return wrapper
}

export default definePlugin({
  id: 'font-size',
  name: 'Font Size',
  version: '1.0.0',

  capabilities: {
    marks: [
      mark('font-size', {
        tag: 'span',
        parseTags: ['span'],
        styleAttr: 'font-size',
        priority: 11,
      }),
    ],
    commands: {
      'font-size.set': command.setMarkAttr('font-size'),
      'font-size.clear': command.clearMarkAttr('font-size'),
    },
    toolbar: [
      toolbarItem({
        id: 'font-size',
        label: 'fontSize.label',
        group: 'font',
        order: 30,
        render: mountFontSizeSelect,
      }),
    ],
  },

  activate(ctx) {
    pluginConfig = resolveConfig(ctx.getOption('fontSize'))
    unsubscribe = ctx.subscribe(() => syncSelect(ctx))
  },

  deactivate() {
    unsubscribe?.()
    unsubscribe = null
    selectApi?.destroy()
    selectApi = null
  },
})

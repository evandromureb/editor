/**
 * @file Quote plugin — highlight blocks with four preset styles via toolbar.
 */

import { definePlugin, block, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {import('@baselab/plugin-sdk').RichSelectApi | null} */
let selectApi = null

const QUOTE_STYLES = [
  { value: 'quote', labelKey: 'quote.default' },
  { value: 'quote-info', labelKey: 'quote.info' },
  { value: 'quote-warning', labelKey: 'quote.warning' },
  { value: 'quote-danger', labelKey: 'quote.danger' },
]

/**
 * @param {PluginContext} ctx
 * @returns {{ value: string, label: string }[]}
 */
function buildSelectOptions(ctx) {
  return QUOTE_STYLES.map((opt) => ({
    value: opt.value,
    label: ctx.t(opt.labelKey),
  }))
}

/**
 * Returns the block type at the current cursor position.
 *
 * @param {PluginContext} ctx
 * @returns {string | null}
 */
function getActiveQuoteStyle(ctx) {
  const { doc, selection } = ctx.getState()
  const block = doc.content[selection.anchor.block]
  const blockType = block?.type ?? null

  if (blockType && QUOTE_STYLES.find((s) => s.value === blockType)) {
    return blockType
  }
  return null
}

const ICON_TOOLBAR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-blockquote-left" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm5 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm-5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm.79-5.373q.168-.117.444-.275L3.524 6q-.183.111-.452.287-.27.176-.51.428a2.4 2.4 0 0 0-.398.562Q2 7.587 2 7.969q0 .54.217.873.217.328.72.328.322 0 .504-.211a.7.7 0 0 0 .188-.463q0-.345-.211-.521-.205-.182-.568-.182h-.282q.036-.305.123-.498a1.4 1.4 0 0 1 .252-.37 2 2 0 0 1 .346-.298zm2.167 0q.17-.117.445-.275L5.692 6q-.183.111-.452.287-.27.176-.51.428a2.4 2.4 0 0 0-.398.562q-.165.31-.164.692 0 .54.217.873.217.328.72.328.322 0 .504-.211a.7.7 0 0 0 .188-.463q0-.345-.211-.521-.205-.182-.568-.182h-.282a1.8 1.8 0 0 1 .118-.492q.087-.194.257-.375a2 2 0 0 1 .346-.3z"/></svg>'

/** @type {HTMLElement | null} */
let iconEl = null

/**
 * @param {PluginContext} ctx
 */
function syncSelect(ctx) {
  if (!selectApi) return

  const activeStyle = getActiveQuoteStyle(ctx)
  if (activeStyle) {
    selectApi.setValue(activeStyle)
  } else {
    selectApi.setLabel(ctx.t('quote.label'))
  }
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountQuoteSelect(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__quote-select'

  iconEl = document.createElement('span')
  iconEl.className = 'editor__quote-toolbar-icon'
  // Safe: static SVG markup defined in this file, never user-controlled.
  iconEl.innerHTML = ICON_TOOLBAR

  selectApi = ctx.ui.RichSelect({
    id: 'quote-select',
    name: 'quote',
    className: 'editor__quote-select-control',
    placement: 'bottom',
    portalRoot: ctx.services.viewport.getOverlayRoot(),
    placeholder: ctx.t('quote.label'),
    options: buildSelectOptions(ctx),
    onChange: (value) => {
      ctx.execCommand('quote.setStyle', value)
    },
  })

  const trigger = selectApi.element.querySelector('.bl-select__trigger')
  if (trigger) {
    trigger.insertBefore(iconEl, trigger.firstChild)
    if (trigger instanceof HTMLButtonElement) {
      const title = ctx.t('quote.title')
      trigger.title = title
      trigger.setAttribute('aria-label', title)
    }
  }

  wrapper.appendChild(selectApi.element)

  wrapper.sync = () => {
    if (selectApi?.element.isConnected) {
      syncSelect(ctx)
    }
  }

  wrapper.destroy = () => {
    selectApi?.destroy()
    selectApi = null
    iconEl = null
  }

  wrapper.relocalize = () => {
    selectApi?.relocalize(ctx.t, {
      placeholder: ctx.t('quote.label'),
      options: buildSelectOptions(ctx),
    })
    syncSelect(ctx)
  }

  syncSelect(ctx)
  return wrapper
}

export default definePlugin({
  id: 'quote',
  name: 'Quote',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block('quote', {
        tag: 'blockquote',
        softBreakOnEnter: true,
      }),
      block('quote-info', {
        tag: 'blockquote',
        softBreakOnEnter: true,
      }),
      block('quote-warning', {
        tag: 'blockquote',
        softBreakOnEnter: true,
      }),
      block('quote-danger', {
        tag: 'blockquote',
        softBreakOnEnter: true,
      }),
    ],
    commands: {
      'quote.setStyle': command.setBlockTypeForSelection(),
      'quote.insert': command.insertBlock('quote'),
    },
    toolbar: [
      toolbarItem({
        id: 'quote',
        label: 'quote.label',
        title: 'quote.title',
        group: 'insert',
        order: 20,
        render: mountQuoteSelect,
      }),
    ],
  },

  activate(ctx) {
    unsubscribe = ctx.subscribe(() => syncSelect(ctx))
  },

  deactivate() {
    unsubscribe?.()
    unsubscribe = null
    selectApi?.destroy()
    selectApi = null
    iconEl = null
  },
})

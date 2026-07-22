import { definePlugin, block, command, toolbarItem } from '@baselab/plugin-sdk'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {import('@baselab/plugin-sdk').RichSelectApi | null} */
let selectApi = null

const BLOCK_OPTIONS = [
  { value: 'paragraph', labelKey: 'paragraph.paragraph' },
  { value: 'heading-1', labelKey: 'paragraph.h1' },
  { value: 'heading-2', labelKey: 'paragraph.h2' },
  { value: 'heading-3', labelKey: 'paragraph.h3' },
  { value: 'heading-4', labelKey: 'paragraph.h4' },
  { value: 'heading-5', labelKey: 'paragraph.h5' },
]

/**
 * @param {PluginContext} ctx
 * @returns {{ value: string, label: string }[]}
 */
function buildSelectOptions(ctx) {
  return BLOCK_OPTIONS.map((opt) => ({
    value: opt.value,
    label: ctx.t(opt.labelKey),
  }))
}

/**
 * Returns the block type at the current cursor position.
 *
 * @param {PluginContext} ctx
 * @returns {string}
 */
function getActiveBlockType(ctx) {
  const { doc, selection } = ctx.getState()
  const block = doc.content[selection.anchor.block]
  return block?.type ?? 'paragraph'
}

/**
 * @param {PluginContext} ctx
 */
function syncSelect(ctx) {
  if (!selectApi) return

  const activeType = getActiveBlockType(ctx)
  const matched = BLOCK_OPTIONS.find((opt) => opt.value === activeType)
  if (matched) {
    selectApi.setValue(matched.value)
  } else {
    selectApi.setLabel(ctx.t('paragraph.paragraph'))
  }
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountParagraphSelect(ctx) {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor__paragraph-select'

  selectApi = ctx.ui.RichSelect({
    id: 'paragraph-select',
    name: 'paragraph',
    className: 'editor__paragraph-select',
    placement: 'bottom',
    portalRoot: ctx.services.viewport.getOverlayRoot(),
    placeholder: ctx.t('paragraph.paragraph'),
    options: buildSelectOptions(ctx),
    value: 'paragraph',
    onChange: (value) => {
      ctx.execCommand('paragraph.set', value)
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
      placeholder: ctx.t('paragraph.paragraph'),
      options: buildSelectOptions(ctx),
    })
    syncSelect(ctx)
  }

  syncSelect(ctx)
  return wrapper
}

export default definePlugin({
  id: 'paragraph',
  name: 'Paragraph',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block('heading-1', { tag: 'h1' }),
      block('heading-2', { tag: 'h2' }),
      block('heading-3', { tag: 'h3' }),
      block('heading-4', { tag: 'h4' }),
      block('heading-5', { tag: 'h5' }),
    ],
    commands: {
      'paragraph.set': command.setBlockType(),
    },
    toolbar: [
      toolbarItem({
        id: 'paragraph',
        label: 'paragraph.button',
        title: 'paragraph.title',
        group: 'font',
        order: 10,
        render: mountParagraphSelect,
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
  },
})

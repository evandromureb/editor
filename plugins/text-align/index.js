/**
 * @file Text align plugin — aligns text blocks (left/center/right/justify)
 * and increases/decreases their indentation. Alignment and indentation are
 * stored as a whitelisted `style` bag on the block (parsed/serialized
 * generically by Core as `style="text-align: …; margin-left: …"`).
 */

import { definePlugin, toolbarItem, toolbarSeparator } from '@baselab/plugin-sdk'
import { setAlign, indent, outdent } from './commands.js'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const ICON_LEFT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-left" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

const ICON_CENTER =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-center" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

const ICON_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-right" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

const ICON_JUSTIFY =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-justify" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

const ICON_OUTDENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-indent-right" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m10.646 2.146a.5.5 0 0 1 .708.708L11.707 8l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708zM2 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

const ICON_INDENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-indent-left" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m.646 2.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L4.293 8 2.646 6.354a.5.5 0 0 1 0-.708M7 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m-5 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/></svg>'

/**
 * Returns the alignment of the block at the cursor, defaulting to `left`
 * (the browser/CSS default) when no `text-align` style is set.
 *
 * @param {PluginContext} ctx
 * @returns {string}
 */
function getActiveAlign(ctx) {
  const { doc, selection } = ctx.getState()
  const block = doc.content[selection.anchor.block]
  return /** @type {any} */ (block)?.style?.['text-align'] ?? 'left'
}

/**
 * @param {PluginContext} ctx
 * @returns {number}
 */
function getIndentLevel(ctx) {
  const { doc, selection } = ctx.getState()
  const block = doc.content[selection.anchor.block]
  const value = /** @type {any} */ (block)?.style?.['margin-left']
  return Number.parseInt(value ?? '', 10) || 0
}

/**
 * @param {string} id
 * @param {string} value
 * @param {string} icon
 * @param {number} order
 */
function alignButton(id, value, icon, order) {
  return toolbarItem({
    id,
    label: `${id}.button`,
    icon,
    group: 'text-align',
    order,
    isActive: (ctx) => getActiveAlign(ctx) === value,
  })
}

export default definePlugin({
  id: 'text-align',
  name: 'Text Align',
  version: '1.0.0',

  capabilities: {
    commands: {
      'text-left': setAlign('left'),
      'text-center': setAlign('center'),
      'text-right': setAlign('right'),
      justify: setAlign('justify'),
      indent,
      outdent,
    },
    toolbar: [
      alignButton('text-left', 'left', ICON_LEFT, 10),
      alignButton('text-center', 'center', ICON_CENTER, 20),
      alignButton('text-right', 'right', ICON_RIGHT, 30),
      alignButton('justify', 'justify', ICON_JUSTIFY, 40),
      toolbarSeparator({ group: 'text-align', order: 45 }),
      toolbarItem({
        id: 'outdent',
        label: 'outdent.button',
        icon: ICON_OUTDENT,
        group: 'text-align',
        order: 50,
        isEnabled: (ctx) => ctx.getMode() === 'editor' && getIndentLevel(ctx) > 0,
      }),
      toolbarItem({
        id: 'indent',
        label: 'indent.button',
        icon: ICON_INDENT,
        group: 'text-align',
        order: 60,
      }),
    ],
  },
})

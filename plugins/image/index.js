/**
 * @file Image plugin — inserts images by URL or Blob/File upload (never
 * base64), with resize, alignment, title/caption and removal. The `image`
 * block is void and carries its data as `attrs`/`caption` on the BlockNode
 * (parsed/serialized generically by Core as `<img>` or `<figure><img><figcaption>`).
 *
 * Split across flat local modules (no subfolders, matching this repo's
 * convention): commands.js (state transitions), dialog.js (insert-only
 * popover, opened from the toolbar), popover.js (edit-only popover, opened
 * by clicking an existing image).
 */

import { definePlugin, block, toolbarItem } from '@baselab/plugin-sdk'
import { BLOCK_TYPE, ATTR_KEYS, insertImage, updateImage, removeImage } from './commands.js'
import { openInsertDialog, closeInsertDialog } from './dialog.js'
import { openImagePopover, closeImagePopover, getActivePopoverBlockIndex } from './popover.js'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-card-image" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54L1 12.5v-9a.5.5 0 0 1 .5-.5z"/></svg>`

/** @type {(() => void) | null} */
let unsubscribe = null

/** @type {(() => void) | null} */
let clickOff = null

/** @type {HTMLButtonElement | null} */
let buttonEl = null

/**
 * Closes the popover if the image it's anchored to no longer exists (e.g.
 * removed via undo/redo triggered elsewhere, outside the popover itself).
 * @param {PluginContext} ctx
 */
function syncPopoverAgainstDoc(ctx) {
  const index = getActivePopoverBlockIndex()
  if (index === -1) return

  const block = ctx.getState().doc.content[index]
  if (!block || block.type !== BLOCK_TYPE) {
    closeImagePopover()
  }
}

/**
 * @param {PluginContext} ctx
 * @returns {HTMLElement}
 */
function mountImageButton(ctx) {
  buttonEl = /** @type {HTMLButtonElement} */ (
    ctx.ui.createToolbarItem({
      id: 'image',
      label: 'image.button',
      title: 'image.button',
      icon: ICON,
      onClick: () => openInsertDialog(ctx, buttonEl),
    })
  )

  const wrapper = document.createElement('div')
  wrapper.className = 'editor__image'
  wrapper.appendChild(buttonEl)

  wrapper.destroy = () => {
    closeInsertDialog(ctx)
    buttonEl = null
  }

  wrapper.relocalize = () => {
    if (!buttonEl) return
    const title = ctx.t('image.button')
    buttonEl.title = title
    buttonEl.setAttribute('aria-label', title)
  }

  return wrapper
}

export default definePlugin({
  id: 'image',
  name: 'Image',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block(BLOCK_TYPE, {
        tag: 'img',
        void: true,
        parseTags: ['img', 'figure'],
        attrs: ATTR_KEYS,
        captionTag: 'figcaption',
        wrapperTag: 'figure',
      }),
    ],
    commands: {
      'image.insert': insertImage,
      'image.update': updateImage,
      'image.remove': removeImage,
    },
    toolbar: [
      toolbarItem({
        id: 'image',
        label: 'image.button',
        title: 'image.button',
        group: 'insert',
        order: 50,
        render: mountImageButton,
      }),
    ],
  },

  activate(ctx) {
    unsubscribe = ctx.subscribe(() => syncPopoverAgainstDoc(ctx))

    const surface = ctx.services.viewport.getSurface?.()
    if (surface) {
      const handler = (event) => {
        const target = /** @type {HTMLElement} */ (event.target)
        const el = target.closest?.(`[data-block="${BLOCK_TYPE}"]`)
        if (!el) return
        const index = Number(/** @type {HTMLElement} */ (el).dataset.blockIndex)
        if (Number.isNaN(index)) return
        openImagePopover(ctx, /** @type {HTMLElement} */ (el), index)
      }
      surface.addEventListener('click', handler)
      clickOff = () => surface.removeEventListener('click', handler)
    }
  },

  deactivate(ctx) {
    unsubscribe?.()
    unsubscribe = null
    clickOff?.()
    clickOff = null
    closeInsertDialog(ctx)
    closeImagePopover()
    buttonEl = null
    ctx.services.overlay.closePopover('image-panel')
    ctx.services.overlay.closePopover('image-insert-panel')
  },
})

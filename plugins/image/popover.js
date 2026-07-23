/**
 * @file Edit popover — small, anchored to the selected image, no tabs/
 * upload/insert button/footer/title. Selection is tracked locally by this
 * module (not via `ctx.getState().selection`): the cursor model always
 * redirects away from void blocks (see src/core/cursor/resolve.js), so a
 * block-level "this image is active" concept has to live in the plugin.
 */

import { getSizeLimits, clampSize } from './commands.js'

const BLOCK_TYPE = 'image'

const ALIGN_ICONS = {
  left: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5"/></svg>`,
  center: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5M4 6.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5M2 9.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5"/></svg>`,
  right: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m4 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-4 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m4 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5"/></svg>`,
}

const SVG_REMOVE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`

const SVG_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.146a.5.5 0 0 1 .708 0L8 7.293l5.146-5.147a.5.5 0 1 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854a.5.5 0 0 1 0-.708"/></svg>`

/** @type {{ close: () => void, destroy: () => void } | null} */
let popoverApi = null

let activeBlockIndex = -1

/**
 * @returns {number}
 */
export function getActivePopoverBlockIndex() {
  return activeBlockIndex
}

/**
 * Closes the popover and resets local state. `OverlayStack.remove()` (used
 * internally by `close()`) does not invoke `onClose`, so this must be the
 * single place that resets `popoverApi`/`activeBlockIndex` for both
 * programmatic and user-triggered closes.
 */
export function closeImagePopover() {
  const api = popoverApi
  popoverApi = null
  activeBlockIndex = -1
  api?.close()
}

/**
 * @param {import('@baselab/plugin-sdk').PluginContext} ctx
 * @param {HTMLElement} anchorEl
 * @param {number} blockIndex
 */
export function openImagePopover(ctx, anchorEl, blockIndex) {
  if (activeBlockIndex === blockIndex && popoverApi) return
  closeImagePopover()

  const block = /** @type {any} */ (ctx.getState().doc.content[blockIndex])
  if (!block || block.type !== BLOCK_TYPE) return

  const attrs = block.attrs ?? {}
  activeBlockIndex = blockIndex

  const imgEl = anchorEl.tagName === 'IMG' ? anchorEl : anchorEl.querySelector('img')
  const naturalWidth = Number(attrs.width) || imgEl?.naturalWidth || 0
  const naturalHeight = Number(attrs.height) || imgEl?.naturalHeight || 0
  const aspect = naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 0
  const sizeLimits = getSizeLimits(ctx)

  const root = document.createElement('div')
  root.className = 'editor__image-panel-content'

  const headerRow = document.createElement('div')
  headerRow.className = 'editor__image-panel-header'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'editor__image-panel-close'
  closeBtn.title = ctx.t('image.close')
  closeBtn.setAttribute('aria-label', ctx.t('image.close'))
  // Safe: SVG_CLOSE/ALIGN_ICONS/SVG_REMOVE below are static markup defined
  // in this file — never derived from block attrs or other user content.
  closeBtn.innerHTML = SVG_CLOSE
  closeBtn.addEventListener('click', () => {
    closeImagePopover()
    ctx.services.focus.focusEditor()
  })
  headerRow.appendChild(closeBtn)
  root.appendChild(headerRow)

  const toolsRow = document.createElement('div')
  toolsRow.className = 'editor__image-panel-row'
  for (const value of ['left', 'center', 'right']) {
    const alignBtn = document.createElement('button')
    alignBtn.type = 'button'
    alignBtn.className = 'editor__image-align-btn'
    alignBtn.classList.toggle('is-active', attrs.align === value)
    alignBtn.title = ctx.t(`image.align.${value}`)
    alignBtn.innerHTML = ALIGN_ICONS[value]
    alignBtn.addEventListener('click', () => {
      ctx.execCommand('image.update', { blockIndex, patch: { align: value } })
      toolsRow.querySelectorAll('.editor__image-align-btn').forEach((btn) => btn.classList.remove('is-active'))
      alignBtn.classList.add('is-active')
    })
    toolsRow.appendChild(alignBtn)
  }

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.className = 'editor__image-remove-btn'
  removeBtn.title = ctx.t('image.remove')
  removeBtn.innerHTML = SVG_REMOVE
  removeBtn.addEventListener('click', () => {
    ctx.execCommand('image.remove', { blockIndex })
    closeImagePopover()
    ctx.services.focus.focusEditor()
  })
  toolsRow.appendChild(removeBtn)
  root.appendChild(toolsRow)

  const widthRange = document.createElement('input')
  widthRange.type = 'range'
  widthRange.min = String(sizeLimits.minWidth)
  widthRange.max = String(sizeLimits.maxWidth)
  widthRange.value = String(clampSize(naturalWidth || 300, sizeLimits.minWidth, sizeLimits.maxWidth))
  widthRange.className = 'editor__image-range'
  root.appendChild(widthRange)

  const sizeRow = document.createElement('div')
  sizeRow.className = 'editor__image-row'
  const widthNumber = ctx.ui.Input({
    type: 'number',
    value: widthRange.value,
    className: 'editor__image-input editor__image-input--number',
  })
  widthNumber.min = String(sizeLimits.minWidth)
  widthNumber.max = String(sizeLimits.maxWidth)
  const heightNumber = ctx.ui.Input({
    type: 'number',
    value: String(
      clampSize(naturalHeight || Math.round(Number(widthRange.value) / (aspect || 1)), sizeLimits.minHeight, sizeLimits.maxHeight),
    ),
    className: 'editor__image-input editor__image-input--number',
  })
  heightNumber.min = String(sizeLimits.minHeight)
  heightNumber.max = String(sizeLimits.maxHeight)
  sizeRow.append(widthNumber, heightNumber)
  root.appendChild(sizeRow)

  const keepAspectField = ctx.ui.Checkbox({ label: ctx.t('image.keepAspect'), checked: true })
  const keepAspectInput = /** @type {HTMLInputElement} */ (keepAspectField.querySelector('input'))
  root.appendChild(keepAspectField)

  function applyWidth(width) {
    width = clampSize(width, sizeLimits.minWidth, sizeLimits.maxWidth)
    const patch = { width: String(width) }
    if (keepAspectInput.checked && aspect) {
      const height = clampSize(Math.round(width / aspect), sizeLimits.minHeight, sizeLimits.maxHeight)
      heightNumber.value = String(height)
      patch.height = String(height)
    }
    widthRange.value = String(width)
    widthNumber.value = String(width)
    ctx.execCommand('image.update', { blockIndex, patch })
  }

  function applyHeight(height) {
    height = clampSize(height, sizeLimits.minHeight, sizeLimits.maxHeight)
    const patch = { height: String(height) }
    if (keepAspectInput.checked && aspect) {
      const width = clampSize(Math.round(height * aspect), sizeLimits.minWidth, sizeLimits.maxWidth)
      widthNumber.value = String(width)
      widthRange.value = String(width)
      patch.width = String(width)
    }
    heightNumber.value = String(height)
    ctx.execCommand('image.update', { blockIndex, patch })
  }

  widthRange.addEventListener('input', () => applyWidth(Number(widthRange.value)))
  widthNumber.addEventListener('input', () => {
    const value = Number(widthNumber.value)
    if (value) applyWidth(value)
  })
  heightNumber.addEventListener('input', () => {
    const value = Number(heightNumber.value)
    if (value) applyHeight(value)
  })

  const titleField = document.createElement('label')
  titleField.className = 'editor__image-field'
  const titleLabel = document.createElement('span')
  titleLabel.className = 'editor__image-label'
  titleLabel.textContent = ctx.t('image.title')
  const titleInput = ctx.ui.Input({ type: 'text', value: attrs.title ?? '', className: 'editor__image-input' })
  titleInput.addEventListener('input', () => {
    ctx.execCommand('image.update', { blockIndex, patch: { title: titleInput.value } })
  })
  titleField.append(titleLabel, titleInput)
  root.appendChild(titleField)

  const captionField = document.createElement('label')
  captionField.className = 'editor__image-field'
  const captionLabel = document.createElement('span')
  captionLabel.className = 'editor__image-label'
  captionLabel.textContent = ctx.t('image.caption')
  const captionInput = ctx.ui.Input({ type: 'text', value: block.caption ?? '', className: 'editor__image-input' })
  captionInput.addEventListener('input', () => {
    ctx.execCommand('image.update', { blockIndex, patch: { caption: captionInput.value } })
  })
  captionField.append(captionLabel, captionInput)
  root.appendChild(captionField)

  popoverApi = ctx.ui.createPopover({
    id: 'image-panel',
    anchor: anchorEl,
    content: root,
    boundary: ctx.services.viewport.getPane(),
    onClose: () => {
      popoverApi = null
      activeBlockIndex = -1
    },
  })
  popoverApi.open()
}

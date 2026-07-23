/**
 * @file Insert popover — URL/Upload tabs, drag & drop, shared size/title/
 * caption fields. Anchored to the toolbar button, same as the link plugin's
 * popover. Only ever creates new images; never used for editing.
 */

import { isSafeUrl, getSizeLimits, clampSize } from './commands.js'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const ACCEPTED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

const DEFAULT_INSERT_WIDTH = 400

// Overridable via `createEditor({ image: { maxSize } })`, in bytes.
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * @param {PluginContext} ctx
 * @returns {number}
 */
function getMaxFileSize(ctx) {
  const options = /** @type {{ maxSize?: number }} | undefined */ (ctx.getOption('image'))
  return options?.maxSize ?? DEFAULT_MAX_FILE_SIZE
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/** @type {{ close: () => void, destroy: () => void } | null} */
let popoverApi = null

/**
 * @param {string} src
 * @returns {Promise<{ width: number, height: number } | null>}
 */
function loadNaturalSize(src) {
  return new Promise((resolve) => {
    const probe = new Image()
    probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight })
    probe.onerror = () => resolve(null)
    probe.src = src
  })
}

/**
 * Resolves a File/Blob to a usable `src`. Uses the host-provided upload
 * callback (`ctx.getOption('image').upload`) when configured; otherwise
 * falls back to a local Blob URL. Never reads the file as base64.
 *
 * @param {PluginContext} ctx
 * @param {File} file
 * @returns {Promise<{ src: string, width?: number, height?: number }>}
 */
async function resolveUploadedSrc(ctx, file) {
  const options = /** @type {{ upload?: (file: File) => Promise<string | { url: string, width?: number, height?: number }> } | undefined} */ (
    ctx.getOption('image')
  )

  if (options?.upload) {
    const result = await options.upload(file)
    return typeof result === 'string'
      ? { src: result }
      : { src: result.url, width: result.width, height: result.height }
  }

  return { src: URL.createObjectURL(file) }
}

/**
 * @param {PluginContext} ctx
 */
export function closeInsertDialog(ctx) {
  const api = popoverApi
  popoverApi = null
  api?.close()
}

/**
 * @param {PluginContext} ctx
 * @param {HTMLElement} anchorEl
 */
export function openInsertDialog(ctx, anchorEl) {
  closeInsertDialog(ctx)

  let mode = 'url'
  /** @type {File | null} */
  let pendingFile = null
  /** @type {{ width: number, height: number } | null} */
  let naturalSize = null
  let previewObjectUrl = ''
  const sizeLimits = getSizeLimits(ctx)

  const root = document.createElement('div')
  root.className = 'editor__image-insert-panel'

  const tabs = document.createElement('div')
  tabs.className = 'editor__image-tabs'
  const urlTabBtn = document.createElement('button')
  urlTabBtn.type = 'button'
  urlTabBtn.className = 'editor__image-tab is-active'
  urlTabBtn.textContent = ctx.t('image.tabUrl')
  const uploadTabBtn = document.createElement('button')
  uploadTabBtn.type = 'button'
  uploadTabBtn.className = 'editor__image-tab'
  uploadTabBtn.textContent = ctx.t('image.tabUpload')
  tabs.append(urlTabBtn, uploadTabBtn)

  const urlPanel = document.createElement('div')
  urlPanel.className = 'editor__image-panel-tab'
  const urlField = document.createElement('label')
  urlField.className = 'editor__image-field'
  const urlLabel = document.createElement('span')
  urlLabel.className = 'editor__image-label'
  urlLabel.textContent = ctx.t('image.url')
  const urlInput = ctx.ui.Input({
    type: 'url',
    placeholder: 'https://exemplo.com/imagem.jpg',
    className: 'editor__image-input',
  })
  urlField.append(urlLabel, urlInput)
  urlPanel.appendChild(urlField)

  const uploadPanel = document.createElement('div')
  uploadPanel.className = 'editor__image-panel-tab'
  uploadPanel.hidden = true
  const dropzone = document.createElement('label')
  dropzone.className = 'editor__image-dropzone'
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/png,image/jpeg,image/gif,image/webp'
  fileInput.className = 'editor__image-file-input'
  const dropzoneText = document.createElement('span')
  dropzoneText.className = 'editor__image-dropzone-text'
  dropzoneText.textContent = ctx.t('image.choose')
  const dropzoneHint = document.createElement('span')
  dropzoneHint.className = 'editor__image-dropzone-hint'
  dropzoneHint.textContent = ctx.t('image.fileTypes')
  const previewImg = document.createElement('img')
  previewImg.className = 'editor__image-preview'
  previewImg.hidden = true
  dropzone.append(fileInput, dropzoneText, dropzoneHint, previewImg)
  uploadPanel.appendChild(dropzone)

  const widthField = document.createElement('label')
  widthField.className = 'editor__image-field editor__image-field--inline'
  const widthLabel = document.createElement('span')
  widthLabel.className = 'editor__image-label'
  widthLabel.textContent = ctx.t('image.width')
  const widthInput = ctx.ui.Input({ type: 'number', className: 'editor__image-input editor__image-input--number' })
  widthInput.min = String(sizeLimits.minWidth)
  widthInput.max = String(sizeLimits.maxWidth)
  widthField.append(widthLabel, widthInput)

  const heightField = document.createElement('label')
  heightField.className = 'editor__image-field editor__image-field--inline'
  const heightLabel = document.createElement('span')
  heightLabel.className = 'editor__image-label'
  heightLabel.textContent = ctx.t('image.height')
  const heightInput = ctx.ui.Input({ type: 'number', className: 'editor__image-input editor__image-input--number' })
  heightInput.min = String(sizeLimits.minHeight)
  heightInput.max = String(sizeLimits.maxHeight)
  heightField.append(heightLabel, heightInput)

  const dimensionsRow = document.createElement('div')
  dimensionsRow.className = 'editor__image-row'
  dimensionsRow.append(widthField, heightField)

  const keepAspectField = ctx.ui.Checkbox({ label: ctx.t('image.keepAspect'), checked: true })
  const keepAspectInput = /** @type {HTMLInputElement} */ (keepAspectField.querySelector('input'))

  const titleField = document.createElement('label')
  titleField.className = 'editor__image-field'
  const titleLabel = document.createElement('span')
  titleLabel.className = 'editor__image-label'
  titleLabel.textContent = ctx.t('image.title')
  const titleInput = ctx.ui.Input({ type: 'text', placeholder: ctx.t('image.title'), className: 'editor__image-input' })
  titleField.append(titleLabel, titleInput)

  const captionField = document.createElement('label')
  captionField.className = 'editor__image-field'
  const captionLabel = document.createElement('span')
  captionLabel.className = 'editor__image-label'
  captionLabel.textContent = ctx.t('image.caption')
  const captionInput = ctx.ui.Input({ type: 'text', placeholder: ctx.t('image.caption'), className: 'editor__image-input' })
  captionField.append(captionLabel, captionInput)

  const errorEl = document.createElement('p')
  errorEl.className = 'editor__image-error'
  errorEl.hidden = true

  const submitBtn = document.createElement('button')
  submitBtn.type = 'button'
  submitBtn.className = 'editor__image-submit'
  submitBtn.textContent = ctx.t('image.insert')

  root.append(
    tabs,
    urlPanel,
    uploadPanel,
    dimensionsRow,
    keepAspectField,
    titleField,
    captionField,
    errorEl,
    submitBtn,
  )

  function showError(message) {
    errorEl.textContent = message
    errorEl.hidden = false
  }

  function clearError() {
    errorEl.hidden = true
  }

  function setMode(next) {
    mode = next
    urlTabBtn.classList.toggle('is-active', mode === 'url')
    uploadTabBtn.classList.toggle('is-active', mode === 'upload')
    urlPanel.hidden = mode !== 'url'
    uploadPanel.hidden = mode !== 'upload'
    clearError()
  }

  function applyNaturalSize(size) {
    naturalSize = size
    if (!size?.width || !size?.height) return
    if (widthInput.value || heightInput.value) return
    const width = clampSize(DEFAULT_INSERT_WIDTH, sizeLimits.minWidth, sizeLimits.maxWidth)
    const height = clampSize(Math.round((width * size.height) / size.width), sizeLimits.minHeight, sizeLimits.maxHeight)
    widthInput.value = String(width)
    heightInput.value = String(height)
  }

  function onWidthChange() {
    const width = Number(widthInput.value)
    if (!width) return
    const clamped = clampSize(width, sizeLimits.minWidth, sizeLimits.maxWidth)
    widthInput.value = String(clamped)
    if (!keepAspectInput.checked || !naturalSize?.width) return
    heightInput.value = String(Math.round((clamped * naturalSize.height) / naturalSize.width))
  }

  function onHeightChange() {
    const height = Number(heightInput.value)
    if (!height) return
    const clamped = clampSize(height, sizeLimits.minHeight, sizeLimits.maxHeight)
    heightInput.value = String(clamped)
    if (!keepAspectInput.checked || !naturalSize?.height) return
    widthInput.value = String(Math.round((clamped * naturalSize.width) / naturalSize.height))
  }

  function setPendingFile(file) {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
      previewObjectUrl = ''
    }
    pendingFile = file
    if (!file) {
      previewImg.hidden = true
      return
    }
    if (!ACCEPTED_MIME.has(file.type)) {
      showError(ctx.t('image.errorInvalidType'))
      pendingFile = null
      return
    }
    const maxSize = getMaxFileSize(ctx)
    if (file.size > maxSize) {
      showError(`${ctx.t('image.errorTooLarge')} (${formatFileSize(maxSize)})`)
      pendingFile = null
      return
    }
    clearError()
    previewObjectUrl = URL.createObjectURL(file)
    previewImg.src = previewObjectUrl
    previewImg.hidden = false
    loadNaturalSize(previewObjectUrl).then(applyNaturalSize)
  }

  async function submit() {
    clearError()

    let src = ''
    let width = widthInput.value
    let height = heightInput.value

    if (mode === 'url') {
      src = urlInput.value.trim()
      if (!src) {
        showError(ctx.t('image.errorUrl'))
        return
      }
      if (!isSafeUrl(src)) {
        showError(ctx.t('image.errorInvalidType'))
        return
      }
    } else {
      if (!pendingFile) {
        showError(ctx.t('image.errorChoose'))
        return
      }
      submitBtn.disabled = true
      try {
        const uploaded = await resolveUploadedSrc(ctx, pendingFile)
        src = uploaded.src
        width = width || (uploaded.width ? String(uploaded.width) : '')
        height = height || (uploaded.height ? String(uploaded.height) : '')
      } finally {
        submitBtn.disabled = false
      }
    }

    ctx.execCommand('image.insert', {
      src,
      width: width ? String(clampSize(Number(width), sizeLimits.minWidth, sizeLimits.maxWidth)) : width,
      height: height ? String(clampSize(Number(height), sizeLimits.minHeight, sizeLimits.maxHeight)) : height,
      title: titleInput.value.trim(),
      caption: captionInput.value.trim(),
    })

    closeInsertDialog(ctx)
    ctx.services.focus.focusEditor()
  }

  urlTabBtn.addEventListener('click', () => setMode('url'))
  uploadTabBtn.addEventListener('click', () => setMode('upload'))
  urlInput.addEventListener('change', () => {
    const value = urlInput.value.trim()
    if (value && isSafeUrl(value)) loadNaturalSize(value).then(applyNaturalSize)
  })
  widthInput.addEventListener('input', onWidthChange)
  heightInput.addEventListener('input', onHeightChange)
  fileInput.addEventListener('change', () => {
    const [file] = Array.from(fileInput.files ?? [])
    setPendingFile(file ?? null)
  })
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropzone.classList.add('is-dragover')
  })
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'))
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropzone.classList.remove('is-dragover')
    const [file] = Array.from(event.dataTransfer?.files ?? [])
    if (file) setPendingFile(file)
  })
  submitBtn.addEventListener('click', () => submit())

  popoverApi = ctx.ui.createPopover({
    id: 'image-insert-panel',
    anchor: anchorEl,
    content: root,
    boundary: ctx.services.viewport.getPane(),
    onClose: () => {
      popoverApi = null
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    },
  })
  popoverApi.open()
  urlInput.focus()
}

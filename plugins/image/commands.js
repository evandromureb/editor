/**
 * @file Commands for the `image` block: insert (from URL or upload result),
 * partial update (merges a patch into existing attrs/caption) and removal.
 */

import { command, insertBlocks, deleteBlockAt } from '@baselab/plugin-sdk'

export const BLOCK_TYPE = 'image'
export const ALIGN_VALUES = new Set(['left', 'center', 'right'])
export const ATTR_KEYS = ['src', 'width', 'height', 'alt', 'title', 'align']
export const DEFAULT_ALIGN = 'left'

// blob: is browser-generated (URL.createObjectURL for the local upload
// fallback in dialog.js), never attacker-injectable, so it is allowed only
// for image `src` alongside http(s)/mailto/tel.
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'blob:'])

/**
 * Allows http(s)/mailto/tel/blob absolute schemes; relative/anchor values
 * (no scheme prefix) pass through untouched.
 * @param {string} value
 * @returns {boolean}
 */
export function isSafeUrl(value) {
  const schemeMatch = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)
  if (!schemeMatch) return true
  return SAFE_URL_SCHEMES.has(`${schemeMatch[1].toLowerCase()}:`)
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, string>}
 */
function buildAttrs(payload) {
  /** @type {Record<string, string>} */
  const attrs = {}
  for (const key of ATTR_KEYS) {
    const value = payload[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'align' && !ALIGN_VALUES.has(String(value))) continue
    if (key === 'src' && !isSafeUrl(String(value))) continue
    attrs[key] = String(value)
  }
  return attrs
}

export const insertImage = command((state, registries, payload) => {
  const data = /** @type {Record<string, unknown>} */ (payload ?? {})
  if (!data.src || !isSafeUrl(String(data.src))) return state

  const newBlock = {
    type: BLOCK_TYPE,
    attrs: buildAttrs({ align: DEFAULT_ALIGN, ...data }),
    ...(data.caption ? { caption: String(data.caption) } : {}),
  }

  return insertBlocks(state, registries, [newBlock])
})

export const updateImage = command((state, registries, payload) => {
  const data = /** @type {{ blockIndex?: number, patch?: Record<string, unknown> }} */ (payload ?? {})
  const index = data.blockIndex
  if (typeof index !== 'number') return state

  const existing = state.doc.content[index]
  if (!existing || existing.type !== BLOCK_TYPE) return state

  const nextAttrs = { ...(/** @type {any} */ (existing).attrs ?? {}) }
  const patch = data.patch ?? {}

  for (const key of ATTR_KEYS) {
    if (!(key in patch)) continue
    const value = patch[key]
    if (value === '' || value === null || value === undefined) {
      delete nextAttrs[key]
      continue
    }
    if (key === 'align' && !ALIGN_VALUES.has(String(value))) continue
    if (key === 'src' && !isSafeUrl(String(value))) continue
    nextAttrs[key] = String(value)
  }

  const nextCaption = 'caption' in patch ? String(patch.caption ?? '') : /** @type {any} */ (existing).caption

  const nextBlock = {
    type: BLOCK_TYPE,
    attrs: nextAttrs,
    ...(nextCaption ? { caption: nextCaption } : {}),
  }

  const content = state.doc.content.map((b, i) => (i === index ? nextBlock : b))
  return { ...state, doc: { ...state.doc, content } }
})

export const removeImage = command((state, registries, payload) => {
  const data = /** @type {{ blockIndex?: number }} */ (payload ?? {})
  if (typeof data.blockIndex !== 'number') return state
  return deleteBlockAt(state, registries, data.blockIndex)
})

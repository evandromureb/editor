/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { sanitizeHtml } from '../sanitize/sanitize.js'

/**
 * @typedef {object} HtmlValidationResult
 * @property {boolean} valid
 * @property {string} [message]
 */

/**
 * @param {string} html
 * @param {EditorRegistries} registries
 * @returns {HtmlValidationResult}
 */
export function validateHtml(html, registries) {
  const trimmed = html.trim()

  if (!trimmed) {
    return { valid: true }
  }

  const parsed = new DOMParser().parseFromString(trimmed, 'text/html')
  const parseError = parsed.querySelector('parsererror')

  if (parseError) {
    return { valid: false, message: 'invalid' }
  }

  const safe = sanitizeHtml(trimmed, registries)
  const plainInput = trimmed.replace(/<[^>]+>/g, '').trim()
  const plainSafe = safe.replace(/<[^>]+>/g, '').trim()

  if (trimmed && !safe.trim()) {
    return { valid: false, message: 'disallowed' }
  }

  if (plainInput && !plainSafe) {
    return { valid: false, message: 'disallowed' }
  }

  return { valid: true }
}

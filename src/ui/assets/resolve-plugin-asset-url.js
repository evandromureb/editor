/**
 * Resolves public URLs for plugin assets (icons, images, etc.).
 * Registry paths are relative to the package root (`plugins/{id}/...`).
 */

/**
 * @returns {string}
 */
function getImportMetaUrl() {
  try {
    return import.meta.url
  } catch {
    return ''
  }
}

/**
 * Base URL inferred from the editor's `<script src="...">`.
 * Required for IIFE and for ESM when `document.currentScript` is null.
 *
 * @returns {string}
 */
function getScriptBaseUrl() {
  if (typeof document === 'undefined') return ''

  const current = document.currentScript
  if (current instanceof HTMLScriptElement && current.src) {
    return new URL('./', current.src).href
  }

  const scripts = document.querySelectorAll('script[src]')
  for (const script of scripts) {
    if (!(script instanceof HTMLScriptElement) || !script.src) continue
    const { pathname } = new URL(script.src, document.baseURI)
    if (
      /\/editor\.standalone\.js$/i.test(pathname) ||
      /\/editor\.js$/i.test(pathname) ||
      /\/src\/embed\/entry\.js$/i.test(pathname)
    ) {
      return new URL('./', script.src).href
    }
  }

  return new URL('./', document.baseURI).href
}

/**
 * @param {URL} moduleUrl
 * @returns {string}
 */
function baseUrlFromModuleUrl(moduleUrl) {
  if (moduleUrl.pathname.includes('/dist/')) {
    return new URL('./', moduleUrl).href
  }

  const srcRoot = moduleUrl.pathname.match(/^(.*)\/src\//)
  if (srcRoot) {
    return `${moduleUrl.origin}${srcRoot[1]}/`
  }

  return new URL('./', moduleUrl).href
}

/**
 * Base URL for assets when `createEditor({ assetBaseUrl })` is not provided.
 * - ESM bundle in `dist/editor.js` → bundle directory
 * - IIFE bundle in `dist/editor.standalone.js` → via `<script src>`
 * - Modules in `src/` (dev) → repository root
 *
 * @returns {string}
 */
export function getDefaultAssetBaseUrl() {
  const metaUrl = getImportMetaUrl()
  if (metaUrl) {
    return baseUrlFromModuleUrl(new URL(metaUrl))
  }

  return getScriptBaseUrl()
}

/**
 * @param {string} path Registry path (e.g. `plugins/bold/icons/bold.svg`)
 * @param {string} [baseUrl] Explicit or inferred base URL
 * @returns {string}
 */
export function resolvePluginAssetUrl(path, baseUrl) {
  const cleanPath = path.replace(/^\//, '')
  const base = baseUrl !== undefined && baseUrl !== '' ? baseUrl : getDefaultAssetBaseUrl()

  if (!base) {
    return cleanPath
  }

  try {
    const baseWithSlash = base.endsWith('/') ? base : `${base}/`
    return new URL(cleanPath, baseWithSlash).href
  } catch {
    return `${base.replace(/\/$/, '')}/${cleanPath}`
  }
}

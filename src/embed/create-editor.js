import { Editor } from '../editor.js'
import { discoveredPlugins } from '../generated/plugins.registry.js'
import { resolveEditorConfig } from '../core/presets/resolve-config.js'
import '../core/presets/index.js'

/** @typedef {import('../editor.js').Editor} EditorInstance */
/** @typedef {import('../editor.js').EditorOptions} EditorOptions */

/**
 * Creates an editor instance. Plugins are auto-discovered by the build and
 * do not need to be manually registered.
 *
 * @param {Omit<EditorOptions, 'plugins'> & { plugins?: string[] | import('../sdk/types.js').PluginDefinition[]; preset?: string; lang?: string }} [options]
 * @returns {EditorInstance}
 */
export function createEditor(options = {}) {
  const resolved = resolveEditorConfig(options, { discoveredPlugins })

  return new Editor(resolved)
}

export { defineEditor, WysiwygEditorElement } from './wysiwyg-editor.js'

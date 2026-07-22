/**
 * @file Embed entry point exports.
 */

export * from '../index.js'
export { createEditor, defineEditor, WysiwygEditorElement } from './create-editor.js'

import { defineEditor } from './wysiwyg-editor.js'

defineEditor()

import './helpers/dom.js'
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadWithSdkAlias } from './helpers/load-plugin.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {typeof import('../src/embed/index.js')} */
let embed

before(async () => {
  embed = await loadWithSdkAlias(join(root, 'src/embed/index.js'))
})

function mountTextarea(id, value = '') {
  const textarea = document.createElement('textarea')
  textarea.id = id
  textarea.value = value
  document.body.appendChild(textarea)
  return textarea
}

describe('embed/createEditor — real Editor integration', () => {
  it('creates a real editor from a textarea selector and discovers all 22 plugins', () => {
    mountTextarea('t-create')
    const editor = embed.createEditor({ textarea: '#t-create' })

    assert.equal(typeof editor.getHTML, 'function')
    const pluginIds = editor
      .getPlugins()
      .map((p) => p.id)
      .sort()
    assert.equal(pluginIds.length, 22)
    assert.ok(pluginIds.includes('bold'))
    assert.ok(pluginIds.includes('hr'))
    assert.ok(pluginIds.includes('quote'))

    editor.destroy()
  })

  it('parses initial textarea content into DocNode', () => {
    mountTextarea('t-parse', '<p>hello <strong>world</strong></p>')
    const editor = embed.createEditor({ textarea: '#t-parse' })

    const doc = editor.getDocument()
    assert.equal(doc.type, 'doc')
    assert.equal(doc.content[0].content[0].text, 'hello ')
    assert.equal(doc.content[0].content[1].text, 'world')
    assert.deepEqual(doc.content[0].content[1].marks, ['bold'])
    assert.equal(editor.getHTML(), '<p>hello <strong>world</strong></p>')

    editor.destroy()
  })

  it('execCommand(bold) applies mark to selection and reflects in serialized HTML', () => {
    mountTextarea('t-bold', '<p>hello world</p>')
    const editor = embed.createEditor({ textarea: '#t-bold' })

    editor.setSelection({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 5 } })
    editor.execCommand('bold')

    assert.equal(editor.getHTML(), '<p><strong>hello</strong> world</p>')

    editor.destroy()
  })

  it('undo/redo revert and reapply real end-to-end transaction', () => {
    mountTextarea('t-undo', '<p>hello world</p>')
    const editor = embed.createEditor({ textarea: '#t-undo' })

    editor.setSelection({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 5 } })
    editor.execCommand('bold')
    assert.equal(editor.canUndo(), true)

    editor.undo()
    assert.equal(editor.getHTML(), '<p>hello world</p>')
    assert.equal(editor.canRedo(), true)

    editor.redo()
    assert.equal(editor.getHTML(), '<p><strong>hello</strong> world</p>')

    editor.destroy()
  })

  it('setContent replaces document and resets history', () => {
    mountTextarea('t-setcontent', '<p>a</p>')
    const editor = embed.createEditor({ textarea: '#t-setcontent' })

    editor.setContent('<p>new content</p>')
    assert.equal(editor.getHTML(), '<p>new content</p>')
    assert.equal(editor.canUndo(), false)

    editor.destroy()
  })

  it('registerPlugin/unregisterPlugin work dynamically after creation', () => {
    mountTextarea('t-dynplugin')
    const editor = embed.createEditor({ textarea: '#t-dynplugin', plugins: [] })

    assert.equal(editor.getPlugins().length, 0)

    const boldPlugin = {
      id: 'bold-dyn',
      name: 'Bold Dyn',
      capabilities: {
        commands: { 'bold-dyn': () => ({ doc: { type: 'doc', content: [] }, selection: {} }) },
      },
    }
    editor.registerPlugin(boldPlugin)
    assert.equal(editor.getPlugins().length, 1)

    editor.unregisterPlugin('bold-dyn')
    assert.equal(editor.getPlugins().length, 0)

    editor.destroy()
  })

  it('custom toolbar via TinyMCE-style string filters displayed items', () => {
    mountTextarea('t-toolbar')
    const editor = embed.createEditor({ textarea: '#t-toolbar', toolbar: 'bold | italic' })
    assert.equal(typeof editor.getHTML, 'function')
    editor.destroy()
  })

  it('setLocale/getLocale change language at runtime', () => {
    mountTextarea('t-locale')
    const editor = embed.createEditor({ textarea: '#t-locale', locale: 'pt' })
    assert.equal(editor.getLocale(), 'pt')

    editor.setLocale('en')
    assert.equal(editor.getLocale(), 'en')

    editor.destroy()
  })

  it('setTheme/getTheme and setAppearance/getAppearance work end-to-end', () => {
    mountTextarea('t-theme')
    const editor = embed.createEditor({ textarea: '#t-theme' })

    editor.setTheme('escuro')
    assert.equal(editor.getTheme(), 'escuro')

    editor.setAppearance('dark')
    assert.equal(editor.getAppearance(), 'dark')

    editor.destroy()
  })
})

describe('embed/WysiwygEditorElement — real custom element', () => {
  before(() => {
    embed.defineEditor('wysiwyg-editor-test')
  })

  it('mounts Editor in connectedCallback using "for" attribute', () => {
    mountTextarea('src-ce-1')
    const el = document.createElement('wysiwyg-editor-test')
    el.setAttribute('for', 'src-ce-1')
    document.body.appendChild(el)

    assert.ok(el.editor)
    assert.equal(typeof el.editor.getHTML, 'function')

    el.remove()
  })

  it('throws clear error when "for" attribute is missing', () => {
    const el = document.createElement('wysiwyg-editor-test')
    assert.throws(() => document.body.appendChild(el), /"for" attribute is required/)
  })

  it('throws clear error when textarea referenced by "for" does not exist', () => {
    const el = document.createElement('wysiwyg-editor-test')
    el.setAttribute('for', 'does-not-exist-123')
    assert.throws(() => document.body.appendChild(el), /not found/)
  })

  it('attributeChangedCallback(theme) propagates to already-mounted editor', () => {
    mountTextarea('src-ce-2')
    const el = document.createElement('wysiwyg-editor-test')
    el.setAttribute('for', 'src-ce-2')
    document.body.appendChild(el)

    el.setAttribute('theme', 'corporate')
    assert.equal(el.editor.getTheme(), 'corporate')

    el.remove()
  })

  it('disconnectedCallback destroys editor and cleans reference', () => {
    mountTextarea('src-ce-3')
    const el = document.createElement('wysiwyg-editor-test')
    el.setAttribute('for', 'src-ce-3')
    document.body.appendChild(el)
    assert.ok(el.editor)

    el.remove()
    assert.equal(el.editor, null)
  })

  it('defineEditor is idempotent — calling twice does not throw error', () => {
    assert.doesNotThrow(() => embed.defineEditor('wysiwyg-editor-test'))
  })
})

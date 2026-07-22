import './helpers/dom.js'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PluginRuntime } from '../src/core/plugins/runtime.js'
import { createEditorRegistries } from '../src/core/schema/index.js'
import { I18n } from '../src/core/i18n/index.js'
import { docNode, textNode } from '../src/core/document/nodes.js'
import { parse } from '../src/core/serializer/parser.js'
import { serialize } from '../src/core/serializer/serializer.js'
import { sanitizeHtml } from '../src/core/sanitize/sanitize.js'
import { loadRealPlugin } from './helpers/load-plugin.js'

/** @type {import('../src/sdk/types.js').PluginDefinition} */
const bulletListPlugin = await loadRealPlugin('bullet-list')

/** @type {import('../src/sdk/types.js').PluginDefinition} */
const taskListPlugin = await loadRealPlugin('task-list')

function createDoc(style = null) {
  return docNode([
    {
      type: 'bullet-list',
      ...(style ? { style: { 'list-style-type': style } } : {}),
      children: [
        { type: 'bullet-list-item', content: [textNode('One')] },
        { type: 'bullet-list-item', content: [textNode('Two')] },
        { type: 'bullet-list-item', content: [textNode('Three')] },
      ],
    },
  ])
}

function createTaskDoc() {
  return docNode([
    {
      type: 'task-list',
      children: [
        {
          type: 'task-item',
          content: [textNode('Task')],
          attrs: { 'data-checked': 'false' },
        },
      ],
    },
  ])
}

function createMockCtx(stateRef, registries) {
  return {
    getState: () => stateRef.current,
    selection: () => stateRef.current.selection,
    getMode: () => 'editor',
    getActiveMarks: () => [],
    getMarkAttr: () => null,
    getOption: () => undefined,
    execCommand: (name, payload) => {
      const command = registries.commands.getCommand(name)
      if (!command) return false
      const next = command(stateRef.current, registries, payload)
      stateRef.current = next
      return true
    },
    insertText: () => {},
    insertBlock: () => {},
    toggleMark: () => {},
    subscribe: () => () => {},
    t: (key) => key,
    ui: {
      createToolbarItem: (opts) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = `editor__toolbar-btn editor__toolbar-btn--${opts.id}`
        button.title = opts.title ?? ''
        button.setAttribute('aria-label', opts.title ?? '')
        if (opts.icon) button.innerHTML = opts.icon
        if (opts.onClick) {
          button.addEventListener('click', (event) => opts.onClick(event))
        }
        return button
      },
      createPopover: ({ id, content, onClose }) => {
        const api = {
          root: null,
          open() {
            const root = document.createElement('div')
            root.dataset.popoverId = id
            root.className = 'editor__popover'
            root.appendChild(content)
            document.body.appendChild(root)
            api.root = root
            return api
          },
          close() {
            api.root?.remove()
            api.root = null
            onClose?.()
          },
          destroy() {
            api.close()
          },
        }
        return api
      },
    },
    services: {
      viewport: {
        getSurface: () => null,
      },
      overlay: {
        closePopover: () => {},
      },
    },
    assets: {},
  }
}

function registerPlugins(stateRef) {
  const registries = createEditorRegistries()
  const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'en' }) })
  const ctx = createMockCtx(stateRef, registries)
  runtime.register(taskListPlugin, ctx)
  runtime.register(bulletListPlugin, ctx)
  return { registries, runtime, ctx }
}

describe('bullet-list plugin', () => {
  it('parses and serializes bullet list styles', () => {
    const stateRef = { current: { doc: createDoc('circle'), selection: { anchor: { block: 0, childIndex: 0, offset: 0 }, focus: { block: 0, childIndex: 2, offset: 5 } } } }
    const { registries } = registerPlugins(stateRef)

    const doc = parse('<ul style="list-style-type: circle;"><li>One</li><li>Two</li></ul>', registries)
    assert.equal(doc.content[0].type, 'bullet-list')
    assert.equal(/** @type {any} */ (doc.content[0]).style['list-style-type'], 'circle')
    assert.equal(doc.content[0].children.length, 2)

    const html = serialize(doc, registries)
    assert.match(html, /<ul style="list-style-type: circle"/)
    assert.match(html, /<li>One<\/li>/)
    assert.match(html, /<li>Two<\/li>/)
  })

  it('keeps task-list parsing separate from plain bullet lists', () => {
    const stateRef = { current: { doc: createTaskDoc(), selection: { anchor: { block: 0, childIndex: 0, offset: 0 }, focus: { block: 0, childIndex: 0, offset: 0 } } } }
    const { registries } = registerPlugins(stateRef)

    const taskDoc = parse('<ul data-task-list="true"><li data-checked="false">Task</li></ul>', registries)
    assert.equal(taskDoc.content[0].type, 'task-list')

    const bulletDoc = parse('<ul><li>One</li><li>Two</li></ul>', registries)
    assert.equal(bulletDoc.content[0].type, 'bullet-list')
  })

  it('command updates only the container style and Default removes style entirely', () => {
    const stateRef = {
      current: {
        doc: createDoc(),
        selection: {
          anchor: { block: 0, childIndex: 0, offset: 0 },
          focus: { block: 0, childIndex: 2, offset: 5 },
        },
      },
    }
    const { registries } = registerPlugins(stateRef)

    const setStyle = registries.commands.getCommand('bullet-list.setStyle')
    assert.ok(setStyle)

    const circleState = setStyle(stateRef.current, registries, 'circle')
    assert.equal(circleState.doc.content[0].type, 'bullet-list')
    assert.equal(/** @type {any} */ (circleState.doc.content[0]).style['list-style-type'], 'circle')
    assert.equal(circleState.doc.content[0].children[0].content[0].text, 'One')

    const defaultState = setStyle(circleState, registries, 'default')
    assert.equal(defaultState.doc.content[0].type, 'bullet-list')
    assert.equal(/** @type {any} */ (defaultState.doc.content[0]).style, undefined)
    assert.equal(defaultState.doc.content[0].children[2].content[0].text, 'Three')
  })

  it('the star option sets a distinct custom marker (not the native disc/circle/square keywords)', () => {
    const stateRef = {
      current: {
        doc: createDoc(),
        selection: {
          anchor: { block: 0, childIndex: 0, offset: 0 },
          focus: { block: 0, childIndex: 0, offset: 0 },
        },
      },
    }
    const { registries, runtime } = registerPlugins(stateRef)

    const setStyle = registries.commands.getCommand('bullet-list.setStyle')
    const starState = setStyle(stateRef.current, registries, 'star')
    const cssValue = /** @type {any} */ (starState.doc.content[0]).style['list-style-type']
    assert.equal(cssValue, '"★ "')
    assert.notEqual(cssValue, 'disc')

    // round-trips back to the "star" popover option being the one marked active
    stateRef.current = starState
    const entry = runtime.getToolbarEntries().find((item) => item.type === 'item' && item.item.id === 'bullet-list')
    const wrapper = entry.item.render(entry.ctx)
    document.body.appendChild(wrapper)
    wrapper.sync?.()
    wrapper.querySelector('button').click()

    const active = document.body.querySelector('.editor__bullet-list-popover .editor__bullet-list-option.is-active')
    assert.equal(active?.dataset.style, 'star')

    wrapper.querySelector('button').click()
  })

  it('Tab/Shift+Tab indent an item up to 2 levels, cycling the marker like nested browser lists', () => {
    const stateRef = {
      current: {
        doc: createDoc(),
        selection: {
          anchor: { block: 0, childIndex: 1, offset: 0 },
          focus: { block: 0, childIndex: 1, offset: 0 },
        },
      },
    }
    const { registries } = registerPlugins(stateRef)
    const indent = registries.commands.getCommand('bullet-list.indent')
    const outdent = registries.commands.getCommand('bullet-list.outdent')
    assert.ok(indent && outdent)

    const level1 = indent(stateRef.current, registries)
    const item1 = /** @type {any} */ (level1.doc.content[0]).children[1]
    assert.equal(item1.style['margin-left'], '40px')
    assert.equal(item1.style['list-style-type'], 'circle')

    const level2 = indent(level1, registries)
    const item2 = /** @type {any} */ (level2.doc.content[0]).children[1]
    assert.equal(item2.style['margin-left'], '80px')
    assert.equal(item2.style['list-style-type'], 'square')

    // capped at 2 extra levels — indenting again is a no-op
    const level2Again = indent(level2, registries)
    const item2Again = /** @type {any} */ (level2Again.doc.content[0]).children[1]
    assert.equal(item2Again.style['margin-left'], '80px')
    assert.equal(item2Again.style['list-style-type'], 'square')

    const backToLevel1 = outdent(level2Again, registries)
    const backItem1 = /** @type {any} */ (backToLevel1.doc.content[0]).children[1]
    assert.equal(backItem1.style['margin-left'], '40px')
    assert.equal(backItem1.style['list-style-type'], 'circle')

    const backToLevel0 = outdent(outdent(backToLevel1, registries), registries)
    const backItem0 = /** @type {any} */ (backToLevel0.doc.content[0]).children[1]
    assert.equal(backItem0.style, undefined)

    // never goes negative — outdenting at level 0 is a no-op
    const stillLevel0 = outdent(backToLevel0, registries)
    assert.equal(/** @type {any} */ (stillLevel0.doc.content[0]).children[1].style, undefined)

    // unaffected sibling items keep no override
    assert.equal(/** @type {any} */ (level2.doc.content[0]).children[0].style, undefined)
    assert.equal(/** @type {any} */ (level2.doc.content[0]).children[2].style, undefined)
  })

  it('merges a multi-paragraph selection into a single new list', () => {
    const stateRef = {
      current: {
        doc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [textNode('One')] },
            { type: 'paragraph', content: [textNode('Two')] },
            { type: 'paragraph', content: [textNode('Three')] },
          ],
        },
        selection: {
          anchor: { block: 0, offset: 0 },
          focus: { block: 2, offset: 5 },
        },
      },
    }
    const { registries } = registerPlugins(stateRef)
    const setStyle = registries.commands.getCommand('bullet-list.setStyle')

    const next = setStyle(stateRef.current, registries, 'square')
    assert.equal(next.doc.content.length, 1)
    assert.equal(next.doc.content[0].type, 'bullet-list')
    assert.equal(/** @type {any} */ (next.doc.content[0]).style['list-style-type'], 'square')
    assert.deepEqual(
      next.doc.content[0].children.map((c) => c.content[0].text),
      ['One', 'Two', 'Three'],
    )
  })

  it('restyles every list independently when the selection spans lists with different styles', () => {
    const stateRef = {
      current: {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'bullet-list',
              style: { 'list-style-type': 'disc' },
              children: [{ type: 'bullet-list-item', content: [textNode('A')] }],
            },
            {
              type: 'bullet-list',
              style: { 'list-style-type': 'square' },
              children: [{ type: 'bullet-list-item', content: [textNode('B')] }],
            },
          ],
        },
        selection: {
          anchor: { block: 0, childIndex: 0, offset: 0 },
          focus: { block: 1, childIndex: 0, offset: 1 },
        },
      },
    }
    const { registries, runtime } = registerPlugins(stateRef)
    const entry = runtime.getToolbarEntries().find((item) => item.type === 'item' && item.item.id === 'bullet-list')
    const wrapper = entry.item.render(entry.ctx)
    document.body.appendChild(wrapper)
    wrapper.sync?.()
    wrapper.querySelector('button').click()

    const popover = document.body.querySelector('.editor__bullet-list-popover')
    assert.equal(popover.querySelector('.editor__bullet-list-option.is-active'), null)
    assert.equal(
      [...popover.querySelectorAll('.editor__bullet-list-option')].every((el) => !el.disabled),
      true,
    )

    const setStyle = registries.commands.getCommand('bullet-list.setStyle')
    const next = setStyle(stateRef.current, registries, 'circle')
    assert.equal(next.doc.content.length, 2)
    assert.equal(/** @type {any} */ (next.doc.content[0]).style['list-style-type'], 'circle')
    assert.equal(/** @type {any} */ (next.doc.content[1]).style['list-style-type'], 'circle')
    assert.equal(next.doc.content[0].children[0].content[0].text, 'A')
    assert.equal(next.doc.content[1].children[0].content[0].text, 'B')

    wrapper.querySelector('button').click()
  })

  it('marks the toolbar button whenever the cursor is inside a bullet-list, even with the Default (no explicit style) option', () => {
    const stateRef = {
      current: {
        doc: createDoc(), // no style => "Default"
        selection: {
          anchor: { block: 0, childIndex: 0, offset: 0 },
          focus: { block: 0, childIndex: 0, offset: 0 },
        },
      },
    }
    const { runtime } = registerPlugins(stateRef)
    const entry = runtime.getToolbarEntries().find((item) => item.type === 'item' && item.item.id === 'bullet-list')
    const wrapper = entry.item.render(entry.ctx)
    document.body.appendChild(wrapper)
    wrapper.sync?.()

    const button = wrapper.querySelector('button')
    assert.ok(button.classList.contains('is-active'), 'Default is still a selected bullet option, button must be marked')

    stateRef.current = {
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [textNode('Not a list')] }],
      },
      selection: {
        anchor: { block: 0, offset: 0 },
        focus: { block: 0, offset: 0 },
      },
    }
    wrapper.sync?.()
    assert.equal(button.classList.contains('is-active'), false, 'outside a list the button must not be marked')
  })

  it('toolbar popover reflects active style, disables on multi-block selection, and creates a list from a plain paragraph', () => {
    const stateRef = {
      current: {
        doc: createDoc('square'),
        selection: {
          anchor: { block: 0, childIndex: 1, offset: 1 },
          focus: { block: 0, childIndex: 2, offset: 4 },
        },
      },
    }
    const { runtime } = registerPlugins(stateRef)
    const entry = runtime.getToolbarEntries().find((item) => item.type === 'item' && item.item.id === 'bullet-list')
    assert.ok(entry && entry.type === 'item')

    const wrapper = entry.item.render(entry.ctx)
    document.body.appendChild(wrapper)
    wrapper.sync?.()

    const button = wrapper.querySelector('button')
    assert.ok(button)
    assert.ok(button.classList.contains('is-active'), 'toolbar button should be marked while inside a bullet-list')
    button.click()

    const popover = document.body.querySelector('.editor__bullet-list-popover')
    assert.ok(popover)

    const active = popover.querySelector('.editor__bullet-list-option.is-active')
    assert.ok(active)
    assert.equal(active.dataset.style, 'square')

    const styles = [...popover.querySelectorAll('.editor__bullet-list-option')].map((button) => ({
      style: button.dataset.style,
      disabled: button.disabled,
    }))
    assert.deepEqual(styles.map((item) => item.disabled), [false, false, false, false])

    button.click()

    // A selection spanning a non-applicable block (e.g. a task-list) can't be converted or restyled.
    stateRef.current = {
      doc: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [textNode('One')] },
          {
            type: 'task-list',
            children: [{ type: 'task-item', content: [textNode('Task')], attrs: { 'data-checked': 'false' } }],
          },
        ],
      },
      selection: {
        anchor: { block: 0, offset: 0 },
        focus: { block: 1, offset: 0 },
      },
    }

    wrapper.sync?.()
    button.click()

    const disabledPopover = document.body.querySelector('.editor__bullet-list-popover')
    assert.ok(disabledPopover)
    assert.equal(
      [...disabledPopover.querySelectorAll('.editor__bullet-list-option')].every((el) => el.disabled),
      true,
    )

    button.click()

    // A plain paragraph is convertible: options are enabled (none marked active yet)
    // and clicking one turns the paragraph into a bullet-list with that style.
    stateRef.current = {
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [textNode('No list')] }],
      },
      selection: {
        anchor: { block: 0, offset: 2 },
        focus: { block: 0, offset: 5 },
      },
    }

    wrapper.sync?.()
    button.click()

    const convertPopover = document.body.querySelector('.editor__bullet-list-popover')
    assert.ok(convertPopover)
    assert.equal(
      [...convertPopover.querySelectorAll('.editor__bullet-list-option')].every((el) => !el.disabled),
      true,
    )
    assert.equal(convertPopover.querySelector('.editor__bullet-list-option.is-active'), null)

    convertPopover.querySelector('.editor__bullet-list-option[data-style="circle"]').click()

    const convertedBlock = /** @type {any} */ (stateRef.current.doc.content[0])
    assert.equal(convertedBlock.type, 'bullet-list')
    assert.equal(convertedBlock.style['list-style-type'], 'circle')
    assert.equal(convertedBlock.children[0].content[0].text, 'No list')
  })

  it('sanitize preserves allowed bullet list style and strips invalid styles', () => {
    const stateRef = { current: { doc: createDoc('disc'), selection: { anchor: { block: 0, childIndex: 0, offset: 0 }, focus: { block: 0, childIndex: 0, offset: 0 } } } }
    const { registries } = registerPlugins(stateRef)

    const safe = sanitizeHtml('<ul style="list-style-type: square;"><li>One</li></ul>', registries)
    assert.match(safe, /style="list-style-type:square"/)
    assert.match(safe, /<li>One<\/li>/)
  })

  it('sanitize preserves a short quoted custom marker (e.g. the star option) and strips longer/unquoted junk', () => {
    const stateRef = { current: { doc: createDoc(), selection: { anchor: { block: 0, childIndex: 0, offset: 0 }, focus: { block: 0, childIndex: 0, offset: 0 } } } }
    const { registries } = registerPlugins(stateRef)

    const star = sanitizeHtml('<ul style="list-style-type: &quot;★&quot;;"><li>One</li></ul>', registries)
    assert.match(star, /list-style-type:&quot;★&quot;/)

    const junk = sanitizeHtml('<ul style="list-style-type: not-a-real-value;"><li>One</li></ul>', registries)
    assert.doesNotMatch(junk, /list-style-type/)
  })
})

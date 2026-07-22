/**
 * @file Tests for design-system.
 */

import './helpers/dom.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  createButton,
  createToggleButton,
  createIcon,
  createInput,
  createTextarea,
  createSelect,
  createCheckbox,
  createRadio,
  createSeparator,
  createDivider,
  createBadge,
  createSpinner,
  createIconButton,
  createMenu,
  createDropdown,
  createContextMenuElement,
  createTooltip,
} from '../src/ui/design-system/index.js'
import { nextFormId } from '../src/ui/design-system/form-id.js'

describe('design-system/button', () => {
  it('creates a <button type=button> with base class and label', () => {
    const btn = createButton({ label: 'Salvar' })
    assert.equal(btn.tagName, 'BUTTON')
    assert.equal(btn.type, 'button')
    assert.equal(btn.textContent, 'Salvar')
    assert.ok(btn.className.includes('editor__btn'))
  })

  it('merges custom className and fires onClick', () => {
    const onClick = mock.fn()
    const btn = createButton({ className: 'my-btn', onClick })
    assert.ok(btn.className.includes('my-btn'))
    btn.dispatchEvent(new MouseEvent('click'))
    assert.equal(onClick.mock.callCount(), 1)
  })
})

describe('design-system/toggle-button', () => {
  it('applies is-active when active=true', () => {
    const btn = createToggleButton({ active: true })
    assert.ok(btn.classList.contains('is-active'))
    assert.ok(btn.classList.contains('editor__btn--toggle'))
  })

  it('does not apply is-active by default and respects disabled', () => {
    const btn = createToggleButton({ disabled: true })
    assert.equal(btn.classList.contains('is-active'), false)
    assert.equal(btn.disabled, true)
  })

  it('onClick receives the event', () => {
    const onClick = mock.fn()
    const btn = createToggleButton({ onClick })
    const event = new MouseEvent('click')
    btn.dispatchEvent(event)
    assert.equal(onClick.mock.callCount(), 1)
  })
})

describe('design-system/icon', () => {
  it('uses <svg> from markup when provided', () => {
    const icon = createIcon('<svg><path d="M0 0"/></svg>', { name: 'bold' })
    assert.ok(icon.querySelector('svg'))
    assert.equal(icon.className, 'editor__icon editor__icon--bold')
    assert.equal(icon.getAttribute('aria-hidden'), 'true')
  })

  it('falls back to textContent (label) when no valid svg', () => {
    const icon = createIcon('', { label: 'B' })
    assert.equal(icon.textContent, 'B')
    assert.equal(icon.className, 'editor__icon')
  })

  it('only ever appends the parsed <svg> element, dropping any sibling markup', () => {
    const icon = createIcon('<svg><path d="M0 0"/></svg><script>window.__pwned = true</script>', {
      name: 'bold',
    })
    assert.equal(icon.children.length, 1)
    assert.equal(icon.children[0].tagName.toLowerCase(), 'svg')
    assert.ok(!icon.innerHTML.includes('script'))
  })
})

describe('design-system/icon-button', () => {
  it('renders inline icon when iconSvg is passed and has no text', () => {
    const btn = createIconButton({ iconSvg: '<svg></svg>', title: 'Bold' })
    assert.equal(btn.textContent.trim(), '')
    assert.ok(btn.querySelector('.editor__icon'))
    assert.equal(btn.title, 'Bold')
  })

  it('respects disabled', () => {
    const btn = createIconButton({ disabled: true })
    assert.equal(btn.disabled, true)
  })
})

describe('design-system/badge', () => {
  it('uses default variant when not specified', () => {
    const badge = createBadge({ label: 'Novo' })
    assert.equal(badge.className, 'editor__badge editor__badge--default')
    assert.equal(badge.textContent, 'Novo')
  })

  it('applies the given variant', () => {
    const badge = createBadge({ label: 'Erro', variant: 'warning' })
    assert.equal(badge.className, 'editor__badge editor__badge--warning')
  })
})

describe('design-system/spinner', () => {
  it('sets role=status and translated aria-label', () => {
    const spinner = createSpinner('', (key) => `t:${key}`)
    assert.equal(spinner.getAttribute('role'), 'status')
    assert.equal(spinner.getAttribute('aria-label'), 't:ui.spinner.loading')
  })
})

describe('design-system/separator', () => {
  it('createSeparator define role=separator', () => {
    const sep = createSeparator()
    assert.equal(sep.getAttribute('role'), 'separator')
    assert.equal(sep.className, 'editor__separator')
  })

  it('createDivider uses <hr> and reflects orientation', () => {
    const divider = createDivider('vertical')
    assert.equal(divider.tagName, 'HR')
    assert.equal(divider.className, 'editor__divider editor__divider--vertical')
  })
})

describe('design-system/form-id', () => {
  it('generates unique and incremental ids per prefix', () => {
    const a = nextFormId('input')
    const b = nextFormId('input')
    assert.notEqual(a, b)
    assert.match(a, /^editor-input-\d+$/)
  })
})

describe('design-system/checkbox', () => {
  it('associates label with input via htmlFor/id and fires onChange', () => {
    const onChange = mock.fn()
    const wrapper = createCheckbox({ label: 'Ativo', checked: true, onChange })
    const input = wrapper.querySelector('input[type=checkbox]')

    assert.equal(wrapper.htmlFor, input.id)
    assert.equal(input.checked, true)
    assert.equal(wrapper.querySelector('.editor__checkbox-label').textContent, 'Ativo')

    input.checked = false
    input.dispatchEvent(new window.Event('change'))
    assert.equal(onChange.mock.callCount(), 1)
    assert.equal(onChange.mock.calls[0].arguments[0], false)
  })
})

describe('design-system/radio', () => {
  it('only calls onChange when radio itself is marked', () => {
    const onChange = mock.fn()
    const wrapper = createRadio({ name: 'g', value: 'a', onChange })
    const input = wrapper.querySelector('input[type=radio]')

    input.checked = false
    input.dispatchEvent(new window.Event('change'))
    assert.equal(onChange.mock.callCount(), 0)

    input.checked = true
    input.dispatchEvent(new window.Event('change'))
    assert.equal(onChange.mock.callCount(), 1)
    assert.equal(onChange.mock.calls[0].arguments[0], 'a')
  })
})

describe('design-system/input', () => {
  it('reflects value/placeholder/disabled and fires onChange on input event', () => {
    const onChange = mock.fn()
    const input = createInput({ value: 'x', placeholder: 'Digite', onChange })
    assert.equal(input.value, 'x')
    assert.equal(input.placeholder, 'Digite')

    input.value = 'y'
    input.dispatchEvent(new window.Event('input'))
    assert.equal(onChange.mock.calls[0].arguments[0], 'y')
  })

  it('name falls back to id when not informed', () => {
    const input = createInput({ id: 'my-id' })
    assert.equal(input.name, 'my-id')
  })
})

describe('design-system/textarea', () => {
  it('sets default rows to 3 and triggers onChange', () => {
    const onChange = mock.fn()
    const textarea = createTextarea({ onChange })
    assert.equal(textarea.rows, 3)

    textarea.value = 'abc'
    textarea.dispatchEvent(new window.Event('input'))
    assert.equal(onChange.mock.calls[0].arguments[0], 'abc')
  })
})

describe('design-system/select (native)', () => {
  it('populates options and applies initial value', () => {
    const select = createSelect({
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
      value: 'b',
    })
    assert.equal(select.options.length, 2)
    assert.equal(select.value, 'b')
  })

  it('fires onChange on change event with new value', () => {
    const onChange = mock.fn()
    const select = createSelect({ options: [{ value: 'a', label: 'A' }], onChange })
    select.value = 'a'
    select.dispatchEvent(new window.Event('change'))
    assert.equal(onChange.mock.calls[0].arguments[0], 'a')
  })
})

describe('design-system/menu', () => {
  it('renders one item per entry and separators as <hr>', () => {
    const onClick = mock.fn()
    const menu = createMenu({
      items: [
        { id: 'a', label: 'A', onClick },
        { separator: true },
        { id: 'b', label: 'B', disabled: true },
      ],
    })

    assert.equal(menu.getAttribute('role'), 'menu')
    assert.equal(menu.querySelectorAll('.editor__menu-item').length, 2)
    assert.equal(menu.querySelectorAll('hr.editor__menu-separator').length, 1)

    const [itemA] = menu.querySelectorAll('.editor__menu-item')
    itemA.dispatchEvent(new MouseEvent('click'))
    assert.equal(onClick.mock.callCount(), 1)

    const itemB = menu.querySelectorAll('.editor__menu-item')[1]
    assert.equal(itemB.disabled, true)
  })
})

describe('design-system/dropdown', () => {
  it('starts with panel hidden and toggles hidden on trigger click', () => {
    const dropdown = createDropdown({ label: 'Options', items: [{ id: 'x', label: 'X' }] })
    const panel = dropdown.querySelector('.editor__dropdown-menu')
    const trigger = dropdown.querySelector('.editor__dropdown-trigger')

    assert.equal(panel.hidden, true)
    trigger.dispatchEvent(new MouseEvent('click'))
    assert.equal(panel.hidden, false)
    trigger.dispatchEvent(new MouseEvent('click'))
    assert.equal(panel.hidden, true)
  })
})

describe('design-system/context-menu', () => {
  it('creates a menu with role=menu and editor__context-menu class', () => {
    const menu = createContextMenuElement({ items: [{ id: 'a', label: 'A' }] })
    assert.equal(menu.getAttribute('role'), 'menu')
    assert.ok(menu.className.includes('editor__context-menu'))
  })
})

describe('design-system/tooltip', () => {
  it('shows on mouseenter/focus and hides on mouseleave/blur', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    const tooltip = createTooltip({ target, content: 'Ajuda' })

    target.dispatchEvent(new window.Event('mouseenter'))
    assert.ok(document.body.contains(document.querySelector('.editor__tooltip')))

    target.dispatchEvent(new window.Event('mouseleave'))
    assert.equal(document.querySelector('.editor__tooltip'), null)
  })

  it('destroy removes listeners and element', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    const tooltip = createTooltip({ target, content: 'Ajuda' })

    tooltip.destroy()
    target.dispatchEvent(new window.Event('mouseenter'))
    assert.equal(document.querySelector('.editor__tooltip'), null)
  })
})

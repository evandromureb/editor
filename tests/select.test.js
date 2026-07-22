import './helpers/dom.js'
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { Select } from '../src/ui/select/index.js'

describe('Select', () => {
  /** @type {Select | null} */
  let select = null
  /** @type {HTMLElement | null} */
  let host = null

  beforeEach(() => {
    host = document.createElement('div')
    host.className = 'editor'

    const overlay = document.createElement('div')
    overlay.className = 'editor__overlay-root'
    host.appendChild(overlay)

    document.body.appendChild(host)

    select = new Select({
      id: 'test-select',
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ],
      value: 'a',
      onChange: () => {},
    })

    host.appendChild(select.element)
  })

  afterEach(() => {
    select?.destroy()
    host?.remove()
    select = null
    host = null
  })

  it('opens on first click', () => {
    assert.ok(select)
    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.click()
    assert.equal(select.open, true)
    assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  })

  it('closes when clicking outside', async () => {
    assert.ok(select)
    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.click()
    assert.equal(select.open, true)

    await new Promise((resolve) => queueMicrotask(resolve))

    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    outside.remove()

    assert.equal(select.open, false)
  })

  it('selects option when clicking item', () => {
    let changed = ''
    select?.destroy()

    select = new Select({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
      value: 'a',
      onChange: (value) => {
        changed = value
      },
    })
    host.replaceChildren(select.element)

    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)
    trigger.click()

    const items = select.menuElement.querySelectorAll('.bl-select__item')
    assert.equal(items.length, 2)

    items[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    assert.equal(changed, 'b')
    assert.equal(select.value, 'b')
    assert.equal(select.open, false)
  })

  it('renders menu in portal when opened', () => {
    assert.ok(select)
    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.click()

    assert.equal(select.open, true)
    assert.equal(
      select.menuElement.parentElement?.className,
      'editor__overlay-root',
    )
    assert.equal(select.menuElement.classList.contains('bl-select__menu--portal'), true)
  })

  it('does not use native select for visual rendering', () => {
    assert.ok(select)
    assert.equal(select.element.querySelector('select'), null)
    assert.ok(select.element.querySelector('.bl-select__trigger'))
    assert.ok(select.element.querySelector('.bl-select__menu'))
  })

  it('keyboard navigation with arrows and Enter', () => {
    let changed = ''
    select?.destroy()

    select = new Select({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
      value: 'a',
      onChange: (value) => {
        changed = value
      },
    })
    host.replaceChildren(select.element)

    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    assert.equal(changed, 'b')
    assert.equal(select.open, false)
  })

  it('Escape closes the menu', () => {
    assert.ok(select)
    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(select.open, false)
  })

  it('setLabel clears stale active item when label is not an option', () => {
    let changed = ''
    select?.destroy()

    select = new Select({
      options: [
        { value: '8px', label: '8px' },
        { value: '16px', label: '16px' },
      ],
      placeholder: '16px',
      onChange: (value) => {
        changed = value
      },
    })
    host.replaceChildren(select.element)

    select.setLabel('16px')
    const trigger = select.element.querySelector('.bl-select__trigger')
    trigger.click()

    const activeItems = select.menuElement.querySelectorAll('.bl-select__item.is-active')
    assert.equal(activeItems.length, 1)
    assert.equal(activeItems[0].textContent?.includes('16px'), true)
    assert.equal(changed, '')
  })

  it('portal menu uses max-content width with trigger min-width', () => {
    assert.ok(select)
    select.element.style.width = '40px'

    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)
    trigger.click()

    assert.equal(select.menuElement.style.width, 'max-content')
    assert.equal(
      select.menuElement.style.minWidth,
      `${trigger.getBoundingClientRect().width}px`,
    )
  })

  it('Home and End move highlight', () => {
    assert.ok(select)
    const trigger = select.element.querySelector('.bl-select__trigger')
    assert.ok(trigger)

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))

    const firstItem = select.menuElement.querySelector('.bl-select__item')
    assert.ok(firstItem)
    assert.equal(firstItem.classList.contains('is-highlighted'), true)

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    const items = select.menuElement.querySelectorAll('.bl-select__item')
    assert.equal(items[items.length - 1].classList.contains('is-highlighted'), true)
  })
})

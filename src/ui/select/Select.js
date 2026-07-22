import { createSelectItem } from './SelectItem.js'
import { createSelectTrigger } from './SelectTrigger.js'

/**
 * @typedef {object} SelectOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} [disabled]
 * @property {string} [fontFamily]
 */

/**
 * @typedef {object} SelectOpts
 * @property {SelectOption[]} [options]
 * @property {string} [value]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {'top' | 'bottom'} [placement]
 * @property {HTMLElement} [portalRoot]
 * @property {boolean} [searchable]
 * @property {string} [placeholder]
 * @property {(value: string) => void} [onChange]
 * @property {(key: string) => string} [t]
 */

/** @type {ReadonlyArray<string>} */
const EDITOR_TOKEN_NAMES = [
  '--editor-font-family',
  '--editor-font-size',
  '--editor-fg',
  '--editor-chrome-fg',
  '--editor-menu-bg',
  '--editor-btn-border',
  '--editor-hover-bg',
  '--editor-active-bg',
  '--editor-radius-control',
  '--editor-radius-md',
]

export class Select {
  /** @type {HTMLElement} */
  #root

  /** @type {HTMLButtonElement} */
  #trigger

  /** @type {HTMLElement} */
  #valueEl

  /** @type {HTMLElement} */
  #menu

  /** @type {HTMLButtonElement[]} */
  #items = []

  /** @type {SelectOption[]} */
  #options

  /** @type {string} */
  #value

  /** @type {(value: string) => void} */
  #onChange

  /** @type {'top' | 'bottom'} */
  #placement

  /** @type {boolean} */
  #open = false

  /** @type {boolean} */
  #portaled = false

  /** @type {number} */
  #highlightIndex = -1

  /** @type {boolean} */
  #ignoreOutsideClick = false

  /** @type {number} */
  #lastPointerX = 0

  /** @type {number} */
  #lastPointerY = 0

  /** @type {(e: MouseEvent) => void} */
  #onDocumentClick

  /** @type {(e: KeyboardEvent) => void} */
  #onDocumentKeyDown

  /** @type {() => void} */
  #onWindowLayout

  /** @type {(event: PointerEvent) => void} */
  #onMenuPointerMove

  /** @type {(event: PointerEvent) => void} */
  #onDocumentPointerMove

  /** @type {(event: MouseEvent) => void} */
  #onMenuMouseOver

  /** @type {HTMLElement | null} */
  #portalRoot

  /** @type {boolean} */
  #searchable

  /** @type {string} */
  #placeholder

  /** @type {HTMLInputElement | null} */
  #searchInput = null

  /** @type {string} */
  #searchQuery = ''

  /** @type {(key: string) => string} */
  #t

  /** @param {SelectOpts} [opts] */
  constructor(opts = {}) {
    this.#options = opts.options ?? []
    this.#value = opts.value ?? ''
    this.#onChange = opts.onChange ?? (() => {})
    this.#placement = opts.placement === 'top' ? 'top' : 'bottom'
    this.#portalRoot = opts.portalRoot ?? null
    this.#searchable = opts.searchable ?? false
    this.#placeholder = opts.placeholder ?? ''
    this.#t = opts.t ?? ((k) => k)

    this.#root = document.createElement('div')
    this.#root.className = ['bl-select', opts.className].filter(Boolean).join(' ')

    if (opts.name) {
      this.#root.dataset.name = opts.name
    }

    const selected = this.#getSelectedOption()
    this.#trigger = createSelectTrigger({
      label: selected?.label ?? this.#placeholder,
      id: opts.id,
      disabled: opts.disabled ?? false,
    })

    this.#valueEl = this.#trigger.querySelector('.bl-select__value')
    if (!this.#valueEl) {
      throw new Error('Select trigger is missing value element')
    }

    this.#menu = document.createElement('div')
    this.#menu.className = [
      'bl-select__menu',
      this.#placement === 'top' ? 'bl-select__menu--top' : 'bl-select__menu--bottom',
    ].join(' ')
    this.#menu.setAttribute('role', 'listbox')
    this.#menu.hidden = true

    this.#bindOptions(this.#options)

    this.#trigger.addEventListener('mousedown', (event) => {
      this.#lastPointerX = event.clientX
      this.#lastPointerY = event.clientY
      event.stopPropagation()
    })

    this.#trigger.addEventListener('click', (event) => {
      event.stopPropagation()
      this.toggle()
    })

    this.#trigger.addEventListener('keydown', (event) => this.#handleTriggerKeyDown(event))
    this.#menu.addEventListener('keydown', (event) => this.#handleMenuKeyDown(event))

    this.#onDocumentClick = (event) => {
      if (this.#ignoreOutsideClick) return

      const target = event.target
      if (!(target instanceof Node)) return
      if (this.#isInternalTarget(target)) return
      this.close()
    }

    this.#onDocumentKeyDown = (event) => {
      if (!this.#open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
        this.#trigger.focus()
      }
    }

    this.#onWindowLayout = () => {
      if (this.#open && this.#portaled) {
        this.#positionMenu()
      }
    }

    this.#onMenuPointerMove = (event) => {
      if (!this.#open) return
      this.#syncHighlightFromPointer(event.clientX, event.clientY)
    }

    this.#onDocumentPointerMove = (event) => {
      if (!this.#open) return
      if (!(event.target instanceof Node) || !this.#menu.contains(event.target)) return
      this.#syncHighlightFromPointer(event.clientX, event.clientY)
    }

    this.#onMenuMouseOver = (event) => {
      if (!this.#open) return

      const target = event.target
      if (!(target instanceof Element)) return

      const item = target.closest('.bl-select__item')
      if (!(item instanceof HTMLButtonElement) || item.disabled) return

      const index = this.#items.indexOf(item)
      if (index >= 0) {
        this.#setHighlight(index)
      }
    }

    this.#menu.addEventListener('pointermove', this.#onMenuPointerMove)
    this.#menu.addEventListener('pointerover', this.#onMenuPointerMove)
    this.#menu.addEventListener('mouseover', this.#onMenuMouseOver)

    this.#root.append(this.#trigger, this.#menu)
    this.syncActiveItem()
  }

  /** @returns {HTMLElement} */
  get element() {
    return this.#root
  }

  /** @returns {HTMLElement} */
  get menuElement() {
    return this.#menu
  }

  /** @returns {string} */
  get value() {
    return this.#value
  }

  /** @returns {boolean} */
  get open() {
    return this.#open
  }

  /** @param {string} label */
  setLabel(label) {
    this.#valueEl.textContent = label
    const match = this.#options.find((option) => option.label === label)
    this.#value = match?.value ?? ''
    this.syncActiveItem()
  }

  /** @param {string} placeholder */
  setPlaceholder(placeholder) {
    this.#placeholder = placeholder
    if (!this.#getSelectedOption()) {
      this.#valueEl.textContent = placeholder
    }
  }

  /**
   * Reapplies translations when the language changes at runtime.
   * @param {(key: string) => string} t
   * @param {{ placeholder?: string, options?: SelectOption[] }} [opts]
   */
  relocalize(t, opts = {}) {
    this.#t = t

    if (opts.placeholder !== undefined) {
      this.setPlaceholder(opts.placeholder)
    }

    if (this.#searchInput) {
      this.#searchInput.setAttribute('aria-label', this.#t('ui.select.search'))
    }

    if (opts.options) {
      this.setOptions(opts.options)
    }
  }

  /** @param {string} value @param {boolean} [emit] */
  setValue(value, emit = false) {
    const selected = this.#options.find((option) => option.value === value)
    if (!selected) return

    this.#value = value
    this.#valueEl.textContent = selected.label

    this.syncActiveItem()

    if (emit) {
      this.#onChange(value)
    }
  }

  /** @param {SelectOption[]} options */
  setOptions(options) {
    this.#options = options
    this.#bindOptions(options)

    if (!options.some((option) => option.value === this.#value)) {
      this.#value = ''
      this.#valueEl.textContent = this.#getSelectedOption()?.label ?? this.#placeholder
    }

    this.syncActiveItem()
  }

  /** @param {SelectOption[]} options */
  #bindOptions(options) {
    this.#menu.replaceChildren()
    this.#items = []

    if (this.#searchable) {
      if (!this.#searchInput) {
        this.#searchInput = document.createElement('input')
        this.#searchInput.type = 'search'
        this.#searchInput.className = 'bl-select__search'
        this.#searchInput.setAttribute('aria-label', this.#t('ui.select.search'))
        this.#searchInput.addEventListener('input', () => {
          this.#searchQuery = this.#searchInput?.value.toLowerCase() ?? ''
          this.#bindOptions(this.#options)
        })
        this.#searchInput.addEventListener('keydown', (event) => {
          event.stopPropagation()
        })
      }
      this.#menu.appendChild(this.#searchInput)
    }

    const visible = this.#searchable && this.#searchQuery
      ? options.filter((option) => option.label.toLowerCase().includes(this.#searchQuery))
      : options

    for (const option of visible) {
      const item = createSelectItem(option)

      item.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (option.disabled) return
        this.#selectOption(option.value)
      })

      this.#menu.appendChild(item)
      this.#items.push(item)
    }
  }

  /** @param {string} value */
  #selectOption(value) {
    this.setValue(value, true)
    this.close()
    this.#trigger.focus()
  }

  syncActiveItem() {
    const selectedIndex = this.#options.findIndex((option) => option.value === this.#value)

    this.#items.forEach((item, index) => {
      const isActive = index === selectedIndex
      item.classList.toggle('is-active', isActive)
      item.setAttribute('aria-selected', String(isActive))

      const labelEl = item.querySelector('.bl-select__label')
      const option = this.#options[index]
      if (labelEl && option) {
        labelEl.textContent = option.label
      }
    })

    if (!this.#open) {
      this.#highlightIndex = selectedIndex
      this.#updateHighlight()
    }

    this.#trigger.setAttribute(
      'aria-activedescendant',
      selectedIndex >= 0 ? this.#itemId(selectedIndex) : '',
    )
  }

  openMenu() {
    if (this.#open || this.#trigger.disabled) return

    this.#releaseEditorSurfaceFocus()

    this.#open = true
    this.#menu.hidden = false
    this.#root.classList.add('is-open')
    this.#menu.classList.add('is-open')
    this.#trigger.setAttribute('aria-expanded', 'true')
    this.#trigger.focus()

    if (this.#highlightIndex < 0) {
      this.#highlightIndex = Math.max(
        0,
        this.#options.findIndex((option) => option.value === this.#value),
      )
    }

    this.#updateHighlight()
    this.#mountPortal()
    this.#applyEditorTokens()

    this.#ignoreOutsideClick = true
    document.addEventListener('click', this.#onDocumentClick, true)
    document.addEventListener('keydown', this.#onDocumentKeyDown, true)
    document.addEventListener('pointermove', this.#onDocumentPointerMove, true)
    window.addEventListener('resize', this.#onWindowLayout)
    window.addEventListener('scroll', this.#onWindowLayout, true)

    queueMicrotask(() => {
      this.#ignoreOutsideClick = false
      this.#syncHighlightFromPointer(this.#lastPointerX, this.#lastPointerY)
      if (this.#searchable && this.#searchInput) {
        this.#searchInput.focus()
      }
    })

    requestAnimationFrame(() => {
      this.#syncHighlightFromPointer(this.#lastPointerX, this.#lastPointerY)
    })
  }

  close() {
    if (!this.#open) return

    this.#open = false
    this.#menu.hidden = true
    this.#root.classList.remove('is-open')
    this.#menu.classList.remove('is-open')
    this.#trigger.setAttribute('aria-expanded', 'false')
    this.#searchQuery = ''
    if (this.#searchInput) {
      this.#searchInput.value = ''
    }
    document.removeEventListener('click', this.#onDocumentClick, true)
    document.removeEventListener('keydown', this.#onDocumentKeyDown, true)
    document.removeEventListener('pointermove', this.#onDocumentPointerMove, true)
    window.removeEventListener('resize', this.#onWindowLayout)
    window.removeEventListener('scroll', this.#onWindowLayout, true)
    this.#unmountPortal()
  }

  toggle() {
    if (this.#open) {
      this.close()
    } else {
      this.openMenu()
    }
  }

  destroy() {
    this.close()
    this.#root.remove()
  }

  /** @param {number} clientX @param {number} clientY */
  #syncHighlightFromPointer(clientX, clientY) {
    if (!this.#open || this.#items.length === 0) return

    /** @type {Element[]} */
    const stack =
      typeof document.elementsFromPoint === 'function'
        ? document.elementsFromPoint(clientX, clientY)
        : typeof document.elementFromPoint === 'function'
          ? [document.elementFromPoint(clientX, clientY)].filter(
              (element) => element instanceof Element,
            )
          : []

    for (const element of stack) {
      const item = element.closest('.bl-select__item')
      if (!(item instanceof HTMLButtonElement) || item.disabled) continue
      if (!this.#menu.contains(item)) continue

      const index = this.#items.indexOf(item)
      if (index >= 0) {
        this.#setHighlight(index)
        return
      }
    }
  }

  #releaseEditorSurfaceFocus() {
    const editor = this.#root.closest('.editor')
    if (!(editor instanceof HTMLElement)) return

    const surface = editor.querySelector('.editor__surface')
    if (!(surface instanceof HTMLElement)) return

    if (document.activeElement === surface) {
      surface.blur()
    }
  }

  /** @param {Node} target */
  #isInternalTarget(target) {
    return this.#root.contains(target) || this.#menu.contains(target)
  }

  #mountPortal() {
    if (!this.#portaled) {
      this.#menu.classList.add('bl-select__menu--portal')
      this.#resolvePortalTarget().appendChild(this.#menu)
      this.#portaled = true
    }

    this.#applyEditorTokens()
    this.#positionMenu()
  }

  #unmountPortal() {
    if (!this.#portaled) return

    this.#menu.classList.remove('bl-select__menu--portal')
    this.#clearMenuPosition()
    this.#clearEditorTokens()
    this.#root.appendChild(this.#menu)
    this.#portaled = false
  }

  /** @returns {HTMLElement} */
  #resolvePortalTarget() {
    if (this.#portalRoot) return this.#portalRoot

    const editor = this.#root.closest('.editor')
    if (editor) {
      const overlay = editor.querySelector('.editor__overlay-root')
      if (overlay instanceof HTMLElement) return overlay
      return editor
    }

    return document.body
  }

  #applyEditorTokens() {
    const editor = this.#root.closest('.editor')
    const source = editor instanceof HTMLElement ? editor : this.#trigger
    const computed = getComputedStyle(source)

    for (const token of EDITOR_TOKEN_NAMES) {
      const value = computed.getPropertyValue(token).trim()
      if (value) {
        this.#menu.style.setProperty(token, value)
      }
    }
  }

  #clearEditorTokens() {
    for (const token of EDITOR_TOKEN_NAMES) {
      this.#menu.style.removeProperty(token)
    }
  }

  #positionMenu() {
    const rect = this.#trigger.getBoundingClientRect()
    const margin = 8
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth

    this.#menu.style.position = 'fixed'
    this.#menu.style.minWidth = `${rect.width}px`
    this.#menu.style.width = 'max-content'
    this.#menu.style.maxWidth = `${viewportW - margin * 2}px`
    this.#menu.style.maxHeight = `${viewportH - margin * 2}px`
    this.#menu.style.overflowY = 'auto'
    this.#menu.style.overflowX = 'hidden'

    const menuHeight = this.#menu.offsetHeight || 0
    let placement = this.#placement

    if (placement === 'bottom') {
      const overflowBottom = rect.bottom + 4 + menuHeight + margin > viewportH
      const fitsTop = rect.top - 4 - menuHeight >= margin
      if (overflowBottom && fitsTop) {
        placement = 'top'
      }
    } else {
      const overflowTop = rect.top - 4 - menuHeight < margin
      const fitsBottom = rect.bottom + 4 + menuHeight + margin <= viewportH
      if (overflowTop && fitsBottom) {
        placement = 'bottom'
      }
    }

    if (placement === 'top') {
      this.#menu.style.top = 'auto'
      this.#menu.style.bottom = `${viewportH - rect.top + 4}px`
    } else {
      this.#menu.style.bottom = 'auto'
      this.#menu.style.top = `${rect.bottom + 4}px`
    }

    const menuWidth = this.#menu.offsetWidth || rect.width
    let left = rect.left
    left = Math.max(margin, Math.min(left, viewportW - menuWidth - margin))
    this.#menu.style.left = `${left}px`
  }

  #clearMenuPosition() {
    this.#menu.style.position = ''
    this.#menu.style.left = ''
    this.#menu.style.top = ''
    this.#menu.style.bottom = ''
    this.#menu.style.width = ''
    this.#menu.style.minWidth = ''
    this.#menu.style.maxWidth = ''
    this.#menu.style.overflowX = ''
  }

  /** @returns {SelectOption | undefined} */
  #getSelectedOption() {
    return this.#options.find((option) => option.value === this.#value)
  }

  /** @param {number} index */
  #itemId(index) {
    return `${this.#trigger.id || 'bl-select'}-option-${index}`
  }

  /** @param {number} index */
  #setHighlight(index) {
    if (this.#items.length === 0) return

    const clamped = Math.max(0, Math.min(index, this.#items.length - 1))
    this.#highlightIndex = clamped
    this.#updateHighlight()
  }

  #updateHighlight() {
    this.#items.forEach((item, index) => {
      item.classList.toggle('is-highlighted', index === this.#highlightIndex)
      item.id = this.#itemId(index)
    })

    const highlighted = this.#items[this.#highlightIndex]
    if (highlighted) {
      this.#trigger.setAttribute('aria-activedescendant', highlighted.id)
    }
  }

  /** @param {KeyboardEvent} event */
  #handleTriggerKeyDown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!this.#open) {
          this.openMenu()
        } else {
          this.#setHighlight(this.#highlightIndex + 1)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!this.#open) {
          this.openMenu()
        } else {
          this.#setHighlight(this.#highlightIndex - 1)
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (this.#open) {
          const option = this.#options[this.#highlightIndex]
          if (option && !option.disabled) {
            this.#selectOption(option.value)
          }
        } else {
          this.openMenu()
        }
        break
      case 'Home':
        event.preventDefault()
        if (!this.#open) this.openMenu()
        this.#setHighlight(0)
        break
      case 'End':
        event.preventDefault()
        if (!this.#open) this.openMenu()
        this.#setHighlight(this.#items.length - 1)
        break
      case 'Escape':
        if (this.#open) {
          event.preventDefault()
          this.close()
        }
        break
      case 'Tab':
        this.close()
        break
    }
  }

  /** @param {KeyboardEvent} event */
  #handleMenuKeyDown(event) {
    this.#handleTriggerKeyDown(event)
  }
}

/**
 * @param {SelectOpts} [opts]
 * @returns {Select}
 */
export function createCustomSelect(opts) {
  return new Select(opts)
}

/** @typedef {import('../../core/plugins/runtime.js').ToolbarEntry} ToolbarEntry */
/** @typedef {import('../../sdk/types.js').PluginContext} PluginContext */
/** @typedef {import('../../sdk/types.js').ToolbarItem} ToolbarItem */

/**
 * @typedef {object} ToolbarOptions
 * @property {HTMLElement} root
 * @property {ToolbarEntry[]} [entries]
 * @property {ToolbarEntry[][]} [lines]
 * @property {(key: string) => string} t
 */

export class Toolbar {
  /** @type {HTMLElement} */
  #root

  /** @type {(key: string) => string} */
  #t

  /** @type {Map<string, { opts: ToolbarItem, button: HTMLElement, ctx: PluginContext, sync?: () => void }>} */
  #items = new Map()

  /** @param {ToolbarOptions} options */
  constructor(options) {
    this.#root = options.root
    this.#t = options.t
    this.#renderLines(options.lines ?? (options.entries ? [options.entries] : []))
    this.refresh()
  }

  /**
   * @param {ToolbarEntry[] | ToolbarEntry[][]} entriesOrLines
   */
  setEntries(entriesOrLines) {
    this.#renderLines(normalizeToolbarLines(entriesOrLines))
    this.refresh()
  }

  /** @param {string[]} ids */
  removeItems(ids) {
    for (const id of ids) {
      this.#items.delete(id)
    }
    const sep = [...this.#root.querySelectorAll('[data-separator-id]')].filter((el) =>
      ids.includes(el.dataset.separatorId ?? '')
    )
    for (const s of sep) s.remove()
    for (const id of ids) {
      const btn = this.#root.querySelector(
        `.editor__toolbar-btn--${id}, .editor__toolbar-widget--${id}`
      )
      btn?.remove()
    }
  }

  relocalize(t) {
    this.#t = t
    for (const { opts, button } of this.#items.values()) {
      if (opts.render) {
        if (typeof button.relocalize === 'function') {
          button.relocalize(t)
        }
        continue
      }

      const label = t(opts.label ?? '')
      const titleBase = opts.title ? t(opts.title) : label

      if (opts.icon) {
        button.setAttribute('aria-label', titleBase)
        button.title = titleBase
      } else {
        button.textContent = label
        button.title = titleBase
      }
    }
  }

  refresh() {
    for (const { opts, button, ctx, sync } of this.#items.values()) {
      if (typeof sync === 'function') {
        sync()
      }

      const enabled = opts.isEnabled?.(ctx) ?? ctx.getMode() === 'editor'

      if (opts.render) {
        button.classList.toggle('is-disabled', !enabled)
        if (button.matches('button, input, select')) {
          button.disabled = !enabled
        }
        for (const el of button.querySelectorAll('button, input, select')) {
          el.disabled = !enabled
        }
        continue
      }

      const active = enabled && (opts.isActive?.(ctx) ?? false)

      button.disabled = !enabled
      button.classList.toggle('is-active', active)
    }
  }

  /**
   * @param {ToolbarEntry[][]} lines
   */
  #renderLines(lines) {
    const multiline = lines.length > 1
    this.#root.classList.toggle('editor__toolbar-track--multiline', multiline)
    this.#root.replaceChildren()
    this.#items.clear()

    if (multiline) {
      for (const entries of lines) {
        const rowEl = document.createElement('div')
        rowEl.className = 'editor__toolbar-row'
        this.#renderEntryGroups(rowEl, entries)
        this.#root.appendChild(rowEl)
      }
      return
    }

    this.#renderEntryGroups(this.#root, lines[0] ?? [])
  }

  /**
   * @param {HTMLElement} container
   * @param {ToolbarEntry[]} entries
   */
  #renderEntryGroups(container, entries) {
    const grouped = this.#groupEntries(entries)

    for (const [groupName, groupEntries] of grouped) {
      const groupEl = document.createElement('div')
      groupEl.className = `editor__toolbar-group editor__toolbar-group--${groupName}`
      groupEl.dataset.group = groupName

      for (const entry of groupEntries) {
        if (entry.type === 'separator') {
          const sep = document.createElement('div')
          sep.className = 'editor__toolbar-separator'
          sep.dataset.separatorId = entry.id
          sep.setAttribute('role', 'separator')
          groupEl.appendChild(sep)
          continue
        }

        const { item, ctx } = entry

        if (item.render) {
          const widget = item.render(ctx)
          widget.classList.add(`editor__toolbar-widget--${item.id}`)
          widget.dataset.plugin = item.id
          const sync = typeof widget.sync === 'function' ? widget.sync.bind(widget) : undefined
          groupEl.appendChild(widget)
          this.#items.set(item.id, { opts: item, button: widget, ctx, sync })
          continue
        }

        const button = ctx.ui.createToolbarItem({
          ...item,
          onClick: (event) => {
            if (item.onClick) {
              item.onClick(ctx, { anchor: button, event })
            } else if (item.command) {
              ctx.execCommand(item.command)
              // A plain command button (bold, task-list, hr, ...) fires a
              // one-off edit — clicking it must not leave the caret sitting
              // on the button, so return focus to the editor content at the
              // position the command just edited. Scoped to this branch
              // only: `item.onClick` handlers (open a dialog/popover, live
              // update a field on every keystroke, ...) manage focus
              // themselves and must not be fought over here.
              ctx.services.focus.focusEditor()
            }
          },
        })

        button.dataset.labelKey = item.label ?? ''
        if (item.title) button.dataset.titleKey = item.title

        groupEl.appendChild(button)
        this.#items.set(item.id, { opts: item, button, ctx })
      }

      container.appendChild(groupEl)
    }
  }

  /**
   * @param {ToolbarEntry[]} entries
   * @returns {Map<string, ToolbarEntry[]>}
   */
  #groupEntries(entries) {
    const groupOrder = ['history', 'font', 'format', 'color', 'insert', 'text', 'default']

    /** @type {Map<string, ToolbarEntry[]>} */
    const groups = new Map()

    for (const entry of entries) {
      const groupName = entry.group ?? 'default'
      if (!groups.has(groupName)) groups.set(groupName, [])
      groups.get(groupName).push(entry)
    }

    for (const list of groups.values()) {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }

    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        const aIndex = groupOrder.indexOf(a)
        const bIndex = groupOrder.indexOf(b)
        return (
          (aIndex === -1 ? groupOrder.length : aIndex) -
          (bIndex === -1 ? groupOrder.length : bIndex)
        )
      })
    )
  }
}

/**
 * @param {ToolbarEntry[] | ToolbarEntry[][]} entriesOrLines
 * @returns {ToolbarEntry[][]}
 */
function normalizeToolbarLines(entriesOrLines) {
  if (!entriesOrLines?.length) return []
  if (Array.isArray(entriesOrLines[0])) {
    return /** @type {ToolbarEntry[][]} */ (entriesOrLines)
  }
  return [/** @type {ToolbarEntry[]} */ (entriesOrLines)]
}

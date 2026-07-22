/**
 * @file Task list plugin — checklists with real nested blocks (`task-list`
 * container holding `task-item` children), rendered as:
 *
 *   <ul data-task-list="true">
 *     <li data-task-item="true" data-checked="false">
 *       <input type="checkbox" data-task-checkbox="true" contenteditable="false">
 *       <span data-task-content="true">...</span>
 *     </li>
 *   </ul>
 *
 * Only `commands.js` (state transitions) — no subfolders, matching this
 * repo's convention. Checkbox click-to-toggle is wired the same way
 * `plugins/image/index.js` wires click-to-select: a single surface-level
 * click listener.
 */

import { definePlugin, block, toolbarItem } from '@baselab/plugin-sdk'
import {
  TASK_LIST_TYPE,
  TASK_ITEM_TYPE,
  insertTaskList,
  toggleTaskItem,
  indentTaskItem,
  outdentTaskItem,
} from './commands.js'

/** @typedef {import('@baselab/plugin-sdk').PluginContext} PluginContext */

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z"/><path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0M7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0"/></svg>'

/** @type {(() => void) | null} */
let clickOff = null

export default definePlugin({
  id: 'task-list',
  name: 'Task List',
  version: '1.0.0',

  capabilities: {
    blocks: [
      block(TASK_LIST_TYPE, {
        tag: 'ul',
        isContainer: true,
        childType: TASK_ITEM_TYPE,
        fixedAttrs: { 'data-task-list': 'true' },
      }),
      block(TASK_ITEM_TYPE, {
        tag: 'li',
        childOnly: true,
        attrs: ['data-checked'],
        attrDefaults: { 'data-checked': 'false' },
        fixedAttrs: { 'data-task-item': 'true' },
        contentTag: 'span',
        contentAttrs: { 'data-task-content': 'true' },
        leading: [
          {
            tag: 'input',
            fixedAttrs: { type: 'checkbox', 'data-task-checkbox': 'true', contenteditable: 'false' },
          },
        ],
        tabCommand: 'task-list.indent',
        shiftTabCommand: 'task-list.outdent',
      }),
    ],
    commands: {
      'task-list.insert': insertTaskList,
      'task-list.toggle': toggleTaskItem,
      'task-list.indent': indentTaskItem,
      'task-list.outdent': outdentTaskItem,
    },
    toolbar: [
      toolbarItem({
        id: 'task-list',
        label: 'task-list.title',
        title: 'task-list.title',
        icon: ICON,
        command: 'task-list.insert',
        group: 'list',
        order: 10,
      }),
    ],
  },

  /** @param {PluginContext} ctx */
  activate(ctx) {
    const surface = ctx.services.viewport.getSurface?.()
    if (!surface) return

    const handler = (event) => {
      const target = /** @type {HTMLElement} */ (event.target)
      const checkbox = target.closest?.('[data-task-checkbox]')
      if (!checkbox) return

      event.preventDefault()

      const itemEl = /** @type {HTMLElement | null} */ (checkbox.closest('[data-child-index]'))
      const listEl = /** @type {HTMLElement | null} */ (checkbox.closest('[data-block-index]'))
      if (!itemEl || !listEl) return

      const blockIndex = Number(listEl.dataset.blockIndex)
      const childIndex = Number(itemEl.dataset.childIndex)
      if (Number.isNaN(blockIndex) || Number.isNaN(childIndex)) return

      ctx.execCommand('task-list.toggle', { block: blockIndex, childIndex })
    }

    surface.addEventListener('click', handler)
    clickOff = () => surface.removeEventListener('click', handler)
  },

  deactivate() {
    clickOff?.()
    clickOff = null
  },
})

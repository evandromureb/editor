import { definePlugin, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16"> <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/> <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/> </svg>'

/** @type {import('@baselab/plugin-sdk').PluginContext | null} */
let pluginCtx = null

export default definePlugin({
  id: 'undo',
  name: 'Undo',
  version: '1.0.0',

  activate(ctx) {
    pluginCtx = ctx
  },

  deactivate() {
    pluginCtx = null
  },

  capabilities: {
    commands: {
      undo: command((state) => {
        pluginCtx?.services.history.undo()
        return state
      }),
    },
    toolbar: [
      toolbarItem({
        id: 'undo',
        label: 'undo.button',
        icon: ICON,
        shortcut: 'mod+z',
        group: 'history',
        order: 10,
        isEnabled: (ctx) => ctx.getMode() === 'editor' && ctx.services.history.canUndo(),
      }),
    ],
    shortcuts: shortcut('mod+z', 'undo'),
  },
})

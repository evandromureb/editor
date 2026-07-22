import { definePlugin, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16"> <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/> <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/> </svg>'

/** @type {import('@baselab/plugin-sdk').PluginContext | null} */
let pluginCtx = null

export default definePlugin({
  id: 'redo',
  name: 'Redo',
  version: '1.0.0',

  activate(ctx) {
    pluginCtx = ctx
  },

  deactivate() {
    pluginCtx = null
  },

  capabilities: {
    commands: {
      redo: command((state) => {
        pluginCtx?.services.history.redo()
        return state
      }),
    },
    toolbar: [
      toolbarItem({
        id: 'redo',
        label: 'redo.button',
        icon: ICON,
        shortcut: 'mod+shift+z',
        group: 'history',
        order: 20,
        isEnabled: (ctx) => ctx.getMode() === 'editor' && ctx.services.history.canRedo(),
      }),
    ],
    shortcuts: shortcut('mod+shift+z', 'redo'),
  },
})

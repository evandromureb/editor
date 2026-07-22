/**
 * @file Horizontal rule plugin — inserts void hr blocks via toolbar.
 */

import { definePlugin, block, command, toolbarItem } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hr" viewBox="0 0 16 16"> <path d="M12 3H4a1 1 0 0 0-1 1v2.5H2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.5h-1V4a1 1 0 0 0-1-1M2 9.5h1V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5h1V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm-1.5-2a.5.5 0 0 0 0 1h15a.5.5 0 0 0 0-1z"/> </svg>'

export default definePlugin({
  id: 'hr',
  name: 'Horizontal Rule',
  version: '1.0.0',

  capabilities: {
    blocks: [block('hr', { void: true })],
    commands: { hr: command.insertBlock('hr') },
    toolbar: [
      toolbarItem({
        id: 'hr',
        label: 'hr.button',
        icon: ICON,
        group: 'insert',
        order: 10,
      }),
    ],
  },
})

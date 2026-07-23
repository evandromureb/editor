/**
 * @file Underline formatting plugin — toggles the underline mark via toolbar and mod+u shortcut.
 */

import { definePlugin, mark, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-underline" viewBox="0 0 16 16"> <path d="M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57s-2.687-1.08-2.687-2.57zM12.5 15h-9v-1h9z"/> </svg>'

export default definePlugin({
  id: 'underline',
  name: 'Underline',
  version: '1.0.0',

  capabilities: {
    marks: [mark('underline', { tag: 'u', priority: 2 })],
    commands: { underline: command.toggleMark('underline') },
    toolbar: [
      toolbarItem({
        id: 'underline',
        label: 'underline.button',
        icon: ICON,
        shortcut: 'mod+u',
        activeMark: 'underline',
        group: 'format',
        order: 30,
      }),
    ],
    shortcuts: shortcut('mod+u', 'underline'),
  },
})

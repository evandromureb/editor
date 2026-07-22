/**
 * @file Italic formatting plugin — toggles the italic mark via toolbar and mod+i shortcut.
 */

import { definePlugin, mark, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-italic" viewBox="0 0 16 16"> <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/> </svg>'

export default definePlugin({
  id: 'italic',
  name: 'Italic',
  version: '1.0.0',

  capabilities: {
    marks: [mark('italic', { tag: 'em', parseTags: ['em', 'i'], priority: 1 })],
    commands: { italic: command.toggleMark('italic') },
    toolbar: [
      toolbarItem({
        id: 'italic',
        label: 'italic.button',
        icon: ICON,
        shortcut: 'mod+i',
        activeMark: 'italic',
        group: 'format',
        order: 20,
      }),
    ],
    shortcuts: shortcut('mod+i', 'italic'),
  },
})

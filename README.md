# BaseLab Editor

Editor WYSIWYG modular com arquitetura baseada em plugins.

## Instalação

```bash
npm install
npm run build
```

## Uso básico

```html
<link rel="stylesheet" href="dist/editor.css" />
<textarea id="conteudo">Olá, <strong>mundo</strong>!</textarea>
<div id="editor"></div>

<script type="module">
  import { createEditor } from './dist/editor.js'

  createEditor({
    textarea: '#conteudo',
    root: '#editor',
    theme: 'padrao',
    locale: 'pt',
  })
</script>
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run discover` | Descobre plugins/temas e gera `src/generated/` |
| `npm run build` | Discover + bundle para `dist/` |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes unitários (Node test runner) |

## Criar um plugin

```javascript
// plugins/meu-plugin/index.js
import { definePlugin, mark, command, toolbarItem } from '@baselab/plugin-sdk'

export default definePlugin({
  id: 'meu-plugin',
  name: 'Meu Plugin',
  capabilities: {
    marks: [mark('highlight', { tag: 'mark', parseTags: ['mark'] })],
    commands: { highlight: command.toggleMark('highlight') },
    toolbar: [toolbarItem({ id: 'highlight', label: 'highlight.button', activeMark: 'highlight' })],
  },
})
```

Depois: `npm run build`.

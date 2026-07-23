/**
 * @file Build step — writes embed.html and embed.file.html into dist/.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../config.js'

const ALL_PLUGINS = [
  'undo',
  'redo',
  'bold',
  'italic',
  'underline',
  'subscript',
  'superscript',
  'text-color',
  'highlight',
  'font-family',
  'font-size',
  'paragraph',
  'hr',
  'clear-formatting',
  'code-block',
]

const TOOLBAR_LINES = [
  'undo redo | bold italic underline subscript superscript',
  'text-color highlight | font-family font-size paragraph | hr | clear-formatting',
]

/**
 * @param {{ width: number, height: number }} opts
 * @returns {string}
 */
function renderStandaloneEmbedScript({ width, height }) {
  const pluginsLiteral = ALL_PLUGINS.map((id) => `          '${id}',`).join('\n')
  const toolbarLiteral = TOOLBAR_LINES.map((line) => `          '${line}',`).join('\n')

  return `      EditorBundle.createEditor({
        textarea: '#conteudo',
        root: '#editor',
        theme: 'padrao',
        locale: 'pt',

        width: ${width},
        height: ${height},

        plugins: [
${pluginsLiteral}
        ],

        toolbar: [
${toolbarLiteral}
        ],
      })`
}

export function writeEmbedHtml() {
  writeFileSync(
    join(paths.dist, 'embed.html'),
    `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Editor — Embed (HTTP)</title>
    <link rel="stylesheet" href="./editor.css" />
  </head>
  <body>
    <form>
      <textarea id="conteudo" name="conteudo" class="editor-source">Texto inicial</textarea>
      <wysiwyg-editor for="conteudo" theme="padrao" locale="pt"></wysiwyg-editor>
    </form>
    <script type="module" src="./editor.js"></script>
  </body>
</html>
`
  )

  writeFileSync(
    join(paths.dist, 'embed.file.html'),
    `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Editor — Embed (file://)</title>
    <link rel="stylesheet" href="./editor.css" />
  </head>
  <body>
    <form>
      <textarea id="conteudo" name="conteudo" class="editor-source">Texto inicial</textarea>
      <div id="editor"></div>
    </form>
    <script src="./editor.standalone.js"></script>
    <script>
${renderStandaloneEmbedScript({ width: 800, height: 600 })}
    </script>
  </body>
</html>
`
  )

  writeFileSync(
    join(paths.root, 'embed.file.html'),
    `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Editor — file:// (after npm run build)</title>
    <link rel="stylesheet" href="./dist/editor.css" />
  </head>
  <body>
    <form>
      <textarea id="conteudo" name="conteudo" class="editor-source">Texto inicial</textarea>
      <div id="editor"></div>
    </form>
    <script src="./dist/editor.standalone.js"></script>
    <script>
${renderStandaloneEmbedScript({ width: 800, height: 500 })}
    </script>
  </body>
</html>
`
  )
}

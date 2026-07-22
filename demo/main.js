import { createEditor } from '../src/index.js'

const app = document.querySelector('#app')

const plugins = [
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
  'quote',
  'hr',
  'bullet-list',
  'numbered-list',
  'task-list',
  'clear-formatting',
  'code-block',
  'link',
  'image',
  'text-align',
]

const toolbar = [
  'undo redo | font-family font-size paragraph | bold italic underline subscript superscript text-center text-right justify | bullet-list numbered-list',
  'text-color highlight | quote hr  task-list clear-formatting code-block link image | text-left text-center text-right justify | outdent indent | bullet-list numbered-list',
]

try {
  const editor = createEditor({
    textarea: '#content',
    root: '#app',
    plugins,
    toolbar,
    image: {
      // Demo-only: no host upload endpoint configured, so uploads fall back
      // to a local Blob URL (plugins/image/index.js resolveUploadedSrc()).
    },
  })
  window.__editor = editor
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  app.innerHTML =
    '<div class="editor-fallback">' +
    '<p><strong>Erro ao iniciar o editor.</strong></p>' +
    `<p>${message}</p>` +
    '</div>'
}

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
  'undo redo | font-family font-size paragraph | bold italic underline subscript superscript text-center text-right justify',
  'text-color highlight | bullet-list numbered-list | quote hr task-list clear-formatting code-block link image | text-left text-center text-right justify | outdent indent',
]

try {
  const editor = createEditor({
    textarea: '#content',
    root: '#app',
    plugins,
    toolbar,
    image: {
      upload: undefined, // valor padrão (sem upload customizado)
      maxSize: 1 * 1024 * 1024, // valor padrão (5 MB)
    },
    footer: true,
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

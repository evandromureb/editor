// Palette entries. Most map 1:1 to a plugin id and a single toolbar button.
// Some entries bundle more than one token into a single draggable option —
// `pluginId` can then be an array of the plugin ids involved:
// - `undo`/`redo` are grouped as one "Undo / Redo" option.
// - `text-align` registers 6 separate toolbar buttons, grouped here into two
//   draggable options — "Alignment" (left/center/right/justify) and
//   "Indentation" (outdent/indent).
// Each entry is a single unit end-to-end: dragging it inserts every one of
// its tokens together, they render as one chip in the toolbar, and the one
// "✕" removes them all at once. Placing an entry removes it from the
// palette; removing it from the toolbar returns it to the palette — except
// the separator (`pluginId: null`), which stays available at all times since
// it can be used any number of times.
//
// Single-token entries don't hardcode a display label: it's read live off
// the real editor bundle (see ICONS below), which already ships proper
// en/pt titles per plugin in `plugins/<id>/lang/*.json` — so the palette
// shows "Bold"/"Negrito" instead of the raw id "bold". Grouped entries get
// an explicit bilingual `groupLabel` since they're a page-only grouping with
// no single matching plugin title. `desc` is this page's own bilingual
// helper text.
const PALETTE = [
  {
    pluginId: null,
    tokens: ['|'],
    groupLabel: { en: 'Separator', pt: 'Separador' },
    desc: { en: 'Visual divider between button groups', pt: 'Divisor visual entre grupos de botões' },
  },
  {
    pluginId: ['undo', 'redo'],
    tokens: ['undo', 'redo'],
    groupLabel: { en: 'Undo / Redo', pt: 'Desfazer / Refazer' },
    desc: { en: 'History: undo and redo', pt: 'Histórico: desfazer e refazer' },
  },
  { pluginId: 'bold', tokens: ['bold'], desc: { en: 'Bold (mod+b)', pt: 'Negrito (mod+b)' } },
  { pluginId: 'italic', tokens: ['italic'], desc: { en: 'Italic (mod+i)', pt: 'Itálico (mod+i)' } },
  { pluginId: 'underline', tokens: ['underline'], desc: { en: 'Underline (mod+u)', pt: 'Sublinhado (mod+u)' } },
  { pluginId: 'subscript', tokens: ['subscript'], desc: { en: 'Subscript', pt: 'Subscrito' } },
  { pluginId: 'superscript', tokens: ['superscript'], desc: { en: 'Superscript', pt: 'Sobrescrito' } },
  { pluginId: 'text-color', tokens: ['text-color'], desc: { en: 'Text color', pt: 'Cor do texto' } },
  { pluginId: 'highlight', tokens: ['highlight'], desc: { en: 'Highlight color', pt: 'Cor de destaque (highlight)' } },
  {
    pluginId: 'font-family',
    tokens: ['font-family'],
    overrideLabel: { en: 'Font', pt: 'Fonte' },
    desc: { en: 'Font selector', pt: 'Seletor de fonte' },
  },
  {
    pluginId: 'font-size',
    tokens: ['font-size'],
    overrideLabel: { en: 'Size', pt: 'Tamanho' },
    desc: { en: 'Font size selector', pt: 'Seletor de tamanho de fonte' },
  },
  {
    pluginId: 'paragraph',
    tokens: ['paragraph'],
    overrideLabel: { en: 'Paragraph', pt: 'Parágrafo' },
    desc: { en: 'Block: paragraph, H1-H5', pt: 'Bloco: parágrafo, H1-H5' },
  },
  {
    pluginId: 'quote',
    tokens: ['quote'],
    overrideLabel: { en: 'Quote', pt: 'Destaque' },
    desc: { en: 'Quote / callout', pt: 'Citação / callout' },
  },
  { pluginId: 'hr', tokens: ['hr'], desc: { en: 'Horizontal rule', pt: 'Linha horizontal' } },
  { pluginId: 'clear-formatting', tokens: ['clear-formatting'], desc: { en: 'Clear formatting', pt: 'Limpar formatação' } },
  { pluginId: 'code-block', tokens: ['code-block'], desc: { en: 'Code block', pt: 'Bloco de código' } },
  { pluginId: 'link', tokens: ['link'], desc: { en: 'Insert/edit link', pt: 'Inserir/editar link' } },
  { pluginId: 'image', tokens: ['image'], desc: { en: 'Insert image (URL or upload)', pt: 'Inserir imagem (URL ou upload)' } },
  { pluginId: 'bullet-list', tokens: ['bullet-list'], desc: { en: 'Bulleted list', pt: 'Lista com marcadores' } },
  { pluginId: 'numbered-list', tokens: ['numbered-list'], desc: { en: 'Numbered list', pt: 'Lista numerada' } },
  { pluginId: 'task-list', tokens: ['task-list'], desc: { en: 'Task list (checkbox)', pt: 'Lista de tarefas (checkbox)' } },
  {
    pluginId: 'text-align',
    tokens: ['text-left', 'text-center', 'text-right', 'justify'],
    groupLabel: { en: 'Alignment', pt: 'Alinhamento' },
    desc: { en: 'Left, center, right, justify', pt: 'Esquerda, centro, direita, justificado' },
  },
  {
    pluginId: 'text-align',
    tokens: ['outdent', 'indent'],
    groupLabel: { en: 'Indentation', pt: 'Indentação' },
    desc: { en: 'Decrease / increase indent', pt: 'Diminuir / aumentar recuo' },
  },
]

const SEPARATOR = '|'

// The editor's real default locale is 'pt' (see src/core/i18n/constants.js),
// but this page defaults to English as requested; 'pt' is offered as PT-BR.
let currentLocale = 'en'

function labelForEntry(entry) {
  if (entry.groupLabel) return entry.groupLabel[currentLocale] || entry.groupLabel.en
  // A few plugins (font-family, font-size, paragraph, quote) render a custom
  // dropdown instead of a plain button, so the real editor never sets an
  // aria-label/title we could read live — use the same strings from their
  // own lang/*.json files instead.
  if (entry.overrideLabel) return entry.overrideLabel[currentLocale] || entry.overrideLabel.en
  return ICONS.get(entry.tokens[0])?.label || entry.tokens[0]
}

function descForEntry(entry) {
  return entry.desc[currentLocale] || entry.desc.en
}

// Bootstrap Icons (https://icons.getbootstrap.com/, MIT licensed) used as a
// fallback for the few plugins that render a custom dropdown/select instead
// of a plain icon button, so nothing falls back to raw text in the palette.
const BOOTSTRAP_ICON_FALLBACKS = {
  'font-family':
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-fonts" viewBox="0 0 16 16"><path d="M12.258 3h-8.51l-.083 2.46h.479c.26-1.544.758-1.783 2.693-1.845l.424-.013v7.827c0 .663-.144.82-1.3.923v.52h4.082v-.52c-1.162-.103-1.306-.26-1.306-.923V3.602l.431.013c1.934.062 2.434.301 2.693 1.846h.479z"/></svg>',
  'font-size':
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type" viewBox="0 0 16 16"><path d="m2.244 13.081.943-2.803H6.66l.944 2.803H8.86L5.54 3.75H4.322L1 13.081zm2.7-7.923L6.34 9.314H3.51l1.4-4.156zm9.146 7.027h.035v.896h1.128V8.125c0-1.51-1.114-2.345-2.646-2.345-1.736 0-2.59.916-2.666 2.174h1.108c.068-.718.595-1.19 1.517-1.19.971 0 1.518.52 1.518 1.464v.731H12.19c-1.647.007-2.522.8-2.522 2.058 0 1.319.957 2.18 2.345 2.18 1.06 0 1.716-.43 2.078-1.011zm-1.763.035c-.752 0-1.456-.397-1.456-1.244 0-.65.424-1.115 1.408-1.115h1.805v.834c0 .896-.752 1.525-1.757 1.525"/></svg>',
  paragraph:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-paragraph" viewBox="0 0 16 16"><path d="M10.5 15a.5.5 0 0 1-.5-.5V2H9v12.5a.5.5 0 0 1-1 0V9H7a4 4 0 1 1 0-8h5.5a.5.5 0 0 1 0 1H11v12.5a.5.5 0 0 1-.5.5"/></svg>',
  quote:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-quote" viewBox="0 0 16 16"><path d="M12 12a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1h-1.388q0-.527.062-1.054.093-.558.31-.992t.559-.683q.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 9 7.558V11a1 1 0 0 0 1 1zm-6 0a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1H4.612q0-.527.062-1.054.094-.558.31-.992.217-.434.559-.683.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 3 7.558V11a1 1 0 0 0 1 1z"/></svg>',
}

function pluginIdsOf(entry) {
  if (!entry.pluginId) return []
  return Array.isArray(entry.pluginId) ? entry.pluginId : [entry.pluginId]
}

// All plugins are always active — the `plugins` array is just the unique,
// ordered list of plugin ids referenced by the palette (deduped so
// `text-align`, split into two palette options, only appears once).
const ALL_PLUGINS = [...new Set(PALETTE.flatMap(pluginIdsOf))]

// Maps every real toolbar token id to the index of the palette entry that
// owns it, so a flat token list (e.g. loaded from storage, or the built-in
// default) can be regrouped back into single-unit placed items.
const TOKEN_OWNER = new Map()
PALETTE.forEach((entry, index) => {
  if (entry.pluginId === null) return
  entry.tokens.forEach((token) => TOKEN_OWNER.set(token, index))
})

// Converts a flat token list (e.g. 'undo redo | bold') into placed items,
// keeping multi-token entries (history, alignment, indentation) grouped as
// a single item exactly as they'd be if dragged from the palette.
function buildRowFromTokens(tokens) {
  const items = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === SEPARATOR) {
      items.push({ type: 'separator', tokens: [SEPARATOR] })
      i += 1
      continue
    }
    const paletteIndex = TOKEN_OWNER.get(token)
    if (paletteIndex === undefined) {
      i += 1
      continue
    }
    const entry = PALETTE[paletteIndex]
    items.push({ type: 'option', paletteIndex, tokens: [...entry.tokens] })
    i += entry.tokens.length
  }
  return items
}

// ---------------------------------------------------------------------------
// Icon extraction: mount every plugin once (hidden) using the real editor
// bundle, then read the actual rendered icon/label off each toolbar button
// (`[data-plugin="id"] .editor__icon`), so the drag palette matches the real
// editor pixel-for-pixel instead of hand-copied SVGs.
// ---------------------------------------------------------------------------
const ICONS = new Map() // toolbarId -> { icon: string, label: string }
const ALL_TOOLBAR_TOKENS = [...new Set(PALETTE.flatMap((entry) => entry.tokens).filter((t) => t !== SEPARATOR))]

let iconExtractorEditor = null

function extractIcons(locale) {
  if (typeof EditorBundle === 'undefined') return
  try {
    iconExtractorEditor?.destroy?.()
    const root = document.getElementById('icon-extractor-root')
    root.innerHTML = ''
    iconExtractorEditor = EditorBundle.createEditor({
      textarea: '#icon-extractor-content',
      root: '#icon-extractor-root',
      locale,
      plugins: ALL_PLUGINS,
      toolbar: [ALL_TOOLBAR_TOKENS.join(' ')],
    })
    ALL_TOOLBAR_TOKENS.forEach((tokenId) => {
      const button = root.querySelector(`[data-plugin="${cssEscape(tokenId)}"]`)
      const iconEl = button?.querySelector('.editor__icon')
      const icon = (iconEl && iconEl.innerHTML) || BOOTSTRAP_ICON_FALLBACKS[tokenId] || ''
      ICONS.set(tokenId, {
        icon,
        label: button?.getAttribute('aria-label') || tokenId,
      })
    })
  } catch (err) {
    console.error('Falha ao extrair ícones do editor real:', err)
  }
}

function cssEscape(value) {
  return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

// Default toolbar mirrors demo/main.js, which already covers every plugin —
// a fitting starting point now that all plugins are always active.
const DEFAULT_TOOLBAR = [
  ['undo', 'redo', SEPARATOR, 'font-family', 'font-size', 'paragraph', SEPARATOR, 'bold', 'italic', 'underline', 'subscript', 'superscript'],
  [
    'text-color',
    'highlight',
    SEPARATOR,
    'quote',
    'hr',
    'bullet-list',
    'numbered-list',
    'task-list',
    'clear-formatting',
    'code-block',
    'link',
    'image',
    SEPARATOR,
    'text-left',
    'text-center',
    'text-right',
    'justify',
    SEPARATOR,
    'outdent',
    'indent',
  ],
]

// Ready-made scenarios: picking one replaces the whole toolbar with a
// layout tailored to that use case. Token lists reuse the same flat-string
// shape as DEFAULT_TOOLBAR — `buildRowFromTokens()` regroups them into
// placed items (history, alignment, indentation) exactly like a drag would.
const PRESETS = [
  {
    id: 'simple',
    label: { en: 'Simple', pt: 'Simples' },
    desc: {
      en: 'Minimal editor for descriptions, comments and short content',
      pt: 'Editor minimalista para descrições, comentários e conteúdos curtos',
    },
    toolbar: [['undo', 'redo', SEPARATOR, 'bold', 'italic', 'underline', SEPARATOR, 'link']],
  },
  {
    id: 'news',
    label: { en: 'News', pt: 'Notícias' },
    desc: { en: 'News portals, blogs and articles', pt: 'Portais de notícias, blogs e artigos' },
    toolbar: [
      ['undo', 'redo', SEPARATOR, 'paragraph', SEPARATOR, 'bold', 'italic', 'underline'],
      [
        'bullet-list',
        'numbered-list',
        SEPARATOR,
        'text-left',
        'text-center',
        'text-right',
        'justify',
        SEPARATOR,
        'quote',
        'hr',
        'image',
        'link',
        'clear-formatting',
      ],
    ],
  },
  {
    id: 'document',
    label: { en: 'Document', pt: 'Documento' },
    desc: { en: 'Corporate documents, manuals and long-form text', pt: 'Documentos corporativos, manuais e textos longos' },
    toolbar: [
      ['undo', 'redo', SEPARATOR, 'font-family', 'font-size', 'paragraph', SEPARATOR, 'bold', 'italic', 'underline', 'subscript', 'superscript'],
      [
        'text-left',
        'text-center',
        'text-right',
        'justify',
        SEPARATOR,
        'bullet-list',
        'numbered-list',
        'task-list',
        SEPARATOR,
        'quote',
        'hr',
        'link',
        'clear-formatting',
      ],
    ],
  },
  {
    id: 'developer',
    label: { en: 'Developer', pt: 'Desenvolvedor' },
    desc: { en: 'Technical docs, specs and changelogs', pt: 'Documentação técnica, especificações e changelogs' },
    toolbar: [
      [
        'undo',
        'redo',
        SEPARATOR,
        'bold',
        'italic',
        SEPARATOR,
        'code-block',
        SEPARATOR,
        'bullet-list',
        'numbered-list',
        'task-list',
        SEPARATOR,
        'quote',
        'hr',
        'link',
        'clear-formatting',
      ],
    ],
  },
  {
    id: 'full',
    label: { en: 'Full', pt: 'Completo' },
    desc: { en: 'Every feature the editor offers', pt: 'Todos os recursos oferecidos pelo editor' },
    toolbar: DEFAULT_TOOLBAR,
  },
]

// Persist the toolbar layout across reloads, so the page reopens with the
// last configuration the user built instead of resetting to the default.
const STORAGE_KEY = 'editor-config-builder:toolbar-rows'

function isPlacedItem(value) {
  return value && typeof value === 'object' && typeof value.type === 'string' && Array.isArray(value.tokens)
}

function loadSavedToolbar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.map((row) => {
      if (!Array.isArray(row)) return []
      // Legacy format: a row used to be a flat list of token strings.
      if (row.every((entry) => typeof entry === 'string')) return buildRowFromTokens(row)
      if (row.every(isPlacedItem)) return row
      return []
    })
  } catch (err) {
    console.error('Falha ao carregar configuração salva:', err)
    return null
  }
}

function saveToolbar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.toolbarRows))
  } catch (err) {
    console.error('Falha ao salvar configuração:', err)
  }
}

const state = {
  toolbarRows: loadSavedToolbar() ?? DEFAULT_TOOLBAR.map(buildRowFromTokens),
}

// Payload of whatever drag is currently in flight, so the plugins panel knows
// whether to light up as a "drop here to remove" zone.
let currentDrag = null

// Every palette option currently placed somewhere in the toolbar (by palette
// index), so it can be hidden from the drag source until removed.
function usedPaletteIndexes() {
  const used = new Set()
  state.toolbarRows.forEach((row) => {
    row.forEach((item) => {
      if (item.type === 'option') used.add(item.paletteIndex)
    })
  })
  return used
}

// ---------------------------------------------------------------------------
// Presets — pick one to replace the whole toolbar in one click
// ---------------------------------------------------------------------------

function renderPresets() {
  const list = document.getElementById('presets-list')
  list.innerHTML = ''
  PRESETS.forEach((preset) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'preset-btn'

    const nameEl = document.createElement('span')
    nameEl.className = 'preset-name'
    nameEl.textContent = preset.label[currentLocale] || preset.label.en

    const descEl = document.createElement('span')
    descEl.className = 'preset-desc'
    descEl.textContent = preset.desc[currentLocale] || preset.desc.en

    btn.append(nameEl, descEl)
    btn.addEventListener('click', () => applyPreset(preset))
    list.appendChild(btn)
  })
}

function applyPreset(preset) {
  state.toolbarRows = preset.toolbar.map(buildRowFromTokens)
  renderToolbar()
  renderOutput()
}

// ---------------------------------------------------------------------------
// Plugins panel (drag source — the whole row is draggable)
// ---------------------------------------------------------------------------

function renderPlugins() {
  const list = document.getElementById('plugins-list')
  list.innerHTML = ''
  const used = usedPaletteIndexes()

  PALETTE.forEach((entry, index) => {
    const isSeparator = entry.pluginId === null
    if (!isSeparator && used.has(index)) return // already placed — hidden until removed

    const li = document.createElement('li')
    li.className = 'plugin-item' + (isSeparator ? ' is-separator-entry' : '')
    li.draggable = true

    const chips = document.createElement('div')
    chips.className = 'plugin-chips'
    entry.tokens.forEach((tokenId) => {
      chips.appendChild(renderIcon(tokenId))
    })

    const main = document.createElement('div')
    main.className = 'plugin-main'
    const idEl = document.createElement('span')
    idEl.className = 'plugin-id'
    idEl.textContent = labelForEntry(entry)
    const descEl = document.createElement('span')
    descEl.className = 'plugin-desc'
    descEl.textContent = descForEntry(entry)
    main.append(idEl, descEl)

    li.append(chips, main)

    li.addEventListener('dragstart', (e) => {
      currentDrag = { kind: 'palette', paletteIndex: index, tokens: entry.tokens }
      e.dataTransfer.effectAllowed = 'copy'
      e.dataTransfer.setData('text/plain', JSON.stringify(currentDrag))
    })
    li.addEventListener('dragend', () => {
      currentDrag = null
    })

    list.appendChild(li)
  })
}

// A small, static icon (no drag behavior of its own — the whole plugin row
// is the drag handle) representing one toolbar token.
function renderIcon(tokenId) {
  const el = document.createElement('span')
  el.className = 'plugin-chip'
  if (tokenId === SEPARATOR) {
    el.textContent = '|'
    el.title = 'Separador'
    return el
  }
  const iconData = ICONS.get(tokenId)
  el.title = iconData?.label || tokenId
  el.innerHTML = iconData?.icon || ''
  if (!iconData?.icon) el.textContent = tokenId.slice(0, 2)
  return el
}

// ---------------------------------------------------------------------------
// Toolbar builder (drop targets — the whole row card accepts drops)
// ---------------------------------------------------------------------------

function renderToolbar() {
  const container = document.getElementById('toolbar-rows')
  container.innerHTML = ''

  state.toolbarRows.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div')
    rowEl.className = 'toolbar-row'

    const header = document.createElement('div')
    header.className = 'toolbar-row-header'
    const label = document.createElement('span')
    label.className = 'row-label'
    label.textContent = `Linha ${rowIndex + 1}`

    const upBtn = document.createElement('button')
    upBtn.type = 'button'
    upBtn.className = 'btn'
    upBtn.textContent = '▲'
    upBtn.disabled = rowIndex === 0
    upBtn.addEventListener('click', () => moveToolbarRow(rowIndex, -1))

    const downBtn = document.createElement('button')
    downBtn.type = 'button'
    downBtn.className = 'btn'
    downBtn.textContent = '▼'
    downBtn.disabled = rowIndex === state.toolbarRows.length - 1
    downBtn.addEventListener('click', () => moveToolbarRow(rowIndex, 1))

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'btn'
    removeBtn.textContent = 'Remover linha'
    removeBtn.addEventListener('click', () => removeToolbarRow(rowIndex))

    header.append(label, upBtn, downBtn, removeBtn)

    const tokensEl = document.createElement('div')
    tokensEl.className = 'toolbar-tokens'

    row.forEach((item, itemIndex) => {
      tokensEl.appendChild(createPlacedItemEl(item, rowIndex, itemIndex))
    })

    // The whole row card is droppable, not just the thin tokens strip.
    rowEl.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = currentDrag?.kind === 'placed' ? 'move' : 'copy'
      rowEl.classList.add('is-drag-over')
      const index = getDropIndex(tokensEl, e.clientX, e.clientY)
      showDropCaret(tokensEl, index)
    })
    rowEl.addEventListener('dragleave', (e) => {
      if (!rowEl.contains(e.relatedTarget)) {
        rowEl.classList.remove('is-drag-over')
        hideDropCaret()
      }
    })
    rowEl.addEventListener('drop', (e) => {
      e.preventDefault()
      rowEl.classList.remove('is-drag-over')
      const payload = readPayload(e)
      // The caret already sits at the exact spot chosen during dragover —
      // reuse its position instead of recomputing, so what the user saw is
      // exactly where the item lands.
      const insertIndex = dropCaretEl ? [...tokensEl.children].indexOf(dropCaretEl) : getDropIndex(tokensEl, e.clientX, e.clientY)
      hideDropCaret()
      if (!payload) return
      handleItemDrop(payload, rowIndex, insertIndex)
    })

    rowEl.append(header, tokensEl)
    container.appendChild(rowEl)
  })
}

// Renders one placed item as a single chip — even when it bundles several
// tokens (history, alignment, indentation) — with one drag handle and one
// remove button for the whole group.
function createPlacedItemEl(item, rowIndex, itemIndex) {
  const el = document.createElement('span')
  const isSeparator = item.type === 'separator'
  el.className = 'toolbar-token' + (isSeparator ? ' is-separator' : '')
  el.draggable = true

  if (isSeparator) {
    const textEl = document.createElement('span')
    textEl.textContent = '|'
    el.appendChild(textEl)
  } else {
    const entry = PALETTE[item.paletteIndex]
    item.tokens.forEach((tokenId) => {
      const iconData = ICONS.get(tokenId)
      const iconEl = document.createElement('span')
      iconEl.className = 'token-icon'
      iconEl.innerHTML = iconData?.icon || ''
      if (!iconData?.icon) iconEl.textContent = tokenId.slice(0, 2)
      el.appendChild(iconEl)
    })
    const textEl = document.createElement('span')
    const label = entry ? labelForEntry(entry) : item.tokens.join(' ')
    textEl.textContent = label
    el.title = entry ? descForEntry(entry) : label
    el.appendChild(textEl)
  }

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.textContent = '✕'
  removeBtn.addEventListener('click', () => removeItem(rowIndex, itemIndex))
  el.appendChild(removeBtn)

  el.addEventListener('dragstart', (e) => {
    currentDrag = { kind: 'placed', rowIndex, itemIndex, item }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(currentDrag))
    el.classList.add('is-dragging')
  })
  el.addEventListener('dragend', () => {
    currentDrag = null
    el.classList.remove('is-dragging')
  })

  return el
}

function readPayload(e) {
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Wrap-aware: tokens can flow onto more than one visual line inside a row,
// so the nearest line is picked by Y first, then the index within that line
// by X — a plain X-only scan would misplace the caret on wrapped rows.
function getDropIndex(container, clientX, clientY) {
  const children = [...container.querySelectorAll('.toolbar-token')]
  if (children.length === 0) return 0

  const rects = children.map((el) => el.getBoundingClientRect())
  let lineTop = rects[0].top
  let minDy = Math.abs(clientY - (rects[0].top + rects[0].height / 2))
  rects.forEach((rect) => {
    const dy = Math.abs(clientY - (rect.top + rect.height / 2))
    if (dy < minDy) {
      minDy = dy
      lineTop = rect.top
    }
  })

  let lastOnLine = -1
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    const sameLine = Math.abs(rect.top - lineTop) < rect.height / 2
    if (!sameLine) continue
    if (clientX < rect.left + rect.width / 2) return i
    lastOnLine = i
  }
  return lastOnLine + 1
}

// A thin vertical caret shown inside the tokens strip while dragging, so the
// exact drop position is visible instead of guessing where the item lands.
let dropCaretEl = null

function showDropCaret(tokensEl, index) {
  if (!dropCaretEl) {
    dropCaretEl = document.createElement('span')
    dropCaretEl.className = 'toolbar-drop-caret'
  }
  const siblings = [...tokensEl.children].filter((el) => el !== dropCaretEl)
  tokensEl.insertBefore(dropCaretEl, siblings[index] || null)
}

function hideDropCaret() {
  dropCaretEl?.remove()
}

function handleItemDrop(payload, targetRowIndex, insertIndex) {
  const targetRow = state.toolbarRows[targetRowIndex]

  if (payload.kind === 'placed') {
    const sourceRow = state.toolbarRows[payload.rowIndex]
    sourceRow.splice(payload.itemIndex, 1)
    let index = insertIndex
    if (payload.rowIndex === targetRowIndex && payload.itemIndex < insertIndex) index -= 1
    targetRow.splice(index, 0, payload.item)
  } else {
    // Palette drop: build one new placed item bundling every token of the
    // option (e.g. the 4 alignment buttons) together.
    const isSeparator = payload.tokens.length === 1 && payload.tokens[0] === SEPARATOR
    const item = isSeparator
      ? { type: 'separator', tokens: [SEPARATOR] }
      : { type: 'option', paletteIndex: payload.paletteIndex, tokens: [...payload.tokens] }
    targetRow.splice(insertIndex, 0, item)
  }

  renderToolbar()
  renderOutput()
}

function moveToolbarRow(rowIndex, delta) {
  const target = rowIndex + delta
  if (target < 0 || target >= state.toolbarRows.length) return
  const rows = state.toolbarRows
  ;[rows[rowIndex], rows[target]] = [rows[target], rows[rowIndex]]
  renderToolbar()
  renderOutput()
}

function removeToolbarRow(rowIndex) {
  state.toolbarRows.splice(rowIndex, 1)
  renderToolbar()
  renderOutput()
}

function removeItem(rowIndex, itemIndex) {
  state.toolbarRows[rowIndex].splice(itemIndex, 1)
  renderToolbar()
  renderOutput()
}

// Dropping a placed item back onto the plugins panel removes it — the panel
// doubles as a trash zone.
function setupTrashZone() {
  const panel = document.getElementById('plugins-panel')
  panel.addEventListener('dragover', (e) => {
    if (currentDrag?.kind !== 'placed') return
    e.preventDefault()
    panel.classList.add('is-drag-over')
  })
  panel.addEventListener('dragleave', () => {
    panel.classList.remove('is-drag-over')
  })
  panel.addEventListener('drop', (e) => {
    panel.classList.remove('is-drag-over')
    const payload = readPayload(e)
    if (!payload || payload.kind !== 'placed') return
    e.preventDefault()
    state.toolbarRows[payload.rowIndex].splice(payload.itemIndex, 1)
    renderToolbar()
    renderOutput()
  })
}

// ---------------------------------------------------------------------------
// Output: generated embed snippet + live preview using the real editor
// ---------------------------------------------------------------------------

function jsStringArray(items, baseIndent = '  ') {
  if (items.length === 0) return '[]'
  const itemIndent = baseIndent + '  '
  const lines = items.map((item) => `${itemIndent}${JSON.stringify(item)},`)
  return `[\n${lines.join('\n')}\n${baseIndent}]`
}

function currentConfig() {
  const toolbar = state.toolbarRows
    .map((row) => row.flatMap((item) => item.tokens).join(' ').trim())
    .filter((line) => line.length > 0)
  return { plugins: ALL_PLUGINS, toolbar, locale: currentLocale }
}

// Every createEditor() option this builder's UI doesn't expose (preset,
// theme, appearance, size, upload handler, etc.) rendered as real, valid
// fields — each set to the editor's actual default (see `@typedef
// EditorOptions` in src/editor/index.js and the theme/appearance managers)
// with a trailing comment flagging it as such, so the snippet stays
// copy-pasteable while still documenting the full option surface.
const OTHER_OPTIONS_CODE = `
    theme: 'padrao', // valor padrão
    persistTheme: true, // valor padrão
    appearance: 'light', // valor padrão (segue a preferência do sistema)
    persistAppearance: false, // valor padrão
    width: 500, // valor padrão (sem largura fixa)
    height: 500, // valor padrão (sem altura fixa)
    responsive: true, // valor padrão
    fontFamily: {
      // valores padrão do plugin font-family
      default: 'Arial',
      items: [
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
        { label: 'Times New Roman', value: "'Times New Roman', serif" },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Courier New', value: "'Courier New', monospace" },
      ],
    },
    image: {
      maxSize: 1 * 1024 * 1024, // valor padrão (5 MB)
    },
    footer: false, // valor padrão`

function renderCode({ plugins, toolbar, locale }) {
  const code = `<link rel="stylesheet" href="./dist/editor.min.css" />
<textarea id="content"></textarea>
<div id="app"></div>

<script src="./dist/editor.standalone.min.js"></script>
<script>
  const plugins = ${jsStringArray(plugins, '  ')}

  const toolbar = ${jsStringArray(toolbar, '  ')}

  EditorBundle.createEditor({
    textarea: '#content',
    root: '#app',
    locale: ${JSON.stringify(locale)},
    plugins,
    toolbar,
${OTHER_OPTIONS_CODE}
  })
</script>`
  document.querySelector('#output-code code').textContent = code
}

let previewEditor = null

function renderPreview({ plugins, toolbar, locale }) {
  const root = document.getElementById('preview-root')
  const shell = document.querySelector('.preview-shell')
  if (typeof EditorBundle === 'undefined') return

  previewEditor?.destroy?.()
  root.innerHTML = ''
  shell.querySelector('.preview-error')?.remove()

  try {
    previewEditor = EditorBundle.createEditor({
      textarea: '#preview-content',
      root: '#preview-root',
      locale,
      plugins,
      toolbar,
    })
  } catch (err) {
    previewEditor = null
    const errorEl = document.createElement('p')
    errorEl.className = 'preview-error hint'
    errorEl.textContent = `Não foi possível montar o preview: ${err.message}`
    shell.appendChild(errorEl)
  }
}

// Rebuilding the preview editor can focus its content area and make the
// browser auto-scroll it into view — sometimes on the next frame, sometimes
// later still, depending on how the editor mounts. A single restore can miss
// that. Instead, pin the scroll position by fighting back on every 'scroll'
// event for a short window, which catches the jump regardless of when it
// actually happens.
function lockScrollPosition(durationMs = 500) {
  const targetX = window.scrollX
  const targetY = window.scrollY
  const onScroll = () => {
    if (window.scrollX !== targetX || window.scrollY !== targetY) {
      window.scrollTo(targetX, targetY)
    }
  }
  window.addEventListener('scroll', onScroll)
  setTimeout(() => window.removeEventListener('scroll', onScroll), durationMs)
}

function renderOutput() {
  lockScrollPosition()

  const config = currentConfig()
  renderCode(config)
  renderPreview(config)
  renderPlugins() // availability (used vs free options) may have changed
  saveToolbar()
}

// ---------------------------------------------------------------------------
// Static controls: add row, copy button, output tabs
// ---------------------------------------------------------------------------

document.getElementById('add-row-btn').addEventListener('click', () => {
  state.toolbarRows.push([])
  renderToolbar()
  renderOutput()
})

document.getElementById('copy-btn').addEventListener('click', async () => {
  const code = document.querySelector('#output-code code').textContent
  try {
    await navigator.clipboard.writeText(code)
    const btn = document.getElementById('copy-btn')
    const original = btn.textContent
    btn.textContent = 'Copiado!'
    setTimeout(() => {
      btn.textContent = original
    }, 1200)
  } catch (err) {
    console.error('Falha ao copiar', err)
  }
})

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    const target = btn.dataset.tab
    document.querySelectorAll('.tab-content').forEach((panel) => {
      panel.hidden = panel.dataset.tabContent !== target
    })
  })
})

// Switches the editor's language (labels, icons' tooltips, preview and
// generated code) between English (default) and Brazilian Portuguese,
// re-reading each plugin's real title from its own lang/*.json via a fresh
// icon extraction pass.
function setLocale(locale) {
  if (locale === currentLocale) return
  currentLocale = locale
  document.querySelectorAll('.locale-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.locale === locale)
  })
  extractIcons(currentLocale)
  renderPresets()
  renderToolbar()
  renderOutput()
}

document.querySelectorAll('.locale-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLocale(btn.dataset.locale))
})

// Safety net: if a drag ends without a drop landing on a row (e.g. released
// over the browser chrome or outside any drop target), make sure the caret
// doesn't linger.
window.addEventListener('dragend', hideDropCaret)

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

extractIcons(currentLocale)
setupTrashZone()
renderPresets()
renderPlugins()
renderToolbar()
renderOutput()

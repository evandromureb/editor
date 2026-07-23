let shellInstanceCount = 0

/**
 * @param {HTMLElement} root
 */
export function createEditorShell(root) {
  const instanceId = shellInstanceCount++

  root.classList.add('editor')
  root.replaceChildren()

  const toolbar = document.createElement('header')
  toolbar.className = 'editor__toolbar'

  const toolbarScroll = document.createElement('div')
  toolbarScroll.className = 'editor__toolbar-scroll editor__scroll-x'

  const toolbarTrack = document.createElement('div')
  toolbarTrack.className = 'editor__toolbar-track'
  toolbarScroll.appendChild(toolbarTrack)
  toolbar.appendChild(toolbarScroll)

  const layout = document.createElement('div')
  layout.className = 'editor__layout'

  const sidebarBackdrop = document.createElement('button')
  sidebarBackdrop.type = 'button'
  sidebarBackdrop.className = 'editor__sidebar-backdrop'
  sidebarBackdrop.hidden = true
  sidebarBackdrop.setAttribute('aria-label', 'Close sidebar')
  sidebarBackdrop.setAttribute('tabindex', '-1')

  const sidebar = document.createElement('aside')
  sidebar.className = 'editor__sidebar'
  sidebar.hidden = true

  const body = document.createElement('div')
  body.className = 'editor__body'

  const pane = document.createElement('div')
  pane.className = 'editor__pane'

  const surface = document.createElement('div')
  surface.className = 'editor__surface'

  const htmlSource = document.createElement('textarea')
  htmlSource.className = 'editor__html-source'
  htmlSource.id = `editor-html-source-${instanceId}`
  htmlSource.name = 'html-source'
  htmlSource.spellcheck = false
  htmlSource.hidden = true

  const preview = document.createElement('div')
  preview.className = 'editor__preview'
  preview.hidden = true

  pane.append(surface, htmlSource, preview)
  body.appendChild(pane)
  layout.append(sidebar, body)

  const statusbar = document.createElement('footer')
  statusbar.className = 'editor__statusbar'

  const statusbarScroll = document.createElement('div')
  statusbarScroll.className = 'editor__statusbar-scroll editor__scroll-x'

  const statusbarTrack = document.createElement('div')
  statusbarTrack.className = 'editor__statusbar-track'

  const statusbarLeft = document.createElement('div')
  statusbarLeft.className = 'editor__statusbar-left'

  const statusbarCenter = document.createElement('div')
  statusbarCenter.className = 'editor__statusbar-center'

  const statusbarRight = document.createElement('div')
  statusbarRight.className = 'editor__statusbar-right'

  statusbarTrack.append(statusbarLeft, statusbarCenter, statusbarRight)
  statusbarScroll.appendChild(statusbarTrack)
  statusbar.appendChild(statusbarScroll)

  const overlayRoot = document.createElement('div')
  overlayRoot.className = 'editor__overlay-root'

  root.append(toolbar, layout, statusbar, sidebarBackdrop, overlayRoot)

  return {
    toolbar: toolbarTrack,
    toolbarOuter: toolbar,
    layout,
    sidebar,
    sidebarBackdrop,
    body,
    pane,
    surface,
    htmlSource,
    preview,
    statusbar,
    statusbarLeft,
    statusbarCenter,
    statusbarRight,
    overlayRoot,
  }
}

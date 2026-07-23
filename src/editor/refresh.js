/**
 * @param {{ toolbar: import('../ui/toolbar/toolbar.js').Toolbar, modes: import('../ui/modes/modes.js').Modes, statusbar: import('../ui/statusbar/statusbar.js').Statusbar }} deps
 */
export function refreshEditorUi({ toolbar, modes, statusbar }) {
  toolbar.refresh()
  statusbar.refresh()
  modes.refresh()
}

/**
 * @param {{ i18n: import('../core/i18n/i18n.js').I18n, toolbar: import('../ui/toolbar/toolbar.js').Toolbar, modes: import('../ui/modes/modes.js').Modes, statusbar: import('../ui/statusbar/statusbar.js').Statusbar }} deps
 */
export function relocalizeEditorUi({ i18n, toolbar, modes, statusbar }) {
  const t = (key) => i18n.t(key)
  toolbar.relocalize(t)
  modes.relocalize(t)
  statusbar.relocalize(t)
}

/**
 * @param {{ i18n: import('../core/i18n/i18n.js').I18n, toolbar: import('../ui/toolbar/toolbar.js').Toolbar, modes: import('../ui/modes/modes.js').Modes, statusbar: import('../ui/statusbar/statusbar.js').Statusbar }} deps
 */
export function refreshAndRelocalizeEditorUi(deps) {
  relocalizeEditorUi(deps)
  refreshEditorUi(deps)
}

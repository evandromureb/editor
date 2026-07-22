/**
 * @file Build step — concatenates core, appearance, plugin, and theme CSS.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../config.js'

/** Concatenates core, appearance, plugin, and theme CSS into dist/editor.css. */
export function bundleCss() {
  const coreCss = readFileSync(join(paths.root, 'styles/editor.css'), 'utf8')
  const appearanceCss = readFileSync(join(paths.root, 'styles/appearance.css'), 'utf8')
  const responsiveCss = readFileSync(join(paths.root, 'styles/responsive.css'), 'utf8')
  const pluginCss = readFileSync(join(paths.root, 'src/generated/plugins.css'), 'utf8')
  const themesCss = readFileSync(join(paths.root, 'src/generated/themes.css'), 'utf8')

  const bundledCss = [
    '/* BaseLab Editor — CSS bundle gerado automaticamente */',
    '',
    '/* === Core === */',
    coreCss,
    '',
    '/* === Appearance === */',
    appearanceCss,
    '',
    '/* === Responsive === */',
    responsiveCss,
    '',
    '/* === Plugins === */',
    pluginCss,
    '',
    '/* === Themes === */',
    themesCss,
  ].join('\n')

  writeFileSync(join(paths.dist, 'editor.css'), bundledCss)
}

/**
 * @file Build pipeline — runs discover, compile, bundle, minify, and validate steps.
 */

import { mkdirSync } from 'node:fs'
import { paths } from './config.js'
import { runStep } from './utils.js'
import { runDiscover } from './steps/discover.js'
import { compileTypes } from './steps/typescript.js'
import { bundleJs, minifyJs } from './steps/bundle-js.js'
import { bundleCss } from './steps/bundle-css.js'
import { minifyCss } from './steps/minify-css.js'
import { copyTypes } from './steps/copy-types.js'
import { copyPluginAssets } from './steps/assets.js'
import { writeEmbedHtml } from './steps/html.js'
import { validateDist } from './steps/validate.js'

mkdirSync(paths.dist, { recursive: true })

await runStep('1/8 — Discovery (plugins, temas, i18n)', runDiscover)
await runStep('2/8 — Compilar tipos (TypeScript declarations)', compileTypes)
await runStep('3/8 — Gerar bundles JS', bundleJs)
await runStep('4/8 — Gerar CSS', bundleCss)
await runStep('5/8 — Minificar JS + source maps', minifyJs)
await runStep('6/8 — Minificar CSS + source maps', minifyCss)
await runStep('7/8 — Copiar tipos (.d.ts) para dist/types/', copyTypes)
await runStep('Extras — Assets de plugins e HTML de embed', () => {
  copyPluginAssets()
  writeEmbedHtml()
})
await runStep('8/8 — Validar artefatos da dist', validateDist)

console.log('\n[build] Complete:')
console.log('  dist/editor.js                  (ESM — requires HTTP)')
console.log('  dist/editor.min.js              (minified ESM + .map)')
console.log('  dist/editor.standalone.js       (IIFE — works via file://)')
console.log('  dist/editor.standalone.min.js   (minified IIFE + .map)')
console.log('  dist/editor.css                 (core + appearance + plugins + themes)')
console.log('  dist/editor.min.css             (minified + .map)')
console.log('  dist/types/                     (.d.ts declarations)')
console.log('  dist/embed.html                 (HTTP — <wysiwyg-editor>, all plugins)')
console.log('  dist/embed.file.html            (file:// — width 800, configurable plugins)')
console.log('  embed.file.html                 (file:// — width 800, configurable plugins)')

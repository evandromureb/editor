/**
 * @file Loads real plugin modules in tests via esbuild SDK alias resolution.
 */
import { buildSync } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Loads a plugin's real file (plugins/<id>/index.js), resolving
 * the `@baselab/plugin-sdk` import via esbuild — the same mechanism used by
 * scripts/discover.js. Allows testing the plugin's production code
 * directly, instead of recreating an equivalent mocked definition.
 *
 * @param {string} pluginId
 * @returns {Promise<import('../../src/sdk/types.js').PluginDefinition>}
 */
export async function loadRealPlugin(pluginId) {
  const entryPath = join(root, 'plugins', pluginId, 'index.js')
  const mod = await loadWithSdkAlias(entryPath)
  return mod.default
}

/**
 * Bundles any project module resolving `@baselab/plugin-sdk`
 * via esbuild (same mechanism as scripts/discover.js). Required to
 * load modules such as the generated registries in src/generated or
 * src/ui/themes/index.js, which transitively depend (via theme files
 * in themes/) on the SDK alias — something plain Node cannot resolve,
 * since package.json "imports" only supports keys with a "#" prefix.
 *
 * @param {string} entryPath - absolute path of the module to load
 * @returns {Promise<any>} module namespace (named exports)
 */
export async function loadWithSdkAlias(entryPath) {
  const outdir = mkdtempSync(join(tmpdir(), 'baselab-test-module-'))
  const outfile = join(outdir, 'bundle.mjs')

  try {
    buildSync({
      entryPoints: [entryPath],
      bundle: true,
      outfile,
      format: 'esm',
      platform: 'node',
      alias: {
        '@baselab/plugin-sdk': join(root, 'src/sdk/index.js'),
      },
      logLevel: 'silent',
    })

    return await import(pathToFileURL(outfile).href)
  } finally {
    rmSync(outdir, { recursive: true, force: true })
  }
}

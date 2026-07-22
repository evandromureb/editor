/**
 * @file Build step — bundles and minifies JavaScript with esbuild.
 */

import { buildSync } from 'esbuild'
import { join } from 'node:path'
import { jsBundles, paths } from '../config.js'

/**
 * @param {typeof jsBundles[number]} bundle
 * @param {{ minify?: boolean, sourcemap?: boolean }} options
 */
function buildJsBundle(bundle, options = {}) {
  const outfile = join(
    paths.dist,
    options.minify ? bundle.minName : bundle.name,
  )

  /** @type {import('esbuild').BuildOptions} */
  const buildOptions = {
    entryPoints: [paths.entry],
    bundle: true,
    platform: 'browser',
    format: bundle.format,
    outfile,
    alias: {
      [paths.sdkAlias]: paths.sdkPath,
    },
    minify: options.minify ?? false,
    sourcemap: options.sourcemap ?? false,
  }

  if (bundle.format === 'iife') {
    buildOptions.globalName = bundle.globalName
    if (bundle.define) {
      buildOptions.define = bundle.define
    }
  }

  buildSync(buildOptions)
}

/** Builds ESM and IIFE JavaScript bundles. */
export function bundleJs() {
  for (const bundle of jsBundles) {
    buildJsBundle(bundle)
  }
}

/** Builds minified JavaScript bundles with source maps. */
export function minifyJs() {
  for (const bundle of jsBundles) {
    buildJsBundle(bundle, { minify: true, sourcemap: true })
  }
}

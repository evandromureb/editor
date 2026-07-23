/**
 * @file Build configuration — paths, bundle definitions, and required dist artifacts.
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

export const paths = {
  root,
  dist: join(root, 'dist'),
  buildTypes: join(root, '.build/types'),
  entry: join(root, 'src/embed/entry.js'),
  sdkAlias: '@baselab/plugin-sdk',
  sdkPath: './src/sdk/index.js',
}

export const jsBundles = [
  {
    name: 'editor.js',
    format: 'esm',
    minName: 'editor.min.js',
    minMapName: 'editor.min.js.map',
  },
  {
    name: 'editor.standalone.js',
    format: 'iife',
    globalName: 'EditorBundle',
    define: { 'import.meta.url': '""' },
    minName: 'editor.standalone.min.js',
    minMapName: 'editor.standalone.min.js.map',
  },
]

export const cssBundle = {
  name: 'editor.css',
  minName: 'editor.min.css',
  minMapName: 'editor.min.css.map',
}

export const requiredDistArtifacts = [
  'editor.js',
  'editor.min.js',
  'editor.min.js.map',
  'editor.standalone.js',
  'editor.standalone.min.js',
  'editor.standalone.min.js.map',
  'editor.css',
  'editor.min.css',
  'editor.min.css.map',
  'embed.html',
  'embed.file.html',
  'types/index.d.ts',
]

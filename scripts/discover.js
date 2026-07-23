/**
 * @file Build discovery — scans plugins/ and themes/, validates, and generates src/generated/.
 */

import {
  readdirSync,
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { join, basename, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { buildSync } from 'esbuild'

const root = process.env.DISCOVER_ROOT
  ? process.env.DISCOVER_ROOT
  : join(dirname(fileURLToPath(import.meta.url)), '..')
const generatedDir = join(root, 'src/generated')

mkdirSync(generatedDir, { recursive: true })

const KNOWN_CAPABILITIES = new Set([
  'marks',
  'blocks',
  'commands',
  'toolbar',
  'shortcuts',
  'i18n',
  'statusbar',
  'sidebar',
  'contextMenu',
  'selectionMenu',
  'inspector',
  'overlays',
])

const FORBIDDEN_IMPORT_PATTERNS = [
  { pattern: /from\s+['"]\.\.\/\.\.\/src\//, message: 'import de ../../src/' },
  { pattern: /from\s+['"]\.\.\/src\//, message: 'import de ../src/' },
  { pattern: /from\s+['"]\.\.\/editor/, message: 'import de ../editor' },
  { pattern: /from\s+['"]\.\.\/core\//, message: 'import de ../core/' },
  { pattern: /from\s+['"]\.\.\/ui\//, message: 'import de ../ui/' },
]

const IMPORT_SPECIFIER_PATTERN =
  /(?:import\s+(?:[\w*{}\s,$]+\s+from\s+|)|export\s+(?:\*|[\w{}]+)\s+from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g

/**
 * @param {string} specifier
 * @returns {boolean}
 */
function isAllowedImportSpecifier(specifier) {
  if (specifier === '@baselab/plugin-sdk') return true
  if (specifier.startsWith('./') || specifier.startsWith('../')) return true
  // `node:*` built-ins are allowed through deliberately — plugins are
  // trusted code, not sandboxed.
  // This check only stops accidental npm/internal-module imports; it is not
  // a capability restriction.
  if (specifier.startsWith('node:')) return true
  return false
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSubdirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
}

/**
 * @param {string} str
 * @returns {string}
 */
function toIdentifier(str) {
  return str.replace(/[^a-zA-Z0-9_$]/g, '_')
}

/**
 * @param {string} filePath
 * @param {string} pluginId
 */
function assertNoForbiddenImports(filePath, pluginId) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')

  for (const { pattern, message } of FORBIDDEN_IMPORT_PATTERNS) {
    if (pattern.test(content)) {
      throw new Error(
        `[discover] Plugin "${pluginId}": forbidden internal import (${message}) in ${basename(filePath)}. Use @baselab/plugin-sdk.`
      )
    }
  }

  for (const match of content.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const specifier = match[1]
    if (!isAllowedImportSpecifier(specifier)) {
      throw new Error(
        `[discover] Plugin "${pluginId}": forbidden external package import ("${specifier}") in ${basename(filePath)}. Use only @baselab/plugin-sdk and local modules.`
      )
    }
  }
}

/**
 * @param {string} dir
 * @param {string} entityId
 */
function assertDirectoryImportsAllowed(dir, entityId) {
  for (const relPath of listFilesRecursive(dir)) {
    if (!relPath.endsWith('.js')) continue
    assertNoForbiddenImports(join(dir, relPath), entityId)
  }
}

/**
 * @param {string} dir
 * @param {string} [base]
 * @returns {string[]}
 */
function listFilesRecursive(dir, base = dir) {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, base))
    } else {
      files.push(fullPath.replace(base + '/', ''))
    }
  }

  return files
}

/**
 * Loads translations from plugins/ID/lang/locale.json
 *
 * @param {string} pluginDir
 * @returns {Record<string, Record<string, string>>}
 */
function loadLangJson(pluginDir) {
  const langDir = join(pluginDir, 'lang')
  /** @type {Record<string, Record<string, string>>} */
  const result = {}

  if (!existsSync(langDir)) return result

  for (const file of readdirSync(langDir)) {
    if (!file.endsWith('.json')) continue
    const locale = file.replace(/\.json$/, '')
    const filePath = join(langDir, file)
    try {
      result[locale] = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (error) {
      throw new Error(`[discover] Failed to parse i18n JSON at "${filePath}": ${error.message}`)
    }
  }

  return result
}

/**
 * Validates that all locales in an i18n dictionary have exactly
 * the same set of keys (translation parity).
 *
 * @param {string} namespaceLabel
 * @param {Record<string, Record<string, string>>} dict
 */
function validateI18nParity(namespaceLabel, dict) {
  const locales = Object.keys(dict)
  if (locales.length <= 1) return

  /** @type {Set<string>} */
  const allKeys = new Set()
  for (const locale of locales) {
    for (const key of Object.keys(dict[locale])) {
      allKeys.add(key)
    }
  }

  for (const locale of locales) {
    const keys = new Set(Object.keys(dict[locale]))
    const missing = [...allKeys].filter((key) => !keys.has(key))
    if (missing.length > 0) {
      throw new Error(
        `[discover] i18n "${namespaceLabel}": locale "${locale}" is missing keys: ${missing.join(', ')}`
      )
    }
  }
}

/**
 * Loads a plugin/theme module via esbuild (resolves @baselab/plugin-sdk).
 *
 * TRUST BOUNDARY — this `import()` executes the plugin/theme's top-level
 * module code directly in this Node process, with this process's full
 * filesystem and Node permissions. There is no sandboxing here: it is an
 * intentional architectural decision (simplicity over isolation), not an
 * oversight — plugins are trusted code, on par with any other source file in
 * this repository. `isAllowedImportSpecifier()` above only blocks accidental
 * imports of internal `src/core`/`src/ui` modules and npm packages; it does
 * not restrict what a plugin can do once its code runs (e.g. `node:*`
 * built-ins are allowed through). Do not point discovery at plugins you
 * have not reviewed and trust.
 *
 * @param {string} entryPath
 * @returns {Promise<any>}
 */
async function loadModule(entryPath) {
  const outdir = mkdtempSync(join(tmpdir(), 'baselab-discover-'))
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

// ---------------------------------------------------------------------------
// Plugin discovery and validation
// ---------------------------------------------------------------------------

const pluginsDir = join(root, 'plugins')
const pluginFolders = listSubdirs(pluginsDir)

/** @type {Array<{ id: string, relPath: string, i18n: Record<string, Record<string, string>> }>} */
const discoveredPlugins = []

/** @type {Set<string>} */
const seenMarks = new Set()
/** @type {Set<string>} */
const seenBlockTypes = new Set()
/** @type {Set<string>} */
const seenCommands = new Set()
/** @type {Set<string>} */
const seenToolbarIds = new Set()
/** @type {Map<string, string>} */
const seenShortcuts = new Map()

/** @type {Set<string>} */
const i18nLocales = new Set()

for (const folder of pluginFolders) {
  const pluginDir = join(pluginsDir, folder)
  const entryPath = join(pluginDir, 'index.js')

  if (!existsSync(entryPath)) {
    console.warn(`[discover] Plugin folder without index.js ignored: plugins/${folder}`)
    continue
  }

  assertDirectoryImportsAllowed(pluginDir, folder)

  const mod = await loadModule(entryPath)
  const plugin = mod.default

  if (!plugin?.id) {
    throw new Error(
      `[discover] Plugin at plugins/${folder}/index.js does not export default with "id"`
    )
  }

  if (plugin.id !== folder) {
    throw new Error(`[discover] Plugin "${plugin.id}": id must match folder name ("${folder}")`)
  }

  const caps = plugin.capabilities ?? {}

  for (const capName of Object.keys(caps)) {
    if (!KNOWN_CAPABILITIES.has(capName)) {
      throw new Error(
        `[discover] Plugin "${plugin.id}": unknown capability "${capName}". Valid: ${[...KNOWN_CAPABILITIES].join(', ')}`
      )
    }
  }

  for (const mark of caps.marks ?? []) {
    if (seenMarks.has(mark.name)) {
      throw new Error(`[discover] Duplicate mark: "${mark.name}" (plugin: ${plugin.id})`)
    }
    seenMarks.add(mark.name)
  }

  for (const block of caps.blocks ?? []) {
    if (seenBlockTypes.has(block.type)) {
      throw new Error(`[discover] Duplicate block: "${block.type}" (plugin: ${plugin.id})`)
    }
    seenBlockTypes.add(block.type)
  }

  for (const commandName of Object.keys(caps.commands ?? {})) {
    if (seenCommands.has(commandName)) {
      throw new Error(`[discover] Duplicate command: "${commandName}" (plugin: ${plugin.id})`)
    }
    seenCommands.add(commandName)
  }

  for (const item of caps.toolbar ?? []) {
    if (seenToolbarIds.has(item.id)) {
      throw new Error(`[discover] Duplicate toolbar id: "${item.id}" (plugin: ${plugin.id})`)
    }
    seenToolbarIds.add(item.id)
  }

  for (const [shortcut, commandName] of Object.entries(caps.shortcuts ?? {})) {
    if (seenShortcuts.has(shortcut)) {
      throw new Error(
        `[discover] Duplicate shortcut: "${shortcut}" (plugins: ${seenShortcuts.get(shortcut)} and ${plugin.id})`
      )
    }
    seenShortcuts.set(shortcut, plugin.id)
  }

  const langFromJson = loadLangJson(pluginDir)
  /** @type {Record<string, Record<string, string>>} */
  const pluginI18nData = { ...langFromJson }

  for (const [locale, dict] of Object.entries(caps.i18n ?? {})) {
    pluginI18nData[locale] = { ...(pluginI18nData[locale] ?? {}), ...dict }
  }

  validateI18nParity(`plugin:${plugin.id}`, pluginI18nData)

  for (const locale of Object.keys(pluginI18nData)) {
    i18nLocales.add(locale)
  }

  discoveredPlugins.push({
    id: folder,
    relPath: `../../plugins/${folder}/index.js`,
    i18n: pluginI18nData,
  })
}

// ---------------------------------------------------------------------------
// Gera plugins.registry.js
// ---------------------------------------------------------------------------

const pluginImports = discoveredPlugins
  .map(({ id, relPath }) => `import raw_${toIdentifier(id)} from '${relPath}'`)
  .join('\n')

const pluginExports = discoveredPlugins
  .map(({ id, i18n }) => {
    const identifier = toIdentifier(id)
    const i18nLiteral = JSON.stringify(i18n, null, 2)
    return `/** @type {import('../../src/sdk/types.js').PluginDefinition} */
export const plugin_${identifier} = {
  ...raw_${identifier},
  capabilities: {
    ...raw_${identifier}.capabilities,
    i18n: ${i18nLiteral},
  },
}`
  })
  .join('\n\n')

const pluginArray = discoveredPlugins.map(({ id }) => `  plugin_${toIdentifier(id)}`).join(',\n')

writeFileSync(
  join(generatedDir, 'plugins.registry.js'),
  `// AUTO-GENERATED BY BUILD. DO NOT EDIT.

${pluginImports}

${pluginExports}

/** @type {import('../../src/sdk/types.js').PluginDefinition[]} */
export const discoveredPlugins = [
${pluginArray},
]
`
)

// ---------------------------------------------------------------------------
// Gera plugins.css
// ---------------------------------------------------------------------------

const pluginCssParts = []
for (const { id } of discoveredPlugins) {
  const cssPath = join(pluginsDir, id, 'styles.css')
  if (existsSync(cssPath)) {
    pluginCssParts.push(`/* plugin: ${id} */\n${readFileSync(cssPath, 'utf8')}`)
  }
}

writeFileSync(
  join(generatedDir, 'plugins.css'),
  `/* ARQUIVO AUTO-GERADO PELO BUILD. NÃO EDITE. */\n\n${pluginCssParts.join('\n')}`
)

// ---------------------------------------------------------------------------
// Core i18n discovery
// ---------------------------------------------------------------------------

const coreI18n = loadLangJson(join(root, 'src/core'))

if (!coreI18n.pt || !coreI18n.en) {
  throw new Error('[discover] i18n "core": locales "pt" and "en" are required in src/core/lang/')
}

validateI18nParity('core', coreI18n)

for (const locale of Object.keys(coreI18n)) {
  i18nLocales.add(locale)
}

writeFileSync(
  join(generatedDir, 'core.i18n.registry.js'),
  `// AUTO-GENERATED BY BUILD. DO NOT EDIT.

/** @type {Record<string, Record<string, string>>} */
export const coreI18n = ${JSON.stringify(coreI18n, null, 2)}
`
)

// ---------------------------------------------------------------------------
// Theme discovery
// ---------------------------------------------------------------------------

const themesDir = join(root, 'themes')
const themeFolders = listSubdirs(themesDir)

/** @type {Array<{ id: string, relPath: string, cssPath: string | null }>} */
const discoveredThemes = []

for (const folder of themeFolders) {
  const themeDir = join(themesDir, folder)
  const entryPath = join(themeDir, 'index.js')

  if (!existsSync(entryPath)) {
    console.warn(`[discover] Theme folder without index.js ignored: themes/${folder}`)
    continue
  }

  assertDirectoryImportsAllowed(themeDir, `theme:${folder}`)

  const mod = await loadModule(entryPath)
  const theme = mod.default

  if (!theme?.id) {
    throw new Error(
      `[discover] Theme at themes/${folder}/index.js does not export default with "id"`
    )
  }

  if (theme.id !== folder) {
    throw new Error(`[discover] Theme "${theme.id}": id must match folder name ("${folder}")`)
  }

  const cssPath = join(themeDir, 'theme.css')
  discoveredThemes.push({
    id: folder,
    relPath: `../../themes/${folder}/index.js`,
    cssPath: existsSync(cssPath) ? cssPath : null,
  })
}

writeFileSync(
  join(generatedDir, 'themes.registry.js'),
  `// AUTO-GENERATED BY BUILD. DO NOT EDIT.

${discoveredThemes.map(({ id, relPath }) => `import theme_${toIdentifier(id)} from '${relPath}'`).join('\n')}

/** @type {import('../../src/sdk/define-theme.js').ThemeDefinition[]} */
export const discoveredThemes = [
${discoveredThemes.map(({ id }) => `  theme_${toIdentifier(id)}`).join(',\n')},
]
`
)

const themeCssParts = []
for (const { id, cssPath } of discoveredThemes) {
  if (cssPath) {
    themeCssParts.push(`/* tema: ${id} */\n${readFileSync(cssPath, 'utf8')}`)
  }
}

writeFileSync(
  join(generatedDir, 'themes.css'),
  `/* ARQUIVO AUTO-GERADO PELO BUILD. NÃO EDITE. */\n\n${themeCssParts.join('\n')}`
)

// ---------------------------------------------------------------------------
// Assets registry
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, Record<string, string>>>} */
const assetsMap = {}

for (const { id } of discoveredPlugins) {
  const pluginDir = join(pluginsDir, id)
  const assetCategories = ['assets', 'images', 'templates']
  /** @type {Record<string, Record<string, string>>} */
  const pluginAssets = {}

  for (const category of assetCategories) {
    const categoryDir = join(pluginDir, category)
    const files = listFilesRecursive(categoryDir, categoryDir)
    if (files.length === 0) continue

    /** @type {Record<string, string>} */
    const byName = {}
    for (const file of files) {
      const baseName = basename(file, extname(file))
      byName[baseName] = `plugins/${id}/${category}/${file}`
    }
    pluginAssets[category] = byName
  }

  if (Object.keys(pluginAssets).length > 0) {
    assetsMap[id] = pluginAssets
  }
}

writeFileSync(
  join(generatedDir, 'assets.registry.js'),
  `// AUTO-GENERATED BY BUILD. DO NOT EDIT.

/** @type {Record<string, Record<string, Record<string, string>>>} */
export const assetsRegistry = ${JSON.stringify(assetsMap, null, 2)}
`
)

console.log(`[discover] Plugins: ${discoveredPlugins.map((p) => p.id).join(', ')}`)
console.log(`[discover] Temas:   ${discoveredThemes.map((t) => t.id).join(', ')}`)
console.log(`[discover] i18n:    ${[...i18nLocales].join(', ') || '(nenhum)'}`)
console.log(`[discover] Gerados em src/generated/`)

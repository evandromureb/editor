import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let fixtureDir

beforeEach(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), 'baselab-discover-fixture-'))
  cpSync(join(root, 'src/sdk'), join(fixtureDir, 'src/sdk'), { recursive: true })
  cpSync(join(root, 'src/core'), join(fixtureDir, 'src/core'), { recursive: true })
  mkdirSync(join(fixtureDir, 'plugins'), { recursive: true })
  mkdirSync(join(fixtureDir, 'themes'), { recursive: true })
})

afterEach(() => {
  rmSync(fixtureDir, { recursive: true, force: true })
})

/**
 * @param {string} relPath
 * @param {string} content
 */
function write(relPath, content) {
  const full = join(fixtureDir, relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function run() {
  const result = spawnSync('node', [join(root, 'scripts/discover.js')], {
    cwd: fixtureDir,
    encoding: 'utf8',
    env: { ...process.env, DISCOVER_ROOT: fixtureDir },
  })
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function pluginHeader(extraImports = '') {
  return `import { definePlugin, mark, block, command, toolbarItem, shortcut } from '@baselab/plugin-sdk'\n${extraImports}\n`
}

describe('discover.js — error scenarios and branches', () => {
  it('throws error when finding forbidden internal src import', () => {
    write(
      'plugins/bad-import/index.js',
      `${pluginHeader()}
import { helper } from '../../src/core/foo.js'

export default definePlugin({
  id: 'bad-import',
  name: 'Bad Import',
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /forbidden internal import/)
  })

  it('throws error when finding non-permitted external package import', () => {
    write(
      'plugins/bad-external/index.js',
      `${pluginHeader()}
import lodash from 'lodash'

export default definePlugin({
  id: 'bad-external',
  name: 'Bad External',
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /forbidden external package import/)
  })

  it('allows relative and node: imports inside plugins', () => {
    write('plugins/local-imports/helper.js', `export const helperValue = 1\n`)
    write(
      'plugins/local-imports/index.js',
      `${pluginHeader("import { helperValue } from './helper.js'\nimport { tmpdir } from 'node:os'\n")}
export default definePlugin({
  id: 'local-imports',
  name: 'Local Imports',
  capabilities: {
    marks: [mark('local-imports-mark', { tag: 'em' })],
  },
})
`
    )
    const result = run()
    assert.equal(result.ok, true)
  })

  it('throws error when plugin does not export id', () => {
    write('plugins/no-id/index.js', `${pluginHeader()}\nexport default { name: 'No Id' }\n`)
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /does not export default with "id"/)
  })

  it('throws error when plugin id does not match folder', () => {
    write(
      'plugins/mismatched/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'other-id',
  name: 'Mismatched',
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /id must match folder name/)
  })

  it('throws error for unknown capability', () => {
    write(
      'plugins/unknown-cap/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'unknown-cap',
  name: 'Unknown Cap',
  capabilities: { bogus: {} },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /unknown capability/)
  })

  it('throws error for duplicate mark among plugins', () => {
    write(
      'plugins/mark-a/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'mark-a',
  name: 'Mark A',
  capabilities: { marks: [mark('dup-mark', { tag: 'em' })] },
})
`
    )
    write(
      'plugins/mark-b/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'mark-b',
  name: 'Mark B',
  capabilities: { marks: [mark('dup-mark', { tag: 'strong' })] },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Duplicate mark/)
  })

  it('throws error for duplicate block among plugins', () => {
    write(
      'plugins/block-a/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'block-a',
  name: 'Block A',
  capabilities: { blocks: [block('dup-block')] },
})
`
    )
    write(
      'plugins/block-b/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'block-b',
  name: 'Block B',
  capabilities: { blocks: [block('dup-block')] },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Duplicate block/)
  })

  it('throws error for duplicate command among plugins', () => {
    write(
      'plugins/cmd-a/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'cmd-a',
  name: 'Cmd A',
  capabilities: { commands: { dupCommand: command(() => {}) } },
})
`
    )
    write(
      'plugins/cmd-b/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'cmd-b',
  name: 'Cmd B',
  capabilities: { commands: { dupCommand: command(() => {}) } },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Duplicate command/)
  })

  it('throws error for duplicate toolbar id among plugins', () => {
    write(
      'plugins/toolbar-a/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'toolbar-a',
  name: 'Toolbar A',
  capabilities: { toolbar: [toolbarItem({ id: 'dup-toolbar', label: 'A' })] },
})
`
    )
    write(
      'plugins/toolbar-b/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'toolbar-b',
  name: 'Toolbar B',
  capabilities: { toolbar: [toolbarItem({ id: 'dup-toolbar', label: 'B' })] },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Duplicate toolbar id/)
  })

  it('throws error for duplicate shortcut among plugins', () => {
    write(
      'plugins/short-a/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'short-a',
  name: 'Short A',
  capabilities: { shortcuts: shortcut('Mod-x', 'commandA') },
})
`
    )
    write(
      'plugins/short-b/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'short-b',
  name: 'Short B',
  capabilities: { shortcuts: shortcut('Mod-x', 'commandB') },
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Duplicate shortcut/)
  })

  it('merges capabilities.i18n with plugin lang/*.json', () => {
    write('plugins/inline-i18n/lang/en.json', JSON.stringify({ greeting: 'hi' }))
    write(
      'plugins/inline-i18n/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'inline-i18n',
  name: 'Inline I18n',
  capabilities: { i18n: { en: { farewell: 'bye' }, pt: { greeting: 'oi', farewell: 'tchau' } } },
})
`
    )
    const result = run()
    assert.equal(result.ok, true)
    const content = readFileSync(join(fixtureDir, 'src/generated/plugins.registry.js'), 'utf8')
    assert.match(content, /farewell/)
    assert.match(content, /greeting/)
  })

  it('ignores non-json files inside lang/', () => {
    write('plugins/lang-with-readme/lang/en.json', JSON.stringify({ a: '1' }))
    write('plugins/lang-with-readme/lang/README.md', '# is not json')
    write(
      'plugins/lang-with-readme/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'lang-with-readme',
  name: 'Lang With Readme',
})
`
    )
    const result = run()
    assert.equal(result.ok, true)
  })

  it('discover without plugins/ folder at root does not fail', () => {
    rmSync(join(fixtureDir, 'plugins'), { recursive: true, force: true })
    const result = run()
    assert.equal(result.ok, true)
  })

  it('registers theme without theme.css with null cssPath', () => {
    write(
      'themes/no-css/index.js',
      `import { theme } from '@baselab/plugin-sdk'\n\nexport default theme('no-css', 'Sem CSS')\n`
    )
    const result = run()
    assert.equal(result.ok, true)
  })

  it('includes theme.css when present in theme folder', () => {
    write(
      'themes/with-css/index.js',
      `import { theme } from '@baselab/plugin-sdk'\n\nexport default theme('with-css', 'Com CSS')\n`
    )
    write('themes/with-css/theme.css', '.foo { color: red; }')
    const result = run()
    assert.equal(result.ok, true)
    const content = readFileSync(join(fixtureDir, 'src/generated/themes.css'), 'utf8')
    assert.match(content, /\.foo/)
  })

  it('throws error for invalid JSON in lang/*.json', () => {
    write('plugins/bad-json/lang/en.json', '{ not valid json')
    write(
      'plugins/bad-json/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'bad-json',
  name: 'Bad Json',
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /Failed to parse i18n JSON/)
  })

  it('throws error when plugin i18n locales do not have key parity', () => {
    write('plugins/parity/lang/en.json', JSON.stringify({ a: '1', b: '2' }))
    write('plugins/parity/lang/pt.json', JSON.stringify({ a: '1' }))
    write(
      'plugins/parity/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'parity',
  name: 'Parity',
})
`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /missing keys/)
  })

  it('throws error when core i18n does not have pt or en', () => {
    rmSync(join(fixtureDir, 'src/core/lang/pt.json'))
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /locales "pt" and "en" are required/)
  })

  it('warns and ignores theme folder without index.js', () => {
    mkdirSync(join(fixtureDir, 'themes/empty-theme'), { recursive: true })
    const result = run()
    assert.equal(result.ok, true)
    assert.match(result.stderr, /Theme folder without index\.js ignored/)
  })

  it('throws error when theme does not export id', () => {
    write('themes/no-id/index.js', `export default { label: 'No Id' }\n`)
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /does not export default with "id"/)
  })

  it('throws error when theme id does not match folder', () => {
    write(
      'themes/mismatched-theme/index.js',
      `import { theme } from '@baselab/plugin-sdk'\n\nexport default theme('other-theme-id', 'Label')\n`
    )
    const result = run()
    assert.equal(result.ok, false)
    assert.match(result.stderr, /id must match folder name/)
  })

  it('generates assets registry from plugin assets/images/templates', () => {
    write('plugins/with-assets/assets/foo.txt', 'conteudo')
    write('plugins/with-assets/images/bar.png', 'fake-png')
    write('plugins/with-assets/templates/baz.html', '<p>oi</p>')
    write(
      'plugins/with-assets/index.js',
      `${pluginHeader()}
export default definePlugin({
  id: 'with-assets',
  name: 'With Assets',
})
`
    )
    const result = run()
    assert.equal(result.ok, true)
    const content = readFileSync(join(fixtureDir, 'src/generated/assets.registry.js'), 'utf8')
    assert.match(content, /with-assets\/assets\/foo\.txt/)
    assert.match(content, /with-assets\/images\/bar\.png/)
    assert.match(content, /with-assets\/templates\/baz\.html/)
  })
})

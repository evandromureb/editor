/**
 * @file Tests for sanitize.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeHtml } from '../src/core/sanitize/sanitize.js'
import { createTestRegistries } from './helpers/fixtures.js'
import { block, mark } from '../src/sdk/helpers.js'

/**
 * @returns {import('../src/core/schema/editor-registries.js').EditorRegistries}
 */
function createRegistriesWithLink() {
  const registries = createTestRegistries()
  registries.marks.registerMark(
    mark('link', { tag: 'a', parseTags: ['a'], attrs: ['href'], priority: -1 }),
  )
  return registries
}

/**
 * @returns {import('../src/core/schema/editor-registries.js').EditorRegistries}
 */
function createRegistriesWithImage() {
  const registries = createTestRegistries()
  registries.blocks.registerBlock(
    block('image', {
      tag: 'img',
      void: true,
      parseTags: ['img', 'figure'],
      attrs: ['src'],
    }),
  )
  return registries
}

describe('sanitizeHtml', () => {
  it('keeps allowed tags (strong via registered bold)', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<strong>texto</strong>', registries)
    assert.equal(out, '<strong>texto</strong>')
  })

  it('removes <script> tag but preserves text as inert content (no execution)', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<script>alert(1)</script>', registries)
    assert.ok(!out.includes('<script'))
    assert.ok(!out.includes('</script>'))
  })

  it('removes event attributes (onerror/onclick) even on allowed tags', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<strong onclick="alert(1)" onmouseover="alert(2)">x</strong>', registries)
    assert.ok(!out.includes('onclick'))
    assert.ok(!out.includes('onmouseover'))
  })

  it('removes arbitrary href/src attributes — no attribute is copied beyond allowed style', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<strong data-x="1" src="javascript:alert(1)">x</strong>', registries)
    assert.ok(!out.includes('javascript:'))
    assert.ok(!out.includes('data-x'))
    assert.ok(!out.includes('src='))
  })

  it('removes <img onerror=...> tag — img is not in fixture allowedTags', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">antes<b>y</b>', registries)
    assert.ok(!out.includes('onerror'))
    assert.ok(!out.includes('<img'))
  })

  it('removes <iframe> preserving only internal text as inert text node', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<iframe src="javascript:alert(1)">conteudo</iframe>', registries)
    assert.ok(!out.includes('<iframe'))
    assert.ok(!out.includes('javascript:'))
  })

  it('recursively removes unknown nested tags, preserving only allowed text/tags', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<div><span onclick="x()"><strong>bold</strong> texto</span></div>', registries)
    assert.ok(!out.includes('onclick'))
    assert.ok(!out.includes('<div'))
    assert.ok(!out.includes('<span'))
    assert.ok(out.includes('<strong>bold</strong>'))
    assert.ok(out.includes('texto'))
  })

  it('preserves registered void blocks (hr) and ignores their internal content', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<hr><script>alert(1)</script></hr>', registries)
    assert.ok(out.includes('<hr>') || out.includes('<hr/>') || out.includes('<hr />'))
  })

  it('returns empty string for empty input or spaces only', () => {
    const registries = createTestRegistries()
    assert.equal(sanitizeHtml('', registries), '')
    assert.equal(sanitizeHtml('   \n\t', registries), '')
  })

  it('copies only allowed style (mark styleAttr) and ignores other styles', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<strong style="color: red; font-weight: bold;">x</strong>', registries)
    assert.ok(!out.includes('color'))
  })

  it('escapes/preserves plain text without introducing executable HTML', () => {
    const registries = createTestRegistries()
    const out = sanitizeHtml('<strong><img src=x onerror=alert(1)>texto</strong>', registries)
    assert.ok(!out.includes('onerror'))
    assert.ok(out.includes('texto'))
  })

  it('strips data: URLs from link href', () => {
    const registries = createRegistriesWithLink()
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>', registries)
    assert.ok(!out.includes('data:'))
    assert.ok(!out.includes('href='))
  })

  it('strips file: URLs from link href', () => {
    const registries = createRegistriesWithLink()
    const out = sanitizeHtml('<a href="file:///etc/passwd">x</a>', registries)
    assert.ok(!out.includes('href='))
  })

  it('preserves safe schemes (https:, mailto:, tel:) in link href', () => {
    const registries = createRegistriesWithLink()
    assert.ok(sanitizeHtml('<a href="https://example.com">x</a>', registries).includes('href="https://example.com"'))
    assert.ok(sanitizeHtml('<a href="mailto:a@b.com">x</a>', registries).includes('href="mailto:a@b.com"'))
    assert.ok(sanitizeHtml('<a href="tel:+123456789">x</a>', registries).includes('href="tel:+123456789"'))
  })

  it('strips blob: URLs from link href', () => {
    const registries = createRegistriesWithLink()
    const out = sanitizeHtml('<a href="blob:https://example.com/uuid">x</a>', registries)
    assert.ok(!out.includes('href='))
  })

  it('preserves relative/anchor href values (no scheme) in link href', () => {
    const registries = createRegistriesWithLink()
    assert.ok(sanitizeHtml('<a href="/path">x</a>', registries).includes('href="/path"'))
    assert.ok(sanitizeHtml('<a href="#section">x</a>', registries).includes('href="#section"'))
  })

  it('preserves blob: URLs for image src', () => {
    const registries = createRegistriesWithImage()
    const out = sanitizeHtml('<img src="blob:https://example.com/uuid">', registries)
    assert.ok(out.includes('src="blob:https://example.com/uuid"'))
  })
})

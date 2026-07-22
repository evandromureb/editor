/** @typedef {'doc' | 'paragraph' | 'text' | 'hr'} NodeType */

/**
 * @typedef {object} TextNode
 * @property {'text'} type
 * @property {string} text
 * @property {string[]} [marks]
 * @property {Record<string, string>} [markAttrs] values by mark name (e.g. font-family)
 */

/**
 * Generic block with editable text content (paragraph, heading-1..5, etc.).
 *
 * @typedef {object} TextBlockNode
 * @property {string} type
 * @property {TextNode[]} content
 * @property {boolean} [implicit] true when the block came from inline text at the root (no block tag in HTML)
 * @property {Record<string, string>} [style] whitelisted CSS properties serialized as `style="prop: value"` on the block's own tag (e.g. text-align, margin-left)
 * @property {Record<string, string>} [attrs] plugin-defined HTML attribute values carried by the block's own tag (e.g. `data-checked` for a task-item), mirroring void blocks' `attrs`
 */

/**
 * @typedef {TextBlockNode & { type: 'paragraph' }} ParagraphNode
 */

/**
 * @typedef {object} HrNode
 * @property {'hr'} type
 */

/**
 * Generic block without editable text content (hr, image, ...). May carry
 * plugin-defined `attrs` (mapped to real HTML attributes on the block's tag)
 * and a `caption` (rendered as a child `captionTag`, e.g. figcaption) when
 * the block definition declares `attrs`/`captionTag`/`wrapperTag`.
 *
 * @typedef {object} VoidBlockNode
 * @property {string} type
 * @property {Record<string, string>} [attrs]
 * @property {string} [caption]
 */

/**
 * Container block whose children are other blocks (e.g. a task-list holding
 * task-items). Nesting is one level deep only — a container's children are
 * never themselves containers.
 *
 * @typedef {object} ContainerBlockNode
 * @property {string} type
 * @property {BlockNode[]} children
 * @property {Record<string, string>} [style] whitelisted CSS properties serialized as `style="prop: value"` on the container's own tag
 */

/** @typedef {TextBlockNode | HrNode | VoidBlockNode | ContainerBlockNode} BlockNode */

/**
 * @typedef {object} DocNode
 * @property {'doc'} type
 * @property {BlockNode[]} content
 */

export {}

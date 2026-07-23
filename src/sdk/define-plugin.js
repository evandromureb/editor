/** @typedef {import('./types.js').PluginDefinition} PluginDefinition */

/**
 * Defines a plugin and validates its structure.
 *
 * @param {PluginDefinition} definition
 * @returns {PluginDefinition}
 */
export function definePlugin(definition) {
  if (!definition.id) {
    throw new Error('definePlugin: property "id" is required')
  }
  if (!definition.name) {
    throw new Error(`definePlugin(${definition.id}): property "name" is required`)
  }
  return definition
}

/** @typedef {import('../operations/types.js').EditorState} EditorState */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

/** @typedef {(state: EditorState, registries: EditorRegistries) => EditorState} Command */

/**
 * @typedef {object} CommandRegistry
 * @property {(name: string, command: Command) => void} registerCommand
 * @property {(name: string) => void} unregisterCommand
 * @property {(name: string) => Command | null} getCommand
 * @property {() => Record<string, Command>} getCommands
 */

/** @returns {CommandRegistry} */
export function createCommandRegistry() {
  /** @type {Map<string, Command>} */
  const commands = new Map()

  /**
   * @param {string} name
   * @param {Command} command
   */
  function registerCommand(name, command) {
    commands.set(name, command)
  }

  /**
   * @param {string} name
   */
  function unregisterCommand(name) {
    commands.delete(name)
  }

  /**
   * @param {string} name
   * @returns {Command | null}
   */
  function getCommand(name) {
    return commands.get(name) ?? null
  }

  /** @returns {Record<string, Command>} */
  function getCommands() {
    return Object.fromEntries(commands)
  }

  return { registerCommand, unregisterCommand, getCommand, getCommands }
}

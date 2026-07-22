import { createTransaction, statesEqual } from '../core/transactions/index.js'

/**
 * @param {{ getState: () => import('../sdk/types.js').EditorState, registries: import('../core/schema/editor-registries.js').EditorRegistries, history: import('../core/history/history.js').History, applyState: (state: import('../sdk/types.js').EditorState) => void }} deps
 * @param {(state: import('../sdk/types.js').EditorState, registries: import('../core/schema/editor-registries.js').EditorRegistries, ...args: unknown[]) => import('../sdk/types.js').EditorState} operation
 * @param {unknown[]} args
 */
export function dispatchOperation(deps, operation, args) {
  const before = deps.getState()
  const after = operation(before, deps.registries, ...args)

  if (statesEqual(before, after)) return

  deps.history.record(createTransaction(before, after))
  deps.applyState(after)
}

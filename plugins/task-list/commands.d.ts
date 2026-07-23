export const TASK_LIST_TYPE: 'task-list'
export const TASK_ITEM_TYPE: 'task-item'
/**
 * Converts the current selection into a task-list:
 * - selection spans multiple paragraphs: one task-item per paragraph.
 * - cursor in a single paragraph: that paragraph becomes the single item.
 * - cursor already inside a task-item: toggles back off (unwraps the item
 *   into a plain paragraph, splitting the list if the item was in the middle).
 *
 * @type {import('@baselab/plugin-sdk').CommandHandler}
 */
export const insertTaskList: any
/**
 * Flips the checked state of the task-item at `{ block, childIndex }`.
 *
 * @type {import('@baselab/plugin-sdk').CommandHandler}
 */
export const toggleTaskItem: any
/** @type {import('@baselab/plugin-sdk').CommandHandler} */
export const indentTaskItem: any
/** @type {import('@baselab/plugin-sdk').CommandHandler} */
export const outdentTaskItem: any

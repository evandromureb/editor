/**
 * Clear Formatting Plugin
 *
 * Removes all inline formatting (marks) from the current selection
 * while preserving text content and document structure.
 */

export default function definePlugin(options: {
  id: string
  name: string
  version: string
  capabilities: {
    commands: Record<string, any>
    toolbar: Array<any>
    shortcuts: Record<string, string>
    i18n: Record<string, Record<string, string>>
  }
}): any

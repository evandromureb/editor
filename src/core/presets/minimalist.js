import { DEFAULT_LOCALE } from '../i18n/constants.js'

/** @type {import('./PresetRegistry.js').EditorPreset} */
export const minimalistPreset = {
  locale: DEFAULT_LOCALE,
  theme: 'padrao',
  plugins: ['bold', 'italic'],
  toolbar: ['bold', 'italic'],
}

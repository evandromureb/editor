/**
 * @file Editor presets — registers built-in preset configurations.
 */

import { PresetRegistry, DEFAULT_PRESET } from './PresetRegistry.js'
import { corporatePreset } from './corporate.js'
import { defaultPreset } from './default.js'
import { minimalistPreset } from './minimalist.js'

PresetRegistry.register('default', defaultPreset)
PresetRegistry.register('corporate', corporatePreset)
PresetRegistry.register('minimalist', minimalistPreset)

export { PresetRegistry, DEFAULT_PRESET } from './PresetRegistry.js'
export { corporatePreset } from './corporate.js'
export { defaultPreset } from './default.js'
export { minimalistPreset } from './minimalist.js'

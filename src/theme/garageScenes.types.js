/**
 * @typedef {Object} GarageSceneGradientStop
 * @property {string} offset
 * @property {string} color
 * @property {string} opacity
 */

/**
 * @typedef {Object} GarageSceneBlurConfig
 * @property {number} native
 * @property {number} web
 */

/**
 * @typedef {Object} GarageSceneBrightnessConfig
 * @property {number} native
 * @property {number} web
 */

/**
 * @typedef {Object} GarageSceneDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {boolean} enabled
 * @property {{ uri: string }} webImage
 * @property {number | { uri: string }} [nativeImage]
 * @property {GarageSceneGradientStop[]} overlay
 * @property {GarageSceneBlurConfig} blur
 * @property {GarageSceneBrightnessConfig} brightness
 * @property {string} [accentHint]
 */

export {};

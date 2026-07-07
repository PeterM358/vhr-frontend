/**
 * @file JSDoc types for Garage Scenes.
 * @see docs/garage-scenes-architecture.md
 */

/**
 * @typedef {'premium-garage' | 'modern-service-center' | 'performance-garage' | 'night-garage' | 'mountain-adventure' | 'bike-workshop' | 'abstract-blue'} GarageSceneId
 */

/**
 * @typedef {Object} GarageSceneBlurConfig
 * @property {number} [nativeRadius]
 * @property {number} [webPx]
 * @property {number} [webBrightness]
 */

/**
 * @typedef {Object} GarageSceneAssets
 * @property {import('react-native').ImageSourcePropType} native
 * @property {import('react-native').ImageSourcePropType} web
 */

/**
 * @typedef {Object} GarageSceneDefinition
 * @property {GarageSceneId} id
 * @property {string} label
 * @property {string} [description]
 * @property {GarageSceneAssets} assets
 * @property {boolean} [isDefault]
 * @property {boolean} [isPremium]
 * @property {number} [sortOrder]
 * @property {GarageSceneBlurConfig} [blur]
 * @property {string[]} [tags]
 */

/**
 * @typedef {'soft' | 'forced'} GarageSceneOverridePriority
 */

/**
 * @typedef {Object} GarageSceneContextOverride
 * @property {GarageSceneId} sceneId
 * @property {string} reason
 * @property {GarageSceneOverridePriority} priority
 * @property {number} [registeredAt] epoch ms
 * @property {number} [ttlMs] auto-clear after duration
 */

/**
 * @typedef {Object} GarageSceneTransitionOptions
 * @property {number} [durationMs] clamped to 400–600
 * @property {import('./constants').GarageSceneEasing} [easing]
 */

/**
 * @typedef {Object} GarageSceneContextValue
 * @property {boolean} isReady
 * @property {GarageSceneId} activeSceneId
 * @property {GarageSceneId} effectiveSceneId
 * @property {GarageSceneDefinition} activeScene
 * @property {GarageSceneContextOverride | null} contextOverride
 * @property {(id: GarageSceneId) => Promise<void>} setScene
 * @property {(override: GarageSceneContextOverride | null) => void} setContextOverride
 * @property {(id: GarageSceneId, options?: GarageSceneTransitionOptions) => Promise<void>} transitionToScene
 */

export {};

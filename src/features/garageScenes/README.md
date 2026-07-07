# Garage Scenes

Feature scaffold for premium swappable dashboard backgrounds.

**Full architecture:** [`docs/garage-scenes-architecture.md`](../../docs/garage-scenes-architecture.md)

This folder is intentionally **not wired** into `HomeScreen` or `ScreenBackground` yet. Importing from here has no effect on runtime UI until the integration checklist in the doc is completed.

## Exports

- `GARAGE_SCENE_REGISTRY` / `getSceneById` / `listScenes` — scene catalog
- `GarageSceneProvider` / `useGarageScene` — context stub
- `useGarageSceneOverride` — future contextual auto-switch hook (no-op)
- `GARAGE_SCENE_STORAGE_KEY`, transition constants
- JSDoc types in `types.js`

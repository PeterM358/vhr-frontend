# Dashboard backgrounds (legacy asset folders)

Garage scene backgrounds are now defined in `src/theme/garageScenes.js` and served from
`public/backgrounds/garage-scenes/` as optimized WebP files (no JS bundle imports).

## Add a new garage scene

1. Add `<scene_id>.webp` to `public/backgrounds/garage-scenes/`
2. Register the scene in `src/theme/garageScenes.js` with matching `id` and `webImage.uri`
3. Rebuild / redeploy — no dashboard component changes

## Legacy category folders

The `cars/`, `bikes/`, `trucks/`, and `default/` subfolders here are unused by the current
garage scene system. They remain for optional future vehicle-aware theming.

# Dashboard backgrounds

Vehicle-aware, folder-driven backgrounds for client dashboard screens (`ScreenBackground` without a custom `source`).

## Folder layout

Add optimized **WebP** files under:

```
src/assets/backgrounds/
  cars/          # car-only garages → random pick
    premium_garage_day.webp
    premium_garage_night.webp
    premium_garage_ladies.webp
  bikes/         # bicycle / e-bike / motorcycle / scooter only
    bike_garage_night.webp
  trucks/        # truck / van / trailer / agri / construction only
    truck_garage_night.webp
  default/       # no vehicles registered
    premium_dark.webp
```

For **web**, mirror the same paths under `public/backgrounds/` so URLs resolve as `/backgrounds/<category>/<file>.webp`.

> Until you add WebP files, the app uses the existing default background (`background.png` native, `background-web.jpg` web).

## Image optimization targets

When preparing assets (manual copy or batch convert):

| Setting | Target |
|--------|--------|
| Format | WebP |
| Quality | 75–82 |
| Max width | ~2200 px (keep aspect ratio) |
| Filename | lowercase, underscores, `.webp` |

Example with [sharp-cli](https://www.npmjs.com/package/sharp-cli):

```bash
npx sharp-cli -i source.png -o src/assets/backgrounds/cars/premium_garage_day.webp \
  --webp '{"quality":80}' --resize 2200
cp src/assets/backgrounds/cars/premium_garage_day.webp public/backgrounds/cars/
```

## Add a new theme (no code changes)

1. Drop `my_new_scene.webp` into the right category folder (e.g. `cars/`).
2. Copy the same file to `public/backgrounds/cars/` for web.
3. Rebuild / redeploy.

`src/backgrounds/backgroundRegistry.js` uses Metro `require.context` to register every `.webp` under `src/assets/backgrounds/` at build time.

### New category folder (e.g. `motorcycles/`, `winter/`)

1. Create `src/assets/backgrounds/<category>/` and add WebP files.
2. Map vehicle types in `src/backgrounds/vehicleCategories.js` (`VEHICLE_TYPE_TO_CATEGORY`).
3. Add the category to `MIXED_GARAGE_CATEGORIES` if it should participate in mixed-garage random selection.

## Runtime behavior

- **Resolver** (`backgroundResolver.js`) inspects the user's vehicles via `vehicle_type_code`.
- **Persistence** (`@veversal/dashboard_background`): one background per local calendar day; unchanged until tomorrow or `refreshBackground()`.
- **Preload** (`preloadBackground.js`): only the active image is preloaded — never the full library.

## Architecture

```
DashboardBackgroundProvider (GarageSceneProvider)
  → fetch vehicles
  → resolve category + daily pick
  → persist + preload
ScreenBackground
  → useGarageScene + crossfade
  → render active background
```

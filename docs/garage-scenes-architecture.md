# Garage Scenes — System Architecture

Preparatory design for premium, swappable dashboard backgrounds. **No runtime wiring yet** — dashboard components and `ScreenBackground` behavior are unchanged until a dedicated integration pass.

---

## Goals

- Multiple premium background **scenes** behind the same dashboard UI
- Heavily blurred, dark blue–graded backgrounds that never hurt readability
- Smooth 400–600 ms crossfade when switching scenes
- Persist the user's chosen scene across sessions
- Future: automatic scene switching by app context (repair in progress, offer received, season, etc.)
- Add new scenes by editing the registry only — **no dashboard component changes**

---

## Current state (baseline)

| Piece | Location | Role today |
|-------|----------|------------|
| `ScreenBackground` | `src/components/ScreenBackground.js` | Native: `ImageBackground` + `blurRadius` + SVG gradient overlay |
| `ScreenBackground.web` | `src/components/ScreenBackground.web.js` | Web: `<img>` with CSS `blur(2px) brightness(0.68)` + linear gradient |
| Default asset | `src/constants/images.js` → `BACKGROUNDS.default` | Native bundled PNG |
| Web asset | `src/constants/images.web.js` + `WEB_BACKGROUND_URL` | `/public/backgrounds/background-web.jpg` |
| Dashboard usage | `src/screens/HomeScreen.js` | `<ScreenBackground safeArea={false}>` wraps nav + scroll content |
| Theme | `src/styles/colors.js`, `ThemeProvider` | UI colors only — not tied to background scenes |

Scenes will **extend** this stack, not replace dashboard layout or card components.

---

## Component layering

Bottom → top (all layers are `pointerEvents="none"` except the UI wrapper):

```
┌─────────────────────────────────────────────┐
│ 4. UI layer (SafeAreaView / ScrollView /    │
│    dashboard cards, nav, FAB)               │
├─────────────────────────────────────────────┤
│ 3. Readability gradient (existing           │
│    DEFAULT_STOPS — vertical black fade)     │
├─────────────────────────────────────────────┤
│ 2. Color grade (uniform dark blue tint)     │
│    rgba overlay — shared across all scenes  │
├─────────────────────────────────────────────┤
│ 1. Blur (native: blurRadius / web: CSS      │
│    filter + scale(1.04) edge bleed)         │
├─────────────────────────────────────────────┤
│ 0. Scene image(s) — crossfade A/B slots     │
│    during transitions                       │
└─────────────────────────────────────────────┘
```

**Invariant:** Dashboard components render only in layer 4. They never import scene assets or blur settings.

**Integration seam (future):** Either enhance `ScreenBackground` to accept an optional `scene` prop, or introduce `GarageSceneBackground` as a drop-in wrapper with the same children API. HomeScreen changes from:

```jsx
<ScreenBackground safeArea={false}>
```

to:

```jsx
<GarageSceneBackground safeArea={false}>
```

No changes inside `DashboardHeroCard`, `DashboardActionGrid`, etc.

---

## Module layout

```
src/features/garageScenes/
├── README.md                 # Quick index → this doc
├── index.js                  # Public exports
├── constants.js              # Storage key, transition defaults, color grade
├── types.js                  # JSDoc schema (project is JS-only)
├── sceneRegistry.js          # id → metadata + asset refs (placeholders)
├── GarageSceneContext.js     # Context + stub provider (not mounted)
├── useGarageSceneOverride.js # Future contextual override hook signature
└── persistence.js            # AsyncStorage read/write helpers (stub)
```

---

## Scene definition schema

Each scene is a plain object in `sceneRegistry.js`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `GarageSceneId` | yes | Stable slug, e.g. `'premium-garage'` |
| `label` | `string` | yes | Display name in settings picker |
| `description` | `string` | no | Short subtitle for picker / onboarding |
| `assets` | `{ native, web }` | yes | `native`: `require()` ref; `web`: `{ uri }` or public path |
| `isDefault` | `boolean` | no | Exactly one scene should be default |
| `isPremium` | `boolean` | no | Gate behind subscription later |
| `sortOrder` | `number` | no | Picker ordering |
| `blur` | `{ nativeRadius, webPx, webBrightness }` | no | Per-scene tuning; defaults from constants |
| `tags` | `string[]` | no | e.g. `['garage', 'night']` for future auto-matching |

Shared color grade and gradient stops live in `constants.js` so every scene gets identical readability treatment.

### Initial scenes (registry placeholders)

| ID | Label |
|----|-------|
| `premium-garage` | Premium Garage *(default)* |
| `modern-service-center` | Modern Service Center |
| `performance-garage` | Performance Garage |
| `night-garage` | Night Garage |
| `mountain-adventure` | Mountain Adventure |
| `bike-workshop` | Bike Workshop |
| `abstract-blue` | Abstract Blue |

Asset refs point at the **current** default background until real scene art is bundled.

---

## Context & provider API

`GarageSceneProvider` (stub — not mounted in app root yet) exposes:

| Value / method | Purpose |
|----------------|---------|
| `activeSceneId` | User's persisted selection |
| `effectiveSceneId` | What the background should render (see priority below) |
| `activeScene` | Full registry entry for `effectiveSceneId` |
| `setScene(id)` | User picks a scene → persist + optional transition |
| `contextOverride` | `{ sceneId, reason, priority } \| null` from auto-switching |
| `setContextOverride(override \| null)` | Called by context hooks |
| `isReady` | Persistence hydrated |
| `transitionToScene(id, options?)` | Imperative crossfade (future render layer) |

Default context values are safe no-ops so importing hooks before wiring does nothing.

---

## Context override priority (future)

When automatic switching ships, resolve `effectiveSceneId` in this order:

1. **Forced contextual override** — e.g. celebratory scene after offer accepted (`priority: 'forced'`, short TTL)
2. **Soft contextual override** — e.g. repair in progress (`priority: 'soft'`) unless user has **pinned** a scene
3. **User persisted selection** — `@veversal/garage_scene_id` in AsyncStorage
4. **Registry default** — scene with `isDefault: true` (`premium-garage`)

```
effectiveSceneId =
  forcedOverride?.sceneId
  ?? (userPinned ? persistedSceneId : softOverride?.sceneId)
  ?? persistedSceneId
  ?? DEFAULT_SCENE_ID
```

`useGarageSceneOverride({ sceneId, reason, priority, ttlMs })` registers/clears soft or forced overrides. Multiple hooks compose: highest priority wins; ties broken by most recent registration.

User **pin** (future setting): `"Always use my selected scene"` disables soft overrides but not forced celebratory moments (product decision — document now, implement later).

---

## Transition API

Crossfade between two scene image slots (A/B) over the blur + grade + gradient stack:

```js
transitionToScene(nextSceneId, {
  durationMs: 500,        // clamp 400–600
  easing: 'ease-in-out',  // native: Animated / Reanimated; web: CSS transition
})
```

**Behavior:**

1. Load `nextScene` asset (preload if not cached)
2. Mount incoming image in inactive slot, opacity 0 → 1
3. Fade outgoing slot 1 → 0
4. Swap active slot pointer; unmount outgoing after transition end
5. UI layer (children) does **not** remount — only background slots animate

Constants: `GARAGE_SCENE_TRANSITION_MIN_MS = 400`, `GARAGE_SCENE_TRANSITION_MAX_MS = 600`, default `500`.

---

## Persistence

| Key | Value |
|-----|-------|
| `@veversal/garage_scene_id` | Scene slug string, e.g. `'night-garage'` |

- Read once on provider mount; validate against registry (unknown id → default)
- Write on `setScene` after validation
- No sync across devices in v1 (local only)

Helpers in `persistence.js`: `loadPersistedSceneId()`, `persistSceneId(id)`.

Optional later: add `GARAGE_SCENE_PINNED: '@veversal/garage_scene_pinned'` boolean.

---

## How to add a new scene

1. Add art assets:
   - Native: `src/assets/backgrounds/scenes/<id>.png` (or `.jpg`)
   - Web: `public/backgrounds/scenes/<id>.jpg` (optimize ~150–200 KB)
2. Open `src/features/garageScenes/sceneRegistry.js`
3. Add entry with unique `id`, `label`, `assets.native` / `assets.web`, `sortOrder`
4. No dashboard edits required
5. (Integration phase) Scene appears in settings picker via `listScenes()` export
6. Verify blur + color grade + gradient on iOS, Android, and web

---

## Performance notes

| Concern | Native | Web |
|---------|--------|-----|
| Blur | `ImageBackground` `blurRadius` (current: 2); increase per scene in registry | CSS `filter: blur(Npx) brightness(X)` on scaled `<img>` |
| First paint | Bundled `require()` is instant | Serve from `/public` for fast first paint (same pattern as `background-web.jpg`) |
| Transitions | Prefer `react-native-reanimated` opacity on two absolute `Image` views to avoid re-blurring every frame | Dual `<img>` layers + `opacity` CSS transition |
| Memory | Preload only current + next scene; release inactive slot after fade | Browser cache + `<link rel="preload">` optional for default scene |
| Re-renders | Context splits: background subscribes to scene; dashboard children use separate context or no scene context | Same — avoid putting scene id in HomeScreen state |
| Bundle size | Each native asset adds to app binary — prefer compressed JPEG for large scenes | Static export copies `public/` as-is |

**Do not** blur the UI layer. **Do not** re-mount `ScrollView` on scene change.

---

## Integration checklist (future — not in this PR)

- [ ] Mount `GarageSceneProvider` above client dashboard navigator (e.g. in `HomeDrawer` or app root for client role)
- [ ] Implement `GarageSceneBackground` (or extend `ScreenBackground`) with A/B crossfade
- [ ] Wire `HomeScreen` wrapper only — zero dashboard component edits
- [ ] Settings UI for scene picker + optional pin toggle
- [ ] Implement `useGarageSceneOverride` body + call sites (repair status, offers, season)
- [ ] Premium gating via `isPremium` + subscription flag
- [ ] Asset preload on app launch for default + last-used scene

---

## Related files

- Scaffold: [`src/features/garageScenes/`](../src/features/garageScenes/)
- Current background: [`src/components/ScreenBackground.js`](../src/components/ScreenBackground.js)
- Visual polish notes: [`docs/frontend-polish-notes.md`](./frontend-polish-notes.md)

# Frontend Polish Notes

A running log of the visual / theme refresh applied to `vhr-frontend`. No
business logic, API calls, navigation, Firebase, WebSocket, or backend
integrations were modified — every change is presentational.

---

## Where the global pieces live

### Background

- Reusable component: [`src/components/ScreenBackground.js`](../src/components/ScreenBackground.js)
- Default image: `BACKGROUNDS.default` from
  [`src/constants/images.js`](../src/constants/images.js) (currently
  `src/assets/backgrounds/background.png`)
- Implementation: `ImageBackground` (`blurRadius={2}`, `resizeMode="cover"`)
  + a 3-stop dark vertical gradient overlay rendered with `react-native-svg`
  (no native module rebuild required).
- Usage: wrap a screen's content with `<ScreenBackground>`. Pass
  `safeArea={false}` when a navigation header is rendering its own safe-area
  inset.

### Theme colors

The single source of truth for brand hues is **`src/styles/colors.js`**. The Paper
`AppTheme` (`src/styles/theme.js`) imports from it.

**`src/constants/colors.js`** exposes a grouped **`COLORS`** object plus flat
exports (`PRIMARY`, `CARD_FLOATING`, …) for list screens and UI primitives:

| Token / key       | Role |
|-------------------|------|
| `PRIMARY`         | Primary accent (`#2563EB`, synced from styles) |
| `PRIMARY_DARK`    | Deep accent |
| `PRIMARY_LIGHT`   | Soft accent |
| `CARD_FLOATING`   | Soft grey floating cards on the dark background (`rgba(245,247,250,0.94)`) |
| `CARD_DARK`       | Glass/dark hero panels (`rgba(5,15,30,0.72)`) |
| `TEXT_DARK`       | Primary text on light cards |
| `TEXT_MUTED`      | Secondary text |
| `BORDER_SOFT`     | Light border on dark glass |

`CARD_LIGHT` remains exported as an alias of `CARD_FLOATING` for older imports.

---

## Reusable UI components

Located under `src/components/ui/`:

- **`FloatingCard.js`** — **default global list/detail card.** Soft grey,
  rounded (20), shadow/elevation per spec. Props: `children`, `style`,
  optional `onPress`, optional **`accent`** — **`accent={true}`** adds the 4 px
  left border in `COLORS.PRIMARY`; **default is neutral** (no stripe). Repair /
  request rows should omit `accent` unless the row is explicitly highlighted.
- **`AppCard.js`** — thin wrapper: `variant="light"` delegates to
  `FloatingCard`; `variant="dark"` keeps a glass hero panel (`CARD_DARK`) for
  contrast (e.g. Authorized Clients hero).
- **`StatusBadge.js`** — pill-shaped repair status chip.
- **`EmptyStateCard.js`** — empty-state message built on **`FloatingCard`**
  (no full-screen white sheet).

---

## Global layout rules (current target)

- Main/list screens: **`ScreenBackground`** visible; **no** full white page
  wrappers (`backgroundColor: 'transparent'` on stack content containers).
- Content sits in **floating cards** (`FloatingCard`), not large Paper sheets.
- **Neutral cards by default:** `FloatingCard` is soft grey only — **no** blue
  left stripe unless `accent={true}` (use sparingly for **selected /
  highlighted** rows only, e.g. unread notifications or unseen offers).
- **Blue elsewhere:** primary actions (buttons), **active tab pills**, AppBar /
  headers — not routine repair/request list rows.

### Shop “See all” → Repairs

- Dashboard **See all** uses **`DrawerActions.jumpTo('RepairsList')`**, same as
  the drawer **Repairs** item targets the **drawer** `RepairsList` screen (not
  the duplicate root-stack route). Stack **back** behavior stays unchanged:
  `RepairsList` does not hide the back button globally when shown inside a
  stack context.

---

## Updated screens (recent passes)

| Area | File(s) |
|------|---------|
| Client Offers (tabs + lists) | `src/screens/OffersScreen.js`, `src/components/client/ClientPromotions.js`, `src/components/client/ClientRepairOffers.js` |
| Client Repairs stack screen | `src/components/client/ClientRepairsList.js` |
| Shop home open requests | `src/screens/ShopHomeScreen.js` |
| Client home hero position | `src/screens/HomeScreen.js` |
| Shop repairs list | `src/components/shop/RepairsList.js` |
| Shop promotions | `src/components/shop/ShopPromotions.js` |
| Notifications | `src/components/shop/NotificationsList.js`, `src/components/client/NotificationsList.js` |
| Authorized Clients | `src/components/shop/AuthorizedClients.js` |

### Highlights

- **Offers:** Removed opaque white flex backgrounds from tab content; promotions
  and repair-offer lists use **`FloatingCard`** on **`ScreenBackground`**.
- **ShopHomeScreen:** Open repair rows use **neutral** `FloatingCard` (no blue
  stripe). **See all** dispatches **`DrawerActions.jumpTo('RepairsList')`** — same
  drawer destination as the menu **Repairs** item (not the root-stack duplicate).
- **Shop repairs list:** Matches dashboard cards — neutral floating rows; tab
  pills stay blue when active.
- **Client Repairs:** Full **`ScreenBackground`**, pill tabs, **`FloatingCard`**
  rows + **`EmptyStateCard`** for empty state.
- **HomeScreen:** Hero block moved **higher** (`flex-start` + responsive
  `paddingTop` from ~22% window height, clamped) to leave lower space for future
  promos/ads.
- **Authorized Clients:** Transparent page container; list rows use
  **`FloatingCard`**; hero stays **`AppCard` `variant="dark"`** without accent bar.

---

## Notes for future work

- **Screen-specific backgrounds.** Still using `BACKGROUNDS.default` everywhere;
  swap per screen via `src/constants/images.js` when ready (`repairDetail`,
  `vehicleDetail`, `shopDetail`, `clientDetail`).
- **Real vehicle images.** Placeholder thumbnails (e.g. vehicles list, nested
  authorized-client vehicles) → replace with real assets when available.
- **Theme selector** (blue / pink / purple / green / orange): drive both
  `src/styles/colors.js` and `src/constants/colors.js` from a persisted palette key.

---

## Out of scope (intentionally not touched)

- Backend, API modules, auth, Firebase, WebSocket, route names, permissions.

The visual refresh is purely additive on the presentation layer.

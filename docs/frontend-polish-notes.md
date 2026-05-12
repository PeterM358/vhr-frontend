# Frontend Polish Notes

Roadmap reference: see backend product roadmap at `/Users/client/vhr/docs/project-vision-and-roadmap.md` for long-term scope and phase priorities.

A running log of the visual / theme refresh applied to `vhr-frontend`, plus
narrow feature notes where listed (e.g. **Service center map filtering**).
Most edits remain presentational; map filtering intentionally adds discovery API
integration without changing navigation structure.

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
- **Service details naming polish:** `ShopDetail` UI now uses **Service Center**
  wording (header **Service Details**, cleaner section titles, no raw "Shop Name / Address / Phone" labels),
  surfaces `service_center_type` where available, and keeps authorization API logic unchanged.
- **Service Center profile redesign:** `ShopProfileScreen` now follows an onboarding/business profile flow with
  grouped sections (Basic information, Contact, Vehicle types, Services, Location, Working hours, Social links,
  SEO/public identity, Photos) while keeping existing save endpoints/permissions.
- **Vehicle Detail redesign:** `VehicleDetailScreen` now acts as a vehicle ownership control center (hero, grouped info,
  unified **Reminders & obligations** (legal + service in one backend-driven list), recent repairs, authorized service-center context, document/photo placeholders,
  and quick actions) instead of a plain CRUD-style detail view.
- **Vehicle catalog create flow:** `CreateVehicleScreen` uses backend **`/api/vehicles/catalog/*`** for a progressive
  **vehicle type → brand → model → generation → engine → trim** flow, plus a collapsed **e-bike system** /
  **trailer type** catalog block. **Manual fallback** (legacy make/model pickers and optional generation/engine-code text)
  remains via *“Can’t find your vehicle? Enter details manually.”* Choice-backed optional fields (fuel, transmission,
  bike/trailer enums, etc.) use **`GET /api/vehicles/choices/`** in `VehicleCollapsibleFormSections`. The vehicle hero
  prefers **`catalog_*_name`** fields, then **`make_name` / `model_name`**.
- **Repair/request privacy display rules:** owner views keep full plate + VIN; service-center views for open requests hide
  the plate with **“Plate hidden until booking”** while still showing make/model/type, VIN (if available), kilometers, and
  request symptoms/description/media for quoting and parts matching. Once booked/authorized (or in ongoing/done flows),
  service-center views show full plate again.
- **Context-aware vehicle optional sections:** create/edit forms now render optional groups dynamically via
  `getRelevantVehicleFieldGroups(vehicleTypeCode, currentValues)`. Irrelevant bike/trailer/EV/fleet groups are hidden by
  vehicle type unless already populated or explicitly relevant (e.g. EV/hybrid signals, commercial fleet data). Trailer
  technical fields stay available through a **Powered equipment** toggle with helper copy for refrigeration/generator/
  hydraulic use cases.
- **Vehicle edit split to dedicated screen:** technical optional fields are edited in `EditVehicleDetailsScreen` (**Technical details** in the stack header). Kilometers are updated separately on `VehicleDetailScreen` (modal + PATCH `kilometers` only). Vehicle detail stays summary-first.
- **VehicleDetail hero (non-navigating):** the dark hero card is **not** a press target for full-screen edit. Owners get **one** kilometer entry point: the hero **Update kilometers** button (opens the km modal; PATCH `kilometers` only; detail refetches after save). **Edit technical details** navigates to `EditVehicleDetailsScreen`. No duplicate inline **Update** next to the km line.
- **VehicleDetail summary tiles:** **Vehicle info** does **not** repeat odometer (kilometers appear only in the hero). Owners change kilometers only via the hero **Update kilometers** action. **VIN** stays display-only (no tap, no chevron); **Completed** / **Active** / **Last completed** behaviors unchanged. **Lifetime summary** money tiles stay non-clickable.
- **VehicleDetail hero type line:** the subtitle under make/model shows **`vehicle_type_name`** only when it is meaningful; the generic fallback label **Vehicle** is hidden so the hero is not repetitive.
- **Duplicate vehicle-details card removed:** the extra **More vehicle details** card is removed from `VehicleDetailScreen`; optional read-only sections + the hero actions remain the entry points.
- **Normal edit locks core identity and VIN:** `EditVehicleDetailsScreen` shows plate, vehicle type, brand/model, year, and **VIN** in the read-only identity card. VIN is **not** editable in normal edit (future correction flow). Save payloads exclude identity, VIN, and kilometers; only technical optional fields and relevant e-bike/trailer catalog fields are updated.
- **Reminders edited per row:** tapping a row under **Reminders & obligations** opens a reminder modal and PATCHes ` /api/vehicles/<id>/reminders/<reminder_id>/ `; detail refetches after save. This replaces routing reminder setup through the technical edit screen.
- **Obligations vs service reminders:** legal obligations (Insurance, Technical inspection, Vignette, Road tax) are edited without repair/job creation. In modal, obligation rows focus on date + notify-days + optional notes, while service reminders (e.g. oil) also expose km-based fields.
- **Reminder date input format:** reminder edit uses **`DD.MM.YYYY`** in UI and validates before save; payloads convert to backend ISO **`YYYY-MM-DD`**.
- **VehicleDetail refresh reliability:** after kilometers save, the screen awaits `updateVehicle` then refetches detail before closing the modal; returning from **Technical details** refetches via `useFocusEffect`.
- **Auto-check UX placeholder:** obligation rows expose a lightweight **Try auto-check** action that currently shows a non-blocking placeholder message; external plate/VIN checks are intentionally deferred.
- **Maintenance specs vs reminders:** optional group **Maintenance specifications** (renamed from “Maintenance details”) stays **collapsed by default** with helper copy: *These are vehicle specifications, not service reminders.*
- **Sticky edit save actions:** `EditVehicleDetailsScreen` now uses a persistent bottom sticky action bar (Save changes +
  Cancel) for long-form mobile UX, aligned with request-intake action styling and safe-area behavior.
- **Mileage evidence read-only in normal edit:** `EditVehicleDetailsScreen` no longer exposes editable `odometer_verified`
  or `odometer_source`; normal edit now shows a read-only **Mileage evidence** confidence card and excludes those fields
  from the update payload.
- **Correction flow direction:** wrong plate/model/year identity changes are deferred to a future dedicated correction flow
  or support-assisted process rather than standard self-service edit mode.
- **Backend metadata-first optional groups:** create/edit now try **`GET /api/vehicles/field-groups/`** to drive relevance,
  with local fallback logic when metadata is unavailable.
- **Catalog relevance polish:** create/edit hide e-bike/trailer catalog pickers for car/van/truck contexts; e-bike catalog
  appears only for bicycle/e-bike contexts or existing e-bike data, and trailer catalog only for trailer contexts or
  existing trailer data.
- **Mileage evidence wording:** UI label changed from **Odometer trust** to **Mileage evidence** with helper copy:
  *Higher confidence comes from receipts, service-center records, inspections, and before/after media.*
- **Repair request intake upgrade:** `CreateRepairScreen` now supports app-first intake fields (`symptoms`,
  `request_targeting_mode`, `preferred_service_centers`, `requires_guarantee`, `preferred_radius_km`) with
  category/type flow and a clean media placeholder card while preserving existing create/save behavior.
- **RepairDetailScreen polish:** now displays intake-aware request details (`symptoms`, targeting-mode labels,
  guarantee/radius, selected service centers) and a media placeholder/list section, while preserving existing
  parts/offers/chat logic and actions.
- **RepairDetail cleanup:** duplicate repair summary content is removed from the old "Details & Parts" block;
  request targeting copy is clarified, parts are isolated as their own section, and offers/chat behaviors remain unchanged.
- **Offer presentation refresh:** `RepairDetailScreen` offer cards are redesigned into customer-facing quote cards with clear
  booking state, cleaner actions, and no raw debug labels.
- **Offer flow polish:** `CreateOrUpdateOfferScreen` now uses clearer proposal hierarchy and helper copy; parts selection
  wording is customer-facing (`Search parts catalog`, `No parts selected yet`, `Add custom part`).
- **Repair chat UX cleanup:** chat action is now inside offer cards, the standalone chat card is removed, and repair
  conversations are contextual to a selected offer/service center.
- **Offer availability + call UX:** offers now surface `available_from`, `estimated_duration_minutes`,
  `availability_note`, and `phone_call_allowed`; cards show availability context and a customer convenience **Call**
  action when a phone number is available.
- **Future attribution note:** call click tracking/attribution is intentionally deferred; direct calls can still coexist
  with platform value via discovery, trust, and subscription workflows.
- **International contact UX:** service-center profile now supports country prefix + national number + preferred contact method,
  while preserving legacy `phone` compatibility. Service/offer call actions prefer normalized `display_phone` / `phone_e164`.
- **Future-ready contact roadmap:** UI includes TODO-facing guidance for SMS verification, phone login, business verification,
  and Viber/WhatsApp/Telegram deep-link contact flows (not implemented in this phase).
- **Login method clarity:** `LoginScreen` now includes an explicit login method selector (Email / Phone) instead of a single vague identifier field.
- **Phone login input model:** phone login now uses country prefix + national phone number (combined before existing auth API call),
  with helper guidance for account-linked phone usage.
- **Auth roadmap:** SMS/OTP and 2FA remain future scope; current flow stays password-based with existing backend auth endpoints.
- **Guarantee UX:** `ShopProfileScreen` replaces the old Yes/No guarantee picker with a clearer pill-toggle section
  (`Offers guarantee` / `No guarantee`) while keeping the same `offers_guarantee` backend field mapping.
- **Ongoing repair workflow polish:** `RepairDetailScreen` now presents a clearer workshop-style `Repair management`
  section (manage parts, shop notes, final kilometers, save progress action, and finalization placeholder).
- **Repair management terminology:** generic labels are replaced with workshop wording (`Save repair progress`,
  `Finalize repair`, `Manage parts`) and ongoing/completed service state chips.
- **Invoice placeholder:** a muted `Invoice generation coming later` row is shown in repair management for future rollout.
- **Workshop-management direction:** `SelectRepairPartsScreen` copy now reflects repair operations (`Search parts catalog`,
  `Selected repair parts`, `Add custom part`, `Save selected parts`) with invoice/history helper context.
- **Final kilometers persistence:** `RepairDetailScreen` save progress now submits `final_kilometers` explicitly (numeric/null-safe)
  together with shop notes, then refreshes repair detail state so saved values re-render immediately.
- **Finalize flow:** with existing backend `status='done'` support, `Finalize repair` is enabled for ongoing repairs and uses
  the same update API after saving progress.
- **Targeting noise reduction:** shop view no longer renders the full targeting card by default, and client targeting details
  are shown only when non-default/selected-center context adds value.
- **Offers → Activity direction:** client `Offers` surface is now presented as `Activity` (Promotions + Activity tabs) to
  reflect broader repair lifecycle updates, not only raw offers.
- **Lifecycle-aware activity statuses:** repair activity cards now use contextual labels (`New offer`, `Repair booked`,
  `Vehicle in service`, `Repair completed`, `Repair canceled`) with themed status pills.
- **Chat scope remains contextual:** activity feed intentionally excludes chat threads; chats stay inside repair/offer context.
- **Activity lifecycle cards:** repair activity cards now use lifecycle-aware titles/descriptions instead of repetitive
  generic updates (`Offer received`, `Repair booked`, `Vehicle in service`, `Repair completed`, `Repair canceled`).
- **Lifecycle status chips:** activity cards now surface explicit state chips (`NEW OFFER`, `BOOKED`, `IN SERVICE`,
  `DONE`, `CANCELED`) with consistent visual semantics for completed/in-service states.
- **Source-of-truth lifecycle logic:** activity cards now prefer linked `repair.status` when available (done/ongoing/open/canceled)
  and only fall back to offer-booked flags when repair status is missing.
- **Repair financial summary:** `RepairDetailScreen` now exposes invoice-ready repair financial fields (`labor_price`,
  `parts_price`, `total_price`, `currency`, `payment_status`, `warranty_months`) with shop edit support and read-only
  display for completed/client views.
- **Invoice-ready note:** financial summary UI is intentionally invoice-ready but does not represent official invoice/tax
  documents yet; invoice generation remains a future phase.
- **Estimate-first offer UX:** `CreateOrUpdateOfferScreen` now frames offer creation as a **Price estimate** flow
  (repair notes, estimated pricing, availability) while keeping existing backend/API payload contracts unchanged.
- **Estimated parts terminology:** offer parts flow now uses customer-facing wording (`Estimated parts`,
  `Manage estimated parts`, `No estimated parts selected yet`, `Save estimated parts`) instead of raw internal labels.
- **Future scope intentionally deferred:** final pricing reconciliation, official invoice generation, inventory/warehouse,
  supplier imports/OCR, margins, and supplier integrations remain future phases (TODO comments only in UI).
- **Completed repair as service history:** when `repair.status === 'done'`, `RepairDetailScreen` swaps workshop controls for a **Completed service record** summary (read-only notes, parts, labor/total/warranty/payment) with helper copy that the job is permanent vehicle history; offers and proactive offer actions are hidden.
- **Vehicle service history list:** `VehicleDetailScreen` now separates **Active & in progress** repairs from **Service history** (`done`), with richer completed rows (badge, kilometers, optional total when the API exposes it).
- **Backend `completed_at`:** backend sets and exposes **`completed_at`** when a repair is finished (`status → done`); it is the **primary service-record date** for permanent history UI. Completed cards and summaries should prefer **`completed_at`** when present (fallbacks like `updated_at` or `created_at` remain optional if the timestamp is absent on older rows).
- **Repair parts confirm return:** `SelectRepairPartsScreen` no longer resets the stack via `Home`; **Confirm selection** uses `navigation.navigate(..., { merge: true })` with **`addedParts`** and honors **`returnTo`** (`RepairDetail`, `CreateRepair`, `ClientLogRepair`, `RepairChat`). Empty selection shows **`No parts selected yet.`** The header **Back** control returns without merging, so unchanged selections on the caller are preserved until confirm.
- **Offer estimated parts return:** `SelectOfferPartsScreen` confirm shows the same empty alert when appropriate; **`repairId`** is carried through **`SelectOfferParts` → `CreateOrUpdateOffer`** so merged params keep the repair linkage alongside **`selectedOfferParts`**.
- **RepairDetail hero (no duplicated repair title):** hero primary line is **vehicle name** with a muted **Reference #id**, **StatusBadge** top-right, then **service type** (if any) and **request vs final kilometers**—no **`Repair #id`** as the main headline.
- **Open service request plate privacy:** in the hero, **license plate** is shown in full to the **vehicle owner / client** and to **service centers assigned on the repair** (`shop_profile`) or with a **booked offer** on that request. Other shops browsing an **open** request see **“Plate hidden until booking”**; **make/model** stay visible. Ongoing/done work for the booked shop follows the same authorized-shop rule.
- **RepairDetail column width:** list content uses a single **`paddingHorizontal: 16`** gutter; redundant per-card **`marginHorizontal`** was removed so **FloatingCard** / outlined cards align with **ScreenBackground**’s constrained column on web.
- **Offer card actions:** the offer actions row aligns to the top with **`flexWrap`** so multiple buttons wrap cleanly on narrow screens instead of overflowing.
- **Final service type in repair management:** `RepairDetailScreen` ongoing shop view now exposes a **Final service type** selector (prefers `final_repair_type`, falls back to requested `repair_type`) and sends `final_repair_type` on save/finalize with helper context for service history, reminders, and statistics.
- **Service record type fallback:** completed repair/service history surfaces now prefer `final_repair_type_name`, then `effective_repair_type_name`, then `repair_type_name` (fallback: `Not specified`) across `RepairDetailScreen` and `VehicleDetailScreen`.
- **Intake quality guardrail:** `CreateRepairScreen` now requires at least one written signal (`description` or `symptoms`) before submit; user-facing guidance says: `Describe the problem or add photos/videos so service centers can understand the request.`
- **Service type optional for clients:** intake label is now **`Service type (optional)`** with helper copy `Not sure? Describe the problem and we’ll help classify it.`; missing type is allowed and marked for later classification.
- **Media intake (active):** clients can attach photos/videos during repair request intake; uploads are sent after repair creation via `/api/repairs/repair/<id>/media/` using `file` + `media_type` (+ optional `description`).
- **Classification path:** when type is missing, requests remain creatable and are queued for classification; mechanic confirmation (and future AI suggestions) later converge to a trusted `final_repair_type` for history/statistics.
- **VehicleDetail lifetime summary:** `VehicleDetailScreen` prefers backend `vehicle.lifetime_summary` (`*_minor` money fields + counts/`last_completed_at`) with local fallback when absent. **Vehicle info** shows a compact grid: VIN (read-only), **Completed** (count + jump to service history), Active, Last completed (odometer stays in the hero only). **Lifetime summary** shows money only: Total spent, Labor, Parts — repair counts and last-completed date are not repeated there.
- **VehicleDetail collapsible sections:** non-critical sections are collapsible (**Reminders & obligations** `remindersObligations`, service history, authorized centers, documents, quick actions) to reduce vertical length while keeping hero, vehicle summary, and active repairs visible.
- **Reminders & obligations (unified):** one collapsible card replaces separate “service reminders” and “obligations” blocks. Rows are fixed order: Insurance, Technical inspection, Road tax / annual fees, Vignette, Oil service, Tire change, Battery check; **bicycle / e-bike / motorcycle** types also show **Suspension service**. Status comes from API `ui_status` / `ui_status_label` (pending setup, due soon, overdue, active until due, completed, estimated copy when only `predicted_due_date` exists). Due lines may include `due_date`, `due_kilometers`, `due_operating_hours`, and estimated calendar text from `predicted_due_date` + `prediction_confidence`. When no schedule is set, the row shows **`cta_label`** (e.g. **Add date · Set reminder**); owners **tap the row** to open the reminder editor modal (PATCH reminder), not technical vehicle edit. **`mileage_prediction_hints.prompt_message`** (e.g. *Update kilometers to improve reminders.*) appears above the list when the backend has sparse odometer history.
- **Add activity wording:** vehicle actions now use **Add activity** (request repair / add service record / upload receipt-document placeholder), preserving existing create flow without new backend dependencies.
- **Service history clarity:** completed records emphasize service-history fields (final/effective type, completion date, service center, final kilometers, and total when available), distinct from active repair requests.
- **Repair intake media UX (phase 1):** `CreateRepairScreen` now allows selecting **photos/videos** before submit, shows local preview cards, and supports removing items pre-submit.
- **Post-create media upload flow:** after successful repair creation, selected media uploads to `/api/repairs/repair/<id>/media/` (`image`/`video` types). If some uploads fail, the app keeps the created repair and shows: `Repair was created, but some media failed to upload.`
- **No heavy media pipeline in this phase:** no upload-queue complexity, no AI/OCR logic, and no document/invoice upload on this intake screen yet.
- **Repair request intake scope tightening:** `CreateRepairScreen` normal request flow intentionally hides parts management (`Manage Parts`, selected-parts list, empty-parts state removed) and keeps intake focused on symptoms, description, media, routing preferences, and kilometers.
- **Mobile-first intake layout:** `CreateRepairScreen` now follows a simpler section order (**Problem → Optional service type → Preferences → Vehicle details**) with a sticky bottom **Send request** action bar and no duplicated top/header save action.
- **Client status simplification:** normal client request intake no longer exposes the done/open selector; requests default to backend-facing `open` internally while keeping existing submit/upload behavior.
- **Readable targeting options:** request-routing choices are now full-width tap targets (`Nearby qualified service centers`, `Selected service centers`, `Verified service centers only`, `Ask platform to help choose`) instead of cramped segmented buttons.
- **Simplified request UX polish:** `CreateRepairScreen` reduces visual complexity with a vehicle-first context, clearer preference emphasis, and optional sections hidden by default where possible.
- **Vehicle-first request context:** when a vehicle is already selected, intake now shows a compact vehicle summary card (plate, name, kilometers) with a lightweight `Change vehicle` action instead of prioritizing a large vehicle picker.
- **Guarantee visibility improvement:** guarantee preference is now a dedicated, prominent card (`Request guaranteed service centers`) with explicit helper copy and clear enabled/disabled state feedback.
- **Optional service type collapsed:** service category/type controls are minimized by default under `Add service type (optional)` and expand only when needed.
- **VehicleDetail-origin request simplification:** when `CreateRepairScreen` is opened from `VehicleDetail` with a selected vehicle, the separate **Vehicle details** card is hidden to reduce duplication; the top vehicle summary remains primary context.
- **Kilometers in request intake:** kilometers stay optional for sending a request (API sends a non-null integer; empty defaults to `0` on the repair, and when the vehicle already has an odometer the client pre-fills from `vehicle.kilometers` so shops see the same reading as the summary card). The field is always visible under the vehicle card on VehicleDetail-origin flows (no expand/collapse). Higher readings also roll up to `vehicle.kilometers` on the backend when allowed.
- **Open-request client editing:** `RepairDetailScreen` now shows `Edit request` only for client owners while request status is `open`; booked/ongoing/done requests do not expose client edit controls, and shops never see this action.
- **Edit mode reuse:** `CreateRepairScreen` supports `mode='edit_request'` with prefilled intake fields (`symptoms`, `description`, service type, targeting, guarantee, radius, kilometers), sticky `Save changes` action, and vehicle locked from editing.
- **Edit save behavior:** open-request edits use PATCH on the existing repair (status unchanged) and navigate back to `RepairDetail`; no backend route/model changes required.
- **Edit media behavior:** clients can attach additional media during **CreateRepair** edit-request mode; existing media stays read-only there (manage attachments on **RepairDetail** while the request is open).
- **RepairDetail open-request media:** client owners see **Add photo or video** (library picker → `POST …/repair/<id>/media/`) and a **remove** control on each item (confirmed with *Remove this media from the request?* → `DELETE …/repair/<id>/media/<mediaId>/`). Shops never get add/remove. Once a request is no longer `open` (booked / ongoing / done), the **Photos & videos** section is **read-only** for the client on this screen (service record preserved).
- **PATCH compatibility fallback:** if PATCH rejects extended edit payload, frontend retries a minimal payload subset to preserve edit success without backend changes.
- **Terminology distinction (client-facing):** intake wording is now **service-request** language (`Request Service`, `Request service`) while backend routes/models/screens remain repair-based internally.
- **RepairDetail lifecycle wording (by `repair.status`):** `RepairDetailScreen` adapts labels only (no backend changes): **`open`** → header **Service Request**, hero **`Request #id`**, shops get a light **Request review** section (parts/financial summary hidden; not framed as repair management); **`ongoing`** → header **Repair**, hero **`Repair #id`**, main shop section **Repair management**; **`done`** → header **Service record**, hero **`Reference #id`**, main section **Completed service record**. **Offers** / primary shop CTA remain **Send offer**; media stays visible for open requests with request-oriented helper copy.
- **Offer availability UX (`CreateOrUpdateOfferScreen`):** **Bring vehicle** and **Pickup / ready** are **tappable rows** showing **`DD.MM.YYYY, HH:MM`** (e.g. `Bring vehicle: 12.05.2026, 08:00`). The bring sheet adds **Today / Tomorrow / +2 / +3 / +1 week / +2 weeks**, **Custom date** (native date picker on iOS/Android; **web** uses secondary **DD.MM.YYYY** text + Apply), and **time** chips. **Pickup** opens **duration shortcuts** (same day +2h/+4h, next morning/afternoon, +2 days, +1 week, **Custom ready time**) that auto-fill pickup, plus **Custom** paths using the same picker patterns; **`availability_note`** uses spaced dates (`Bring vehicle: 12.05.2026 08:00. Pickup/ready: …`). Invalid order: **`Pickup/ready time must be after bring time.`** **`estimated_duration_minutes`** from delta when valid. **`available_from`** / **`phone_call_allowed`** unchanged. No backend/API contract changes.
- **Lifecycle meaning preserved:** UX messaging follows `request -> booked -> ongoing -> done -> service record`; this is presentation terminology only and does not rename backend Repair entities.
- **Future split note (TODO-only):** add a dedicated **Log service record** flow so historical/manual records are clearly separate from real-time service requests.
- **Request vs service-history separation:** request intake captures problem context for matching/routing; invoices, parts, and final repair details are deferred to later service-history/repair-management workflows.
- **Future extraction direction (TODO-only):** invoice OCR and photo-based part extraction are documented as future intake/service-history enhancements, alongside a future manual repair logging mode.
- **RepairDetail media gallery:** `RepairDetailScreen` includes a **Photos & videos** section with compact gallery cards, metadata (type/date/description when available), and a clean empty placeholder (`No photos or videos added yet.`). **Open** requests: owner can extend the gallery from this screen; **after booking**, gallery is view-only for the client here.
- **Repair media field compatibility:** `RepairDetailScreen` reads media from `repair_media`, legacy `media`, and compatibility fallbacks (`files`, `repair_files`) via a normalized local `repairMedia` list, then resolves common URL keys (`file`/`url`/`uri`/`image`/`thumbnail`).
- **Service-center visibility:** uploaded request media is visible in `RepairDetailScreen` for both client owners and authorized service centers (including offer/chat-involved shops that can access the repair).
- **Lightweight image fullscreen:** tapping an image opens a simple fullscreen modal/lightbox view (no complex zoom/gesture dependency in this phase).
- **Video behavior (lightweight):** videos render as clear placeholder cards with icon/label/metadata and a `Play (coming soon)` action; no heavy playback pipeline yet.
- **Service history media signal:** `VehicleDetailScreen` service-history cards now show a compact media chip (`Photos`, `Video`, or `Media attached`) when media metadata is available.
- **Progressive vehicle profile (create & detail):** `CreateVehicleScreen` and `EditVehicleDetailsScreen` tuck extended backend fields into **collapsed** sections: **Technical**, **Maintenance specifications** (helper: not service reminders), **Bike / e-bike / suspension**, **EV / hybrid**, **Trailer / towed equipment**, **Fleet / business**, **Mileage evidence**. On `VehicleDetailScreen`, **read-only** optional section cards show **only when at least one value exists**; owners use **Edit technical details** for optional fields and **Update kilometers** for odometer. **VIN** is shown read-only in technical edit and in detail summary; normal edit does not change VIN. Numeric optional fields omit empty input or validate before save; `getVehicleTypes()` uses `/api/vehicles/types/` when available.
- **Authorized service centers guidance:** `VehicleDetailScreen` authorized-center section now includes clearer helper copy, renders authorized centers from vehicle payload when available, and adds a direct `Find service centers` discovery action (with future-facing placeholders for manual service-center linking/management).
- **Navigation stack standardization:** back/finish flows now prefer real stack history (`canGoBack` -> `goBack`) with safe fallback to `Home`, replacing accidental homeward jumps from detail/create flows.
- **Drawer-origin route preservation:** screens opened from drawer-origin paths (vehicles, map, activity, repair/offer creation) now preserve previous route context instead of hard-resetting to root; no accidental `Home` resets in normal CRUD/detail flows.
- **Client profile UX simplification:** `ClientProfileScreen` now uses a simpler location model (country picker + free-text city/town), removes blocked/duplicate city-selection behavior, and adopts grouped card spacing aligned with newer screens.
- **Client contact preferences (UI-only):** profile now includes a local-only preferred-contact selector (`Phone` / `Chat` / `Email`) with helper copy focused on repair/service communication; no backend schema change in this phase.
- **Privacy-first client identity direction:** profile UX supports friendly display-name/nickname usage (real/legal names are not required) and adds a future placeholder section for vehicle access/sharing workflows.
- **Client location selector:** `ClientProfileScreen` supports dependent `Country -> City` selection (API-driven) with cleaner picker-only flow; for Bulgaria, major cities (`Sofia`, `Plovdiv`, `Varna`, `Burgas`) are prioritized at the top.

### Detail screen content conventions

- Prefer backend profile fields when available (`name`, `service_center_type`,
  `short_description`, `description`, `address`, `phone`, links, rating/review counts,
  completed jobs, supported vehicle types, available services, working hours, photos).
- Working-hours rendering maps numeric/day keys to **Monday-Sunday** labels (no raw
  `0:` / `1:` keys in UI).
- Profile editing uses a **working-hours UI abstraction** (per-day rows and open/closed toggles) that converts
  back to the existing `working_hours` backend shape on save.
- Vehicle/service capability selection is now chip-based multi-select (`supported_vehicle_types`,
  `available_repairs`) to reduce raw-form friction during onboarding.
- SEO copy is concise and factual, based only on existing fields; **hashtags are not used**.

---

## Service center map filtering

- **Service center filtering** is available on **Shop map** (`ShopMapScreen`): users can narrow **service centers** by **`vehicle_type`** (code), **`category`** (service category slug), and **`repair_type`** (service type slug). Results load via **`getServiceCenters`** in [`src/api/serviceCenters.js`](../src/api/serviceCenters.js) against **`/api/service-centers/`** (same behavior as `GET /api/profiles/shops/` on the backend).
- **UI (first pass):** horizontal chip rows for vehicle type and category, plus a simple **Picker** for service type; **map markers / callouts / popups** are unchanged.
- **ScreenBackground** wraps the map screen loading and main layout for consistency with other main surfaces.
- **Future:** richer chips, clear-all affordances, animations, and loading overlays that do not unmount the map during refetch.

---

## Notes for future work

- **Screen-specific backgrounds.** Still using `BACKGROUNDS.default` everywhere;
  swap per screen via `src/constants/images.js` when ready (`repairDetail`,
  `vehicleDetail`, `shopDetail`, `clientDetail`).
- **Real vehicle images.** Placeholder thumbnails (e.g. vehicles list, nested
  authorized-client vehicles) → replace with real assets when available.
- **Theme selector** (blue / pink / purple / green / orange): drive both
  `src/styles/colors.js` and `src/constants/colors.js` from a persisted palette key.
- **Future roadmap:** public SEO landing pages for service centers, booking
  availability display, and a dedicated service-center dashboard pass.
- **Future planning:** service-center dashboard analytics, guided onboarding checklists,
  and planning/availability workflows on top of the current profile foundation.
- **Future reminder center:** expand vehicle-level reminder placeholders into real interval/date-driven maintenance and legal reminders.
- **Future document center:** add structured upload, expiry tracking, and retrieval for invoices, inspections, insurance, and related ownership files.
- **Future ownership dashboard:** evolve vehicle detail into lifecycle insights (price guidance, recommendations, propositions, obligations timeline).

---

## Out of scope (intentionally not touched)

- Backend, API modules, auth, Firebase, WebSocket, route names, permissions.

The visual refresh is purely additive on the presentation layer.

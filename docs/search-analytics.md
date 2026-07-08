# Veversal search analytics

Internal, anonymous search intelligence for the service center discovery experience. This is **not** Google Analytics — events feed Veversal SEO, product analytics, and future recommendation systems.

## Goals

- Understand what users search for (brands, cities, services, vehicle types)
- Identify zero-result queries and content gaps
- Rank most-clicked service centers from discovery
- Support cross-dimensional analysis (brand × city, service × city)
- Stay fully anonymous — no user accounts, contact data, or vehicle identifiers in events

## Event schema

All events are JSON objects sent via `sendAnalyticsEvent(event)`.

### Common fields

| Field | Type | Description |
| --- | --- | --- |
| `eventType` | `"search"` \| `"search_click"` | Search result impression vs. profile click |
| `searchQuery` | `string \| null` | Sanitized free-text query (PII stripped) |
| `detectedLanguage` | `string` | Active i18n locale (`en`, `bg`, …) from URL or user preference |
| `page` | `string` | Web pathname or `service_center_discovery` on native |
| `selectedCity` | `string \| null` | City slug when a city filter is active |
| `selectedBrand` | `string \| null` | Vehicle make slug |
| `selectedVehicleType` | `string \| null` | Vehicle type code (`car`, `motorcycle`, …) |
| `selectedService` | `string \| null` | Repair type slug |
| `selectedFilters` | `object` | Structured filter snapshot (see below) |
| `resultCount` | `number` | Number of shops returned for this state |
| `timestamp` | `string` | ISO-8601 UTC |

### `selectedFilters` object

```json
{
  "category": "engine",
  "verifiedOnly": false,
  "openNowOnly": true,
  "minRating": 4,
  "radiusKm": 25,
  "sort": "recommended"
}
```

### `search_click` only

| Field | Type | Description |
| --- | --- | --- |
| `selectedServiceCenter` | `object` | `{ id, publicSlug, citySlug }` — no name, phone, or address |

### Example: search event

```json
{
  "eventType": "search",
  "searchQuery": "sofia brake",
  "detectedLanguage": "bg",
  "page": "/bg/service-centers",
  "selectedCity": "sofia",
  "selectedBrand": null,
  "selectedVehicleType": "car",
  "selectedService": "brake-service",
  "selectedFilters": {
    "category": null,
    "verifiedOnly": false,
    "openNowOnly": false,
    "minRating": null,
    "radiusKm": null,
    "sort": "recommended"
  },
  "resultCount": 12,
  "timestamp": "2026-07-08T16:30:00.000Z"
}
```

### Example: click event

```json
{
  "eventType": "search_click",
  "searchQuery": null,
  "detectedLanguage": "en",
  "page": "/en/service-centers",
  "selectedCity": "plovdiv",
  "selectedBrand": "bmw",
  "selectedVehicleType": "car",
  "selectedService": "oil-change",
  "selectedFilters": { "..." : "..." },
  "resultCount": 8,
  "selectedServiceCenter": {
    "id": 42,
    "publicSlug": "auto-pro-plovdiv",
    "citySlug": "plovdiv"
  },
  "timestamp": "2026-07-08T16:31:05.000Z"
}
```

## Privacy

**Never stored:** email, phone, username, license plate, VIN, shop contact details, or raw auth tokens.

Free-text `searchQuery` values pass through `sanitizeSearchQuery()` which redacts email, phone, VIN, and common plate patterns before send.

## Frontend API

Module: [`src/analytics/searchAnalytics.js`](../src/analytics/searchAnalytics.js)

| Function | Purpose |
| --- | --- |
| `trackSearch(payload)` | Record a search / filter result set |
| `trackSearchClick(payload)` | Record a service center profile click |
| `trackDiscoverySearch(state, extras)` | Hook helper — builds payload from discovery state |
| `trackDiscoverySearchClick(state, shop, extras)` | Hook helper for profile clicks |
| `sendAnalyticsEvent(event)` | Low-level transport (pluggable) |

Transport: [`src/analytics/searchAnalyticsTransport.js`](../src/analytics/searchAnalyticsTransport.js)

- **Development:** `console.debug` via composite transport
- **All environments:** `POST` to `{API_BASE_URL}/api/analytics/search/` with `keepalive`
- **Offline / 4xx / 5xx:** events queued in `localStorage` (`veversal_search_analytics_queue`, max 100) and flushed on next successful send

## Integration points

| Location | Trigger |
| --- | --- |
| [`useServiceCenterDiscovery.js`](../src/hooks/useServiceCenterDiscovery.js) | After each completed shop fetch (search, filters, sort) |
| [`ServiceCenterDiscovery.web.js`](../src/screens/ServiceCenterDiscovery.web.js) | `onViewProfile` → `trackDiscoverySearchClick` |

Search UX is unchanged — analytics runs fire-and-forget after results load.

## Future SEO usage

Aggregated search data can drive:

- **Landing pages** for high-volume `service × city` and `brand × city` queries with thin organic coverage
- **Zero-result remediation** — create or claim service centers, expand repair type coverage
- **Hreflang tuning** — compare `detectedLanguage` vs. query language for BG/EN content gaps
- **Sitemap prioritization** — boost URLs for frequently clicked centers and popular filter combinations

## Recommendation engine (product)

Planned downstream uses:

- “Popular in {city}” chips on discovery
- Default sort bias toward centers with high click-through for similar filter profiles
- Suggest repair types when users search vague terms (e.g. “noise” → suspension / brakes)
- Partner insights: demand heatmaps by brand and service (aggregated, k-anonymized)

## Admin dashboard (future)

Backend aggregation tables (not implemented yet) should support:

| Report | Dimensions |
| --- | --- |
| Top searches | `searchQuery`, `detectedLanguage` |
| Top brands / cities / services | respective `selected*` fields |
| Zero-result searches | `resultCount = 0` |
| Top clicked centers | `selectedServiceCenter.id` on `search_click` |
| Cross tabs | brand×city, service×city, vehicleType×service |

Suggested retention: raw events 90 days, daily rollups indefinite.

## AI recommendations (future)

Anonymous event streams can train or prompt:

- Query → repair type classification for ambiguous searches
- “Users who filtered X in city Y also clicked …” (collaborative filtering on center IDs only)
- Content generation for SEO snippets from top zero-result queries

No PII may enter model training pipelines.

## Backend integration plan

**Current state:** frontend-only. No Django endpoint required for this phase.

When ready:

1. Add `POST /api/analytics/search/` — accept JSON body matching schema above; return `204 No Content`
2. Validate and reject payloads containing forbidden keys (`email`, `phone`, `vin`, `license_plate`, …)
3. Persist to `search_analytics_event` (or append-only log / ClickHouse / BigQuery)
4. Optional: authenticated admin read APIs under `/api/admin/analytics/search/…`
5. Remove reliance on `localStorage` queue once endpoint is stable (keep as offline fallback)
6. Rate-limit by IP (hashed) to prevent abuse — still no user identity

Suggested Django stub (future):

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def search_analytics_ingest(request):
    # validate schema, strip unknown fields, enqueue to warehouse
    return Response(status=status.HTTP_204_NO_CONTENT)
```

## Testing locally

1. Open service center discovery on web
2. Run a search and change filters
3. In dev tools console, look for `[search-analytics]` debug lines
4. Click “View profile” on a result — confirm `eventType: "search_click"`
5. With network tab open, confirm non-blocking `POST` attempts (may 404 until backend exists; events stay queued)

# SEO routing — Service Center Discovery

**PATH:** `docs/seo-routing.md`

Frontend-only, dynamic SEO URL architecture for the public Service Centers discovery page. One React screen (`ServiceCenterDiscovery`) handles every combination; no static pages are generated.

---

## Route hierarchy

All public discovery URLs follow:

```
/{lang}/{rootSlug}/[{segment1}]/[{segment2}]/[{segment3}]
```

| Language | Root slug (`rootSlug`) |
|----------|------------------------|
| `en` | `service-centers` |
| `bg` | `avtoservizi` |
| `de` | `kfz-werkstatt` |
| `it` | `centri-assistenza` |
| `fr` | `centres-de-service` |
| `es` | `centros-de-servicio` |

### Supported patterns (under root slug)

| Pattern | EN example | BG example | Filters |
|---------|------------|------------|---------|
| Root | `/en/service-centers` | `/bg/avtoservizi` | none |
| City | `/en/service-centers/sofia` | `/bg/avtoservizi/sofia` | `city` |
| Brand | `/en/service-centers/bmw` | `/bg/avtoservizi/bmw` | `brand` |
| Brand + city | `/en/service-centers/bmw/sofia` | `/bg/avtoservizi/bmw/sofia` | `brand`, `city` |
| Brand + city + service | `/en/service-centers/bmw/sofia/oil-change` | `/bg/avtoservizi/bmw/sofia/oil-change` | `brand`, `city`, `repair` |

**Canonical segment order when a brand is present:** `brand → city → service`.

Legacy patterns (unchanged):

- `/service-centers/{city}/{repair}` — city + repair (no brand)
- `/{repair}` and `/{repair}/{city}` — repair-first URLs
- `/{vehicle-prefix}/[{city}/[{repair}]]` — vehicle-type discovery
- `/service-center/{slug}` — profile (`avtoserviz` in BG)

---

## Parameter parsing rules

Implementation: `src/utils/seo/seoPaths.js` (`parsePublicSeoPath`, `parseServiceCentersSegments`).

1. Strip optional `/{lang}/` prefix (`en`, `bg`, …) and map localized root slug → canonical `service-centers`.
2. Under `service-centers`:
   - **1 segment** — classify with `src/utils/seo/seoSlugCatalog.js`:
     - known **brand** slug → `brand` filter
     - known **repair** slug → repair filter (canonical redirects to repair-first path)
     - otherwise → **city** filter (backward compatible)
   - **2 segments** — priority:
     - legacy `city + vehicle-segment` (e.g. `sofia/car-service`)
     - `brand + city` (either order; normalized to brand-first)
     - `city + repair` (legacy)
     - `brand + repair`
   - **3 segments** — `brand + city + repair` (canonical discovery URL)
   - **4 segments** — legacy `city + vehicle + repair` or `city/c/{center}` profile shortcut

Slug catalogs are seeded client-side (common BG cities, brands, repair types) and **hydrated at runtime** from repair types + vehicle makes when the discovery screen loads taxonomy.

---

## URL → filter mapping

| Parsed type | Route params (`ShopMap`) | Discovery state |
|-------------|--------------------------|-----------------|
| `discovery_root` | — | defaults |
| `city` | `citySlug` | city filter |
| `discovery_brand` | `brandSlug` | brand filter (resolved to make id) |
| `discovery_brand_city` | `brandSlug`, `citySlug` | brand + city |
| `discovery_brand_city_repair` | `brandSlug`, `citySlug`, `repairType` | brand + city + repair |
| `vehicle_*` | `vehicleType`, `citySlug`, `repairType` | vehicle filters |
| `repair_first*` | `repairType`, `citySlug` | repair filters |

Filter changes on web call `history.replaceState` via `buildLocalizedDiscoveryPath` so the address bar stays in sync without duplicating screens.

---

## SEO metadata

`src/utils/seo/seoMetadata.web.js` builds per-URL:

- `<title>`, meta description, H1 (i18n templates in `seo.serviceCentersMeta.discovery.*`)
- `<link rel="canonical">` — localized path for current language
- Open Graph + Twitter Card tags
- JSON-LD `BreadcrumbList` (placeholder structure for richer schema later)
- `hreflang` alternates for all `SUPPORTED_LANGUAGES` (see below)

Visible UI: `DiscoverySeoBreadcrumbs` + dynamic H1 on `ServiceCenterDiscovery.web.js`.

---

## Future: sitemap generation

- **Source of truth:** canonical locale-free paths from `buildPathFromSeoParams` / `serviceCentersDiscoveryPath`, then `localizeCanonicalPath` per language.
- **Do not** pre-render thousands of pages; emit URLs for combinations that exist in taxonomy (cities × brands × repair types with at least one matching center).
- Backend `GET /api/public/seo/taxonomy/` can drive sitemap jobs; frontend catalogs mirror a subset for routing.
- Sitemap entries should use localized URLs (`/en/...`, `/bg/...`) with matching `hreflang` pairs.

---

## Future: canonical rules

- One canonical URL per logical filter set; prefer **brand-first** order when brand is set: `/service-centers/{brand}/{city}/{repair}`.
- City-only and brand-only paths that resolve to the same result set should 301/redirect to the preferred slug order (client already normalizes on filter sync).
- Legacy `/service-centers/{city}/{repair}` remains valid; canonical for repair+city without brand may stay repair-first (`/{repair}/{city}`) until backend alignment.
- Profile pages: `/service-center/{slug}` (BG: `/bg/avtoserviz/{slug}`).

---

## Future: hreflang rules

- Each discovery URL should list alternates for every supported language with the **same filter semantics** (same city/brand/repair slugs where catalogs align).
- `x-default` → English (`/en/service-centers/...`).
- Implemented in `buildDiscoverySeoMeta` → `hreflang` object → `<link rel="alternate" hreflang="...">`.
- When a slug has no translation in a locale, omit that alternate or map via taxonomy `slug_en` / `slug_bg` (backend).

---

## Key files

| File | Role |
|------|------|
| `src/utils/seo/seoPaths.js` | Parse/build canonical paths |
| `src/utils/seo/seoSlugCatalog.js` | Segment disambiguation |
| `src/navigation/localizedRoutes.js` | Language prefixes + `buildLocalizedDiscoveryPath` |
| `src/navigation/webLinking.js` | Browser path → navigation state |
| `src/utils/seo/seoMetadata.web.js` | Head tags + breadcrumbs data |
| `src/screens/ServiceCenterDiscovery.web.js` | Single discovery UI |

---

*Last updated: July 2026*

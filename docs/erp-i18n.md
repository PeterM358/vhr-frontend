# ERP i18n keys (BG/EN)

Locale files: `src/i18n/en.json`, `src/i18n/bg.json`.

**Rule:** every user-facing string shipped for shop/partner/client app screens must land in both `en.json` and `bg.json` in the same change (use `t('key')` / `useTranslation`). Do not ship English-only UI chrome when BG is a supported locale. See also Cursor rule for BG+EN i18n discipline.

## `erp.*` structure

| Section | Purpose |
|---------|---------|
| `erp.access.*` | Capability-disabled and permission-denied gates |
| `erp.common.*` | Shared loading/empty/error/upload labels |
| `erp.analytics.*` | Owner analytics summary screen |
| `erp.workforce.*` | Departments and employees list |
| `erp.documentImports.*` | Import list + detail/upload flow |
| `erp.complaints.*` | Shop complaint console; `status.*` uses V1 mapping (see backend `docs/erp/complaint-status-v1-mapping.md`) |
| `erp.procurement.*` | PO / goods receipt labels (warehouse hub) |
| `erp.payments.*` | Payment and document lifecycle statuses |
| `erp.review.*` | Client post-service review form |
| `erp.clientComplaint.*` | Client post-service complaint form |

Related repair/materials UI also uses `repairs.detail.*`, `repairWizard.*`, `operationStatuses.*`, `selectRepairParts.*`, `createMasterPart.*`, `relatedServiceHistory.*`, and `shopDataAccess.*`.

Drawer labels live under `drawer.partner.*` (`analytics`, `workforce`, `documentImports`, `complaints`).

Web tab titles use `seo.analytics`, `seo.workforce`, `seo.documentImports`, `seo.complaints`.

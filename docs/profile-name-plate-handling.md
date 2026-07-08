# Profile names and license plates (frontend notes)

## Shop / partner names (future backend)

Today the partner profile stores a single `name` field on the shop profile. The UI treats it as the **display name** shown to clients on the map and public page.

**Planned backend fields (not implemented yet — no migrations in this pass):**

| Field | Purpose |
|-------|---------|
| `display_name` | Primary client-facing label (what owners see in search and on the public page) |
| `legal_name` | Registered company name for invoices and contracts (may differ from display name) |
| `public_name_bg` | Optional Bulgarian public label when the shop wants a localized storefront name |
| `public_name_en` | Optional English public label |

Until those exist, the frontend continues to read/write `name` only. Invoice legal entity `legal_name` is separate and already used in billing settings.

## Client display names (future backend)

`ClientProfileScreen` collects a display name / nickname locally. The save payload currently sends country, city, and phone only. A future `display_name` (or `nickname`) column on the client profile should be wired when the API exposes it.

## License plates — never translate

Vehicle registration plates are **identifiers**, not translatable copy:

- Always show plates exactly as stored (preserve user casing where the API returns it).
- Never pass plates through i18n or locale-aware string transforms.
- Search and matching should treat Cyrillic/Latin lookalikes as equivalent after normalization.

**Normalization rule (search / filter only):**

```
CA5555CA = СА5555СА = ca5555ca
```

Map common Cyrillic letters to Latin before compare:

- А→A, В→B, С→C, Е→E, Н→H, К→K, М→M, О→O, Р→P, Т→T, У→Y, Х→X

Strip spaces and hyphens, uppercase the result for comparison keys. Display the original stored value in the UI.

Implement normalization in shared search utilities when plate search ships; do not transliterate plates in user-visible labels.

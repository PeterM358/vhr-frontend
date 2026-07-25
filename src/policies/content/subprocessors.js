const subprocessors = {
  key: 'subprocessors',
  slug: 'subprocessors',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Subprocessors',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta matrix — verify before production',
        paragraphs: [
          'This table reflects infrastructure observed in repository configuration and runtime docs as of the effective date. Planned migrations are listed separately and are not live unless marked Current.',
        ],
      },
      {
        id: 'current-matrix',
        title: 'Current beta processors',
        paragraphs: [
          '| Processor | Purpose | Data categories | Location | Status |',
          '| --- | --- | --- | --- | --- |',
          '| Hetzner Online GmbH | VPS hosting (app, PostgreSQL, Redis, nginx) | Account, operational, logs, backups | EU (Germany) | **Current** |',
          '| Hetzner Object Storage | Media/document object storage when S3 enabled | Uploaded files, presigned downloads | EU (nbg1 — Nuremberg) | **Current** (when configured) |',
          '| SMTP provider (configured in env, e.g. Gmail SMTP placeholder) | Transactional email | Email address, message content | Depends on provider config | **Current** |',
          '| Google LLC (Google Maps Platform) | Map display, geocoding in web/native map views | Location queries, device/browser data | US/EU per Google | **Current** (when maps load) |',
          '| Google LLC (Google Analytics 4) | Web analytics after cookie consent | Pseudonymous usage events | US/EU per Google | **Current** (consent-gated) |',
          '| Firebase Cloud Messaging (if push enabled) | Mobile push notifications | Device tokens, message payloads | Google infrastructure | **Current** (when push used) |',
          '| Stripe, Inc. | Partner subscription checkout where enabled | Billing contact, payment metadata | US/EU per Stripe | **Current** (when Stripe configured) |',
        ],
      },
      {
        id: 'planned-matrix',
        title: 'Planned — not live in current beta config',
        paragraphs: [
          '| Processor | Purpose | Status |',
          '| --- | --- | --- |',
          '| Amazon Web Services (AWS) | Planned migration target for hosting/storage | **Planned** |',
          '| Evrotrust / qualified trust service providers | Planned identity/signing vault integrations | **Planned** |',
          '| Additional payroll/accounting integrators | Warehouse/payroll/full accounting verticals | **Planned** |',
        ],
      },
      {
        id: 'ocr-note',
        title: 'OCR / document AI',
        paragraphs: [
          'No third-party OCR processor is confirmed active end-to-end in beta. If enabled later, it will be added here before production processing.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this list',
        lawyerReview: true,
        paragraphs: [
          'Material subprocessors changes will be announced via [SUBPROCESSOR_NOTICE_CHANNEL_PLACEHOLDER] and DPA notice period once B2B contracts are live.',
          'Last reviewed against codebase: 2026-07-25.',
        ],
      },
    ],
  },
  bg: {
    title: 'Subprocessors',
    sections: [
      {
        id: 'beta-notice',
        title: 'Бета матрица — verify преди production',
        paragraphs: [
          'Таблицата отразява инфраструктура от конфигурацията и runtime docs към effective date. Планирани миграции са отделно и не са live, освен ако не са маркирани Current.',
        ],
      },
      {
        id: 'current-matrix',
        title: 'Текущи beta processors',
        paragraphs: [
          '| Processor | Цел | Категории данни | Локация | Статус |',
          '| --- | --- | --- | --- | --- |',
          '| Hetzner Online GmbH | VPS hosting (app, PostgreSQL, Redis, nginx) | Account, operational, logs, backups | EU (Germany) | **Current** |',
          '| Hetzner Object Storage | Object storage при S3 | Качени файлове | EU (nbg1) | **Current** (ако е конфигурирано) |',
          '| SMTP provider (env, напр. Gmail placeholder) | Transactional email | Имейл, съдържание | Зависи от config | **Current** |',
          '| Google LLC (Maps Platform) | Карти, geocoding | Location queries | US/EU per Google | **Current** (при maps) |',
          '| Google LLC (GA4) | Web analytics след consent | Pseudonymous events | US/EU per Google | **Current** (consent-gated) |',
          '| Firebase Cloud Messaging | Push notifications | Device tokens | Google | **Current** (при push) |',
          '| Stripe, Inc. | Partner subscription checkout | Billing, payment metadata | US/EU per Stripe | **Current** (ако Stripe е config) |',
        ],
      },
      {
        id: 'planned-matrix',
        title: 'Планирано — не е live в текущата beta config',
        paragraphs: [
          '| Processor | Цел | Статус |',
          '| --- | --- | --- |',
          '| Amazon Web Services (AWS) | Planned migration | **Planned** |',
          '| Evrotrust / trust services | Planned identity/signing vault | **Planned** |',
          '| Payroll/accounting integrators | Warehouse/payroll/accounting | **Planned** |',
        ],
      },
      {
        id: 'ocr-note',
        title: 'OCR / document AI',
        paragraphs: [
          'Няма потвърден active third-party OCR end-to-end в бета. При активиране ще бъде добавен тук преди production processing.',
        ],
      },
      {
        id: 'changes',
        title: 'Промени в списъка',
        lawyerReview: true,
        paragraphs: [
          'Съществени промени ще се обявяват чрез [SUBPROCESSOR_NOTICE_CHANNEL_PLACEHOLDER] и DPA notice period след B2B договори.',
          'Последен преглед спрямо codebase: 2026-07-25.',
        ],
      },
    ],
  },
};

export default subprocessors;

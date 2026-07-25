const partnerTerms = {
  key: 'partner-terms',
  slug: 'partner-terms',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Business & Partner Terms',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta — service centers and organizations',
        paragraphs: [
          'These terms supplement the general Terms of Use for Veversal partner (service center) and business organization features in beta.',
          'Warehouse, payroll, and full accounting modules described in product docs are planned — not contractual in beta unless explicitly enabled in your UI.',
        ],
      },
      {
        id: 'who',
        title: 'Who this applies to',
        paragraphs: [
          'Service center owners and staff using the partner dashboard, subscription, invoicing, promotions, workforce, and complaints tools.',
          'Business organization administrators and members using fleet import, organization network, and membership invites.',
        ],
      },
      {
        id: 'contract-party',
        title: 'Contracting entity (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'B2B contracting party (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER]. Billing address and VAT: [BILLING_DETAILS_PLACEHOLDER].',
        ],
      },
      {
        id: 'subscriptions',
        title: 'Subscriptions and entitlements (current)',
        paragraphs: [
          'Shop features are gated by subscription plan and state (active, read-only, inactive listing). Payment may be via Stripe Checkout or bank transfer instructions where configured.',
          'Trial policies exist as configuration stubs — exact trial rules depend on your plan assignment.',
        ],
      },
      {
        id: 'customer-data',
        title: 'Customer and vehicle data',
        paragraphs: [
          'You act as an independent service provider. Access customer/vehicle personal data only with valid owner authorization (grant/share/booking context).',
          'You must not export customer lists for unrelated marketing. Promotions sent through Veversal must respect owner marketing preferences where enforced.',
        ],
        lawyerReview: true,
      },
      {
        id: 'organization-fleet',
        title: 'Organization fleet responsibilities (current beta)',
        paragraphs: [
          'Organization admins are responsible for lawful basis to upload fleet register files and employee-related operational data.',
          'Invites must be sent only to intended recipients. Revoke membership promptly when staff leave.',
        ],
      },
      {
        id: 'content-public',
        title: 'Public profiles and reviews',
        paragraphs: [
          'Public shop pages display information you publish (services, hours, location). Reviews and shop responses may be visible to consumers.',
          'Do not post misleading claims or others’ personal data in responses.',
        ],
      },
      {
        id: 'dpa',
        title: 'Data Processing Addendum',
        paragraphs: [
          'Where Veversal processes personal data on your behalf as processor, a DPA applies — see the DPA placeholder page. Final DPA requires legal sign-off and entity details.',
        ],
      },
      {
        id: 'termination',
        title: 'Termination and data return',
        paragraphs: [
          'On subscription end, shop data may enter read-only mode rather than immediate deletion. Export tools are limited in beta — request support assistance (placeholder).',
        ],
      },
      {
        id: 'lawyer',
        title: 'Legal review required',
        lawyerReview: true,
        paragraphs: [
          'Fee schedules, SLA, indemnity, and processor/sub-processor clauses must be inserted by counsel before production B2B reliance.',
        ],
      },
    ],
  },
  bg: {
    title: 'Условия за бизнес и partners',
    sections: [
      {
        id: 'beta-notice',
        title: 'Бета — сервизи и организации',
        paragraphs: [
          'Тези условия допълват общите Условия за ползване за partner (сервиз) и business organization функции в бета.',
          'Warehouse, payroll и пълен счетоводен модул в docs са планирани — не са договорни в бета, освен ако изрично не са включени в UI.',
        ],
      },
      {
        id: 'who',
        title: 'За кого важат',
        paragraphs: [
          'Собственици и персонал на сервизи, ползващи partner dashboard, абонамент, фактуриране, промоции, workforce и оплаквания.',
          'Администратори и членове на business organizations с fleet import, organization network и membership invites.',
        ],
      },
      {
        id: 'contract-party',
        title: 'Договорна страна (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'B2B страна (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER]. Адрес и ДДС: [BILLING_DETAILS_PLACEHOLDER].',
        ],
      },
      {
        id: 'subscriptions',
        title: 'Абонаменти и entitlements (текущо)',
        paragraphs: [
          'Shop функциите зависят от план и състояние (active, read-only, inactive listing). Плащане: Stripe Checkout или bank transfer, където е конфигурирано.',
          'Trial policies са configuration stubs — правилата зависят от вашия plan.',
        ],
      },
      {
        id: 'customer-data',
        title: 'Данни на клиенти и ПС',
        paragraphs: [
          'Действате като независим доставчик на услуги. Достъпвайте лични данни само с валидна authorization (grant/share/booking).',
          'Не export-вайте клиентски списъци за несвързан marketing. Promotions трябва да спазват marketing preferences.',
        ],
        lawyerReview: true,
      },
      {
        id: 'organization-fleet',
        title: 'Organization fleet отговорности (бета)',
        paragraphs: [
          'Администраторите отговарят за lawful basis при upload на fleet register и operational workforce данни.',
          'Поканите се изпращат само до intended recipients. Revoke membership при напускане.',
        ],
      },
      {
        id: 'content-public',
        title: 'Публични профили и отзиви',
        paragraphs: [
          'Публичните shop страници показват информация, която публикувате. Отзиви и отговори може да са видими за потребители.',
          'Не публикувайте подвеждащи твърдения или чужди лични данни в отговори.',
        ],
      },
      {
        id: 'dpa',
        title: 'Data Processing Addendum',
        paragraphs: [
          'Когато Veversal обработва лични данни от ваше име като processor, важи DPA — вижте DPA placeholder. Финален DPA изисква правен sign-off.',
        ],
      },
      {
        id: 'termination',
        title: 'Прекратяване и връщане на данни',
        paragraphs: [
          'При край на абонамент shop данните може да станат read-only, не незабавно изтрити. Export tools са ограничени в бета.',
        ],
      },
      {
        id: 'lawyer',
        title: 'Изисква се правен преглед',
        lawyerReview: true,
        paragraphs: [
          'Тарифи, SLA, indemnity и processor клаузи трябва да бъдат добавени от адвокат преди production B2B разчитане.',
        ],
      },
    ],
  },
};

export default partnerTerms;

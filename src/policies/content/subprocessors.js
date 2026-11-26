const subprocessors = {
  key: 'subprocessors',
  slug: 'subprocessors',
  version: '1.2.0',
  effectiveDate: '2026-11-26',
  status: 'published',
  leadingLanguage: 'en',
  en: {
    title: 'Subprocessors',
    sections: [
      {
        id: 'intro',
        title: '1. Introduction',
        paragraphs: [
          'Veversal EOOD uses the service providers below to operate the platform. Contact: contact@veversal.com. Address: Sofia, ul. Zlaten Klas 623, 20, Bulgaria.',
          'Planned providers are listed separately and are not used until marked Current.',
        ],
      },
      {
        id: 'current-matrix',
        title: '2. Current processors',
        paragraphs: [
          '| Processor | Purpose | Data categories | Location | Status |',
          '| --- | --- | --- | --- | --- |',
          '| Hetzner Online GmbH | VPS hosting (app, PostgreSQL, Redis, nginx) | Account, operational, logs, backups | EU (Germany) | **Current** |',
          '| Hetzner Object Storage | Media/document object storage when S3 enabled | Uploaded files, downloads | EU (nbg1 — Nuremberg) | **Current** (when configured) |',
          '| SMTP email provider (configured in environment) | Transactional email | Email address, message content | Depends on provider | **Current** |',
          '| Google LLC (Google Maps Platform) | Map display, geocoding | Location queries, device/browser data | US/EU per Google | **Current** (when maps load) |',
          '| Google LLC (Google Analytics 4) | Web analytics after cookie consent | Pseudonymous usage events | US/EU per Google | **Current** (consent-gated) |',
          '| Firebase Cloud Messaging (when push enabled) | Mobile push notifications | Device tokens, message payloads | Google infrastructure | **Current** (when push used) |',
          '| Stripe, Inc. | Partner subscription card checkout | Billing contact, payment metadata | US/EU per Stripe | **Current** (when Stripe configured) |',
          '| ePay.bg / EasyPay | EasyPay cash-desk / ATM subscription payments | Payment codes, amounts, merchant notify data | Bulgaria / EU | **Current** (when EasyPay configured) |',
        ],
      },
      {
        id: 'planned-matrix',
        title: '3. Planned — not live yet',
        paragraphs: [
          '| Processor | Purpose | Status |',
          '| --- | --- | --- |',
          '| Amazon Web Services (AWS) | Possible future hosting/storage | **Planned** |',
          '| Evrotrust / qualified trust providers | Possible identity/signing integrations | **Planned** |',
          '| Additional payroll/accounting integrators | Future ERP verticals | **Planned** |',
        ],
      },
      {
        id: 'ocr-note',
        title: '4. Document OCR',
        paragraphs: [
          'No third-party OCR processor is confirmed active end-to-end. If enabled later, it will be added to this list before production use.',
        ],
      },
      {
        id: 'changes',
        title: '5. Changes',
        paragraphs: [
          'Material changes to this list will be reflected on this page and, where required for B2B processing agreements, notified via contact@veversal.com or in-product notice.',
          'Last updated: 2026-11-26.',
        ],
      },
    ],
  },
  bg: {
    title: 'Подизпълнители',
    sections: [
      {
        id: 'intro',
        title: '1. Въведение',
        paragraphs: [
          '„ВИВЪРСАЛ“ ЕООД ползва посочените по-долу доставчици за работата на платформата. Контакт: contact@veversal.com. Адрес: София, ул. Златен клас 623, 20, България.',
          'Планираните доставчици са изброени отделно и не се ползват, докато не са отбелязани като текущи.',
        ],
      },
      {
        id: 'current-matrix',
        title: '2. Текущи подизпълнители',
        paragraphs: [
          '| Доставчик | Цел | Категории данни | Локация | Статус |',
          '| --- | --- | --- | --- | --- |',
          '| Hetzner Online GmbH | VPS хостинг (приложение, PostgreSQL, Redis, nginx) | Акаунт, оперативни данни, логове, резервни копия | ЕС (Германия) | **Текущ** |',
          '| Hetzner Object Storage | Обектно хранилище за медия/документи при S3 | Качени файлове | ЕС (nbg1 — Нюрнберг) | **Текущ** (ако е конфигурирано) |',
          '| SMTP доставчик на имейл (според конфигурацията) | Транзакционен имейл | Имейл адрес, съдържание | Зависи от доставчика | **Текущ** |',
          '| Google LLC (Google Maps Platform) | Карти, геокодиране | Заявки за локация, данни за устройство/браузър | САЩ/ЕС по Google | **Текущ** (при карти) |',
          '| Google LLC (Google Analytics 4) | Уеб аналитика след съгласие за бисквитки | Псевдонимизирани събития | САЩ/ЕС по Google | **Текущ** (със съгласие) |',
          '| Firebase Cloud Messaging (при push) | Мобилни известия | Токени на устройства, съдържание | Инфраструктура на Google | **Текущ** (при push) |',
          '| Stripe, Inc. | Картово плащане на абонамент | Данни за фактуриране, платежни метаданни | САЩ/ЕС по Stripe | **Текущ** (ако Stripe е включен) |',
          '| ePay.bg / EasyPay | Плащане на каса / банкомат за абонамент | Кодове за плащане, суми, известия към търговеца | България / ЕС | **Текущ** (ако EasyPay е включен) |',
        ],
      },
      {
        id: 'planned-matrix',
        title: '3. Планирани — още не се ползват',
        paragraphs: [
          '| Доставчик | Цел | Статус |',
          '| --- | --- | --- |',
          '| Amazon Web Services (AWS) | Възможен бъдещ хостинг/хранилище | **Планиран** |',
          '| Evrotrust / квалифицирани удостоверителни услуги | Възможни интеграции за идентичност/подпис | **Планиран** |',
          '| Допълнителни интегратори за заплати/счетоводство | Бъдещи ERP вертикали | **Планиран** |',
        ],
      },
      {
        id: 'ocr-note',
        title: '4. OCR на документи',
        paragraphs: [
          'Няма потвърден активен подизпълнител за OCR от край до край. При включване ще бъде добавен в този списък преди продуктивна употреба.',
        ],
      },
      {
        id: 'changes',
        title: '5. Промени',
        paragraphs: [
          'Съществени промени в списъка се отразяват на тази страница и, когато се изисква за споразумения за обработка, се уведомяват чрез contact@veversal.com или известие в продукта.',
          'Последна актуализация: 2026-11-26.',
        ],
      },
    ],
  },
};

export default subprocessors;

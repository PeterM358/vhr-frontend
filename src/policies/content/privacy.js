/** @typedef {{ id: string, title: string, paragraphs?: string[], bullets?: string[], lawyerReview?: boolean }} PolicySection */

/** @typedef {{ title: string, sections: PolicySection[] }} PolicyLocaleContent */

/** @typedef {{ key: string, slug: string, version: string, effectiveDate: string, status: 'draft-beta', leadingLanguage: 'en' | 'bg', en: PolicyLocaleContent, bg: PolicyLocaleContent }} PolicyDocument */

/** @type {PolicyDocument} */
const privacy = {
  key: 'privacy',
  slug: 'privacy',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Privacy Policy',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta service notice',
        paragraphs: [
          'Veversal is currently offered as a beta preview. Features, data flows, and this policy may change before production sign-off.',
          'Do not rely on the beta environment as your sole legal archive. Keep copies of documents you upload and export data you need independently.',
          'Support contact (placeholder): [SUPPORT_EMAIL_PLACEHOLDER].',
        ],
      },
      {
        id: 'controller',
        title: 'Who processes your data',
        lawyerReview: true,
        paragraphs: [
          'Data controller (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER], registered at [REGISTERED_ADDRESS_PLACEHOLDER], company ID [EIK_PLACEHOLDER], VAT [VAT_NUMBER_PLACEHOLDER] (if applicable).',
          'Data Protection Officer / privacy contact (placeholder): [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER].',
          'Governing jurisdiction for this draft (placeholder): [JURISDICTION_PLACEHOLDER].',
        ],
      },
      {
        id: 'scope',
        title: 'Scope and roles',
        paragraphs: [
          'This policy describes how Veversal processes personal data when you use the client app, service-center (partner) tools, or organization workspace features available in the current beta.',
          'Veversal supports vehicle owners (clients), independent service centers (shops/partners), and business organizations with fleet and workforce features. Your role determines which data you provide and which tools you can access.',
        ],
      },
      {
        id: 'registration-auth',
        title: 'Registration, sign-in, and email verification (current)',
        paragraphs: [
          'You can register with email and/or phone and a password. JWT access and refresh tokens are issued after successful authentication.',
          'Email verification is required for email-based accounts in the current beta. A verification link is sent to your address; until verified, some flows may be limited.',
          'Password reset uses time-limited email links. Security-related events (sign-in attempts, password changes) may be logged with IP address and browser user-agent in security audit records.',
        ],
      },
      {
        id: 'client-data',
        title: 'Client profile and vehicles (current)',
        paragraphs: [
          'Client profiles may store display preferences, town/location hints, language, notification preferences, and optional billing identity fields used for invoices you request.',
          'Vehicles may include registration plate, VIN/chassis/identity fields, make/model/year, mileage, photos, and documents (insurance, technical inspection, etc.).',
          'Vehicle reminders and obligation dates can be entered manually. Automatic government registry checks are not active in the current beta unless explicitly shown in the product.',
          'Archived vehicles remain in the system with reduced visibility; deletion/anonymisation of the owning account does not erase vehicle identity needed for service history integrity (see account deletion).',
        ],
      },
      {
        id: 'shop-partner-data',
        title: 'Service centers / partners (current)',
        paragraphs: [
          'Shop profiles include business identity, address, geo location, services, opening hours, supported vehicle types, staff memberships, and subscription/entitlement state.',
          'Operational data includes repair jobs, offers, chat messages, parts usage, invoices, promotions, complaints, and document imports where enabled.',
          'Shop lifecycle follows subscription states (active, read-only, inactive listing). Closing a subscription does not automatically delete historical repair records.',
        ],
      },
      {
        id: 'organization-data',
        title: 'Business organizations, memberships, and fleet (current)',
        paragraphs: [
          'Organizations can own fleet vehicles, invite members by email link, and assign organization-scoped roles separate from individual shop staff roles.',
          'Fleet register import (XLS) processes rows you upload to create or update organization-owned vehicles. Import logs may retain row-level messages for support troubleshooting.',
          'Organization data is isolated from other organizations at the application access layer; cross-tenant access is denied by permission checks on organization-scoped APIs.',
        ],
      },
      {
        id: 'access-sharing',
        title: 'Sharing, grants, and repair visibility (current)',
        paragraphs: [
          'Vehicle owners control which service centers can access vehicle details and history through sharing/grant mechanisms and authorized-client links.',
          'Shops generally retain visibility of repairs they performed even after a grant ends, within job-scoped rules implemented in the backend.',
          'Grant and revoke actions are auditable events where audit logging is enabled.',
        ],
      },
      {
        id: 'workforce',
        title: 'Workforce and operational HR data (current vs planned)',
        paragraphs: [
          'Current beta: shop workforce records store operational display names, assignments, and rates linked to shop membership — not a dedicated encrypted HR vault.',
          'Planned (not live): organization employee private vault for national identifiers, credential scans, and step-up protected fields — see product documentation; do not assume this exists in beta.',
        ],
      },
      {
        id: 'reviews-complaints-promotions',
        title: 'Reviews, complaints, and marketing preferences (current)',
        paragraphs: [
          'Clients may leave shop reviews; shops may publish responses visible on public profiles where enabled.',
          'Complaints workflows store case details, status, and messages between parties entitled to the repair.',
          'Email preferences (bookings, promotions, reminders) are stored per account and can be updated in profile/mailing settings where exposed in UI.',
          'Push notification device tokens are stored to deliver mobile notifications you opt into at the OS level.',
        ],
      },
      {
        id: 'cookies-analytics',
        title: 'Cookies, local storage, and analytics (current)',
        paragraphs: [
          'Necessary storage includes session tokens, locale preference, and cookie-consent choice.',
          'Analytics (Google Analytics 4) loads on web only after you accept analytics cookies in the cookie banner. Rejecting analytics keeps GA4 disabled.',
          'Cookie choices are separate from acceptance of Terms of Use — see the Cookie Policy.',
        ],
      },
      {
        id: 'processors-hosting',
        title: 'Hosting and subprocessors (current vs planned)',
        paragraphs: [
          'Current beta infrastructure (as configured): application and PostgreSQL database on Hetzner VPS; media files in Hetzner Object Storage (EU region nbg1) when S3-compatible storage is enabled; Redis for cache/channels; SMTP email delivery.',
          'Maps: Google Maps JavaScript/API may load on web map views — subject to Google’s terms and your browser settings.',
          'Planned (not live in current beta config): migration to AWS; Evrotrust or similar qualified trust services; additional payment/KYC processors — listed only when contracted.',
          'See the Subprocessors page for a tabular summary.',
        ],
      },
      {
        id: 'ocr',
        title: 'Document OCR (current)',
        paragraphs: [
          'Registration document scan/OCR hooks exist in the frontend product surface; end-to-end automated OCR extraction is not guaranteed active in beta. Treat uploaded documents as files you control.',
        ],
      },
      {
        id: 'retention-deletion',
        title: 'Retention, account deletion, and legal hold (current principles)',
        paragraphs: [
          'Operational backups: database backup scripts exist for ops; automated in-app retention purge jobs are not fully implemented — retention periods require legal sign-off.',
          'Account deletion (client): password-confirmed delete anonymises the user record, clears client profile PII, disables tokens/notifications, revokes vehicle grants, and marks vehicles owner-orphaned while preserving VIN/history where required for service integrity.',
          'Invoices, tax records, dispute evidence, security logs, and shop operational archives may be retained after deletion where law or legitimate interest requires.',
          'Legal hold: manual ops process (placeholder) — no automated legal-hold product UI in beta.',
        ],
      },
      {
        id: 'dsar',
        title: 'Your rights and DSAR contact (current process)',
        lawyerReview: true,
        paragraphs: [
          'Depending on applicable law you may have rights of access, rectification, erasure, restriction, portability, and objection.',
          'To exercise rights, contact [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER] with enough detail to identify your account. We may request verification.',
          'Automated self-service data export is not available in the current beta.',
        ],
      },
      {
        id: 'security',
        title: 'Security measures (high level)',
        paragraphs: [
          'Transport encryption (HTTPS), authenticated API access, role-based permissions, protected media downloads, and security event logging are in use.',
          'No system is perfectly secure; report suspected incidents to [SECURITY_CONTACT_PLACEHOLDER].',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        paragraphs: [
          'We will update the version and effective date when material changes are published. Material changes may require renewed acceptance once a formal acceptance system is implemented (not active in beta preview).',
        ],
      },
      {
        id: 'lawyer-review',
        title: 'Draft status',
        paragraphs: [
          'Sections marked for legal review must be confirmed by qualified counsel before production reliance. This document is a technical-behaviour draft aligned to the codebase, not final legal advice.',
        ],
      },
    ],
  },
  bg: {
    title: 'Политика за поверителност',
    sections: [
      {
        id: 'beta-notice',
        title: 'Уведомление за бета услуга',
        paragraphs: [
          'Veversal в момента се предлага като бета преглед. Функции, потоци от данни и тази политика могат да се променят преди финално production одобрение.',
          'Не разчитайте на бета средата като единствен правен архив. Запазвайте копия от качените документи и независимо експортирайте данни, които ви трябват.',
          'Контакт за поддръжка (placeholder): [SUPPORT_EMAIL_PLACEHOLDER].',
        ],
      },
      {
        id: 'controller',
        title: 'Кой обработва вашите данни',
        lawyerReview: true,
        paragraphs: [
          'Администратор на данни (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER], със седалище [REGISTERED_ADDRESS_PLACEHOLDER], ЕИК [EIK_PLACEHOLDER], ДДС [VAT_NUMBER_PLACEHOLDER] (ако е приложимо).',
          'Длъжностно лице по защита на данните / контакт за поверителност (placeholder): [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER].',
          'Приложима юрисдикция за този чернови текст (placeholder): [JURISDICTION_PLACEHOLDER].',
        ],
      },
      {
        id: 'scope',
        title: 'Обхват и роли',
        paragraphs: [
          'Тази политика описва как Veversal обработва лични данни, когато използвате клиентското приложение, инструментите за сервиз (partner) или функциите за организационно работно пространство, налични в текущата бета.',
          'Veversal поддържа собственици на превозни средства (клиенти), независими сервизни центрове (shops/partners) и бизнес организации с fleet и workforce функции. Вашата роля определя кои данни предоставяте и към кои инструменти имате достъп.',
        ],
      },
      {
        id: 'registration-auth',
        title: 'Регистрация, вход и потвърждение на имейл (текущо)',
        paragraphs: [
          'Можете да се регистрирате с имейл и/или телефон и парола. След успешна автентикация се издават JWT access и refresh токени.',
          'Потвърждението на имейл е задължително за акаунти с имейл в текущата бета. Изпраща се връзка за потвърждение; до потвърждение някои потоци може да са ограничени.',
          'Нулирането на парола използва времево ограничени имейл връзки. Събития, свързани със сигурността (опити за вход, смяна на парола), могат да се записват с IP адрес и user-agent в одитни записи.',
        ],
      },
      {
        id: 'client-data',
        title: 'Клиентски профил и превозни средства (текущо)',
        paragraphs: [
          'Клиентските профили могат да съхраняват предпочитания за показване, град/локация, език, настройки за известия и по избор полета за фактуриране.',
          'Превозните средства могат да включват регистрационен номер, VIN/шаси/идентификационни полета, марка/модел/година, пробег, снимки и документи (застраховка, ГТП и др.).',
          'Напомняния и задължения могат да се въвеждат ръчно. Автоматични проверки в държавни регистри не са активни в текущата бета, освен ако изрично не е показано в продукта.',
          'Архивираните превозни средства остават в системата с намалена видимост; изтриването/анонимизирането на акаунта не изтрива идентичността на ПС, нужна за целостта на сервизната история.',
        ],
      },
      {
        id: 'shop-partner-data',
        title: 'Сервизни центрове / partners (текущо)',
        paragraphs: [
          'Профилите на сервизи включват бизнес идентичност, адрес, геолокация, услуги, работно време, поддържани типове ПС, членства на персонал и абонамент/entitlement състояние.',
          'Оперативните данни включват ремонти, оферти, чат, части, фактури, промоции, оплаквания и импорт на документи, където е включено.',
          'Жизненият цикъл на сервиза следва абонаментни състояния (active, read-only, inactive listing). Затварянето на абонамент не изтрива автоматично исторически ремонти.',
        ],
      },
      {
        id: 'organization-data',
        title: 'Бизнес организации, членства и fleet (текущо)',
        paragraphs: [
          'Организациите могат да притежават fleet превозни средства, да канят членове по имейл връзка и да задават организационни роли, отделни от ролите в отделен shop.',
          'Fleet импорт (XLS) обработва качените редове за създаване/актуализация на ПС, притежавани от организацията. Логовете на импорт могат да запазват съобщения по редове за поддръжка.',
          'Данните на организацията са изолирани от други организации на ниво достъп в приложението.',
        ],
      },
      {
        id: 'access-sharing',
        title: 'Споделяне, grants и видимост на ремонти (текущо)',
        paragraphs: [
          'Собствениците контролират кои сервизи имат достъп до детайли и история чрез споделяне/grants и authorized-client връзки.',
          'Сервизите обикновено запазват видимост на извършените от тях ремонти след край на grant, в рамките на job-scoped правила в backend.',
          'Действия grant/revoke са одитируеми, където одитното логване е включено.',
        ],
      },
      {
        id: 'workforce',
        title: 'Workforce и оперативни HR данни (текущо срещу планирано)',
        paragraphs: [
          'Текуща бета: workforce записите съхраняват оперативни display names, назначения и ставки, свързани с shop membership — без отделен криптиран HR vault.',
          'Планирано (не е live): organization employee private vault за идентификатори, сканирани документи и step-up полета — не приемайте, че съществува в бета.',
        ],
      },
      {
        id: 'reviews-complaints-promotions',
        title: 'Отзиви, оплаквания и маркетинг предпочитания (текущо)',
        paragraphs: [
          'Клиентите могат да оставят отзиви; сервизите могат да публикуват отговори на публични профили, където е включено.',
          'Оплакванията съхраняват детайли, статус и съобщения между страни с право на достъп.',
          'Имейл предпочитания (bookings, promotions, reminders) се съхраняват по акаунт и могат да се актуализират в профила.',
          'Push токени се съхраняват за известия, които разрешавате на OS ниво.',
        ],
      },
      {
        id: 'cookies-analytics',
        title: 'Бисквитки, local storage и аналитика (текущо)',
        paragraphs: [
          'Необходимото съхранение включва session токени, езикова настройка и избор за cookie consent.',
          'Аналитика (Google Analytics 4) се зарежда на web само след приемане на analytics бисквитки в банера. Отказът държи GA4 изключен.',
          'Cookie изборът е отделен от приемане на Общи условия — виж Политика за бисквитките.',
        ],
      },
      {
        id: 'processors-hosting',
        title: 'Хостинг и subprocessors (текущо срещу планирано)',
        paragraphs: [
          'Текуща бета инфраструктура (според конфигурацията): приложение и PostgreSQL на Hetzner VPS; медийни файлове в Hetzner Object Storage (EU nbg1) при S3 storage; Redis; SMTP имейл.',
          'Карти: Google Maps API може да се зарежда на web карти — subject to Google terms.',
          'Планирано (не е live): миграция към AWS; Evrotrust/Vault; допълнителни payment/KYC процесори — само след договор.',
          'Вижте страницата Subprocessors за таблица.',
        ],
      },
      {
        id: 'ocr',
        title: 'OCR на документи (текущо)',
        paragraphs: [
          'Има frontend hooks за сканиране на регистрационен документ; автоматичен OCR не е гарантиран активен в бета. Третирайте качените файлове като ваши.',
        ],
      },
      {
        id: 'retention-deletion',
        title: 'Съхранение, изтриване на акаунт и legal hold (принципи)',
        paragraphs: [
          'Оперативни backups: има скриптове; автоматични retention purge jobs в приложението не са пълноценно имплементирани.',
          'Изтриване на акаунт (клиент): потвърдено с парола изтриване анонимизира потребителя, изчиства PII, деактивира токени, revoke на grants и owner-orphaned ПС с запазване на VIN/история.',
          'Фактури, данъчни записи, dispute evidence, security logs и shop архиви могат да се запазят след изтриване, където законът изисква.',
          'Legal hold: ръчен ops процес (placeholder) — няма автоматизиран UI в бета.',
        ],
      },
      {
        id: 'dsar',
        title: 'Вашите права и DSAR контакт (текущ процес)',
        lawyerReview: true,
        paragraphs: [
          'Според приложимото право може да имате права на достъп, коригиране, изтриване, ограничаване, преносимост и възражение.',
          'За упражняване на права пишете на [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER] с достатъчно данни за идентификация. Може да поискаме верификация.',
          'Автоматичен self-service export не е наличен в текущата бета.',
        ],
      },
      {
        id: 'security',
        title: 'Мерки за сигурност (общо)',
        paragraphs: [
          'HTTPS, автентикиран API достъп, role-based permissions, protected media downloads и security event logging са в употреба.',
          'Докладвайте инциденти на [SECURITY_CONTACT_PLACEHOLDER].',
        ],
      },
      {
        id: 'changes',
        title: 'Промени в политиката',
        paragraphs: [
          'Актуализираме версията и датата при съществени промени. Съществени промени може да изискват повторно приемане, когато formal acceptance система бъде имплементирана (не е активна в бета).',
        ],
      },
      {
        id: 'lawyer-review',
        title: 'Статус на чернова',
        paragraphs: [
          'Секции, маркирани за правен преглед, трябва да бъдат потвърденени от адвокат преди production разчитане. Този документ е техническо-поведенческа чернова, не правен съвет.',
        ],
      },
    ],
  },
};

export default privacy;

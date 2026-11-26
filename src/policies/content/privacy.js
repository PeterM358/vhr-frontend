/** @typedef {{ id: string, title: string, paragraphs?: string[], bullets?: string[], lawyerReview?: boolean }} PolicySection */

/** @typedef {{ title: string, sections: PolicySection[] }} PolicyLocaleContent */

/** @typedef {{ key: string, slug: string, version: string, effectiveDate: string, status: 'draft-beta' | 'published', leadingLanguage: 'en' | 'bg', en: PolicyLocaleContent, bg: PolicyLocaleContent }} PolicyDocument */

/** @type {PolicyDocument} */
const privacy = {
  key: 'privacy',
  slug: 'privacy',
  version: '1.2.0',
  effectiveDate: '2026-11-26',
  status: 'published',
  leadingLanguage: 'en',
  en: {
    title: 'Privacy Policy',
    sections: [
      {
        id: 'intro',
        title: '1. Introduction',
        paragraphs: [
          'This Privacy Policy explains how Veversal EOOD (“Veversal”, “we”, “us”) collects, uses, stores, and shares personal data when you use the Veversal website, mobile applications, and related services (the “Service”).',
          'By using the Service you acknowledge this Policy. For questions: contact@veversal.com.',
        ],
      },
      {
        id: 'controller',
        title: '2. Data controller',
        paragraphs: [
          'Controller: Veversal EOOD (ВИВЪРСАЛ ЕООД), Sofia, ul. Zlaten Klas 623, 20, Bulgaria.',
          'Privacy contact: contact@veversal.com.',
          'This Policy is governed by the laws of the Republic of Bulgaria and the EU General Data Protection Regulation (GDPR) where applicable.',
        ],
      },
      {
        id: 'scope',
        title: '3. Who this applies to',
        paragraphs: [
          'We process data for vehicle owners (Clients), service centers (Partners / Shops), and business Organizations using fleet or membership features.',
          'Your role determines which data you provide and which tools you can access. Partners remain responsible for how they handle their own end-customer relationships outside Veversal.',
        ],
      },
      {
        id: 'registration-auth',
        title: '4. Account and authentication',
        paragraphs: [
          'You may register with email and/or phone and a password. After sign-in we issue access and refresh tokens so you stay authenticated.',
          'Email-based accounts require email verification. Password reset uses time-limited links sent by email.',
          'Security-related events (sign-in attempts, password changes) may be logged with IP address and browser or app identifiers.',
        ],
      },
      {
        id: 'client-data',
        title: '5. Client and vehicle data',
        paragraphs: [
          'Client profiles may include display preferences, location hints, language, notification settings, and optional billing identity fields for invoices you request.',
          'Vehicles may include registration plate, VIN or chassis identifiers, make/model/year, mileage, photos, and documents (for example insurance or technical inspection).',
          'Reminders and obligation dates may be entered manually. Archived vehicles remain with reduced visibility; account deletion does not always erase vehicle identity needed for service-history integrity (see section 13).',
        ],
      },
      {
        id: 'shop-partner-data',
        title: '6. Service-center (Partner) data',
        paragraphs: [
          'Shop profiles may include business identity, address, location, services, opening hours, staff memberships, and subscription status.',
          'Operational data may include repairs, offers, messages, parts usage, invoices, promotions, complaints, and imported documents where enabled.',
          'Ending a Subscription does not automatically delete historical repair or invoice records.',
        ],
      },
      {
        id: 'organization-data',
        title: '7. Organization and fleet data',
        paragraphs: [
          'Organizations may own fleet vehicles, invite members by email link, and assign organization roles.',
          'Fleet register imports (for example spreadsheet uploads) process the rows you provide; import logs may keep row-level messages for support.',
          'Organization data is isolated from other organizations by application access controls.',
        ],
      },
      {
        id: 'access-sharing',
        title: '8. Sharing with workshops',
        paragraphs: [
          'Vehicle owners control which service centers can access vehicle details through sharing, grants, or booking/repair context.',
          'Workshops generally retain visibility of repairs they performed after a grant ends, within job-scoped rules.',
          'Grant and revoke actions may be recorded in audit logs.',
        ],
      },
      {
        id: 'workforce',
        title: '9. Workforce data',
        paragraphs: [
          'Where workforce features are used, we may store operational display names, assignments, and rates linked to shop membership.',
          'Do not upload sensitive national-ID scans or similar HR documents unless the product expressly supports that vault and you have a lawful basis.',
        ],
      },
      {
        id: 'reviews-complaints-promotions',
        title: '10. Reviews, complaints, and communications',
        paragraphs: [
          'Clients may leave shop reviews; shops may publish responses on public profiles where enabled.',
          'Complaints workflows store case details and messages between entitled parties.',
          'Email and push preferences are stored per account. Device tokens are stored to deliver push notifications you allow at the operating-system level.',
        ],
      },
      {
        id: 'cookies-analytics',
        title: '11. Cookies and analytics',
        paragraphs: [
          'Necessary storage includes session tokens, language preference, and your cookie-consent choice.',
          'Google Analytics 4 loads on the website only after you accept analytics cookies. Rejecting analytics keeps it disabled.',
          'Details are in the Cookie Policy. Cookie consent is not the same as accepting the Terms of Use.',
        ],
      },
      {
        id: 'processors-hosting',
        title: '12. Hosting, payments, and subprocessors',
        paragraphs: [
          'We use infrastructure and service providers to operate Veversal, including hosting, databases, object storage, email delivery, maps, analytics (with consent), push notifications, and payment operators.',
          'Payment operators for Subscriptions may include Stripe (cards), your bank for transfers, and ePay.bg / EasyPay for cash-desk or ATM codes. They process payment data under their own terms; Veversal remains the seller of the software Subscription.',
          'A current list is published on the Subprocessors page.',
        ],
      },
      {
        id: 'retention-deletion',
        title: '13. Retention and account deletion',
        paragraphs: [
          'We keep personal data only as long as needed for the Service, legal obligations, disputes, and security.',
          'Client account deletion (where offered, with password confirmation) anonymises the user record, clears client profile personal data, disables tokens and notifications, and revokes vehicle grants, while preserving vehicle identifiers and history needed for service integrity where required.',
          'Invoices, tax records, security logs, and shop operational archives may be retained after deletion where law or legitimate interest requires.',
        ],
      },
      {
        id: 'dsar',
        title: '14. Your rights',
        paragraphs: [
          'Depending on applicable law you may have rights of access, rectification, erasure, restriction, portability, and objection, and the right to lodge a complaint with a supervisory authority.',
          'To exercise rights, email contact@veversal.com with enough detail to identify your account. We may request verification.',
        ],
      },
      {
        id: 'security',
        title: '15. Security',
        paragraphs: [
          'We use HTTPS, authenticated API access, role-based permissions, protected media downloads, and security logging.',
          'No system is perfectly secure. Report suspected incidents to contact@veversal.com with subject “Security”.',
        ],
      },
      {
        id: 'changes',
        title: '16. Changes',
        paragraphs: [
          'We may update this Policy. The version and effective date above will change when we do. Continued use after the new effective date means you acknowledge the updated Policy, without prejudice to mandatory rights you cannot waive.',
        ],
      },
    ],
  },
  bg: {
    title: 'Политика за поверителност',
    sections: [
      {
        id: 'intro',
        title: '1. Въведение',
        paragraphs: [
          'Настоящата Политика за поверителност обяснява как „ВИВЪРСАЛ“ ЕООД („Veversal“, „ние“) събира, използва, съхранява и споделя лични данни, когато ползвате уебсайта, мобилните приложения и свързаните услуги на Veversal („Услугата“).',
          'С ползването на Услугата потвърждавате запознаване с тази Политика. За въпроси: contact@veversal.com.',
        ],
      },
      {
        id: 'controller',
        title: '2. Администратор на данни',
        paragraphs: [
          'Администратор: „ВИВЪРСАЛ“ ЕООД (Veversal EOOD), София, ул. Златен клас 623, 20, България.',
          'Контакт за поверителност: contact@veversal.com.',
          'Политиката се урежда от правото на Република България и Общия регламент относно защитата на данните (GDPR), където е приложим.',
        ],
      },
      {
        id: 'scope',
        title: '3. За кого важи',
        paragraphs: [
          'Обработваме данни за собственици на МПС (Клиенти), сервизни центрове (Партньори / Сервизи) и бизнес Организации с функции за автопарк или членства.',
          'Ролята ви определя кои данни предоставяте и към кои инструменти имате достъп. Партньорите остават отговорни за отношенията си с крайните клиенти извън Veversal.',
        ],
      },
      {
        id: 'registration-auth',
        title: '4. Акаунт и автентикация',
        paragraphs: [
          'Можете да се регистрирате с имейл и/или телефон и парола. След вход издаваме токени за достъп и обновяване, за да останете влезли.',
          'Акаунтите с имейл изискват потвърждение по имейл. Нулирането на парола използва времево ограничени връзки.',
          'Събития, свързани със сигурността (опити за вход, смяна на парола), могат да се записват с IP адрес и идентификатори на браузър или приложение.',
        ],
      },
      {
        id: 'client-data',
        title: '5. Данни за клиенти и МПС',
        paragraphs: [
          'Клиентските профили могат да включват предпочитания за показване, насоки за локация, език, настройки за известия и по избор данни за фактуриране.',
          'Превозните средства могат да включват регистрационен номер, VIN или идентификатори на шаси, марка/модел/година, пробег, снимки и документи (напр. застраховка или ГТП).',
          'Напомняния и срокове могат да се въвеждат ръчно. Архивираните МПС остават с намалена видимост; изтриването на акаунт не винаги премахва идентичността на МПС, нужна за целостта на сервизната история (виж т. 13).',
        ],
      },
      {
        id: 'shop-partner-data',
        title: '6. Данни за сервизи (партньори)',
        paragraphs: [
          'Профилите на сервизи могат да включват фирмена идентичност, адрес, локация, услуги, работно време, членства на персонал и статус на абонамент.',
          'Оперативните данни могат да включват ремонти, оферти, съобщения, части, фактури, промоции, оплаквания и импортирани документи, където е включено.',
          'Краят на абонамент не изтрива автоматично исторически ремонти или фактури.',
        ],
      },
      {
        id: 'organization-data',
        title: '7. Данни за организации и автопарк',
        paragraphs: [
          'Организациите могат да притежават МПС в автопарк, да канят членове по имейл връзка и да задават организационни роли.',
          'Импортът на регистри (напр. електронни таблици) обработва качените редове; логовете могат да пазят съобщения по редове за поддръжка.',
          'Данните на организацията са изолирани от други организации чрез контрол на достъпа в приложението.',
        ],
      },
      {
        id: 'access-sharing',
        title: '8. Споделяне със сервизи',
        paragraphs: [
          'Собствениците контролират кои сервизи виждат данните за МПС чрез споделяне, упълномощаване или контекст на резервация/ремонт.',
          'Сервизите обикновено запазват видимост върху ремонтите, които са извършили, след край на упълномощаването, в рамките на правилата по поръчка.',
          'Действията по предоставяне и отнемане на достъп могат да се записват в одитни дневници.',
        ],
      },
      {
        id: 'workforce',
        title: '9. Данни за персонал',
        paragraphs: [
          'Когато се ползват функции за персонал, можем да съхраняваме оперативни имена за показване, назначения и ставки, свързани с членство в сервиза.',
          'Не качвайте чувствителни сканирани лични документи, освен ако продуктът изрично поддържа такова хранилище и имате правно основание.',
        ],
      },
      {
        id: 'reviews-complaints-promotions',
        title: '10. Отзиви, оплаквания и комуникации',
        paragraphs: [
          'Клиентите могат да оставят отзиви; сервизите могат да публикуват отговори на публични профили, където е включено.',
          'Оплакванията съхраняват детайли по случая и съобщения между страните с право на достъп.',
          'Предпочитанията за имейл и насочени известия се пазят по акаунт. Токени на устройства се пазят за известия, които разрешавате на ниво операционна система.',
        ],
      },
      {
        id: 'cookies-analytics',
        title: '11. Бисквитки и аналитика',
        paragraphs: [
          'Необходимото съхранение включва сесийни токени, езикова настройка и вашия избор за бисквитки.',
          'Google Analytics 4 се зарежда в сайта само след приемане на аналитични бисквитки. При отказ аналитиката остава изключена.',
          'Подробностите са в Политиката за бисквитките. Съгласието за бисквитки не е приемане на Общите условия.',
        ],
      },
      {
        id: 'processors-hosting',
        title: '12. Хостинг, плащания и подизпълнители',
        paragraphs: [
          'Ползваме инфраструктура и доставчици за работата на Veversal, включително хостинг, бази данни, обектно хранилище, имейл, карти, аналитика (със съгласие), насочени известия и платежни оператори.',
          'За абонаменти платежните оператори могат да включват Stripe (карти), вашата банка при превод и ePay.bg / EasyPay за код на каса или банкомат. Те обработват платежни данни по свои условия; Veversal остава продавач на софтуерния абонамент.',
          'Актуален списък е публикуван на страницата „Подизпълнители“.',
        ],
      },
      {
        id: 'retention-deletion',
        title: '13. Съхранение и изтриване на акаунт',
        paragraphs: [
          'Съхраняваме лични данни само докато са нужни за Услугата, законови задължения, спорове и сигурност.',
          'Изтриването на клиентски акаунт (където е налично, с потвърждение с парола) анонимизира записа, изчиства личните данни в профила, деактивира токени и известия и отнема споделянията, като запазва идентификатори и история на МПС, нужни за целостта на сервизната история, където е необходимо.',
          'Фактури, данъчни записи, дневници за сигурност и оперативни архиви на сервиза могат да се запазят след изтриване, когато законът или легитимният интерес го изискват.',
        ],
      },
      {
        id: 'dsar',
        title: '14. Вашите права',
        paragraphs: [
          'Според приложимото право може да имате права на достъп, коригиране, изтриване, ограничаване, преносимост и възражение, както и право да подадете жалба до надзорен орган.',
          'За упражняване на права пишете на contact@veversal.com с достатъчно данни за идентификация на акаунта. Може да поискаме потвърждение на самоличност.',
        ],
      },
      {
        id: 'security',
        title: '15. Сигурност',
        paragraphs: [
          'Използваме HTTPS, автентикиран достъп до API, права според роли, защитено сваляне на медия и дневници за сигурност.',
          'Няма напълно защитена система. Докладвайте съмнения за инциденти на contact@veversal.com с тема „Security“.',
        ],
      },
      {
        id: 'changes',
        title: '16. Промени',
        paragraphs: [
          'Можем да актуализираме тази Политика. Версията и датата по-горе се променят при това. Продължаването на ползването след новата дата означава, че сте запознати с актуализираната Политика, без да се засягат императивни права, от които не можете да се откажете.',
        ],
      },
    ],
  },
};

export default privacy;

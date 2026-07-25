/** @type {import('./privacy').default extends infer T ? T : never} */
const terms = {
  key: 'terms',
  slug: 'terms',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Terms of Use',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta service notice',
        paragraphs: [
          'These Terms apply to the Veversal beta preview. The service may change, be interrupted, or be withdrawn without notice.',
          'Do not use beta as your only record of agreements or uploaded documents. Production terms will supersede this draft after legal sign-off.',
        ],
      },
      {
        id: 'provider',
        title: 'Service provider (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'Provider (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER], [REGISTERED_ADDRESS_PLACEHOLDER], [EIK_PLACEHOLDER]. Contact: [SUPPORT_EMAIL_PLACEHOLDER].',
          'Governing law (placeholder): [JURISDICTION_PLACEHOLDER].',
        ],
      },
      {
        id: 'acceptance',
        title: 'Acceptance (current gap)',
        paragraphs: [
          'Current beta: creating an account does not yet record a cryptographically versioned acceptance of these Terms in the backend. Continued use implies agreement only for preview purposes until a formal acceptance flow is implemented.',
          'Cookie/analytics consent is handled separately via the cookie banner — not as Terms acceptance.',
        ],
        lawyerReview: true,
      },
      {
        id: 'eligibility',
        title: 'Eligibility and accounts',
        paragraphs: [
          'You must provide accurate registration details and keep credentials confidential. You are responsible for activity under your account.',
          'One person may hold client, shop, and organization roles where the product allows; permissions are enforced separately per context.',
        ],
      },
      {
        id: 'client-use',
        title: 'Client use',
        paragraphs: [
          'You may register vehicles, request service, log service history, manage documents/reminders, and share access with service centers you choose.',
          'You must not upload unlawful content or impersonate others. You remain responsible for vehicle data accuracy you enter.',
        ],
      },
      {
        id: 'partner-use',
        title: 'Service center / partner use',
        paragraphs: [
          'Partners manage public listings, respond to requests, perform repairs, issue invoices where enabled, and operate within subscription entitlements.',
          'You must not access customer vehicle data without an active grant/authorization. Misuse may lead to suspension (process placeholder).',
        ],
      },
      {
        id: 'organization-use',
        title: 'Organization / fleet use (current beta)',
        paragraphs: [
          'Organization administrators may import fleet registers, manage organization-owned vehicles, and invite members via tokenized links.',
          'Invited members accept organization roles through the membership invite flow; administrators are responsible for invite distribution.',
        ],
      },
      {
        id: 'content-license',
        title: 'Your content and our license',
        paragraphs: [
          'You retain ownership of content you upload. You grant Veversal a limited license to host, process, and display it solely to operate the service features you use.',
        ],
        lawyerReview: true,
      },
      {
        id: 'availability',
        title: 'Availability and changes',
        paragraphs: [
          'Beta is provided “as is” without uptime guarantees. Features marked planned in documentation are not contractual commitments.',
        ],
      },
      {
        id: 'termination',
        title: 'Suspension and account deletion',
        paragraphs: [
          'You may delete a client account in profile settings (password confirmation). Shops and organizations should contact support for closure workflows (placeholder).',
          'We may suspend access for abuse, legal requirement, or security — notification process placeholder.',
        ],
      },
      {
        id: 'liability',
        title: 'Disclaimer and liability (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'Liability caps, warranty disclaimers, and dispute resolution clauses require lawyer-drafted text — [LIABILITY_CLAUSE_PLACEHOLDER].',
        ],
      },
      {
        id: 'related',
        title: 'Related policies',
        paragraphs: [
          'Privacy Policy, Cookie Policy, Partner Terms (if you operate a service center or organization), and Subprocessors list apply alongside these Terms.',
        ],
      },
    ],
  },
  bg: {
    title: 'Условия за ползване',
    sections: [
      {
        id: 'beta-notice',
        title: 'Уведомление за бета услуга',
        paragraphs: [
          'Тези Условия се отнасят до бета прегледа на Veversal. Услугата може да се променя, прекъсва или прекратява без предизвестие.',
          'Не използвайте бета като единствен запис на споразумения или качени документи. Production условия ще заменят тази чернова след правен sign-off.',
        ],
      },
      {
        id: 'provider',
        title: 'Доставчик на услугата (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'Доставчик (placeholder): [LEGAL_ENTITY_NAME_PLACEHOLDER], [REGISTERED_ADDRESS_PLACEHOLDER], [EIK_PLACEHOLDER]. Контакт: [SUPPORT_EMAIL_PLACEHOLDER].',
          'Приложимо право (placeholder): [JURISDICTION_PLACEHOLDER].',
        ],
      },
      {
        id: 'acceptance',
        title: 'Приемане (текущ пропуск)',
        paragraphs: [
          'Текуща бета: създаването на акаунт все още не записва версионирано приемане на Условията в backend. Продължителното ползване означава съгласие само за preview, докато не има formal acceptance flow.',
          'Cookie/analytics съгласието е отделно чрез cookie банера — не като приемане на Условия.',
        ],
        lawyerReview: true,
      },
      {
        id: 'eligibility',
        title: 'Допустимост и акаунти',
        paragraphs: [
          'Трябва да предоставите точни регистрационни данни и да пазите credentials. Отговорни сте за дейност под акаунта си.',
          'Един човек може да има client, shop и organization роли, където продуктът позволява; permissions се прилагат отделно.',
        ],
      },
      {
        id: 'client-use',
        title: 'Ползване като клиент',
        paragraphs: [
          'Можете да регистрирате ПС, заявявате сервиз, водите история, управлявате документи/напомняния и споделяте достъп с избрани сервизи.',
          'Не качвайте незаконно съдържание и не се представяйте за други. Отговорни сте за точността на въведените данни.',
        ],
      },
      {
        id: 'partner-use',
        title: 'Ползване като сервиз / partner',
        paragraphs: [
          'Partners управляват публични профили, отговарят на заявки, извършват ремонти, издават фактури където е включено, в рамките на абонамент.',
          'Не достъпвайте данни на клиент без активен grant. Злоупотреба може да доведе до suspension (процес placeholder).',
        ],
      },
      {
        id: 'organization-use',
        title: 'Organization / fleet (текуща бета)',
        paragraphs: [
          'Администраторите могат да импортират fleet регистри, управляват organization-owned ПС и канят членове чрез tokenized връзки.',
          'Поканените приемат роли чрез membership invite flow; администраторите отговарят за разпространението на покани.',
        ],
      },
      {
        id: 'content-license',
        title: 'Вашето съдържание и нашият лиценз',
        paragraphs: [
          'Запазвате собствеността върху каченото съдържание. Предоставяте на Veversal ограничен лиценз да го хоства и обработва само за работа на функциите, които ползвате.',
        ],
        lawyerReview: true,
      },
      {
        id: 'availability',
        title: 'Наличност и промени',
        paragraphs: [
          'Бета се предоставя „as is“ без гаранции за uptime. Планирани функции в документацията не са договорно задължение.',
        ],
      },
      {
        id: 'termination',
        title: 'Suspension и изтриване',
        paragraphs: [
          'Клиентите могат да изтрият акаунт от профила (потвърждение с парола). Shops/organizations — свържете се с support (placeholder).',
          'Можем да suspend-нем достъп при abuse, правно изискване или security — notification process placeholder.',
        ],
      },
      {
        id: 'liability',
        title: 'Отказ от отговорност (placeholder)',
        lawyerReview: true,
        paragraphs: [
          'Лимити на отговорност, warranty disclaimers и dispute resolution изискват адвокатски текст — [LIABILITY_CLAUSE_PLACEHOLDER].',
        ],
      },
      {
        id: 'related',
        title: 'Свързани политики',
        paragraphs: [
          'Политика за поверителност, Политика за бисквитки, Partner Terms (ако оперирате сервиз/организация) и Subprocessors се прилагат заедно с тези Условия.',
        ],
      },
    ],
  },
};

export default terms;

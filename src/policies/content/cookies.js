const cookies = {
  key: 'cookies',
  slug: 'cookies',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Cookie Policy',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta notice',
        paragraphs: [
          'This Cookie Policy describes the current beta web behaviour. Native apps may use device storage instead of browser cookies for the same purposes where applicable.',
        ],
      },
      {
        id: 'what-are-cookies',
        title: 'What we use',
        paragraphs: [
          'Cookies and similar technologies include browser cookies, localStorage, and sessionStorage used on veversal.com web.',
        ],
      },
      {
        id: 'necessary',
        title: 'Strictly necessary (always on)',
        bullets: [
          'Authentication session tokens (JWT storage keys) to keep you signed in.',
          'Locale/language preference.',
          'Cookie consent choice itself (so we do not re-prompt every visit).',
          'Security and routing state required for the SPA to function.',
        ],
      },
      {
        id: 'analytics',
        title: 'Analytics cookies (optional — current)',
        paragraphs: [
          'Google Analytics 4 (GA4) is loaded on web only after you click Accept in the cookie banner or enable analytics in Manage preferences.',
          'If you Reject, GA4 does not initialize. You can change your choice by clearing site data or when we expose a preference centre link (planned UX improvement).',
        ],
      },
      {
        id: 'marketing',
        title: 'Marketing cookies',
        paragraphs: [
          'Current beta: no third-party advertising cookies are intentionally loaded. Promotion emails are separate from browser cookies (see mailing preferences).',
        ],
      },
      {
        id: 'maps',
        title: 'Maps and embedded services',
        paragraphs: [
          'Google Maps may set its own cookies when map views load. These are governed by Google policies in addition to our banner where applicable.',
        ],
      },
      {
        id: 'manage',
        title: 'How to manage cookies',
        bullets: [
          'Use the on-site cookie banner (Accept / Reject / Manage).',
          'Use browser settings to block or delete cookies.',
          'Note: blocking necessary storage will prevent sign-in.',
        ],
      },
      {
        id: 'separate-from-terms',
        title: 'Separate from Terms acceptance',
        paragraphs: [
          'Cookie consent records your analytics preference only. It is not a substitute for accepting Terms of Use when that flow is implemented.',
        ],
      },
      {
        id: 'contact',
        title: 'Contact',
        lawyerReview: true,
        paragraphs: ['Questions: [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER]'],
      },
    ],
  },
  bg: {
    title: 'Политика за бисквитките',
    sections: [
      {
        id: 'beta-notice',
        title: 'Бета уведомление',
        paragraphs: [
          'Тази политика описва текущото web поведение в бета. Native приложенията могат да използват device storage вместо browser cookies за същите цели.',
        ],
      },
      {
        id: 'what-are-cookies',
        title: 'Какво използваме',
        paragraphs: [
          'Бисквитки и подобни технологии включват browser cookies, localStorage и sessionStorage на veversal.com web.',
        ],
      },
      {
        id: 'necessary',
        title: 'Строго необходими (винаги включени)',
        bullets: [
          'Session токени за автентикация (JWT storage keys).',
          'Езикова настройка.',
          'Запис на cookie consent избора.',
          'Security и routing state, нужни за SPA.',
        ],
      },
      {
        id: 'analytics',
        title: 'Analytics бисквитки (по избор — текущо)',
        paragraphs: [
          'Google Analytics 4 (GA4) се зарежда на web само след Accept в cookie банера или включване в Manage preferences.',
          'При Reject GA4 не се инициализира.',
        ],
      },
      {
        id: 'marketing',
        title: 'Marketing бисквитки',
        paragraphs: [
          'Текуща бета: няма умишлено заредени third-party advertising cookies. Promotion имейлите са отделно от browser cookies.',
        ],
      },
      {
        id: 'maps',
        title: 'Карти и embedded услуги',
        paragraphs: [
          'Google Maps може да задава собствени бисквитки при зареждане на карти — subject to Google policies.',
        ],
      },
      {
        id: 'manage',
        title: 'Управление на бисквитки',
        bullets: [
          'Използвайте cookie банера (Accept / Reject / Manage).',
          'Настройки на браузъра за блокиране/изтриване.',
          'Блокирането на necessary storage ще попречи на вход.',
        ],
      },
      {
        id: 'separate-from-terms',
        title: 'Отделно от приемане на Условия',
        paragraphs: [
          'Cookie consent записва само analytics preference. Не замества приемане на Условия за ползване, когато този flow бъде имплементиран.',
        ],
      },
      {
        id: 'contact',
        title: 'Контакт',
        lawyerReview: true,
        paragraphs: ['Въпроси: [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER]'],
      },
    ],
  },
};

export default cookies;

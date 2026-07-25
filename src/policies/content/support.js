const support = {
  key: 'support',
  slug: 'support',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Support',
    sections: [
      {
        id: 'beta-notice',
        title: 'Beta support',
        paragraphs: [
          'Veversal beta support is best-effort. Response times and channels may change before production launch.',
        ],
      },
      {
        id: 'contact',
        title: 'Contact (placeholders)',
        lawyerReview: true,
        bullets: [
          'General support: [SUPPORT_EMAIL_PLACEHOLDER]',
          'Privacy / data requests: [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER]',
          'Security incidents: [SECURITY_CONTACT_PLACEHOLDER]',
          'Partner billing (subscriptions): [PARTNER_BILLING_EMAIL_PLACEHOLDER]',
        ],
      },
      {
        id: 'hours',
        title: 'Hours and languages',
        paragraphs: [
          'Support hours (placeholder): [SUPPORT_HOURS_PLACEHOLDER].',
          'We aim to respond in Bulgarian and English for beta testers.',
        ],
      },
      {
        id: 'what-to-include',
        title: 'What to include in your message',
        bullets: [
          'Account email or phone (never send your password).',
          'Whether you are a client, service center, or organization user.',
          'Screenshots and approximate time if reporting a bug.',
          'For fleet import issues: organization name and import batch time.',
        ],
      },
      {
        id: 'self-service',
        title: 'Self-service (current)',
        bullets: [
          'Password reset via forgot-password flow.',
          'Email verification resend from account settings where shown.',
          'Client account deletion from profile danger zone.',
          'Cookie/analytics preferences via web cookie banner.',
        ],
      },
      {
        id: 'not-support',
        title: 'Out of scope for beta support',
        paragraphs: [
          'Legal advice, tax filing, or emergency roadside assistance.',
          'Data subject requests may require identity verification — allow extra time.',
        ],
      },
      {
        id: 'policies',
        title: 'Policies and documentation',
        paragraphs: [
          'See Privacy Policy, Terms of Use, Cookie Policy, Partner Terms, DPA placeholder, and Subprocessors for data handling details.',
        ],
      },
    ],
  },
  bg: {
    title: 'Поддръжка',
    sections: [
      {
        id: 'beta-notice',
        title: 'Бета поддръжка',
        paragraphs: [
          'Поддръжката за Veversal beta е best-effort. Сроковете и каналите могат да се променят преди production.',
        ],
      },
      {
        id: 'contact',
        title: 'Контакт (placeholders)',
        lawyerReview: true,
        bullets: [
          'Обща поддръжка: [SUPPORT_EMAIL_PLACEHOLDER]',
          'Поверителност / data requests: [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER]',
          'Security инциденти: [SECURITY_CONTACT_PLACEHOLDER]',
          'Partner billing: [PARTNER_BILLING_EMAIL_PLACEHOLDER]',
        ],
      },
      {
        id: 'hours',
        title: 'Работно време и езици',
        paragraphs: [
          'Работно време (placeholder): [SUPPORT_HOURS_PLACEHOLDER].',
          'Стремим се да отговаряме на български и английски за beta testers.',
        ],
      },
      {
        id: 'what-to-include',
        title: 'Какво да включите в съобщението',
        bullets: [
          'Имейл или телефон на акаунта (никога не изпращайте парола).',
          'Дали сте client, service center или organization user.',
          'Screenshots и приблизително време при bug report.',
          'При fleet import: име на организация и време на batch.',
        ],
      },
      {
        id: 'self-service',
        title: 'Self-service (текущо)',
        bullets: [
          'Password reset чрез forgot-password.',
          'Повторно изпращане на verification имейл от настройки.',
          'Изтриване на client акаунт от danger zone в профила.',
          'Cookie/analytics preferences чрез web банера.',
        ],
      },
      {
        id: 'not-support',
        title: 'Извън обхвата на beta поддръжка',
        paragraphs: [
          'Правни/данъчни консултации или пътна помощ при авария.',
          'DSAR заявки може да изискват верификация — очаквайте допълнително време.',
        ],
      },
      {
        id: 'policies',
        title: 'Политики и документация',
        paragraphs: [
          'Вижте Политика за поверителност, Условия, Cookie Policy, Partner Terms, DPA placeholder и Subprocessors.',
        ],
      },
    ],
  },
};

export default support;

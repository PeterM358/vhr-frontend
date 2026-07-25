const dpa = {
  key: 'dpa',
  slug: 'dpa',
  version: '0.1.0-beta',
  effectiveDate: '2026-07-25',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Data Processing Addendum (Placeholder)',
    sections: [
      {
        id: 'status',
        title: 'Document status',
        lawyerReview: true,
        paragraphs: [
          'This page is a structural placeholder for a GDPR Article 28 Data Processing Addendum between Veversal and business customers (service centers, organizations).',
          'It is not a signed contract. Do not rely on it for compliance until replaced with counsel-approved text and executed agreement.',
        ],
      },
      {
        id: 'roles',
        title: 'Roles (intended model)',
        paragraphs: [
          'Customer (Controller): the service center or organization determining purposes of processing customer/employee/vehicle data within their Veversal workspace.',
          'Veversal (Processor): hosts and processes data on documented instructions through the product APIs and admin tools.',
          'End vehicle owners may remain separate controllers for their personal vehicle data; sharing/grant flows document authorization.',
        ],
      },
      {
        id: 'subject-matter',
        title: 'Subject matter and duration (draft outline)',
        bullets: [
          'Subject matter: provision of Veversal SaaS for automotive service, fleet, and related workflows.',
          'Duration: term of the B2B subscription/agreement plus statutory retention where applicable.',
          'Nature and purpose: storage, display, messaging, invoicing, audit, backups — as enabled in the subscribed modules.',
        ],
        lawyerReview: true,
      },
      {
        id: 'subprocessors',
        title: 'Subprocessors',
        paragraphs: [
          'Authorized subprocessors are listed on the Subprocessors page. Material changes will follow notice procedures defined in the final DPA (placeholder: [SUBPROCESSOR_NOTICE_DAYS_PLACEHOLDER] days).',
        ],
      },
      {
        id: 'security',
        title: 'Security and breach notification (outline)',
        paragraphs: [
          'Technical and organizational measures are described at a high level in the Privacy Policy. Breach notification timelines and contact points require legal drafting — [BREACH_NOTIFICATION_PLACEHOLDER].',
        ],
        lawyerReview: true,
      },
      {
        id: 'execution',
        title: 'How to execute (placeholder)',
        paragraphs: [
          'Production customers will receive an executable DPA via [CONTRACT_PROCESS_PLACEHOLDER]. Beta testers: contact [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER] for roadmap only.',
        ],
      },
    ],
  },
  bg: {
    title: 'Споразумение за обработка на данни (Placeholder)',
    sections: [
      {
        id: 'status',
        title: 'Статус на документа',
        lawyerReview: true,
        paragraphs: [
          'Тази страница е структурен placeholder за GDPR Art. 28 DPA между Veversal и business customers (сервизи, организации).',
          'Не е подписан договор. Не разчитайте на него за compliance, докато не бъде заменен с одобрен от адвокат текст.',
        ],
      },
      {
        id: 'roles',
        title: 'Роли (предвиден модел)',
        paragraphs: [
          'Customer (Controller): сервизът или организацията, определяща целите на обработка в workspace.',
          'Veversal (Processor): хоства и обработва данни по документирани инструкции чрез продукта.',
          'Собствениците на ПС могат да останат отделни controllers; grant flows документират authorization.',
        ],
      },
      {
        id: 'subject-matter',
        title: 'Предмет и срок (outline)',
        bullets: [
          'Предмет: Veversal SaaS за automotive service, fleet и свързани workflows.',
          'Срок: B2B абонамент/договор плюс statutory retention.',
          'Характер и цел: storage, display, messaging, invoicing, audit, backups — според subscribed modules.',
        ],
        lawyerReview: true,
      },
      {
        id: 'subprocessors',
        title: 'Subprocessors',
        paragraphs: [
          'Authorized subprocessors са на страницата Subprocessors. Съществени промени ще следват notice procedures в финалния DPA (placeholder: [SUBPROCESSOR_NOTICE_DAYS_PLACEHOLDER] дни).',
        ],
      },
      {
        id: 'security',
        title: 'Сигурност и breach notification (outline)',
        paragraphs: [
          'TOM описани на високо ниво в Privacy Policy. Срокове и контакти изискват правен текст — [BREACH_NOTIFICATION_PLACEHOLDER].',
        ],
        lawyerReview: true,
      },
      {
        id: 'execution',
        title: 'Как се подписва (placeholder)',
        paragraphs: [
          'Production customers ще получат executable DPA чрез [CONTRACT_PROCESS_PLACEHOLDER]. Beta: [DPO_OR_PRIVACY_EMAIL_PLACEHOLDER] за roadmap.',
        ],
      },
    ],
  },
};

export default dpa;

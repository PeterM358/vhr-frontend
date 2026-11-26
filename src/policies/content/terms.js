/** @typedef {import('./privacy').PolicyDocument} PolicyDocument */

/** @type {PolicyDocument} */
const terms = {
  key: 'terms',
  slug: 'terms',
  version: '1.1.1',
  effectiveDate: '2026-11-26',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Terms of Use',
    sections: [
      {
        id: 'intro',
        title: '1. Introduction',
        paragraphs: [
          'These Terms of Use (“Terms”) govern access to and use of the Veversal platform — including the website, mobile applications, and related online services (together, the “Service”).',
          'By creating an account, signing in, or otherwise using the Service, you agree to these Terms and to the related policies listed below. If you do not agree, you must not use the Service.',
          'Veversal is operated by Veversal EOOD (ВИВЪРСАЛ ЕООД), a company registered in the Republic of Bulgaria (“Veversal”, “we”, “us”), with registered seat at: ul. Zlaten Klas 623, zh.k. 20-ti May, Sofia, Bulgaria. Contact for legal and support matters: contact@veversal.com.',
          'These Terms are provided in English and Bulgarian. For users in Bulgaria, the Bulgarian text prevails in case of conflict, unless a written agreement states otherwise.',
        ],
      },
      {
        id: 'definitions',
        title: '2. Definitions',
        paragraphs: [
          '“Client” means a natural or legal person using the Service primarily as a vehicle owner or customer of workshops.',
          '“Partner” or “Shop” means a service center or similar business using Veversal tools to manage workshops, bookings, repairs, and related operations.',
          '“Organization” means a business entity using fleet, membership, or ERP-oriented features for its vehicles and staff.',
          '“Subscription” means a paid plan (for example PRO or Premium) that unlocks Partner or Organization features for a defined billing period.',
        ],
      },
      {
        id: 'eligibility',
        title: '3. Eligibility and accounts',
        paragraphs: [
          'You must provide accurate registration information and keep your login credentials confidential. You are responsible for activity under your account, except where unauthorized use results from a security breach on our side that we failed to mitigate after becoming aware of it.',
          'One person may hold Client, Partner, and Organization roles where the product allows; access rights are enforced separately for each context.',
          'We may refuse, suspend, or limit an account if we reasonably believe the information is false, the account is used for abuse, or applicable law requires it.',
        ],
      },
      {
        id: 'service-description',
        title: '4. Description of the Service',
        paragraphs: [
          'Veversal provides software tools for vehicle lifecycle and workshop operations, which may include (depending on your role and plan): vehicle profiles and history, service requests and bookings, repair workflows, messaging, documents and reminders, public shop presence, invoicing helpers, workforce tools, and organization/fleet features.',
          'The Service is a software platform. Independent workshops remain responsible for the quality of their own repairs, parts, and customer contracts. Unless a specific screen states otherwise, Veversal is not the seller of workshop labour or spare parts to vehicle owners.',
          'Features marked as beta, preview, or planned in product documentation are not a contractual commitment to a particular roadmap or uptime level.',
        ],
      },
      {
        id: 'service-delivery',
        title: '5. How you receive the Service',
        paragraphs: [
          'After successful registration and sign-in, free Client features become available in the app and on the web according to the product configuration then in force.',
          'Partner and Organization paid features become available only after a Subscription is activated for the relevant shop or organization profile. Activation occurs when we confirm successful payment (see section 6) or when we grant a trial or complimentary access in writing or in-product.',
          'Upon activation, entitled features appear in the Partner or Organization interface for the paid period. We do not ship physical goods. Delivery of the Service is digital access to the platform.',
          'If payment is pending (for example an unpaid EasyPay code or bank transfer awaiting confirmation), the Subscription remains inactive or pending and paid features stay locked until payment is confirmed.',
        ],
      },
      {
        id: 'payment',
        title: '6. Payment for Subscriptions',
        paragraphs: [
          'Where a Subscription fee applies, prices, currency, and billing interval (monthly or annual) are shown before you confirm payment in the Payments / upgrade screens.',
          'Accepted payment methods (when enabled for your account) may include: (a) card payment via Stripe Checkout; (b) bank transfer to the IBAN and reference we display; (c) EasyPay cash-desk or ATM payment using a 10-digit payment code generated for your order through ePay.bg / EasyPay.',
          'Card payments: you complete checkout on Stripe’s pages. Stripe processes the card; Veversal EOOD remains the merchant of record for the software Subscription.',
          'Bank transfer: you pay the stated amount with the exact payment reference. The Subscription activates after we identify and reconcile the incoming payment.',
          'EasyPay: we register a bill with ePay.bg and show you a 10-digit code and expiry. You pay that code at an EasyPay office, compatible ATM (for example B-Pay), or other channel supported by EasyPay. The Subscription activates after ePay notifies us that the bill is paid (STATUS=PAID), or after our support manually confirms payment in exceptional cases.',
          'Until payment is confirmed, no paid entitlement is owed. An unpaid or expired EasyPay code or unmatched bank transfer does not create an active Subscription.',
          'Invoices for Subscription fees are issued by Veversal EOOD according to Bulgarian tax rules where applicable. Keep your billing details up to date in the product.',
        ],
      },
      {
        id: 'cancellation',
        title: '7. Cancellation, refusal of payment, and account closure',
        paragraphs: [
          'Pending payment you have not completed: you may simply not pay. EasyPay codes expire on the stated date; bank instructions become unused if no matching transfer arrives. No Subscription fee is due for an order you never paid.',
          'Active Subscription: you may cancel future renewals at any time from the Payments / subscription management screens when available, or by emailing contact@veversal.com from the email registered on the account. Cancellation stops further automatic charges or renewals; access normally continues until the end of the already paid period.',
          'Refunds and cooling-off rules for paid periods are set out in the Cancellation & Refund Policy.',
          'Client accounts may be deleted from profile settings (password confirmation) where that control is offered. Partner shops and Organizations should contact contact@veversal.com to request closure; historical repair and invoice records may be retained as required for legal and operational integrity, as described in the Privacy Policy.',
          'We may suspend or terminate access for material breach of these Terms, unlawful use, non-payment of amounts due, or security risk, after notice where reasonably practicable.',
        ],
      },
      {
        id: 'client-use',
        title: '8. Client use',
        paragraphs: [
          'Clients may register vehicles, request service, maintain service history, manage documents and reminders, and share access with workshops they choose.',
          'You must not upload unlawful content, infringe others’ rights, or impersonate another person. You are responsible for the accuracy of vehicle and identity data you enter.',
        ],
      },
      {
        id: 'partner-use',
        title: '9. Partner and Organization use',
        paragraphs: [
          'Partners and Organizations must use the Service in line with these Terms and the Business & Partner Terms, including rules on customer data, public listings, and Subscription entitlements.',
          'Access to customer or vehicle personal data is allowed only with a valid authorization or booking/repair context. Misuse may lead to suspension.',
        ],
      },
      {
        id: 'content-license',
        title: '10. Your content',
        paragraphs: [
          'You retain ownership of content you upload. You grant Veversal a limited, worldwide, non-exclusive licence to host, process, transmit, and display that content solely to operate the Service features you use and to comply with law.',
        ],
        lawyerReview: true,
      },
      {
        id: 'availability',
        title: '11. Availability and changes',
        paragraphs: [
          'We aim to keep the Service available but do not guarantee uninterrupted or error-free operation, especially during beta. Scheduled maintenance and emergency fixes may cause temporary downtime.',
          'We may modify features, interfaces, and these Terms. Material changes to Terms will be reflected by an updated effective date; continued use after the effective date constitutes acceptance for ongoing use, subject to mandatory consumer or B2B protections that cannot be waived.',
        ],
      },
      {
        id: 'liability',
        title: '12. Liability',
        lawyerReview: true,
        paragraphs: [
          'To the fullest extent permitted by applicable law, Veversal is not liable for indirect or consequential loss, lost profits, or loss of data arising from use of the Service, except where liability cannot be limited (for example, for wilful misconduct or mandatory statutory liability).',
          'Nothing in these Terms excludes liability that cannot be excluded under Bulgarian or European Union law.',
        ],
      },
      {
        id: 'law',
        title: '13. Governing law and disputes',
        lawyerReview: true,
        paragraphs: [
          'These Terms are governed by the laws of the Republic of Bulgaria, without prejudice to mandatory consumer protections that may apply if you are a consumer habitually resident in another EU Member State.',
          'Disputes shall first be addressed amicably via contact@veversal.com. Failing resolution, competent courts in Bulgaria shall have jurisdiction, subject to mandatory rules on consumer venue.',
        ],
      },
      {
        id: 'related',
        title: '14. Related policies',
        paragraphs: [
          'The Privacy Policy, Cookie Policy, Cancellation & Refund Policy, Business & Partner Terms (for shops and organizations), Support page, and Subprocessors list form part of the contractual framework together with these Terms.',
        ],
      },
    ],
  },
  bg: {
    title: 'Общи условия за ползване',
    sections: [
      {
        id: 'intro',
        title: '1. Въведение',
        paragraphs: [
          'Настоящите Общи условия („Условията“) уреждат достъпа до и ползването на платформата Veversal — включително уебсайта, мобилните приложения и свързаните онлайн услуги (заедно „Услугата“).',
          'Създавайки акаунт, влизайки в системата или по друг начин ползвайки Услугата, вие приемате тези Условия и свързаните политики по-долу. Ако не сте съгласни, не използвайте Услугата.',
          'Veversal се предоставя от „ВИВЪРСАЛ“ ЕООД (Veversal EOOD), дружество, регистрирано в Република България („Veversal“, „ние“), със седалище и адрес на управление: ул. Златен клас № 623, ж.к. 20-ти май, София, България. За правни и поддържащи въпроси: contact@veversal.com.',
          'Условията са налични на български и английски. За потребители в България при противоречие преобладава българският текст, освен ако писмено споразумение не предвижда друго.',
        ],
      },
      {
        id: 'definitions',
        title: '2. Определения',
        paragraphs: [
          '„Клиент“ е физическо или юридическо лице, което ползва Услугата основно като собственик на МПС или клиент на сервизи.',
          '„Партньор“ или „Сервиз“ е сервизен център или сходна фирма, която ползва инструментите на Veversal за управление на сервиз, резервации, ремонти и свързани процеси.',
          '„Организация“ е търговец, който ползва функции за автопарк, членства или ERP насочени към своите МПС и персонал.',
          '„Абонамент“ е платен план (например PRO или Premium), който отключва партньорски или организационни функции за определен период.',
        ],
      },
      {
        id: 'eligibility',
        title: '3. Допустимост и акаунти',
        paragraphs: [
          'Длъжни сте да предоставите точни регистрационни данни и да пазите поверителни данните си за вход. Отговаряте за дейността под акаунта си, освен при неоторизирано ползване вследствие на пробив от наша страна, който не сме овладели след като сме узнали за него.',
          'Едно лице може да има роли Клиент, Партньор и Организация, където продуктът позволява; правата на достъп се прилагат отделно за всеки контекст.',
          'Можем да откажем, ограничим или спрем акаунт, ако основателно считаме, че данните са неверни, акаунтът се ползва за злоупотреба или законът го изисква.',
        ],
      },
      {
        id: 'service-description',
        title: '4. Описание на Услугата',
        paragraphs: [
          'Veversal предоставя софтуерни инструменти за жизнения цикъл на МПС и за сервизна дейност, които според ролята и плана могат да включват: профили и история на МПС, заявки и резервации, работни потоци за ремонт, съобщения, документи и напомняния, публично присъствие на сервиз, помощни средства за фактуриране, инструменти за персонал и функции за организации/автопарк.',
          'Услугата е софтуерна платформа. Независимите сервизи остават отговорни за качеството на своите ремонти, части и договори с клиенти. Освен ако конкретен екран не посочва друго, Veversal не е продавач на труд или резервни части към собственици на МПС.',
          'Функции, означени като бета, преглед или планирани в документацията, не представляват договорно задължение за конкретен път на развитие или ниво на наличност.',
        ],
      },
      {
        id: 'service-delivery',
        title: '5. Как получавате Услугата',
        paragraphs: [
          'След успешна регистрация и вход безплатните клиентски функции стават налични в приложението и в уеб според текущата конфигурация на продукта.',
          'Платените партньорски и организационни функции стават достъпни едва след активиране на Абонамент за съответния сервиз или организация. Активирането настъпва при потвърдено успешно плащане (виж т. 6) или когато предоставим пробен/комплиментарен достъп писмено или в продукта.',
          'След активиране отключените функции се появяват в партньорския или организационния интерфейс за платения период. Не изпращаме физически стоки. Доставката на Услугата е цифров достъп до платформата.',
          'При чакащо плащане (например неплатен код за EasyPay или банков превод в очакване на потвърждение) Абонаментът остава неактивен или в изчакване и платените функции остават заключени до потвърждение на плащането.',
        ],
      },
      {
        id: 'payment',
        title: '6. Плащане на Абонаменти',
        paragraphs: [
          'Когато се дължи такса за Абонамент, цените, валутата и периодът (месечен или годишен) се показват преди да потвърдите плащането в екраните Плащания / надграждане.',
          'Приети начини на плащане (когато са включени за вашия акаунт) могат да бъдат: (а) карта чрез Stripe Checkout; (б) банков превод към IBAN и основание, които показваме; (в) плащане на каса EasyPay или банкомат с 10-цифрен код, генериран за вашата поръчка чрез ePay.bg / EasyPay.',
          'Картови плащания: завършвате плащането на страниците на Stripe. Stripe обработва картата; „ВИВЪРСАЛ“ ЕООД остава търговец за софтуерния Абонамент.',
          'Банков превод: превеждате посочената сума с точното платежно основание. Абонаментът се активира след като идентифицираме и равним постъпилото плащане.',
          'EasyPay: регистрираме задължение в ePay.bg и ви показваме 10-цифрен код и срок на валидност. Плащате кода в офис на EasyPay, съвместим банкомат (напр. B-Pay) или друг канал, поддържан от EasyPay. Абонаментът се активира след като ePay ни уведоми, че сметката е платена (STATUS=PAID), или след ръчно потвърждение от поддръжката в изключителни случаи.',
          'До потвърждение на плащането не възниква право на платен достъп. Неплатен или изтекъл код за EasyPay, както и несъпоставен банков превод, не създават активен Абонамент.',
          'Фактури за такси по Абонамент се издават от „ВИВЪРСАЛ“ ЕООД съгласно приложимите данъчни правила. Поддържайте актуални данните си за фактуриране в продукта.',
        ],
      },
      {
        id: 'cancellation',
        title: '7. Отказ, неплащане и затваряне на акаунт',
        paragraphs: [
          'Чакащо плащане, което не сте завършили: можете просто да не платите. Кодовете за EasyPay изтичат на посочената дата; банковите инструкции остават неизползвани, ако няма постъпил превод. Не се дължи такса за поръчка, която никога не сте платили.',
          'Активен Абонамент: можете да откажете бъдещи подновявания по всяко време от екраните Плащания / управление на абонамент, когато са налични, или с имейл до contact@veversal.com от имейла на акаунта. Отказът спира следващи автоматични таксувания или подновявания; достъпът обикновено продължава до края на вече платения период.',
          'Правилата за възстановяване на суми са в Политиката за отказ и възстановяване.',
          'Клиентски акаунти могат да се изтрият от настройките на профила (с потвърждение с парола), където тази опция е налична. Партньорски сервизи и Организации пишат на contact@veversal.com за затваряне; исторически записи за ремонти и фактури могат да се запазят според Политиката за поверителност.',
          'Можем да спрем или прекратим достъп при съществено нарушение на Условията, незаконно ползване, неплащане на дължими суми или риск за сигурността, след предизвестие когато е разумно осъществимо.',
        ],
      },
      {
        id: 'client-use',
        title: '8. Ползване като клиент',
        paragraphs: [
          'Клиентите могат да регистрират МПС, да заявяват сервиз, да водят история, да управляват документи и напомняния и да споделят достъп с избрани сервизи.',
          'Не качвайте незаконно съдържание, не нарушавайте чужди права и не се представяйте за друго лице. Отговаряте за точността на въведените данни за МПС и самоличност.',
        ],
      },
      {
        id: 'partner-use',
        title: '9. Ползване като партньор и организация',
        paragraphs: [
          'Партньорите и Организациите ползват Услугата съгласно тези Условия и Условията за бизнес и партньори, включително правилата за клиентски данни, публични профили и абонаментни права.',
          'Достъп до лични данни на клиенти или МПС е допустим само с валидно упълномощаване или в контекст на резервация/ремонт. Злоупотребата може да доведе до спиране на достъпа.',
        ],
      },
      {
        id: 'content-license',
        title: '10. Вашето съдържание',
        paragraphs: [
          'Запазвате собствеността върху каченото съдържание. Предоставяте на Veversal ограничен, световен, неексклузивен лиценз да го хоства, обработва, предава и показва единствено за работа на функциите, които ползвате, и за спазване на закона.',
        ],
        lawyerReview: true,
      },
      {
        id: 'availability',
        title: '11. Наличност и промени',
        paragraphs: [
          'Стремим се Услугата да е налична, но не гарантираме непрекъсната или безгрешна работа, особено в бета. Планирана поддръжка и спешни поправки могат да причинят временно прекъсване.',
          'Можем да променяме функции, интерфейси и тези Условия. Съществени промени се отразяват с актуализирана дата на влизане в сила; продължаването на ползването след тази дата означава приемане за последващо ползване, при спазване на императивни потребителски или B2B защити.',
        ],
      },
      {
        id: 'liability',
        title: '12. Отговорност',
        lawyerReview: true,
        paragraphs: [
          'В максимално допустимата от закона степен Veversal не носи отговорност за косвени или последващи вреди, пропуснати ползи или загуба на данни от ползването на Услугата, освен когато отговорността не може да се ограничи (напр. умисъл или императивна законова отговорност).',
          'Нищо в тези Условия не изключва отговорност, която не може да се изключи по българското или правото на ЕС.',
        ],
      },
      {
        id: 'law',
        title: '13. Приложимо право и спорове',
        lawyerReview: true,
        paragraphs: [
          'Условията се уреждат от правото на Република България, без да се засягат императивни потребителски защити, ако сте потребител с обичайно местопребиваване в друга държава — членка на ЕС.',
          'Споровете се решават първо чрез контакт@veversal.com. При липса на споразумение компетентни са българските съдилища, при спазване на императивните правила за подсъдност при потребители.',
        ],
      },
      {
        id: 'related',
        title: '14. Свързани политики',
        paragraphs: [
          'Политиката за поверителност, Политиката за бисквитки, Политиката за отказ и възстановяване, Условията за бизнес и партньори (за сервизи и организации), страницата Поддръжка и списъкът с подизпълнители са част от договорната рамка заедно с тези Условия.',
        ],
      },
    ],
  },
};

export default terms;

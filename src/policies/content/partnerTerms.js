const partnerTerms = {
  key: 'partner-terms',
  slug: 'partner-terms',
  version: '1.2.0',
  effectiveDate: '2026-11-26',
  status: 'published',
  leadingLanguage: 'en',
  en: {
    title: 'Business & Partner Terms',
    sections: [
      {
        id: 'intro',
        title: '1. Scope',
        paragraphs: [
          'These Business & Partner Terms (“Partner Terms”) supplement the Veversal Terms of Use for service centers (Partners / Shops) and business Organizations that use paid or operational Partner features.',
          'If there is a conflict on Subscription billing, payment methods, activation, or cancellation of Partner plans, these Partner Terms and the Cancellation & Refund Policy prevail over the general Terms for those topics.',
          'Provider: Veversal EOOD (ВИВЪРСАЛ ЕООД), Bulgaria. Registered seat: Sofia, ul. Zlaten Klas 623, 20, Bulgaria. Billing and contract contact: contact@veversal.com.',
        ],
      },
      {
        id: 'who',
        title: '2. Who these terms apply to',
        paragraphs: [
          'Owners and authorised staff of workshops using the Partner dashboard, Subscriptions, invoicing helpers, promotions, workforce tools, complaints, and related features.',
          'Organization administrators and members using fleet import, organization networks, membership invites, and related ERP-oriented tools.',
          'By enabling a shop or Organization profile, or purchasing a Subscription, you confirm you are authorised to bind the business you represent.',
        ],
      },
      {
        id: 'service-offered',
        title: '3. What we provide',
        paragraphs: [
          'Veversal provides cloud software access: workshop operations tools, public listing features (where entitled), booking and repair workflows, messaging, document helpers, and Organization/fleet tools according to your plan.',
          'We do not supply mechanics, spare parts, or premises. You remain an independent service provider toward your own end customers.',
          'Modules described as planned in product documentation (for example full accounting or advanced warehouse) are not included until expressly enabled for your account.',
        ],
      },
      {
        id: 'service-delivery',
        title: '4. How the Partner Service is delivered',
        paragraphs: [
          'Step 1 — Account and profile: you register, create or claim a shop / Organization profile, and complete the required business details.',
          'Step 2 — Choose a plan: in Payments / upgrade you select the plan (for example PRO or Premium) and billing interval (monthly or annual). The price and currency are shown before confirmation.',
          'Step 3 — Pay: you choose an available payment method (card via Stripe, bank transfer, or EasyPay 10-digit code). Details are in section 5.',
          'Step 4 — Activation: when payment is confirmed, the Subscription status becomes active and entitled features unlock in the Partner or Organization interface for the paid period. Delivery is exclusively digital access — there is no physical shipment.',
          'Step 5 — Use during the period: you may use entitled features until the period ends, you cancel renewals, or we suspend access under these Partner Terms.',
          'If payment is not completed, the order stays pending or expires; paid features remain unavailable. No service fee is charged for an unpaid pending order.',
        ],
      },
      {
        id: 'payment-process',
        title: '5. Payment process (detailed)',
        paragraphs: [
          'Merchant of record for platform Subscriptions is Veversal EOOD. Payment operators (Stripe, ePay.bg / EasyPay, your bank) process the funds according to their rules; they are not sellers of the Veversal software.',
          'Card (Stripe Checkout): after you confirm the plan, you are redirected to Stripe to enter card details. A successful charge activates the Subscription (subject to webhook / confirmation processing). Failed or abandoned checkouts do not activate paid features.',
          'Bank transfer: we display beneficiary name, IBAN, amount, and a unique payment reference. You must include that reference. Activation follows our reconciliation of the incoming payment, which may take one or more business days after the bank posts the funds.',
          'EasyPay (ePay.bg): we create a payment obligation via ePay and show a 10-digit EasyPay code, amount, and expiry. You pay at an EasyPay cash desk, compatible ATM, or other EasyPay-supported channel. When ePay sends a paid notification to our systems, we activate the Subscription. If the code expires unpaid, the pending order lapses with no charge from Veversal.',
          'You are responsible for paying any cash-desk or operator fees that EasyPay / ePay publish for payers, if applicable; Subscription prices shown in Veversal are the amounts due to Veversal unless we expressly state otherwise.',
          'Taxes: displayed prices and invoices follow the tax treatment configured for Veversal EOOD and your billing profile. Request corrections to company name, ЕИК/VAT, and address before or promptly after invoicing.',
        ],
      },
      {
        id: 'cancellation',
        title: '6. Cancellation and refusal',
        paragraphs: [
          'Refusal before payment: you may abandon Stripe checkout, ignore bank instructions, or let an EasyPay code expire. That ends the pending order without activating a paid Subscription.',
          'Cancel renewals on an active plan: use the in-product subscription management / Payments controls when available, or email contact@veversal.com from the account email with the shop or Organization name. We stop future renewals; access continues until the end of the prepaid period unless otherwise agreed in writing.',
          'Refunds: see the Cancellation & Refund Policy (including the 14-day rules and billing-error cases).',
          'We may refuse or reverse activation, or suspend the shop listing, if payment is charged back, reversed, or reasonably suspected to be fraudulent, after notice where practicable.',
          'Ending the commercial relationship does not automatically erase repair history, invoices, or customer records already stored; retention follows the Privacy Policy and legal obligations.',
        ],
      },
      {
        id: 'customer-data',
        title: '7. Customer and vehicle data',
        paragraphs: [
          'You act as an independent controller or joint controller (as applicable) toward your end customers for workshop services. Access Veversal-hosted personal data only with a valid owner authorization, booking, or repair context.',
          'Do not export customer lists for unrelated marketing. Promotions sent through Veversal must respect marketing preferences enforced in the product.',
        ],
        lawyerReview: true,
      },
      {
        id: 'organization-fleet',
        title: '8. Organization fleet responsibilities',
        paragraphs: [
          'Organization admins are responsible for having a lawful basis to upload fleet registers and staff-related operational data.',
          'Send membership invites only to intended recipients and revoke access promptly when people leave.',
        ],
      },
      {
        id: 'content-public',
        title: '9. Public profiles and reviews',
        paragraphs: [
          'Public shop pages show information you publish (services, hours, location). Reviews and shop replies may be visible to consumers.',
          'Do not post misleading claims or third-party personal data in public responses.',
        ],
      },
      {
        id: 'dpa',
        title: '10. Data Processing Addendum',
        paragraphs: [
          'Where Veversal processes personal data on your behalf as a processor, the DPA page applies. Final production reliance should follow legal review of that DPA and your entity details.',
        ],
      },
      {
        id: 'liability',
        title: '11. Liability between Veversal and Partners',
        lawyerReview: true,
        paragraphs: [
          'Each party remains responsible for its own obligations toward end customers. Veversal’s liability for the software Service is limited as in the Terms of Use, to the extent permitted by law.',
          'You indemnify Veversal against claims arising from your workshop services, incorrect public claims, or unlawful processing of customer data under your control, except to the extent caused by Veversal’s wilful misconduct.',
        ],
      },
      {
        id: 'law',
        title: '12. Governing law',
        paragraphs: [
          'These Partner Terms are governed by the laws of the Republic of Bulgaria. Business disputes shall be submitted to the competent courts in Bulgaria, after an attempt to resolve them via contact@veversal.com.',
        ],
      },
    ],
  },
  bg: {
    title: 'Условия за бизнес и партньори',
    sections: [
      {
        id: 'intro',
        title: '1. Обхват',
        paragraphs: [
          'Настоящите Условия за бизнес и партньори („Партньорски условия“) допълват Общите условия на Veversal за сервизни центрове (Партньори / Сервизи) и бизнес Организации, които ползват платени или оперативни партньорски функции.',
          'При противоречие относно таксуване на Абонамент, начини на плащане, активиране или отказ на партньорски планове, тези Партньорски условия и Политиката за отказ и възстановяване имат предимство пред общите Условия по тези теми.',
          'Доставчик: „ВИВЪРСАЛ“ ЕООД (Veversal EOOD), България. Седалище и адрес на управление: София, ул. Златен клас 623, 20, България. Контакт за фактуриране и договори: contact@veversal.com.',
        ],
      },
      {
        id: 'who',
        title: '2. За кого важат',
        paragraphs: [
          'Собственици и упълномощен персонал на сервизи, ползващи партньорското табло, абонаменти, помощни средства за фактуриране, промоции, инструменти за персонал, оплаквания и свързани функции.',
          'Администратори и членове на Организации с импорт на автопарк, мрежи, покани за членство и свързани ERP насочени инструменти.',
          'Активирайки профил на сервиз или Организация или закупувайки Абонамент, потвърждавате, че сте упълномощени да обвържете представляваната фирма.',
        ],
      },
      {
        id: 'service-offered',
        title: '3. Какво предоставяме',
        paragraphs: [
          'Veversal предоставя облачен софтуерен достъп: инструменти за сервизна дейност, публично обявяване (според правата по плана), потоци за резервации и ремонти, съобщения, помощни средства за документи и функции за Организации/автопарк според плана.',
          'Не доставяме механици, резервни части или помещения. Оставате независим доставчик спрямо крайните си клиенти.',
          'Модули, описани като планирани в продуктовата документация (напр. пълно счетоводство или разширен склад), не са включени, докато не бъдат изрично активирани за вашия акаунт.',
        ],
      },
      {
        id: 'service-delivery',
        title: '4. Как се получава партньорската услуга',
        paragraphs: [
          'Стъпка 1 — Акаунт и профил: регистрирате се, създавате или претендирате профил на сервиз / Организация и попълвате необходимите фирмени данни.',
          'Стъпка 2 — Избор на план: в Плащания / надграждане избирате план (напр. PRO или Premium) и период (месечен или годишен). Цената и валутата се показват преди потвърждение.',
          'Стъпка 3 — Плащане: избирате наличен начин (карта чрез Stripe, банков превод или 10-цифрен код EasyPay). Подробности в т. 5.',
          'Стъпка 4 — Активиране: при потвърдено плащане статусът на Абонамента става активен и отключените функции се появяват в партньорския или организационния интерфейс за платения период. Доставката е изцяло цифров достъп — няма физическа пратка.',
          'Стъпка 5 — Ползване през периода: ползвате отключените функции до края на периода, до отказ на подновяване или до спиране на достъпа по тези условия.',
          'Ако плащането не бъде завършено, поръчката остава чакаща или изтича; платените функции остават недостъпни. Не се дължи такса за неплатена чакаща поръчка.',
        ],
      },
      {
        id: 'payment-process',
        title: '5. Процес на плащане (подробно)',
        paragraphs: [
          'Търговец за платформените Абонаменти е „ВИВЪРСАЛ“ ЕООД. Платежните оператори (Stripe, ePay.bg / EasyPay, вашата банка) обработват средствата по свои правила; те не са продавачи на софтуера Veversal.',
          'Карта (Stripe Checkout): след избор на план се пренасочвате към Stripe за данни на картата. Успешното таксуване активира Абонамента (след обработка на потвърждението). Неуспешен или изоставен checkout не активира платени функции.',
          'Банков превод: показваме получател, IBAN, сума и уникално основание. Трябва да посочите това основание. Активирането следва след равнение на постъпилото плащане, което може да отнеме един или повече работни дни след осчетоводяване от банката.',
          'EasyPay (ePay.bg): създаваме задължение чрез ePay и показваме 10-цифрен код, сума и срок. Плащате в офис на EasyPay, съвместим банкомат или друг поддържан канал. Когато ePay изпрати известие за платено, активираме Абонамента. Ако кодът изтече неплатен, чакащата поръчка отпада без такса от Veversal.',
          'Отговаряте за евентуални такси на каса/оператор, които EasyPay / ePay публикуват за платеца, ако са приложими; цените в Veversal са сумите към Veversal, освен ако изрично не е посочено друго.',
          'Данъци: показаните цени и фактури следват данъчния режим на „ВИВЪРСАЛ“ ЕООД и вашия профил за фактуриране. Поискайте корекции на име, ЕИК/ДДС и адрес преди или своевременно след фактуриране.',
        ],
      },
      {
        id: 'cancellation',
        title: '6. Отказ и отказване от плащане',
        paragraphs: [
          'Отказ преди плащане: можете да изоставите Stripe checkout, да не изпълните банковия превод или да оставите кода за EasyPay да изтече. Това прекратява чакащата поръчка без активиране на платен Абонамент.',
          'Отказ на подновявания при активен план: ползвайте управлението на абонамент / Плащания в продукта, когато е налично, или пишете на contact@veversal.com от имейла на акаунта с името на сервиза или Организацията. Спираме бъдещи подновявания; достъпът продължава до края на предплатения период, освен ако писмено не е уговорено друго.',
          'Възстановявания: вижте Политиката за отказ и възстановяване (вкл. правилата за 14 дни и грешки в таксуването).',
          'Можем да откажем или отменим активиране или да спрем публичното обявяване на сервиза при chargeback, обратно плащане или основателно съмнение за измама, след предизвестие когато е възможно.',
          'Прекратяването на търговските отношения не изтрива автоматично история на ремонти, фактури или клиентски записи; съхранението следва Политиката за поверителност и законовите задължения.',
        ],
      },
      {
        id: 'customer-data',
        title: '7. Данни на клиенти и МПС',
        paragraphs: [
          'Действате като независим администратор или съадминистратор (според случая) спрямо крайните си клиенти за сервизните услуги. Достъпвайте лични данни в Veversal само с валидно упълномощаване, резервация или ремонт.',
          'Не изнасяйте клиентски списъци за несвързан маркетинг. Промоциите през Veversal трябва да спазват маркетинговите предпочитания, наложени в продукта.',
        ],
        lawyerReview: true,
      },
      {
        id: 'organization-fleet',
        title: '8. Отговорности при автопарк на Организация',
        paragraphs: [
          'Администраторите на Организация отговарят за наличието на правно основание за качване на регистри на автопарк и оперативни данни за персонала.',
          'Изпращайте покани за членство само до предназначените получатели и отнемайте достъпа своевременно при напускане.',
        ],
      },
      {
        id: 'content-public',
        title: '9. Публични профили и отзиви',
        paragraphs: [
          'Публичните страници на сервиза показват информацията, която публикувате (услуги, работно време, локация). Отзиви и отговори може да са видими за потребители.',
          'Не публикувайте подвеждащи твърдения или чужди лични данни в публични отговори.',
        ],
      },
      {
        id: 'dpa',
        title: '10. Споразумение за обработка на данни (DPA)',
        paragraphs: [
          'Когато Veversal обработва лични данни от ваше име като обработващ, се прилага страницата DPA. За окончателно разчитане в production е нужен правен преглед на DPA и данните на вашето дружество.',
        ],
      },
      {
        id: 'liability',
        title: '11. Отговорност между Veversal и партньорите',
        lawyerReview: true,
        paragraphs: [
          'Всяка страна остава отговорна за своите задължения към крайните клиенти. Отговорността на Veversal за софтуерната Услуга е ограничена както в Общите условия, в рамките на позволеното от закона.',
          'Обезщетявате Veversal за претенции, произтичащи от вашите сервизни услуги, неверни публични твърдения или незаконна обработка на клиентски данни под ваш контрол, освен доколкото са причинени от умисъл на Veversal.',
        ],
      },
      {
        id: 'law',
        title: '12. Приложимо право',
        paragraphs: [
          'Тези Партньорски условия се уреждат от правото на Република България. Търговските спорове се отнасят до компетентните български съдилища след опит за решаване чрез contact@veversal.com.',
        ],
      },
    ],
  },
};

export default partnerTerms;

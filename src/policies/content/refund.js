const refund = {
  key: 'refund',
  slug: 'refund',
  version: '1.1.0',
  effectiveDate: '2026-11-26',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Cancellation & Refund Policy',
    sections: [
      {
        id: 'scope',
        title: '1. What this policy covers',
        paragraphs: [
          'This policy applies to paid Veversal platform Subscriptions for service centers and business partners (PRO / Premium and similar plans), including payments made via Stripe Checkout, bank transfer to Veversal EOOD, or EasyPay (ePay.bg) 10-digit cash-desk / ATM codes.',
          'It does not govern labour, parts, or invoices that an independent workshop charges a vehicle owner. Those amounts are solely between the customer and the workshop under their own terms.',
        ],
      },
      {
        id: 'provider',
        title: '2. Merchant of record',
        paragraphs: [
          'Platform Subscription fees are sold by Veversal EOOD (ВИВЪРСАЛ ЕООД), Bulgaria. Stripe, ePay.bg / EasyPay, and banks act as payment facilitators or operators; Veversal remains the seller of the software Subscription.',
          'Billing, cancellation, and refund requests: contact@veversal.com (subject: Subscription refund / cancellation). Use the email registered on the Partner account.',
        ],
      },
      {
        id: 'payment-flow',
        title: '3. Payment and when the Service starts',
        paragraphs: [
          'You select a plan and interval in the Payments / upgrade screens. The amount and currency are shown before you commit to a payment method.',
          'Card: payment is taken at Stripe Checkout. The Subscription normally activates after we receive confirmation of a successful charge.',
          'Bank transfer: you pay using the displayed IBAN and unique reference. The Subscription activates after we reconcile the incoming payment.',
          'EasyPay: you receive a 10-digit code and expiry. After you pay at EasyPay (office, ATM, or supported channel), ePay notifies us and we activate the Subscription. If you never pay, the code expires and no Subscription fee is due to Veversal for that pending order.',
          'Digital delivery: activation unlocks software features in your Partner or Organization account. No physical goods are shipped.',
        ],
      },
      {
        id: 'cancel',
        title: '4. How to cancel',
        paragraphs: [
          'Before paying a pending order: do not complete Stripe checkout, do not transfer, or let the EasyPay code expire. The pending order ends without charge for that unpaid attempt.',
          'After an active Subscription: cancel future renewals anytime from Payments / subscription management when available, or by emailing contact@veversal.com from the account email, stating the shop or Organization name and that you wish to stop renewals.',
          'Cancellation stops future renewals. Access typically continues until the end of the already paid period; afterwards the shop may enter read-only or inactive listing state as described in the Business & Partner Terms.',
          'Cancelling does not automatically delete repair history, invoices, or customer records already stored for your shop.',
        ],
      },
      {
        id: 'refunds',
        title: '5. Refunds',
        paragraphs: [
          'Monthly plans: if you cancel within fourteen (14) days of the first charge for that billing period and have not made material use of paid features (for example sending paid offers or activating premium listing tools), we will refund that period’s charge on request.',
          'Annual plans: within fourteen (14) days of the annual charge we may refund a pro-rata unused portion at our discretion, less any non-recoverable payment-operator fees, if paid features were not materially used.',
          'After fourteen (14) days, or where paid features were used in that period, Subscription fees are generally non-refundable. We may still issue a goodwill credit or partial refund for clear billing errors (duplicate charge, wrong plan, failed activation despite successful payment).',
          'Bank-transfer refunds: paid back to the originating IBAN after we confirm receipt and identity; processing may take several business days.',
          'EasyPay / ePay refunds: where a refund is due after a cash-desk or ATM payment, we process it according to ePay / EasyPay rules and our banking arrangements; timing depends on those operators. Contact contact@veversal.com with the payment code (IDN), approximate time, and amount.',
          'Card refunds: returned to the original card via Stripe where the charge was made through Stripe.',
        ],
        lawyerReview: true,
      },
      {
        id: 'stripe-disputes',
        title: '6. Chargebacks and payment disputes',
        paragraphs: [
          'Please contact us before opening a card dispute or similar claim so we can resolve payment issues quickly. Unwarranted chargebacks or payment disputes may lead to suspension of Partner access pending review.',
        ],
      },
      {
        id: 'consumer-marketplace',
        title: '7. Consumer (vehicle owner) payments to workshops',
        paragraphs: [
          'If you pay a workshop for a repair through a flow that settles to the workshop, refund and cancellation of that job follow the workshop’s policy and applicable consumer law. Veversal helps route support requests but is not the merchant for workshop labour or parts unless a specific product screen says otherwise.',
        ],
      },
      {
        id: 'changes',
        title: '8. Changes',
        paragraphs: [
          'We may update this policy; the effective date above will change. Continued use of paid Subscriptions after the new effective date constitutes acceptance for future billing periods, without prejudice to mandatory rights you cannot waive.',
        ],
      },
      {
        id: 'lawyer',
        title: '9. Legal review',
        lawyerReview: true,
        paragraphs: [
          'This text is provided for product transparency and review by payment providers (including EasyPay / ePay.bg). Counsel should confirm EU consumer and B2B nuances before treating it as final legal advice.',
        ],
      },
    ],
  },
  bg: {
    title: 'Политика за отказ и възстановяване',
    sections: [
      {
        id: 'scope',
        title: '1. За какво важи',
        paragraphs: [
          'Тази политика важи за платени Абонаменти към платформата Veversal за сервизи и бизнес партньори (PRO / Premium и подобни планове), включително плащания през Stripe Checkout, банков превод към „ВИВЪРСАЛ“ ЕООД или EasyPay (ePay.bg) с 10-цифрен код за каса / банкомат.',
          'Не урежда труд, части или фактури, които независим сервиз начислява на собственик на МПС. Тези суми са само между клиента и сервиза по техните условия.',
        ],
      },
      {
        id: 'provider',
        title: '2. Търговец',
        paragraphs: [
          'Таксите за платформен Абонамент се продават от „ВИВЪРСАЛ“ ЕООД (Veversal EOOD), България. Stripe, ePay.bg / EasyPay и банките действат като платежни посредници или оператори; Veversal остава продавач на софтуерния Абонамент.',
          'Запитвания за фактуриране, отказ и възстановяване: contact@veversal.com (тема: Възстановяване / отказ на абонамент). Ползвайте имейла, регистриран в партньорския акаунт.',
        ],
      },
      {
        id: 'payment-flow',
        title: '3. Плащане и кога започва Услугата',
        paragraphs: [
          'Избирате план и период в екраните Плащания / надграждане. Сумата и валутата се показват преди да изберете начин на плащане.',
          'Карта: плащането се извършва в Stripe Checkout. Абонаментът обикновено се активира след потвърждение за успешно таксуване.',
          'Банков превод: плащате по показаните IBAN и уникално основание. Абонаментът се активира след равнение на постъпилото плащане.',
          'EasyPay: получавате 10-цифрен код и срок. След плащане на каса EasyPay, банкомат или поддържан канал ePay ни уведомява и ние активираме Абонамента. Ако не платите, кодът изтича и не дължите такса към Veversal за тази чакаща поръчка.',
          'Цифрова доставка: активирането отключва софтуерни функции в партньорския или организационния акаунт. Не се изпращат физически стоки.',
        ],
      },
      {
        id: 'cancel',
        title: '4. Как да откажете',
        paragraphs: [
          'Преди да платите чакаща поръчка: не завършвайте Stripe checkout, не правете превод или оставете кода за EasyPay да изтече. Чакащата поръчка приключва без такса за този неплатен опит.',
          'След активен Абонамент: откажете бъдещи подновявания по всяко време от Плащания / управление на абонамент, когато е налично, или с имейл до contact@veversal.com от имейла на акаунта, като посочите сервиза или Организацията и че желаете спиране на подновяванията.',
          'Отказът спира бъдещи подновявания. Достъпът обикновено продължава до края на вече платения период; след това профилът може да премине в режим само за четене или неактивно обявяване според Условията за бизнес и партньори.',
          'Отказът не изтрива автоматично история на ремонти, фактури или клиентски записи.',
        ],
      },
      {
        id: 'refunds',
        title: '5. Възстановявания',
        paragraphs: [
          'Месечни планове: ако откажете до четиринадесет (14) дни от първото таксуване за периода и не сте ползвали съществено платените функции (напр. изпращане на платени оферти или premium listing), възстановяваме таксата за този период при заявка.',
          'Годишни планове: до четиринадесет (14) дни от годишното таксуване можем по преценка да възстановим пропорционална неизползвана част, намалена с невъзстановими такси на платежния оператор, ако платените функции не са ползвани съществено.',
          'След четиринадесет (14) дни или при ползване на платени функции в периода таксите обикновено не се връщат. При ясна грешка в таксуването (дублирано плащане, грешен план, неуспешна активация въпреки успешно плащане) можем да издадем частично възстановяване или кредит.',
          'Банкови преводи: сумите се връщат към оригиналния IBAN след потвърждение; обработката може да отнеме няколко работни дни.',
          'EasyPay / ePay: когато се дължи възстановяване след плащане на каса или банкомат, го обработваме по правилата на ePay / EasyPay и нашите банкови договорености; срокът зависи от тези оператори. Пишете на contact@veversal.com с кода за плащане (IDN), приблизително време и сума.',
          'Картови възстановявания: към оригиналната карта чрез Stripe, когато таксуването е през Stripe.',
        ],
        lawyerReview: true,
      },
      {
        id: 'stripe-disputes',
        title: '6. Chargeback и спорове по плащане',
        paragraphs: [
          'Моля свържете се с нас преди спор по карта или сходна претенция, за да решим бързо проблема. Неоснователни chargeback-и или спорове могат да доведат до временно спиране на партньорски достъп до преглед.',
        ],
      },
      {
        id: 'consumer-marketplace',
        title: '7. Плащания от собственици на МПС към сервизи',
        paragraphs: [
          'Ако плащате на сервиз за ремонт чрез поток, който се разплаща към сервиза, отказът и възстановяването следват политиката на сервиза и приложимото потребителско право. Veversal помага с маршрутизиране на заявки, но не е търговец за труд/части на сервиза, освен ако конкретен екран не казва друго.',
        ],
      },
      {
        id: 'changes',
        title: '8. Промени',
        paragraphs: [
          'Можем да обновим тази политика; датата по-горе ще се промени. Продължаването на платен Абонамент след новата дата означава приемане за следващи периоди, без да се засягат императивни права, от които не можете да се откажете.',
        ],
      },
      {
        id: 'lawyer',
        title: '9. Правен преглед',
        lawyerReview: true,
        paragraphs: [
          'Текстът е за продуктова прозрачност и преглед от платежни доставчици (вкл. EasyPay / ePay.bg). Адвокат трябва да потвърди нюансите за ЕС преди да се третира като окончателен правен съвет.',
        ],
      },
    ],
  },
};

export default refund;

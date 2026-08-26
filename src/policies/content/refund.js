const refund = {
  key: 'refund',
  slug: 'refund',
  version: '1.0.0',
  effectiveDate: '2026-08-26',
  status: 'draft-beta',
  leadingLanguage: 'en',
  en: {
    title: 'Cancellation & Refund Policy',
    sections: [
      {
        id: 'scope',
        title: 'What this policy covers',
        paragraphs: [
          'This policy applies to paid Veversal platform subscriptions for service centers and business partners (PRO / Premium and similar plans), including payments made via Stripe Checkout or bank transfer to Veversal.',
          'It does not govern labour, parts, or invoices charged by an independent workshop to a vehicle owner. Those amounts are between the customer and the workshop under their own terms.',
        ],
      },
      {
        id: 'provider',
        title: 'Merchant of record',
        paragraphs: [
          'Platform subscription fees are charged by Veversal EOOD (Bulgaria). For card payments processed by Stripe, Stripe acts as payment processor; Veversal remains the seller of the software subscription.',
          'Billing and refund requests: contact@veversal.com (subject line: Subscription refund).',
        ],
      },
      {
        id: 'cancel',
        title: 'How to cancel a subscription',
        paragraphs: [
          'You may cancel a partner subscription at any time from the partner billing / upgrade screens when available, or by emailing contact@veversal.com from the account email on file.',
          'Cancellation stops future renewals. Access typically continues until the end of the paid period, then the shop may enter read-only or inactive listing state as described in the Business & Partner Terms.',
          'Cancelling does not automatically delete repair history, invoices, or customer records already stored for your shop.',
        ],
      },
      {
        id: 'refunds',
        title: 'Refunds',
        paragraphs: [
          'Monthly plans: if you cancel within fourteen (14) days of the first charge for that billing period and have not made material use of paid features (for example sending paid offers or activating premium listing tools), we will refund the unused charge on request.',
          'Annual plans: within fourteen (14) days of the annual charge we may refund a pro-rata unused portion at our discretion, less any non-recoverable payment-processing fees, if paid features were not materially used.',
          'After fourteen (14) days, or where paid features were used in that period, subscription fees are generally non-refundable. We may still issue a goodwill credit or partial refund in clear billing errors (duplicate charge, wrong plan, failed activation).',
          'Bank-transfer payments: refunds are paid back to the originating IBAN after we confirm receipt and identity; processing may take several business days.',
        ],
        lawyerReview: true,
      },
      {
        id: 'stripe-disputes',
        title: 'Chargebacks and Stripe',
        paragraphs: [
          'Please contact us before opening a card dispute so we can resolve billing issues quickly. Unwarranted chargebacks may lead to suspension of partner access pending review.',
        ],
      },
      {
        id: 'consumer-marketplace',
        title: 'Consumer (vehicle owner) payments',
        paragraphs: [
          'If you pay a workshop for a repair through a flow that settles to the workshop, refund and cancellation of that job follow the workshop’s policy and applicable consumer law. Veversal will help route support requests but is not the merchant for workshop labour or parts unless a specific product screen says otherwise.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes',
        paragraphs: [
          'We may update this policy; the effective date above will change. Continued use of paid subscriptions after notice constitutes acceptance of the updated policy for future billing periods.',
        ],
      },
      {
        id: 'lawyer',
        title: 'Legal review',
        lawyerReview: true,
        paragraphs: [
          'This text is provided for product transparency and payment-provider review. Counsel should confirm EU consumer/B2B nuances before treating it as final legal advice.',
        ],
      },
    ],
  },
  bg: {
    title: 'Политика за отказ и възстановяване',
    sections: [
      {
        id: 'scope',
        title: 'За какво важи',
        paragraphs: [
          'Тази политика важи за платени абонаменти към платформата Veversal за сервизи и бизнес партньори (PRO / Premium и подобни планове), включително плащания през Stripe Checkout или банков превод към Veversal.',
          'Не урежда труд, части или фактури, които независим сервиз начислява на собственик на МПС. Тези суми са между клиента и сервиза според техните условия.',
        ],
      },
      {
        id: 'provider',
        title: 'Търговец',
        paragraphs: [
          'Таксите за платформен абонамент се начисляват от Veversal EOOD (България). При картови плащания през Stripe, Stripe е платежен оператор; Veversal остава продавач на софтуерния абонамент.',
          'Запитвания за фактуриране и възстановяване: contact@veversal.com (тема: Възстановяване на абонамент).',
        ],
      },
      {
        id: 'cancel',
        title: 'Как да откажете абонамент',
        paragraphs: [
          'Можете да откажете partner абонамент по всяко време от екраните за billing / upgrade, когато са налични, или с имейл до contact@veversal.com от имейла на акаунта.',
          'Отказът спира бъдещи подновявания. Достъпът обикновено продължава до края на платения период, след което shop профилът може да премине в read-only или inactive listing според Условията за бизнес и partners.',
          'Отказът не изтрива автоматично история на ремонти, фактури или клиентски записи.',
        ],
      },
      {
        id: 'refunds',
        title: 'Възстановявания',
        paragraphs: [
          'Месечни планове: ако откажете до четиринадесет (14) дни от първото таксуване за периода и не сте ползвали съществено платените функции (напр. изпращане на платени оферти или premium listing), възстановяваме неползваната такса при заявка.',
          'Годишни планове: до четиринадесет (14) дни от годишното таксуване можем по преценка да възстановим пропорционална неизползвана част, намалена с невъзстановими такси на платежния оператор, ако платените функции не са ползвани съществено.',
          'След четиринадесет (14) дни или при ползване на платени функции в периода таксите обикновено не се връщат. При ясна грешка в таксуването (дублирано плащане, грешен план, неуспешна активация) можем да издадем частично възстановяване или кредит.',
          'Банкови преводи: сумите се връщат към оригиналния IBAN след потвърждение; обработката може да отнеме няколко работни дни.',
        ],
        lawyerReview: true,
      },
      {
        id: 'stripe-disputes',
        title: 'Chargeback и Stripe',
        paragraphs: [
          'Моля свържете се с нас преди card dispute, за да решим бързо billing проблеми. Неоснователни chargeback-и могат да доведат до временно спиране на partner достъп до преглед.',
        ],
      },
      {
        id: 'consumer-marketplace',
        title: 'Плащания от собственици на МПС',
        paragraphs: [
          'Ако плащате на сервиз за ремонт чрез поток, който се разплаща към сервиза, отказът и възстановяването следват политиката на сервиза и приложимото потребителско право. Veversal помага с маршрутизиране на заявки, но не е търговец за труд/части на сервиза, освен ако конкретен екран не казва друго.',
        ],
      },
      {
        id: 'changes',
        title: 'Промени',
        paragraphs: [
          'Можем да обновим тази политика; датата по-горе ще се промени. Продължаването на платен абонамент след уведомление означава приемане за следващи периоди.',
        ],
      },
      {
        id: 'lawyer',
        title: 'Правен преглед',
        lawyerReview: true,
        paragraphs: [
          'Текстът е за продуктова прозрачност и преглед от платежни доставчици. Адвокат трябва да потвърди нюансите за ЕС преди да се третира като окончателен правен съвет.',
        ],
      },
    ],
  },
};

export default refund;

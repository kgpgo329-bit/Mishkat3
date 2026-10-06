import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Official Emblem */}
      <div className="flex flex-col items-center justify-center pt-space-md pb-space-md text-center">
        <div className="p-space-sm sm:p-space-md rounded-2xl bg-surface-container-low shadow-sm">
          <img
            alt="شعار مشكاة الرسمي"
            className="h-16 sm:h-20 md:h-24 w-auto max-w-[260px] sm:max-w-[320px] md:max-w-[380px] object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
            src="/images/mishkat-logo.jpg"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-space-md text-center">
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          حول منصة مشكاة
        </h1>
        <p className="font-body-md text-body-md text-secondary font-medium">
          بوابة المعرفة الإسلامية الرصينة والمحققة بالأدلة
        </p>
      </div>

      <div className="flex flex-col gap-space-md">
        {/* Mission Card */}
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(13,71,51,0.05)] border border-outline-variant/30">
          <h2 className="font-title-md text-title-md text-primary font-bold mb-space-xs flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">verified_user</span>
            <span>الرسالة المعرفية</span>
          </h2>
          <p className="font-body-md text-body-md text-on-surface leading-loose">
            مشكاة منصة معرفية عربية رائدة تعتمد تقنيات الذكاء الاصطناعي التوليدي المنضبط بالأدلة العلمية (Grounded AI) لتقديم فهم إسلامي موثق ومستند إلى المصادر المعتمدة الأصيلة، بعيداً عن الاجتهادات العشوائية أو الهلوسة الرقمية.
          </p>
        </div>

        {/* Pillars Card */}
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(13,71,51,0.05)] border border-outline-variant/30">
          <h2 className="font-title-md text-title-md text-primary font-bold mb-space-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">architecture</span>
            <span>المرتكزات المنهجية لمشكاة</span>
          </h2>
          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
            <div className="p-space-sm bg-surface-container-low rounded-lg">
              <span className="font-bold text-primary block mb-1">١. التحقيق المستند إلى الدليل (Evidence-First):</span>
              لا يتم توليد أي إجابة إلا استناداً إلى نصوص شرعية ومصادر تراثية معتمدة تم التحقق من ثبوتها ودلالتها.
            </div>
            <div className="p-space-sm bg-surface-container-low rounded-lg">
              <span className="font-bold text-primary block mb-1">٢. التعلم العميق المتدرج:</span>
              توفير مسارات معرفية متتابعة لتعميق فهم المسألة واستكشاف أدلتها ومقاصدها.
            </div>
            <div className="p-space-sm bg-surface-container-low rounded-lg">
              <span className="font-bold text-primary block mb-1">٣. التقييم والتقرير المعرفي:</span>
              بناء سجل رحلة موثق يُتوج بتقييم مخصص وتوثيق منهجي لمكتسبات الباحث.
            </div>
            <div className="p-space-sm bg-surface-container-low rounded-lg">
              <span className="font-bold text-primary block mb-1">٤. الانضباط المؤسسي في الفتوى:</span>
              الفصل التام بين المعرفة التوثيقية العامة والفتاوى الفردية الخاصة، مع توجيه الأخيرة للجهات الرسمية المعتمدة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

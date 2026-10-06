import React, { useEffect, useState } from 'react';
import { mishkatApi } from '../api/mishkatApi.js';
import { SpecialistReferralResponse } from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const SpecialistPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpecialistReferralResponse | null>(null);

  useEffect(() => {
    const fetchSpecialist = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getSpecialistReferral();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'تعذر استرجاع بيانات جهة الفتوى الرسمية');
      }
      setLoading(false);
    };

    fetchSpecialist();
  }, []);

  if (loading) {
    return <LoadingState message="جاري استرجاع بيانات جهة الإفتاء الرسمية المعتمدة..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر عرض بيانات الفتوى"
        message={error || 'حدث خطأ في تحميل البيانات'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const authorityName = data.authorityName || data.authority?.authorityName || 'الرئاسة العامة للبحوث العلمية والإفتاء';
  const officialWebsite = data.officialWebsite || data.authority?.officialWebsite || 'https://www.alifta.gov.sa';
  const unifiedPhone = data.contactMethods?.unifiedPhone || '0114595555';
  const religiousEmail = data.contactMethods?.religiousQuestionsEmail || 'alifta@alifta.gov.sa';
  const adminEmail = data.contactMethods?.administrativeEmail || 'info@alifta.gov.sa';
  const purpose = data.purpose || 'الإحالة الرسمية المعتمدة للأسئلة والنوازل الشخصية التي تستوجب فتوى خاصة تراعي تفاصيل الحالة.';
  const message = data.message || 'هذا السؤال يحتاج إلى فتوى تراعي تفاصيل الحالة، لذلك لا تقدّم مشكاة حكماً شخصياً عليه، ويمكن الرجوع إلى جهة إفتاء مختصة.';
  const whyRefer = data.whyRefer || 'منصة مشكاة تقدم محتوى معرفياً توثيقياً عاماً ومستنداً للأدلة المعتمدة، ولا تصدر فتاوى فردية أو أحكاماً في النوازل الشخصية (مثل قضايا الطلاق، المواريث المحددة، والنزاعات الخاصة) لأنها تستلزم الاستفصال المباشر والتحقق القضائي والإفتائي من المفتي المؤهل.';

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1 mb-space-md">
        <div className="flex items-center gap-space-xs text-secondary font-bold font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-base">gavel</span>
          <span>الإحالة الشرعية الرسمية المعتمدة</span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          طلب الفتوى والمختص الشرعي
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          التوجيه إلى الهيئة الشرعية الرسمية المختصة بإصدار الفتاوى في النوازل والمسائل الشخصية.
        </p>
      </div>

      {/* Referral Message Notice */}
      <div className="p-space-lg rounded-xl bg-amber-50/70 border border-amber-200/60 mb-space-md">
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-2xl text-amber-800 flex-shrink-0 mt-0.5">
            info
          </span>
          <div>
            <h3 className="font-title-sm text-title-sm text-amber-900 font-bold mb-1">
              توجيه وإحالة
            </h3>
            <p className="font-body-sm text-body-sm text-amber-950 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
      </div>

      {/* Why Mishkat Refers Banner */}
      <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/40 mb-space-lg">
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-2xl text-secondary flex-shrink-0 mt-0.5">
            shield
          </span>
          <div>
            <h3 className="font-title-sm text-title-sm text-primary font-bold mb-1">
              لماذا تحيل مشكاة المسائل الشخصية؟
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
              {whyRefer}
            </p>
          </div>
        </div>
      </div>

      {/* Official Authority Card */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg">
        <div className="flex items-start justify-between mb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-secondary bg-surface-container-low px-space-xs py-0.5 rounded font-bold">
              المرجعية الرسمية المعتمدة
            </span>
            <h2 className="font-title-lg text-title-lg text-primary font-bold mt-1">
              {authorityName}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {purpose}
            </p>
          </div>
          <span className="material-symbols-outlined text-secondary text-3xl">verified</span>
        </div>

        {/* Primary Contact Channels */}
        <div className="space-y-space-xs pt-space-sm border-t border-outline-variant/20 mb-space-md">
          <h4 className="font-label-md text-label-md text-primary font-bold mb-space-xs">
            قنوات الاستفتاء المباشرة:
          </h4>

          {/* Official Website */}
          <div className="p-space-sm rounded-lg bg-surface-container-low/70 flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary">language</span>
              <div>
                <span className="font-body-sm text-body-sm text-on-surface font-bold block">
                  الموقع الرسمي
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {officialWebsite}
                </span>
              </div>
            </div>
            <a
              href={officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-space-md py-1.5 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary-container transition-colors shadow-sm"
            >
              <span>زيارة الموقع</span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </div>

          {/* Unified Phone */}
          <div className="p-space-sm rounded-lg bg-surface-container-low/70 flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary">call</span>
              <div>
                <span className="font-body-sm text-body-sm text-on-surface font-bold block">
                  الهاتف الموحد
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {unifiedPhone}
                </span>
              </div>
            </div>
            <a
              href={`tel:${unifiedPhone}`}
              className="inline-flex items-center gap-1 px-space-md py-1.5 bg-surface-container text-primary font-bold rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-xs">phone_in_talk</span>
              <span>اتصال</span>
            </a>
          </div>

          {/* Religious Questions Email */}
          <div className="p-space-sm rounded-lg bg-surface-container-low/70 flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary">mail</span>
              <div>
                <span className="font-body-sm text-body-sm text-on-surface font-bold block">
                  بريد الأسئلة الشرعية
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {religiousEmail}
                </span>
              </div>
            </div>
            <a
              href={`mailto:${religiousEmail}`}
              className="inline-flex items-center gap-1 px-space-md py-1.5 bg-surface-container text-primary font-bold rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-xs">send</span>
              <span>مراسلة</span>
            </a>
          </div>
        </div>

        {/* Secondary Contact Info */}
        <div className="p-space-sm rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
          <h5 className="font-label-sm text-label-sm text-on-surface-variant font-bold mb-1">
            معلومات اتصال ثانوية (إدارية):
          </h5>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
            <span>البريد الإداري:</span>
            <a href={`mailto:${adminEmail}`} className="font-mono text-primary hover:underline">
              {adminEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

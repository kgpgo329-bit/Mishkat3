import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';
import { JourneyDashboardData } from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { EmptyState } from '../components/EmptyState.js';

export const JourneyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JourneyDashboardData | null>(null);

  useEffect(() => {
    const fetchJourney = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getJourney();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'تعذر استرجاع بيانات الرحلة المعرفية');
      }
      setLoading(false);
    };

    fetchJourney();
  }, []);

  if (loading) {
    return <LoadingState message="جاري استرجاع سجل الرحلة المعرفية..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر عرض الرحلة المعرفية"
        message={error || 'حدث خطأ في تحميل السجل'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const {
    interactions = data.allInteractions || [],
    allInteractions = interactions,
    eligibleCount = data.verifiedKnowledgeCount || 0,
    target = 20,
    remaining = Math.max(0, target - eligibleCount),
    assessmentUnlocked = eligibleCount >= target,
    directQuestionCount = 0,
    deepLearningQuestionCount = 0,
    verifiedKnowledgeCount = eligibleCount,
    domainDistribution = {},
  } = data;

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-space-md">
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          رحلتي المعرفية
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          سجل الأسئلة، مسارات التعلم العميق، وحصيلة المعرفة المحققة بالأدلة.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-space-sm mb-space-md">
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
          <span className="font-label-sm text-label-sm text-on-surface-variant">المعرفة المحققة</span>
          <span className="font-headline-md text-headline-md text-primary font-bold">
            {eligibleCount}
          </span>
          <span className="font-label-sm text-label-sm text-secondary">
            {remaining > 0 ? `متبقي ${remaining} للتقييم` : 'مكتمل للتقييم'}
          </span>
        </div>

        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
          <span className="font-label-sm text-label-sm text-on-surface-variant">إجمالي الأسئلة</span>
          <span className="font-headline-md text-headline-md text-primary font-bold">
            {allInteractions.length}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {directQuestionCount} مباشر | {deepLearningQuestionCount} تعلم عميق
          </span>
        </div>
      </div>

      {/* Assessment Eligibility Card */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
        <div className="flex items-center justify-between mb-space-xs">
          <div className="flex items-center gap-space-xs text-primary">
            <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
            <h3 className="font-title-md text-title-md font-bold">التقييم المعرفي التراكمي</h3>
          </div>
          <span
            className={`font-label-sm text-label-sm px-space-sm py-1 rounded-full font-bold ${
              assessmentUnlocked
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {assessmentUnlocked ? 'متاح الآن' : 'غير مؤهل بعد'}
          </span>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          {assessmentUnlocked
            ? 'لقد حققت الحد الأدنى المطلوب (20 مسألة محققة). يمكنك الآن خوض التقييم المعرفي المخصص.'
            : `يتطلب فتح التقييم إتمام ${target} مسألة معرفية محققة. المكتمل حالياً: ${eligibleCount} (متبقي ${remaining}).`}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden mb-space-md">
          <div
            className="bg-primary h-full transition-all duration-500 rounded-full"
            style={{
              width: `${Math.min(100, (eligibleCount / target) * 100)}%`,
            }}
          />
        </div>

        {assessmentUnlocked ? (
          <Link
            to="/assessment"
            className="inline-flex items-center justify-center w-full py-space-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
          >
            بدء التقييم المعرفي المخصص
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-space-sm bg-surface-container text-outline rounded-lg font-label-md text-label-md cursor-not-allowed"
          >
            مغلق حتى استكمال 20 مسألة محققة
          </button>
        )}
      </div>

      {/* Domain Breakdown */}
      <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
        <h3 className="font-title-md text-title-md text-primary font-bold mb-space-sm flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary">pie_chart</span>
          <span>توزيع المسائل حسب الأبواب الشرعية</span>
        </h3>
        <div className="grid grid-cols-2 gap-space-xs font-body-sm text-body-sm">
          {Object.entries(domainDistribution).map(([domain, count]) => (
            <div
              key={domain}
              className="flex items-center justify-between p-space-xs bg-surface-container-low rounded-lg"
            >
              <span>{domain}</span>
              <span className="font-bold text-primary">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactions History List */}
      <div className="flex flex-col gap-space-xs">
        <h3 className="font-title-md text-title-md text-primary font-bold mb-space-xs">
          سجل المسائل والأسئلة
        </h3>

        {allInteractions.length === 0 ? (
          <EmptyState
            icon="explore"
            title="لا توجد مسائل مسجلة بعد"
            description="ابدأ بطرح سؤال في الصفحة الرئيسية لبناء رحلتك المعرفية المحققة."
            actionText="طرح سؤال جديد"
            onAction={() => (window.location.href = '/')}
          />
        ) : (
          allInteractions.map((item) => (
            <Link
              key={item.interactionId}
              to={`/answer/${item.interactionId}`}
              className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/20 hover:border-secondary transition-all flex items-center justify-between shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span
                    className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded ${
                      item.origin === 'DEEP_LEARNING'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container text-primary'
                    }`}
                  >
                    {item.origin === 'DEEP_LEARNING' ? 'من التعلم العميق' : 'سؤال مباشر'}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {item.topic || item.category}
                  </span>
                  {item.eligibleForAssessment ? (
                    <span className="font-label-sm text-xs px-space-xs py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      محققة للتقييم
                    </span>
                  ) : (
                    <span className="font-label-sm text-xs px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      غير مؤهلة
                    </span>
                  )}
                </div>
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  {item.question}
                </span>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_left</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

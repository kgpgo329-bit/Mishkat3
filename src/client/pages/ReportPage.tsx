import React, { useEffect, useState } from 'react';
import { mishkatApi } from '../api/mishkatApi.js';
import { FinalReportRecord } from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const ReportPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinalReportRecord | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getReport();
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error?.message || 'التقرير غير جاهز. يتطلب إتمام التقييم المعرفي أولاً.');
      }
      setLoading(false);
    };

    fetchReport();
  }, []);

  if (loading) {
    return <LoadingState message="جاري إعداد التقرير المعرفي التوثيقي..." />;
  }

  if (error || !report) {
    return (
      <ErrorState
        title="التقرير المعرفي الختامي"
        message={error || 'يتطلب إتمام التقييم المعرفي للمستخدم أولاً.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const percentage = report.summary?.percentage ?? report.comprehensionAssessment?.scorePercentage ?? 0;
  const correctCount = report.summary?.correctCount ?? report.comprehensionAssessment?.correctCount ?? 0;
  const totalQuestions = report.summary?.totalQuestions ?? report.comprehensionAssessment?.totalQuestions ?? 0;
  const eligibleCount = report.summary?.eligibleKnowledgeCount ?? report.journeySummary?.verifiedConceptsCount ?? 0;
  const learningSummary = report.learningSummary || report.journeySummary?.narrative || '';
  const recommendations = report.recommendations || [];
  const referencedSources = report.referencedSources || [];

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1 mb-space-md">
        <div className="flex items-center gap-space-xs text-secondary font-bold font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-base">verified</span>
          <span>وثيقة إنجاز معرفي رصين ومحقق</span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          التقرير المعرفي النهائي
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          خلاصة الأداء العلمي في الرحلة المعرفية، تقييم الفهم، والمصادر الشرعية المعتمدة.
        </p>
      </div>

      {/* Overview Metric Banner */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm p-space-sm bg-surface-container-low rounded-lg mb-space-md">
          <div className="text-center p-space-xs">
            <span className="font-headline-md text-headline-md text-primary font-bold block">
              {percentage}%
            </span>
            <span className="text-xs text-on-surface-variant">نسبة الإتقان</span>
          </div>
          <div className="text-center p-space-xs">
            <span className="font-headline-md text-headline-md text-secondary font-bold block">
              {correctCount} / {totalQuestions}
            </span>
            <span className="text-xs text-on-surface-variant">إجابات صحيحة</span>
          </div>
          <div className="text-center p-space-xs col-span-2 sm:col-span-1">
            <span className="font-headline-md text-headline-md text-primary font-bold block">
              {eligibleCount}
            </span>
            <span className="text-xs text-on-surface-variant">مسائل محققة</span>
          </div>
        </div>

        {/* Learning Summary */}
        <h2 className="font-title-md text-title-md text-primary font-bold mb-space-xs flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary">explore</span>
          <span>الملخص التربوي للرحلة</span>
        </h2>
        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
          {learningSummary}
        </p>
      </div>

      {/* Topic Performance */}
      {report.topicPerformance && report.topicPerformance.length > 0 && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
          <h2 className="font-title-md text-title-md text-primary font-bold mb-space-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">category</span>
            <span>الأداء حسب الموضوعات الشرعية</span>
          </h2>
          <div className="flex flex-col gap-space-xs">
            {report.topicPerformance.map((tp, idx) => (
              <div
                key={idx}
                className="p-space-sm rounded-lg bg-surface-container-low/70 flex items-center justify-between"
              >
                <div>
                  <span className="font-body-md text-body-md text-primary font-bold block">
                    {tp.topic}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {tp.interactionCount} مسألة محققة في الرحلة
                  </span>
                </div>
                {typeof tp.totalQuestions === 'number' && tp.totalQuestions > 0 && (
                  <span className="px-space-sm py-0.5 rounded bg-surface-container text-secondary font-bold font-label-sm text-label-sm">
                    {tp.correctCount} / {tp.totalQuestions} في التقييم
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Review Areas */}
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
        <h2 className="font-title-md text-title-md text-primary font-bold mb-space-md flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary">insights</span>
          <span>تحليل الاستيعاب والمراجعة</span>
        </h2>

        {/* Strengths */}
        {report.strengths && report.strengths.length > 0 && (
          <div className="mb-space-md">
            <h3 className="font-label-md text-label-md text-secondary font-bold mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>نقاط القوة والاستيعاب المتقن:</span>
            </h3>
            <div className="space-y-2">
              {report.strengths.map((str, i) => {
                const text = typeof str === 'string' ? str : str.area;
                const traces = typeof str === 'object' && str.sourceInteractionIds ? str.sourceInteractionIds : [];
                return (
                  <div key={i} className="p-space-sm rounded-lg bg-emerald-50/50 border border-secondary/15">
                    <p className="font-body-sm text-body-sm text-primary font-medium">{text}</p>
                    {traces.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {traces.map((id, j) => (
                          <span key={j} className="text-[10px] text-secondary bg-white px-1.5 py-0.5 rounded border border-secondary/20">
                            مسألة مسندة: {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review Areas */}
        {report.reviewAreas && report.reviewAreas.length > 0 && (
          <div>
            <h3 className="font-label-md text-label-md text-primary font-bold mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">trending_up</span>
              <span>مجالات مقترحة للمراجعة والتعميق:</span>
            </h3>
            <div className="space-y-2">
              {report.reviewAreas.map((rev, i) => {
                const text = typeof rev === 'string' ? rev : rev.area;
                const traces = typeof rev === 'object' && rev.sourceInteractionIds ? rev.sourceInteractionIds : [];
                return (
                  <div key={i} className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <p className="font-body-sm text-body-sm text-on-surface font-medium">{text}</p>
                    {traces.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {traces.map((id, j) => (
                          <span key={j} className="text-[10px] text-on-surface-variant bg-white px-1.5 py-0.5 rounded border border-outline-variant/20">
                            مسألة مسندة: {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
          <h2 className="font-title-md text-title-md text-primary font-bold mb-space-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">auto_stories</span>
            <span>التوصيات التعليمية الختامية</span>
          </h2>
          <ul className="space-y-2 font-body-sm text-body-sm text-on-surface">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-secondary mt-0.5">check</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Referenced Sources */}
      {referencedSources.length > 0 && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30">
          <h2 className="font-title-md text-title-md text-primary font-bold mb-space-sm flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary">library_books</span>
            <span>المصادر المرجعية المسندة في التقرير</span>
          </h2>
          <div className="flex flex-col gap-space-xs">
            {referencedSources.map((src) => (
              <div
                key={src.sourceId}
                className="p-space-sm rounded-lg bg-surface-container-low/60 flex items-center justify-between"
              >
                <span className="font-body-md text-body-md text-primary font-bold">
                  {src.sourceName}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-space-xs py-0.5 rounded">
                  {src.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

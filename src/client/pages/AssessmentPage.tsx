import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';
import {
  AssessmentEligibilityInfo,
  AssessmentClientView,
  AssessmentSubmissionResult
} from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<AssessmentEligibilityInfo | null>(null);
  const [assessment, setAssessment] = useState<AssessmentClientView | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentSubmissionResult | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getAssessmentStatus();
      if (res.success && res.data) {
        setEligibility(res.data);
      } else {
        setError(res.error?.message || 'تعذر التحقق من أهلية التقييم');
      }
      setLoading(false);
    };

    checkEligibility();
  }, []);

  const handleStartAssessment = async () => {
    setLoading(true);
    setError(null);
    const res = await mishkatApi.generateAssessment();
    if (res.success && res.data) {
      setAssessment(res.data);
    } else {
      setError(res.error?.message || 'تعذر إنشاء أسئلة التقييم');
    }
    setLoading(false);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;

    setIsSubmitting(true);
    setError(null);

    const res = await mishkatApi.submitAssessment(assessment.assessmentId, {
      answers,
    });

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error?.message || 'تعذر إرسال إجابات التقييم');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <LoadingState message="جاري التحقق من بيانات التقييم المعرفي..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="خطأ في التقييم"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Result display
  if (result) {
    return (
      <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
        <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 text-center mb-space-md">
          <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-space-sm">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-primary font-bold mb-space-xs">
            اكتمل التقييم المعرفي بنجاح
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
            الدرجة المستحقة: {result.score} من {result.totalQuestions} ({result.percentage}%)
          </p>

          <div className="flex flex-col gap-space-xs text-right mb-space-lg">
            <h3 className="font-title-md text-title-md text-primary font-bold mb-space-xs">
              مراجعة المفاهيم المختبرة
            </h3>
            {result.conceptPerformance.map((item, idx) => (
              <div
                key={item.questionId}
                className={`p-space-sm rounded-lg border text-sm ${
                  item.isCorrect
                    ? 'bg-secondary-container/20 border-secondary/40 text-on-surface'
                    : 'bg-error-container/20 border-error/40 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1 font-bold mb-1">
                  <span className="material-symbols-outlined text-base">
                    {item.isCorrect ? 'check_circle' : 'cancel'}
                  </span>
                  <span>المسألة {idx + 1}: {item.isCorrect ? 'صحيحة' : 'تحتاج مراجعة'}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/report')}
            className="w-full py-space-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
          >
            عرض التقرير المعرفي النهائي الشامل
          </button>
        </div>
      </div>
    );
  }

  // Active Assessment taking
  if (assessment) {
    const allAnswered =
      assessment.questions.length > 0 &&
      assessment.questions.every((q) => answers[q.questionId] !== undefined);

    return (
      <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
        <div className="mb-space-md">
          <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
            التقييم المعرفي التراكمي
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            أسئلة مخصصة مبنية على المسائل التي قمت ببحثها وتحقيق أدلتها.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {assessment.questions.map((q, qIndex) => (
            <div
              key={q.questionId}
              className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30"
            >
              <h3 className="font-title-md text-title-md text-primary font-bold mb-space-md">
                {qIndex + 1}. {q.question}
              </h3>
              <div className="flex flex-col gap-space-xs">
                {q.options.map((opt, optIndex) => {
                  const isSelected = answers[q.questionId] === optIndex;
                  return (
                    <label
                      key={optIndex}
                      onClick={() => handleSelectOption(q.questionId, optIndex)}
                      className={`flex items-center gap-space-sm p-space-sm rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-outline-variant/30 bg-surface-container-low/40 text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.questionId}
                        checked={isSelected}
                        onChange={() => handleSelectOption(q.questionId, optIndex)}
                        className="accent-primary"
                      />
                      <span className="font-body-md text-body-md">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={!allAnswered || isSubmitting}
            className="w-full py-space-md bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 font-bold"
          >
            {isSubmitting ? 'جاري التحقق ورصد الدرجة...' : 'تسليم إجابات التقييم'}
          </button>
        </form>
      </div>
    );
  }

  // Not yet started / eligibility view
  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-low text-primary flex items-center justify-center mx-auto mb-space-sm">
          <span className="material-symbols-outlined text-3xl">assignment</span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold mb-space-xs">
          التقييم المعرفي المخصص
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto mb-space-md">
          يقوم الذكاء الاصطناعي بصياغة اختبار معرفي مخصص يعتمد حصراً على المسائل المحققة التي استكشفتها في رحلتك.
        </p>

        {eligibility?.status === 'READY' ? (
          <div>
            <div className="p-space-sm rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md mb-space-md font-bold">
              أنت مؤهل لخوض التقييم! (تم إتمام {eligibility.currentCount} مسألة محققة)
            </div>
            <button
              type="button"
              onClick={handleStartAssessment}
              className="w-full py-space-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
            >
              بدء الاختبار الآن
            </button>
          </div>
        ) : (
          <div>
            <div className="p-space-sm rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md mb-space-md">
              التقييم مغلق حتى إتمام {eligibility?.requiredCount || 20} مسألة محققة (المتبقي: {eligibility?.remainingCount || 20})
            </div>
            <Link
              to="/journey"
              className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container-low text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container transition-colors"
            >
              <span>الاطلاع على تقدم رحلتي المعرفية</span>
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';
import { DeepLearningResponse, FollowUpQuestion } from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const DeepLearningPage: React.FC = () => {
  const { interactionId } = useParams<{ interactionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeepLearningResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!interactionId) return;

    const fetchDeepLearning = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getDeepLearning(interactionId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'تعذر تحميل بيانات التعلم العميق');
      }
      setLoading(false);
    };

    fetchDeepLearning();
  }, [interactionId]);

  const handleSelectQuestion = async (item: FollowUpQuestion) => {
    if (!interactionId) return;
    setSubmitting(true);
    try {
      const res = await mishkatApi.askQuestion({
        sessionId: mishkatApi.getSessionId(),
        question: item.question,
        origin: 'DEEP_LEARNING',
        parentInteractionId: interactionId,
      });

      if (res.success && res.data) {
        navigate(`/answer/${res.data.interactionId}`);
      } else {
        setError(res.error?.message || 'تعذر معالجة السؤال المختار');
      }
    } catch {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="جاري إعداد محاور التعلم العميق..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل محاور التعلم"
        message={error || 'لم يتم العثور على محاور للتفاعل المحدد'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 mb-space-md">
        <div className="flex items-center gap-space-xs text-secondary mb-space-xs">
          <span className="material-symbols-outlined">psychology</span>
          <span className="font-label-sm text-label-sm font-bold">وحدة التعلم العميق الرصين</span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          الموضوع: {data.topic}
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
          اختر أحد المسارات البحثية لتوسيع الفهم وتحقيق الأدلة وفق المنهجية المعرفية لمشكاة.
        </p>
      </div>

      <div className="flex flex-col gap-space-sm">
        {data.followUps.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={submitting}
            onClick={() => handleSelectQuestion(item)}
            className="w-full p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 hover:border-secondary transition-all text-right shadow-[0_2px_8px_-2px_rgba(13,71,51,0.04)] flex items-center justify-between group disabled:opacity-50"
          >
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-secondary font-bold">
                {item.type}
              </span>
              <span className="font-body-md text-body-md text-on-surface group-hover:text-primary font-medium">
                {item.question}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

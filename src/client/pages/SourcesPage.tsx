import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';
import { TrustedSource } from '../../shared/types/index.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const SourcesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<TrustedSource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      setError(null);
      const res = await mishkatApi.getSources();
      if (res.success && res.data) {
        setSources(res.data);
      } else {
        setError(res.error?.message || 'تعذر استرجاع قائمة المصادر المعتمدة');
      }
      setLoading(false);
    };

    fetchSources();
  }, []);

  if (loading) {
    return <LoadingState message="جاري استرجاع مستودع المصادر المعتمدة..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="تعذر عرض المصادر"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const categories = ['الكل', ...Array.from(new Set(sources.map((s) => s.category)))];
  const filteredSources =
    selectedCategory === 'الكل'
      ? sources
      : sources.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1 mb-space-md">
        <div className="flex items-center gap-space-xs text-secondary font-bold font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-base">verified</span>
          <span>المستودع المعرفي المعتمد</span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
          مصادر المعرفة المعتمدة
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          المصادر والموسوعات الرقمية الإسلامية المعتمدة حصراً في البحث والتوثيق واستخراج الأدلة لمنصة مشكاة.
        </p>
      </div>

      {/* Distinction Notice (Knowledge Sources != Referral Authorities) */}
      <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 mb-space-md">
        <div className="flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-xl mt-0.5">
            info
          </span>
          <div className="text-body-sm font-body-sm text-on-surface leading-relaxed">
            <span className="font-bold text-primary block mb-0.5">
              فصل منهجي صارم بين مصادر المعرفة وجهات الإحالة:
            </span>
            تُستخدم هذه المصادر حصرية لبناء مستودع الاسترجاع الموثق (RAG) وتأصيل الإجابات العامة. وهي منفصلة تماماً عن جهات الإفتاء الشخصي. للأسئلة الشخصية، يرجى مراجعة{' '}
            <Link to="/specialist" className="text-secondary font-bold underline hover:text-primary">
              صفحة طلب الفتوى والمختص
            </Link>.
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-space-xs overflow-x-auto pb-space-sm mb-space-md">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-space-md py-1.5 rounded-lg font-label-sm text-label-sm transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sources List */}
      <div className="flex flex-col gap-space-sm">
        {filteredSources.map((source) => {
          const isIngested = source.status === 'INGESTED';
          return (
            <div
              key={source.sourceId}
              className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 transition-all hover:border-secondary/40"
            >
              <div className="flex items-start justify-between gap-space-sm mb-space-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-label-sm text-label-sm text-secondary bg-surface-container-low px-space-xs py-0.5 rounded font-bold">
                      {source.category}
                    </span>
                    {/* Status Badge */}
                    {isIngested ? (
                      <span className="font-label-sm text-label-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-space-xs py-0.5 rounded font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>مستورد في المستودع ({source.documentCount ?? 0} وثيقة)</span>
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-amber-800 bg-amber-50 border border-amber-200 px-space-xs py-0.5 rounded font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                        <span>مسجل غير مستورد (HTTP 403)</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-title-md text-title-md text-primary font-bold">
                    {source.name}
                  </h3>
                  <span className="font-body-sm text-body-sm text-on-surface-variant block">
                    {source.author} {source.era ? `• ${source.era}` : ''}
                  </span>
                </div>
                {source.officialUrl && (
                  <a
                    href={source.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary hover:bg-primary hover:text-on-primary transition-colors flex-shrink-0"
                    aria-label={`تصفح موقع ${source.name}`}
                  >
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </a>
                )}
              </div>

              <p className="font-body-sm text-body-sm text-on-surface leading-relaxed mt-space-xs">
                {source.description}
              </p>

              {source.statusNote && (
                <div className="mt-space-xs p-space-xs rounded bg-surface-container-low text-xs text-on-surface-variant">
                  <span className="font-bold">حالة المصدر في المنصة: </span>
                  {source.statusNote}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

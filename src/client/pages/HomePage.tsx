import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mishkatApi } from '../api/mishkatApi.js';

interface CategoryItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'aqeedah',
    name: 'العقيدة',
    desc: 'أصول الإيمان، الأسماء والصفات، التوحيد',
    icon: 'wb_sunny',
  },
  {
    id: 'fiqh',
    name: 'الفقه',
    desc: 'العبادات، المعاملات، الأحكام الفقهية الميسرة',
    icon: 'balance',
  },
  {
    id: 'hadith',
    name: 'الحديث',
    desc: 'السنة النبوية، درجات الأحاديث، وشروحها',
    icon: 'format_quote',
  },
  {
    id: 'tafsir',
    name: 'التفسير',
    desc: 'بيان معاني الآيات الكريمة، وأسباب النزول',
    icon: 'menu_book',
  },
  {
    id: 'general',
    name: 'موضوعات إسلامية عامة',
    desc: 'السيرة النبوية، الرقائق، الآداب والأخلاق',
    icon: 'explore',
  },
];

export const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setQuery(`اسأل في ${categoryName}: `);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await mishkatApi.askQuestion({
        sessionId: mishkatApi.getSessionId(),
        question: trimmed,
        category: selectedCategory || undefined,
        origin: 'USER',
      });

      if (response.success && response.data) {
        navigate(`/answer/${response.data.interactionId}`);
      } else {
        setErrorMessage(response.error?.message || 'تعذر إرسال السؤال');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-gutter pb-space-xl max-w-2xl mx-auto">
      {/* Brand & Official Emblem Section */}
      <div className="flex flex-col items-center justify-center pt-space-lg pb-space-md text-center">
        <div className="relative flex items-center justify-center p-space-sm sm:p-space-md rounded-2xl bg-surface-container-low shadow-sm">
          <img
            alt="شعار مشكاة الرسمي"
            className="h-16 sm:h-20 md:h-24 w-auto max-w-[260px] sm:max-w-[320px] md:max-w-[380px] object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
            src="/images/mishkat-logo.jpg"
          />
        </div>
        <div className="flex items-center gap-space-xs mt-space-md opacity-80">
          <span className="w-8 h-[1px] bg-outline-variant"></span>
          <span
            className="material-symbols-outlined text-sm text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span className="w-8 h-[1px] bg-outline-variant"></span>
        </div>
      </div>

      {/* Central Query Hub */}
      <div className="w-full flex flex-col gap-space-sm mt-space-sm">
        <div className="flex items-center justify-between px-space-xs">
          <label
            className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs"
            htmlFor="mishkatQuery"
          >
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span>اسأل مشكاة...</span>
          </label>
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-space-sm py-1 rounded-full">
            بوابة موثوقة
          </span>
        </div>

        {/* Search Input Frame */}
        <form onSubmit={handleSubmit}>
          <div className="relative w-full bg-surface-container-lowest rounded-xl p-space-xs shadow-[0_4px_20px_-4px_rgba(13,71,51,0.08)]">
            <div className="flex items-center bg-surface-container-low rounded-lg px-space-sm py-space-xs">
              <span className="material-symbols-outlined text-on-surface-variant text-xl ms-space-xs">
                search
              </span>
              <input
                id="mishkatQuery"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-transparent border-0 px-space-sm py-space-sm text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none"
                placeholder="ابحث عن مسألة، آية، أو حكم شرعي موثق..."
              />
              <button
                id="submitQueryBtn"
                type="submit"
                disabled={isSubmitting || !query.trim()}
                aria-label="إرسال السؤال"
                className="flex items-center justify-center w-11 h-11 bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined text-xl animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-xl rotate-180">arrow_forward</span>
                )}
              </button>
            </div>

            {/* Quick Suggestion Pill */}
            <div className="flex items-center justify-between px-space-sm pt-space-xs pb-1 text-on-surface-variant">
              <span className="font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-secondary">verified</span>
                إجابات مستندة للأدلة والتحقيق العلمي
              </span>
              <button
                type="button"
                onClick={() => setQuery('ما شروط صحة الصلاة؟')}
                className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors underline underline-offset-4 decoration-secondary-container"
              >
                تجربة: ما شروط الصلاة؟
              </button>
            </div>
          </div>
        </form>

        {errorMessage && (
          <div className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Primary Islamic Classifications */}
      <div className="w-full flex flex-col gap-space-sm mt-space-lg">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-lg">category</span>
            <h2 className="font-title-md text-title-md text-primary font-bold">التصنيفات الشرعية</h2>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">اختر موضوعاً للبدء</span>
        </div>

        {/* Category Tiles List */}
        <div className="flex flex-col gap-space-sm">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat.name)}
              className="category-card group relative w-full flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(13,71,51,0.05)] hover:shadow-md transition-all active:scale-[0.99] overflow-hidden text-right border border-outline-variant/20 hover:border-secondary/40"
            >
              <div className="flex items-center gap-space-md z-10">
                <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors font-bold">
                    {cat.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{cat.desc}</span>
                </div>
              </div>
              <div className="flex items-center text-outline group-hover:text-primary transition-colors z-10">
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </div>
              {/* Arch Outline Ornamentation Bottom Arc */}
              <svg
                className="absolute bottom-0 left-4 w-16 h-8 text-surface-container opacity-60 group-hover:opacity-100 group-hover:text-secondary-fixed-dim transition-all pointer-events-none"
                fill="none"
                viewBox="0 0 64 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 32C0 14.3269 14.3269 0 32 0C49.6731 0 64 14.3269 64 32"
                  stroke="currentColor"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Decorative Classical Base Arch Watermark */}
      <div className="flex flex-col items-center justify-center mt-space-lg opacity-40">
        <svg
          className="w-24 h-12 text-outline-variant"
          fill="none"
          viewBox="0 0 96 48"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M48 2C30 18 10 32 0 48H96C86 32 66 18 48 2Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};

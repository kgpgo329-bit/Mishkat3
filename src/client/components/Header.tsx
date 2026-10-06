import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  onOpenDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title = 'مشكاة', onOpenDrawer }) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(13,71,51,0.04)]">
      <div className="h-16 px-gutter flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            aria-label="فتح القائمة"
            onClick={onOpenDrawer}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-primary hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <span className="font-title-md text-title-md text-primary tracking-tight">{title}</span>
        </div>
        <Link to="/" aria-label="مشكاة - الصفحة الرئيسية" className="flex items-center group">
          <img
            alt="شعار مشكاة"
            className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            src="/images/mishkat-logo.jpg"
          />
        </Link>
      </div>
    </header>
  );
};

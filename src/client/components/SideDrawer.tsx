import React from 'react';
import { NavLink } from 'react-router-dom';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', label: 'الرئيسية', icon: 'home' },
    { to: '/sources', label: 'المصادر', icon: 'menu_book' },
    { to: '/journey', label: 'رحلتي المعرفية', icon: 'explore' },
    { to: '/assessment', label: 'التقييم المعرفي', icon: 'assignment' },
    { to: '/report', label: 'التقرير المعرفي', icon: 'monitoring' },
    { to: '/specialist', label: 'طلب الفتوى والمختص', icon: 'psychology_alt' },
    { to: '/about', label: 'حول مشكاة', icon: 'info' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(26,46,38,0.12)] transform transition-transform duration-300 ease-in-out flex flex-col pt-safe pb-safe ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-space-lg flex items-center justify-between bg-surface-container-low">
          <div className="flex flex-col gap-1">
            <img
              alt="شعار مشكاة"
              className="h-9 sm:h-10 w-auto object-contain self-start"
              src="/images/mishkat-logo.jpg"
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant ps-0.5">بوابة المعرفة الرصينة</span>
          </div>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 py-space-md px-space-sm overflow-y-auto flex flex-col gap-space-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-colors font-body-md text-body-md ${
                  isActive
                    ? 'bg-surface-container-low text-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

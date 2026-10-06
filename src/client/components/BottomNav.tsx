import React from 'react';
import { NavLink } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const tabs = [
    { to: '/', label: 'الرئيسية', icon: 'home' },
    { to: '/journey', label: 'رحلتي', icon: 'explore' },
    { to: '/report', label: 'التقرير', icon: 'monitoring' },
    { to: '/sources', label: 'المصادر', icon: 'menu_book' },
    { to: '/specialist', label: 'الفتوى', icon: 'psychology_alt' },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(13,71,51,0.05)] border-t border-outline-variant/30"
      aria-label="التنقل السفلي"
    >
      <div className="flex justify-around items-center h-16 px-space-xs max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-16 h-12 transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`
            }
          >
            <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
            <span className="font-label-sm text-label-sm">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

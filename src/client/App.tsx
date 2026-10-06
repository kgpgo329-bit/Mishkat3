import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header.js';
import { SideDrawer } from './components/SideDrawer.js';
import { BottomNav } from './components/BottomNav.js';
import { HomePage } from './pages/HomePage.js';
import { AnswerPage } from './pages/AnswerPage.js';
import { DeepLearningPage } from './pages/DeepLearningPage.js';
import { JourneyPage } from './pages/JourneyPage.js';
import { AssessmentPage } from './pages/AssessmentPage.js';
import { ReportPage } from './pages/ReportPage.js';
import { SourcesPage } from './pages/SourcesPage.js';
import { SpecialistPage } from './pages/SpecialistPage.js';
import { AboutPage } from './pages/AboutPage.js';

export const App: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/') return 'الرئيسية';
    if (pathname.startsWith('/answer')) return 'نتيجة السؤال';
    if (pathname.startsWith('/deep-learning')) return 'التعلم العميق';
    if (pathname === '/journey') return 'رحلتي المعرفية';
    if (pathname === '/assessment') return 'التقييم المعرفي';
    if (pathname === '/report') return 'التقرير المعرفي';
    if (pathname === '/sources') return 'المصادر المعتمدة';
    if (pathname === '/specialist') return 'طلب الفتوى والمختص';
    if (pathname === '/about') return 'حول مشكاة';
    return 'مشكاة';
  };

  return (
    <div className="bg-surface text-on-surface font-body-md flex flex-col min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Top Header */}
      <Header
        title={getPageTitle(location.pathname)}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {/* Side Drawer Navigation */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/answer/:interactionId" element={<AnswerPage />} />
          <Route path="/deep-learning/:interactionId" element={<DeepLearningPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/specialist" element={<SpecialistPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

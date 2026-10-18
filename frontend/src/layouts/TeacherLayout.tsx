import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { FloatingChat } from '../components/common/FloatingChat';
import { PageWrapper } from '../components/common/PageWrapper';

export const TeacherLayout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="h-screen min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans w-full relative overflow-hidden">
      <Navbar showSidebarToggle={true} />
      <div className="flex-1 flex w-full overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0 h-full">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              <PageWrapper key={location.pathname}>
                <Outlet />
              </PageWrapper>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
};

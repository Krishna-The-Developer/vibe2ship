import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AlertBanner from '../AlertBanner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Close sidebar by default on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Layout Left */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container Right */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        {/* Persistent Emergency Alert Banner */}
        <AlertBanner />

        {/* TopBar Header Right with sidebar toggle button */}
        <TopBar onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

        {/* Unified App Core Page Panel */}
        <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
          {children}
        </main>

        {/* Clean Human-Friendly Margin Footer */}
        <footer className="bg-slate-900 border-t border-slate-800/60 py-5 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-12">
          <span>Last-Minute Life Saver &copy; {new Date().getFullYear()}</span>
          <span className="mx-2 text-slate-700">|</span>
          <span className="text-indigo-400 font-black">AI-Powered Deadline Resilience Companion</span>
        </footer>
      </div>
    </div>
  );
}
export { AppLayout };

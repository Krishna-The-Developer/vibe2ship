import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Flame, 
  Clock, 
  LogOut, 
  Maximize2, 
  Minimize2, 
  Zap, 
  Compass,
  Eye,
  EyeOff,
  Menu,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { seedDemoDataForUser } from '../../utils/seedData';

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopBar({ onToggleSidebar, isSidebarOpen }: TopBarProps) {
  const { currentUser, logout } = useAuth();
  const { panicMode, togglePanicMode } = useApp();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [focusMode, setFocusMode] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const handleToggleFocus = () => {
    setFocusMode(prev => !prev);
    // Dim other non-essential elements if active
    const appMain = document.querySelector('main');
    if (appMain) {
      if (!focusMode) {
        appMain.classList.add('opacity-90', 'contrast-105');
      } else {
        appMain.classList.remove('opacity-90', 'contrast-105');
      }
    }
  };

  const handleSeedData = async () => {
    if (!currentUser) return;
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedDemoDataForUser(currentUser.uid);
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to seed demo data:", err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header id="topbar-layout" className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20 text-slate-200">
      {/* Live Digital Clock Section */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg border border-slate-850 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850 transition-colors mr-1 flex items-center justify-center cursor-pointer"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}
        <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary-blue" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-100">
            {formattedTime}
          </span>
        </div>
        <span className="hidden md:inline text-xs text-slate-400 font-bold uppercase tracking-wider">
          {formattedDate}
        </span>
      </div>

      {/* Focus Controls, Streak Counter, Profile avatar */}
      <div className="flex items-center gap-4">
        {/* Seed Demo Data Button */}
        {currentUser && (
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              seedSuccess 
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400 font-extrabold' 
                : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-300'
            }`}
            title="Seed real-time telemetry datasets for presentation"
          >
            <Database className={`h-4 w-4 ${seeding ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{seeding ? 'SEEDING...' : seedSuccess ? 'DATA SEEDED!' : 'SEED SCENARIOS'}</span>
          </button>
        )}

        {/* Focus Mode button */}
        <button
          onClick={handleToggleFocus}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            focusMode 
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-400 font-extrabold' 
              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-300'
          }`}
          title="Toggle deep study visual focus"
        >
          {focusMode ? <Eye className="h-4 w-4 animate-pulse" /> : <EyeOff className="h-4 w-4" />}
          <span>{focusMode ? 'FOCUS ACTIVE' : 'FOCUS MODE'}</span>
        </button>

        {/* Dynamic Streak counter */}
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-alert-orange px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider">
          <Flame className="h-4 w-4 fill-alert-orange animate-bounce" />
          <span>3 Day Streak</span>
        </div>

        {/* User profile details and Signout */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-white truncate max-w-[120px]">
              {currentUser?.email?.split('@')[0] || 'Life Saver User'}
            </p>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Active Member</p>
          </div>
          
          {/* Avatar circle */}
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-blue to-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-500/10 border border-indigo-400/20 uppercase">
            {currentUser?.email ? currentUser.email[0] : 'U'}
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

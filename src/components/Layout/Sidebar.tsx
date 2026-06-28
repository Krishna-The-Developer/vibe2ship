import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Flame, 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Sparkles, 
  History, 
  ShieldAlert,
  Zap,
  Coffee,
  Map as MapIcon,
  Truck,
  Bell,
  FileText,
  TrendingUp,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { panicMode, motivationLevel } = useApp();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/command-center', label: 'AI Command', icon: Sparkles },
    { to: '/predictive-forecast', label: 'Risk Forecast', icon: TrendingUp },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/scheduler', label: 'Scheduler', icon: Calendar },
    { to: '/insights', label: 'Insights', icon: Sparkles },
    { to: '/reports', label: 'SitReps', icon: FileText },
    { to: '/alerts', label: 'Alerts Feed', icon: Bell },
    { to: '/resources', label: 'Resources', icon: Truck },
    { to: '/map', label: 'Map View', icon: MapIcon },
    { to: '/history', label: 'History', icon: History },
  ];

  return (
    <aside 
      id="sidebar-layout" 
      className={`w-64 bg-slate-950 text-slate-200 flex flex-col fixed h-screen left-0 top-0 border-r border-slate-800 z-30 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Sidebar Header Brand Logo */}
      <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-alert-orange/10 text-alert-orange flex items-center justify-center border border-alert-orange/20 animate-pulse">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-black text-white tracking-tight text-sm uppercase">
              Life Saver
            </h1>
            <span className="text-[9px] uppercase tracking-widest font-black text-indigo-400 block -mt-0.5">
              AI Companion
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Close Sidebar"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border-l-4 border-primary-blue text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer Performance Widget */}
      <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /> ENERGY RESERVE
          </span>
          <span className="font-extrabold text-white">{motivationLevel}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-primary-blue to-motivational-purple transition-all duration-1000"
            style={{ width: `${motivationLevel}%` }}
          />
        </div>
        {panicMode && (
          <div className="px-3 py-1.5 bg-red-950/50 border border-red-800/40 text-red-400 text-[10px] font-black tracking-wider uppercase rounded-lg text-center animate-pulse">
            🚨 Panic Mode Engaged
          </div>
        )}
      </div>
    </aside>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Flame, 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Sparkles,
  Zap,
  Coffee,
  LogOut,
  UserCheck
} from 'lucide-react';

export default function Navbar() {
  const { panicMode, togglePanicMode, motivationLevel } = useApp();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Brand Logo Group */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-alert-orange/10 text-alert-orange flex items-center justify-center border border-alert-orange/20">
                <Flame className={`h-5 w-5 ${panicMode ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <span className="font-black text-slate-800 tracking-tight text-sm sm:text-base block">
                  Last-Minute Life Saver
                </span>
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 block -mt-1">
                  AI Companion
                </span>
              </div>
            </NavLink>
          </div>

          {currentUser ? (
            <>
              {/* Center: Routes List */}
              <div className="flex items-center gap-1 sm:gap-2">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-primary-blue' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </NavLink>

                <NavLink
                  to="/tasks"
                  className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-primary-blue' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden md:inline">Tasks</span>
                </NavLink>

                <NavLink
                  to="/scheduler"
                  className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-primary-blue' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden md:inline">Timeline</span>
                </NavLink>

                <NavLink
                  to="/insights"
                  className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-primary-blue' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden md:inline">Insights</span>
                </NavLink>
              </div>

              {/* Right: Status Tracker Indicator, User and Logout buttons */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Motivation Badge */}
                <div className="hidden lg:flex items-center gap-2 border border-slate-100 bg-slate-50/50 px-3 py-1.5 rounded-xl">
                  <Zap className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-slate-500">Drive:</span>
                  <span className="text-xs font-extrabold text-slate-800">{motivationLevel}%</span>
                </div>

                {/* Panic Mode shortcut */}
                <button
                  id="panic-indicator-shortcut"
                  onClick={togglePanicMode}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    panicMode 
                      ? 'bg-red-500 border-red-400 text-white shadow-md shadow-red-500/25 scale-105' 
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                  title={panicMode ? "Deactivate Panic Mode" : "Activate Panic Mode"}
                >
                  <Flame className={`h-4.5 w-4.5 ${panicMode ? 'animate-pulse' : ''}`} />
                </button>

                {/* Profile Display / Sign Out */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                  <span className="hidden sm:inline text-xs font-bold text-slate-600 truncate max-w-[80px]" title={currentUser.email || ''}>
                    {currentUser.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all cursor-pointer text-slate-400"
                    title="Sign Out"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className="px-4 py-2 text-xs font-bold text-white bg-primary-blue hover:bg-blue-600 rounded-xl transition-all"
              >
                Sign In
              </NavLink>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}

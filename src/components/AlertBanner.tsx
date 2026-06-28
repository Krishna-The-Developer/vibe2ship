import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscribeToAlerts, FirestoreAlert } from '../services/firestoreService';
import { AlertOctagon, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AlertBanner() {
  const [activeBannerAlert, setActiveBannerAlert] = useState<FirestoreAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Subscribe to real-time emergency alert updates from Firestore
    const unsubscribe = subscribeToAlerts((alerts) => {
      const now = new Date();
      // Filter for active, non-expired, unacknowledged alerts that are critical or emergency severity
      const activeHighThreats = alerts.filter(alert => {
        const isExpired = new Date(alert.expiresAt) <= now;
        const isHighSeverity = alert.severity === 'emergency' || alert.severity === 'critical';
        const isDismissed = dismissedAlerts.includes(alert.id || '');
        return !alert.acknowledged && isHighSeverity && !isExpired && !isDismissed;
      });

      if (activeHighThreats.length > 0) {
        // Show the highest severity first (emergency > critical), then the most recent
        const sorted = activeHighThreats.sort((a, b) => {
          const rankA = a.severity === 'emergency' ? 2 : 1;
          const rankB = b.severity === 'emergency' ? 2 : 1;
          if (rankA !== rankB) return rankB - rankA;
          return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
        });
        setActiveBannerAlert(sorted[0]);
      } else {
        setActiveBannerAlert(null);
      }
    }, (err) => {
      console.error("Alert banner subscription error:", err);
    });

    return () => unsubscribe();
  }, [dismissedAlerts]);

  // Hide the banner if the user is already on the alerts page
  if (location.pathname === '/alerts') {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeBannerAlert?.id) {
      setDismissedAlerts(prev => [...prev, activeBannerAlert.id!]);
      setActiveBannerAlert(null);
    }
  };

  const handleViewDetails = () => {
    navigate('/alerts');
  };

  if (!activeBannerAlert) return null;

  const isEmergency = activeBannerAlert.severity === 'emergency';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full relative z-40 overflow-hidden"
      >
        <div 
          onClick={handleViewDetails}
          className={`w-full flex items-center justify-between px-6 py-3.5 cursor-pointer border-b transition-all ${
            isEmergency 
              ? 'bg-rose-950/90 border-rose-800/60 hover:bg-rose-950 text-rose-100' 
              : 'bg-amber-950/90 border-amber-800/60 hover:bg-amber-950 text-amber-100'
          }`}
        >
          {/* Flashing alert glow background */}
          {isEmergency && (
            <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
          )}

          <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
            {/* Flashing Status Indicator Beacon */}
            <div className="flex h-4 w-4 relative items-center justify-center flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isEmergency ? 'bg-rose-500' : 'bg-amber-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isEmergency ? 'bg-rose-500' : 'bg-amber-500'
              }`}></span>
            </div>

            <AlertOctagon className={`h-5 w-5 flex-shrink-0 ${
              isEmergency ? 'text-rose-400' : 'text-amber-400'
            }`} />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-black tracking-wide uppercase flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${
                  isEmergency ? 'bg-rose-900 text-rose-300' : 'bg-amber-900 text-amber-300'
                }`}>
                  {activeBannerAlert.severity}
                </span>
                <span className="truncate text-white font-extrabold">{activeBannerAlert.headline}</span>
              </p>
              <p className="text-[10px] text-slate-300 truncate mt-0.5 max-w-4xl">
                {activeBannerAlert.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 pl-4">
            <button 
              onClick={handleViewDetails}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                isEmergency 
                  ? 'bg-rose-900/40 border-rose-700/50 hover:bg-rose-900 text-white' 
                  : 'bg-amber-900/40 border-amber-700/50 hover:bg-amber-900 text-white'
              }`}
            >
              Take Action
              <ChevronRight className="h-3 w-3" />
            </button>

            <button
              onClick={handleDismiss}
              className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                isEmergency 
                  ? 'border-rose-800/40 hover:bg-rose-900/30 text-rose-400 hover:text-white' 
                  : 'border-amber-800/40 hover:bg-amber-900/30 text-amber-400 hover:text-white'
              }`}
              title="Dismiss Alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

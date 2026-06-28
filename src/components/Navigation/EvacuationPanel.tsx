import React, { useState } from 'react';
import { RouteOption } from '../../hooks/useEvacuationRoutes';
import Skeleton from '../UI/Skeleton';
import EmptyState from '../UI/EmptyState';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Navigation, 
  Volume2, 
  AlertTriangle, 
  Sparkles, 
  X, 
  VolumeX,
  Footprints,
  Route as RouteIcon
} from 'lucide-react';

interface EvacuationPanelProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  loading: boolean;
  error: string | null;
  usedFallback: boolean;
  onTriggerRecalculate?: () => void;
}

export default function EvacuationPanel({
  routes,
  selectedRouteId,
  onSelectRoute,
  loading,
  error,
  usedFallback,
  onTriggerRecalculate,
}: EvacuationPanelProps) {
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Trigger the SpeechSynthesis of the selected route
  const handleAnnounceRoute = (route: RouteOption) => {
    // Stop any ongoing voice announcements
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const messageText = `Attention residents! The optimal evacuation route to ${route.safe_zone_name} is now active. Proceed immediately along ${route.road_type}. The estimated travel distance is ${route.distance_km} kilometers, and the expected duration is ${Math.round(route.duration_mins)} minutes. Avoid all active hazard zones. Stay safe.`;
    
    setBroadcastMessage(messageText);

    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      // Simulate speaking for 3 seconds if not supported
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 4000);
    }
  };

  const handleStopAnnouncement = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setBroadcastMessage(null);
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <RouteIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Evacuation Directions</h3>
            <p className="text-[10px] text-slate-400">Fastest paths avoiding hazard boundaries</p>
          </div>
        </div>
        
        {usedFallback && (
          <span className="px-2 py-0.5 text-[8px] bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold rounded uppercase tracking-widest animate-pulse">
            FALLBACK ACTIVE
          </span>
        )}
      </div>

      {/* Broadcast Announcement Bar */}
      {broadcastMessage && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-2 animate-fade-in text-xs relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold uppercase text-[10px] tracking-wide">
              {isSpeaking ? (
                <Volume2 className="h-4 w-4 animate-bounce text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
              Emergency Voice broadcast
            </div>
            <button 
              onClick={handleStopAnnouncement}
              className="text-slate-400 hover:text-white absolute top-2.5 right-2.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-slate-200 leading-relaxed text-[11px] italic pr-5">
            "{broadcastMessage}"
          </p>
          <div className="text-[8px] text-slate-500 font-bold text-right uppercase">
            {isSpeaking ? 'Playing Voice Readout...' : 'Voice Synthesized Successfully'}
          </div>
        </div>
      )}

      {/* Loading & Errors */}
      {loading && (
        <div className="flex-grow space-y-4">
          <Skeleton variant="list" lines={3} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl space-y-3 text-center animate-fade-in">
          <div className="flex items-center justify-center text-red-400 gap-1.5">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase">Routing Error</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal">{error}</p>
          {onTriggerRecalculate && (
            <button
              onClick={onTriggerRecalculate}
              className="px-3.5 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors"
            >
              Retry Router Call
            </button>
          )}
        </div>
      )}

      {/* Route list */}
      {!loading && !error && routes.length === 0 && (
        <EmptyState 
          title="No Evacuation Routes Plotted" 
          message="Ensure you have selected an evacuation start point and safe zones. System monitoring active coordinates." 
        />
      )}

      {!loading && !error && routes.length > 0 && (
        <div className="flex-grow overflow-y-auto space-y-3 pr-1 max-h-[380px]">
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Computed Route Options (Sorted by Time)</span>
          
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isRank1 = route.rank === 1;

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-900/5'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Rank Badge */}
                <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider ${
                  isRank1
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                }`}>
                  {isRank1 ? '👑 Top Pick (Rank 1)' : `Alternative (Rank ${route.rank})`}
                </span>

                <div className="space-y-2">
                  {/* Destination */}
                  <div className="flex items-center gap-1.5 pr-20">
                    <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-black text-white truncate">{route.safe_zone_name}</span>
                  </div>

                  {/* Route details metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900/60 text-center">
                    <div className="p-1 bg-slate-900/60 rounded-lg">
                      <span className="block text-[7px] text-slate-500 font-extrabold uppercase">DURATION</span>
                      <span className="text-xs font-black text-slate-200 font-mono flex items-center justify-center gap-0.5">
                        <Clock className="h-2.5 w-2.5 text-indigo-400" />
                        {Math.round(route.duration_mins)} m
                      </span>
                    </div>
                    
                    <div className="p-1 bg-slate-900/60 rounded-lg">
                      <span className="block text-[7px] text-slate-500 font-extrabold uppercase">DISTANCE</span>
                      <span className="text-xs font-black text-slate-200 font-mono">
                        {route.distance_km} km
                      </span>
                    </div>

                    <div className="p-1 bg-slate-900/60 rounded-lg col-span-1">
                      <span className="block text-[7px] text-slate-500 font-extrabold uppercase">SPEED LIMIT</span>
                      <span className="text-[9px] font-bold text-emerald-400 truncate block px-0.5">
                        {route.road_type.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Warnings & Fallback Alert */}
                  {route.warning && isSelected && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 flex items-start gap-1.5 text-[9px] text-amber-300">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-400" />
                      <span className="leading-tight">{route.warning}</span>
                    </div>
                  )}

                  {/* Announce Route Button */}
                  {isSelected && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering route selection again
                          handleAnnounceRoute(route);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Volume2 className="h-3 w-3" />
                        Announce Route
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Route Actions Overview */}
      {!loading && !error && selectedRoute && (
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Active Escape Guidance
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            The active routing algorithm lists <span className="font-extrabold text-white">{selectedRoute.safe_zone_name}</span> as your recommended escape harbor. Proceed with caution.
          </p>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Shield, Radio } from 'lucide-react';

/**
 * EmptyState
 * Renders a highly technical tactical radar animation with system status feedback.
 */
export default function EmptyState({ 
  title = "No Active Hazards Detected", 
  message = "System monitoring active channels. Fully synchronized with local safety databases." 
}) {
  return (
    <div 
      id="radar-empty-state" 
      className="border border-slate-800 bg-slate-900/60 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl max-w-xl mx-auto my-8 overflow-hidden relative animate-fade-in"
    >
      {/* Absolute high-tech scanner line */}
      <div className="scanning-bar" />

      {/* CSS-based Tactical Radar Container */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
        
        {/* Radar concentric circular rings */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/10" />
        <div className="absolute inset-4 rounded-full border border-emerald-500/15" />
        <div className="absolute inset-10 rounded-full border border-emerald-500/20" />
        <div className="absolute inset-16 rounded-full border border-emerald-500/30" />
        
        {/* Radar crosshairs lines */}
        <div className="absolute inset-0 w-full h-[1px] bg-emerald-500/10 top-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 h-full w-[1px] bg-emerald-500/10 left-1/2 -translate-x-1/2" />

        {/* Dynamic sweeping line */}
        <div className="absolute inset-0 rounded-full origin-center animate-radar-sweep" style={{ background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.15) 0deg, rgba(16, 185, 129, 0) 90deg)' }} />

        {/* Radar pinging coordinates */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-radar-ping" />
        </div>
        <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60" />

        {/* Central Core Satellite Icon */}
        <div className="relative z-10 p-4 rounded-full bg-slate-950 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/15">
          <Radio className="h-6 w-6 animate-pulse" />
        </div>
      </div>

      {/* Message feedback */}
      <h3 className="text-base font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
        <Shield className="h-4.5 w-4.5 text-emerald-400" />
        {title}
      </h3>
      
      <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-sans">
        {message}
      </p>

      {/* Technical coordinate footer */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 w-full flex justify-between text-[9px] text-slate-500 font-mono tracking-wider">
        <span>SCANNING AREA: GLOBAL GEOFENCE</span>
        <span>STATUS: ACTIVE FEED SECURE</span>
      </div>
    </div>
  );
}

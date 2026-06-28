import React from 'react';
import { useDisaster } from '../../context/DisasterContext';
import { Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LiveIndicator() {
  const { isLiveFlashing, connectionStatus, lastUpdatedTime } = useDisaster();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
      <div className="flex items-center gap-2.5">
        {/* Network Connection Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800/50 rounded-xl text-[10px] font-black uppercase tracking-wider">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">FIRESTORE SYNCED</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-rose-400 animate-pulse" />
              <span className="text-rose-400">OFFLINE MODE</span>
            </>
          )}
        </div>

        {/* Dynamic Flashing LIVE Indicator */}
        <AnimatePresence>
          {isLiveFlashing && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-xl"
            >
              <Radio className="h-3 w-3 text-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-500 tracking-widest animate-pulse">
                TELEMETRY LIVE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Last Updated Timestamp */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
        <RefreshCw className={`h-3 w-3 text-slate-500 ${isLiveFlashing ? 'animate-spin' : ''}`} />
        <span>Last synced: {lastUpdatedTime.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

import React from 'react';

/**
 * Skeleton Loader Component
 * Supports multiple shimmer-loading variants: card, text, chart, map, list
 */
export default function Skeleton({ variant = 'card', lines = 3, className = '' }) {
  const baseClass = "shimmer-loading rounded-xl bg-slate-900 border border-slate-800/60";

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2.5 w-full ${className}`}>
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="shimmer-loading h-4 rounded bg-slate-900"
            style={{ width: idx === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`${baseClass} h-[320px] p-6 flex flex-col justify-between ${className}`}>
        <div className="flex items-center justify-between w-full">
          <div className="shimmer-loading h-4 w-32 rounded bg-slate-800" />
          <div className="shimmer-loading h-4 w-24 rounded bg-slate-800" />
        </div>
        <div className="flex items-end gap-3 h-48 mt-4">
          <div className="shimmer-loading w-full h-[40%] rounded-t bg-slate-800" />
          <div className="shimmer-loading w-full h-[70%] rounded-t bg-slate-800" />
          <div className="shimmer-loading w-full h-[55%] rounded-t bg-slate-800" />
          <div className="shimmer-loading w-full h-[90%] rounded-t bg-slate-800" />
          <div className="shimmer-loading w-full h-[35%] rounded-t bg-slate-800" />
        </div>
        <div className="flex justify-between mt-4">
          <div className="shimmer-loading h-3 w-10 rounded bg-slate-800" />
          <div className="shimmer-loading h-3 w-10 rounded bg-slate-800" />
          <div className="shimmer-loading h-3 w-10 rounded bg-slate-800" />
          <div className="shimmer-loading h-3 w-10 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (variant === 'map') {
    return (
      <div className={`${baseClass} h-[450px] relative overflow-hidden flex items-center justify-center ${className}`}>
        <div className="absolute inset-0 shimmer-loading opacity-40 bg-slate-900" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-full">
            <div className="shimmer-loading h-6 w-6 rounded-full bg-slate-800" />
          </div>
          <div className="shimmer-loading h-4 w-40 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`flex flex-col gap-3 w-full ${className}`}>
        {Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} className={`${baseClass} p-4 flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-3">
              <div className="shimmer-loading h-8 w-8 rounded-lg bg-slate-800 shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="shimmer-loading h-3.5 w-32 rounded bg-slate-800" />
                <div className="shimmer-loading h-2.5 w-24 rounded bg-slate-800" />
              </div>
            </div>
            <div className="shimmer-loading h-6 w-16 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  // Default: 'card'
  return (
    <div className={`${baseClass} p-5 flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="shimmer-loading h-10 w-10 rounded-xl bg-slate-800 shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="shimmer-loading h-4 w-36 rounded bg-slate-800" />
            <div className="shimmer-loading h-2.5 w-24 rounded bg-slate-800" />
          </div>
        </div>
        <div className="shimmer-loading h-5 w-12 rounded bg-slate-800" />
      </div>
      <div className="shimmer-loading h-3 w-full rounded bg-slate-800 mt-2" />
      <div className="shimmer-loading h-3 w-5/6 rounded bg-slate-800" />
      <div className="flex items-center justify-between mt-4 border-t border-slate-850 pt-3">
        <div className="shimmer-loading h-3 w-16 rounded bg-slate-800" />
        <div className="shimmer-loading h-6 w-24 rounded-lg bg-slate-800" />
      </div>
    </div>
  );
}

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

/**
 * ScenarioCard
 * Renders details, probabilities, indicators, and actions for a forecast scenario.
 */
export default function ScenarioCard({ scenario }) {
  if (!scenario) return null;

  const isWorstCase = scenario.type?.toLowerCase().includes('worst');
  
  const cardBorderClass = isWorstCase 
    ? 'border-red-500/20 bg-red-950/5 hover:border-red-500/40' 
    : 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40';

  const accentColorClass = isWorstCase ? 'text-red-400' : 'text-emerald-400';
  const badgeClass = isWorstCase 
    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  return (
    <div 
      id={`scenario-card-${isWorstCase ? 'worst' : 'likely'}`}
      className={`border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 shadow-lg ${cardBorderClass}`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg bg-slate-950/80 border border-slate-800 ${accentColorClass}`}>
            {isWorstCase ? <AlertTriangle className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide text-slate-100 uppercase">
              {scenario.type} Scenario
            </h4>
            <span className="text-[10px] font-medium text-slate-500">Comparative Modeling Block</span>
          </div>
        </div>

        {/* Probability Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold font-mono ${badgeClass}`}>
          <Gauge className="h-3.5 w-3.5" />
          {scenario.probability} Prob.
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 text-xs leading-relaxed text-slate-300">
        <p className="font-medium text-slate-400 mb-1 uppercase text-[10px] tracking-wider">Projected Course</p>
        <p className="bg-slate-950/30 border border-slate-800/40 p-3 rounded-lg text-slate-200">
          {scenario.description}
        </p>
      </div>

      {/* Indicators and Responses */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/60">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Key Escalation Indicators
          </span>
          <span className="text-xs text-slate-300 font-medium bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-850/60">
            {scenario.key_indicators || 'None identified'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${accentColorClass}`}>
            Preemptive Countermeasures
          </span>
          <span className="text-xs text-slate-200 font-semibold bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800/60 flex items-start gap-2">
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${accentColorClass}`} />
            <span>{scenario.recommended_response}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

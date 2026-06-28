import React, { useState, useEffect } from 'react';
import { useRealtimeDisasters, MergedDisaster } from '../../hooks/useRealtimeDisasters';
import { useSituationAnalysis } from '../../hooks/useSituationAnalysis';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Hourglass, 
  ShieldCheck, 
  ShieldX, 
  AlertCircle, 
  TrendingUp, 
  Boxes, 
  HelpCircle,
  Activity,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function SituationAnalysis() {
  const { disasters, loading: disastersLoading } = useRealtimeDisasters();
  
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('');
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  
  // Local checklists state for priority actions so coordinators can check things off
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  // Active selected disaster
  const currentDisaster = disasters.find(d => d.id === selectedDisasterId) || disasters[0];

  // If we have a disaster, initialize the ID
  useEffect(() => {
    if (disasters.length > 0 && !selectedDisasterId) {
      setSelectedDisasterId(disasters[0].id);
    }
  }, [disasters, selectedDisasterId]);

  // Hook for Gemini situation analysis
  const {
    data,
    loading,
    error,
    isFallback,
    isStreaming,
    streamingText,
    refresh
  } = useSituationAnalysis({
    disasterId: currentDisaster?.id || '',
    disasterTitle: currentDisaster?.title || 'No Active Disaster',
    disasterType: currentDisaster?.type || 'unknown',
    magnitude: currentDisaster?.magnitude || 5.0,
    affectedPopulation: currentDisaster?.population_affected || 15000,
    damagedCritical: currentDisaster?.damaged_critical || 0,
    totalCritical: currentDisaster?.total_critical || 10,
    riskScore: currentDisaster?.total_score || 50.0,
    useStreaming: useStreaming,
    // Add default resources mapped from disaster
    resources: [
      { name: "Emergency Medical Kits", available: 120, total_qty: 300, status: "Low", unit: "kits" },
      { name: "Search & Rescue Personnel", available: 15, total_qty: 60, status: "Critical", unit: "officers" },
      { name: "Emergency Drinking Water", available: 800, total_qty: 2000, status: "Low", unit: "liters" },
      { name: "Backup Generator Units", available: 8, total_qty: 25, status: "Critical", unit: "units" },
      { name: "Satellite Communication Kits", available: 12, total_qty: 15, status: "Optimal", unit: "beacons" }
    ]
  });

  // Reset checked actions when selected disaster changes
  useEffect(() => {
    setCheckedActions({});
  }, [selectedDisasterId]);

  const toggleAction = (actionTitle: string) => {
    setCheckedActions(prev => ({
      ...prev,
      [actionTitle]: !prev[actionTitle]
    }));
  };

  const getSeverityBadge = (severity: string) => {
    const sev = severity.toLowerCase();
    if (sev.includes('critical') || sev.includes('emergency') || sev.includes('red')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (sev.includes('high') || sev.includes('orange')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const getConfidenceBadge = (confidence: string) => {
    const c = confidence.toLowerCase();
    if (c.includes('high')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (c.includes('medium')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <div id="situation-analysis-container" className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
      
      {/* Header with Title and Control Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              DIEP-AI Disaster Situation Engine
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase">
                Gemini-Powered
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live generative emergency intelligence modeling cascading threats & response gaps.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stream Toggle Switch */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400 font-bold px-2 uppercase text-[10px]">Stream API</span>
            <button
              onClick={() => setUseStreaming(!useStreaming)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                useStreaming ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  useStreaming ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={refresh}
            disabled={loading || !selectedDisasterId}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-xs font-bold text-slate-300 rounded-xl border border-slate-800 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Analyze
          </button>
        </div>
      </div>

      {/* Select Disaster Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1.5">
            Select Active Incident to Analyze
          </label>
          <select
            value={selectedDisasterId}
            onChange={(e) => setSelectedDisasterId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/80 cursor-pointer"
          >
            {disastersLoading ? (
              <option>Loading disasters...</option>
            ) : disasters.length === 0 ? (
              <option>No disasters available</option>
            ) : (
              disasters.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.type.toUpperCase()}] {d.title} (Risk: {d.total_score}/100)
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 px-3 flex justify-between items-center text-xs">
            <span className="text-slate-400 uppercase font-extrabold text-[9px] tracking-wider">Severity posture:</span>
            <span className={`font-black uppercase tracking-wider text-[10px] ${
              currentDisaster?.total_score > 75 ? 'text-red-400 animate-pulse' :
              currentDisaster?.total_score > 50 ? 'text-orange-400' : 'text-amber-400'
            }`}>
              {currentDisaster?.severity_label || 'Moderate'}
            </span>
          </div>
        </div>
      </div>

      {/* Fallback Notice Banner */}
      {isFallback && !loading && (
        <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="text-[11px] leading-relaxed text-slate-300">
            <strong className="text-indigo-300">AI Local Sandbox Active:</strong> Gemini client is offline or missing API credentials. Real-time situation analyses are calculated using high-fidelity local emergency rule structures contextually tailored to this disaster's type, impact metrics, and active resource levels.
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl flex items-center gap-2">
          <ShieldX className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Error loading situation insights: {error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !isStreaming && (
        <div className="space-y-4 py-6">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating Unified Command Analysis Report...
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-40 bg-slate-950/30 rounded-xl border border-slate-800/40 animate-pulse"></div>
            <div className="h-40 bg-slate-950/30 rounded-xl border border-slate-800/40 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Streaming Progress Feedback */}
      {isStreaming && (
        <div className="border border-indigo-500/20 bg-indigo-950/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 animate-bounce" />
              DIEP-AI is compiling stream...
            </span>
            <span className="text-[10px] font-mono">TEXT CHUNKS INCOMING</span>
          </div>
          
          <div className="font-mono text-[10px] bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto text-slate-300 leading-normal scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {streamingText || 'Handshaking server sent event protocol...'}
          </div>
          
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-infinite-scroll"></div>
          </div>
        </div>
      )}

      {/* Core Intelligence Report Display */}
      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column: Summary, Threats, Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Executive Summary */}
            <div className="bg-indigo-950/10 border border-indigo-900/40 p-5 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">
                  Command Executive Summary
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  Updated: {new Date(data.updated_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {data.executive_summary}
              </p>
            </div>

            {/* Immediate Threat Alerts */}
            <div className="space-y-3">
              <span className="block text-[10px] uppercase font-black tracking-widest text-red-400">
                Active Threat Vectors
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.immediate_threats.map((threat, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3 transition-all hover:border-slate-700/80"
                  >
                    <div className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg shrink-0 mt-0.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white leading-snug">
                          {threat.threat}
                        </span>
                        <span className={`text-[8px] font-bold border px-1.5 rounded-md uppercase tracking-wider ${getSeverityBadge(threat.severity)}`}>
                          {threat.severity}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <strong className="text-slate-500 uppercase font-black tracking-wide text-[8px]">Sector:</strong> {threat.impact_area}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Actions Checklist */}
            <div className="space-y-3">
              <span className="block text-[10px] uppercase font-black tracking-widest text-emerald-400">
                Actionable Operations Checklist
              </span>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 divide-y divide-slate-800/80">
                {data.priority_actions.map((act, idx) => {
                  const isChecked = !!checkedActions[act.action];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleAction(act.action)}
                      className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer select-none group transition-colors ${
                        isChecked ? 'opacity-50' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <button className="shrink-0 mt-0.5 text-slate-400 group-hover:text-emerald-400 transition-colors">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400 fill-emerald-500/10" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <div className="space-y-1 flex-1">
                        <span className={`text-xs font-bold leading-normal block ${
                          isChecked ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}>
                          {act.action}
                        </span>
                        <div className="flex items-center gap-3 text-[9px] text-slate-400">
                          <div>
                            <span className="font-extrabold text-[8px] uppercase tracking-wider text-slate-500">Unit:</span> {act.responsible_party}
                          </div>
                          <div>
                            <span className="font-extrabold text-[8px] uppercase tracking-wider text-slate-500">Target:</span> {act.time_criticality}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Sidebar Column: Gaps, Window, Confidence */}
          <div className="space-y-6">
            
            {/* Operational Response Window */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Hourglass className="h-4 w-4 text-indigo-400 animate-spin" />
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-300">
                  Operational Rescue Window
                </span>
              </div>
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 text-center space-y-1">
                <span className="block text-xs font-black text-white font-mono uppercase tracking-wide">
                  {data.estimated_response_window}
                </span>
                <span className="text-[9px] text-slate-400 leading-normal block">
                  Critical timing limit calculated based on cascading damage hazards.
                </span>
              </div>
            </div>

            {/* AI Model Projection Confidence */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-300">
                    Model Confidence Rating
                  </span>
                </div>
                <span className={`text-[9px] font-black border px-2 py-0.5 rounded-full uppercase tracking-wider ${getConfidenceBadge(data.confidence_level)}`}>
                  {data.confidence_level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                "{data.confidence_explanation}"
              </p>
            </div>

            {/* Logistics Resource Shortfalls */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Boxes className="h-4 w-4 text-indigo-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-300">
                  Critical Logistic Gaps
                </span>
              </div>

              <div className="space-y-4">
                {data.resource_gaps.map((gap, idx) => {
                  const percent = Math.min(100, Math.round((gap.available / gap.needed) * 100)) || 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{gap.resource}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {gap.available} / {gap.needed}
                        </span>
                      </div>
                      
                      {/* Gap bar */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full ${
                            percent < 30 ? 'bg-red-500' : percent < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>

                      {/* Shorfall tag */}
                      <div className="flex justify-between items-center text-[9px] bg-slate-900 p-1.5 rounded border border-slate-800/80">
                        <span className="text-red-400 font-extrabold uppercase text-[8px] tracking-wider">
                          Shortfall: -{gap.gap}
                        </span>
                        <span className="text-slate-400 truncate max-w-[150px]" title={gap.mitigation_plan}>
                          Plan: {gap.mitigation_plan}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Empty State / Not analyzed yet */}
      {!data && !loading && selectedDisasterId && (
        <div className="border border-slate-800 rounded-xl p-8 text-center bg-slate-950/20 text-slate-400 space-y-2">
          <Activity className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
          <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Incident Ready for Analysis</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Select standard or streaming API delivery and click "Analyze" to deploy virtual intelligence agent DIEP-AI.
          </p>
        </div>
      )}

    </div>
  );
}

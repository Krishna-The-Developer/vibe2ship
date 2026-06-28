import React, { useState, useEffect, useCallback } from 'react';
import { useApp, Task } from '../../context/AppContext';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Sliders, 
  ArrowRight,
  Sparkles,
  Layers,
  ListFilter,
  CheckCircle2
} from 'lucide-react';

interface AnalyzedTask {
  id: string;
  title: string;
  priority: string;
  hours_left: number;
  risk_level: string;
  suggested_action: string;
  color_code: string;
}

interface CriticalAnalysisResponse {
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  analyzed_tasks: AnalyzedTask[];
  overall_recommendations: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function CriticalTasksReport() {
  const { tasks } = useApp();
  
  // Filter only uncompleted tasks for risk auditing
  const activeTasks = tasks.filter(t => !t.completed);

  const [analysis, setAnalysis] = useState<CriticalAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const fetchCriticalAnalysis = useCallback(async () => {
    if (activeTasks.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payloadTasks = activeTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        duration: t.duration,
        deadline: t.deadline,
        category: t.category || "Work",
        completed: t.completed
      }));

      const response = await fetch(`${API_BASE_URL}/api/analysis/critical-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: payloadTasks }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status}`);
      }

      const data: CriticalAnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.warn("FastAPI offline or slow. Using client-side real-time predictive model simulation.");
      
      // Standalone fallback identical to Python service algorithm for offline capability
      const now = new Date();
      let critCount = 0;
      let hiCount = 0;
      let medCount = 0;
      let loCount = 0;

      const analyzed: AnalyzedTask[] = activeTasks.map(t => {
        const deadlineDt = new Date(t.deadline);
        const diffMs = deadlineDt.getTime() - now.getTime();
        const hoursLeft = Math.max(0, Number((diffMs / (3600 * 1000)).toFixed(2)));
        const durationHours = t.duration / 60.0;
        
        let baseRisk = "Low";
        if (hoursLeft <= 0) {
          baseRisk = "Critical";
        } else {
          const ratio = hoursLeft / durationHours;
          if (ratio <= 1.0) {
            baseRisk = "Critical";
          } else if (ratio <= 1.8) {
            baseRisk = "High";
          } else if (ratio <= 3.5) {
            baseRisk = "Medium";
          } else {
            baseRisk = "Low";
          }
        }

        // Priority escalation
        let finalRisk = baseRisk;
        const prio = t.priority.toLowerCase();
        if (prio === "panic") {
          if (baseRisk === "Low") finalRisk = "High";
          else if (baseRisk === "Medium") finalRisk = "Critical";
          else if (baseRisk === "High") finalRisk = "Critical";
        } else if (prio === "high") {
          if (baseRisk === "Low") finalRisk = "Medium";
          else if (baseRisk === "Medium") finalRisk = "High";
          else if (baseRisk === "High") finalRisk = "Critical";
        }

        let colorCode = "green";
        if (finalRisk === "Critical") {
          colorCode = "red";
          critCount++;
        } else if (finalRisk === "High") {
          colorCode = "orange";
          hiCount++;
        } else if (finalRisk === "Medium") {
          colorCode = "yellow";
          medCount++;
        } else {
          loCount++;
        }

        // Suggestions mapping
        let action = "";
        if (finalRisk === "Critical") {
          action = prio === "panic" 
            ? "🚨 EMERGENCY OVERDRIVE: Shut down social apps. Run immediate core deliverables first. Do not style." 
            : "🛑 CORE CRITICAL: Zero safety margin left. Slice task into 3 immediate micro-steps and execute now.";
        } else if (finalRisk === "High") {
          action = "⚠️ BLOCK TIME: High schedule friction. Put a formal 45-minute sprint on your planner immediately.";
        } else if (finalRisk === "Medium") {
          action = "🛡️ SCHEDULING INTERVENTION: Moderate risk. Resolve in your next safe slot to maintain stress-free buffers.";
        } else {
          action = "✅ PROACTIVE STABILITY: Secure. Do a simple 5-minute outline now to make execution smooth later.";
        }

        return {
          id: t.id,
          title: t.title,
          priority: t.priority,
          hours_left: hoursLeft,
          risk_level: finalRisk,
          suggested_action: action,
          color_code: colorCode
        };
      });

      // Sort Critical -> High -> Medium -> Low
      const order: Record<string, number> = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 };
      analyzed.sort((a, b) => (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4));

      const overallRecs = [];
      if (critCount > 0) {
        overallRecs.push(`🚨 IMMEDIATE CRISIS AUDIT: You have ${critCount} Critical risk task(s) requiring focus right now.`);
      }
      if (hiCount > 0) {
        overallRecs.push(`⚠️ SLOTTING CRITICALITY: Lock ${hiCount} High risk tasks into your upcoming open slots immediately.`);
      }
      if (critCount === 0 && hiCount === 0) {
        overallRecs.push("📊 SECURE MARGINS: Excellent! No critical tasks detected. Keep working steadily to preserve buffers.");
      }
      overallRecs.push("🛡️ POMODORO PROTOCOL: Turn off your cellular devices and run standard 25-minute sprints with brief breaks.");

      setAnalysis({
        critical_count: critCount,
        high_count: hiCount,
        medium_count: medCount,
        low_count: loCount,
        analyzed_tasks: analyzed,
        overall_recommendations: overallRecs
      });
      setError("Active telemetry showing client-side mathematical projection.");
    } finally {
      setLoading(false);
    }
  }, [activeTasks]);

  // Recalculate on mount and when active task count changes
  useEffect(() => {
    fetchCriticalAnalysis();
  }, [activeTasks.length, fetchCriticalAnalysis]);

  const getRiskCardStyles = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'border-red-500/30 bg-red-500/5 text-red-400';
      case 'High': return 'border-orange-500/30 bg-orange-500/5 text-orange-400';
      case 'Medium': return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400';
      default: return 'border-green-500/30 bg-green-500/5 text-green-400';
    }
  };

  const getRiskBadgeStyles = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'High': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
  };

  const filteredTasks = analysis?.analyzed_tasks.filter(t => {
    if (filterRisk === 'all') return true;
    return t.risk_level.toLowerCase() === filterRisk;
  }) || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header section with diagnostic state indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              LIST-WIDE CRITICAL RISK ANALYSIS
              <span className="px-2 py-0.5 text-[8px] font-black rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                Telemetry Active
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Simultaneous audit of workload bottlenecks, buffer compressions, and priority alignment.
            </p>
          </div>
        </div>

        {/* Audit controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCriticalAnalysis}
            disabled={loading}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition duration-150 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
            title="Recalculate safety zones"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Re-audit
          </button>

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider transition ${
                viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider transition ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Audit content */}
      {activeTasks.length === 0 ? (
        <div className="py-16 text-center bg-slate-950/25 rounded-2xl border border-dashed border-slate-800/80">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-70 mb-2 animate-bounce" />
          <p className="text-xs text-white font-bold uppercase tracking-wider">Zero Pending Tasks In Progress</p>
          <p className="text-[10px] text-slate-500 mt-1">Add tasks with custom deadlines to activate your proactive risk monitoring boards.</p>
        </div>
      ) : loading && !analysis ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Running list-wide resource simulation...</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          
          {/* Diagnostic Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-red-500/20 transition-all duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Critical Risk</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-red-500 font-mono">{analysis.critical_count}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tasks</span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${(analysis.critical_count / activeTasks.length) * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-orange-500/20 transition-all duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">High Risk</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-orange-500 font-mono">{analysis.high_count}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tasks</span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${(analysis.high_count / activeTasks.length) * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-yellow-500/20 transition-all duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Medium Risk</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-yellow-500 font-mono">{analysis.medium_count}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tasks</span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: `${(analysis.medium_count / activeTasks.length) * 100}%` }} />
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-green-500/20 transition-all duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Low Risk</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-green-500 font-mono">{analysis.low_count}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tasks</span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(analysis.low_count / activeTasks.length) * 100}%` }} />
              </div>
            </div>

          </div>

          {/* Filtering row */}
          <div className="flex items-center gap-2.5 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
            <ListFilter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Filter Risk Level:</span>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'critical', 'high', 'medium', 'low'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition border ${
                    filterRisk === risk 
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
            <span className="text-[9px] font-mono text-slate-500 ml-auto">
              Showing {filteredTasks.length} of {analysis.analyzed_tasks.length}
            </span>
          </div>

          {/* Audit Results Visualization (Cards or Table) */}
          {filteredTasks.length === 0 ? (
            <div className="py-10 text-center bg-slate-950/10 border border-dashed border-slate-800/60 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No active items fit this risk criteria.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((t) => (
                <div 
                  key={t.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${getRiskCardStyles(t.risk_level)}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getRiskBadgeStyles(t.risk_level)}`}>
                        {t.risk_level}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                        {t.priority} priority
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-white line-clamp-1">{t.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 font-mono">
                      <TrendingUp className="h-3 w-3" />
                      {t.hours_left} Hours Left
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <span className="text-[8px] text-slate-500 font-black uppercase block tracking-wider mb-1">PROACTIVE ACTION STEP</span>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                      {t.suggested_action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                    <th className="py-3 px-4">Task Deliverable</th>
                    <th className="py-3 px-4">Hours Left</th>
                    <th className="py-3 px-4">Original Prio</th>
                    <th className="py-3 px-4">Risk Class</th>
                    <th className="py-3 px-4">Dynamic Suggestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-4 font-black text-white text-[10px] max-w-[180px] truncate">{t.title}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 font-semibold">{t.hours_left}h</td>
                      <td className="py-3 px-4 text-[9px] text-slate-400 font-bold uppercase">{t.priority}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getRiskBadgeStyles(t.risk_level)}`}>
                          {t.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[9px] text-slate-300 font-medium leading-relaxed max-w-[280px] truncate" title={t.suggested_action}>
                        {t.suggested_action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* List-wide action recommendations */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                COGNITIVE DECONGESTION ACTION PLAN
              </h3>
            </div>
            
            <ul className="space-y-2.5">
              {analysis.overall_recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[10px] text-slate-300 leading-relaxed">
                  <ArrowRight className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Statistical Disclaimer */}
          <div className="p-3.5 bg-rose-950/5 border border-rose-500/10 rounded-xl flex items-start gap-2.5">
            <Activity className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-500 leading-normal italic">
              Risk parameters computed via dynamic buffer estimation ratios, aligned with standard industrial resource allocation protocols. Projections are indicators of timeline stress, not guarantees of success or failure.
            </p>
          </div>

        </div>
      ) : null}
    </div>
  );
}

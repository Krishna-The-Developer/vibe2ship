import React, { useState, useEffect, useCallback } from 'react';
import { useApp, Task } from '../../context/AppContext';
import { 
  Zap, 
  Hourglass, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  BrainCircuit, 
  Gauge, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

interface ZoneDetail {
  name: string;
  duration_hours: number;
  percentage: number;
  description: string;
  color: string;
}

interface TaskImpactResponse {
  title: string;
  deadline: string;
  hours_remaining: number;
  urgency_score: number;
  zones: ZoneDetail[];
  recommendations: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function TaskImpact() {
  const { tasks } = useApp();
  
  // Keep only active (uncompleted) tasks
  const activeTasks = tasks.filter(t => !t.completed);

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [impactData, setImpactData] = useState<TaskImpactResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = activeTasks.find(t => t.id === selectedTaskId);

  // Set default selected task if empty and tasks exist
  useEffect(() => {
    if (!selectedTaskId && activeTasks.length > 0) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, selectedTaskId]);

  const fetchTaskImpact = useCallback(async (task: Task) => {
    setLoading(true);
    setError(null);
    try {
      const estimatedHours = Math.max(0.25, task.duration / 60.0);
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/task-impact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          deadline: task.deadline,
          estimated_duration_hours: estimatedHours
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status}`);
      }

      const data: TaskImpactResponse = await response.json();
      setImpactData(data);
    } catch (err: any) {
      console.warn('Error fetching task impact from FastAPI, triggering local backup estimator:', err);
      
      // Fallback calculation in case FastAPI is offline or starting up
      // Calculates exactly the same safety ratios on the client side
      const deadlineDt = new Date(task.deadline);
      const now = new Date();
      const diffMs = deadlineDt.getTime() - now.getTime();
      const hoursRemaining = Math.max(0.1, diffMs / (3600 * 1000));
      const estHours = Math.max(0.25, task.duration / 60.0);

      const critTime = Math.min(hoursRemaining, estHours);
      const highTime = Math.min(Math.max(0, hoursRemaining - critTime), estHours * 0.5);
      const medTime = Math.min(Math.max(0, hoursRemaining - critTime - highTime), estHours * 1.5);
      const lowTime = Math.max(0, hoursRemaining - critTime - highTime - medTime);

      const critPct = (critTime / hoursRemaining) * 100.0;
      const highPct = (highTime / hoursRemaining) * 100.0;
      const medPct = (medTime / hoursRemaining) * 100.0;
      const lowPct = (lowTime / hoursRemaining) * 100.0;

      const urgencyScore = estHours / hoursRemaining >= 1.0 
        ? 100 
        : Math.max(0, Math.min(99, Math.round((estHours / hoursRemaining) * 100)));

      const fallbackZones: ZoneDetail[] = [
        {
          name: "Critical Zone",
          duration_hours: Number(critTime.toFixed(2)),
          percentage: Number(critPct.toFixed(1)),
          description: "Zero buffer. Starting in this window means non-stop pressure to finish on time with no errors.",
          color: "red"
        },
        {
          name: "High Zone",
          duration_hours: Number(highTime.toFixed(2)),
          percentage: Number(highPct.toFixed(1)),
          description: "High friction. Any unexpected disruption (bug, call, fatigue) will slide you into overdue.",
          color: "orange"
        },
        {
          name: "Medium Zone",
          duration_hours: Number(medTime.toFixed(2)),
          percentage: Number(medPct.toFixed(1)),
          description: "Healthy buffer. Provides room for brief breaks, debugging, and light proofreading.",
          color: "yellow"
        },
        {
          name: "Low Zone",
          duration_hours: Number(lowTime.toFixed(2)),
          percentage: Number(lowPct.toFixed(1)),
          description: "Premium comfort. Completely relaxed window with maximum strategic flexibility.",
          color: "green"
        }
      ];

      const fallbackRecs = [];
      if (urgencyScore >= 90) {
        fallbackRecs.push("🚨 PANIC LEVEL DANGER: You have zero safety margin left. Stop studying calendars, disable notifications, and execute the core task immediately.");
        fallbackRecs.push("⚡ DESCOPE ARCHITECTURE: Do not build nice-to-haves. Focus strictly on completing the essential core requirements.");
      } else if (urgencyScore >= 75) {
        fallbackRecs.push("⚠️ EXTREME RUSH RISK: You are on the precipice of entering the Critical Zone. Every 10 minutes of delay removes 5% of your stress-coping buffer.");
        fallbackRecs.push("⏱️ POMODORO SPRINT: Run two back-to-back 25-minute sprints without touching your phone.");
      } else {
        fallbackRecs.push("✅ PREMIUM SAFE WINDOW: You are in the green zone. Take advantage of your early start to design a clean, modular solution.");
        fallbackRecs.push("📅 BLOCK INTEGRATION: Lock a dedicated focus window in your timeline right now.");
      }

      setImpactData({
        title: task.title,
        deadline: task.deadline,
        hours_remaining: Number(hoursRemaining.toFixed(2)),
        urgency_score: urgencyScore,
        zones: fallbackZones,
        recommendations: fallbackRecs
      });
      
      setError('Algorithms computing with client-side mathematical projection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever task is updated or changes
  useEffect(() => {
    if (selectedTask) {
      fetchTaskImpact(selectedTask);
    } else {
      setImpactData(null);
    }
  }, [selectedTaskId, selectedTask, fetchTaskImpact]);

  // Formatters for display
  const getProgressColor = (score: number) => {
    if (score >= 90) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 75) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (score >= 50) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getUrgencyText = (score: number) => {
    if (score >= 90) return 'CRITICAL DANGER';
    if (score >= 75) return 'HIGH URGENCY';
    if (score >= 50) return 'MODERATE STRESS';
    return 'SAFE HARBOR';
  };

  const getZoneBorderColor = (color: string) => {
    switch (color) {
      case 'red': return 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10';
      case 'orange': return 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10';
      case 'yellow': return 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10';
      default: return 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10';
    }
  };

  const getZoneTextClass = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'yellow': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header section with Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              TASK IMPACT ESTIMATION ENGINE
              <span className="px-2 py-0.5 text-[8px] font-black rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-widest">
                Impact Mapping
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Visualize task completion risk distributions and cognitive buffers based on deadlines.
            </p>
          </div>
        </div>

        {/* Task dropdown selector */}
        {activeTasks.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Task:</span>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 min-w-[200px] max-w-[300px] truncate"
            >
              {activeTasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-[10px] text-amber-500 font-bold bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/10">
            Create active tasks first to view impact.
          </div>
        )}
      </div>

      {/* Main Analysis Output Area */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="h-9 w-9 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">
            Simulating timeline stress distributions...
          </p>
        </div>
      ) : !impactData ? (
        <div className="py-16 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
          <Info className="h-8 w-8 text-slate-600 mx-auto opacity-40 mb-2" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No Active Task Selected</p>
          <p className="text-[10px] text-slate-500 mt-1">Please select an uncompleted deliverable to analyze stress zones.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Metric Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Hour Counter Card */}
            <div className="bg-slate-950/40 border border-slate-800/70 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Time Left Until Deadline</span>
                <span className="text-2xl font-black text-white font-mono">{impactData.hours_remaining}</span>
                <span className="text-[9px] text-indigo-400 font-semibold block">Hours Available</span>
              </div>
              <Hourglass className="h-8 w-8 text-slate-700 opacity-60" />
            </div>

            {/* Estimated Duration Card */}
            <div className="bg-slate-950/40 border border-slate-800/70 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Duration</span>
                <span className="text-2xl font-black text-white font-mono">
                  {selectedTask ? (selectedTask.duration / 60.0).toFixed(1) : '0.0'}
                </span>
                <span className="text-[9px] text-indigo-400 font-semibold block">Hours of Focused Effort</span>
              </div>
              <Clock className="h-8 w-8 text-slate-700 opacity-60" />
            </div>

            {/* Urgency Score Circle Gauge */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${getProgressColor(impactData.urgency_score)}`}>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider block opacity-80">Cognitive Stress Index</span>
                <span className="text-2xl font-black font-mono block">{impactData.urgency_score}%</span>
                <span className="text-[9px] font-extrabold uppercase block">{getUrgencyText(impactData.urgency_score)}</span>
              </div>
              <Gauge className="h-8 w-8 opacity-70" />
            </div>

          </div>

          {/* Dynamic Stacked Percentage Progress Bar Chart */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-white uppercase tracking-wider">
              <span>Risk & Buffer Timeline Allocation Map</span>
              <span className="text-[10px] font-mono text-slate-500">100% of remaining time</span>
            </div>
            
            {/* Stacked Percentage bar */}
            <div className="w-full h-4.5 bg-slate-950 rounded-full flex overflow-hidden border border-slate-800/80">
              {impactData.zones.map((zone, idx) => {
                if (zone.percentage <= 0) return null;
                
                // Class matching the zone colors
                let barColor = 'bg-green-500';
                if (zone.color === 'red') barColor = 'bg-red-500';
                else if (zone.color === 'orange') barColor = 'bg-orange-500';
                else if (zone.color === 'yellow') barColor = 'bg-yellow-500';

                return (
                  <div
                    key={idx}
                    className={`${barColor} h-full transition-all duration-500 ease-in-out hover:opacity-90 relative group`}
                    style={{ width: `${zone.percentage}%` }}
                    title={`${zone.name}: ${zone.percentage}% (${zone.duration_hours}h)`}
                  />
                );
              })}
            </div>

            {/* Micro Percent Legend beneath the bar */}
            <div className="flex items-center justify-between pt-1">
              {impactData.zones.map((zone, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${
                    zone.color === 'red' ? 'bg-red-500' :
                    zone.color === 'orange' ? 'bg-orange-500' :
                    zone.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-[9px] text-slate-400 font-bold">
                    {zone.name.split(" ")[0]} ({zone.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Zone Grid Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {impactData.zones.map((zone, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border transition-all duration-300 ${getZoneBorderColor(zone.color)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${getZoneTextClass(zone.color)}`}>
                    {zone.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 font-extrabold bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                    {zone.duration_hours}h
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  {zone.description}
                </p>
              </div>
            ))}
          </div>

          {/* Custom recommendations list */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
              <Sparkles className="h-4 w-4 text-rose-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Cognitive Safe Harbor Action Plan
              </h3>
            </div>
            
            <ul className="space-y-2.5">
              {impactData.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[10px] text-slate-300 leading-relaxed">
                  <ArrowRight className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal/Behavioral Disclaimer */}
          <div className="p-3.5 bg-indigo-950/5 border border-indigo-500/10 rounded-xl flex items-start gap-2.5">
            <Info className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-500 leading-normal italic">
              Disclaimer: Impact estimation represents statistical scheduling ratios mapped to standard chronobiological safety limits. It does not replace personal accountability, custom stress responses, or real deadline negotiations.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

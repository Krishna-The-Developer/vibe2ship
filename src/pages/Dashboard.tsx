import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDisaster } from '../context/DisasterContext';
import { updateDisasterStatus } from '../services/firestoreService';
import { 
  Flame, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  ArrowRight,
  TrendingUp,
  Award,
  CalendarCheck,
  ListTodo,
  Globe,
  ShieldAlert,
  Users,
  Building2,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import UrgentTasksPanel from '../components/UrgentTasksPanel';
import LiveIndicator from '../components/Analysis/LiveIndicator';
import Skeleton from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

export default function Dashboard() {
  const { tasks, schedule, panicMode, togglePanicMode, motivationLevel, aiInsights, toggleTask } = useApp();
  const { currentUser } = useAuth();
  const { disasters, loading: disastersLoading, error: disastersError, triggerLiveFlash } = useDisaster();
  const [timeStr, setTimeStr] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Pending Tasks
  const pendingTasks = tasks.filter(t => !t.completed);
  const pendingCount = pendingTasks.length;

  // 2. Due Today (tasks with deadline today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueTodayCount = tasks.filter(t => !t.completed && t.deadline.startsWith(todayStr)).length;

  // 3. Completion Rate
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 4. Productivity Score (weighted calculation)
  const productivityScore = Math.min(100, Math.round((completionRate * 0.6) + (motivationLevel * 0.4)));

  // Closest urgency task
  const urgentTasks = pendingTasks
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const closestTask = urgentTasks[0];

  useEffect(() => {
    if (!closestTask) {
      setTimeStr('All Tasks Completed!');
      return;
    }

    const interval = setInterval(() => {
      const diff = new Date(closestTask.deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeStr('DEADLINE PAST!');
      } else {
        const h = Math.floor(diff / (3600 * 1000));
        const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
        const s = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeStr(`${h}h ${m}m ${s}s left`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [closestTask]);

  // Handle live Firestore status updating directly from telemetry dashboard
  const handleStatusChange = async (disasterId: string, currentStatus: 'active' | 'monitored' | 'resolved') => {
    const nextStatusMap: Record<string, 'active' | 'monitored' | 'resolved'> = {
      active: 'monitored',
      monitored: 'resolved',
      resolved: 'active'
    };
    const nextStatus = nextStatusMap[currentStatus];

    setUpdatingId(disasterId);
    try {
      await updateDisasterStatus(disasterId, nextStatus);
      // The local LiveIndicator will automatically flash because onSnapshot triggers immediately!
    } catch (err) {
      console.error("Failed to update status on Firestore:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        
        {/* Action Header Notification */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          panicMode 
            ? 'bg-red-950/40 border-red-900/50 shadow-lg shadow-red-900/10' 
            : 'bg-slate-900/80 border-slate-800 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  SYSTEM CONTROL MODULE
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                  AI Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {panicMode 
                  ? "CRITICAL STATE: Unnecessary widgets shut down. Prioritizing instant dopamine subtask allocation."
                  : "Welcome to your command console. Review analytics, active priorities, and execute plans below."}
              </p>
            </div>
            <button
              onClick={togglePanicMode}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs transition-all shadow-sm cursor-pointer border ${
                panicMode 
                  ? 'bg-alert-orange hover:bg-orange-600 text-white border-orange-500 scale-105 animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Flame className={`h-4 w-4 ${panicMode ? 'animate-bounce text-yellow-300' : 'text-slate-400'}`} />
              {panicMode ? 'DEACTIVATE EMERGENCY MODE' : 'FORCE PANIC SHUTDOWN'}
            </button>
          </div>
        </div>

        {/* Live Synchronized Connection Indicator */}
        <LiveIndicator />

        {/* Grid of 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Stat Card 1: Pending Tasks */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Tasks</p>
              <p className="text-3xl font-black text-white mt-2">{pendingCount}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Require urgent execution</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-primary-blue border border-blue-500/10">
              <ListTodo className="h-5 w-5" />
            </div>
          </div>

          {/* Stat Card 2: Due Today */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Due Today</p>
              <p className="text-3xl font-black text-white mt-2">{dueTodayCount}</p>
              <p className="text-[10px] text-alert-orange font-bold mt-1">Needs direct action</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 text-alert-orange border border-orange-500/10">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Stat Card 3: Completion Rate */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completion Rate</p>
              <p className="text-3xl font-black text-white mt-2">{completionRate}%</p>
              <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-success-green h-full" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 text-success-green border border-green-500/10">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          {/* Stat Card 4: Productivity Score */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Productivity Score</p>
              <p className="text-3xl font-black text-white mt-2">{productivityScore}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Weighted metric index</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-motivational-purple border border-purple-500/10">
              <Award className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* Real-time Urgent Intrusion Risks (FastAPI Integration) */}
        <UrgentTasksPanel />

        {/* Real-time Geospatial Disaster Telemetry Feed (Live Firestore Synchronized) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Globe className="h-5 w-5 animate-spin" style={{ animationDuration: '20s' }} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Live Geospatial Disaster Feed
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                    LIVE RECEPTOR
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Merging live custom Firestore records with USGS seismic telemetry feeds globally.
                </p>
              </div>
            </div>

            <button
              onClick={triggerLiveFlash}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Flash Sensor Sync"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Loading Indicator */}
          {disastersLoading && disasters.length === 0 && (
            <div className="py-2 space-y-4">
              <Skeleton variant="list" lines={2} />
            </div>
          )}

          {/* Combined Disasters Grid */}
          {!disastersLoading && disasters.length === 0 ? (
            <EmptyState 
              title="No Active Disasters. System Monitoring." 
              message="No disasters registered in Firestore or active USGS feeds. All stations reporting green." 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
              {disasters.slice(0, 8).map((disaster) => {
                const isFirestore = disaster.source === 'firestore';
                const severity = disaster.severity_label;
                
                // Color mapping for severity
                const severityStyles: Record<string, string> = {
                  Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  Moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
                  Catastrophic: 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse'
                };

                return (
                  <div 
                    key={disaster.id}
                    className={`p-4 border rounded-xl flex flex-col justify-between transition-all duration-300 ${
                      disaster.status === 'active' 
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900/40 border-slate-900 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                          isFirestore 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        }`}>
                          {isFirestore ? 'FIRESTORE' : 'USGS TELEMETRY'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border ${severityStyles[severity] || severityStyles.Moderate}`}>
                            {severity.toUpperCase()}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                            disaster.status === 'active' 
                              ? 'bg-red-500/15 text-red-400' 
                              : disaster.status === 'monitored' 
                                ? 'bg-yellow-500/15 text-yellow-400' 
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {disaster.status}
                          </span>
                        </div>
                      </div>

                      {/* Disaster Title */}
                      <h3 className="text-xs font-black text-white leading-snug line-clamp-1">
                        {disaster.title}
                      </h3>

                      {/* Magnitude Details */}
                      <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-indigo-400" />
                          Mag: <b className="text-slate-200">{disaster.magnitude.toFixed(1)}</b>
                        </span>
                        {disaster.depth_km !== undefined && disaster.depth_km !== null && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3 text-indigo-400" />
                            Depth: <b className="text-slate-200">{disaster.depth_km.toFixed(0)} km</b>
                          </span>
                        )}
                        <span className="text-[10px] font-black text-slate-200 ml-auto bg-slate-950 px-1.5 py-0.5 rounded">
                          SCORE: {disaster.total_score.toFixed(1)}
                        </span>
                      </div>

                      {/* Population & Infrastructure Metrics */}
                      <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-900 text-[9px]">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>Pop: <b>{disaster.population_affected.toLocaleString()}</b></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          <span>Infra: <b>{disaster.damaged_critical}/{disaster.total_critical}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Live Control (Firestore Update Demo) */}
                    {isFirestore && (
                      <div className="mt-3.5 pt-2 border-t border-slate-900/60 flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                          Firestore Action
                        </span>
                        <button
                          onClick={() => handleStatusChange(disaster.id, disaster.status)}
                          disabled={updatingId === disaster.id}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700/80 rounded-lg text-[9px] font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
                        >
                          {updatingId === disaster.id ? (
                            <>
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              WRITING...
                            </>
                          ) : (
                            <>
                              CYCLE STATUS <ChevronRight className="h-2.5 w-2.5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Middle Layout: Urgent Countdown & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Countdown Screen */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Primary Urgent Target</span>
              </div>
              {closestTask && (
                <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${
                  closestTask.priority === 'panic' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                }`}>
                  {closestTask.priority.toUpperCase()}
                </span>
              )}
            </div>

            <div className="my-6">
              <h2 className="text-xs text-slate-400 font-bold uppercase">Target Title:</h2>
              <p className="text-lg font-bold text-white mt-1.5 truncate">
                {closestTask ? closestTask.title : 'All targets neutralized!'}
              </p>
              <div className="text-3xl md:text-4xl font-black tracking-mono text-alert-orange mt-3 font-mono">
                {timeStr}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Due at: {closestTask ? new Date(closestTask.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
              </span>
              {closestTask && (
                <Link to="/tasks" className="text-primary-blue hover:text-blue-400 font-bold flex items-center gap-1 transition-all">
                  ENGAGE TARGET <Play className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* AI Insight Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">AI Companion Feed</span>
                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-3 mt-4 overflow-y-auto max-h-[160px] pr-1">
                {aiInsights.slice(0, 3).map((insight, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl text-xs border ${
                      insight.includes('🚨') 
                        ? 'bg-red-950/25 text-red-300 border-red-900/40' 
                        : insight.includes('⚡') 
                          ? 'bg-amber-950/20 text-amber-300 border-amber-900/30'
                          : 'bg-slate-950/40 text-slate-300 border-slate-800/80'
                    }`}
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic text-center mt-3">
              Insights auto-regenerate based on performance metrics.
            </p>
          </div>

        </div>

        {/* Bottom Grid: Recent Tasks & Next Calendar Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Tasks List */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">Recent Target Actions</h3>
              <Link to="/tasks" className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                All targets cleared! Keep up the brilliant resilience.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[220px] overflow-y-auto pr-1">
                {pendingTasks.slice(0, 4).map(task => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="h-4.5 w-4.5 rounded border border-slate-700 hover:border-blue-500 flex items-center justify-center cursor-pointer flex-shrink-0"
                      >
                        <span className="sr-only">Toggle</span>
                      </button>
                      <div>
                        <p className="text-xs font-bold text-slate-200 truncate max-w-sm">{task.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Duration: {task.duration}m | Priority: {task.priority}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.priority === 'panic' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Calendar list */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">Next Timeline Slots</h3>
              <Link to="/scheduler" className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1">
                Timeline <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {schedule.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No slots planned. Initialize AI timeline scheduler.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {schedule.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-200 truncate max-w-[160px]">{item.title}</p>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{item.startTime} - {item.endTime}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      item.type === 'fixed' ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

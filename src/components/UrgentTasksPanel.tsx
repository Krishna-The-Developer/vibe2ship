import React, { useState, useEffect } from 'react';
import { useUrgentTasks } from '../hooks/useUrgentTasks';
import { 
  Flame, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ListTodo,
  Calendar
} from 'lucide-react';

export interface UrgentTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'panic';
  duration: number;
  deadline: string;
  category: string;
  completed: boolean;
  subtasks: { id: string; title: string; completed: boolean }[];
  created_at?: string;
}

export default function UrgentTasksPanel() {
  const { tasks, loading, error, refetch } = useUrgentTasks();
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});

  // Countdown timer calculation for each task's deadline
  useEffect(() => {
    if (tasks.length === 0) return;

    const calculateTimes = () => {
      const updatedTimes: Record<string, string> = {};
      
      tasks.forEach(task => {
        const diff = new Date(task.deadline).getTime() - Date.now();
        if (diff <= 0) {
          updatedTimes[task.id] = 'OVERDUE!';
        } else {
          const h = Math.floor(diff / (3600 * 1000));
          const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
          const s = Math.floor((diff % (60 * 1000)) / 1000);
          
          if (h > 0) {
            updatedTimes[task.id] = `${h}h ${m}m ${s}s`;
          } else if (m > 0) {
            updatedTimes[task.id] = `${m}m ${s}s`;
          } else {
            updatedTimes[task.id] = `${s}s left!`;
          }
        }
      });

      setTimeRemaining(updatedTimes);
    };

    calculateTimes();
    const interval = setInterval(calculateTimes, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              REAL-TIME URGENT INTRUSIONS
              <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-red-500/15 text-red-400 border border-red-500/20 uppercase tracking-widest">
                FASTAPI LIVE
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Refreshes in background every 30 seconds to capture priority level upgrades.
            </p>
          </div>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          title="Manual Refetch Now"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading State */}
      {loading && tasks.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Intercepting Urgent Streams...</p>
        </div>
      )}

      {/* Tasks List rendering */}
      {!loading && tasks.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="h-8 w-8 text-success-green mx-auto opacity-40" />
          <p className="font-extrabold uppercase tracking-wider">No Urgent Intrusion Risks Detected!</p>
          <p className="text-[10px] text-slate-400">All current assignments are safely within standard deadline margins.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {tasks.map(task => {
            const isPanic = task.priority === 'panic';
            const completedSubtasks = task.subtasks.filter(s => s.completed).length;
            const totalSubtasks = task.subtasks.length;
            const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

            return (
              <div 
                key={task.id}
                className={`p-4 border rounded-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  isPanic 
                    ? 'bg-red-950/10 border-red-900/50 shadow-md shadow-red-950/20 hover:bg-red-950/15' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Visual glow accent for Panic Tasks */}
                {isPanic && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                )}

                {/* Top Section: Title & Countdown */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                        isPanic ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{task.category}</span>
                    </div>
                    <h3 className="text-xs font-black text-white leading-snug">{task.title}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{task.description}</p>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-center justify-center font-mono text-center min-w-[85px] ${
                    isPanic 
                      ? 'bg-red-950/50 border-red-900/40 text-red-400 animate-pulse' 
                      : 'bg-slate-900 border-slate-800 text-indigo-400'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-0.5">
                      <Clock className="h-2 w-2" /> DEADLINE
                    </span>
                    <span className="text-[10px] font-black tracking-tighter mt-0.5">
                      {timeRemaining[task.id] || 'Calculating...'}
                    </span>
                  </div>
                </div>

                {/* Bottom Section: Progress bar and Subtasks summary */}
                {totalSubtasks > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <ListTodo className="h-3 w-3" /> Micro-steps Breakdown
                      </span>
                      <span className="text-slate-400">{completedSubtasks} / {totalSubtasks} ({progress}%)</span>
                    </div>
                    
                    {/* Tiny Progress Bar */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isPanic ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Subtasks detail snippet */}
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {task.subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${sub.completed ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                          <span className={`text-[9px] truncate ${sub.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                            {sub.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* If no subtasks, show simple duration warning */}
                {totalSubtasks === 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase">
                    <span>Est. Action Duration</span>
                    <span className="text-slate-400">{task.duration} Minutes</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

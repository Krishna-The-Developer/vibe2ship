import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Calendar, 
  TrendingUp, 
  ListChecks,
  AlertCircle
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';

export default function History() {
  const { tasks, deleteTask } = useApp();

  const completedTasks = tasks.filter(t => t.completed);

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* Header Block */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ListChecks className="h-5 w-5 text-success-green animate-bounce" />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Completed Targets Archive</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Historical ledger of all procrastination-defusing micro-sprints and accomplishments completed in previous work sessions.
          </p>
        </div>

        {/* Content Details split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs uppercase font-black tracking-widest text-slate-400">Archived Workflows ({completedTasks.length})</h3>

              {completedTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <AlertCircle className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="font-bold uppercase">No records found.</p>
                  <p className="text-slate-500 mt-1">Complete active tasks inside the Dashboard or Tasks tab to build history.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 divide-y divide-slate-800/40">
                  {completedTasks.map(task => (
                    <div key={task.id} className="pt-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-md bg-success-green/20 text-success-green flex items-center justify-center mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200 line-through truncate max-w-sm">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold uppercase">
                            <span>{task.category || 'General'}</span>
                            <span>•</span>
                            <span>{task.duration}m duration</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 hover:bg-slate-950 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                        title="Permanently remove from logs"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats sidebar info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary-blue" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Historical Analytics</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 font-bold">Total Tasks Created:</span>
                  <span className="text-white font-extrabold">{tasks.length}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 font-bold">Total Tasks Defused:</span>
                  <span className="text-success-green font-extrabold">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 font-bold">Efficiency Ratio:</span>
                  <span className="text-primary-blue font-extrabold">
                    {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-medium italic text-center mt-2">
                Statistics calculated in real-time from active system registers.
              </p>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

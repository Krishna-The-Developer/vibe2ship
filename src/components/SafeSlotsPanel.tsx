import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSafeSlots, SafeSlot } from '../hooks/useSafeSlots';
import { 
  Shield, 
  Sparkles, 
  Clock, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';

export default function SafeSlotsPanel() {
  const { tasks, addScheduleItem } = useApp();
  const { slots, loading, error, fetchSafeSlots } = useSafeSlots();
  
  // Filter uncompleted tasks
  const activeTasks = tasks.filter(t => !t.completed);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTask = activeTasks.find(t => t.id === selectedTaskId);

  // Auto-fetch safe slots whenever selected task changes
  useEffect(() => {
    if (selectedTask) {
      fetchSafeSlots(selectedTask.deadline);
    }
  }, [selectedTaskId, fetchSafeSlots, selectedTask]);

  // Set default selected task if empty and tasks exist
  useEffect(() => {
    if (!selectedTaskId && activeTasks.length > 0) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, selectedTaskId]);

  const handleAddSlotToTimeline = (slot: SafeSlot) => {
    if (!selectedTask) return;

    // Helper to format ISO to HH:MM format
    const formatToHHMM = (isoString: string) => {
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "12:00";
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      } catch {
        return "12:00";
      }
    };

    const startTimeFormatted = formatToHHMM(slot.start_time);
    const endTimeFormatted = formatToHHMM(slot.end_time);

    addScheduleItem({
      title: `${slot.label}: ${selectedTask.title}`,
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      type: 'task',
      taskId: selectedTask.id
    });

    setSuccessMessage(`Successfully allocated "${slot.label}" (${startTimeFormatted} - ${endTimeFormatted}) to your focus timeline!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const formatFriendlyTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const formatFriendlyDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Today";
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (d.toDateString() === today.toDateString()) {
        return "Today";
      } else if (d.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return "Today";
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              SAFE TIME SLOTS ALLOCATOR
              <span className="px-2 py-0.5 text-[8px] font-black rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                Cognitive Safety
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Secure stress-buffered blocks prior to deadlines, scoring chronobiology and workload safety.
            </p>
          </div>
        </div>

        {/* Task Selector */}
        {activeTasks.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Focus Target:</span>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 min-w-[200px] max-w-[300px] truncate"
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
            Create active tasks first to allocate safe slots.
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-emerald-300 font-medium leading-relaxed">
            {successMessage}
          </p>
        </div>
      )}

      {/* Main content split */}
      {error && (
        <div className="p-4 bg-amber-950/10 border border-amber-900/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-black">
            <AlertCircle className="h-4 w-4" />
            <span>ALGORITHM BACKUP ACTIVE</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            FastAPI Safe Slots endpoint is offline. Using integrated client-side safe scheduling projections.
          </p>
        </div>
      )}

      {selectedTask ? (
        <div className="space-y-4">
          {/* Target Task Brief */}
          <div className="bg-slate-950/50 border border-slate-800/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase ${
                  selectedTask.priority === 'panic' 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {selectedTask.priority.toUpperCase()} Priority
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  {selectedTask.category || 'Work'}
                </span>
              </div>
              <h3 className="text-xs font-black text-white">{selectedTask.title}</h3>
              <p className="text-[10px] text-slate-400 max-w-xl leading-relaxed">{selectedTask.description}</p>
            </div>

            {/* Deadline status badge */}
            <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2.5 flex-shrink-0">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider">DEADLINE TARGET</span>
                <span className="text-[10px] font-black text-indigo-300 font-mono">
                  {formatFriendlyDate(selectedTask.deadline)} @ {formatFriendlyTime(selectedTask.deadline)}
                </span>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">
                Probing cognitive safety intervals...
              </p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
              <AlertCircle className="h-8 w-8 text-slate-600 mx-auto opacity-40 mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No Safe Slots Computed</p>
              <p className="text-[10px] text-slate-500 mt-1">Please select an active focus target to inspect cognitive safe spaces.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {slots.map((slot, index) => {
                const isOptimal = index === 0;
                
                return (
                  <div 
                    key={index} 
                    className={`flex flex-col justify-between p-4 border rounded-xl transition-all duration-300 relative overflow-hidden ${
                      isOptimal
                        ? 'bg-indigo-950/15 border-indigo-500/40 shadow-lg shadow-indigo-950/10 hover:bg-indigo-950/20'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Visual accent for optimal card */}
                    {isOptimal && (
                      <div className="absolute -top-6 -right-6 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                    )}

                    {/* Card content */}
                    <div className="space-y-3.5">
                      {/* Top bar with Score */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isOptimal 
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {isOptimal ? 'Optimal' : `Suggested #${index + 1}`}
                        </span>

                        <div className="flex items-center gap-1">
                          <Award className={`h-3 w-3 ${isOptimal ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <span className={`text-xs font-black font-mono ${isOptimal ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {slot.score}
                          </span>
                        </div>
                      </div>

                      {/* Interval Times */}
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Cognitive Window
                        </div>
                        <div className="text-xs font-black text-white mt-1 font-mono tracking-tight">
                          {formatFriendlyTime(slot.start_time)} - {formatFriendlyTime(slot.end_time)}
                        </div>
                        <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                          {formatFriendlyDate(slot.start_time)}
                        </div>
                      </div>

                      {/* Header label and narrative */}
                      <div className="space-y-1 pt-2 border-t border-slate-800/40">
                        <span className="text-[10px] font-black text-white flex items-center gap-1">
                          {slot.label}
                        </span>
                        <p className="text-[9px] text-slate-400 leading-relaxed min-h-[48px]">
                          {slot.description}
                        </p>
                      </div>
                    </div>

                    {/* Allocate Button */}
                    <button
                      onClick={() => handleAddSlotToTimeline(slot)}
                      className={`w-full mt-4 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all duration-300 ${
                        isOptimal
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Plus className="h-3 w-3" /> Allocate Window
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs">
          Please add a task to analyze cognitive safe intervals.
        </div>
      )}
    </div>
  );
}

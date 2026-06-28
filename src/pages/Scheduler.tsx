import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Calendar, 
  Trash2, 
  Plus, 
  Clock, 
  Coffee, 
  User, 
  Check, 
  AlertCircle
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import SafeSlotsPanel from '../components/SafeSlotsPanel';

export default function Scheduler() {
  const { 
    schedule, 
    tasks, 
    addScheduleItem, 
    toggleScheduleItem, 
    deleteScheduleItem, 
    generateAISchedule 
  } = useApp();

  const [newTitle, setNewTitle] = useState('');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:00');
  const [type, setType] = useState<'fixed' | 'task' | 'break'>('task');
  const [relatedTaskId, setRelatedTaskId] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addScheduleItem({
      title: newTitle,
      startTime,
      endTime,
      type,
      taskId: type === 'task' ? relatedTaskId : undefined
    });

    setNewTitle('');
    setStartTime('13:00');
    setEndTime('14:00');
    setType('task');
    setRelatedTaskId('');
  };

  const handleAIScheduling = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    generateAISchedule();
    setIsGenerating(false);
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Schedule controller & Form */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* AI Auto Scheduler trigger */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <h2 className="text-md font-extrabold tracking-tight text-white uppercase">AI Timeline Auto-Scheduler</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Have unallocated urgent tasks? Click below to let the AI auto-schedule deep work sessions around your fixed commitments.
            </p>

            <button
              onClick={handleAIScheduling}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              {isGenerating ? (
                <span>Running smart optimization...</span>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Auto-Schedule Active Tasks
                </>
              )}
            </button>
          </div>

          {/* Schedule Block Creator */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <h2 className="text-md font-extrabold text-white flex items-center gap-1.5 border-b border-slate-800/80 pb-3 uppercase">
              <Plus className="h-4 w-4 text-primary-blue" />
              <span>Add Focus Block</span>
            </h2>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Activity Name *</label>
                <input 
                  type="text"
                  placeholder="Standup or Quick Rest"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Start Time</label>
                  <input 
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">End Time</label>
                  <input 
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Block Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                >
                  <option value="task">Focus Block (Task)</option>
                  <option value="fixed">Fixed Meeting / Event</option>
                  <option value="break">Health Rest / Break</option>
                </select>
              </div>

              {type === 'task' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Associate Active Task</label>
                  <select
                    value={relatedTaskId}
                    onChange={e => setRelatedTaskId(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  >
                    <option value="">-- No linked task --</option>
                    {tasks.filter(t => !t.completed).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-4 bg-primary-blue hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Add Timeline Block
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Timeline Display */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase">Focus Timeline Plan</h2>
                <p className="text-xs text-slate-400">Chronological list of today's optimized actions.</p>
              </div>
              <Calendar className="h-5 w-5 text-slate-500" />
            </div>

            {schedule.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm space-y-3">
                <AlertCircle className="h-8 w-8 text-slate-700 mx-auto" />
                <p className="font-bold uppercase text-xs">Your timeline is looking empty.</p>
                <p className="text-xs text-slate-500">Generate an AI schedule or add manually above.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-800 pl-6 ml-3 space-y-6">
                {schedule.map(item => {
                  let badgeStyle = '';
                  let icon = <Clock className="h-4 w-4" />;
                  
                  if (item.type === 'fixed') {
                    badgeStyle = 'bg-slate-950 border-slate-800 text-slate-400';
                    icon = <User className="h-4 w-4" />;
                  } else if (item.type === 'break') {
                    badgeStyle = 'bg-green-950/20 border-green-900/20 text-success-green';
                    icon = <Coffee className="h-4 w-4" />;
                  } else {
                    badgeStyle = 'bg-blue-950/25 border-blue-900/20 text-primary-blue';
                    icon = <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />;
                  }

                  return (
                    <div key={item.id} className="relative group">
                      {/* Time indicator pill aligned in timeline */}
                      <div className="absolute -left-[43px] top-1 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs font-mono">
                        {item.startTime}
                      </div>

                      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 hover:bg-slate-950 transition-all">
                        <div className="flex items-start gap-3">
                          {/* Completion Button */}
                          <button
                            onClick={() => toggleScheduleItem(item.id)}
                            className={`mt-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                              item.completed 
                                ? 'bg-success-green border-success-green text-white' 
                                : 'border-slate-700 hover:border-slate-500 bg-slate-950'
                            }`}
                          >
                            {item.completed && <Check className="h-3 w-3 stroke-[3px]" />}
                          </button>

                          <div>
                            <h3 className={`text-sm font-bold ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center gap-1 border text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${badgeStyle}`}>
                                {icon}
                                {item.type}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500">
                                Duration: {item.startTime} - {item.endTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteScheduleItem(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Safe Time Slots Allocator */}
      <div className="mt-8">
        <SafeSlotsPanel />
      </div>
    </AppLayout>
  );
}

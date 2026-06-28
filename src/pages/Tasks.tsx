import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  ChevronRight, 
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  Loader2
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';

export default function Tasks() {
  const { 
    tasks, 
    addTask, 
    toggleTask, 
    deleteTask, 
    addSubtask, 
    toggleSubtask, 
    breakDownWithAI 
  } = useApp();

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'panic'>('high');
  const [newDuration, setNewDuration] = useState(30);
  const [newDeadline, setNewDeadline] = useState('');
  const [newCategory, setNewCategory] = useState('Work');

  const [selectedTaskForAI, setSelectedTaskForAI] = useState('');
  const [stepCount, setStepCount] = useState(3);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('active');
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Set default deadline if empty (e.g., end of today)
    const deadlineVal = newDeadline || new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16);

    addTask({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      duration: Number(newDuration),
      deadline: deadlineVal,
      category: newCategory
    });

    setNewTitle('');
    setNewDesc('');
    setNewPriority('high');
    setNewDuration(30);
    setNewDeadline('');
  };

  const handleAI_Breakdown = async () => {
    if (!selectedTaskForAI) return;
    setIsBreakingDown(true);
    try {
      await breakDownWithAI(selectedTaskForAI, stepCount);
      setSelectedTaskForAI('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleAddSubtaskLocal = (taskId: string) => {
    const title = newSubtaskTitles[taskId];
    if (!title || !title.trim()) return;

    addSubtask(taskId, title);
    setNewSubtaskTitles(prev => ({ ...prev, [taskId]: '' }));
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'active') return !task.completed;
    if (activeTab === 'completed') return task.completed;
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'panic':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-2.5 py-0.5 rounded-full font-extrabold tracking-wider animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> PANIC</span>;
      case 'high':
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">HIGH</span>;
      case 'medium':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold">MEDIUM</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-xs px-2.5 py-0.5 rounded-full">LOW</span>;
    }
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Task Creator & AI breakdown box */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Task Creator Form */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <h2 className="text-md font-extrabold text-white flex items-center gap-1.5 border-b border-slate-800/80 pb-3 uppercase">
              <Plus className="h-4 w-4 text-primary-blue" />
              <span>Create Rescue Task</span>
            </h2>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Task Title *</label>
                <input 
                  type="text"
                  placeholder="Submit final presentation deck"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Brief Action Plan</label>
                <textarea 
                  placeholder="Detail calculations and coordinate with Sarah"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Category</label>
                  <input 
                    type="text"
                    placeholder="e.g. Finance"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Duration (mins)</label>
                  <select
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Urgency</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="mt-1 w-full px-3.5 py-2 text-sm rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="panic">🚨 PANIC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Deadline</label>
                  <input 
                    type="datetime-local"
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 focus:outline-none focus:border-primary-blue bg-slate-950 text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-primary-blue hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Add Project Task
              </button>
            </form>
          </div>

          {/* AI Breakdown Module */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <h2 className="text-md font-extrabold tracking-tight text-white uppercase">AI Micro-Breakdown Tool</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Overwhelmed? Select any active task. The AI Assistant will split it into actionable 15-minute micro-steps.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Select Task</label>
                <select
                  value={selectedTaskForAI}
                  onChange={e => setSelectedTaskForAI(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-indigo-400 text-slate-200"
                >
                  <option value="">-- Choose active task --</option>
                  {tasks.filter(t => !t.completed).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Desired Steps</label>
                <div className="flex gap-2 mt-1">
                  {[3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStepCount(num)}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                        stepCount === num 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {num} Steps
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAI_Breakdown}
                disabled={!selectedTaskForAI || isBreakingDown}
                className="w-full mt-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                {isBreakingDown ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating micro-steps...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                    Break Down With AI
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Task List and Details */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Navigation Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl gap-1 border border-slate-800">
            {(['active', 'completed', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-slate-850 text-white border border-slate-800/80' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab} ({
                  tab === 'active' 
                    ? tasks.filter(t => !t.completed).length 
                    : tab === 'completed' 
                      ? tasks.filter(t => t.completed).length 
                      : tasks.length
                })
              </button>
            ))}
          </div>

          {/* Task List container */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold uppercase">
                No tasks matched this filter. Create one to get started!
              </div>
            ) : (
              filteredTasks.map(task => (
                <div 
                  key={task.id}
                  className={`p-5 rounded-2xl border bg-slate-900 border-slate-800 shadow-sm transition-all duration-300 ${
                    task.completed ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-1 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                          task.completed 
                            ? 'bg-success-green border-success-green text-white' 
                            : 'border-slate-700 hover:border-primary-blue bg-slate-950'
                        }`}
                      >
                        {task.completed && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
                      </button>
                      <div>
                        <h3 className={`font-bold text-base leading-snug ${
                          task.completed ? 'line-through text-slate-500' : 'text-white'
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className={`text-xs mt-1 ${task.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                            {task.description}
                          </p>
                        )}
                        
                        {/* Meta information tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold text-slate-500">
                          {task.category && (
                            <span className="bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800">
                              {task.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" /> {task.duration}m
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-500" /> Due: {new Date(task.deadline).toLocaleDateString([], {month: 'short', day: 'numeric'})} at {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getPriorityBadge(task.priority)}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-950 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtasks Section */}
                  <div className="mt-4 pl-8 border-t border-slate-800/60 pt-4 space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                      Micro-steps ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
                    </span>

                    {task.subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-1 border-b border-slate-800/40">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => toggleSubtask(task.id, sub.id)}
                            className={`h-4.5 w-4.5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                              sub.completed 
                                ? 'bg-success-green border-success-green text-white' 
                                : 'border-slate-700 hover:border-slate-500 bg-slate-950'
                            }`}
                          >
                            {sub.completed && <Check className="h-3 w-3 stroke-[3px]" />}
                          </button>
                          <span className={`text-xs ${sub.completed ? 'line-through text-slate-500' : 'text-slate-300 font-medium'}`}>
                            {sub.title}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Add direct subtask input */}
                    {!task.completed && (
                      <div className="flex gap-2 items-center mt-2 max-w-md">
                        <input 
                          type="text"
                          placeholder="Add manual micro-step..."
                          value={newSubtaskTitles[task.id] || ''}
                          onChange={e => setNewSubtaskTitles(prev => ({ ...prev, [task.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddSubtaskLocal(task.id)}
                          className="w-full px-3 py-1 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-300 focus:outline-none focus:border-slate-600"
                        />
                        <button
                          onClick={() => handleAddSubtaskLocal(task.id)}
                          className="p-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

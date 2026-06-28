import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Activity, 
  Heart, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  Smile
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import TaskImpact from '../components/Analysis/TaskImpact';
import CriticalTasksReport from '../components/Analysis/CriticalTasksReport';
import RiskScoreWidget from '../components/Analysis/RiskScoreWidget';
import SituationAnalysis from '../components/Analysis/SituationAnalysis';

export default function Insights() {
  const { tasks } = useApp();

  // Stress Diagnostic State
  const [stressLevel, setStressLevel] = useState(5); // 1 to 10 scale
  const [stressAdvice, setStressAdvice] = useState('');

  // Breathing Box Timer State
  const [breathePhase, setBreathePhase] = useState<'In' | 'Hold' | 'Out' | 'Ready'>('Ready');
  const [breatheTimer, setBreatheTimer] = useState(4);
  const [breatheActive, setBreatheActive] = useState(false);

  useEffect(() => {
    // Generate diagnostic advice based on stress slider
    if (stressLevel <= 3) {
      setStressAdvice("🟢 Zone: Calm Focus. You are in control. Break your tasks into 45-minute cycles (Pomodoro) and reward yourself with quick walks.");
    } else if (stressLevel <= 6) {
      setStressAdvice("🟡 Zone: Accelerated Pressure. Alert but capable. Complete a small, quick win immediately to trigger dopamine (such as cleaning your workspace or bought filters) to release pressure.");
    } else if (stressLevel <= 8) {
      setStressAdvice("🟠 Zone: Elevated Anxiety. Danger of freeze response. Hide all unessential tasks. Activate Panic Mode in the Dashboard. Work in simple 15-minute bursts.");
    } else {
      setStressAdvice("🚨 Zone: Panic Freeze! Cognitive load exceeded. Stop typing. Engage the 1-minute Box Breathing exercise below. Your brain needs oxygen to process calculations.");
    }
  }, [stressLevel]);

  // Breathing Box Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (breatheActive) {
      interval = setInterval(() => {
        setBreatheTimer(prev => {
          if (prev <= 1) {
            // Move to next phase
            setBreathePhase(current => {
              switch (current) {
                case 'Ready': return 'In';
                case 'In': return 'Hold';
                case 'Hold': return 'Out';
                case 'Out': return 'Ready';
                default: return 'Ready';
              }
            });
            return 4; // Reset to 4-second intervals for Box Breathing (4x4x4x4)
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathePhase('Ready');
      setBreatheTimer(4);
    }

    return () => clearInterval(interval);
  }, [breatheActive]);

  const toggleBreathing = () => {
    setBreatheActive(prev => !prev);
  };

  // Compute stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const panicCount = tasks.filter(t => t.priority === 'panic').length;
  const completedPanicCount = tasks.filter(t => t.priority === 'panic' && t.completed).length;

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Main Diagnostics & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Interactive Stress Level Diagnostic Slider */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <BrainCircuit className="h-5 w-5 text-motivational-purple" />
              <h2 className="text-lg font-black text-white uppercase">Stress & Procrastination Diagnostic</h2>
            </div>
            <p className="text-xs text-slate-400">
              Tell the Lifesaver how you are feeling right now. The AI engine adjusts advice in real-time.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>🧘 Calmed</span>
                <span>⚡ Alert</span>
                <span>🚨 FREEZE / PANIC</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={stressLevel} 
                onChange={e => setStressLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-alert-orange"
              />
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                <span className="text-xs font-bold text-slate-400 uppercase">Anxiety Level: {stressLevel}/10</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  stressLevel <= 4 ? 'bg-green-500/10 text-success-green' : stressLevel <= 7 ? 'bg-amber-500/10 text-alert-orange' : 'bg-red-500/15 text-red-400 animate-pulse'
                }`}>
                  {stressLevel <= 4 ? 'MANAGEABLE' : stressLevel <= 7 ? 'HIGH ALERT' : 'CRITICAL OVERLOAD'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-950/50 bg-indigo-950/20 text-xs font-medium text-slate-300 leading-relaxed">
              {stressAdvice}
            </div>
          </div>

          {/* Custom Visual Charts: Productivity cycles */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary-blue" />
                <h2 className="text-md font-extrabold text-white uppercase">Your Micro-Sprints Success</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metric Index</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SVG Arc Chart: Completion Rate */}
              <div className="border border-slate-800/80 bg-slate-950/20 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2">Completion Rate</span>
                
                <div className="relative flex items-center justify-center h-32 w-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="8" fill="transparent" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * completionRate) / 100} 
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl font-black text-white">{completionRate}%</span>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase mt-0.5">Tasks Done</span>
                  </div>
                </div>
              </div>

              {/* SVG Bar Chart: Urgency Defused */}
              <div className="border border-slate-800/80 bg-slate-950/20 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Panic Priorities Defused</span>
                  <p className="text-xs text-slate-400 mt-1">Defused {completedPanicCount} out of {panicCount} critical deadlines.</p>
                </div>

                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>PANIC DEADLINES</span>
                      <span>{completedPanicCount}/{panicCount}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-alert-orange h-full rounded-full" style={{ width: `${panicCount > 0 ? (completedPanicCount / panicCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>OTHER DELIVERABLES</span>
                      <span>{tasks.filter(t => t.priority !== 'panic' && t.completed).length}/{tasks.filter(t => t.priority !== 'panic').length}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-motivational-purple h-full rounded-full" style={{ width: `${tasks.filter(t => t.priority !== 'panic').length > 0 ? (tasks.filter(t => t.priority !== 'panic' && t.completed).length / tasks.filter(t => t.priority !== 'panic').length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* DIEP-AI Disaster Situation Engine */}
          <SituationAnalysis />

          {/* Task Impact Estimation Engine component */}
          <TaskImpact />

          {/* Geospatial Risk Scoring Module */}
          <RiskScoreWidget />

          {/* List-wide Critical Task and Resource Analysis Module */}
          <CriticalTasksReport />

        </div>

        {/* Column 3: Panic Box Breathing Defuser */}
        <div className="lg:col-span-1">
          
          {/* Interactive breathing widget */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col justify-between h-full min-h-[440px]">
            <div>
              <div className="flex items-center gap-1.5 justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <Heart className="h-4.5 w-4.5 text-red-400 animate-pulse fill-red-400" />
                  <h2 className="text-sm uppercase font-extrabold tracking-widest text-slate-300">Panic Space Defuser</h2>
                </div>
                <Smile className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Feeling overwhelmed or frozen? Stop looking at tasks. Box breathing resets the vagus nerve in under 60 seconds.
              </p>

              {/* Breathing Animation Canvas Circle */}
              <div className="my-10 flex flex-col items-center justify-center">
                <div className={`relative h-40 w-40 rounded-full bg-slate-950/50 flex items-center justify-center border transition-all duration-1000 ${
                  breatheActive && breathePhase === 'In' ? 'scale-125 border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' : 
                  breatheActive && breathePhase === 'Out' ? 'scale-90 border-violet-500 bg-violet-500/5' : 
                  breatheActive && breathePhase === 'Hold' ? 'scale-115 border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-500/10' : 
                  'border-slate-800'
                }`}>
                  <div className="text-center">
                    <span className="block text-2xl font-black font-sans uppercase tracking-widest transition-all text-white">
                      {breathePhase}
                    </span>
                    {breatheActive && (
                      <span className="text-xs font-mono font-bold text-slate-400 block mt-1">
                        {breatheTimer}s left
                      </span>
                    )}
                  </div>
                </div>

                {/* Instructions text based on current phase */}
                <div className="text-center mt-6 h-10 text-xs font-semibold text-slate-400 max-w-xs">
                  {breathePhase === 'Ready' && "Click Start and prepare to follow the circle."}
                  {breathePhase === 'In' && "🟢 Breathe IN slowly through your nose..."}
                  {breathePhase === 'Hold' && "🟡 HOLD your breath... keep steady..."}
                  {breathePhase === 'Out' && "🔵 Exhale OUT fully and release stress..."}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex gap-2">
              <button
                onClick={toggleBreathing}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all cursor-pointer ${
                  breatheActive 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-900 hover:from-teal-500 hover:to-cyan-600 font-black'
                }`}
              >
                {breatheActive ? 'Stop / Reset' : 'Start Defuser'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

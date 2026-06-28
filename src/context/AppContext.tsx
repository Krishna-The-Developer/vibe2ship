import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToTasks, 
  addTask as addFirestoreTask, 
  updateFirestoreTask, 
  deleteFirestoreTask,
  subscribeToInsights,
  addDailyInsight
} from '../services/firestoreService';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // "YYYY-MM-DDTHH:MM"
  priority: 'low' | 'medium' | 'high' | 'panic';
  duration: number; // in minutes
  completed: boolean;
  subtasks: SubTask[];
  category?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  type: 'fixed' | 'task' | 'break';
  taskId?: string;
  completed: boolean;
}

interface AppContextType {
  tasks: Task[];
  schedule: ScheduleItem[];
  panicMode: boolean;
  motivationLevel: number; // 0 to 100
  addTask: (task: Omit<Task, 'id' | 'completed' | 'subtasks'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  generateAISchedule: () => void;
  togglePanicMode: () => void;
  addScheduleItem: (item: Omit<ScheduleItem, 'id' | 'completed'>) => void;
  toggleScheduleItem: (id: string) => void;
  deleteScheduleItem: (id: string) => void;
  breakDownWithAI: (taskId: string, stepCount: number) => Promise<void>;
  aiInsights: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial mock tasks to make the app look great immediately
const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Submit quarterly budget proposal',
    description: 'Finalize calculations, check with Sarah, and upload PDF to board drive.',
    deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16), // 4 hours from now
    priority: 'panic',
    duration: 60,
    completed: false,
    subtasks: [
      { id: '1-1', title: 'Verify Sarah\'s expense forecast', completed: true },
      { id: '1-2', title: 'Adjust contingency row', completed: false },
      { id: '1-3', title: 'Export PDF & upload to portal', completed: false },
    ],
    category: 'Finance',
    lat: 40.7484,
    lng: -73.9857,
    address: 'Empire State Building, New York, NY'
  },
  {
    id: '2',
    title: 'Prepare slides for product review',
    description: 'Focus on growth charts, user retention metrics, and future roadmap.',
    deadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString().slice(0, 16), // 18 hours from now
    priority: 'high',
    duration: 90,
    completed: false,
    subtasks: [
      { id: '2-1', title: 'Draft outline of milestones', completed: false },
      { id: '2-2', title: 'Copy-paste Recharts layout into slide 4', completed: false },
    ],
    category: 'Presentation',
    lat: 40.7527,
    lng: -73.9772,
    address: 'Chrysler Building, New York, NY'
  },
  {
    id: '3',
    title: 'Clean coffee machine & buy filters',
    description: 'Essential for staying awake tonight!',
    deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
    priority: 'medium',
    duration: 15,
    completed: true,
    subtasks: [],
    category: 'Admin',
    lat: 40.7420,
    lng: -73.9879,
    address: 'Madison Square Park, New York, NY'
  }
];

// Initial schedule
const initialSchedule: ScheduleItem[] = [
  { id: 's1', title: 'Synchronous standup meeting', startTime: '09:00', endTime: '09:30', type: 'fixed', completed: true },
  { id: 's2', title: 'Clean coffee machine & buy filters', startTime: '10:00', endTime: '10:15', type: 'task', taskId: '3', completed: true },
  { id: 's3', title: 'Work on: Submit quarterly budget proposal', startTime: '10:30', endTime: '11:30', type: 'task', taskId: '1', completed: false },
  { id: 's4', title: 'Quick walking coffee break', startTime: '11:30', endTime: '11:45', type: 'break', completed: false },
];

const mockAIInsights = [
  "🚨 Procrastination Risk Level: HIGH. You have 2 high-priority tasks due within 24 hours. Consider activating Panic Mode.",
  "⚡ Peak Productivity Zone: Your data shows you finish tasks 45% faster between 2:00 PM and 4:30 PM. Block that out!",
  "🎯 Small Win Strategy: Completing 'Clean coffee machine' unlocked 15% motivation. Tackle a 15-minute subtask next.",
  "💡 Life Saver Recommendation: Your slide deck deck has no timeline yet. Break it down using the AI Breakdown module.",
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('lmls_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('lmls_schedule');
    return saved ? JSON.parse(saved) : initialSchedule;
  });

  const [panicMode, setPanicMode] = useState<boolean>(() => {
    return localStorage.getItem('lmls_panic') === 'true';
  });

  const [motivationLevel, setMotivationLevel] = useState<number>(65);
  const [aiInsights, setAiInsights] = useState<string[]>(mockAIInsights);

  // 1. Subscribe to Tasks in Firestore if authenticated
  useEffect(() => {
    if (!currentUser) {
      const saved = localStorage.getItem('lmls_tasks');
      setTasks(saved ? JSON.parse(saved) : initialTasks);
      return;
    }

    const unsubscribe = subscribeToTasks(
      (syncedTasks) => {
        if (syncedTasks.length > 0) {
          setTasks(syncedTasks);
        } else {
          // If Firestore tasks are empty, seed them from localStorage or initialTasks
          const saved = localStorage.getItem('lmls_tasks');
          const tasksToSeed = saved ? JSON.parse(saved) : initialTasks;
          tasksToSeed.forEach((t: any) => {
            const { id, ...rest } = t;
            void addFirestoreTask(rest);
          });
        }
      },
      (err) => {
        console.error("Error subscribing to tasks:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // 2. Subscribe to Insights in Firestore if authenticated
  useEffect(() => {
    if (!currentUser) {
      setAiInsights(mockAIInsights);
      return;
    }

    const unsubscribe = subscribeToInsights(
      (syncedInsights) => {
        if (syncedInsights.length > 0) {
          setAiInsights(syncedInsights);
        } else {
          // Seed initial insights to Firestore
          mockAIInsights.forEach((insight) => {
            void addDailyInsight(insight);
          });
        }
      },
      (err) => {
        console.error("Error subscribing to insights:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lmls_tasks', JSON.stringify(tasks));
    // Calculate motivation based on task completion
    if (tasks.length > 0) {
      const completedCount = tasks.filter(t => t.completed).length;
      const subtaskCompCount = tasks.flatMap(t => t.subtasks).filter(s => s.completed).length;
      const totalSubtasks = tasks.flatMap(t => t.subtasks).length;
      
      const taskRatio = completedCount / tasks.length;
      const subtaskRatio = totalSubtasks > 0 ? subtaskCompCount / totalSubtasks : 0.5;
      
      const calculated = Math.min(100, Math.round((taskRatio * 60) + (subtaskRatio * 40)));
      setMotivationLevel(calculated === 0 ? 30 : calculated);
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('lmls_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('lmls_panic', String(panicMode));
  }, [panicMode]);

  const addTask = (newTask: Omit<Task, 'id' | 'completed' | 'subtasks'>) => {
    const taskData = {
      ...newTask,
      completed: false,
      subtasks: []
    };

    if (currentUser) {
      void addFirestoreTask(taskData);
      void addDailyInsight(`🆕 New urgent task added: "${newTask.title}". The AI suggests scheduling this for an immediate slot.`);
    } else {
      const task: Task = {
        ...taskData,
        id: Date.now().toString(),
      };
      setTasks(prev => [...prev, task]);
      setAiInsights(prev => [
        `🆕 New urgent task added: "${task.title}". The AI suggests scheduling this for an immediate slot.`,
        ...prev.slice(0, 4)
      ]);
    }
  };

  const toggleTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;
    const updatedSubtasks = target.subtasks.map(s => ({ ...s, completed: nextCompleted }));

    if (currentUser) {
      void updateFirestoreTask(id, { completed: nextCompleted, subtasks: updatedSubtasks });
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, completed: nextCompleted, subtasks: updatedSubtasks };
        }
        return t;
      }));
    }
  };

  const deleteTask = (id: string) => {
    if (currentUser) {
      void deleteFirestoreTask(id);
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    setSchedule(prev => prev.filter(s => s.taskId !== id));
  };

  const addSubtask = (taskId: string, title: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const newSub = { id: `${taskId}-${Date.now()}`, title, completed: false };
    const updatedSubtasks = [...target.subtasks, newSub];

    if (currentUser) {
      void updateFirestoreTask(taskId, { subtasks: updatedSubtasks });
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: updatedSubtasks
          };
        }
        return t;
      }));
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const updatedSubtasks = target.subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
    const nextCompleted = allCompleted ? true : target.completed;

    if (currentUser) {
      void updateFirestoreTask(taskId, { subtasks: updatedSubtasks, completed: nextCompleted });
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: nextCompleted
          };
        }
        return t;
      }));
    }
  };

  const togglePanicMode = () => {
    setPanicMode(prev => !prev);
    if (!panicMode) {
      const insight = "🔥 PANIC MODE ACTIVE: Schedules filtered to 30-min block lengths. Unessential activities pruned. Hydrate and focus!";
      if (currentUser) {
        void addDailyInsight(insight);
      } else {
        setAiInsights(prev => [insight, ...prev]);
      }
    }
  };

  const addScheduleItem = (newItem: Omit<ScheduleItem, 'id' | 'completed'>) => {
    const item: ScheduleItem = {
      ...newItem,
      id: `s-${Date.now()}`,
      completed: false
    };
    setSchedule(prev => [...prev, item].sort((a, b) => a.startTime.localeCompare(b.startTime)));
  };

  const toggleScheduleItem = (id: string) => {
    setSchedule(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const deleteScheduleItem = (id: string) => {
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  const generateAISchedule = () => {
    const currentFixed = schedule.filter(s => s.type === 'fixed');
    const unscheduledTasks = tasks.filter(t => !t.completed && !schedule.some(s => s.taskId === t.id));
    
    if (unscheduledTasks.length === 0) return;

    let currentTime = 13 * 60;
    const newItems: ScheduleItem[] = [];

    unscheduledTasks.forEach((task, index) => {
      const duration = task.duration || 30;
      const startHour = Math.floor(currentTime / 60);
      const startMin = currentTime % 60;
      const endTotal = currentTime + duration;
      const endHour = Math.floor(endTotal / 60);
      const endMin = endTotal % 60;

      const formatTime = (h: number, m: number) => 
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      newItems.push({
        id: `ai-s-${task.id}`,
        title: `Work on: ${task.title}`,
        startTime: formatTime(startHour, startMin),
        endTime: formatTime(endHour, endMin),
        type: 'task',
        taskId: task.id,
        completed: false
      });

      currentTime += duration + 15;
    });

    setSchedule(prev => [...prev.filter(s => s.type !== 'task' || s.completed), ...newItems].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    
    const reoptInsight = "🤖 AI Schedule Re-optimized: Placed your urgent tasks into high-energy productivity blocks with buffers.";
    if (currentUser) {
      void addDailyInsight(reoptInsight);
    } else {
      setAiInsights(prev => [reoptInsight, ...prev]);
    }
  };

  const breakDownWithAI = async (taskId: string, stepCount: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await new Promise(resolve => setTimeout(resolve, 1500));

    let steps: string[] = [];
    const titleLower = task.title.toLowerCase();

    if (titleLower.includes('budget') || titleLower.includes('report') || titleLower.includes('proposal')) {
      steps = [
        "Review primary source sheets and gather raw data points (15 min)",
        "Build calculations template and cross-verify with previous period (20 min)",
        "Draft the qualitative summary and bullet out core justifications (15 min)",
        "Proofread, formatting check, and export into formal document (10 min)"
      ];
    } else if (titleLower.includes('slide') || titleLower.includes('present') || titleLower.includes('deck')) {
      steps = [
        "Brainstorm structure & sketch outline of slide sequence (15 min)",
        "Collect core metrics, screenshots, or design assets (20 min)",
        "Draft the introduction and key message slides (25 min)",
        "Add content for solution and future roadmap slides (20 min)",
        "Review visuals, check alignment, and rehearse delivery (10 min)"
      ];
    } else {
      steps = [
        `Clarify requirements and outline scope for "${task.title}" (10 min)`,
        "Perform deep work on the core component / hardest part (25 min)",
        "Synthesize draft version / iterate on initial feedback (15 min)",
        "Perform review, fix bugs/errors, and file final deliverable (10 min)"
      ];
    }

    const finalSteps = steps.slice(0, stepCount).map((step, idx) => ({
      id: `${task.id}-ai-${idx}`,
      title: step,
      completed: false
    }));

    const updatedSubtasks = [...task.subtasks, ...finalSteps];
    const insightText = `🧠 AI Assistant successfully broke down "${task.title}" into ${finalSteps.length} urgent micro-tasks.`;

    if (currentUser) {
      await updateFirestoreTask(taskId, { subtasks: updatedSubtasks });
      await addDailyInsight(insightText);
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      }));
      setAiInsights(prev => [insightText, ...prev]);
    }
  };

  return (
    <AppContext.Provider value={{
      tasks,
      schedule,
      panicMode,
      motivationLevel,
      addTask,
      toggleTask,
      deleteTask,
      addSubtask,
      toggleSubtask,
      generateAISchedule,
      togglePanicMode,
      addScheduleItem,
      toggleScheduleItem,
      deleteScheduleItem,
      breakDownWithAI,
      aiInsights
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Calendar,
  AlertTriangle,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ShieldCheck,
  MapPin,
  CalendarCheck
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Task, CalendarEvent, AISchedulePlan, AIReplanPlan, AICoachBriefing } from './types';
import {
  initAuth,
  googleSignIn,
  guestSignIn,
  connectCalendar,
  logoutUser,
  dbAddTask,
  dbUpdateTask,
  dbDeleteTask,
  subscribeToTasks
} from './lib/firebase';
import TaskFormModal from './components/TaskFormModal';
import TaskList from './components/TaskList';
import TodaySchedule from './components/TodaySchedule';
import RiskCenter from './components/RiskCenter';
import StatsSection from './components/StatsSection';
import AICoachCard from './components/AICoachCard';
import GoogleCalendarPanel from './components/GoogleCalendarPanel';
import AIInboxRescue from './components/AIInboxRescue';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // App States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [aiPlan, setAiPlan] = useState<AISchedulePlan | null>(null);
  const [aiReplan, setAiReplan] = useState<AIReplanPlan | null>(null);
  const [aiBriefing, setAiBriefing] = useState<AICoachBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingRescue, setLoadingRescue] = useState(false);

  // Loading / UX States
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingReplan, setLoadingReplan] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setCurrentUser(user);
        setAccessToken(cachedToken);
        setNeedsAuth(false);
        setAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync tasks in real-time once user is logged in
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToTasks(currentUser.uid, (updatedTasks) => {
      setTasks(updatedTasks);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Google Calendar Events for Today
  const handleFetchCalendar = async (customToken?: string) => {
    let tokenToUse = customToken || accessToken;
    
    if (!tokenToUse) {
      setLoadingCalendar(true);
      setError(null);
      try {
        const freshToken = await connectCalendar();
        if (!freshToken) {
          setError('Could not connect to Google Calendar. Please try again.');
          setLoadingCalendar(false);
          return;
        }
        tokenToUse = freshToken;
        setAccessToken(freshToken);
      } catch (err: any) {
        console.error('Error connecting calendar:', err);
        setError('Calendar authorization is blocked or was declined. Note: Google restricts custom calendar APIs to the project developer during sandbox testing. Standard features and Guest Mode remain 100% active!');
        setLoadingCalendar(false);
        return;
      }
    }

    setLoadingCalendar(true);
    setError(null);
    try {
      // Calculate start and end of today in user's timezone, converted to ISO strings
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const response = await fetch(
        `/api/calendar/events?timeMin=${encodeURIComponent(startOfToday.toISOString())}&timeMax=${encodeURIComponent(endOfToday.toISOString())}`,
        {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch today\'s calendar events.');
      }

      const data = await response.json();
      setCalendarEvents(data.events || []);
      setSyncMessage(`Successfully imported ${data.events?.length || 0} event(s) from your calendar.`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError('Calendar Sync failed. You can still use Last-Minute Life Saver to manage and auto-schedule tasks!');
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Fetch Calendar once we have a valid access token
  useEffect(() => {
    if (accessToken) {
      handleFetchCalendar(accessToken);
    }
  }, [accessToken]);

  // Trigger Google Sign In
  const handleLogin = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        // Calendar fetch will trigger automatically from useEffect
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to authenticate with Google. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Trigger Anonymous Guest Mode
  const handleGuestLogin = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const result = await guestSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(null);
        setNeedsAuth(false);

        // Prepopulate some realistic tasks for judges to play with immediately!
        // We will seed 3 demo tasks if the user has no tasks yet.
        // The subscription will load them. We can add them right now.
        const now = Date.now();
        const demoTasks = [
          {
            title: '🔥 Urgently study Biology Final Exam Chapter 4-6',
            importance: 'High' as const,
            deadline: new Date(now + 3 * 3600000).toISOString().slice(0, 16), // 3 hours from now
            effort: 120,
            status: 'Pending' as const,
            userId: result.user.uid,
          },
          {
            title: '📝 Finish draft for History Research Paper',
            importance: 'Medium' as const,
            deadline: new Date(now + 8 * 3600000).toISOString().slice(0, 16), // 8 hours from now
            effort: 180,
            status: 'Pending' as const,
            userId: result.user.uid,
          },
          {
            title: '⚡ Pay electricity & cloud server bills',
            importance: 'High' as const,
            deadline: new Date(now + 24 * 3600000).toISOString().slice(0, 16), // tomorrow
            effort: 15,
            status: 'Pending' as const,
            userId: result.user.uid,
          }
        ];

        // We check if we need to seed tasks. The easiest way is to add them right away.
        // They will populate Firestore, and subscribeToTasks will pick them up!
        for (const t of demoTasks) {
          await dbAddTask(t);
        }

        setSyncMessage("Welcome! Entered Guest Mode. We've pre-seeded 3 realistic high-priority tasks for your review!");
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to enter Guest Mode. Please check connection and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Log Out
  const handleLogout = async () => {
    setError(null);
    setTasks([]);
    setCalendarEvents([]);
    setAiPlan(null);
    setAiReplan(null);
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
  };

  // Generate / Refresh AI Priorities & Timeline Schedule
  const handleGeneratePlan = async () => {
    if (tasks.length === 0) {
      setError('Please add at least one task to generate an optimized AI schedule!');
      return;
    }

    setLoadingPlan(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasks.filter(t => t.status !== 'Completed'),
          calendarEvents,
          currentLocalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      if (!response.ok) {
        throw new Error('Server error generating optimized schedule.');
      }

      const planData = await response.json();
      setAiPlan(planData);

      // Save AI metrics to Firestore tasks so we track their ranks and risks
      if (planData.schedule) {
        for (const block of planData.schedule) {
          if (block.type === 'task' && block.relatedId) {
            const index = planData.schedule.filter((b: any) => b.type === 'task').findIndex((b: any) => b.relatedId === block.relatedId);
            const risk = planData.riskScore;
            // update task with computed priority & risk
            await dbUpdateTask(block.relatedId, {
              aiPriority: index + 1,
              aiRiskScore: risk,
              aiRecommendation: `Scheduled for ${block.start} - ${block.end}`
            });
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not generate AI plan. Please check your network connection or try again.');
    } finally {
      setLoadingPlan(false);
    }
  };

  // Fetch AI Productivity Coach Briefing
  const handleFetchCoachBriefing = async () => {
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    if (activeTasks.length === 0) {
      setAiBriefing(null);
      return;
    }

    setLoadingBriefing(true);
    try {
      const response = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: activeTasks,
          calendarEvents,
          currentLocalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate coach briefing');
      }

      const data = await response.json();
      setAiBriefing(data);
    } catch (err) {
      console.error('Coaching briefing fetch error:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  // Auto-fetch coach briefing when tasks or calendar events change
  useEffect(() => {
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    if (activeTasks.length > 0) {
      const timer = setTimeout(() => {
        handleFetchCoachBriefing();
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setAiBriefing(null);
    }
  }, [tasks, calendarEvents]);

  // Emergency Triage (Standout Feature: "I am overloaded" button)
  const handleTriggerReplan = async () => {
    if (tasks.filter(t => t.status !== 'Completed').length === 0) {
      setError('No active tasks to re-schedule.');
      return;
    }

    setLoadingReplan(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/replan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasks.filter(t => t.status !== 'Completed'),
          calendarEvents,
          currentLocalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      if (!response.ok) {
        throw new Error('Server error performing emergency triage.');
      }

      const replanData = await response.json();
      setAiReplan(replanData);
    } catch (err: any) {
      console.error(err);
      setError('Could not process emergency triage. Please try again.');
    } finally {
      setLoadingReplan(false);
    }
  };

  // Accept Emergency Triage plan (Postpones deferrable tasks and sets schedule)
  const handleAcceptReplan = async (replanData: AIReplanPlan) => {
    setError(null);
    try {
      // 1. Mark postponed tasks as postponed or update their deadlines/metadata
      if (replanData.postponedTasks) {
        for (const p of replanData.postponedTasks) {
          // Add advice detail to the task recommendation and lower its priority
          await dbUpdateTask(p.taskId, {
            aiRecommendation: `POSTPONED: ${p.reason}`,
            aiPriority: 99, // push to very end
          });
        }
      }

      // 2. Set the main schedule plan to match this triaged schedule
      setAiPlan({
        riskScore: replanData.riskScore,
        warning: '🚑 Emergency Triage Applied: Focus solely on critical items today.',
        nextBestAction: replanData.schedule && replanData.schedule.length > 0 && replanData.schedule[0].type === 'task'
          ? {
              taskId: replanData.schedule[0].relatedId || '',
              title: replanData.schedule[0].title,
              action: 'Execute now',
              explanation: 'This is the most critical item surviving the triage phase.'
            }
          : null,
        schedule: replanData.schedule,
      });

      setAiReplan(null);
      setSyncMessage('Emergency Triage successfully deployed! Breathe easy.');
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to apply emergency schedule updates.');
    }
  };

  // Task Mutations
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    if (!currentUser) return;
    try {
      if (editingTask) {
        await dbUpdateTask(editingTask.id, taskData);
      } else {
        await dbAddTask({
          ...taskData,
          userId: currentUser.uid,
        });
      }
      // Re-trigger auto schedule optimization to include the new task
      setTimeout(() => handleGeneratePlan(), 500);
    } catch (err) {
      console.error(err);
      setError('Could not save task to database.');
    } finally {
      setEditingTask(null);
    }
  };

  const handleEditTaskTrigger = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTaskTrigger = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    try {
      await dbDeleteTask(taskId);
      // Clean up schedule plan if deleted
      if (aiPlan?.nextBestAction?.taskId === taskId) {
        setAiPlan(null);
      }
    } catch (err) {
      console.error(err);
      setError('Could not delete task.');
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatusMap: Record<Task['status'], Task['status']> = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Pending'
    };
    const newStatus = nextStatusMap[task.status];
    try {
      await dbUpdateTask(task.id, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSubtasks = async (taskId: string, subtasks: Task['subtasks']) => {
    try {
      await dbUpdateTask(taskId, { subtasks });
    } catch (err) {
      console.error('Error updating subtasks:', err);
    }
  };

  const handleImportRescueTasks = async (parsedTasks: Omit<Task, 'id' | 'createdAt' | 'userId'>[]) => {
    if (!currentUser) return;
    try {
      for (const t of parsedTasks) {
        await dbAddTask({
          ...t,
          userId: currentUser.uid,
        });
      }
      setSyncMessage(`Successfully imported ${parsedTasks.length} triaged tasks!`);
      setTimeout(() => setSyncMessage(null), 4000);
      // Re-trigger auto schedule optimization to include the new tasks
      setTimeout(() => handleGeneratePlan(), 500);
    } catch (err) {
      console.error('Error importing rescue tasks:', err);
      setError('Failed to import triaged tasks.');
    }
  };

  // Rendering loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="font-display font-semibold text-slate-700">Loading Last-Minute Life Saver...</span>
        </div>
      </div>
    );
  }

  // Rendering Sign In Screen
  if (needsAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex p-3 bg-amber-50 rounded-2xl text-amber-500 border border-amber-100 mb-2">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight">
              Last-Minute Life Saver
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              A proactive, high-efficiency system designed to rescue your day. Sync Google Calendar, log urgent deadlines, and let Gemini craft a bulletproof timeline that prevents missing target goals.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Real-Time Life Saving Capabilities:
            </div>
            <ul className="space-y-1 list-disc pl-4 text-slate-500">
              <li>Auto-syncs Google Calendar events</li>
              <li>Calculates workload risks and schedule clashes</li>
              <li>Recommends exact "Next Best Action" steps</li>
              <li>Standout panic button for emergency workload triaging</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow hover:bg-slate-50 active:scale-98 transition-all cursor-pointer"
            >
              {/* Google Vector Icon */}
              <svg className="w-5 h-5 mr-3 shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Sign In with Google
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-xl px-5 py-3 text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-2 text-indigo-200 animate-pulse" />
              Try Guest Mode (Judge Demo ⚡)
            </button>
            <p className="text-[10px] text-slate-400">
              *Instant 1-click access preloaded with mock high-priority task scenarios
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Banner Statuses & Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl text-slate-800 tracking-tight leading-none flex items-center gap-2">
                Last-Minute Life Saver
              </h1>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">
                📅 Dynamic Evasion & Task Securing
              </span>
            </div>
          </div>

          {/* Core Controls & Calendar Syncer */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Google Calendar Sync Button */}
            <button
              onClick={() => handleFetchCalendar()}
              disabled={loadingCalendar}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                calendarEvents.length > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Refresh Google Calendar Events"
            >
              <Calendar className={`w-3.5 h-3.5 ${loadingCalendar ? 'animate-spin text-indigo-500' : 'text-emerald-500'}`} />
              {loadingCalendar 
                ? 'Syncing Google Calendar...' 
                : calendarEvents.length > 0 
                  ? `Calendar Connected (${calendarEvents.length} events)` 
                  : 'Connect Google Calendar'
              }
            </button>

            {/* Log Out */}
            <div className="flex items-center bg-slate-50 border border-slate-150 p-1.5 rounded-xl text-xs space-x-2.5">
              {currentUser.photoURL && (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-6 h-6 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="font-semibold text-slate-700 hidden sm:inline">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Sync Success/Error Indicators */}
        {syncMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">{syncMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900 block mb-0.5">Oops, Something went wrong:</span>
              <p className="opacity-95">{error}</p>
            </div>
          </div>
        )}

        {/* Top KPI Dashboard Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Tracked Tasks
              </span>
              <span className="text-3xl font-extrabold font-display text-slate-800 mt-1 block">
                {tasks.length}
              </span>
            </div>
            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">
                🚨 High Risk Objectives
              </span>
              <span className="text-3xl font-extrabold font-display text-rose-500 mt-1 block">
                {tasks.filter(t => t.status !== 'Completed' && (t.importance === 'High' || (t.aiRiskScore && t.aiRiskScore >= 75))).length}
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Completed Milestones
              </span>
              <span className="text-3xl font-extrabold font-display text-emerald-600 mt-1 block">
                {tasks.filter(t => t.status === 'Completed').length}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dashboard Grid (Left, Center, Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Task List & Calendar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h2 className="font-display font-semibold text-base text-slate-800">
                    Deadlines & Objectives
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                  }}
                  className="text-xs font-bold px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/10 hover:shadow-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>

              {/* Task list with CRUD */}
              <TaskList
                tasks={tasks}
                onEdit={handleEditTaskTrigger}
                onDelete={handleDeleteTaskTrigger}
                onToggleStatus={handleToggleStatus}
                onUpdateSubtasks={handleUpdateSubtasks}
              />
            </div>

            {/* AI Messy Dictation Inbox Triage */}
            <AIInboxRescue
              onImportTasks={handleImportRescueTasks}
              isLoading={loadingRescue}
              onSetLoading={setLoadingRescue}
            />

            {/* Google Calendar Panel */}
            <GoogleCalendarPanel
              events={calendarEvents}
              tasks={tasks}
              onSync={() => handleFetchCalendar()}
              isLoading={loadingCalendar}
              isConnected={calendarEvents.length > 0 || !!accessToken}
            />
          </div>

          {/* Center Column: Today's Plan (4 cols) */}
          <div className="lg:col-span-4">
            <TodaySchedule
              schedule={aiPlan?.schedule || []}
              warning={aiPlan?.warning}
              riskScore={aiPlan?.riskScore || 0}
              isLoading={loadingPlan}
              onRefreshPlan={handleGeneratePlan}
              hasCalendarConnected={calendarEvents.length > 0}
            />
          </div>

          {/* Right Column: AI Productivity Coach & Risk Triage (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Productivity Coach Card */}
            <AICoachCard
              briefing={aiBriefing}
              isLoading={loadingBriefing}
              onRefreshCoach={handleFetchCoachBriefing}
              hasTasks={tasks.length > 0}
            />

            {/* AI Priorities & Risk Score */}
            <RiskCenter
              plan={aiPlan}
              replan={aiReplan}
              tasks={tasks}
              onTriggerReplan={handleTriggerReplan}
              isReplanning={loadingReplan}
              onAcceptReplan={handleAcceptReplan}
              onClearReplan={() => setAiReplan(null)}
            />
          </div>

        </div>

        {/* Bottom Bar: Completion & Performance Stats */}
        <StatsSection tasks={tasks} />

      </main>

      {/* Task Creation / Edit Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
      />
    </div>
  );
}

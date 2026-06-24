export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  deadline: string; // ISO string or datetime-local string
  effort: number; // in minutes
  importance: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  userId: string;
  aiPriority?: number; // 1 = highest
  aiRiskScore?: number; // 0 to 100
  aiRecommendation?: string;
  subtasks?: SubTask[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
}

export interface ScheduleBlock {
  id: string;
  title: string;
  start: string; // HH:mm format for timeline representation (e.g. "09:00")
  end: string; // HH:mm format (e.g. "10:30")
  type: 'task' | 'event' | 'break';
  relatedId?: string; // refers to Task.id or CalendarEvent.id
  status?: 'Pending' | 'In Progress' | 'Completed';
}

export interface AISchedulePlan {
  riskScore: number; // 0 - 100
  warning?: string; // Warn if workload is too high
  nextBestAction: {
    taskId: string;
    title: string;
    action: string;
    explanation: string;
  } | null;
  schedule: ScheduleBlock[];
}

export interface AIReplanPlan {
  advice: string; // Encouraging but proactive replan advice
  riskScore: number;
  postponedTasks: { taskId: string; title: string; reason: string }[];
  schedule: ScheduleBlock[];
}

export interface AICoachBriefing {
  mostImportantTask: {
    taskId: string;
    title: string;
    explanation: string;
  } | null;
  nextThreeActions: {
    title: string;
    description: string;
  }[];
  riskyDeadlines: {
    taskId: string;
    title: string;
    warning: string;
  }[];
  coachingMessage: string;
}


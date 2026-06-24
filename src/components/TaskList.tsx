import React, { useState } from 'react';
import { Trash2, Edit2, Clock, CheckCircle2, Circle, AlertCircle, Play, Sparkles, RefreshCw, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { Task, SubTask } from '../types';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: SubTask[]) => void;
}

export default function TaskList({
  tasks,
  onEdit,
  onDelete,
  onToggleStatus,
  onUpdateSubtasks,
}: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [decomposingId, setDecomposingId] = useState<string | null>(null);

  const getImportanceBadge = (importance: Task['importance']) => {
    switch (importance) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Low':
        return 'bg-green-50 text-green-700 border-green-100';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />;
      case 'In Progress':
        return <Play className="w-5 h-5 text-blue-500 fill-blue-50 animate-pulse" />;
      case 'Pending':
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatEffort = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const formatDeadline = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (diffHours < 0) {
      return (
        <span className="text-red-600 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> Missed ({dateStr} {timeStr})
        </span>
      );
    } else if (diffHours < 2) {
      return (
        <span className="text-red-500 font-semibold animate-pulse flex items-center gap-1">
          ⚠️ Under 2h! ({timeStr})
        </span>
      );
    } else if (diffHours < 24) {
      return (
        <span className="text-amber-600 font-medium">
          Today at {timeStr}
        </span>
      );
    }
    return <span className="text-slate-500">{dateStr} {timeStr}</span>;
  };

  const handleDecompose = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateSubtasks) return;
    setDecomposingId(task.id);
    try {
      const response = await fetch('/api/gemini/decompose-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      if (!response.ok) throw new Error('Task decomposition failed');
      const data = await response.json();
      onUpdateSubtasks(task.id, data.subtasks);
      setExpandedTaskId(task.id); // auto-expand after decomposition
    } catch (err) {
      console.error(err);
    } finally {
      setDecomposingId(null);
    }
  };

  const handleToggleSubtask = (task: Task, subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateSubtasks || !task.subtasks) return;
    const updated = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateSubtasks(task.id, updated);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <Clock className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-600 font-display">No tasks logged yet</p>
        <p className="text-xs text-slate-400 text-center max-w-xs mt-1">
          Add your urgent deadlines above to let Gemini secure your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
      {tasks.map((task) => {
        const isExpanded = expandedTaskId === task.id;
        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
        const completedCount = task.subtasks?.filter(st => st.completed).length || 0;
        const totalCount = task.subtasks?.length || 0;

        return (
          <div
            key={task.id}
            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
            className={`group flex flex-col p-4 bg-white border rounded-2xl transition-all hover:shadow-md cursor-pointer ${
              task.status === 'Completed' ? 'border-emerald-100 bg-emerald-50/20 opacity-80' : 'border-slate-100'
            }`}
          >
            {/* Top Row: Task Meta & Actions */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(task);
                  }}
                  className="mt-0.5 focus:outline-none transition-transform hover:scale-110 active:scale-95 shrink-0"
                  title="Toggle task status"
                >
                  {getStatusIcon(task.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-display font-medium text-sm text-slate-800 break-words ${
                        task.status === 'Completed' ? 'line-through text-slate-400 font-normal' : ''
                      }`}
                    >
                      {task.title}
                    </span>
                    
                    {/* AI Rank Indicator */}
                    {task.aiPriority && task.status !== 'Completed' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                        AI RANK #{task.aiPriority}
                      </span>
                    )}

                    {/* Subtasks progress indicator */}
                    {hasSubtasks && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold">
                        Progress: {completedCount}/{totalCount}
                      </span>
                    )}
                  </div>

                  {/* Badges and Time info */}
                  <div className="flex items-center gap-x-2 gap-y-1 mt-2 flex-wrap text-xs text-slate-500">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getImportanceBadge(task.importance)}`}>
                      {task.importance}
                    </span>

                    <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded-md text-slate-600 border border-slate-100">
                      <Clock className="w-3 h-3 text-slate-400" /> {formatEffort(task.effort)}
                    </span>

                    <span className="flex items-center gap-1 text-[11px]">
                      📅 {formatDeadline(task.deadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {/* Decompose Button */}
                {task.status !== 'Completed' && onUpdateSubtasks && (
                  <button
                    onClick={(e) => handleDecompose(task, e)}
                    disabled={decomposingId === task.id}
                    className="p-1.5 text-indigo-500 hover:text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    title="Breakdown task into subtasks using Gemini"
                  >
                    {decomposingId === task.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    )}
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Edit Task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Expanded Content: Subtasks */}
            {isExpanded && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                {hasSubtasks ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      AI Breakdown Steps
                    </span>
                    <div className="space-y-1.5">
                      {task.subtasks!.map((st) => (
                        <div
                          key={st.id}
                          onClick={(e) => handleToggleSubtask(task, st.id, e)}
                          className="flex items-center space-x-2 p-2 bg-slate-50 hover:bg-slate-100/70 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-150"
                        >
                          <button className="shrink-0 text-indigo-500 hover:text-indigo-600">
                            {st.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <span className={`text-xs flex-1 ${st.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                            {st.title}
                          </span>
                          {st.estimatedMinutes && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              ⏱️ {st.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2.5 space-y-2">
                    <p className="text-[11px] text-slate-400 italic">No subtask milestones generated yet.</p>
                    {task.status !== 'Completed' && onUpdateSubtasks && (
                      <button
                        onClick={(e) => handleDecompose(task, e)}
                        disabled={decomposingId === task.id}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/80 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                        {decomposingId === task.id ? 'Analyzing with Gemini...' : 'Decompose with Gemini'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

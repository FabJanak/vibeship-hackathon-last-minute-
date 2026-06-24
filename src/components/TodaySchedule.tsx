import React from 'react';
import { CalendarCheck, AlertTriangle, Calendar, ShieldAlert, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { ScheduleBlock } from '../types';

interface TodayScheduleProps {
  schedule: ScheduleBlock[];
  warning?: string | null;
  riskScore: number;
  isLoading: boolean;
  onRefreshPlan: () => void;
  hasCalendarConnected: boolean;
}

export default function TodaySchedule({
  schedule,
  warning,
  riskScore,
  isLoading,
  onRefreshPlan,
  hasCalendarConnected,
}: TodayScheduleProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <CalendarCheck className="w-5 h-5 text-indigo-500" />
          <h2 className="font-display font-semibold text-base text-slate-800">
            Today's Secured Schedule
          </h2>
        </div>
        <button
          onClick={onRefreshPlan}
          disabled={isLoading}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/80 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
          {isLoading ? 'Regenerating...' : 'Optimize Plan'}
        </button>
      </div>

      {/* Warnings & Alerts */}
      {warning && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-2.5 text-rose-800 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block text-rose-900 mb-0.5">High Workload Warning</span>
            <p className="leading-relaxed font-sans">{warning}</p>
          </div>
        </div>
      )}

      {/* Schedule Stack */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold text-slate-500">Gemini is arranging your day...</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Avoiding conflicts and finding open slots.</p>
          </div>
        ) : schedule && schedule.length > 0 ? (
          <div className="relative pl-4 border-l-2 border-indigo-100/80 space-y-4 py-2">
            {schedule.map((block, idx) => {
              const isTask = block.type === 'task';
              const isEvent = block.type === 'event';
              const isBreak = block.type === 'break';

              let cardBg = 'bg-slate-50 border-slate-100 text-slate-700';
              let badgeColor = 'bg-slate-200 text-slate-700';
              
              if (isTask) {
                if (block.status === 'Completed') {
                  cardBg = 'bg-emerald-50/30 border-emerald-100 text-slate-500';
                  badgeColor = 'bg-emerald-100 text-emerald-800';
                } else if (block.status === 'In Progress') {
                  cardBg = 'bg-blue-50/50 border-blue-100 text-slate-800';
                  badgeColor = 'bg-blue-100 text-blue-800';
                } else {
                  cardBg = 'bg-indigo-50/30 border-indigo-100/60 text-slate-800';
                  badgeColor = 'bg-indigo-100 text-indigo-800';
                }
              } else if (isEvent) {
                cardBg = 'bg-amber-50/40 border-amber-100 text-slate-700';
                badgeColor = 'bg-amber-100 text-amber-800';
              } else if (isBreak) {
                cardBg = 'bg-emerald-50/20 border-dashed border-emerald-100 text-emerald-800';
                badgeColor = 'bg-emerald-100 text-emerald-800';
              }

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 ${
                    isEvent ? 'bg-amber-400 border-white' : isTask && block.status === 'Completed' ? 'bg-emerald-400 border-white' : 'bg-indigo-500 border-white'
                  }`}></div>

                  {/* Content Card */}
                  <div className={`flex items-center justify-between p-3 border rounded-xl shadow-sm transition-all group-hover:shadow ${cardBg}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold font-mono text-indigo-900 bg-white/80 px-1.5 py-0.5 rounded-md border border-indigo-50`}>
                          {block.start} - {block.end}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${badgeColor}`}>
                          {block.type === 'event' ? '📅 Calendar' : block.type === 'task' ? '🚀 task' : '☕ break'}
                        </span>
                        {block.status === 'Completed' && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> done
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium mt-1.5 truncate ${block.status === 'Completed' ? 'line-through' : ''}`}>
                        {block.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
            <Calendar className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No active plan generated</p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 px-4">
              {hasCalendarConnected 
                ? "Click 'Optimize Plan' to let Gemini scan your tasks and Google Calendar to draft today's schedule blocks."
                : "Log in with Google, connect your Calendar, and click 'Optimize Plan' to craft a bulletproof timeline."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

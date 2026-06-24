import React from 'react';
import { Sparkles, Trophy, ShieldAlert, Zap, Compass, CheckCircle2, AlertCircle } from 'lucide-react';
import { AICoachBriefing } from '../types';

interface AICoachCardProps {
  briefing: AICoachBriefing | null;
  isLoading: boolean;
  onRefreshCoach: () => void;
  hasTasks: boolean;
}

export default function AICoachCard({ briefing, isLoading, onRefreshCoach, hasTasks }: AICoachCardProps) {
  if (!hasTasks) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-lg text-center space-y-3">
        <Compass className="w-8 h-8 text-indigo-400 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
        <h3 className="font-display font-semibold text-sm">Waiting for Tasks...</h3>
        <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
          Log some tasks or connect your Google Calendar to activate your personal AI Productivity Coach briefing.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">AI Coach Briefing</span>
        </div>
        <div className="space-y-2 py-4">
          <div className="h-4 bg-indigo-950/80 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-indigo-950/80 rounded animate-pulse w-full"></div>
          <div className="h-3 bg-indigo-950/80 rounded animate-pulse w-5/6"></div>
        </div>
        <p className="text-xs text-indigo-300 animate-pulse text-center font-mono">Analyzing workload risk & clashing slots...</p>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-lg text-center space-y-2">
        <Sparkles className="w-7 h-7 text-indigo-400 mx-auto" />
        <h3 className="font-display font-semibold text-sm">Ready to Brief You</h3>
        <p className="text-[11px] text-slate-400">
          Click the button below to get your custom action plan and risk diagnostics.
        </p>
        <button
          onClick={onRefreshCoach}
          className="mt-2 text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all cursor-pointer"
        >
          Initialize Coach
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
      {/* Light glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-slate-100">
            AI Productivity Coach
          </h2>
        </div>
        <button
          onClick={onRefreshCoach}
          className="p-1 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
          title="Recalculate Briefing"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </button>
      </div>

      {/* Coaching message quote */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs leading-relaxed italic text-slate-200">
        "{briefing.coachingMessage}"
      </div>

      {/* Most Important Task */}
      {briefing.mostImportantTask && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-1">
          <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Absolute #1 Priority Today
          </span>
          <h4 className="font-display font-bold text-sm text-amber-200">
            {briefing.mostImportantTask.title}
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {briefing.mostImportantTask.explanation}
          </p>
        </div>
      )}

      {/* Next 3 Action Steps */}
      {briefing.nextThreeActions && briefing.nextThreeActions.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
            Suggested study/work progression:
          </span>
          <div className="space-y-2">
            {briefing.nextThreeActions.map((act, index) => (
              <div key={index} className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[11px] font-bold text-indigo-300 font-mono bg-indigo-900/40 px-1.5 py-0.5 rounded border border-indigo-800/30">
                  {index + 1}
                </span>
                <div>
                  <span className="text-xs font-semibold text-slate-100 block">{act.title}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Warnings */}
      {briefing.riskyDeadlines && briefing.riskyDeadlines.length > 0 && (
        <div className="space-y-1.5 bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Deadlines At Risk
          </span>
          <div className="space-y-1.5">
            {briefing.riskyDeadlines.map((risk, index) => (
              <div key={index} className="text-[11px] leading-relaxed text-rose-200">
                ⚠️ <strong className="text-rose-100">{risk.title}</strong>: {risk.warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { AlertCircle, Zap, ShieldAlert, Sparkles, RefreshCw, Eye, AlertTriangle, ShieldCheck, CornerRightDown } from 'lucide-react';
import { AISchedulePlan, AIReplanPlan, Task } from '../types';

interface RiskCenterProps {
  plan: AISchedulePlan | null;
  replan: AIReplanPlan | null;
  tasks: Task[];
  onTriggerReplan: () => void;
  isReplanning: boolean;
  onAcceptReplan: (replan: AIReplanPlan) => void;
  onClearReplan: () => void;
}

export default function RiskCenter({
  plan,
  replan,
  tasks,
  onTriggerReplan,
  isReplanning,
  onAcceptReplan,
  onClearReplan,
}: RiskCenterProps) {
  // Determine raw risk score
  const riskScore = replan ? replan.riskScore : (plan ? plan.riskScore : 0);
  
  const getRiskColorClass = (score: number) => {
    if (score >= 75) return 'text-rose-500 border-rose-200 bg-rose-50/50';
    if (score >= 40) return 'text-amber-600 border-amber-200 bg-amber-50/50';
    return 'text-emerald-600 border-emerald-200 bg-emerald-50/50';
  };

  const getRiskMeterColor = (score: number) => {
    if (score >= 75) return 'bg-rose-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const nextAction = plan?.nextBestAction;

  return (
    <div className="space-y-4">
      {/* 1. Risk Gauge */}
      <div className={`p-4 border rounded-2xl ${getRiskColorClass(riskScore)}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider font-display">Workload Risk Index</span>
          <span className="text-sm font-extrabold font-mono">{riskScore}%</span>
        </div>
        <div className="w-full bg-slate-200/50 h-2 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getRiskMeterColor(riskScore)}`}
            style={{ width: `${riskScore}%` }}
          ></div>
        </div>
        <p className="text-[11px] mt-2 leading-relaxed opacity-90">
          {riskScore >= 75 
            ? '⚠️ HIGH RISK OF MISSING DEADLINES. You are severely overbooked today.'
            : riskScore >= 40 
            ? '⚡ MODERATE RISK. Tight scheduling, but survivable if you stay focused.'
            : '✅ SECURED. Calm pace with plenty of open buffers to finish on time.'
          }
        </p>
      </div>

      {/* 2. Standout Feature: Panic "I am Overloaded" Triage Button */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <h3 className="font-display font-semibold text-sm text-slate-100 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Feeling Overwhelmed?
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Let Gemini execute an emergency triage. It will safely defer lower-importance tasks to free up breathing space.
          </p>

          <button
            onClick={onTriggerReplan}
            disabled={isReplanning || tasks.filter(t => t.status !== 'Completed').length === 0}
            className="w-full mt-3 py-2 px-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-500/15 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            {isReplanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Triaging Workload...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                🚨 I AM OVERLOADED! RE-PLAN NOW
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Triage Result Card (If active) */}
      {replan && (
        <div className="bg-rose-50/40 border border-rose-100 p-4 rounded-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Emergency Plan Ready
            </span>
            <button
              onClick={onClearReplan}
              className="text-[10px] text-slate-500 hover:text-slate-800 underline font-semibold"
            >
              Cancel Triage
            </button>
          </div>

          <p className="text-xs text-rose-950 italic leading-relaxed bg-white p-2.5 rounded-xl border border-rose-100">
            "{replan.advice}"
          </p>

          {replan.postponedTasks && replan.postponedTasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Postponed to Tomorrow
              </span>
              <div className="space-y-1">
                {replan.postponedTasks.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-[11px]">
                    <CornerRightDown className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700">{t.title}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onAcceptReplan(replan)}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Accept Triage Schedule
          </button>
        </div>
      )}

      {/* 4. Next Best Action Highlight */}
      {!replan && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-2.5">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-widest flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-indigo-500" /> Next Best Action
          </span>

          {nextAction ? (
            <div className="space-y-2">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono">
                  TARGET TASK
                </span>
                <p className="font-display font-bold text-sm text-slate-800 mt-0.5">
                  {nextAction.title}
                </p>
                <div className="bg-amber-50 text-amber-900 border border-amber-100 rounded-lg p-2 mt-2 text-xs font-semibold leading-relaxed">
                  👉 {nextAction.action}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Why this task?
                </span>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5 font-sans">
                  {nextAction.explanation}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed py-2">
              Generate a schedule to get real-time priorities and optimal action pathways from Gemini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

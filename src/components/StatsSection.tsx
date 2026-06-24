import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Task } from '../types';

interface StatsSectionProps {
  tasks: Task[];
}

export default function StatsSection({ tasks }: StatsSectionProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEffort = tasks.reduce((sum, t) => sum + (t.effort || 0), 0);
  const totalCompletedEffort = tasks
    .filter((t) => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.effort || 0), 0);

  const formatEffortHours = (minutes: number) => {
    return (minutes / 60).toFixed(1);
  };

  // Prepare data for the Effort Allocation by Importance chart
  const importanceData = [
    { name: '🔴 High', minutes: 0 },
    { name: '🟡 Medium', minutes: 0 },
    { name: '🟢 Low', minutes: 0 },
  ];

  tasks.forEach((t) => {
    if (t.importance === 'High') importanceData[0].minutes += t.effort || 0;
    else if (t.importance === 'Medium') importanceData[1].minutes += t.effort || 0;
    else if (t.importance === 'Low') importanceData[2].minutes += t.effort || 0;
  });

  const chartData = importanceData.map((d) => ({
    name: d.name,
    hours: parseFloat((d.minutes / 60).toFixed(1)),
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="font-display font-semibold text-base text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
        <TrendingUp className="w-5 h-5 text-indigo-500" />
        Performance Analytics
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Metric Cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Completion Rate
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-display text-indigo-600">{completionRate}%</span>
              <span className="text-xs text-slate-400">done</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium">
              {completedTasks} of {totalTasks} tasks completed
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Time Invested
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-display text-emerald-600">
                {formatEffortHours(totalCompletedEffort)}
              </span>
              <span className="text-xs text-slate-400">hours</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium">
              Out of {formatEffortHours(totalEffort)} hours total backlog
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center space-x-3 col-span-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Backlog
              </span>
              <span className="text-base font-extrabold text-slate-800 font-display">
                {pendingTasks} tasks remaining
              </span>
            </div>
          </div>
        </div>

        {/* Chart Column (7 cols) */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <div className="mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Effort Allocated by Importance (Hours)
            </span>
          </div>
          
          <div className="h-36">
            {totalTasks > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">
                No effort metrics to display. Add tasks to see breakdown.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

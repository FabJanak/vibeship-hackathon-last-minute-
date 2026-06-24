import React from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, Sparkles, AlertTriangle, CalendarCheck } from 'lucide-react';
import { CalendarEvent, Task } from '../types';

interface GoogleCalendarPanelProps {
  events: CalendarEvent[];
  tasks: Task[];
  onSync: () => void;
  isLoading: boolean;
  isConnected: boolean;
}

export default function GoogleCalendarPanel({
  events,
  tasks,
  onSync,
  isLoading,
  isConnected,
}: GoogleCalendarPanelProps) {
  // Helper to format ISO time to a user-friendly HH:mm
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '00:00';
    }
  };

  // Helper to parse events into sorted minute-of-day blocks to find optimal study time slots
  const findOptimalStudyTimes = () => {
    if (!isConnected || events.length === 0) {
      // Default standard recommendation
      return [
        { start: '09:00', end: '11:00', label: 'Morning High-Focus Study Slot' },
        { start: '14:00', end: '16:00', label: 'Afternoon Routine Study Slot' },
      ];
    }

    // Sort today's events chronologically
    const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const recommendations: { start: string; end: string; label: string }[] = [];

    // Let's scan from 08:00 to 20:00 (work hours)
    let lastFreeStart = new Date();
    lastFreeStart.setHours(8, 0, 0, 0);

    const endBoundary = new Date();
    endBoundary.setHours(20, 0, 0, 0);

    sorted.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // If there is an opening of more than 60 minutes between the last event and this one
      const diffMinutes = (eventStart.getTime() - lastFreeStart.getTime()) / (1000 * 60);
      if (diffMinutes >= 60 && lastFreeStart < endBoundary) {
        const potentialEnd = eventStart < endBoundary ? eventStart : endBoundary;
        recommendations.push({
          start: lastFreeStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          end: potentialEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          label: diffMinutes >= 120 ? '🔥 Prime Deep-Work Study Block' : '⚡ Quick Focus Study Slot',
        });
      }

      if (eventEnd > lastFreeStart) {
        lastFreeStart = eventEnd;
      }
    });

    // Final gap to end boundary
    const finalDiff = (endBoundary.getTime() - lastFreeStart.getTime()) / (1000 * 60);
    if (finalDiff >= 60 && lastFreeStart < endBoundary) {
      recommendations.push({
        start: lastFreeStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        end: '20:00',
        label: finalDiff >= 120 ? '🔥 Evening Completion Block' : '⚡ Quick Target Study Block',
      });
    }

    return recommendations.length > 0 ? recommendations.slice(0, 3) : [
      { start: '20:00', end: '22:00', label: 'Late-Night Emergency Study Block' }
    ];
  };

  const studyTimes = findOptimalStudyTimes();

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <h2 className="font-display font-semibold text-base text-slate-800">
            Google Calendar Panel
          </h2>
        </div>
        <button
          onClick={onSync}
          disabled={isLoading}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? 'Syncing...' : 'Sync Calendar'}
        </button>
      </div>

      {/* Events Viewer */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Today's Scheduled Events & Hard Blocks
        </span>

        {!isConnected ? (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-2">
            <p className="text-xs text-slate-500">Google Calendar is not synced yet.</p>
            <button
              onClick={onSync}
              className="text-xs font-bold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-sm cursor-pointer"
            >
              Connect Calendar
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <p className="text-xs text-slate-500">🎉 No calendar events or busy blocks today! Your calendar is fully open.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 truncate">{event.title}</p>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    ⏱️ {formatTime(event.start)} - {formatTime(event.end)}
                  </span>
                </div>
                <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0">
                  Busy Slot
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Focus/Study Blocks */}
      <div className="pt-2 border-t border-slate-50 space-y-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Optimal Focus & Study Windows Today
        </span>

        <div className="space-y-1.5">
          {studyTimes.map((time, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-indigo-50/40 border border-indigo-100/60 rounded-xl flex items-center justify-between"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-indigo-950 block">{time.label}</span>
                <span className="text-[10px] font-mono text-indigo-600 mt-0.5 block">
                  👉 Recommended window: {time.start} - {time.end}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

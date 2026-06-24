import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Task } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  editingTask: Task | null;
}

export default function TaskFormModal({ isOpen, onClose, onSave, editingTask }: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [effortHours, setEffortHours] = useState('1');
  const [effortMinutes, setEffortMinutes] = useState('0');
  const [importance, setImportance] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      // Format deadline for datetime-local input
      const date = new Date(editingTask.deadline);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);

      const totalMinutes = editingTask.effort || 0;
      setEffortHours(String(Math.floor(totalMinutes / 60)));
      setEffortMinutes(String(totalMinutes % 60));
      setImportance(editingTask.importance);
      setStatus(editingTask.status);
    } else {
      setTitle('');
      // Set default deadline to today + 4 hours
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 4);
      const year = defaultDate.getFullYear();
      const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const day = String(defaultDate.getDate()).padStart(2, '0');
      const hours = String(defaultDate.getHours()).padStart(2, '0');
      const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
      setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      
      setEffortHours('1');
      setEffortMinutes('0');
      setImportance('Medium');
      setStatus('Pending');
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const totalMinutes = (parseInt(effortHours, 10) || 0) * 60 + (parseInt(effortMinutes, 10) || 0);

    onSave({
      title,
      deadline: new Date(deadline).toISOString(),
      effort: totalMinutes,
      importance,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-slate-800">
            {editingTask ? '🔧 Edit Life-Saving Task' : '🚀 Add Last-Minute Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Task Title / Goal
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Finish Q3 Presentation, Fix Critical Bug"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Deadline
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Importance
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-sm"
              >
                <option value="Low">🟢 Low Importance</option>
                <option value="Medium">🟡 Medium Importance</option>
                <option value="High">🔴 High Importance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Estimated Effort
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={effortHours}
                  onChange={(e) => setEffortHours(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-slate-800 font-mono text-center"
                />
                <span className="text-xs text-slate-400 font-semibold ml-1">hr</span>
              </div>
              <span className="text-slate-400 font-semibold">:</span>
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={effortMinutes}
                  onChange={(e) => setEffortMinutes(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-slate-800 font-mono text-center"
                />
                <span className="text-xs text-slate-400 font-semibold ml-1">min</span>
              </div>
            </div>
          </div>

          {editingTask && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Pending', 'In Progress', 'Completed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                      status === s
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/10 hover:shadow-lg transition-all"
            >
              {editingTask ? 'Apply Changes' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Send, Plus, CheckCircle2, ShieldAlert, Mic, MicOff } from 'lucide-react';
import { Task } from '../types';

interface AIInboxRescueProps {
  onImportTasks: (parsedTasks: Omit<Task, 'id' | 'createdAt' | 'userId'>[]) => void;
  isLoading: boolean;
  onSetLoading: (loading: boolean) => void;
}

export default function AIInboxRescue({ onImportTasks, isLoading, onSetLoading }: AIInboxRescueProps) {
  const [messyText, setMessyText] = useState('');
  const [parsedResults, setParsedResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setMessyText(prev => prev ? prev + ' ' + transcript : transcript);
      };
      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleRescueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messyText.trim()) return;

    onSetLoading(true);
    setParsedResults([]);
    try {
      const response = await fetch('/api/gemini/quick-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messyText }),
      });

      if (!response.ok) {
        throw new Error('Quick add parser failed');
      }

      const data = await response.json();
      setParsedResults(data.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      onSetLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedResults.length === 0) return;
    onImportTasks(parsedResults);
    setParsedResults([]);
    setMessyText('');
  };

  return (
    <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm text-slate-800">
            🎙️ AI Brain Dump & Triage
          </h3>
          <p className="text-[10px] text-slate-400">
            Dump messy thoughts or spoken words. Gemini will extract, structure, and prioritize them.
          </p>
        </div>
      </div>

      <form onSubmit={handleRescueSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            value={messyText}
            onChange={(e) => setMessyText(e.target.value)}
            placeholder="e.g. 'i have a bio lab assignment due at 9pm today which takes 1 hour, need to study for finals tomorrow, and buy fruits after'"
            className="w-full h-20 text-xs pl-3 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-slate-400 text-slate-700 outline-none"
            disabled={isLoading}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-3 bottom-3 p-2 rounded-full cursor-pointer transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice dictation'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setMessyText('algebra quiz at 4pm, 2 hours of physics revisions today, email dean for project extension')}
            className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
          >
            💡 Try an example
          </button>
          <button
            type="submit"
            disabled={isLoading || !messyText.trim()}
            className="text-xs font-bold px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" /> Triaging...
              </>
            ) : (
              <>
                ⚡ AI Triage
              </>
            )}
          </button>
        </div>
      </form>

      {/* Parse preview list */}
      {parsedResults.length > 0 && (
        <div className="space-y-3 bg-slate-50 border border-slate-100 p-3 rounded-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              📥 Parsed Inbox ({parsedResults.length})
            </span>
            <span className="text-[10px] font-semibold text-emerald-600">Reviewing structure...</span>
          </div>

          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {parsedResults.map((p, idx) => (
              <div key={idx} className="p-2.5 bg-white border border-slate-150 rounded-lg space-y-1 text-left">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 break-words">{p.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    p.importance === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    p.importance === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-green-50 text-green-700 border-green-100'
                  }`}>
                    {p.importance}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>⏱️ Effort: {p.effort}m</span>
                  <span>📅 Due: {new Date(p.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmImport}
            className="w-full text-xs font-bold py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Import Selected Tasks
          </button>
        </div>
      )}
    </div>
  );
}

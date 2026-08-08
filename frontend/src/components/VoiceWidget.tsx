import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition, processVoiceCommand, VoiceActionResult } from '../lib/voiceEngine';

export default function VoiceWidget() {
  const navigate = useNavigate();
  const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceRecognition();
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VoiceActionResult | null>(null);

  // Auto-execute voice command when transcript pauses/finishes
  useEffect(() => {
    if (!isListening && transcript.trim().length > 2) {
      setProcessing(true);
      processVoiceCommand(transcript, navigate)
        .then((res) => setLastResult(res))
        .finally(() => setProcessing(false));
    }
  }, [isListening, transcript, navigate]);

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Transcript / Feedback Bubble */}
      {(isListening || transcript || lastResult || processing) && (
        <div className="bg-slate-900/90 dark:bg-surface-850/95 backdrop-blur-md border border-slate-700/80 dark:border-slate-800 text-white rounded-2xl p-4 shadow-2xl max-w-xs sm:max-w-sm space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-400 flex items-center gap-1.5">
              <span>🎙️ Voice Ops</span>
              {isListening && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-rose-400 font-mono">LISTENING…</span>
                </span>
              )}
              {processing && (
                <span className="text-[10px] text-amber-400 font-mono animate-pulse">PROCESSING…</span>
              )}
            </span>

            {lastResult && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                lastResult.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {lastResult.intent}
              </span>
            )}
          </div>

          <p className="text-xs font-mono leading-relaxed text-slate-200">
            {transcript || lastResult?.commandText || 'Speak a command... e.g. "Inject high CPU chaos"'}
          </p>

          {lastResult?.responseSpeech && !isListening && (
            <p className="text-[11px] text-emerald-400 font-sans border-t border-slate-800 pt-1.5">
              🔊 {lastResult.responseSpeech}
            </p>
          )}
        </div>
      )}

      {/* Floating Microphone Action Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`relative group w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isListening
            ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 scale-110'
            : 'bg-brand-600 hover:bg-brand-500 text-white hover:scale-105'
        }`}
        title={isListening ? 'Stop Listening' : 'Start Voice Control'}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
        )}
        <span className="text-xl">🎙️</span>
      </button>
    </div>
  );
}

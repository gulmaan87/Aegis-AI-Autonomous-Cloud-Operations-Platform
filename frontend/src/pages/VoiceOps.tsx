import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition, processVoiceCommand, speakText, VoiceActionResult } from '../lib/voiceEngine';

const COMMAND_CATEGORIES = [
  {
    category: '💥 Chaos Engineering Simulation',
    commands: [
      { phrase: 'Inject high CPU chaos', action: 'Triggers 60s CPU spike experiment' },
      { phrase: 'Inject latency chaos', action: 'Triggers 60s P99 latency slowdown' },
      { phrase: 'Inject memory pressure', action: 'Triggers 60s RAM consumption spike' },
      { phrase: 'Inject service error', action: 'Injects HTTP 500 status fault' },
      { phrase: 'Stop all chaos', action: 'Clears all active Redis chaos flags' },
    ],
  },
  {
    category: '🛡️ Self-Healing & DevSecOps',
    commands: [
      { phrase: 'Trigger self healing', action: 'Executes automated remediation policy' },
      { phrase: 'Run cost analysis', action: 'Evaluates cluster FinOps waste & savings' },
      { phrase: 'Run security audit', action: 'Scans container CVEs & CIS benchmarks' },
    ],
  },
  {
    category: '🗺️ Navigation & Views',
    commands: [
      { phrase: 'Go to dashboard', action: 'Navigates to main Operations Dashboard' },
      { phrase: 'Go to incidents', action: 'Navigates to Incident Commander page' },
      { phrase: 'Go to infrastructure', action: 'Navigates to Node Topology Map' },
    ],
  },
];

export default function VoiceOps() {
  const navigate = useNavigate();
  const { isListening, transcript, setTranscript, startListening, stopListening, isSupported } = useVoiceRecognition();
  const [history, setHistory] = useState<VoiceActionResult[]>([]);
  const [executing, setExecuting] = useState(false);

  const handleManualExecute = async (phrase: string) => {
    setExecuting(true);
    setTranscript(phrase);
    const result = await processVoiceCommand(phrase, navigate);
    setHistory((prev) => [result, ...prev]);
    setExecuting(false);
  };

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        setExecuting(true);
        const result = await processVoiceCommand(transcript, navigate);
        setHistory((prev) => [result, ...prev]);
        setExecuting(false);
      }
    } else {
      startListening();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <span>🎙️ Voice Operations Command Center</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hands-free Speech-to-Text (STT) voice control and Text-to-Speech (TTS) audio feedback for Aegis AI.
          </p>
        </div>

        <button
          onClick={() => speakText('Aegis AI Voice Operations active and ready for commands.')}
          className="btn-primary self-start sm:self-auto text-xs flex items-center gap-2"
        >
          <span>🔊 Test Audio Synthesis</span>
        </button>
      </div>

      {/* Main Interactive Mic Control Card */}
      <div className="card text-center py-10 space-y-6 border-2 border-brand-500/30">
        {!isSupported ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm max-w-md mx-auto">
            ⚠️ Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari for voice commands.
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handleMicToggle}
              className={`relative group w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isListening
                  ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 scale-110'
                  : 'bg-brand-600 hover:bg-brand-500 text-white hover:scale-105'
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
              )}
              <span className="text-4xl">🎙️</span>
            </button>

            <div>
              <span className={`badge ${isListening ? 'badge-red animate-pulse' : executing ? 'badge-yellow' : 'badge-green'}`}>
                {isListening ? 'LISTENING FOR SPEECH…' : executing ? 'EXECUTING INTENT…' : 'READY FOR VOICE COMMAND'}
              </span>
            </div>

            <div className="max-w-xl w-full bg-slate-100 dark:bg-surface-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[60px] flex items-center justify-center font-mono text-sm text-slate-800 dark:text-slate-200">
              {transcript || (isListening ? 'Listening… speak a command now' : 'Click the microphone or choose a phrase below')}
            </div>
          </div>
        )}
      </div>

      {/* Supported Voice Phrase Reference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COMMAND_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="card space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800">
              {cat.category}
            </h3>

            <div className="space-y-2">
              {cat.commands.map((cmd, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => handleManualExecute(cmd.phrase)}
                  className="w-full text-left p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 hover:bg-brand-500/10 dark:hover:bg-brand-500/20 border border-slate-200/80 dark:border-slate-800 transition-colors group flex items-start justify-between"
                >
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500">
                      "{cmd.phrase}"
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cmd.action}</p>
                  </div>
                  <span className="text-xs text-brand-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Command Execution Log */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Voice Activity Log &amp; Intent Matcher
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {history.length} commands processed
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No voice commands executed in this session yet. Speak or click a sample phrase above.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">"{item.commandText}"</span>
                  <p className="text-slate-500 font-sans mt-0.5">🔊 {item.responseSpeech}</p>
                </div>

                <span className={item.success ? 'badge badge-green' : 'badge badge-yellow'}>
                  {item.intent}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

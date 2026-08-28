import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition, processVoiceCommand, speakText } from '../lib/voiceEngine';
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
    const [history, setHistory] = useState([]);
    const [executing, setExecuting] = useState(false);
    const handleManualExecute = async (phrase) => {
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
        }
        else {
            startListening();
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white", children: _jsx("span", { children: "\uD83C\uDF99\uFE0F Voice Operations Command Center" }) }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Hands-free Speech-to-Text (STT) voice control and Text-to-Speech (TTS) audio feedback for Aegis AI." })] }), _jsx("button", { onClick: () => speakText('Aegis AI Voice Operations active and ready for commands.'), className: "btn-primary self-start sm:self-auto text-xs flex items-center gap-2", children: _jsx("span", { children: "\uD83D\uDD0A Test Audio Synthesis" }) })] }), _jsx("div", { className: "card text-center py-10 space-y-6 border-2 border-brand-500/30", children: !isSupported ? (_jsx("div", { className: "p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm max-w-md mx-auto", children: "\u26A0\uFE0F Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari for voice commands." })) : (_jsxs("div", { className: "flex flex-col items-center space-y-4", children: [_jsxs("button", { onClick: handleMicToggle, className: `relative group w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isListening
                                ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 scale-110'
                                : 'bg-brand-600 hover:bg-brand-500 text-white hover:scale-105'}`, children: [isListening && (_jsx("span", { className: "absolute inset-0 rounded-full bg-rose-500/40 animate-ping" })), _jsx("span", { className: "text-4xl", children: "\uD83C\uDF99\uFE0F" })] }), _jsx("div", { children: _jsx("span", { className: `badge ${isListening ? 'badge-red animate-pulse' : executing ? 'badge-yellow' : 'badge-green'}`, children: isListening ? 'LISTENING FOR SPEECH…' : executing ? 'EXECUTING INTENT…' : 'READY FOR VOICE COMMAND' }) }), _jsx("div", { className: "max-w-xl w-full bg-slate-100 dark:bg-surface-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[60px] flex items-center justify-center font-mono text-sm text-slate-800 dark:text-slate-200", children: transcript || (isListening ? 'Listening… speak a command now' : 'Click the microphone or choose a phrase below') })] })) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: COMMAND_CATEGORIES.map((cat, idx) => (_jsxs("div", { className: "card space-y-3", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800", children: cat.category }), _jsx("div", { className: "space-y-2", children: cat.commands.map((cmd, cIdx) => (_jsxs("button", { onClick: () => handleManualExecute(cmd.phrase), className: "w-full text-left p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 hover:bg-brand-500/10 dark:hover:bg-brand-500/20 border border-slate-200/80 dark:border-slate-800 transition-colors group flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-mono text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500", children: ["\"", cmd.phrase, "\""] }), _jsx("p", { className: "text-[11px] text-slate-500 mt-0.5", children: cmd.action })] }), _jsx("span", { className: "text-xs text-brand-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity", children: "\u25B6" })] }, cIdx))) })] }, idx))) }), _jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-white", children: "Voice Activity Log & Intent Matcher" }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [history.length, " commands processed"] })] }), history.length === 0 ? (_jsx("div", { className: "py-8 text-center text-slate-500 text-xs", children: "No voice commands executed in this session yet. Speak or click a sample phrase above." })) : (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: history.map((item, idx) => (_jsxs("div", { className: "p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-mono", children: [_jsxs("div", { children: [_jsxs("span", { className: "font-bold text-slate-900 dark:text-white", children: ["\"", item.commandText, "\""] }), _jsxs("p", { className: "text-slate-500 font-sans mt-0.5", children: ["\uD83D\uDD0A ", item.responseSpeech] })] }), _jsx("span", { className: item.success ? 'badge badge-green' : 'badge badge-yellow', children: item.intent })] }, idx))) }))] })] }));
}

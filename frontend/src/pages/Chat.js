import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
export default function Chat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I am Aegis AI SRE Assistant. I can query real-time health checks, recent incidents, active chaos experiments, and history. Ask me anything about the system!',
        },
    ]);
    const messagesEndRef = useRef(null);
    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    const chatMutation = useMutation({
        mutationFn: async (chatHistory) => {
            const response = await api.post('/chat', {
                messages: chatHistory.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            });
            return response.data;
        },
        onSuccess: (data) => {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.message,
                    logs: data.logs || [],
                },
            ]);
        },
        onError: () => {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '⚠️ Failed to connect to Aegis SRE Chat agent. Please make sure the backend is reachable.',
                },
            ]);
        },
    });
    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || chatMutation.isPending)
            return;
        const userMessage = { role: 'user', content: input.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        // Trigger api call with complete context
        chatMutation.mutate(updatedMessages);
    };
    return (_jsxs("div", { className: "p-6 h-[calc(100vh-2rem)] flex flex-col space-y-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCAC" }), " AI Infrastructure Chat"] }), _jsx("p", { className: "text-slate-400 text-sm mt-0.5", children: "Ask questions about the live platform state, run health checks, or review incidents using natural language." })] }), _jsxs("div", { className: "flex-1 card flex flex-col min-h-0 bg-surface-800 border-white/5 relative overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar", children: [messages.map((msg, index) => {
                                const isUser = msg.role === 'user';
                                return (_jsxs("div", { className: `flex flex-col max-w-[80%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`, children: [_jsx("div", { className: `px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser
                                                ? 'bg-brand-600 text-white rounded-tr-none'
                                                : 'bg-surface-700 text-slate-200 rounded-tl-none border border-white/5'}`, children: _jsx("p", { className: "whitespace-pre-wrap", children: msg.content }) }), !isUser && msg.logs && msg.logs.length > 0 && (_jsx("div", { className: "mt-1 px-3 py-1 bg-surface-900/50 border border-white/5 rounded-md text-[10px] text-slate-500 font-mono", children: msg.logs.map((log, idx) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-emerald-400", children: "\u26A1" }), " ", log] }, idx))) }))] }, index));
                            }), chatMutation.isPending && (_jsx("div", { className: "flex flex-col items-start mr-auto max-w-[80%]", children: _jsxs("div", { className: "bg-surface-700 text-slate-400 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 text-sm flex items-center gap-2", children: [_jsxs("span", { className: "flex gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '0ms' } }), _jsx("span", { className: "w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '150ms' } }), _jsx("span", { className: "w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '300ms' } })] }), _jsx("span", { className: "text-xs italic font-medium", children: "Querying SRE tools..." })] }) })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("form", { onSubmit: handleSend, className: "p-4 border-t border-white/5 bg-surface-800/90 flex gap-2", children: [_jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), disabled: chatMutation.isPending, className: "flex-1 input focus:ring-brand-500 bg-surface-700 text-slate-200 border-white/5 placeholder-slate-500 focus:outline-none", placeholder: "e.g. Are there any active incidents or chaos tests?" }), _jsx("button", { type: "submit", disabled: chatMutation.isPending || !input.trim(), className: "btn-primary flex items-center justify-center font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 transition-all disabled:opacity-50", children: "Send" })] })] })] }));
}

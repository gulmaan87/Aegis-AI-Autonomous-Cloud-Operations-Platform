import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! I am SRE Assistant. Ask me about system incidents, chaos runs, or database/cache health.',
        },
    ]);
    const messagesEndRef = useRef(null);
    // Auto-scroll to bottom of chat list
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
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
                },
            ]);
        },
        onError: () => {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '⚠️ Failed to connect to SRE Chat agent.',
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
        chatMutation.mutate(updatedMessages);
    };
    return (_jsxs("div", { className: "fixed bottom-6 right-6 z-50 flex flex-col items-end", children: [isOpen && (_jsxs("div", { className: "w-80 h-96 bg-surface-800 border border-white/10 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom duration-200", children: [_jsxs("div", { className: "px-4 py-3 bg-surface-700 border-b border-white/5 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-sm", children: "\uD83E\uDD16" }), _jsx("p", { className: "text-xs font-semibold text-slate-200", children: "Aegis AI SRE Assistant" })] }), _jsx("button", { onClick: () => setIsOpen(false), className: "text-slate-400 hover:text-slate-200 text-xs transition-colors", children: "\u2715" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar", children: [messages.map((msg, index) => {
                                const isUser = msg.role === 'user';
                                return (_jsx("div", { className: `flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`, children: _jsx("div", { className: `px-3 py-2 rounded-xl text-xs leading-relaxed ${isUser
                                            ? 'bg-brand-600 text-white rounded-tr-none'
                                            : 'bg-surface-700 text-slate-200 rounded-tl-none border border-white/5'}`, children: _jsx("p", { className: "whitespace-pre-wrap", children: msg.content }) }) }, index));
                            }), chatMutation.isPending && (_jsx("div", { className: "flex flex-col items-start mr-auto max-w-[85%]", children: _jsx("div", { className: "bg-surface-700 text-slate-400 px-3 py-2 rounded-xl rounded-tl-none border border-white/5 text-xs flex items-center gap-1", children: _jsxs("span", { className: "flex gap-0.5", children: [_jsx("span", { className: "w-1 h-1 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '0ms' } }), _jsx("span", { className: "w-1 h-1 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '150ms' } }), _jsx("span", { className: "w-1 h-1 bg-brand-400 rounded-full animate-bounce", style: { animationDelay: '300ms' } })] }) }) })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("form", { onSubmit: handleSend, className: "p-3 border-t border-white/5 bg-surface-800/90 flex gap-1.5", children: [_jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), disabled: chatMutation.isPending, className: "flex-1 input bg-surface-700 text-xs border-white/5 placeholder-slate-500 rounded-md py-1.5 px-2 focus:outline-none", placeholder: "Ask a question..." }), _jsx("button", { type: "submit", disabled: chatMutation.isPending || !input.trim(), className: "btn-primary py-1.5 px-3 rounded-md text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50", children: "Send" })] })] })), _jsx("button", { onClick: () => setIsOpen(!isOpen), className: "w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center text-lg transition-transform active:scale-95 duration-150 focus:outline-none", title: "AI SRE Assistant", children: isOpen ? '✕' : '💬' })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            }
            else {
                await register(email, password, name);
            }
            navigate('/');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Authentication failed';
            setError(err?.response?.data?.error ?? msg);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4", children: [_jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" }), _jsx("div", { className: "absolute -bottom-40 -right-40 w-96 h-96 bg-brand-700/20 rounded-full blur-3xl" })] }), _jsxs("div", { className: "relative w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("span", { className: "text-5xl", children: "\u26A1" }), _jsx("h1", { className: "text-2xl font-bold text-slate-100 mt-3", children: "Aegis AI" }), _jsx("p", { className: "text-slate-400 text-sm mt-1", children: "Autonomous Cloud Operations" })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "flex rounded-lg bg-surface-700 p-1 mb-6", children: ['login', 'register'].map((m) => (_jsx("button", { onClick: () => setMode(m), className: `flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`, children: m === 'login' ? 'Sign in' : 'Register' }, m))) }), _jsxs("form", { onSubmit: submit, className: "space-y-4", children: [mode === 'register' && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Name" }), _jsx("input", { className: "input", type: "text", placeholder: "Your name", value: name, onChange: (e) => setName(e.target.value) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Email" }), _jsx("input", { className: "input", type: "email", placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Password" }), _jsx("input", { className: "input", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 8 })] }), error && (_jsx("p", { className: "text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg", children: error })), _jsx("button", { type: "submit", className: "btn-primary w-full mt-2", disabled: loading, children: loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account' })] })] }), _jsx("p", { className: "text-center text-xs text-slate-500 mt-4", children: "Aegis AI \u00B7 Autonomous Cloud Operations Platform" })] })] }));
}

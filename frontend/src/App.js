import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chaos from './pages/Chaos';
import Incidents from './pages/Incidents';
import Infrastructure from './pages/Infrastructure';
import Chat from './pages/Chat';
import SelfHealing from './pages/SelfHealing';
import Predictions from './pages/Predictions';
import Costs from './pages/Costs';
import Security from './pages/Security';
import Deployments from './pages/Deployments';
import VoiceOps from './pages/VoiceOps';
import MultiAgent from './pages/MultiAgent';
import Learning from './pages/Learning';
import RecruiterDemo from './pages/RecruiterDemo';
import Enterprise from './pages/Enterprise';
const qc = new QueryClient();
function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
export default function App() {
    return (_jsx(QueryClientProvider, { client: qc, children: _jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsxs(Route, { element: _jsx(PrivateRoute, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/chaos", element: _jsx(Chaos, {}) }), _jsx(Route, { path: "/incidents", element: _jsx(Incidents, {}) }), _jsx(Route, { path: "/infrastructure", element: _jsx(Infrastructure, {}) }), _jsx(Route, { path: "/predictions", element: _jsx(Predictions, {}) }), _jsx(Route, { path: "/costs", element: _jsx(Costs, {}) }), _jsx(Route, { path: "/security", element: _jsx(Security, {}) }), _jsx(Route, { path: "/deployments", element: _jsx(Deployments, {}) }), _jsx(Route, { path: "/voice", element: _jsx(VoiceOps, {}) }), _jsx(Route, { path: "/multi-agent", element: _jsx(MultiAgent, {}) }), _jsx(Route, { path: "/learning", element: _jsx(Learning, {}) }), _jsx(Route, { path: "/demo", element: _jsx(RecruiterDemo, {}) }), _jsx(Route, { path: "/enterprise", element: _jsx(Enterprise, {}) }), _jsx(Route, { path: "/chat", element: _jsx(Chat, {}) }), _jsx(Route, { path: "/self-healing", element: _jsx(SelfHealing, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }));
}

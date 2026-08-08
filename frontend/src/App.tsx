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

const qc = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/chaos" element={<Chaos />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/infrastructure" element={<Infrastructure />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/costs" element={<Costs />} />
              <Route path="/security" element={<Security />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route path="/voice" element={<VoiceOps />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/self-healing" element={<SelfHealing />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

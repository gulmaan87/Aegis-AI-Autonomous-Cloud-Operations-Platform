import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import ChatWidget from './ChatWidget';

const NAV = [
  { to: '/',               label: '⚡ Dashboard'       },
  { to: '/chaos',          label: '💥 Chaos'           },
  { to: '/incidents',      label: '🚨 Incidents'       },
  { to: '/infrastructure', label: '🗺️ Infrastructure'  },
  { to: '/chat',           label: '💬 AI Chat'         },
  { to: '/self-healing',   label: '🛡️ Auto-Healing'    },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('aegis_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('aegis_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#e6ecf5] dark:bg-surface-800 overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-150 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#e6ecf5] dark:bg-surface-800 shadow-neu-light-flat dark:shadow-neu-dark-flat z-10 flex flex-col border-r border-white/60 dark:border-white/5">
        {/* Logo Header */}
        <div className="px-6 py-5 border-b border-white/60 dark:border-white/5 flex items-center justify-between">
          <div>
            <span className="text-brand-600 dark:text-brand-400 font-extrabold text-xl tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-neu-light-glow dark:shadow-neu-dark-glow animate-pulse" />
              Aegis AI
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider uppercase mt-0.5">SRE Platform</p>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="p-2 rounded-xl bg-[#e6ecf5] dark:bg-surface-800 text-slate-700 dark:text-slate-200 shadow-neu-light-flat dark:shadow-neu-dark-flat hover:shadow-neu-light-pressed dark:hover:shadow-neu-dark-pressed transition-all duration-150 text-base"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#e6ecf5] dark:bg-surface-850 text-brand-600 dark:text-brand-400 shadow-neu-light-pressed dark:shadow-neu-dark-pressed border border-brand-500/30 dark:border-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:shadow-neu-light-flat-sm dark:hover:shadow-neu-dark-flat-sm'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 mx-3 mb-4 rounded-xl bg-[#e6ecf5] dark:bg-surface-850 shadow-neu-light-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{user?.email}</p>
            <span className="badge badge-blue text-[10px]">{user?.role}</span>
          </div>
          <button 
            onClick={handleLogout} 
            className="mt-3 w-full text-xs text-slate-600 dark:text-slate-400 hover:text-red-500 font-semibold py-1.5 rounded-lg shadow-neu-light-flat dark:shadow-neu-dark-flat hover:shadow-neu-light-pressed dark:hover:shadow-neu-dark-pressed transition-all"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 overflow-auto bg-[#e6ecf5] dark:bg-surface-800 p-3">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}

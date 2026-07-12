import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/',          label: '⚡ Dashboard'  },
  { to: '/chaos',     label: '💥 Chaos'      },
  { to: '/incidents', label: '🚨 Incidents'  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-surface-800 border-r border-white/8 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/8">
          <span className="text-brand-400 font-bold text-lg tracking-tight">⚡ Aegis AI</span>
          <p className="text-slate-500 text-xs mt-0.5">Cloud Ops Platform</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-100 ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 font-medium'
                    : 'text-slate-400 hover:bg-surface-700 hover:text-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-3 border-t border-white/8">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <span className="badge badge-blue mt-1">{user?.role}</span>
          <button onClick={handleLogout} className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-surface-900">
        <Outlet />
      </main>
    </div>
  );
}

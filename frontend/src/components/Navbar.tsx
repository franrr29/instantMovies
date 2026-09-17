import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { btnSecondary } from './ui/styles';
import { cn } from '../lib/cn';

const NAV_LINKS = [
  { to: '/movies', label: 'Películas' },
  { to: '/likes', label: 'Mis Likes' },
  { to: '/recommendations', label: 'Recomendaciones' },
];

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    'border-b pb-0.5 font-display text-[13px] uppercase tracking-[0.08em] transition-colors',
    isActive ? 'border-accent text-accent' : 'border-transparent text-ink/70 hover:text-ink',
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <nav className="border-b border-divider">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
          <span className="flex h-5.5 w-5.5 items-center justify-center bg-accent text-[11px] text-accent-ink">▶</span>
          InstantMovies
        </div>

        <div className="flex flex-wrap items-center gap-5">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClassName}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {user && <span className="hidden text-xs text-ink/60 sm:inline">{user.username}</span>}
          <button onClick={handleLogout} disabled={isLoggingOut} className={cn(btnSecondary, 'px-4 py-2 text-xs')}>
            {isLoggingOut ? 'Cerrando sesión...' : 'Logout'}
          </button>
        </div>
      </div>
    </nav>
  );
}
